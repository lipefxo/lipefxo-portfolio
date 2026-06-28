"use client";

import { useState } from "react";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  type Transition,
  useReducedMotion,
} from "motion/react";
import type { CurrentlyEntry, CurrentlyItem } from "@/config/site";

const DECK_TRANSITION = {
  type: "spring",
  stiffness: 260,
  damping: 26,
} satisfies Transition;

const TEXT_TRANSITION = {
  type: "spring",
  stiffness: 360,
  damping: 30,
} satisfies Transition;

interface CurrentlyCardProps {
  category: CurrentlyItem;
}

export function CurrentlyCard({ category }: CurrentlyCardProps) {
  const [order, setOrder] = useState(() =>
    category.items.map((_, index) => index),
  );
  const [isDeckActive, setIsDeckActive] = useState(false);
  const reduceMotion = useReducedMotion();
  const frontIndex = order[0] ?? 0;
  const front = category.items[frontIndex];
  const canShuffle = category.items.length > 1;
  const shouldOpenDeck = isDeckActive && !reduceMotion;

  const shuffle = () => {
    setOrder((current) => [...current.slice(1), current[0]]);
  };

  if (!front) return null;

  return (
    <div className="flex h-full flex-col gap-3">
      {canShuffle ? (
        <motion.button
          type="button"
          onClick={shuffle}
          onBlur={() => setIsDeckActive(false)}
          onFocus={() => setIsDeckActive(true)}
          onHoverEnd={() => setIsDeckActive(false)}
          onHoverStart={() => setIsDeckActive(true)}
          aria-label={`Shuffle ${category.label}, currently ${front.title}`}
          whileTap={reduceMotion ? undefined : { scale: 0.97 }}
          className="group relative size-[72px] cursor-pointer overflow-visible rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-zinc-50/70 dark:focus-visible:ring-offset-zinc-950"
        >
          <span aria-hidden="true" className="absolute inset-0">
            {order.map((entryIndex, depth) => {
              const entry = category.items[entryIndex];
              const visibleDepth = Math.min(depth, 2);

              return (
                <motion.span
                  key={entryIndex}
                  layout
                  className="absolute inset-0"
                  style={{ zIndex: category.items.length - depth }}
                  animate={
                    reduceMotion
                      ? {
                          opacity: depth === 0 ? 1 : 0,
                          rotate: 0,
                          scale: 1,
                          x: 0,
                          y: 0,
                        }
                      : {
                          opacity: depth > 2 ? 0 : 1,
                          rotate:
                            depth === 0
                              ? 0
                              : depth % 2
                                ? shouldOpenDeck
                                  ? -9
                                  : -6
                                : shouldOpenDeck
                                  ? 9
                                  : 6,
                          scale:
                            depth === 0 && shouldOpenDeck
                              ? 1.03
                              : 1 - visibleDepth * (shouldOpenDeck ? 0.055 : 0.07),
                          x: visibleDepth * (shouldOpenDeck ? 7 : 4),
                          y:
                            depth === 0
                              ? shouldOpenDeck
                                ? -4
                                : 0
                              : visibleDepth * (shouldOpenDeck ? -8 : -5),
                        }
                  }
                  transition={reduceMotion ? { duration: 0 } : DECK_TRANSITION}
                >
                  <EntryTile entry={entry} decorative />
                </motion.span>
              );
            })}
          </span>
        </motion.button>
      ) : (
        <EntryTile entry={front} />
      )}

      <div className="flex min-h-[58px] flex-col gap-0.5">
        <span className="text-[10px] font-medium tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
          {category.label}
        </span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={frontIndex}
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={reduceMotion ? { duration: 0 } : TEXT_TRANSITION}
            aria-live="polite"
          >
            <span className="block text-sm leading-snug font-medium text-zinc-950 dark:text-zinc-50">
              {front.title}
            </span>
            {front.detail && (
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                {front.detail}
              </span>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function EntryTile({
  entry,
  decorative = false,
}: {
  entry: CurrentlyEntry;
  decorative?: boolean;
}) {
  return (
    <span className="flex size-[72px] items-center justify-center overflow-hidden rounded-xl bg-zinc-100 text-2xl ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10">
      {entry.image ? (
        <Image
          src={entry.image}
          alt={decorative ? "" : entry.title}
          width={72}
          height={72}
          sizes="72px"
          quality={80}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{entry.icon}</span>
      )}
    </span>
  );
}
