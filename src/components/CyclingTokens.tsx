"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import TextRotate, {
  type TextRotateRef,
} from "@/components/fancy/text/text-rotate";
import { getSvglIcon } from "@/lib/svgl-icons";
import { SvglInlineIcon } from "./SvglInlineIcon";

type Cycle = {
  texts: string[];
  /** Time each item stays before swapping, in ms. */
  interval: number;
  /** Time before this cycle's first swap, in ms. */
  offset: number;
  /** Classes for the token container (color/weight; inherited by each glyph). */
  className?: string;
  /** Classes for each animated glyph (e.g. the shimmer — must clip per glyph). */
  glyphClassName?: string;
};

type ToolCycle = Cycle & {
  /** svgl icon keys, parallel to `texts`. */
  icons: string[];
};

/* Minimum spacing between any two swaps. Larger than one token's full
   per-character stagger so a swap always finishes before the next begins —
   the action word and the tool never animate at the same time. */
const MIN_GAP_MS = 1100;

/* Shared per-character motion, matching the Fancy TextRotate reference: a quick
   spring with letters staggered in from the last character. */
const STAGGER_FROM = "last" as const;
const STAGGER_DURATION = 0.025;
const SWAP_TRANSITION = { type: "spring", damping: 30, stiffness: 400 } as const;
/* Fade as the letters roll so they're near-transparent by the time they reach
   the line's top/bottom edges — this hides the sub-2px sliver that lives in the
   line's half-leading, which can't be clipped without cropping descenders. */
const SWAP_INITIAL = { y: "100%", opacity: 0 } as const;
const SWAP_ANIMATE = { y: 0, opacity: 1 } as const;
const SWAP_EXIT = { y: "-120%", opacity: 0 } as const;

/**
 * Renders the action + tool cycles from a single shared clock. Each cycle keeps
 * its own cadence, but the scheduler serializes the swaps: whenever two would
 * land within MIN_GAP_MS of each other, the later one is nudged just past the
 * gap, so the two tokens never swap simultaneously.
 *
 * The swaps themselves are the Fancy `TextRotate` per-character animation. Both
 * instances run with `auto={false}` and are advanced imperatively via their
 * refs, so the shared clock — not each component's own timer — controls timing.
 */
export function CyclingTokens({
  action,
  tool,
}: {
  action: Cycle;
  tool: ToolCycle;
}) {
  const actionRef = useRef<TextRotateRef>(null);
  const toolRef = useRef<TextRotateRef>(null);
  // Tracks the tool's current index so the icon stays in sync with the label.
  const [toolIndex, setToolIndex] = useState(0);

  useEffect(() => {
    const refs = [actionRef, toolRef];
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
          refs[idx].current?.next();
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

  const toolIcon = getSvglIcon(tool.icons[toolIndex]);

  return (
    <>
      <TextRotate
        ref={actionRef}
        texts={action.texts}
        auto={false}
        loop
        splitBy="characters"
        staggerFrom={STAGGER_FROM}
        staggerDuration={STAGGER_DURATION}
        transition={SWAP_TRANSITION}
        initial={SWAP_INITIAL}
        animate={SWAP_ANIMATE}
        exit={SWAP_EXIT}
        animatePresenceMode="popLayout"
        mainClassName={action.className}
        elementLevelClassName={action.glyphClassName}
      />{" "}
      <span className="inline-flex items-baseline whitespace-nowrap">
        <AnimatePresence mode="popLayout" initial={false}>
          {toolIcon && (
            <motion.span
              key={toolIndex}
              className="inline-flex"
              initial={{ opacity: 0, y: "40%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "-40%" }}
              transition={SWAP_TRANSITION}
            >
              <SvglInlineIcon route={toolIcon.route} />
            </motion.span>
          )}
        </AnimatePresence>
        <TextRotate
          ref={toolRef}
          texts={tool.texts}
          auto={false}
          loop
          splitBy="characters"
          staggerFrom={STAGGER_FROM}
          staggerDuration={STAGGER_DURATION}
          transition={SWAP_TRANSITION}
          initial={SWAP_INITIAL}
          animate={SWAP_ANIMATE}
          exit={SWAP_EXIT}
          animatePresenceMode="popLayout"
          onNext={setToolIndex}
          mainClassName={
            toolIcon ? `ml-1 ${tool.className ?? ""}`.trim() : tool.className
          }
          elementLevelClassName={tool.glyphClassName}
        />
      </span>
    </>
  );
}
