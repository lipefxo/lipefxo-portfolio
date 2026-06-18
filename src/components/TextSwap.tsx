"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";

type TextSwapProps = {
  /** Items to cycle through, in order. The first is rendered on the server. */
  items: ReactNode[];
  /** Monotonic counter — each increment triggers one swap to the next item. */
  signal: number;
  /** Extra classes merged onto the swapping span. */
  className?: string;
};

/* Pause between the old item fully leaving and the new one arriving, so the
   two phases read as distinct, deliberate beats. */
const HOLD_BETWEEN_MS = 70;

/**
 * Cycles its content through `items` with the Transitions.dev "text states
 * swap" animation (old item slides up + blurs out, new item slides in from
 * below). The span sizes naturally to the current item, so the line adapts to
 * each word's width.
 *
 * Swapping is driven externally via `signal` so multiple instances can share a
 * single clock (see CyclingTokens) and never animate at the same moment. Each
 * increment runs the three-phase sequence in sync with the `.t-text-swap` CSS:
 *   1. add `.is-exit`             -> current item slides up + blurs + fades.
 *   2. after --text-swap-exit-dur -> flushSync the next item in, clear
 *      (+ a short hold)              `.is-exit`, add `.is-enter-start` so it
 *                                    jumps below with no transition.
 *   3. force reflow, remove `.is-enter-start` -> new item settles into place.
 */
export function TextSwap({ items, signal, className }: TextSwapProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const indexRef = useRef(0);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || items.length < 2 || signal <= 0) return;

    const styles = getComputedStyle(el);
    const exitDur =
      parseFloat(styles.getPropertyValue("--text-swap-exit-dur")) || 160;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const timeouts: Array<ReturnType<typeof setTimeout>> = [];
    const next = (indexRef.current + 1) % items.length;

    el.classList.add("is-exit");
    timeouts.push(
      setTimeout(
        () => {
          // Swap content synchronously before staging the enter. React leaves
          // `className` untouched (the prop never changed), so the exit class
          // must be cleared imperatively or the item stays blank.
          flushSync(() => {
            indexRef.current = next;
            setIndex(next);
          });
          el.classList.remove("is-exit");
          el.classList.add("is-enter-start");
          // Force reflow so the jump-below state applies before release.
          void el.offsetWidth;
          timeouts.push(
            setTimeout(
              () => el.classList.remove("is-enter-start"),
              reduceMotion ? 0 : HOLD_BETWEEN_MS,
            ),
          );
        },
        reduceMotion ? 0 : exitDur,
      ),
    );

    return () => timeouts.forEach(clearTimeout);
  }, [signal, items]);

  return (
    <span
      ref={ref}
      className={["t-text-swap", className].filter(Boolean).join(" ")}
    >
      {items[index]}
    </span>
  );
}
