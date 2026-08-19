"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDataTransferHorizontalIcon,
  CheckmarkCircle02Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { AnimatePresence, motion } from "motion/react";
import styles from "./higlobe-prototype.module.css";

export type WithdrawCurrency = "USD" | "BRL" | "EUR";

export type WithdrawBankAccount = {
  id: string;
  bank: string;
  account: string;
  lastFour: string;
  currency: WithdrawCurrency;
  flag: string;
};

export type AmountDraft = {
  side: "source" | "target";
  raw: string;
};

export type LockedWithdrawalQuote = {
  bank: WithdrawBankAccount;
  sourceAmount: number;
  sourceCurrency: "USD";
  targetAmount: number;
  targetCurrency: WithdrawCurrency;
  rate: number;
  fee: number;
  capturedAt: string;
  reference: string;
};

interface WithdrawFlowProps {
  balance: number;
  rates: Readonly<Record<WithdrawCurrency, number>>;
  reducedMotion: boolean;
  onDone: () => void;
  onTargetCurrencyChange: (currency: WithdrawCurrency) => void;
}

type WithdrawStage = "form" | "review" | "success";

const bankAccounts: readonly WithdrawBankAccount[] = [
  {
    id: "nubank-brl-8432",
    bank: "Nubank",
    account: "Checking",
    lastFour: "8432",
    currency: "BRL",
    flag: "/higlobe-prototype/flag-br.png",
  },
  {
    id: "chase-usd-1904",
    bank: "Chase",
    account: "Checking",
    lastFour: "1904",
    currency: "USD",
    flag: "/higlobe-prototype/flag-us.png",
  },
  {
    id: "revolut-eur-6651",
    bank: "Revolut",
    account: "Euro account",
    lastFour: "6651",
    currency: "EUR",
    flag: "/higlobe-prototype/euro.svg",
  },
];

const currencyFlags: Record<WithdrawCurrency, string> = {
  USD: "/higlobe-prototype/flag-us.png",
  BRL: "/higlobe-prototype/flag-br.png",
  EUR: "/higlobe-prototype/euro.svg",
};

const currencySymbols: Record<WithdrawCurrency, string> = {
  USD: "$",
  BRL: "R$",
  EUR: "€",
};

const MAX_AMOUNT_WHOLE_DIGITS = 9;
const MAX_AMOUNT_DECIMAL_DIGITS = 2;
const MAX_AMOUNT_GROUPING_CHARACTERS = Math.floor((MAX_AMOUNT_WHOLE_DIGITS - 1) / 3);
const MAX_AMOUNT_INPUT_LENGTH = MAX_AMOUNT_WHOLE_DIGITS
  + MAX_AMOUNT_DECIMAL_DIGITS
  + MAX_AMOUNT_GROUPING_CHARACTERS
  + 1;

const amountSeparators: Record<WithdrawCurrency, { decimal: string; group: string }> = {
  USD: { decimal: ".", group: "," },
  BRL: { decimal: ",", group: "." },
  EUR: { decimal: ".", group: "," },
};

const moneyFormatters: Record<WithdrawCurrency, Intl.NumberFormat> = {
  USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
  BRL: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }),
  EUR: new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }),
};

function sanitizeAmount(value: string, currency: WithdrawCurrency) {
  const { decimal, group } = amountSeparators[currency];
  const ungrouped = value.replaceAll(group, "");
  const normalized = decimal === "." ? ungrouped : ungrouped.replaceAll(decimal, ".");
  const unsigned = normalized.replace(/[^\d.]/g, "");
  const [whole = "", ...decimalParts] = unsigned.split(".");
  const trimmedWhole = whole.replace(/^0+(?=\d)/, "").slice(0, MAX_AMOUNT_WHOLE_DIGITS);
  const fraction = decimalParts.join("").slice(0, MAX_AMOUNT_DECIMAL_DIGITS);

  if (!unsigned.includes(".")) return trimmedWhole;
  return `${trimmedWhole}.${fraction}`;
}

function parseAmount(value: string) {
  if (!value || value === "-" || value === "." || value === "-.") return Number.NaN;
  return Number(value);
}

function formatInputAmount(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : "";
}

function formatEditingAmount(value: string, currency: WithdrawCurrency) {
  if (!value) return "";

  const { decimal, group } = amountSeparators[currency];
  const [whole = "", fraction = ""] = value.split(".");
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, group);

  return value.includes(".") ? `${groupedWhole}${decimal}${fraction}` : groupedWhole;
}

function countAmountTokens(value: string, currency: WithdrawCurrency) {
  const { decimal } = amountSeparators[currency];
  return Array.from(value).reduce(
    (count, character) => count + (/\d/.test(character) || character === decimal ? 1 : 0),
    0,
  );
}

function findAmountCaret(value: string, tokenOffset: number, currency: WithdrawCurrency) {
  if (tokenOffset <= 0) return 0;

  const { decimal } = amountSeparators[currency];
  let tokensSeen = 0;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (/\d/.test(character) || character === decimal) tokensSeen += 1;
    if (tokensSeen === tokenOffset) return index + 1;
  }

  return value.length;
}

function formatMoney(value: number, currency: WithdrawCurrency) {
  return moneyFormatters[currency].format(value);
}

function formatRate(rate: number, currency: WithdrawCurrency) {
  return currency === "USD"
    ? "No currency conversion"
    : `1 USD = ${currencySymbols[currency]}${rate.toFixed(2)} ${currency}`;
}

function StepHeader({
  eyebrow,
  title,
}: {
  eyebrow?: string;
  title: string;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const focusFrame = window.requestAnimationFrame(() => headingRef.current?.focus());
    return () => window.cancelAnimationFrame(focusFrame);
  }, []);

  return (
    <header className={styles.withdrawHeader}>
      <div>
        {eyebrow ? <span>{eyebrow}</span> : null}
        <h1 ref={headingRef} tabIndex={-1}>{title}</h1>
      </div>
    </header>
  );
}

function DetailList({ quote, locked }: { quote: LockedWithdrawalQuote; locked?: boolean }) {
  return (
    <dl className={styles.withdrawDetailList}>
      <div>
        <dt>Destination</dt>
        <dd>{quote.bank.bank} {quote.bank.account} •••• {quote.bank.lastFour}</dd>
      </div>
      <div>
        <dt>{locked ? "Locked rate" : "Exchange rate"}</dt>
        <dd>{formatRate(quote.rate, quote.targetCurrency)}</dd>
      </div>
      <div>
        <dt>Fee</dt>
        <dd>{formatMoney(quote.fee, "USD")}</dd>
      </div>
      <div>
        <dt>Estimated arrival</dt>
        <dd>Usually within 1 business day</dd>
      </div>
      {locked ? (
        <div>
          <dt>Quote captured</dt>
          <dd>{quote.capturedAt}</dd>
        </div>
      ) : null}
    </dl>
  );
}

export function WithdrawFlow({
  balance,
  rates,
  reducedMotion,
  onDone,
  onTargetCurrencyChange,
}: WithdrawFlowProps) {
  const [stage, setStage] = useState<WithdrawStage>("form");
  const [selectedBankId, setSelectedBankId] = useState(bankAccounts[0].id);
  const [draft, setDraft] = useState<AmountDraft>({ side: "source", raw: "" });
  const [reviewAttempted, setReviewAttempted] = useState(false);
  const [lockedQuote, setLockedQuote] = useState<LockedWithdrawalQuote | null>(null);
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const targetInputRef = useRef<HTMLInputElement>(null);
  const pendingSelectionRef = useRef<{
    currency: WithdrawCurrency;
    side: AmountDraft["side"];
    tokenOffset: number;
  } | null>(null);

  const selectedBank = bankAccounts.find((account) => account.id === selectedBankId)
    ?? bankAccounts[0];
  const rate = rates[selectedBank.currency];
  const draftAmount = parseAmount(draft.raw);
  const sourceAmount = draft.side === "source" ? draftAmount : draftAmount / rate;
  const targetAmount = draft.side === "target" ? draftAmount : draftAmount * rate;
  const sourceValue = formatEditingAmount(
    draft.side === "source" ? draft.raw : formatInputAmount(sourceAmount),
    "USD",
  );
  const targetValue = formatEditingAmount(
    draft.side === "target" ? draft.raw : formatInputAmount(targetAmount),
    selectedBank.currency,
  );

  useLayoutEffect(() => {
    const pendingSelection = pendingSelectionRef.current;
    if (!pendingSelection) return;

    const input = pendingSelection.side === "source"
      ? sourceInputRef.current
      : targetInputRef.current;
    if (!input) return;

    const caret = findAmountCaret(
      input.value,
      pendingSelection.tokenOffset,
      pendingSelection.currency,
    );
    input.setSelectionRange(caret, caret);
    pendingSelectionRef.current = null;
  }, [sourceValue, targetValue]);

  const validationError = !Number.isFinite(sourceAmount)
    ? "Enter an amount to continue."
    : sourceAmount <= 0
      ? "Enter an amount greater than zero."
      : sourceAmount < 1
        ? "The minimum withdrawal is $1.00."
        : sourceAmount > balance
          ? `Your available balance is ${formatMoney(balance, "USD")}.`
          : null;
  const showValidation = reviewAttempted || (
    draft.raw !== "" && Number.isFinite(sourceAmount) && validationError !== null
  );
  const canReview = validationError === null;

  const updateDraft = useCallback((
    side: AmountDraft["side"],
    value: string,
    currency: WithdrawCurrency,
    selectionStart: number | null,
  ) => {
    pendingSelectionRef.current = {
      currency,
      side,
      tokenOffset: countAmountTokens(value.slice(0, selectionStart ?? value.length), currency),
    };
    setDraft({ side, raw: sanitizeAmount(value, currency) });
    setReviewAttempted(false);
  }, []);

  const selectBank = useCallback((account: WithdrawBankAccount) => {
    setDraft({
      side: "source",
      raw: draft.side === "source"
        ? draft.raw
        : Number.isFinite(sourceAmount) ? formatInputAmount(sourceAmount) : "",
    });
    setSelectedBankId(account.id);
    setReviewAttempted(false);
    onTargetCurrencyChange(account.currency);
  }, [draft.raw, draft.side, onTargetCurrencyChange, sourceAmount]);

  const reviewWithdrawal = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReviewAttempted(true);
    if (!canReview) return;

    setLockedQuote({
      bank: selectedBank,
      sourceAmount,
      sourceCurrency: "USD",
      targetAmount,
      targetCurrency: selectedBank.currency,
      rate,
      fee: 0,
      capturedAt: new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date()),
      reference: "HG-WDR-260819-001",
    });
    setStage("review");
  }, [canReview, rate, selectedBank, sourceAmount, targetAmount]);

  const returnToForm = useCallback(() => {
    setLockedQuote(null);
    setStage("form");
  }, []);

  const confirmWithdrawal = useCallback(() => {
    if (!lockedQuote) return;
    setStage("success");
  }, [lockedQuote]);

  const transition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.28, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };

  return (
    <section className={styles.withdrawFlow} aria-label="Withdraw funds">
      <AnimatePresence mode="wait" initial={false}>
        {stage === "form" ? (
          <motion.form
            key="withdraw-form"
            className={styles.withdrawStep}
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 8, filter: "blur(2px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6, filter: "blur(2px)" }}
            transition={transition}
            noValidate
            onSubmit={reviewWithdrawal}
          >
            <div className={styles.withdrawAmountPair}>
              <div className={styles.withdrawAmountCard}>
                <span className={styles.withdrawAmountLabel}>
                  <label htmlFor="withdraw-source-amount">You withdraw</label>
                </span>
                <span className={styles.withdrawAmountControl}>
                  <input
                    ref={sourceInputRef}
                    id="withdraw-source-amount"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    maxLength={MAX_AMOUNT_INPUT_LENGTH}
                    value={sourceValue}
                    placeholder="0.00"
                    aria-invalid={showValidation || undefined}
                    aria-describedby="withdraw-validation"
                    onChange={(event: ChangeEvent<HTMLInputElement>) => updateDraft(
                      "source",
                      event.target.value,
                      "USD",
                      event.target.selectionStart,
                    )}
                  />
                  <span><Image src={currencyFlags.USD} width={20} height={20} alt="" /> USD</span>
                </span>
                <small>Available {formatMoney(balance, "USD")}</small>
              </div>

              <span className={styles.withdrawExchangeIcon} aria-hidden="true">
                <HugeiconsIcon icon={ArrowDataTransferHorizontalIcon} size={20} strokeWidth={1.75} />
              </span>

              <div className={styles.withdrawAmountCard}>
                <span className={styles.withdrawAmountLabel}>
                  <label htmlFor="withdraw-target-amount">Bank receives</label>
                </span>
                <span className={styles.withdrawAmountControl}>
                  <input
                    ref={targetInputRef}
                    id="withdraw-target-amount"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    maxLength={MAX_AMOUNT_INPUT_LENGTH}
                    value={targetValue}
                    placeholder="0.00"
                    aria-invalid={showValidation || undefined}
                    aria-describedby="withdraw-validation"
                    onChange={(event: ChangeEvent<HTMLInputElement>) => updateDraft(
                      "target",
                      event.target.value,
                      selectedBank.currency,
                      event.target.selectionStart,
                    )}
                  />
                  <span>
                    <Image src={currencyFlags[selectedBank.currency]} width={20} height={20} alt="" />
                    {selectedBank.currency}
                  </span>
                </span>
                <small>Calculated at the live rate</small>
              </div>
            </div>

            <p
              id="withdraw-validation"
              className={styles.withdrawValidation}
              data-visible={showValidation || undefined}
              role={showValidation ? "alert" : undefined}
            >
              {showValidation ? validationError : null}
            </p>

            <fieldset className={styles.withdrawBankFieldset}>
              <legend>Withdraw to</legend>
              <div className={styles.withdrawBankList}>
                {bankAccounts.map((account) => {
                  const selected = account.id === selectedBank.id;
                  return (
                    <label className={styles.withdrawBankOption} data-selected={selected || undefined} key={account.id}>
                      <input
                        className={styles.srOnly}
                        type="radio"
                        name="withdraw-bank"
                        value={account.id}
                        checked={selected}
                        onChange={() => selectBank(account)}
                      />
                      <span className={styles.withdrawBankCopy}>
                        <strong>{account.bank} {account.account}</strong>
                        <small>•••• {account.lastFour}</small>
                      </span>
                      <span className={styles.withdrawBankCurrency}>
                        <Image src={account.flag} width={18} height={18} alt="" />
                        {account.currency}
                      </span>
                      <span className={styles.withdrawRadioMark} aria-hidden="true">
                        {selected ? <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2} /> : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <button
              type="submit"
              className={`${styles.actionButton} ${styles.actionPrimary} ${styles.withdrawPrimaryButton}`}
            >
              Review withdrawal
            </button>
          </motion.form>
        ) : stage === "review" && lockedQuote ? (
          <motion.section
            key="withdraw-review"
            className={styles.withdrawStep}
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 8, filter: "blur(2px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6, filter: "blur(2px)" }}
            transition={transition}
            aria-label="Review withdrawal"
          >
            <div className={styles.withdrawReviewHero}>
              <span>You withdraw</span>
              <strong>{formatMoney(lockedQuote.sourceAmount, "USD")}</strong>
              <small>{lockedQuote.bank.bank} receives {formatMoney(lockedQuote.targetAmount, lockedQuote.targetCurrency)}</small>
            </div>
            <DetailList quote={lockedQuote} locked />
            <div className={`${styles.primaryActions} ${styles.withdrawReviewActions}`}>
              <button type="button" className={styles.actionButton} onClick={returnToForm}>Back</button>
              <button type="button" className={`${styles.actionButton} ${styles.actionPrimary}`} onClick={confirmWithdrawal}>Confirm withdrawal</button>
            </div>
          </motion.section>
        ) : lockedQuote ? (
          <motion.section
            key="withdraw-success"
            className={`${styles.withdrawStep} ${styles.withdrawSuccess}`}
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 8, filter: "blur(2px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0 }}
            transition={transition}
            aria-live="polite"
          >
            <StepHeader eyebrow="Withdrawal submitted" title="Your money is on the way" />
            <div className={styles.withdrawSuccessIcon}>
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={44} strokeWidth={1.5} aria-hidden="true" />
            </div>
            <div className={styles.withdrawReviewHero}>
              <span>Bank receives</span>
              <strong>{formatMoney(lockedQuote.targetAmount, lockedQuote.targetCurrency)}</strong>
              <small>{lockedQuote.bank.bank} {lockedQuote.bank.account} •••• {lockedQuote.bank.lastFour}</small>
            </div>
            <DetailList quote={lockedQuote} />
            <p className={styles.withdrawReference}>Reference {lockedQuote.reference}</p>
            <button type="button" className={`${styles.actionButton} ${styles.actionPrimary} ${styles.withdrawPrimaryButton}`} onClick={onDone}>Done</button>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
