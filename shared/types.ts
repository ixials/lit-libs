// Shared types between server and web. Copy or symlink into each app's src
// (see server/src/types.ts and web/src/lib/types.ts).

export type Category = "noun" | "verb" | "adjective";

export interface Card {
  id: string;
  category: Category;
  text: string;
  phonetic?: string;
  definition: string;
  points: number;
  frontImage?: string;
  backImage?: string;
}

export interface Prompt {
  id: string;
  template: string;
  slots: Category[];
}

export interface Player {
  id: string;
  name: string;
  color: string;
  score: number;
  connected: boolean;
  isHost: boolean;
}

export type RoomStatus =
  | "lobby"
  | "playing"
  | "judging"
  | "round_end"
  | "game_over";

export interface Submission {
  playerId: string;
  cardIds: string[];
  locked: boolean;
}

export interface RoomSettings {
  timeLimit: number | null;
  targetScore: number;
  handSize: number;
}

export interface RoomState {
  code: string;
  hostId: string;
  status: RoomStatus;
  players: Player[];
  settings: RoomSettings;
  currentPrompt: Prompt | null;
  judgeId: string | null;
  roundNumber: number;
  submittedCount: number;
  submissions: { cardIds: string[]; filledText: string }[];
  lastRoundResult: RoundResult | null;
  roundEndsAt: number | null;
}

export interface RoundResult {
  winnerId: string;
  winnerName: string;
  pointsAwarded: number;
  filledText: string;
  cardIds: string[];
}

export interface ChatMessage {
  playerId: string;
  playerName: string;
  color: string;
  text: string;
  ts: number;
}

// ---- Socket event payloads ----

export interface ClientToServerEvents {
  create_room: (
    data: { name: string; timeLimit: number | null },
    cb: (
      res:
        | { ok: true; code: string; playerId: string }
        | { ok: false; error: string },
    ) => void,
  ) => void;
  join_room: (
    data: { code: string; name: string },
    cb: (
      res: { ok: true; playerId: string } | { ok: false; error: string },
    ) => void,
  ) => void;
  start_game: (data: { code: string }) => void;
  replay_game: (data: { code: string }) => void;
  trash_card: (data: {
    code: string;
    category: Category;
    cardId: string;
  }) => void;
  lock_submission: (data: { code: string; cardIds: string[] }) => void;
  select_winner: (data: { code: string; submissionIndex: number }) => void;
  send_chat: (data: { code: string; text: string }) => void;
  leave_room: (data: { code: string }) => void;
}

export interface ServerToClientEvents {
  room_update: (state: RoomState) => void;
  your_hand: (hand: {
    noun: Card[];
    verb: Card[];
    adjective: Card[];
    hasTrashed: boolean;
  }) => void;
  chat_message: (msg: ChatMessage) => void;
  error_message: (msg: string) => void;
}
