"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  Cash02Icon,
  Copy02Icon,
  CopyCheckIcon,
  InLoveIcon,
  Share01Icon,
  WhatsappIcon,
} from "@hugeicons/core-free-icons";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "motion/react";
import { FeatureArt } from "./FeatureArt";
import styles from "./paper-dashboard.module.css";

const Topography = dynamic(() => import("./Topography"), { ssr: false });

const ACTION_PANEL_TOPOGRAPHY = {
  lowColor: "#707070",
  midColor: "#575757",
  highColor: "#757575",
  speed: 0,
  morphAmount: 6.2,
  morphSpeed: 0.037,
  bands: 4.5,
  thickness: 0.006,
  scale: 2.9,
  pixelSize: 1,
  glow: 0.095,
  colorMode: "uniform" as const,
  contrast: 1.2,
  brightness: 1.38,
  fillBands: false,
  opacity: 0.06,
  grain: false,
  grainIntensity: 0.05,
  mouseInteraction: true,
  mouseRadius: 0.3,
  mouseStrength: 0.4,
};

interface InviteFriendModalProps {
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}

const INVITE_LAYOUT_TRANSITION = {
  layout: {
    duration: 0.48,
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  },
};

const steps = [
  {
    icon: Share01Icon,
    title: "Invite your friends",
    body: "Share your referral link with friends and colleagues",
  },
  {
    icon: InLoveIcon,
    title: "Track your referrals",
    body: "Your referral needs to join and receive their first payment",
  },
  {
    icon: Cash02Icon,
    title: "Receive your rewards!",
    body: "Receive your rewards directly in your balance",
  },
] as const;

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function InviteFriendModal({
  open,
  onClose,
  triggerRef,
}: InviteFriendModalProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const copyResetRef = useRef<number | null>(null);
  const whatsappResetRef = useRef<number | null>(null);
  const [copyConfirmed, setCopyConfirmed] = useState(false);
  const [whatsappConfirmed, setWhatsappConfirmed] = useState(false);
  const reducedMotion = Boolean(useReducedMotion());

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const triggerElement = triggerRef.current;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    const focusFrame = window.requestAnimationFrame(() => closeRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

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

    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      window.requestAnimationFrame(() => triggerElement?.focus());
    };
  }, [onClose, open, triggerRef]);

  useEffect(() => () => {
    if (copyResetRef.current !== null) window.clearTimeout(copyResetRef.current);
    if (whatsappResetRef.current !== null) window.clearTimeout(whatsappResetRef.current);
  }, []);

  const handleCopyPreview = useCallback(() => {
    if (copyResetRef.current !== null) window.clearTimeout(copyResetRef.current);
    setCopyConfirmed(true);
    copyResetRef.current = window.setTimeout(() => setCopyConfirmed(false), 1_400);
  }, []);

  const handleWhatsAppPreview = useCallback(() => {
    if (whatsappResetRef.current !== null) window.clearTimeout(whatsappResetRef.current);
    setWhatsappConfirmed(true);
    whatsappResetRef.current = window.setTimeout(() => setWhatsappConfirmed(false), 1_400);
  }, []);

  const backdropTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.24, ease: "easeOut" as const };
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
      className={styles.inviteModalLayer}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: reducedMotion ? 0 : 0.999 }}
      transition={{ duration: reducedMotion ? 0 : 0.48 }}
      data-open={open}
    >
      <motion.button
        type="button"
        className={styles.inviteBackdrop}
        aria-label="Close invite a friend modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={backdropTransition}
        onClick={onClose}
      />

      <motion.section
        ref={dialogRef}
        className={styles.inviteModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-friend-title"
        aria-describedby="invite-friend-description"
        layoutId={reducedMotion ? undefined : "invite-card-shell"}
        transition={reducedMotion ? { duration: 0 } : INVITE_LAYOUT_TRANSITION}
      >
        <motion.button
          ref={closeRef}
          type="button"
          className={styles.inviteCloseButton}
          aria-label="Close invite a friend modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: exitTransition }}
          transition={controlTransition}
          onClick={onClose}
        >
          <HugeiconsIcon icon={Cancel01Icon} size={24} strokeWidth={1.75} aria-hidden="true" />
        </motion.button>

        <div className={styles.inviteHero}>
          <motion.div
            className={styles.inviteModalPlane}
            layoutId={reducedMotion ? undefined : "invite-card-plane"}
            transition={reducedMotion ? { duration: 0 } : INVITE_LAYOUT_TRANSITION}
          >
            <FeatureArt type="send" />
          </motion.div>
          <motion.h2
            id="invite-friend-title"
            layoutId={reducedMotion ? undefined : "invite-card-title"}
            transition={reducedMotion ? { duration: 0 } : INVITE_LAYOUT_TRANSITION}
          >
            Invite a friend, earn $20
          </motion.h2>
          <motion.p
            id="invite-friend-description"
            layoutId={reducedMotion ? undefined : "invite-card-description"}
            transition={reducedMotion ? { duration: 0 } : INVITE_LAYOUT_TRANSITION}
          >
            $20 for every $500 that they receive.
          </motion.p>
        </div>

        <motion.div
          className={styles.inviteRevealedContent}
          initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{
            opacity: 0,
            y: reducedMotion ? 0 : 6,
            transition: exitTransition,
          }}
          transition={contentTransition}
        >
          <div className={styles.inviteSteps}>
            {steps.map((step) => (
              <div className={styles.inviteStep} key={step.title}>
                <span className={styles.inviteStepIcon}>
                  <HugeiconsIcon icon={step.icon} size={30} color="currentColor" strokeWidth={1.6} aria-hidden="true" />
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>

          <section className={styles.inviteActionPanel} aria-labelledby="invite-action-title">
            <Topography className={styles.inviteActionTopography} {...ACTION_PANEL_TOPOGRAPHY} />
            <h3 id="invite-action-title">Invite your first friend</h3>
            <div className={styles.inviteActions}>
              <button
                type="button"
                className={styles.actionButton}
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
              <button
                type="button"
                className={`${styles.actionButton} ${styles.actionPrimary}`}
                data-confirmed={whatsappConfirmed}
                aria-live="polite"
                onClick={handleWhatsAppPreview}
              >
                <HugeiconsIcon icon={WhatsappIcon} size={15} color="currentColor" strokeWidth={1.75} aria-hidden="true" />
                <span>{whatsappConfirmed ? "Ready!" : "WhatsApp"}</span>
              </button>
            </div>
          </section>

          <p className={styles.inviteFooter}>Referrals are only valid through the shared link.</p>
        </motion.div>
      </motion.section>
    </motion.div>
  );
}
