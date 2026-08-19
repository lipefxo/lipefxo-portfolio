"use client";

import {
  useCallback,
  useRef,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  NfcIcon,
  ViewIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import { AnimatePresence, motion } from "motion/react";
import styles from "./higlobe-prototype.module.css";

export type CardStatus = "active" | "frozen";
export type CardFace = "front" | "back";

interface HiglobePhysicalCardProps {
  detailsRevealed: boolean;
  face: CardFace;
  reducedMotion: boolean;
  status: CardStatus;
  onToggleReveal: () => void;
}

const CARD_FLIP_TRANSITION = {
  duration: 0.78,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

function AnimatedCardValue({
  revealed,
  maskedParts,
  reducedMotion,
  revealedParts,
  separator = "",
}: {
  revealed: boolean;
  maskedParts: readonly ReactNode[];
  reducedMotion: boolean;
  revealedParts: readonly ReactNode[];
  separator?: string;
}) {
  const parts = revealed ? revealedParts : maskedParts;

  if (reducedMotion) {
    return <strong>{parts.map(String).join(separator)}</strong>;
  }

  return (
    <span className={styles.physicalCardValueSwap}>
      <AnimatePresence initial={false}>
        <motion.strong
          key={revealed ? "revealed" : "masked"}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {parts.map((part, index) => (
            <motion.span
              key={`${revealed ? "revealed" : "masked"}-${index}`}
              className={styles.physicalCardValuePart}
              custom={{ index, total: parts.length }}
              variants={{
                hidden: { opacity: 0, y: 4, filter: "blur(3px)" },
                visible: ({ index: partIndex }: { index: number }) => ({
                  opacity: 1,
                  y: 0,
                  filter: "blur(0px)",
                  transition: {
                    delay: partIndex * 0.035,
                    duration: 0.18,
                    ease: [0.22, 1, 0.36, 1],
                  },
                }),
                exit: ({ index: partIndex, total }: { index: number; total: number }) => ({
                  opacity: 0,
                  y: -3,
                  filter: "blur(2px)",
                  transition: {
                    delay: (total - partIndex - 1) * 0.02,
                    duration: 0.12,
                    ease: "easeOut",
                  },
                }),
              }}
            >
              {part}
              {index < parts.length - 1 ? separator : null}
            </motion.span>
          ))}
        </motion.strong>
      </AnimatePresence>
    </span>
  );
}

export function HiglobePhysicalCard({
  detailsRevealed,
  face,
  reducedMotion,
  status,
  onToggleReveal,
}: HiglobePhysicalCardProps) {
  const tiltRef = useRef<HTMLDivElement>(null);
  const frozen = status === "frozen";
  const showingBack = face === "back";

  const resetTilt = useCallback(() => {
    const element = tiltRef.current;
    if (!element) return;
    element.style.setProperty("--card-tilt-x", "-2deg");
    element.style.setProperty("--card-tilt-y", "4deg");
    element.style.setProperty("--card-light-x", "40%");
    element.style.setProperty("--card-light-y", "22%");
  }, []);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (frozen || showingBack || reducedMotion || event.pointerType !== "mouse") return;
    if (event.target instanceof Element && event.target.closest("button")) return;

    const element = tiltRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const x = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    const y = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1);
    element.style.setProperty("--card-tilt-x", `${((0.5 - y) * 6 - 2).toFixed(2)}deg`);
    element.style.setProperty("--card-tilt-y", `${((x - 0.5) * 6 + 4).toFixed(2)}deg`);
    element.style.setProperty("--card-light-x", `${(x * 100).toFixed(1)}%`);
    element.style.setProperty("--card-light-y", `${(y * 100).toFixed(1)}%`);
  }, [frozen, reducedMotion, showingBack]);

  return (
    <div
      className={styles.physicalCardStage}
      data-frozen={frozen || undefined}
      data-face={face}
      data-reduced-motion={reducedMotion || undefined}
    >
      <div className={styles.physicalCardFloat}>
        <div
          ref={tiltRef}
          className={styles.physicalCardTilt}
          data-frozen={frozen || undefined}
          data-face={face}
          onPointerMove={handlePointerMove}
          onPointerLeave={resetTilt}
        >
          <div
            className={styles.physicalCard}
            id="higlobe-physical-card"
            role="group"
            data-frozen={frozen || undefined}
            aria-label={`Higlobe card, ${status}`}
          >
            <motion.section
              className={`${styles.physicalCardFace} ${styles.physicalCardFront}`}
              aria-hidden={showingBack}
              inert={showingBack ? true : undefined}
              initial={false}
              animate={reducedMotion
                ? { opacity: showingBack ? 0 : 1, rotateY: 0 }
                : { opacity: 1, rotateY: showingBack ? -180 : 0 }}
              transition={reducedMotion ? { duration: 0 } : CARD_FLIP_TRANSITION}
            >
              <Image
                className={styles.physicalCardLogo}
                src="/higlobe-prototype/higlobe.svg"
                width={112}
                height={32}
                alt="Higlobe"
                priority
              />
              <span className={styles.physicalCardNfc} aria-hidden="true">
                <HugeiconsIcon icon={NfcIcon} size={38} strokeWidth={1.6} />
              </span>
              <span className={styles.physicalCardNumber}>•••• 4821</span>
              <span className={styles.physicalCardHolder}>Higlobe</span>
              <span className={styles.physicalCardExpiry}>08/29</span>
              <span className={styles.physicalCardTexture} aria-hidden="true" />
              <span className={styles.physicalCardSpecular} aria-hidden="true" />
            </motion.section>

            <motion.section
              id="higlobe-card-details-face"
              className={`${styles.physicalCardFace} ${styles.physicalCardBack}`}
              aria-hidden={!showingBack}
              inert={!showingBack ? true : undefined}
              initial={false}
              animate={reducedMotion
                ? { opacity: showingBack ? 1 : 0, rotateY: 0 }
                : { opacity: 1, rotateY: showingBack ? 0 : 180 }}
              transition={reducedMotion ? { duration: 0 } : CARD_FLIP_TRANSITION}
            >
              <span className={styles.physicalCardStripe} aria-hidden="true" />
              <div className={styles.physicalCardBackDetails}>
                <div className={styles.physicalCardDetailNumber}>
                  <span>Card number</span>
                  <AnimatedCardValue
                    revealed={detailsRevealed}
                    maskedParts={["••••", "••••", "••••", "4821"]}
                    reducedMotion={reducedMotion}
                    revealedParts={["4521", "0918", "2746", "4821"]}
                    separator=" "
                  />
                </div>
                <div className={styles.physicalCardDetailMeta}>
                  <span><small>Expires</small><strong>08/29</strong></span>
                  <span>
                    <small>Security code</small>
                    <AnimatedCardValue
                      revealed={detailsRevealed}
                      maskedParts={["•", "•", "•"]}
                      reducedMotion={reducedMotion}
                      revealedParts={["3", "8", "4"]}
                    />
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.physicalCardReveal}
                  aria-pressed={detailsRevealed}
                  onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
                  onClick={onToggleReveal}
                >
                  <HugeiconsIcon
                    icon={detailsRevealed ? ViewOffSlashIcon : ViewIcon}
                    size={16}
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <span>{detailsRevealed ? "Hide" : "Reveal"}</span>
                </button>
              </div>
              <span className={styles.physicalCardTexture} aria-hidden="true" />
              <span className={styles.physicalCardSpecular} aria-hidden="true" />
            </motion.section>
          </div>
        </div>
      </div>
      <span className={styles.physicalCardShadow} aria-hidden="true" />
    </div>
  );
}
