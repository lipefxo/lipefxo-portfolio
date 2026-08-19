"use client";

import {
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { motion, useReducedMotion } from "motion/react";
import styles from "./paper-dashboard.module.css";

export type TransactionStatus = "Completed" | "Pending";

type TransactionDetailsBase = {
  reference: string;
  status: TransactionStatus;
};

export type TransactionDetails = TransactionDetailsBase & (
  | {
      kind: "transfer";
      direction: "Received" | "Sent";
      counterparty: string;
      method: string;
      fee: string;
      exchangeRate?: string;
    }
  | {
      kind: "card";
      merchant: string;
      category: string;
      location: string;
      cardNumber: string;
    }
  | {
      kind: "earn";
      source: string;
      period: string;
      apy: string;
    }
);

export type TransactionDetailsModalRecord = {
  amount: string;
  company: string;
  date: string;
  details: TransactionDetails;
  negative: boolean;
};

interface TransactionDetailsModalProps {
  open: boolean;
  onClose: () => void;
  transaction: TransactionDetailsModalRecord;
  triggerRef: RefObject<HTMLButtonElement | null>;
  visual: ReactNode;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function getDetailRows(transaction: TransactionDetailsModalRecord) {
  const { details } = transaction;
  const commonRows = [
    { label: "Date & time", value: transaction.date },
    { label: "Status", value: details.status },
  ];

  if (details.kind === "card") {
    return [
      ...commonRows,
      { label: "Type", value: "Card purchase" },
      { label: "Merchant", value: details.merchant },
      { label: "Category", value: details.category },
      { label: "Location", value: details.location },
      { label: "Paid with", value: details.cardNumber },
      { label: "Reference", value: details.reference },
    ];
  }

  if (details.kind === "earn") {
    return [
      ...commonRows,
      { label: "Type", value: "Balance earnings" },
      { label: "Source", value: details.source },
      { label: "Period", value: details.period },
      { label: "Annual yield", value: details.apy },
      { label: "Reference", value: details.reference },
    ];
  }

  return [
    ...commonRows,
    { label: "Type", value: `${details.direction} transfer` },
    { label: "Counterparty", value: details.counterparty },
    { label: "Method", value: details.method },
    ...(details.exchangeRate
      ? [{ label: "Exchange rate", value: details.exchangeRate }]
      : []),
    { label: "Fee", value: details.fee },
    { label: "Reference", value: details.reference },
  ];
}

export function TransactionDetailsModal({
  open,
  onClose,
  transaction,
  triggerRef,
  visual,
}: TransactionDetailsModalProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = Boolean(useReducedMotion());
  const detailRows = getDetailRows(transaction);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const triggerElement = triggerRef.current;

    document.body.style.overflow = "hidden";

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
      window.requestAnimationFrame(() => triggerElement?.focus());
    };
  }, [onClose, open, triggerRef]);

  const backdropTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.22, ease: "easeOut" as const };
  const dialogTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };

  return (
    <motion.div
      className={styles.transactionModalLayer}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={backdropTransition}
      data-open={open}
    >
      <button
        type="button"
        className={styles.inviteBackdrop}
        aria-label="Close transaction details"
        onClick={onClose}
      />

      <motion.section
        ref={dialogRef}
        className={styles.transactionModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-details-title"
        initial={reducedMotion ? false : { opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985, y: 6 }}
        transition={dialogTransition}
      >
        <h2 id="transaction-details-title" className={styles.srOnly}>
          Transaction details for {transaction.company}
        </h2>
        <button
          ref={closeRef}
          type="button"
          className={styles.inviteCloseButton}
          aria-label="Close transaction details"
          onClick={onClose}
        >
          <HugeiconsIcon icon={Cancel01Icon} size={24} strokeWidth={1.75} aria-hidden="true" />
        </button>

        <header className={styles.transactionModalHero}>
          <div className={styles.transactionModalVisual}>{visual}</div>
          <p>{transaction.company}</p>
          <strong
            className={`${styles.transactionModalAmount} ${
              transaction.negative ? styles.transactionModalNegative : ""
            }`}
          >
            {transaction.amount}
          </strong>
          <span
            className={styles.transactionStatus}
            data-status={transaction.details.status.toLowerCase()}
          >
            {transaction.details.status}
          </span>
        </header>

        <dl className={styles.transactionDetailsList}>
          {detailRows.map((row) => (
            <div className={styles.transactionDetailRow} key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </motion.section>
    </motion.div>
  );
}
