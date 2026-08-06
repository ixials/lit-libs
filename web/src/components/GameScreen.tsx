import { useEffect, useRef, useState } from "react";
import type { Card, Category, ChatMessage, RoomState } from "../lib/types";
import { SlangCard } from "./SlangCard";
import { PromptSentence } from "./PromptSentence";
import { Scoreboard } from "./Scoreboard";
import { Chat } from "./Chat";
import { ArrowLeft, ArrowRight, RotateCw, ZoomIn } from "lucide-react";

type Hand = { noun: Card[]; verb: Card[]; adjective: Card[] };
type Stacks = Record<Category, string[]>;

const CATEGORIES: Category[] = ["noun", "verb", "adjective"];
const MAX_STACK_HEIGHT = 420;
const STACK_CARD_HEIGHT = 256;

const MOBILE_CARD_WIDTH = 192;
const MOBILE_CARD_GAP = 20;
const MOBILE_CARD_STEP = MOBILE_CARD_WIDTH + MOBILE_CARD_GAP;

export function GameScreen({
  room,
  hand,
  myPlayerId,
  messages,
  onLock,
  onSelectWinner,
  onSendChat,
  onReplay,
  onQuit,
}: {
  room: RoomState;
  hand: Hand;
  myPlayerId: string;
  messages: ChatMessage[];
  onLock: (cardIds: string[]) => void;
  onSelectWinner: (submissionIndex: number) => void;
  onSendChat: (text: string) => void;
  onReplay: () => void;
  onQuit: () => void;
}) {
  const isJudge = room.judgeId === myPlayerId;
  const judge = room.players.find((p) => p.id === room.judgeId);
  const nonJudgeCount = room.players.length - 1;
  const allCards = [...hand.noun, ...hand.verb, ...hand.adjective];
  const slots = room.currentPrompt?.slots ?? [];

  const [assigned, setAssigned] = useState<(Card | null)[]>([]);
  const [locked, setLocked] = useState(false);
  const [stacks, setStacks] = useState<Stacks>({
    noun: [],
    verb: [],
    adjective: [],
  });
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());
  const [zoomedCard, setZoomedCard] = useState<Card | null>(null);

  // Mobile carousel
  const [mobileFocusedIndex, setMobileFocusedIndex] = useState(0);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAssigned(slots.map(() => null));
    setLocked(false);
    setFlippedIds(new Set());
    setZoomedCard(null);
    setMobileFocusedIndex(0);
  }, [room.roundNumber]);

  useEffect(() => {
    setStacks((prev) => {
      const next: Stacks = { noun: [], verb: [], adjective: [] };
      CATEGORIES.forEach((cat) => {
        const idsInHand = new Set(hand[cat].map((c) => c.id));
        const kept = prev[cat].filter((id) => idsInHand.has(id));
        const missing = hand[cat]
          .map((c) => c.id)
          .filter((id) => !kept.includes(id));
        next[cat] = [...missing, ...kept];
      });
      return next;
    });
  }, [hand]);

  const canPick = room.status === "playing" && !isJudge && !locked;

  // Flattened view of stacks used for mobile carousel
  const mobileFlatOrder = CATEGORIES.flatMap((cat) =>
    stacks[cat].map((id) => ({ id, category: cat })),
  );

  // Keep the focused index valid as cards get played
  useEffect(() => {
    setMobileFocusedIndex((idx) =>
      Math.min(idx, Math.max(0, mobileFlatOrder.length - 1)),
    );
  }, [mobileFlatOrder.length]);

  function handleMobileScroll() {
    const el = mobileScrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / MOBILE_CARD_STEP);
    setMobileFocusedIndex(
      Math.max(0, Math.min(mobileFlatOrder.length - 1, idx)),
    );
  }

  function cardById(id: string) {
    return allCards.find((c) => c.id === id);
  }

  /** Move a card to the front of its stack */
  function bringToTop(card: Card) {
    setStacks((prev) => ({
      ...prev,
      [card.category]: [
        ...prev[card.category].filter((id) => id !== card.id),
        card.id,
      ],
    }));
  }

  /** Place a card in the next empty matching blank and pop it off its stack */
  function selectTopCard(card: Card) {
    const firstEmpty = slots.findIndex(
      (cat, i) => cat === card.category && assigned[i] === null,
    );
    if (firstEmpty === -1) return;
    const next = [...assigned];
    next[firstEmpty] = card;
    setAssigned(next);
    setStacks((prev) => ({
      ...prev,
      [card.category]: prev[card.category].filter((id) => id !== card.id),
    }));
  }

  function handleStackCardClick(card: Card) {
    if (!canPick) return;
    const order = stacks[card.category];
    const isTop = order[order.length - 1] === card.id;

    if (isTop) {
      selectTopCard(card);
    } else {
      bringToTop(card);
    }
  }

  function handleMobileCardClick(card: Card) {
    if (!canPick) return;
    selectTopCard(card);
  }

  /** Clearing a blank returns the card to the top of its stack */
  function clearSlot(slotIdx: number) {
    if (!canPick) return;
    const removed = assigned[slotIdx];
    const next = [...assigned];
    next[slotIdx] = null;
    setAssigned(next);
    if (removed) {
      setStacks((prev) => ({
        ...prev,
        [removed.category]: [...prev[removed.category], removed.id],
      }));
    }
  }

  /** Toggle the flip state of a card */
  function toggleFlip(id: string) {
    setFlippedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  /** Return all assigned cards to their stacks and clear the slots */
  function reset() {
    if (!canPick) return;

    setStacks((prev) => {
      const next = { ...prev };
      assigned.forEach((card) => {
        if (card) next[card.category] = [...next[card.category], card.id];
      });
      return next;
    });

    setAssigned(slots.map(() => null));
  }

  function lockIn() {
    if (assigned.some((a) => a === null) || locked) return;
    setLocked(true);
    onLock(assigned.map((c) => c!.id));
  }

  const allFilled = assigned.length > 0 && assigned.every((a) => a !== null);
  const filledText = assigned.map((c) => c?.text.toLowerCase() ?? null);

  const winner = [...room.players].sort((a, b) => b.score - a.score)[0];

  function useCountDown(targetMs: number | null): number | null {
    const [now, setNow] = useState<number>(Date.now());

    useEffect(() => {
      if (targetMs === null) return;
      const timer = setInterval(() => {
        setNow(Date.now());
      }, 250);
      return () => clearInterval(timer);
    }, [targetMs]);

    return targetMs === null
      ? null
      : Math.max(0, Math.ceil((targetMs - now) / 1000));
  }

  const secondsLeft = useCountDown(room.roundEndsAt);

  return (
    <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-4 p-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4">
        {room.status === "playing" && isJudge && room.currentPrompt && (
          <div className="rounded-xl border border-ll-blue bg-white p-6 text-center space-y-3">
            <h2 className="font-display text-2xl">
              <span className="text-ll-blue">YOU</span> ARE JUDGING!
            </h2>
            <PromptSentence
              template={room.currentPrompt.template}
              slots={room.currentPrompt.slots}
              filledText={room.currentPrompt.slots.map(() => null)}
            />

            <p className="italic text-slate-400">
              Waiting on {Math.max(0, nonJudgeCount - room.submittedCount)}{" "}
              {Math.max(0, nonJudgeCount - room.submittedCount) === 1
                ? "player"
                : "players"}
              ...
            </p>
          </div>
        )}

        {room.status === "playing" && !isJudge && room.currentPrompt && (
          <div className="rounded-xl border border-ll-blue bg-white p-6 space-y-3">
            <h2 className="text-center font-display text-2xl">
              <span className="text-ll-blue">{judge?.name ?? "..."}</span> is
              judging!
            </h2>
            <PromptSentence
              template={room.currentPrompt.template}
              slots={room.currentPrompt.slots}
              filledText={filledText}
              onBlankClick={canPick ? clearSlot : undefined}
            />
            {canPick && (
              <div className="flex justify-center gap-3">
                <button
                  onClick={reset}
                  className="rounded-lg bg-red-400 px-6 py-2 font-display text-white text-xl"
                >
                  Reset
                </button>
                <button
                  onClick={lockIn}
                  disabled={!allFilled}
                  className="rounded-lg bg-ll-blue px-6 py-2 font-display text-white text-xl disabled:opacity-50"
                >
                  Lock
                </button>
              </div>
            )}
            {locked && (
              <p className="text-center italic text-slate-400">
                Cards locked in! Waiting on other players...
              </p>
            )}
          </div>
        )}

        {room.status === "judging" && (
          <div className="rounded-xl border border-ll-blue bg-white p-6 space-y-3">
            <JudgingPanel
              room={room}
              isJudge={isJudge}
              onSelectWinner={onSelectWinner}
              judgeName={judge?.name ?? "..."}
            />
          </div>
        )}

        {room.status === "round_end" && room.lastRoundResult && (
          <div className="rounded-xl border border-ll-blue bg-white p-6 text-center space-y-3">
            <h2 className="font-display text-2xl">
              <span className="text-ll-blue">
                {room.lastRoundResult.winnerName}
              </span>{" "}
              wins the round!{" "}
              <span className="text-ll-blue">
                (+
                {room.lastRoundResult.pointsAwarded} pts)
              </span>
            </h2>

            <div className="flex h-[120px] items-center justify-center">
              <p className="text-lg italic leading-relaxed">
                &ldquo;{room.lastRoundResult.filledText}&rdquo;
              </p>
            </div>

            <p className="italic text-slate-400">
              Next round starting in {secondsLeft ?? "..."}s
            </p>
          </div>
        )}

        {room.status === "game_over" && (
          <div className="rounded-xl border border-ll-blue bg-white p-6 text-center space-y-3">
            <h2 className="font-display text-2xl text-ll-blue">GAME OVER!</h2>

            <div className="flex h-[120px] items-center justify-center">
              <p className="text-lg">
                {winner && (
                  <span className="font-bold" style={{ color: winner.color }}>
                    {winner.name}
                  </span>
                )}{" "}
                has won the game!
              </p>
            </div>

            <div className="flex justify-center gap-6">
              <button
                onClick={onQuit}
                className="rounded-lg bg-red-400 px-6 py-2 font-display text-white text-xl"
              >
                Quit
              </button>
              <button
                onClick={onReplay}
                className="rounded-lg bg-ll-blue px-6 py-2 font-display text-white text-xl"
              >
                Replay
              </button>
            </div>
          </div>
        )}

        {/* Desktop displays a stack of cards for each category */}
        {allCards.length > 0 && (
          <div
            className={`hidden lg:flex flex-wrap justify-center gap-12 ${canPick ? "" : "opacity-60"}`}
          >
            {CATEGORIES.map((cat) => {
              const order = stacks[cat];
              const stackOffset =
                order.length > 1
                  ? (MAX_STACK_HEIGHT - STACK_CARD_HEIGHT) / 2
                  : 0;

              if (order.length === 0) return null;
              return (
                <div
                  key={cat}
                  className="relative"
                  style={{
                    width: 192,
                    height:
                      STACK_CARD_HEIGHT + (order.length - 1) * stackOffset,
                  }}
                >
                  {order.map((id, i) => {
                    const card = cardById(id);
                    if (!card) return null;
                    const isTop = i === order.length - 1;
                    return (
                      <div
                        key={id}
                        className="absolute left-0"
                        style={{
                          top: i * stackOffset,
                          zIndex: i,
                          height: STACK_CARD_HEIGHT,
                        }}
                      >
                        <SlangCard
                          card={card}
                          small
                          disabled={!canPick}
                          flipped={isTop && flippedIds.has(id)}
                          onClick={() => handleStackCardClick(card)}
                        />
                        {isTop && canPick && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setZoomedCard(card);
                              }}
                              className="absolute -right-10 bottom-12 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-ll-blue bg-white text-ll-blue hover:bg-ll-blue hover:text-white"
                              aria-label="Zoom card"
                            >
                              <ZoomIn size={14} strokeWidth={3} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFlip(id);
                              }}
                              className="absolute -right-10 bottom-2 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-ll-blue bg-white text-ll-blue hover:bg-ll-blue hover:text-white"
                              aria-label="Flip card"
                            >
                              <RotateCw size={14} strokeWidth={3} />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* Mobile displays a single swipeable row of cards */}
        {mobileFlatOrder.length > 0 && (
          <div
            className={`flex lg:hidden flex-col ${canPick ? "" : "opacity-60"}`}
          >
            <div
              ref={mobileScrollRef}
              onScroll={handleMobileScroll}
              className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth pt-1 [&::-webkit-scrollbar]:hidden"
              style={{
                gap: MOBILE_CARD_GAP,
                paddingLeft: `calc(50% - ${MOBILE_CARD_WIDTH / 2}px)`,
                paddingRight: `calc(50% - ${MOBILE_CARD_WIDTH / 2}px)`,
                scrollbarWidth: "none",
              }}
            >
              {mobileFlatOrder.map((entry, i) => {
                const card = cardById(entry.id);
                if (!card) return null;
                const isFocused =
                  i ===
                  Math.min(mobileFocusedIndex, mobileFlatOrder.length - 1);
                return (
                  <div
                    key={entry.id}
                    className="shrink-0 snap-center transition-all duration-150"
                    style={{
                      width: MOBILE_CARD_WIDTH,
                      scrollSnapAlign: "center",
                      opacity: isFocused ? 1 : 0.4,
                      transform: isFocused ? "scale(1)" : "scale(0.92)",
                    }}
                  >
                    <SlangCard
                      card={card}
                      small
                      disabled={!canPick || !isFocused}
                      flipped={isFocused && flippedIds.has(card.id)}
                      onClick={() => isFocused && handleMobileCardClick(card)}
                    />
                  </div>
                );
              })}
            </div>

            {canPick && mobileFlatOrder[mobileFocusedIndex] && (
              <div className="mx-auto mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    toggleFlip(mobileFlatOrder[mobileFocusedIndex].id)
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-ll-blue bg-white text-ll-blue"
                  aria-label="Flip card"
                >
                  <RotateCw size={16} strokeWidth={3} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const focusedCard = cardById(
                      mobileFlatOrder[mobileFocusedIndex].id,
                    );
                    if (focusedCard) setZoomedCard(focusedCard);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-ll-blue bg-white text-ll-blue"
                  aria-label="Zoom card"
                >
                  <ZoomIn size={16} strokeWidth={3} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <Scoreboard players={room.players} myPlayerId={myPlayerId} />
        <div className="min-h-[260px] flex-1">
          <Chat messages={messages} onSend={onSendChat} />
        </div>
      </div>

      {zoomedCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setZoomedCard(null)}
        >
          <div className="scale-[1.5] lg:scale-[1.8]">
            <SlangCard
              card={zoomedCard}
              flipped={flippedIds.has(zoomedCard.id)}
              onClick={() => setZoomedCard(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function JudgingPanel({
  room,
  isJudge,
  onSelectWinner,
  judgeName,
}: {
  room: RoomState;
  isJudge: boolean;
  onSelectWinner: (submissionIndex: number) => void;
  judgeName: string;
}) {
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [room.roundNumber]);

  const submission = room.submissions[index];
  const canGoBack = index > 0;
  const canGoForward = index < room.submissions.length - 1;

  return (
    <div className="text-center space-y-3">
      <h2 className="font-display text-2xl">
        {isJudge ? (
          <>
            <span className="text-ll-blue">You</span> are judging!
          </>
        ) : (
          <>
            <span className="text-ll-blue">{judgeName}</span> is judging!
          </>
        )}
      </h2>

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={!canGoBack}
          className="text-3xl text-ll-blue disabled:opacity-20"
          aria-label="Previous submission"
        >
          <ArrowLeft size={24} strokeWidth={4} />
        </button>

        <div className="flex h-[120px] flex-1 items-center justify-center">
          {submission ? (
            <p className="text-lg leading-relaxed">{submission.filledText}</p>
          ) : (
            <p className="italic text-slate-400">No submissions</p>
          )}
        </div>

        <button
          onClick={() =>
            setIndex((i) => Math.min(room.submissions.length - 1, i + 1))
          }
          disabled={!canGoForward}
          className="text-3xl text-ll-blue disabled:opacity-20"
          aria-label="Next submission"
        >
          <ArrowRight size={24} strokeWidth={4} />
        </button>
      </div>

      {isJudge && submission && (
        <button
          onClick={() => onSelectWinner(index)}
          className="rounded-lg bg-ll-blue px-10 py-2 font-display text-white text-xl"
        >
          Select
        </button>
      )}
      {!isJudge && (
        <p className="italic text-slate-400">
          Waiting for {judgeName} to pick a winner...
        </p>
      )}
    </div>
  );
}
