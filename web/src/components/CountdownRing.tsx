import { useCountdown } from "../lib/useCountdown";

export function CountdownRing({
  endsAt,
  totalSeconds,
}: {
  endsAt: number | null;
  totalSeconds: number;
}) {
  const secondsLeft = useCountdown(endsAt);
  if (endsAt === null || secondsLeft === null) return null;

  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, secondsLeft / totalSeconds));
  const dashOffset = circumference * (1 - progress);
  const urgent = secondsLeft <= 5;

  return (
    <div
      className={`absolute right-2 top-2 flex h-10 w-10 items-center justify-center ${
        urgent ? "text-red-600" : "text-ll-blue"
      }`}
    >
      <svg
        viewBox="0 0 44 44"
        className="absolute h-10 w-10"
        style={{ transform: "rotate(-270deg) scaleX(-1)" }}
      >
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="4"
        />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-300 ease-linear"
        />
      </svg>
      <span className="font-display text-sm font-bold">{secondsLeft}</span>
    </div>
  );
}
