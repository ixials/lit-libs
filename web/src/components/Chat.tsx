import { useState } from "react";
import type { ChatMessage } from "../lib/types";

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
        {messages.map((m, i) => (
          <p key={i} className="text-sm leading-relaxed">
            <span className="font-bold" style={{ color: m.color }}>
              {m.playerName}:
            </span>{" "}
            {m.text}
          </p>
        ))}
      </div>
      <form onSubmit={submit} className="mt-3 border-t border-ll-blue pt-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type..."
          className="w-full text-sm text-ll-blue italic outline-none placeholder:text-slate-400"
        />
      </form>
    </div>
  );
}
