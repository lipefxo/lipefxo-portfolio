"use client";

import { useEffect, useState, type ReactNode } from "react";
import { TextSwap } from "./TextSwap";

type Cycle = {
  items: ReactNode[];
  /** Time each item stays before swapping, in ms. */
  interval: number;
  /** Time before this cycle's first swap, in ms. */
  offset: number;
  className?: string;
};

/* Minimum spacing between any two swaps. Larger than one swap's full duration
   (exit + hold + enter) so a swap always finishes before the next begins —
   the action word and the tool never animate at the same time. */
const MIN_GAP_MS = 750;

/**
 * Renders the action + tool cycles from a single shared clock. Each cycle keeps
 * its own cadence, but the scheduler serializes the swaps: whenever two would
 * land within MIN_GAP_MS of each other, the later one is nudged just past the
 * gap, so the two tokens never swap simultaneously.
 */
export function CyclingTokens({ action, tool }: { action: Cycle; tool: Cycle }) {
  const [signals, setSignals] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    const intervals = [action.interval, tool.interval];
    const nextAt = [action.offset, tool.offset];
    let lastFired = -Infinity;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const t0 = performance.now();

    const tick = () => {
      if (cancelled) return;
      const now = performance.now() - t0;
      const idx = nextAt[0] <= nextAt[1] ? 0 : 1;

      if (now >= nextAt[idx]) {
        if (now - lastFired < MIN_GAP_MS) {
          // Too close to the previous swap — defer just past the gap.
          nextAt[idx] = lastFired + MIN_GAP_MS;
        } else {
          lastFired = now;
          setSignals((s) => {
            const n: [number, number] = [s[0], s[1]];
            n[idx] += 1;
            return n;
          });
          nextAt[idx] += intervals[idx];
        }
      }

      const wait = Math.max(
        16,
        Math.min(nextAt[0], nextAt[1]) - (performance.now() - t0),
      );
      timer = setTimeout(tick, wait);
    };

    timer = setTimeout(tick, Math.max(0, Math.min(nextAt[0], nextAt[1])));

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [action.interval, action.offset, tool.interval, tool.offset]);

  return (
    <>
      <TextSwap items={action.items} signal={signals[0]} className={action.className} />{" "}
      <TextSwap items={tool.items} signal={signals[1]} className={tool.className} />
    </>
  );
}
