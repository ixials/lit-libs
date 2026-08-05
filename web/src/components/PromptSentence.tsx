import type { Category } from "../lib/types";

const BLANK_STYLE: Record<Category, string> = {
  noun: "text-lime-500 bg-lime-50 border-lime-400",
  verb: "text-fuchsia-500 bg-fuchsia-50 border-fuchsia-300",
  adjective: "text-pink-500 bg-pink-50 border-pink-300",
};

export function PromptSentence({
  template,
  slots,
  filledText,
  onBlankClick,
}: {
  template: string;
  slots: Category[];
  /** For each slot index: card text to show, or null for an empty placeholder */
  filledText: (string | null)[];
  onBlankClick?: (slotIndex: number) => void;
}) {
  const parts = template.split(/(\{\d+\})/g);
  return (
    <p className="text-center text-lg leading-relaxed">
      {parts.map((part, i) => {
        const match = part.match(/^\{(\d+)\}$/);
        if (!match) return <span key={i}>{part}</span>;
        const slotIdx = Number(match[1]);
        const category = slots[slotIdx];
        const text = filledText[slotIdx];
        return (
          <button
            key={i}
            type="button"
            onClick={() => onBlankClick?.(slotIdx)}
            className={[
              "mx-1 my-1 inline-block rounded-md border-2 px-2 align-middle font-bold",
              BLANK_STYLE[category],
              onBlankClick ? "cursor-pointer" : "cursor-default",
            ].join(" ")}
          >
            {text ?? `${category.toUpperCase()}`}
          </button>
        );
      })}
    </p>
  );
}
