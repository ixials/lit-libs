import { useState } from "react";
import type { ChatMessage } from "../lib/types";
import { SendHorizontal } from "lucide-react";

export function Chat({
  messages,
  onSend,
}: {
  messages: ChatMessage[];
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-ll-blue bg-white p-4">
      <h2 className="mb-3 text-center font-display text-2xl font-extrabold">
        CHAT
      </h2>
      <div className="flex-1 space-y-1 overflow-y-auto pr-1">
        {messages.map((m, i) =>
          m.type === "system" ? (
            <p key={i} className="text-lg italic text-slate-400">
              <span className="font-bold" style={{ color: m.color }}>
                {m.playerName}
              </span>{" "}
              {m.text}
            </p>
          ) : (
            <p key={i} className="text-lg leading-relaxed">
              <span className="font-bold" style={{ color: m.color }}>
                {m.playerName}:
              </span>{" "}
              {m.text}
            </p>
          ),
        )}
      </div>
      <form onSubmit={submit} className="mt-3 border-t border-ll-blue pt-3">
        <div className="flex flex-row items-stretch gap-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type..."
            className="w-full text-lg text-black outline-none placeholder:text-slate-400"
          />

          <button
            disabled={!text.trim()}
            onClick={() => submit}
            className="rounded-lg bg-ll-blue px-2 py-2 font-display font-bold text-white text-xl disabled:opacity-50"
          >
            <SendHorizontal size={20} strokeWidth={3} />
          </button>
        </div>
      </form>
    </div>
  );
}
