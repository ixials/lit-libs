import { useEffect, useState } from "react";
import { socket } from "./lib/socket";
import type { Card, ChatMessage, RoomState } from "./lib/types";
import { Home } from "./components/Home";
import { Lobby } from "./components/Lobby";
import { GameScreen } from "./components/GameScreen";

type Hand = { noun: Card[]; verb: Card[]; adjective: Card[] };
const EMPTY_HAND: Hand = { noun: [], verb: [], adjective: [] };

export default function App() {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [hand, setHand] = useState<Hand>(EMPTY_HAND);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    socket.on("room_update", setRoom);
    socket.on("your_hand", setHand);
    socket.on("chat_message", (msg) =>
      setMessages((prev) => [...prev, msg].slice(-100)),
    );
    socket.on("error_message", setError);

    return () => {
      socket.off("room_update");
      socket.off("your_hand");
      socket.off("chat_message");
      socket.off("error_message");
    };
  }, []);

  function createRoom(name: string, timeLimit: number | null) {
    setError(null);
    socket.emit("create_room", { name, timeLimit }, (res) => {
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMyPlayerId(res.playerId);
    });
  }

  function joinRoom(name: string, code: string) {
    setError(null);
    socket.emit("join_room", { code, name }, (res) => {
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMyPlayerId(res.playerId);
    });
  }

  function startGame() {
    if (!room) return;
    socket.emit("start_game", { code: room.code });
  }

  function replayGame() {
    if (!room) return;
    socket.emit("replay_game", { code: room.code });
  }

  function quitToTitle() {
    if (room) socket.emit("leave_room", { code: room.code });
    setRoom(null);
    setMyPlayerId(null);
    setHand(EMPTY_HAND);
    setMessages([]);
  }

  function lockSubmission(cardIds: string[]) {
    if (!room) return;
    socket.emit("lock_submission", { code: room.code, cardIds });
  }

  function selectWinner(submissionIndex: number) {
    if (!room) return;
    socket.emit("select_winner", { code: room.code, submissionIndex });
  }

  function sendChat(text: string) {
    if (!room) return;
    socket.emit("send_chat", { code: room.code, text });
  }

  if (!room || !myPlayerId) {
    return (
      <Home onCreateRoom={createRoom} onJoinRoom={joinRoom} error={error} />
    );
  }

  if (room.status === "lobby") {
    return (
      <Lobby
        room={room}
        isHost={myPlayerId === room.hostId}
        myPlayerId={myPlayerId}
        onStart={startGame}
      />
    );
  }

  return (
    <GameScreen
      room={room}
      hand={hand}
      myPlayerId={myPlayerId}
      messages={messages}
      onLock={lockSubmission}
      onSelectWinner={selectWinner}
      onSendChat={sendChat}
      onReplay={replayGame}
      onQuit={quitToTitle}
    />
  );
}
