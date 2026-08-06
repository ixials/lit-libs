import { randomUUID } from "crypto";
import cardsData from "./cards.json" with { type: "json" };
import promptsData from "./prompts.json" with { type: "json" };
import type {
  Card,
  Category,
  ChatMessage,
  Player,
  Prompt,
  RoomSettings,
  RoomState,
  RoundResult,
} from "./types.js";

const ALL_CARDS = cardsData as Card[];
const ALL_PROMPTS = promptsData as Prompt[];
const CARDS_BY_CATEGORY: Record<Category, Card[]> = {
  noun: ALL_CARDS.filter((c) => c.category === "noun"),
  verb: ALL_CARDS.filter((c) => c.category === "verb"),
  adjective: ALL_CARDS.filter((c) => c.category === "adjective"),
};

const PLAYER_COLORS = [
  "#00B2FF",
  "#5CD66C",
  "#FF4FC3",
  "#B583FF",
  "#FFB84D",
  "#4FE0E0",
];

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function randomCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  return Array.from(
    { length: 4 },
    () => letters[Math.floor(Math.random() * letters.length)],
  ).join("");
}

interface InternalSubmission {
  playerId: string;
  cardIds: string[];
  locked: boolean;
}

interface CategoryDeck {
  drawPile: string[];
  discardPile: string[];
}

function freshDecks(): Record<Category, CategoryDeck> {
  return {
    noun: {
      drawPile: shuffle(CARDS_BY_CATEGORY.noun.map((c) => c.id)),
      discardPile: [],
    },
    verb: {
      drawPile: shuffle(CARDS_BY_CATEGORY.verb.map((c) => c.id)),
      discardPile: [],
    },
    adjective: {
      drawPile: shuffle(CARDS_BY_CATEGORY.adjective.map((c) => c.id)),
      discardPile: [],
    },
  };
}

interface InternalRoom {
  code: string;
  hostId: string;
  status: RoomState["status"];
  players: Player[];
  settings: RoomSettings;
  currentPrompt: Prompt | null;
  judgeId: string | null;
  roundNumber: number;
  hands: Map<string, Record<Category, Card[]>>; // playerId, hand
  decks: Record<Category, CategoryDeck>;
  trashedPlayerIds: Set<string>;
  submissions: InternalSubmission[];
  usedPromptIds: Set<string>;
  lastRoundResult: RoundResult | null;
  roundEndsAt: number | null;
}

export class GameManager {
  private rooms = new Map<string, InternalRoom>();
  private socketToPlayer = new Map<
    string,
    { code: string; playerId: string }
  >();

  createRoom(
    hostSocketId: string,
    hostName: string,
    timeLimit: number | null,
  ): InternalRoom {
    let code = randomCode();
    while (this.rooms.has(code)) code = randomCode();

    const hostId = randomUUID();
    const host: Player = {
      id: hostId,
      name: hostName || "Host",
      color: PLAYER_COLORS[0],
      score: 0,
      connected: true,
      isHost: true,
    };

    const room: InternalRoom = {
      code,
      hostId,
      status: "lobby",
      players: [host],
      settings: { timeLimit, targetScore: 20, handSize: 3 },
      currentPrompt: null,
      judgeId: null,
      roundNumber: 0,
      hands: new Map(),
      decks: freshDecks(),
      trashedPlayerIds: new Set(),
      submissions: [],
      usedPromptIds: new Set(),
      lastRoundResult: null,
      roundEndsAt: null,
    };

    this.rooms.set(code, room);
    this.socketToPlayer.set(hostSocketId, { code, playerId: hostId });
    return room;
  }

  joinRoom(
    socketId: string,
    code: string,
    name: string,
  ): { room: InternalRoom; playerId: string } | { error: string } {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return { error: "Room not found" };
    if (room.status !== "lobby") return { error: "Game already in progress" };
    if (room.players.length >= 10) return { error: "Room is full" };

    const playerId = randomUUID();
    const player: Player = {
      id: playerId,
      name: name || `Player ${room.players.length + 1}`,
      color: PLAYER_COLORS[room.players.length % PLAYER_COLORS.length],
      score: 0,
      connected: true,
      isHost: false,
    };
    room.players.push(player);
    this.socketToPlayer.set(socketId, { code: room.code, playerId });
    return { room, playerId };
  }

  getRoomForSocket(
    socketId: string,
  ): { room: InternalRoom; playerId: string } | null {
    const entry = this.socketToPlayer.get(socketId);
    if (!entry) return null;
    const room = this.rooms.get(entry.code);
    if (!room) return null;
    return { room, playerId: entry.playerId };
  }

  getRoom(code: string): InternalRoom | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  private skipRoundWithNewJudge(room: InternalRoom) {
    if (room.players.length < 2) return; // Not enough players left
    room.judgeId = room.players[0].id;
    room.players.forEach((p) => this.dealHand(room, p.id));
    room.currentPrompt = this.pickPrompt(room);
    room.submissions = [];
    room.status = "playing";
    room.roundNumber += 1;
  }

  private drawFromDeck(room: InternalRoom, category: Category, count: number) {
    const deck = room.decks[category];
    const drawnIds: string[] = [];

    while (drawnIds.length < count) {
      if (deck.drawPile.length === 0) {
        if (deck.discardPile.length === 0) break;

        deck.drawPile = shuffle(deck.discardPile);
        deck.discardPile = [];
      }
      drawnIds.push(deck.drawPile.pop()!);
    }

    return drawnIds
      .map((id) => this.cardById(id))
      .filter((c): c is Card => !!c);
  }

  private dealHand(room: InternalRoom, playerId: string) {
    const existing = room.hands.get(playerId) ?? {
      noun: [],
      verb: [],
      adjective: [],
    };
    (["noun", "verb", "adjective"] as Category[]).forEach((cat) => {
      const need = room.settings.handSize - existing[cat].length;
      if (need <= 0) return;
      existing[cat].push(...this.drawFromDeck(room, cat, need));
    });
    room.hands.set(playerId, existing);
  }

  private pickPrompt(room: InternalRoom): Prompt {
    const available = ALL_PROMPTS.filter((p) => !room.usedPromptIds.has(p.id));
    const pool = available.length > 0 ? available : ALL_PROMPTS;
    if (available.length === 0) room.usedPromptIds.clear();
    const prompt = pool[Math.floor(Math.random() * pool.length)];
    room.usedPromptIds.add(prompt.id);
    return prompt;
  }

  startGame(code: string): InternalRoom | { error: string } {
    const room = this.rooms.get(code);
    if (!room) return { error: "Room not found" };
    if (room.players.length < 3) return { error: "Need at least 3 players" };

    room.players.forEach((p) => this.dealHand(room, p.id));
    room.judgeId = room.players[0].id;
    room.currentPrompt = this.pickPrompt(room);
    room.roundNumber = 1;
    room.trashedPlayerIds.clear();
    room.submissions = [];
    room.status = "playing";
    room.lastRoundResult = null;
    return room;
  }

  replayGame(code: string): InternalRoom | { error: string } {
    const room = this.rooms.get(code);
    if (!room) return { error: "Room not found" };

    room.players.forEach((p) => (p.score = 0));
    room.hands.clear();
    room.trashedPlayerIds.clear();
    room.submissions = [];
    room.currentPrompt = null;
    room.judgeId = null;
    room.roundNumber = 0;
    room.lastRoundResult = null;
    room.roundEndsAt = null;
    room.usedPromptIds.clear();
    room.status = "lobby";

    return room;
  }

  trashCard(
    code: string,
    playerId: string,
    category: Category,
    cardId: string,
  ): { room: InternalRoom } | { error: string } {
    const room = this.rooms.get(code);
    if (!room) return { error: "Room not found" };
    if (room.status !== "playing")
      return { error: "Can only trash cards while playing" };
    if (playerId === room.judgeId)
      return { error: "The judge cannot trash cards" };
    if (room.trashedPlayerIds.has(playerId))
      return { error: "You already trashed a card this round" };

    const hand = room.hands.get(playerId);
    if (!hand) return { error: "No hand found" };
    const idx = hand[category].findIndex((c) => c.id === cardId);
    if (idx === -1) return { error: "Card not in hand" };

    room.decks[category].discardPile.push(cardId);

    const [replacement] = this.drawFromDeck(room, category, 1);

    if (replacement) {
      hand[category][idx] = replacement;
    } else {
      hand[category].splice(idx, 1);
    }

    room.trashedPlayerIds.add(playerId);
    return { room };
  }

  submitCards(
    code: string,
    playerId: string,
    cardIds: string[],
  ): { room: InternalRoom } | { error: string } {
    const room = this.rooms.get(code);
    if (!room) return { error: "Room not found" };
    if (room.status !== "playing")
      return { error: "Not accepting submissions right now" };
    if (playerId === room.judgeId)
      return { error: "The judge does not submit cards" };
    if (!room.currentPrompt) return { error: "No active prompt" };
    if (cardIds.length !== room.currentPrompt.slots.length)
      return { error: "Wrong number of cards" };

    const existingIdx = room.submissions.findIndex(
      (s) => s.playerId === playerId,
    );
    const submission: InternalSubmission = { playerId, cardIds, locked: true };
    if (existingIdx >= 0) room.submissions[existingIdx] = submission;
    else room.submissions.push(submission);

    // Remove played cards and add to discard pile
    const hand = room.hands.get(playerId);
    if (hand) {
      room.currentPrompt.slots.forEach((cat, i) => {
        hand[cat] = hand[cat].filter((c) => c.id !== cardIds[i]);
        room.decks[cat].discardPile.push(cardIds[i]);
      });
    }

    const nonJudgeCount = room.players.length - 1;
    if (room.submissions.length >= nonJudgeCount) {
      room.submissions = shuffle(room.submissions);
      room.status = "judging";
    }

    return { room };
  }

  private cardById(id: string): Card | undefined {
    return ALL_CARDS.find((c) => c.id === id);
  }

  fillTemplate(prompt: Prompt, cardIds: string[]): string {
    let text = prompt.template;
    cardIds.forEach((id, i) => {
      const card = this.cardById(id);
      text = text.replace(`{${i}}`, card ? card.text.toLowerCase() : "???");
    });
    return text;
  }

  selectWinner(
    code: string,
    submissionIndex: number,
    shuffledOrder: string[],
  ): { room: InternalRoom; result: RoundResult } | { error: string } {
    const room = this.rooms.get(code);
    if (!room) return { error: "Room not found" };
    if (room.status !== "judging") return { error: "Not judging right now" };

    const winnerId = shuffledOrder[submissionIndex];
    const submission = room.submissions.find((s) => s.playerId === winnerId);
    const winner = room.players.find((p) => p.id === winnerId);
    if (!submission || !winner || !room.currentPrompt)
      return { error: "Invalid selection" };

    const points = submission.cardIds.reduce(
      (sum, id) => sum + (this.cardById(id)?.points ?? 0),
      0,
    );
    winner.score += points;

    const result: RoundResult = {
      winnerId,
      winnerName: winner.name,
      pointsAwarded: points,
      filledText: this.fillTemplate(room.currentPrompt, submission.cardIds),
      cardIds: submission.cardIds,
    };

    room.lastRoundResult = result;
    room.status =
      winner.score >= room.settings.targetScore ? "game_over" : "round_end";

    const ROUND_END_DELAY = 5000;
    room.roundEndsAt =
      room.status === "round_end" ? Date.now() + ROUND_END_DELAY : null;

    return { room, result };
  }

  advanceRound(code: string): InternalRoom | { error: string } {
    const room = this.rooms.get(code);
    if (!room) return { error: "Room not found" };
    if (room.status === "game_over") return { error: "Game is already over" };

    room.players.forEach((p) => this.dealHand(room, p.id));

    const currentJudgeIdx = room.players.findIndex(
      (p) => p.id === room.judgeId,
    );
    const nextJudge = room.players[(currentJudgeIdx + 1) % room.players.length];
    room.judgeId = nextJudge.id;

    room.currentPrompt = this.pickPrompt(room);
    room.roundNumber += 1;
    room.trashedPlayerIds.clear();
    room.submissions = [];
    room.status = "playing";
    room.lastRoundResult = null;
    room.roundEndsAt = null;

    return room;
  }

  getHandFor(code: string, playerId: string) {
    const room = this.rooms.get(code);
    const hand = room?.hands.get(playerId) ?? {
      noun: [],
      verb: [],
      adjective: [],
    };
    return {
      ...hand,
      hasTrashed: room?.trashedPlayerIds.has(playerId) ?? false,
    };
  }

  removePlayerBySocket(socketId: string): {
    room: InternalRoom;
    playerId: string;
    playerName: string;
    playerColor: string;
  } | null {
    const entry = this.socketToPlayer.get(socketId);
    if (!entry) return null;
    this.socketToPlayer.delete(socketId);
    const room = this.rooms.get(entry.code);
    if (!room) return null;

    const idx = room.players.findIndex((p) => p.id === entry.playerId);
    const player = room.players[idx];
    if (idx === -1)
      return {
        room,
        playerId: player.id,
        playerName: player.name,
        playerColor: player.color,
      };

    const wasHost = room.hostId === entry.playerId;
    const wasJudge = room.judgeId === entry.playerId;

    room.players.splice(idx, 1);
    room.hands.delete(entry.playerId);
    room.submissions = room.submissions.filter(
      (s) => s.playerId !== entry.playerId,
    );

    if (room.players.length === 0) {
      this.rooms.delete(room.code);
      return {
        room,
        playerId: player.id,
        playerName: player.name,
        playerColor: player.color,
      };
    }

    if (wasHost) {
      room.hostId = room.players[0].id;
    }

    if (wasJudge && (room.status === "playing" || room.status === "judging")) {
      this.skipRoundWithNewJudge(room);
    } else if (
      room.status === "playing" &&
      room.players.length > 1 &&
      room.submissions.length >= room.players.length - 1
    ) {
      room.submissions = shuffle(room.submissions);
      room.status = "judging";
    }

    return {
      room,
      playerId: player.id,
      playerName: player.name,
      playerColor: player.color,
    };
  }

  buildChatMessage(
    playerId: string,
    playerName: string,
    color: string,
    text: string,
    type: "player" | "system" = "player",
  ): ChatMessage {
    return {
      playerId,
      playerName,
      color,
      text: text.slice(0, 300),
      ts: Date.now(),
      type,
    };
  }

  toPublicState(room: InternalRoom, forPlayerId: string): RoomState {
    // Shuffle and anonymize submissions
    let publicSubmissions: RoomState["submissions"] = [];
    if (room.status === "judging" && room.currentPrompt) {
      publicSubmissions = room.submissions.map((s) => ({
        cardIds: s.cardIds,
        filledText: this.fillTemplate(room.currentPrompt!, s.cardIds),
      }));
    }
    return {
      code: room.code,
      hostId: room.hostId,
      status: room.status,
      players: room.players,
      settings: room.settings,
      currentPrompt: room.currentPrompt,
      judgeId: room.judgeId,
      roundNumber: room.roundNumber,
      submittedCount: room.submissions.length,
      submissions: publicSubmissions,
      lastRoundResult: room.lastRoundResult,
      roundEndsAt: room.roundEndsAt,
    };
  }

  shuffledSubmissionOrder(room: InternalRoom): string[] {
    return room.submissions.map((s) => s.playerId);
  }
}
