"use client";

import {
  type ElementType,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import {
  AnimatePresence,
  type AnimatePresenceProps,
  motion,
  type MotionProps,
  type Transition,
  useReducedMotion,
} from "motion/react";

import { cn } from "@/lib/utils";

// Split text into characters with support for unicode and emojis.
const splitIntoCharacters = (text: string): string[] => {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), ({ segment }) => segment);
  }
  // Fallback for browsers that don't support Intl.Segmenter.
  return Array.from(text);
};

interface TextRotateProps {
  /** Strings to rotate through. */
  texts: string[];
  /** Render as this HTML tag. Defaults to a `span` so it can sit inline in prose. */
  as?: ElementType;
  /** Time between rotations, ms (only used when `auto` is true). */
  rotationInterval?: number;
  initial?: MotionProps["initial"] | MotionProps["initial"][];
  animate?: MotionProps["animate"] | MotionProps["animate"][];
  exit?: MotionProps["exit"] | MotionProps["exit"][];
  animatePresenceMode?: AnimatePresenceProps["mode"];
  animatePresenceInitial?: boolean;
  /** Stagger delay between split elements, in seconds. */
  staggerDuration?: number;
  /** Which end the stagger originates from. */
  staggerFrom?: "first" | "last" | "center" | number | "random";
  transition?: Transition;
  loop?: boolean;
  /** Auto-rotate on a timer. Set false to drive externally via the ref. */
  auto?: boolean;
  splitBy?: "words" | "characters" | "lines" | string;
  onNext?: (index: number) => void;
  mainClassName?: string;
  splitLevelClassName?: string;
  elementLevelClassName?: string;
}

/** Imperative handle so a parent can drive rotation (used by CyclingTokens). */
export interface TextRotateRef {
  next: () => void;
  previous: () => void;
  jumpTo: (index: number) => void;
  reset: () => void;
}

interface WordObject {
  characters: string[];
  needsSpace: boolean;
}

const TextRotate = forwardRef<TextRotateRef, TextRotateProps>(
  (
    {
      texts,
      as = "span",
      transition = { type: "spring", damping: 25, stiffness: 300 },
      initial = { y: "100%", opacity: 0 },
      animate = { y: 0, opacity: 1 },
      exit = { y: "-120%", opacity: 0 },
      animatePresenceMode = "wait",
      animatePresenceInitial = false,
      rotationInterval = 2000,
      staggerDuration = 0,
      staggerFrom = "first",
      loop = true,
      auto = true,
      splitBy = "characters",
      onNext,
      mainClassName,
      splitLevelClassName,
      elementLevelClassName,
      ...props
    },
    ref,
  ) => {
    const [currentTextIndex, setCurrentTextIndex] = useState(0);

    // Respect the OS "reduce motion" setting: drop the per-character cascade and
    // settle each word instantly, matching the rest of this codebase.
    const reduceMotion = useReducedMotion();
    const effectiveStagger = reduceMotion ? 0 : staggerDuration;
    const effectiveTransition: Transition = reduceMotion
      ? { duration: 0 }
      : transition;

    // Split the current text into animation segments.
    const elements = useMemo(() => {
      const currentText = texts[currentTextIndex];
      if (splitBy === "characters") {
        const text = currentText.split(" ");
        return text.map((word, i) => ({
          characters: splitIntoCharacters(word),
          needsSpace: i !== text.length - 1,
        }));
      }
      return splitBy === "words"
        ? currentText.split(" ")
        : splitBy === "lines"
          ? currentText.split("\n")
          : currentText.split(splitBy);
    }, [texts, currentTextIndex, splitBy]);

    const getStaggerDelay = useCallback(
      (index: number, totalChars: number) => {
        const total = totalChars;
        if (staggerFrom === "first") return index * effectiveStagger;
        if (staggerFrom === "last")
          return (total - 1 - index) * effectiveStagger;
        if (staggerFrom === "center") {
          const center = Math.floor(total / 2);
          return Math.abs(center - index) * effectiveStagger;
        }
        if (staggerFrom === "random") {
          const randomIndex = Math.floor(Math.random() * total);
          return Math.abs(randomIndex - index) * effectiveStagger;
        }
        return Math.abs(staggerFrom - index) * effectiveStagger;
      },
      [staggerFrom, effectiveStagger],
    );

    const handleIndexChange = useCallback(
      (newIndex: number) => {
        setCurrentTextIndex(newIndex);
        onNext?.(newIndex);
      },
      [onNext],
    );

    const next = useCallback(() => {
      const nextIndex =
        currentTextIndex === texts.length - 1
          ? loop
            ? 0
            : currentTextIndex
          : currentTextIndex + 1;

      if (nextIndex !== currentTextIndex) handleIndexChange(nextIndex);
    }, [currentTextIndex, texts.length, loop, handleIndexChange]);

    const previous = useCallback(() => {
      const prevIndex =
        currentTextIndex === 0
          ? loop
            ? texts.length - 1
            : currentTextIndex
          : currentTextIndex - 1;

      if (prevIndex !== currentTextIndex) handleIndexChange(prevIndex);
    }, [currentTextIndex, texts.length, loop, handleIndexChange]);

    const jumpTo = useCallback(
      (index: number) => {
        const validIndex = Math.max(0, Math.min(index, texts.length - 1));
        if (validIndex !== currentTextIndex) handleIndexChange(validIndex);
      },
      [texts.length, currentTextIndex, handleIndexChange],
    );

    const reset = useCallback(() => {
      if (currentTextIndex !== 0) handleIndexChange(0);
    }, [currentTextIndex, handleIndexChange]);

    const getAnimationProps = useCallback(
      (index: number) => {
        const getProp = (
          prop:
            | MotionProps["initial"]
            | MotionProps["initial"][]
            | MotionProps["animate"]
            | MotionProps["animate"][]
            | MotionProps["exit"]
            | MotionProps["exit"][],
        ) => {
          if (Array.isArray(prop)) return prop[index % prop.length];
          return prop;
        };

        return {
          initial: getProp(initial) as MotionProps["initial"],
          animate: getProp(animate) as MotionProps["animate"],
          exit: getProp(exit) as MotionProps["exit"],
        };
      },
      [initial, animate, exit],
    );

    useImperativeHandle(
      ref,
      () => ({ next, previous, jumpTo, reset }),
      [next, previous, jumpTo, reset],
    );

    useEffect(() => {
      if (!auto) return;
      const intervalId = setInterval(next, rotationInterval);
      return () => clearInterval(intervalId);
    }, [next, rotationInterval, auto]);

    const MotionComponent = useMemo(() => motion.create(as ?? "span"), [as]);

    return (
      <MotionComponent
        // Inline-friendly base (the upstream component is a full-width flex
        // box). `cn` here is a plain join with no tailwind-merge, so the base
        // must not set a `display` that mainClassName would need to override.
        className={cn(
          // `overflow: hidden` masks the per-character vertical roll to the text
          // line (the compositor honors it for the transformed letters, which
          // `clip-path` does not). `t-text-rotate` re-seats the baseline that
          // `overflow: hidden` would otherwise move to the box's bottom edge.
          "relative inline-flex flex-wrap whitespace-pre-wrap t-text-rotate",
          mainClassName,
        )}
        transition={effectiveTransition}
        {...props}
      >
        <span className="sr-only">{texts[currentTextIndex]}</span>

        <AnimatePresence
          mode={animatePresenceMode}
          initial={animatePresenceInitial}
        >
          <motion.span
            key={currentTextIndex}
            className={cn(
              "inline-flex flex-wrap",
              splitBy === "lines" && "flex-col w-full",
            )}
            aria-hidden
          >
            {(splitBy === "characters"
              ? (elements as WordObject[])
              : (elements as string[]).map((el, i) => ({
                  characters: [el],
                  needsSpace: i !== elements.length - 1,
                }))
            ).map((wordObj, wordIndex, array) => {
              const previousCharsCount = array
                .slice(0, wordIndex)
                .reduce((sum, word) => sum + word.characters.length, 0);

              return (
                <span
                  key={wordIndex}
                  className={cn("inline-flex", splitLevelClassName)}
                >
                  {wordObj.characters.map((char, charIndex) => {
                    const totalIndex = previousCharsCount + charIndex;
                    const animationProps = getAnimationProps(totalIndex);
                    return (
                      // `elementLevelClassName` lives on the transformed element
                      // itself (not a static wrapper) so effects like
                      // `background-clip: text` clip per glyph — a container-level
                      // clip would be defeated by each letter's transform.
                      <motion.span
                        {...animationProps}
                        key={totalIndex}
                        transition={{
                          ...effectiveTransition,
                          delay: getStaggerDelay(
                            previousCharsCount + charIndex,
                            array.reduce(
                              (sum, word) => sum + word.characters.length,
                              0,
                            ),
                          ),
                        }}
                        className={cn("inline-block", elementLevelClassName)}
                      >
                        {char}
                      </motion.span>
                    );
                  })}
                  {wordObj.needsSpace && (
                    <span className="whitespace-pre"> </span>
                  )}
                </span>
              );
            })}
          </motion.span>
        </AnimatePresence>
      </MotionComponent>
    );
  },
);

TextRotate.displayName = "TextRotate";

export default TextRotate;
