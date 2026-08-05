import type { Player } from "../lib/types";

export function Scoreboard({
  players,
  myPlayerId,
}: {
  players: Player[];
  myPlayerId: string;
}) {
  const ranked = [...players].sort((a, b) => b.score - a.score);
  return (
    <div className="rounded-xl border border-ll-blue bg-white p-4">
      <h2 className="mb-3 text-center font-display text-2xl font-extrabold">
        SCOREBOARD
      </h2>
      <ol className="space-y-1">
        {ranked.map((p, i) => (
          <li key={p.id} className="flex items-center justify-between text-lg">
            <div>
              <span className="font-bold" style={{ color: p.color }}>
                {i + 1}. {p.name}
              </span>
              {p.id === myPlayerId && (
                <span className="ml-2 text-xs font-semibold text-slate-400">
                  (YOU)
                </span>
              )}
            </div>
            <span className="font-bold text-ll-blue">{p.score}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
