import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { GameManager } from "./gameManager.js";
import type { ClientToServerEvents, ServerToClientEvents } from "./types.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.get("/health", (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: CLIENT_ORIGIN },
});

const game = new GameManager();

function broadcastRoom(code: string) {
  const room = game.getRoom(code);
  if (!room) return;
  room.players.forEach((p) => {
    // each player gets their own hand privately, and a public view of room state
    const socketEntry = [...io.sockets.sockets.values()].find(
      (s) => game.getRoomForSocket(s.id)?.playerId === p.id,
    );
    if (!socketEntry) return;
    socketEntry.emit("room_update", game.toPublicState(room, p.id));
    socketEntry.emit("your_hand", game.getHandFor(code, p.id));
  });
}

io.on("connection", (socket) => {
  socket.on("create_room", ({ name, timeLimit }, cb) => {
    const room = game.createRoom(socket.id, name, timeLimit);
    socket.join(room.code);
    cb({ ok: true, code: room.code, playerId: room.hostId });
    broadcastRoom(room.code);
  });

  socket.on("join_room", ({ code, name }, cb) => {
    const result = game.joinRoom(socket.id, code, name);
    if ("error" in result) {
      cb({ ok: false, error: result.error });
      return;
    }
    socket.join(result.room.code);
    cb({ ok: true, playerId: result.playerId });
    broadcastRoom(result.room.code);
  });

  socket.on("start_game", ({ code }) => {
    try {
      const result = game.startGame(code);
      if ("error" in result) {
        socket.emit("error_message", result.error);
        return;
      }
      broadcastRoom(code);
    } catch (err) {
      console.error("start_game crashed:", err);
      socket.emit("error_message", "Server error starting game");
    }
  });

  socket.on("replay_game", ({ code }) => {
    const result = game.replayGame(code);
    if ("error" in result) {
      socket.emit("error_message", result.error);
      return;
    }
    broadcastRoom(code);
  });

  socket.on("lock_submission", ({ code, cardIds }) => {
    const entry = game.getRoomForSocket(socket.id);
    if (!entry) return;
    const result = game.submitCards(code, entry.playerId, cardIds);
    if ("error" in result) {
      socket.emit("error_message", result.error);
      return;
    }
    broadcastRoom(code);
  });

  socket.on("select_winner", ({ code, submissionIndex }) => {
    const room = game.getRoom(code);
    if (!room) return;
    const order = game.shuffledSubmissionOrder(room);
    const result = game.selectWinner(code, submissionIndex, order);
    if ("error" in result) {
      socket.emit("error_message", result.error);
      return;
    }
    broadcastRoom(code);
    // Give everyone 5 seconds to see the winning answer, then deal the next round
    setTimeout(() => {
      const r = game.getRoom(code);
      if (r && r.status === "round_end") {
        game.advanceRound(code);
        broadcastRoom(code);
      }
    }, 5000);
  });

  socket.on("send_chat", ({ code, text }) => {
    const entry = game.getRoomForSocket(socket.id);
    const room = game.getRoom(code);
    if (!entry || !room || !text.trim()) return;
    const player = room.players.find((p) => p.id === entry.playerId);
    if (!player) return;
    const msg = game.buildChatMessage(
      player.id,
      player.name,
      player.color,
      text.trim(),
    );
    io.to(code).emit("chat_message", msg);
  });

  socket.on("leave_room", ({ code }) => {
    game.removePlayerBySocket(socket.id);
    socket.leave(code);
    broadcastRoom(code);
  });

  socket.on("disconnect", () => {
    const entry = game.removePlayerBySocket(socket.id);
    if (entry) broadcastRoom(entry.room.code);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Lit Libs server listening on :${PORT}`);
});
