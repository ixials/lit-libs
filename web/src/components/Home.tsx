import { useState } from "react";
import { Logo } from "./Logo";
import { InfoPanel } from "./InfoPanel";
import { Check, CircleQuestionMark } from "lucide-react";

export function Home({
  onCreateRoom,
  onJoinRoom,
  error,
}: {
  onCreateRoom: (name: string, timeLimit: number | null) => void;
  onJoinRoom: (name: string, code: string) => void;
  error: string | null;
}) {
  const [nameInput, setNameInput] = useState("");
  const [name, setName] = useState("");
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const nameOk = nameInput.trim().length > 0;
  const [info, setInfo] = useState(false);

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center p-6">
      <div className="relative flex min-h-[420px] w-full flex-col items-center gap-8 rounded-xl border border-ll-blue bg-white p-8 sm:flex-row sm:items-center">
        <button
          onClick={() => setInfo(!info)}
          className="absolute left-3 top-3 text-ll-blue"
          aria-label="Info"
        >
          <CircleQuestionMark size={20} strokeWidth={2} />
        </button>

        {!info && (
          <>
            <Logo />

            <div className="min-w-0 w-full flex-1">
              <div className="mb-6 flex items-center gap-3">
                <label className="font-display text-xl">NAME</label>
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Name"
                  className={`min-w-0 flex-1 rounded-xl border border-ll-blue px-3 py-2 outline-none ${
                    nameInput.trim() === name.trim()
                      ? "text-black"
                      : "text-slate-400"
                  }`}
                />
                <button
                  disabled={!nameOk}
                  onClick={() => setName(nameInput.trim())}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-ll-blue font-display font-bold text-white disabled:opacity-50"
                  aria-label="Join room"
                >
                  <Check size={24} strokeWidth={4} />
                </button>
              </div>

              <hr className="mb-6 border-ll-blue" />

              <div
                className={`${error ? "mb-3" : "mb-6"} flex items-center gap-3`}
              >
                <label className="font-display text-xl">CODE</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="XXXX"
                  maxLength={6}
                  className="min-w-0 flex-1 rounded-xl border border-ll-blue px-3 py-2 uppercase outline-none"
                />
                <button
                  disabled={!name || !code.trim()}
                  onClick={() => onJoinRoom(name.trim(), code.trim())}
                  className="rounded-lg bg-ll-blue px-4 py-2 font-display font-bold text-white text-xl disabled:opacity-50"
                >
                  Join
                </button>
              </div>

              {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

              <hr className="mb-6 border-ll-blue" />

              <div className="mb-6">
                <h2 className="mb-3 font-display text-xl">CREATE ROOM</h2>
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-sm text-slate-600">Time Limit</span>
                  <input
                    type="range"
                    min={0}
                    max={300}
                    step={30}
                    value={timeLimit ?? 0}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setTimeLimit(v === 0 ? null : v);
                    }}
                    style={
                      {
                        "--progress": `${((timeLimit ?? 0) / 300) * 100}%`,
                      } as React.CSSProperties
                    }
                    className="flex-1"
                  />
                  <span className="shrink-0 text-sm text-slate-600">
                    {timeLimit ? `${timeLimit}s` : "None"}
                  </span>
                </div>
                <button
                  disabled={!name}
                  onClick={() => onCreateRoom(name.trim(), timeLimit)}
                  className="w-full rounded-lg bg-ll-blue py-2 font-display font-bold text-white text-xl disabled:opacity-50"
                >
                  Start Room
                </button>
              </div>
            </div>
          </>
        )}

        {info && <InfoPanel />}
      </div>
    </div>
  );
}
