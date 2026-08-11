import { useEffect, useState } from "react";

/** Ticks down to a target timestamp in whole seconds by ceiling */
export function useCountdown(targetMs: number | null): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (targetMs === null) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [targetMs]);

  return targetMs === null
    ? null
    : Math.max(0, Math.ceil((targetMs - now) / 1000));
}
