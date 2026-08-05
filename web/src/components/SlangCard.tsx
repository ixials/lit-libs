import { useState } from "react";
import type { Card as CardType } from "../lib/types";

const CATEGORY_STYLES = {
  noun: {
    tagBg: "bg-lime-300",
    tagText: "text-slate-800",
    body: "bg-[#1F2F5C]",
    title: "text-sky-300",
    label: "text-white",
    def: "text-slate-300",
  },
  verb: {
    tagBg: "bg-violet-400",
    tagText: "text-white",
    body: "bg-[#FFE477]",
    title: "text-fuchsia-600",
    label: "text-violet-700",
    def: "text-slate-700",
  },
  adjective: {
    tagBg: "bg-cyan-400",
    tagText: "text-white",
    body: "bg-[#FF6FA5]",
    title: "text-yellow-300",
    label: "text-white",
    def: "text-pink-50",
  },
} as const;

export function SlangCard({
  card,
  selected,
  disabled,
  onClick,
  small,
  flipped,
}: {
  card: CardType;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  small?: boolean;
  flipped?: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const [backImgFailed, setBackImgFailed] = useState(false);
  const s = CATEGORY_STYLES[card.category];
  const useFrontImage = !!card.frontImage && !imgFailed;
  const useBackImage = !!card.backImage && !backImgFailed;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "relative overflow-hidden rounded-xl border-2 border-white shadow-[0_-3px_6px_-3px_rgba(0,0,0,0.12),0_6px_10px_-3px_rgba(0,0,0,0.25)] transition-transform",
        disabled ? "cursor-not-allowed" : "hover:-translate-y-1 cursor-pointer",
        small ? "w-48 h-64" : "w-72 h-96",
        flipped || !useFrontImage
          ? `flex flex-col text-left ${small ? "p-2" : "p-3"}`
          : "",
        flipped ? "bg-ll-blue" : useFrontImage ? "" : s.body,
      ].join(" ")}
    >
      {flipped ? (
        useBackImage ? (
          <img
            src={card.backImage}
            alt="Card back"
            draggable={false}
            onError={() => setBackImgFailed(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2">
            <span className="font-display text-3xl font-extrabold text-white/90">
              LIT LIBS
            </span>
            <span className="text-5xl">[ə]</span>
          </div>
        )
      ) : useFrontImage ? (
        <img
          src={card.frontImage}
          alt={card.text}
          draggable={false}
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <>
          <span
            className={`self-start rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide ${s.tagBg} ${s.tagText}`}
          >
            SLANG CARD
          </span>
          <span
            className={`mt-2 font-display font-extrabold leading-tight ${s.title} ${small ? "text-lg" : "text-2xl"}`}
          >
            {card.text}
          </span>
          {card.phonetic && (
            <span className={`text-[10px] italic ${s.def} opacity-80`}>
              {card.phonetic}
            </span>
          )}
          <span className={`mt-1 text-xs font-bold uppercase ${s.label}`}>
            {card.category}
          </span>
          {!small && (
            <span className={`mt-1 text-xs leading-snug ${s.def}`}>
              {card.definition}
            </span>
          )}
          <span className={`mt-auto self-end text-[10px] ${s.def} opacity-60`}>
            [{card.points}pt]
          </span>
        </>
      )}

      {disabled && <div className="absolute inset-0 bg-pink-200/30" />}
    </button>
  );
}
