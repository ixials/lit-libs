import type { RoomState } from "../lib/types";
import { Logo } from "./Logo";

export function Lobby({
  room,
  isHost,
  myPlayerId,
  onStart,
}: {
  room: RoomState;
  isHost: boolean;
  myPlayerId: string;
  onStart: () => void;
}) {
  function copyInvite() {
    const url = `${window.location.origin}?join=${room.code}`;
    navigator.clipboard.writeText(url).catch(() => {});
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-centers p-6">
      <div className="flex w-full flex-col items-center gap-8 rounded-xl border border-ll-blue bg-white p-8 sm:flex-row sm:items-stretch">
        <Logo />

        <div className="flex min-w-0 w-full flex-1 flex-col">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h1 className="min-w-0 truncate font-display text-4xl font-extrabold text-ll-blue">
              {room.code}
            </h1>
            <button
              onClick={copyInvite}
              className="shrink-0 rounded-lg bg-ll-blue px-4 py-2 font-display font-bold text-white text-xl"
            >
              Copy Link
            </button>
          </div>

          <ul
            className={`mb-10 grid gap-x-8 gap-y-4 ${
              room.players.length > 4 ? "grid-cols-2" : "grid-cols-1"
            }`}
          >
            {room.players.map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <span
                  className="h-8 w-8 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                <span className="font-display text-lg font-bold">
                  {p.name}
                  {p.id === room.hostId && (
                    <span className="ml-2 text-xs font-semibold text-slate-400">
                      HOST
                    </span>
                  )}
                  {p.id === myPlayerId && (
                    <span className="ml-2 text-xs font-semibold text-ll-sky">
                      (YOU)
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-auto">
            {isHost ? (
              <button
                disabled={room.players.length < 3}
                onClick={onStart}
                className="flex w-full items-center justify-center rounded-lg bg-ll-blue px-8 py-2 font-display font-bold text-white text-xl disabled:opacity-50"
              >
                Start Game
              </button>
            ) : (
              <p className="italic text-slate-400">
                Waiting for the host to start the game...
              </p>
            )}
            {room.players.length < 3 && (
              <p className="mt-3 text-sm text-slate-400">
                Need at least 3 players to start.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
