"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  Copy02Icon,
  CopyCheckIcon,
} from "@hugeicons/core-free-icons";
import { motion, useReducedMotion } from "motion/react";
import styles from "./paper-dashboard.module.css";

const PIX_CODE = "1fas125090as9f-1221t6a-oi1jihasf-15297c6as7";
const DEPOSIT_LAYOUT_TRANSITION = {
  layout: {
    duration: 0.48,
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  },
};
const POPOVER_WIDTH = 400;
const VIEWPORT_MARGIN = 16;
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

type PopoverPosition = {
  left: number;
  maxHeight: number;
  ready: boolean;
  top: number;
};

const initialPosition: PopoverPosition = {
  left: VIEWPORT_MARGIN,
  maxHeight: 0,
  ready: false,
  top: VIEWPORT_MARGIN,
};

function measurePopover(trigger: HTMLButtonElement | null): PopoverPosition {
  const triggerRect = trigger?.getBoundingClientRect();
  const width = Math.min(POPOVER_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
  const top = Math.max(triggerRect?.top ?? VIEWPORT_MARGIN, VIEWPORT_MARGIN);
  const idealLeft = (triggerRect?.right ?? window.innerWidth - VIEWPORT_MARGIN) - width;
  const left = Math.min(
    Math.max(idealLeft, VIEWPORT_MARGIN),
    window.innerWidth - width - VIEWPORT_MARGIN,
  );

  return {
    left,
    maxHeight: Math.max(0, window.innerHeight - top - VIEWPORT_MARGIN),
    ready: Boolean(triggerRect),
    top,
  };
}

interface DepositFundsModalProps {
  modal: boolean;
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}

export function DepositFundsModal({
  modal,
  open,
  onClose,
  triggerRef,
}: DepositFundsModalProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const copyResetRef = useRef<number | null>(null);
  const restoreTriggerFocusRef = useRef(true);
  const modalRef = useRef(modal);
  const [copyConfirmed, setCopyConfirmed] = useState(false);
  const [position, setPosition] = useState<PopoverPosition>(initialPosition);
  const reducedMotion = Boolean(useReducedMotion());

  useEffect(() => {
    modalRef.current = modal;
  }, [modal]);

  const updatePosition = useCallback(() => {
    setPosition(measurePopover(triggerRef.current));
  }, [triggerRef]);

  useLayoutEffect(() => {
    if (!open) return;

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const triggerElement = triggerRef.current;
    restoreTriggerFocusRef.current = true;

    const focusFrame = window.requestAnimationFrame(() => closeRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        restoreTriggerFocusRef.current = true;
        onClose();
        return;
      }

      if (event.key !== "Tab" || !modalRef.current) return;

      const focusableElements = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
      ).filter((element) => !element.hasAttribute("disabled") && element.offsetParent !== null);

      if (focusableElements.length === 0) {
        event.preventDefault();
        closeRef.current?.focus();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (dialogRef.current?.contains(target) || triggerElement?.contains(target)) return;

      restoreTriggerFocusRef.current = false;
      onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
      if (restoreTriggerFocusRef.current) {
        window.requestAnimationFrame(() => triggerElement?.focus());
      }
    };
  }, [onClose, open, triggerRef]);

  useEffect(() => {
    if (!open || !modal) return;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modal, open]);

  useEffect(() => () => {
    if (copyResetRef.current !== null) window.clearTimeout(copyResetRef.current);
  }, []);

  const handleCopyPreview = useCallback(() => {
    if (copyResetRef.current !== null) window.clearTimeout(copyResetRef.current);
    setCopyConfirmed(true);
    copyResetRef.current = window.setTimeout(() => setCopyConfirmed(false), 1_400);
  }, []);

  const handleClose = useCallback(() => {
    restoreTriggerFocusRef.current = true;
    onClose();
  }, [onClose]);

  const contentTransition = reducedMotion
    ? { duration: 0 }
    : { delay: 0.14, duration: 0.28, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };
  const controlTransition = reducedMotion
    ? { duration: 0 }
    : { delay: 0.14, duration: 0.2, ease: "easeOut" as const };
  const exitTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.12, ease: "easeOut" as const };

  return (
    <motion.div
      className={styles.depositPopoverLayer}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: reducedMotion ? 0 : 0.999 }}
      transition={{ duration: reducedMotion ? 0 : 0.48 }}
      data-open={open}
      data-ready={position.ready}
      style={{
        "--deposit-popover-left": `${position.left}px`,
        "--deposit-popover-max-height": `${position.maxHeight}px`,
        "--deposit-popover-top": `${position.top}px`,
      } as CSSProperties}
    >
      <motion.section
        ref={dialogRef}
        className={styles.depositModal}
        role="dialog"
        aria-modal={modal || undefined}
        aria-labelledby="deposit-funds-title"
        aria-describedby="deposit-funds-description"
        layoutId={reducedMotion ? undefined : "deposit-button-shell"}
        layoutCrossfade={false}
        transition={reducedMotion ? { duration: 0 } : DEPOSIT_LAYOUT_TRANSITION}
      >
        <motion.button
          ref={closeRef}
          type="button"
          className={styles.inviteCloseButton}
          aria-label="Close deposit funds modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: exitTransition }}
          transition={controlTransition}
          onClick={handleClose}
        >
          <HugeiconsIcon icon={Cancel01Icon} size={24} strokeWidth={1.75} aria-hidden="true" />
        </motion.button>

        <div className={styles.depositContent}>
          <motion.div
            className={styles.depositCoinsMorph}
            layoutId={reducedMotion ? undefined : "deposit-button-icon"}
            layoutCrossfade={false}
            transition={reducedMotion ? { duration: 0 } : DEPOSIT_LAYOUT_TRANSITION}
          >
            <Image
              className={styles.depositCoins}
              src="/paper-dashboard/deposit-coins.png"
              width={224}
              height={112}
              alt=""
              aria-hidden="true"
              priority
            />
          </motion.div>

          <motion.h2
            id="deposit-funds-title"
            layoutId={reducedMotion ? undefined : "deposit-button-label"}
            layoutCrossfade={false}
            transition={reducedMotion ? { duration: 0 } : DEPOSIT_LAYOUT_TRANSITION}
          >
            Deposit Funds
          </motion.h2>

          <motion.div
            className={styles.depositRevealedContent}
            initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{
              opacity: 0,
              y: reducedMotion ? 0 : 6,
              transition: exitTransition,
            }}
            transition={contentTransition}
          >
            <p id="deposit-funds-description" className={styles.depositDescription}>
              Copy this PIX code and paste it in your bank.
              Your transfer converts to USD automatically.
            </p>

            <div className={styles.depositCode} aria-label={`PIX code: ${PIX_CODE}`}>
              <code>{PIX_CODE}</code>
            </div>

            <button
              type="button"
              className={`${styles.actionButton} ${styles.depositCopyButton}`}
              data-confirmed={copyConfirmed}
              aria-live="polite"
              onClick={handleCopyPreview}
            >
              <HugeiconsIcon
                icon={copyConfirmed ? CopyCheckIcon : Copy02Icon}
                size={15}
                color="currentColor"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>{copyConfirmed ? "Copied!" : "Copy Code"}</span>
            </button>

            <p className={styles.depositFooter}>
              Final rate is determined at the moment your transfer is processed.
            </p>
          </motion.div>
        </div>
      </motion.section>
    </motion.div>
  );
}
