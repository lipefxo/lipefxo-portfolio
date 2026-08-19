"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
  type ReactNode,
} from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Airplane01Icon,
  ArrowDown01Icon,
  ArrowDataTransferHorizontalIcon,
  ArrowUpRight01Icon,
  Coffee02Icon,
  CreditCardDefrostIcon,
  CreditCardIcon,
  CustomerSupportIcon,
  Download01Icon,
  Film02Icon,
  Globe02Icon,
  HelpCircleIcon,
  Home01Icon,
  Hotel02Icon,
  LinkSquare01Icon,
  Medicine02Icon,
  MoneyReceiveCircleIcon,
  MoneySendCircleIcon,
  ReceiptTextIcon,
  RestaurantIcon,
  Search01Icon,
  SnowIcon,
  ShoppingBag02Icon,
  ShoppingCart02Icon,
  TaxiIcon,
  User03Icon,
  UserAdd02Icon,
  UserCircleIcon,
  UserGroup03Icon,
  ViewIcon,
  ViewOffSlashIcon,
  WhatsappIcon,
} from "@hugeicons/core-free-icons";
import styles from "./paper-dashboard.module.css";
import { FeatureArt } from "./FeatureArt";
import { BorderGlow } from "./BorderGlow";
import { DepositFundsModal } from "./DepositFundsModal";
import { InviteFriendModal } from "./InviteFriendModal";
import {
  TransactionDetailsModal,
  type TransactionDetails,
} from "./TransactionDetailsModal";
import {
  WithdrawFlow,
  type WithdrawCurrency,
} from "./WithdrawFlow";
import {
  HiglobePhysicalCard,
  type CardFace,
  type CardStatus,
} from "./HiglobePhysicalCard";

const Topography = dynamic(() => import("./Topography"), { ssr: false });
const DEPOSIT_MODAL_MEDIA_QUERY = "(max-width: 640px)";

function subscribeToDepositModalBreakpoint(onChange: () => void) {
  const query = window.matchMedia(DEPOSIT_MODAL_MEDIA_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getDepositModalBreakpointSnapshot() {
  return window.matchMedia(DEPOSIT_MODAL_MEDIA_QUERY).matches;
}

function getDepositModalBreakpointServerSnapshot() {
  return false;
}

type IconName =
  | "airfare"
  | "home"
  | "send"
  | "receive"
  | "exchange"
  | "transactions"
  | "card"
  | "coffee"
  | "entertainment"
  | "defrost-card"
  | "eye"
  | "freeze-card"
  | "withdraw"
  | "arrow"
  | "external"
  | "globe"
  | "support"
  | "whatsapp"
  | "help"
  | "hotel"
  | "pharmacy"
  | "restaurant"
  | "search"
  | "shopping"
  | "groceries"
  | "taxi"
  | "eye-off"
  | "user-add"
  | "individual"
  | "group"
  | "user"
  | "chevron";

const navItems = [
  { label: "Home", icon: "home" },
  { label: "Send", icon: "send" },
  { label: "Receive", icon: "receive" },
  { label: "Transactions", icon: "transactions" },
  { label: "Higlobe Card", icon: "card" },
] as const satisfies ReadonlyArray<{ label: string; icon: IconName }>;

type NavLabel = (typeof navItems)[number]["label"];

const compactNavItems = navItems.slice(0, 3);

const features = [
  {
    title: "Get your Higlobe Card",
    mobileTitle: "Higlobe Card",
    body: "Spend your dollars globally or locally. No additional fees.",
    art: "card",
  },
  {
    title: "Invite a friend, earn $20",
    mobileTitle: "Invite a friend, earn $20",
    body: "$20 for every $500 that they receive.",
    art: "send",
  },
  {
    title: "Connect Bitso",
    mobileTitle: "Connect Bitso",
    body: "Transfer and withdraw funds to your Bitso account.",
    art: "bitso",
  },
  {
    title: "Lowest cost guaranteed",
    mobileTitle: "Lowest cost guaranteed",
    body: "We'll match any rate that you find.",
    art: "rate",
  },
] as const;

type TransactionBase = {
  id: string;
  company: string;
  date: string;
  amount: string;
  flag: string;
  negative: boolean;
  details: TransactionDetails;
};

type TransactionVisual =
  | { kind: "image"; src: string }
  | { kind: "icon"; icon: IconName; tone: "amber" | "green" | "pink" };

type Transaction = TransactionBase & (
  | { avatar: string; visual?: never }
  | { avatar?: never; visual: TransactionVisual }
);

type TransactionSeed = Omit<TransactionBase, "details"> & (
  | { avatar: string; visual?: never }
  | { avatar?: never; visual: TransactionVisual }
);

function createReference(prefix: "CARD" | "EARN" | "TRF", index: number) {
  return `HG-${prefix}-${String(260800 + index + 1).padStart(6, "0")}`;
}

function createAccountTransactionDetails(
  transaction: TransactionSeed,
  index: number,
): TransactionDetails {
  if (transaction.company === "Higlobe Earn") {
    return {
      kind: "earn",
      status: "Completed",
      reference: createReference("EARN", index),
      source: "USD account balance",
      period: "Daily earnings",
      apy: "4.50% APY",
    };
  }

  const euroTransfer = transaction.flag.endsWith("euro.svg");

  return {
    kind: "transfer",
    status: index === 0 ? "Pending" : "Completed",
    reference: createReference("TRF", index),
    direction: transaction.negative ? "Sent" : "Received",
    counterparty: transaction.company,
    method: euroTransfer ? "SEPA transfer" : "ACH transfer",
    fee: "$0.00",
    exchangeRate: euroTransfer ? "1 USD = €0.92" : undefined,
  };
}

const accountTransactionSeeds: readonly TransactionSeed[] = [
  {
    id: "txn-acme-now",
    company: "Acme, Inc",
    date: "Just now",
    amount: "-$700.00",
    avatar: "/paper-dashboard/avatar-acme.png",
    flag: "/paper-dashboard/flag-us.png",
    negative: true,
  },
  {
    id: "txn-bank-aug-16",
    company: "Bank of Westeros",
    date: "August 16th 13:35",
    amount: "€7,000.00",
    avatar: "/paper-dashboard/avatar-bank.png",
    flag: "/paper-dashboard/euro.svg",
    negative: false,
  },
  {
    id: "txn-avengers-aug-16",
    company: "Avengers LLC",
    date: "August 16th 12:32",
    amount: "$3,500.00",
    avatar: "/paper-dashboard/avatar-avengers.png",
    flag: "/paper-dashboard/flag-us.png",
    negative: false,
  },
  {
    id: "txn-wayne-aug-16",
    company: "Wayne Enterprises",
    date: "August 16th 11:08",
    amount: "$25,000.00",
    avatar: "/paper-dashboard/avatar-wayne.png",
    flag: "/paper-dashboard/flag-us.png",
    negative: false,
  },
  {
    id: "txn-higlobe-earn-aug-16",
    company: "Higlobe Earn",
    date: "August 16th 10:42",
    amount: "+$12.48",
    avatar: "/paper-dashboard/higlobecircle.svg",
    flag: "/paper-dashboard/flag-us.png",
    negative: false,
  },
  {
    id: "txn-acme-aug-15",
    company: "Acme, Inc",
    date: "August 15th 17:46",
    amount: "-$1,250.00",
    avatar: "/paper-dashboard/avatar-acme.png",
    flag: "/paper-dashboard/flag-us.png",
    negative: true,
  },
  {
    id: "txn-wayne-aug-15",
    company: "Wayne Enterprises",
    date: "August 15th 14:20",
    amount: "$8,400.00",
    avatar: "/paper-dashboard/avatar-wayne.png",
    flag: "/paper-dashboard/flag-us.png",
    negative: false,
  },
  {
    id: "txn-avengers-aug-14",
    company: "Avengers LLC",
    date: "August 14th 10:12",
    amount: "-$320.00",
    avatar: "/paper-dashboard/avatar-avengers.png",
    flag: "/paper-dashboard/flag-us.png",
    negative: true,
  },
  {
    id: "txn-bank-aug-13",
    company: "Bank of Westeros",
    date: "August 13th 16:05",
    amount: "€2,750.00",
    avatar: "/paper-dashboard/avatar-bank.png",
    flag: "/paper-dashboard/euro.svg",
    negative: false,
  },
  {
    id: "txn-higlobe-earn-aug-12",
    company: "Higlobe Earn",
    date: "August 12th 18:30",
    amount: "+$9.16",
    avatar: "/paper-dashboard/higlobecircle.svg",
    flag: "/paper-dashboard/flag-us.png",
    negative: false,
  },
  {
    id: "txn-acme-aug-12",
    company: "Acme, Inc",
    date: "August 12th 09:48",
    amount: "$4,900.00",
    avatar: "/paper-dashboard/avatar-acme.png",
    flag: "/paper-dashboard/flag-us.png",
    negative: false,
  },
  {
    id: "txn-wayne-aug-11",
    company: "Wayne Enterprises",
    date: "August 11th 18:24",
    amount: "-$2,100.00",
    avatar: "/paper-dashboard/avatar-wayne.png",
    flag: "/paper-dashboard/flag-us.png",
    negative: true,
  },
  {
    id: "txn-higlobe-earn-aug-10",
    company: "Higlobe Earn",
    date: "August 10th 17:50",
    amount: "+$5.84",
    avatar: "/paper-dashboard/higlobecircle.svg",
    flag: "/paper-dashboard/flag-us.png",
    negative: false,
  },
  {
    id: "txn-avengers-aug-10",
    company: "Avengers LLC",
    date: "August 10th 12:17",
    amount: "$6,800.00",
    avatar: "/paper-dashboard/avatar-avengers.png",
    flag: "/paper-dashboard/flag-us.png",
    negative: false,
  },
  {
    id: "txn-bank-aug-09",
    company: "Bank of Westeros",
    date: "August 9th 08:42",
    amount: "€1,900.00",
    avatar: "/paper-dashboard/avatar-bank.png",
    flag: "/paper-dashboard/euro.svg",
    negative: false,
  },
];

const transactions: readonly Transaction[] = accountTransactionSeeds.map((transaction, index) => ({
  ...transaction,
  details: createAccountTransactionDetails(transaction, index),
}));

const recentTransactions = transactions.slice(0, 6);

const cardTransactionSeeds: readonly TransactionSeed[] = [
  {
    id: "card-uber-aug-18",
    company: "Uber Technologies",
    date: "August 18th 14:22",
    amount: "-$24.50",
    visual: { kind: "icon", icon: "taxi", tone: "pink" },
    flag: "/paper-dashboard/flag-us.png",
    negative: true,
  },
  {
    id: "card-starbucks-aug-17",
    company: "Starbucks",
    date: "August 17th 09:14",
    amount: "-$6.25",
    visual: { kind: "icon", icon: "coffee", tone: "green" },
    flag: "/paper-dashboard/flag-us.png",
    negative: true,
  },
  {
    id: "card-amazon-aug-16",
    company: "Amazon.com",
    date: "August 16th 16:45",
    amount: "-$89.99",
    visual: { kind: "icon", icon: "shopping", tone: "amber" },
    flag: "/paper-dashboard/flag-us.png",
    negative: true,
  },
  {
    id: "card-whole-foods-aug-15",
    company: "Whole Foods Market",
    date: "August 15th 18:36",
    amount: "-$42.73",
    visual: { kind: "icon", icon: "groceries", tone: "green" },
    flag: "/paper-dashboard/flag-us.png",
    negative: true,
  },
  {
    id: "card-lyft-aug-14",
    company: "Lyft",
    date: "August 14th 21:08",
    amount: "-$18.20",
    visual: { kind: "icon", icon: "taxi", tone: "pink" },
    flag: "/paper-dashboard/flag-us.png",
    negative: true,
  },
  {
    id: "card-netflix-aug-13",
    company: "Netflix",
    date: "August 13th 08:00",
    amount: "-$22.99",
    visual: { kind: "icon", icon: "entertainment", tone: "pink" },
    flag: "/paper-dashboard/flag-us.png",
    negative: true,
  },
  {
    id: "card-sweetgreen-aug-12",
    company: "Sweetgreen",
    date: "August 12th 12:41",
    amount: "-$15.48",
    visual: { kind: "icon", icon: "restaurant", tone: "green" },
    flag: "/paper-dashboard/flag-us.png",
    negative: true,
  },
  {
    id: "card-cvs-aug-11",
    company: "CVS Pharmacy",
    date: "August 11th 17:29",
    amount: "-$31.16",
    visual: { kind: "icon", icon: "pharmacy", tone: "pink" },
    flag: "/paper-dashboard/flag-us.png",
    negative: true,
  },
  {
    id: "card-airbnb-aug-10",
    company: "Airbnb",
    date: "August 10th 10:05",
    amount: "-$164.00",
    visual: { kind: "icon", icon: "hotel", tone: "amber" },
    flag: "/paper-dashboard/flag-us.png",
    negative: true,
  },
  {
    id: "card-trader-joes-aug-09",
    company: "Trader Joe's",
    date: "August 9th 19:12",
    amount: "-$56.84",
    visual: { kind: "icon", icon: "groceries", tone: "green" },
    flag: "/paper-dashboard/flag-us.png",
    negative: true,
  },
  {
    id: "card-delta-aug-08",
    company: "Delta Air Lines",
    date: "August 8th 07:45",
    amount: "-$238.60",
    visual: { kind: "icon", icon: "airfare", tone: "pink" },
    flag: "/paper-dashboard/flag-us.png",
    negative: true,
  },
  {
    id: "card-blue-bottle-aug-07",
    company: "Blue Bottle Coffee",
    date: "August 7th 08:18",
    amount: "-$7.80",
    visual: { kind: "icon", icon: "coffee", tone: "amber" },
    flag: "/paper-dashboard/flag-us.png",
    negative: true,
  },
  {
    id: "card-apple-aug-06",
    company: "Apple Store",
    date: "August 6th 15:52",
    amount: "-$129.00",
    visual: { kind: "icon", icon: "shopping", tone: "amber" },
    flag: "/paper-dashboard/flag-us.png",
    negative: true,
  },
];

const cardCategoryLabels: Partial<Record<IconName, string>> = {
  airfare: "Travel",
  coffee: "Coffee shops",
  entertainment: "Entertainment",
  groceries: "Groceries",
  hotel: "Travel",
  pharmacy: "Health",
  restaurant: "Restaurants",
  shopping: "Shopping",
  taxi: "Transportation",
};

const cardLocations = [
  "Miami, FL",
  "New York, NY",
  "Online purchase",
  "Austin, TX",
] as const;

const cardTransactions: readonly Transaction[] = cardTransactionSeeds.map((transaction, index) => ({
  ...transaction,
  details: {
    kind: "card",
    status: "Completed",
    reference: createReference("CARD", index),
    merchant: transaction.company,
    category: transaction.visual?.kind === "icon"
      ? cardCategoryLabels[transaction.visual.icon] ?? "Card purchase"
      : "Card purchase",
    location: cardLocations[index % cardLocations.length],
    cardNumber: "Higlobe Card •••• 4821",
  },
}));

const articles = [
  {
    title: "Why stable coins will send the global money transfer industry to zero.",
    image: "/paper-dashboard/article-stablecoins.jpg",
  },
  {
    title: "How to receive your international earnings in the Philippines like a local.",
    image: "/paper-dashboard/article-philippines.jpg",
  },
  {
    title: "Why are global accounts the future of international commerce.",
    image: "/paper-dashboard/article-commerce.jpg",
  },
] as const;

type SendStep = "chooser" | "recipients";
type ReceiveStep = "chooser" | "withdraw";

type FlowOption = {
  id: string;
  title: string;
  icon?: IconName;
  image?: string;
};

type SendRecipient = {
  name: string;
  avatar: string;
};

const sendOptions: FlowOption[] = [
  { id: "individual", title: "Pay an Individual", icon: "individual" },
  { id: "group", title: "Pay a Group", icon: "group" },
  { id: "bitso", title: "Pay with Bitso", image: "/paper-dashboard/feature-bitso.svg" },
];

const receiveOptions: FlowOption[] = [
  { id: "withdraw", title: "Withdraw", icon: "withdraw" },
  { id: "request", title: "Request a Payment", icon: "receive" },
  { id: "originators", title: "Originators", icon: "group" },
];

const sendRecipients: SendRecipient[] = [
  { name: "Avengers LLC", avatar: "/paper-dashboard/avatar-avengers.png" },
  { name: "Bank of Westeros", avatar: "/paper-dashboard/avatar-bank.png" },
  { name: "Wayne Enterprises", avatar: "/paper-dashboard/avatar-wayne.png" },
];

const currencyCodes = ["USD", "BRL", "EUR"] as const;
type CurrencyCode = (typeof currencyCodes)[number];
type CurrencySide = "source" | "target";
type CurrencyMenuPhase = "closed" | "open" | "closing";
type CurrencyMenuState = {
  side: CurrencySide | null;
  phase: CurrencyMenuPhase;
};

const currencyConfig = {
  USD: {
    icon: "/paper-dashboard/flag-us.png",
    label: "US dollar",
    quotesPerUsd: [1, 1, 1, 1, 1, 1, 1, 1],
  },
  BRL: {
    icon: "/paper-dashboard/flag-br.png",
    label: "Brazilian real",
    quotesPerUsd: [5.18, 5.17, 5.19, 5.18, 5.16, 5.19, 5.17, 5.18],
  },
  EUR: {
    icon: "/paper-dashboard/euro.svg",
    label: "Euro",
    quotesPerUsd: [0.92, 0.91, 0.92, 0.93, 0.92, 0.91, 0.92, 0.92],
  },
} as const satisfies Record<
  CurrencyCode,
  { icon: string; label: string; quotesPerUsd: readonly number[] }
>;

const QUOTE_STEP_COUNT = currencyConfig.BRL.quotesPerUsd.length;

function getCurrencyPairRate(source: CurrencyCode, target: CurrencyCode, step: number) {
  const sourcePerUsd = currencyConfig[source].quotesPerUsd[step];
  const targetPerUsd = currencyConfig[target].quotesPerUsd[step];
  return targetPerUsd / sourcePerUsd;
}

type RateDirection = "up" | "down" | "steady";
type ModalKind = "deposit" | "invite" | "transaction";
type ModalState = {
  kind: ModalKind | null;
  phase: "closed" | "open" | "closing";
  transaction: Transaction | null;
};
const BALANCE_VALUE = 16_720;
const INVITE_LAYOUT_TRANSITION = {
  layout: {
    duration: 0.48,
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  },
};
const BALANCE_LAYOUT_TRANSITION = {
  layout: {
    duration: 0.3,
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  },
};

function formatBalance(value: number) {
  const [whole, decimal] = value.toFixed(2).split(".");
  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${decimal}`;
}

const iconMap: Record<IconName, IconSvgElement> = {
  airfare: Airplane01Icon,
  home: Home01Icon,
  send: MoneySendCircleIcon,
  receive: MoneyReceiveCircleIcon,
  exchange: ArrowDataTransferHorizontalIcon,
  transactions: ReceiptTextIcon,
  card: CreditCardIcon,
  coffee: Coffee02Icon,
  entertainment: Film02Icon,
  "defrost-card": CreditCardDefrostIcon,
  eye: ViewIcon,
  "eye-off": ViewOffSlashIcon,
  "freeze-card": SnowIcon,
  withdraw: Download01Icon,
  arrow: ArrowUpRight01Icon,
  external: LinkSquare01Icon,
  globe: Globe02Icon,
  support: CustomerSupportIcon,
  whatsapp: WhatsappIcon,
  help: HelpCircleIcon,
  hotel: Hotel02Icon,
  pharmacy: Medicine02Icon,
  restaurant: RestaurantIcon,
  search: Search01Icon,
  shopping: ShoppingBag02Icon,
  groceries: ShoppingCart02Icon,
  taxi: TaxiIcon,
  "user-add": UserAdd02Icon,
  individual: User03Icon,
  group: UserGroup03Icon,
  user: UserCircleIcon,
  chevron: ArrowDown01Icon,
};

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <HugeiconsIcon
      icon={iconMap[name]}
      size={size}
      color="currentColor"
      strokeWidth={1.75}
      aria-hidden="true"
    />
  );
}

interface ActionButtonProps {
  ariaControls?: string;
  ariaPressed?: boolean;
  absorbed?: boolean;
  children: ReactNode;
  buttonRef?: RefObject<HTMLButtonElement | null>;
  className?: string;
  dialogExpanded?: boolean;
  icon?: IconName;
  iconLayoutId?: string;
  iconPosition?: "leading" | "trailing";
  labelLayoutId?: string;
  layoutId?: string;
  layoutTransition?: typeof INVITE_LAYOUT_TRANSITION;
  morphActive?: boolean;
  onClick?: () => void;
  variant?: "secondary" | "primary";
}

function ActionButton({
  ariaControls,
  ariaPressed,
  absorbed = false,
  children,
  buttonRef,
  className = "",
  dialogExpanded,
  icon,
  iconLayoutId,
  iconPosition = "leading",
  labelLayoutId,
  layoutId,
  layoutTransition,
  morphActive = false,
  onClick,
  variant = "secondary",
}: ActionButtonProps) {
  return (
    <motion.button
      ref={buttonRef}
      type="button"
      className={`${styles.actionButton} ${variant === "primary" ? styles.actionPrimary : ""} ${className}`}
      data-absorbed={absorbed || undefined}
      data-modal-open={morphActive || undefined}
      aria-hidden={absorbed || undefined}
      aria-haspopup={dialogExpanded === undefined ? undefined : "dialog"}
      aria-expanded={dialogExpanded}
      aria-controls={ariaControls}
      aria-pressed={ariaPressed}
      tabIndex={absorbed ? -1 : undefined}
      layoutId={layoutId}
      transition={layoutTransition}
      onClick={onClick}
    >
      {icon && iconPosition === "leading" ? (
        <motion.span
          className={styles.actionButtonIcon}
          layoutId={iconLayoutId}
          transition={layoutTransition}
        >
          <Icon name={icon} size={15} />
        </motion.span>
      ) : null}
      <motion.span layoutId={labelLayoutId} transition={layoutTransition}>
        {children}
      </motion.span>
      {icon && iconPosition === "trailing" ? (
        <motion.span
          className={styles.actionButtonIcon}
          layoutId={iconLayoutId}
          transition={layoutTransition}
        >
          <Icon name={icon} size={15} />
        </motion.span>
      ) : null}
    </motion.button>
  );
}

function HiglobeLogo({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className={styles.logoButton}
      aria-label="Go to Home"
      onClick={onClick}
    >
      <Image
        className={styles.logo}
        src="/paper-dashboard/higlobe.svg"
        width={100}
        height={28}
        alt="Higlobe"
        priority
      />
    </button>
  );
}

function Enter({
  index,
  phase = "content",
  className = "",
  children,
}: {
  index: number;
  phase?: "nav" | "content";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`${styles.motionItem} ${className}`}
      data-phase={phase}
      style={{ "--paper-index": index } as CSSProperties}
    >
      {children}
    </div>
  );
}

function AnimatedAmount({
  amount,
  previousAmount,
  direction,
}: {
  amount: string;
  previousAmount: string;
  direction: RateDirection;
}) {
  const chars = amount.split("");
  const previousChars = previousAmount.split("");

  return (
    <span className={styles.rateDigits} aria-label={amount}>
      {chars.map((char, index) => {
        const previousChar = previousChars[index] ?? char;
        const isLastDigit = index === chars.length - 1;
        const shouldRoll = isLastDigit && direction !== "steady" && previousChar !== char;

        if (!shouldRoll) {
          return <span key={index} className={styles.rateDigit}>{char}</span>;
        }

        return (
          <span key={index} className={styles.rateDigitSlot} aria-hidden="true">
            <span className={styles.rateDigitRoll} data-direction={direction}>
              <span className={styles.rateDigitOutgoing}>{previousChar}</span>
              <span className={styles.rateDigitIncoming}>{char}</span>
            </span>
          </span>
        );
      })}
    </span>
  );
}

function AnimatedBalance() {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      const reducedMotionFrame = window.requestAnimationFrame(() => {
        setDisplayValue(BALANCE_VALUE);
      });
      return () => window.cancelAnimationFrame(reducedMotionFrame);
    }

    const duration = 1_150;
    const start = performance.now();
    let frameId = 0;
    const fallbackId = window.setTimeout(() => setDisplayValue(BALANCE_VALUE), duration + 100);

    const update = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(BALANCE_VALUE * eased);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(update);
      } else {
        setDisplayValue(BALANCE_VALUE);
      }
    };

    frameId = window.requestAnimationFrame(update);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(fallbackId);
    };
  }, []);

  return (
    <span
      className={styles.tabularNumber}
      aria-label={formatBalance(BALANCE_VALUE)}
    >
      {formatBalance(displayValue)}
    </span>
  );
}

function getDropdownCloseDuration() {
  return parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--dropdown-close-dur"),
  ) || 150;
}

interface CurrencySelectorProps {
  accessibleAmount: string;
  amount: ReactNode;
  currency: CurrencyCode;
  disabled?: boolean;
  direction?: RateDirection;
  otherCurrency: CurrencyCode;
  phase: CurrencyMenuPhase;
  selectorRef: RefObject<HTMLDivElement | null>;
  side: CurrencySide;
  onBlurAway: () => void;
  onClose: (restoreFocus: boolean) => void;
  onOpen: (side: CurrencySide) => void;
  onSelect: (side: CurrencySide, currency: CurrencyCode) => void;
}

function CurrencySelector({
  accessibleAmount,
  amount,
  currency,
  disabled = false,
  direction,
  otherCurrency,
  phase,
  selectorRef,
  side,
  onBlurAway,
  onClose,
  onOpen,
  onSelect,
}: CurrencySelectorProps) {
  const menuId = `${side}-currency-menu`;
  const options = currencyCodes.filter((code) => code !== otherCurrency);
  const currencyDetails = currencyConfig[currency];
  const isOpen = phase === "open";

  const handleBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
    onBlurAway();
  };

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose(true);
      return;
    }

    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;

    event.preventDefault();
    const menuItems = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'),
    );
    if (menuItems.length === 0) return;

    const currentIndex = menuItems.indexOf(document.activeElement as HTMLButtonElement);
    let nextIndex = currentIndex;

    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = menuItems.length - 1;
    if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % menuItems.length;
    if (event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;
    }

    menuItems[nextIndex]?.focus();
  };

  return (
    <div
      ref={selectorRef}
      className={styles.currencySelector}
      data-side={side}
      onBlur={handleBlur}
    >
      <button
        type="button"
        className={`${styles.currencyRate} ${styles.currencyTrigger} ${side === "target" ? styles.targetRate : ""}`}
        data-currency-trigger
        data-direction={direction}
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`${disabled ? `Withdrawal ${side} ` : `Choose ${side} `}currency. ${currencyDetails.label}, ${accessibleAmount}`}
        disabled={disabled}
        onClick={() => isOpen ? onClose(true) : onOpen(side)}
      >
        <Image src={currencyDetails.icon} width={16} height={16} alt="" aria-hidden="true" />
        {amount}
      </button>

      <div
        id={menuId}
        className={`${styles.currencyMenu} t-dropdown ${phase === "open" ? "is-open" : ""} ${phase === "closing" ? "is-closing" : ""}`}
        data-origin={side === "source" ? "top-left" : "top-right"}
        role="menu"
        aria-label={`Choose ${side} currency`}
        aria-hidden={!isOpen}
        onKeyDown={handleMenuKeyDown}
      >
        {options.map((option) => {
          const optionDetails = currencyConfig[option];
          const selected = option === currency;

          return (
            <button
              key={option}
              type="button"
              className={styles.currencyMenuOption}
              data-selected={selected || undefined}
              role="menuitemradio"
              aria-checked={selected}
              tabIndex={isOpen && selected ? 0 : -1}
              onClick={() => onSelect(side, option)}
            >
              <Image src={optionDetails.icon} width={16} height={16} alt="" aria-hidden="true" />
              <span>{option}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BalanceCard({
  compact,
  currencySelectionLocked,
  reducedMotion,
  sourceCurrency,
  targetCurrency,
  currentRate,
  previousRate,
  quoteStep,
  direction,
  depositExpanded,
  depositPresent,
  depositTriggerRef,
  onDeposit,
  onWithdraw,
  onSourceCurrencyChange,
  onTargetCurrencyChange,
}: {
  compact: boolean;
  currencySelectionLocked: boolean;
  reducedMotion: boolean;
  sourceCurrency: CurrencyCode;
  targetCurrency: CurrencyCode;
  currentRate: number;
  previousRate: number;
  quoteStep: number;
  direction: RateDirection;
  depositExpanded: boolean;
  depositPresent: boolean;
  depositTriggerRef: RefObject<HTMLButtonElement | null>;
  onDeposit: () => void;
  onWithdraw: () => void;
  onSourceCurrencyChange: (currency: CurrencyCode) => void;
  onTargetCurrencyChange: (currency: CurrencyCode) => void;
}) {
  const [currencyMenu, setCurrencyMenu] = useState<CurrencyMenuState>({
    side: null,
    phase: "closed",
  });
  const sourceSelectorRef = useRef<HTMLDivElement>(null);
  const targetSelectorRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const focusFrameRef = useRef<number | null>(null);

  const clearCurrencyMenuTimers = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (focusFrameRef.current !== null) {
      window.cancelAnimationFrame(focusFrameRef.current);
      focusFrameRef.current = null;
    }
  }, []);

  const getSelectorElement = useCallback((side: CurrencySide) => (
    side === "source" ? sourceSelectorRef.current : targetSelectorRef.current
  ), []);

  const openCurrencyMenu = useCallback((side: CurrencySide) => {
    clearCurrencyMenuTimers();
    setCurrencyMenu({ side, phase: "open" });
    focusFrameRef.current = window.requestAnimationFrame(() => {
      getSelectorElement(side)
        ?.querySelector<HTMLButtonElement>('[role="menuitemradio"][aria-checked="true"]')
        ?.focus();
      focusFrameRef.current = null;
    });
  }, [clearCurrencyMenuTimers, getSelectorElement]);

  const closeCurrencyMenu = useCallback((restoreFocus: boolean) => {
    if (currencyMenu.side === null || currencyMenu.phase !== "open") return;

    const closingSide = currencyMenu.side;
    clearCurrencyMenuTimers();
    if (restoreFocus) {
      getSelectorElement(closingSide)
        ?.querySelector<HTMLButtonElement>("[data-currency-trigger]")
        ?.focus();
    }
    setCurrencyMenu({ side: closingSide, phase: "closing" });

    closeTimerRef.current = window.setTimeout(() => {
      setCurrencyMenu((state) => (
        state.side === closingSide && state.phase === "closing"
          ? { side: null, phase: "closed" }
          : state
      ));
      closeTimerRef.current = null;
    }, getDropdownCloseDuration());
  }, [clearCurrencyMenuTimers, currencyMenu, getSelectorElement]);

  const selectCurrency = useCallback((side: CurrencySide, currency: CurrencyCode) => {
    if (side === "source") {
      onSourceCurrencyChange(currency);
    } else {
      onTargetCurrencyChange(currency);
    }
    closeCurrencyMenu(true);
  }, [closeCurrencyMenu, onSourceCurrencyChange, onTargetCurrencyChange]);

  useEffect(() => {
    if (currencyMenu.side === null || currencyMenu.phase !== "open") return;

    const activeSelector = getSelectorElement(currencyMenu.side);
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && activeSelector?.contains(target)) return;
      closeCurrencyMenu(true);
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [closeCurrencyMenu, currencyMenu, getSelectorElement]);

  useEffect(() => () => clearCurrencyMenuTimers(), [clearCurrencyMenuTimers]);

  const sourcePhase = currencyMenu.side === "source" ? currencyMenu.phase : "closed";
  const targetPhase = currencyMenu.side === "target" ? currencyMenu.phase : "closed";

  return (
    <motion.section
      className={`${styles.balanceCard} t-resize`}
      data-compact={compact}
      aria-label="Account balance"
    >
      <Topography
        className={styles.balanceTopography}
        lowColor="#707070"
        midColor="#575757"
        highColor="#757575"
        speed={0}
        morphAmount={6.2}
        morphSpeed={0.037}
        bands={4.5}
        thickness={0.006}
        scale={2.9}
        pixelSize={1}
        glow={0.095}
        colorMode="uniform"
        contrast={1.2}
        brightness={1.38}
        fillBands={false}
        opacity={0.06}
        grain={false}
        grainIntensity={0.05}
        mouseInteraction
        mouseRadius={0.3}
        mouseStrength={0.4}
      />
      <motion.div layout={!reducedMotion} className={styles.exchangeRate} transition={reducedMotion ? { duration: 0 } : BALANCE_LAYOUT_TRANSITION}>
        <CurrencySelector
          accessibleAmount="1.00"
          amount="1.00"
          currency={sourceCurrency}
          disabled={currencySelectionLocked}
          otherCurrency={targetCurrency}
          phase={sourcePhase}
          selectorRef={sourceSelectorRef}
          side="source"
          onBlurAway={() => closeCurrencyMenu(false)}
          onClose={closeCurrencyMenu}
          onOpen={openCurrencyMenu}
          onSelect={selectCurrency}
        />
        <span className={styles.exchangeIcon}><Icon name="exchange" size={17} /></span>
        <CurrencySelector
          accessibleAmount={currentRate.toFixed(2)}
          currency={targetCurrency}
          disabled={currencySelectionLocked}
          direction={direction}
          otherCurrency={sourceCurrency}
          phase={targetPhase}
          selectorRef={targetSelectorRef}
          side="target"
          amount={(
          <AnimatedAmount
            key={`${sourceCurrency}-${targetCurrency}-${quoteStep}`}
            amount={currentRate.toFixed(2)}
            previousAmount={previousRate.toFixed(2)}
            direction={direction}
          />
          )}
          onBlurAway={() => closeCurrencyMenu(false)}
          onClose={closeCurrencyMenu}
          onOpen={openCurrencyMenu}
          onSelect={selectCurrency}
        />
      </motion.div>
      <motion.div layout={!reducedMotion} className={styles.balanceBottom} transition={reducedMotion ? { duration: 0 } : BALANCE_LAYOUT_TRANSITION}>
        <motion.div layout={!reducedMotion} className={styles.balanceValue} transition={reducedMotion ? { duration: 0 } : BALANCE_LAYOUT_TRANSITION}>
          <motion.strong layout={!reducedMotion} transition={reducedMotion ? { duration: 0 } : BALANCE_LAYOUT_TRANSITION}><AnimatedBalance /></motion.strong>
          <AnimatePresence initial={false}>
            {!compact ? (
              <motion.span
                key="balance-positive"
                className={styles.positive}
                initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 4, filter: "blur(2px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -3, filter: "blur(1px)" }}
                transition={reducedMotion ? { duration: 0 } : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                +$231,45
              </motion.span>
            ) : null}
          </AnimatePresence>
        </motion.div>
        <AnimatePresence initial={false}>
          {!compact ? (
            <motion.div
              key="balance-actions"
              className={styles.primaryActions}
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 5, filter: "blur(2px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4, filter: "blur(1px)" }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <ActionButton
                absorbed={depositPresent}
                buttonRef={depositTriggerRef}
                className={styles.depositTrigger}
                dialogExpanded={depositExpanded}
                icon="receive"
                iconLayoutId={reducedMotion ? undefined : "deposit-button-icon"}
                labelLayoutId={reducedMotion ? undefined : "deposit-button-label"}
                layoutId={reducedMotion ? undefined : "deposit-button-shell"}
                layoutTransition={INVITE_LAYOUT_TRANSITION}
                morphActive={depositPresent}
                onClick={onDeposit}
              >
                Deposit
              </ActionButton>
              <ActionButton icon="withdraw" variant="primary" onClick={onWithdraw}>Withdraw</ActionButton>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </motion.section>
  );
}

function FlowChooser({
  ariaLabel,
  options,
  onSelect,
}: {
  ariaLabel: string;
  options: readonly FlowOption[];
  onSelect: (option: FlowOption) => void;
}) {
  return (
    <section className={styles.flowChooser} aria-label={ariaLabel}>
      {options.map((option, index) => (
        <div
          className={styles.flowIntroItem}
          key={option.id}
          style={{ "--paper-index": index } as CSSProperties}
        >
          <button
            type="button"
            className={`${styles.featureCard} ${styles.flowOptionCard}`}
            onClick={() => onSelect(option)}
          >
            <span className={`${styles.featureTop} ${styles.flowOptionTop}`}>
              {option.image ? (
                <Image
                  className={styles.flowOptionImage}
                  src={option.image}
                  width={56}
                  height={56}
                  alt=""
                />
              ) : option.icon ? (
                <span className={styles.flowOptionIcon} data-icon={option.icon}>
                  <Icon name={option.icon} size={32} />
                </span>
              ) : null}
              <span className={styles.flowOptionArrow}><Icon name="arrow" size={18} /></span>
            </span>
            <div className={styles.featureCopy}>
              <h2>{option.title}</h2>
            </div>
          </button>
        </div>
      ))}
    </section>
  );
}

function RecipientPicker({
  query,
  recipients,
  inputRef,
  onQueryChange,
}: {
  query: string;
  recipients: readonly SendRecipient[];
  inputRef: RefObject<HTMLInputElement | null>;
  onQueryChange: (query: string) => void;
}) {
  return (
    <section className={styles.recipientPicker} aria-label="Choose a recipient">
      <div className={styles.flowIntroItem} style={{ "--paper-index": 0 } as CSSProperties}>
        <label className={styles.recipientSearch}>
          <Icon name="search" size={23} />
          <span className={styles.srOnly}>Search existing recipients</span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            placeholder="Search existing recipients"
            autoComplete="off"
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
      </div>

      <div className={styles.flowIntroItem} style={{ "--paper-index": 1 } as CSSProperties}>
        <ActionButton
          className={`${styles.featureCard} ${styles.addRecipientCard}`}
          icon="user-add"
        >
          Add a Recipient
        </ActionButton>
      </div>

      <div className={styles.flowIntroItem} style={{ "--paper-index": 2 } as CSSProperties}>
        <div className={`${styles.transactionCard} ${styles.recipientList}`} aria-live="polite">
          {recipients.length ? (
            recipients.map((recipient) => (
                <button
                  type="button"
                  className={`${styles.transactionRow} ${styles.recipientRow}`}
                  key={recipient.name}
                >
                <Image className={styles.avatar} src={recipient.avatar} width={28} height={28} alt="" />
                <span className={styles.transactionCopy}><strong>{recipient.name}</strong></span>
              </button>
            ))
          ) : (
            <div className={styles.recipientEmpty}>
              <Icon name="search" size={24} />
              <strong>No recipients found</strong>
              <span>Try another name.</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TransactionAvatar({
  transaction,
  size = 28,
}: {
  transaction: Transaction;
  size?: number;
}) {
  return transaction.visual ? (
    transaction.visual.kind === "image" ? (
      <Image className={styles.avatar} src={transaction.visual.src} width={size} height={size} alt="" />
    ) : (
      <span
        className={`${styles.avatar} ${styles.transactionIconAvatar}`}
        data-tone={transaction.visual.tone}
        aria-hidden="true"
      >
        <Icon name={transaction.visual.icon} size={size > 28 ? 28 : 16} />
      </span>
    )
  ) : (
    <Image className={styles.avatar} src={transaction.avatar} width={size} height={size} alt="" />
  );
}

type TransactionSelectHandler = (
  transaction: Transaction,
  triggerElement: HTMLButtonElement,
) => void;

function TransactionRow({
  transaction,
  entranceIndex,
  onSelect,
}: {
  transaction: Transaction;
  entranceIndex?: number;
  onSelect: TransactionSelectHandler;
}) {
  const staggered = entranceIndex !== undefined;

  return (
    <button
      type="button"
      className={`${styles.transactionRow} ${staggered ? styles.transactionRowEnter : ""}`}
      style={staggered ? { "--transaction-row-index": entranceIndex } as CSSProperties : undefined}
      aria-haspopup="dialog"
      onClick={(event) => onSelect(transaction, event.currentTarget)}
    >
      <TransactionAvatar transaction={transaction} />
      <span className={styles.transactionCopy}>
        <strong>{transaction.company}</strong>
        <small>{transaction.date}</small>
      </span>
      <span className={`${styles.amount} ${transaction.negative ? styles.negative : ""}`}>
        {transaction.amount}
      </span>
      <Image className={styles.flag} src={transaction.flag} width={14} height={14} alt="" />
    </button>
  );
}

function TransactionList({
  items,
  animateFirstRow = false,
  animateRemovals = false,
  staggerRows = false,
  onSelect,
}: {
  items: readonly Transaction[];
  animateFirstRow?: boolean;
  animateRemovals?: boolean;
  staggerRows?: boolean;
  onSelect: TransactionSelectHandler;
}) {
  if (animateRemovals) {
    return (
      <div className={styles.transactionCard}>
        <AnimatePresence initial={false}>
          {items.map((transaction, index) => (
            <motion.div
              key={transaction.id}
              className={styles.transactionRowCollapse}
              initial={false}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                height: { duration: 0.62, ease: [0.22, 1, 0.36, 1] },
                opacity: { duration: 0.4, ease: "easeOut" },
              }}
            >
              <TransactionRow
                transaction={transaction}
                entranceIndex={staggerRows ? index : undefined}
                onSelect={onSelect}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className={styles.transactionCard}>
      {items.map((transaction, index) => {
        if (!animateFirstRow || index !== 0) {
          return (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
              entranceIndex={staggerRows ? index : undefined}
              onSelect={onSelect}
            />
          );
        }

        return (
          <div key={transaction.id} className={styles.transactionIncoming}>
            <div className={styles.transactionIncomingClip}>
              <TransactionRow transaction={transaction} onSelect={onSelect} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TransactionsPage({ onSelect }: { onSelect: TransactionSelectHandler }) {
  return (
    <section className={styles.transactionsPage} aria-labelledby="transactions-page-title">
      <Enter index={2}>
        <h1 id="transactions-page-title" className={styles.sectionTitle}>Transactions</h1>
      </Enter>
      <TransactionList items={transactions} staggerRows onSelect={onSelect} />
    </section>
  );
}

function HiglobeCardPage({
  cardStatus,
  reducedMotion,
  onToggleCardStatus,
  onSelectTransaction,
}: {
  cardStatus: CardStatus;
  reducedMotion: boolean;
  onToggleCardStatus: () => void;
  onSelectTransaction: TransactionSelectHandler;
}) {
  const [cardFace, setCardFace] = useState<CardFace>("front");
  const [detailsRevealed, setDetailsRevealed] = useState(false);
  const [transactionsExpanded, setTransactionsExpanded] = useState(false);
  const frozen = cardStatus === "frozen";
  const showingDetails = cardFace === "back";
  const visibleCardTransactions = transactionsExpanded
    ? cardTransactions
    : cardTransactions.slice(0, 3);

  const toggleDetails = () => {
    if (showingDetails) setDetailsRevealed(false);
    setCardFace(showingDetails ? "front" : "back");
  };

  return (
    <section className={styles.cardPage} aria-label="Higlobe Card">
      <Enter index={2} className={styles.cardObjectStage}>
        <HiglobePhysicalCard
          detailsRevealed={detailsRevealed}
          face={cardFace}
          reducedMotion={reducedMotion}
          status={cardStatus}
          onToggleReveal={() => setDetailsRevealed((revealed) => !revealed)}
        />
      </Enter>

      <Enter index={3} className={styles.cardPageActions}>
        <ActionButton
          ariaPressed={frozen}
          className={styles.cardManagementAction}
          icon={frozen ? "defrost-card" : "freeze-card"}
          onClick={onToggleCardStatus}
        >
          {frozen ? "Unfreeze card" : "Freeze card"}
        </ActionButton>
        <ActionButton
          ariaControls="higlobe-card-details-face"
          ariaPressed={showingDetails}
          className={`${styles.cardManagementAction} ${styles.cardDetailsAction}`}
          icon={showingDetails ? "eye-off" : "eye"}
          onClick={toggleDetails}
        >
          {showingDetails ? "Hide details" : "Show details"}
        </ActionButton>
      </Enter>

      <Enter index={4}>
        <section className={styles.cardTransactionsSection} aria-labelledby="card-transactions-title">
          <h2 id="card-transactions-title" className={styles.sectionTitle}>Transactions</h2>
          <div id="higlobe-card-transactions-list">
            <TransactionList
              items={visibleCardTransactions}
              animateRemovals={!reducedMotion}
              staggerRows
              onSelect={onSelectTransaction}
            />
          </div>
          <button
            type="button"
            className={styles.cardTransactionsExpand}
            aria-controls="higlobe-card-transactions-list"
            aria-expanded={transactionsExpanded}
            onClick={() => setTransactionsExpanded((expanded) => !expanded)}
          >
            <span>{transactionsExpanded ? "Show fewer" : "Show 10 more"}</span>
            <Icon name="chevron" size={16} />
          </button>
        </section>
      </Enter>

      <Enter index={5} className={`${styles.footer} ${styles.cardPageFooter}`}>
        <span>2026 © Higlobe Inc.</span><span>0.21.40</span>
      </Enter>
    </section>
  );
}

export function PaperDashboard() {
  const [activeNav, setActiveNav] = useState<NavLabel>("Home");
  const [sendStep, setSendStep] = useState<SendStep>("chooser");
  const [receiveStep, setReceiveStep] = useState<ReceiveStep>("chooser");
  const [recipientQuery, setRecipientQuery] = useState("");
  const [modalState, setModalState] = useState<ModalState>({
    kind: null,
    phase: "closed",
    transaction: null,
  });
  const [articlePage, setArticlePage] = useState(0);
  const [cardStatus, setCardStatus] = useState<CardStatus>("active");
  const [sourceCurrency, setSourceCurrency] = useState<CurrencyCode>("USD");
  const [targetCurrency, setTargetCurrency] = useState<CurrencyCode>("BRL");
  const [quoteStep, setQuoteStep] = useState(0);
  const depositTriggerRef = useRef<HTMLButtonElement>(null);
  const inviteTriggerRef = useRef<HTMLButtonElement>(null);
  const transactionTriggerRef = useRef<HTMLButtonElement>(null);
  const recipientSearchRef = useRef<HTMLInputElement>(null);
  const reducedMotion = Boolean(useReducedMotion());
  const depositIsModal = useSyncExternalStore(
    subscribeToDepositModalBreakpoint,
    getDepositModalBreakpointSnapshot,
    getDepositModalBreakpointServerSnapshot,
  );

  const openModal = useCallback((kind: Exclude<ModalKind, "transaction">) => {
    setModalState((state) => state.phase === "closed"
      ? { kind, phase: "open", transaction: null }
      : state);
  }, []);
  const openTransactionDetails = useCallback<TransactionSelectHandler>((transaction, triggerElement) => {
    transactionTriggerRef.current = triggerElement;
    setModalState((state) => state.phase === "closed"
      ? { kind: "transaction", phase: "open", transaction }
      : state);
  }, []);
  const closeModal = useCallback(() => {
    setModalState((state) => state.phase === "open" ? { ...state, phase: "closing" } : state);
  }, []);
  const finishModalExit = useCallback(() => {
    setModalState((state) => state.phase === "closing"
      ? { kind: null, phase: "closed", transaction: null }
      : state);
  }, []);
  const selectNav = useCallback((label: NavLabel) => {
    if (label === "Send") {
      setSendStep("chooser");
      setRecipientQuery("");
    }
    if (activeNav === "Receive" && receiveStep === "withdraw") {
      setSourceCurrency("USD");
      setTargetCurrency("BRL");
    }
    setReceiveStep("chooser");
    setActiveNav(label);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [activeNav, receiveStep]);
  const selectSendOption = useCallback(() => {
    setSendStep("recipients");
  }, []);
  const startWithdrawal = useCallback(() => {
    setSourceCurrency("USD");
    setTargetCurrency("BRL");
    setReceiveStep("withdraw");
    setActiveNav("Receive");
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);
  const selectReceiveOption = useCallback((option: FlowOption) => {
    if (option.id === "withdraw") {
      startWithdrawal();
    }
  }, [startWithdrawal]);
  const finishWithdrawal = useCallback(() => {
    setSourceCurrency("USD");
    setTargetCurrency("BRL");
    setReceiveStep("chooser");
    setActiveNav("Home");
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);
  const toggleCardStatus = useCallback(() => {
    setCardStatus((status) => status === "active" ? "frozen" : "active");
  }, []);
  const selectSourceCurrency = useCallback((currency: CurrencyCode) => {
    setSourceCurrency((current) => currency === targetCurrency ? current : currency);
  }, [targetCurrency]);
  const selectTargetCurrency = useCallback((currency: CurrencyCode) => {
    setTargetCurrency((current) => currency === sourceCurrency ? current : currency);
  }, [sourceCurrency]);

  const filteredRecipients = useMemo(() => {
    const normalizedQuery = recipientQuery.trim().toLocaleLowerCase();
    if (!normalizedQuery) return sendRecipients;
    return sendRecipients.filter((recipient) => (
      recipient.name.toLocaleLowerCase().includes(normalizedQuery)
    ));
  }, [recipientQuery]);

  useEffect(() => {
    if (activeNav !== "Send" || sendStep !== "recipients") return;

    const frameId = window.requestAnimationFrame(() => recipientSearchRef.current?.focus());
    return () => window.cancelAnimationFrame(frameId);
  }, [activeNav, sendStep]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let intervalId: number | undefined;
    const startId = window.setTimeout(() => {
      setQuoteStep(1);
      intervalId = window.setInterval(() => {
        setQuoteStep((step) => (step + 1) % QUOTE_STEP_COUNT);
      }, 4_000);
    }, 2_500);

    return () => {
      window.clearTimeout(startId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, []);

  const currentRate = getCurrencyPairRate(sourceCurrency, targetCurrency, quoteStep);
  const previousRate = getCurrencyPairRate(
    sourceCurrency,
    targetCurrency,
    (quoteStep - 1 + QUOTE_STEP_COUNT) % QUOTE_STEP_COUNT,
  );
  const rateDirection = quoteStep === 0 || currentRate === previousRate
    ? "steady"
    : currentRate > previousRate ? "up" : "down";
  const withdrawalRates = useMemo<Readonly<Record<WithdrawCurrency, number>>>(() => ({
    USD: 1,
    BRL: getCurrencyPairRate("USD", "BRL", quoteStep),
    EUR: getCurrencyPairRate("USD", "EUR", quoteStep),
  }), [quoteStep]);
  const modalOpen = modalState.phase === "open";
  const modalPresent = modalState.phase !== "closed";
  const depositModalOpen = modalOpen && modalState.kind === "deposit";
  const depositModalPresent = modalPresent && modalState.kind === "deposit";
  const inviteModalOpen = modalOpen && modalState.kind === "invite";
  const inviteModalPresent = modalPresent && modalState.kind === "invite";
  const transactionModalOpen = modalOpen && modalState.kind === "transaction";
  const transactionModalPresent = modalPresent && modalState.kind === "transaction";
  const blockingModalPresent = inviteModalPresent
    || transactionModalPresent
    || (depositIsModal && depositModalPresent);
  const moneyFlowActive = activeNav === "Send" || activeNav === "Receive";

  return (
    <LayoutGroup id="paper-dashboard-invite">
      <main className={styles.viewport}>
        <div
          className={styles.dashboardLayer}
          inert={blockingModalPresent ? true : undefined}
          aria-hidden={blockingModalPresent || undefined}
        >
          <div className={styles.dashboard}>
        <aside className={styles.sidebar} aria-label="Account navigation">
          <Enter index={0} phase="nav"><HiglobeLogo onClick={() => selectNav("Home")} /></Enter>
          <nav className={`${styles.nav} ${styles.navWrap}`}>
            {navItems.map((item, index) => (
              <Enter key={item.label} index={index} phase="nav">
                <button
                  type="button"
                  className={activeNav === item.label ? styles.navActive : ""}
                  aria-current={activeNav === item.label ? "page" : undefined}
                  onClick={() => selectNav(item.label)}
                >
                  <span className={styles.iconSlot}><Icon name={item.icon} size={20} /></span>
                  <span>{item.label}</span>
                </button>
              </Enter>
            ))}
          </nav>
          <Enter index={8} className={styles.accountWrap}>
            <button
              type="button"
              className={styles.accountButton}
            >
              <Icon name="user" size={18} />
              <span>HG</span>
              <Icon name="chevron" size={16} />
            </button>
          </Enter>
        </aside>

        <header className={styles.responsiveHeader}>
          <HiglobeLogo onClick={() => selectNav("Home")} />
          <button
            type="button"
            className={`${styles.accountButton} ${styles.responsiveAccountButton}`}
          >
            <Icon name="user" size={18} />
            <span>HG</span>
            <Icon name="chevron" size={16} />
          </button>
        </header>

        <div className={styles.mainColumn} data-flow-active={moneyFlowActive}>
          <Enter index={1} className={styles.balanceCardLayer}>
            <BalanceCard
              compact={moneyFlowActive || activeNav === "Transactions" || activeNav === "Higlobe Card"}
              currencySelectionLocked={activeNav === "Receive" && receiveStep === "withdraw"}
              reducedMotion={reducedMotion}
              sourceCurrency={sourceCurrency}
              targetCurrency={targetCurrency}
              currentRate={currentRate}
              previousRate={previousRate}
              quoteStep={quoteStep}
              direction={rateDirection}
              depositExpanded={depositModalOpen}
              depositPresent={depositModalPresent}
              depositTriggerRef={depositTriggerRef}
              onDeposit={() => openModal("deposit")}
              onWithdraw={startWithdrawal}
              onSourceCurrencyChange={selectSourceCurrency}
              onTargetCurrencyChange={selectTargetCurrency}
            />
          </Enter>

          {moneyFlowActive ? (
            <motion.section
              className={styles.moneyFlow}
              aria-label={activeNav === "Send" ? "Send money" : "Receive money"}
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 8, filter: "blur(2px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.3, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className={styles.flowStage}
                data-page={
                  (activeNav === "Send" && sendStep === "recipients")
                  || (activeNav === "Receive" && receiveStep === "withdraw")
                    ? "2"
                    : "1"
                }
              >
                <motion.div
                  key={activeNav === "Send" ? `send-${sendStep}` : `receive-${receiveStep}`}
                  className={styles.flowStepPage}
                  initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 8, filter: "blur(3px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={reducedMotion ? { duration: 0 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  {activeNav === "Receive" && receiveStep === "withdraw" ? (
                    <WithdrawFlow
                      balance={BALANCE_VALUE}
                      rates={withdrawalRates}
                      reducedMotion={reducedMotion}
                      onDone={finishWithdrawal}
                      onTargetCurrencyChange={setTargetCurrency}
                    />
                  ) : activeNav === "Receive" ? (
                    <FlowChooser
                      ariaLabel="Choose how to receive money"
                      options={receiveOptions}
                      onSelect={selectReceiveOption}
                    />
                  ) : sendStep === "chooser" ? (
                    <FlowChooser
                      ariaLabel="Choose how to send money"
                      options={sendOptions}
                      onSelect={selectSendOption}
                    />
                  ) : (
                    <RecipientPicker
                      query={recipientQuery}
                      recipients={filteredRecipients}
                      inputRef={recipientSearchRef}
                      onQueryChange={setRecipientQuery}
                    />
                  )}
                </motion.div>
              </div>

              <Enter index={3} className={styles.flowFooter}>
                <footer className={styles.footer}>
                  <span>2026 © Higlobe Inc.</span><span>0.21.40</span>
                </footer>
              </Enter>
            </motion.section>
          ) : activeNav === "Transactions" ? (
            <TransactionsPage onSelect={openTransactionDetails} />
          ) : activeNav === "Higlobe Card" ? (
            <HiglobeCardPage
              cardStatus={cardStatus}
              reducedMotion={reducedMotion}
              onToggleCardStatus={toggleCardStatus}
              onSelectTransaction={openTransactionDetails}
            />
          ) : (
            <>
            <section className={styles.featureGrid} aria-label="Account tools">
              {features.map((feature, index) => {
                const isInviteCard = feature.art === "send";
                const isHiglobeCard = feature.art === "card";

                return (
                  <Enter key={feature.title} index={index + 2}>
                    {isInviteCard ? (
                      <motion.button
                        ref={inviteTriggerRef}
                        type="button"
                        className={`${styles.featureCard} ${styles.inviteFeatureCard}`}
                        data-modal-open={inviteModalPresent}
                        aria-haspopup="dialog"
                        aria-expanded={inviteModalOpen}
                        layoutId={reducedMotion ? undefined : "invite-card-shell"}
                        transition={reducedMotion ? { duration: 0 } : INVITE_LAYOUT_TRANSITION}
                        onClick={() => openModal("invite")}
                      >
                        <div className={styles.featureTop}>
                          <motion.div
                            className={styles.inviteCardPlane}
                            layoutId={reducedMotion ? undefined : "invite-card-plane"}
                            transition={reducedMotion ? { duration: 0 } : INVITE_LAYOUT_TRANSITION}
                          >
                            <FeatureArt type={feature.art} />
                          </motion.div>
                          <Icon name="arrow" size={16} />
                        </div>
                        <div className={styles.featureCopy}>
                          <motion.h2
                            layoutId={reducedMotion ? undefined : "invite-card-title"}
                            transition={reducedMotion ? { duration: 0 } : INVITE_LAYOUT_TRANSITION}
                          >
                            <span className={styles.desktopFeatureTitle}>{feature.title}</span>
                            <span className={styles.mobileFeatureTitle}>{feature.mobileTitle}</span>
                          </motion.h2>
                          <motion.p
                            layoutId={reducedMotion ? undefined : "invite-card-description"}
                            transition={reducedMotion ? { duration: 0 } : INVITE_LAYOUT_TRANSITION}
                          >
                            {feature.body}
                          </motion.p>
                        </div>
                      </motion.button>
                    ) : (
                      <button
                        type="button"
                        className={styles.featureCard}
                        onClick={isHiglobeCard ? () => selectNav("Higlobe Card") : undefined}
                      >
                        <div className={styles.featureTop}>
                          <FeatureArt type={feature.art} />
                          <Icon name={index === 3 ? "external" : "arrow"} size={16} />
                        </div>
                        <div className={styles.featureCopy}>
                          <h2>
                            <span className={styles.desktopFeatureTitle}>{feature.title}</span>
                            <span className={styles.mobileFeatureTitle}>{feature.mobileTitle}</span>
                          </h2>
                          <p>{feature.body}</p>
                        </div>
                      </button>
                    )}
                  </Enter>
                );
              })}
            </section>

          <Enter index={6}>
            <BorderGlow
              animated
              glowColor="338 100 54"
              colors={["#ff1469", "#ec0e61", "#d50953"]}
            >
              <section className={styles.promoCard}>
                <div className={styles.promoCopy}>
                  <Icon name="globe" size={20} />
                  <div><h2>The Global Hire</h2><p>Board of remote opportunities for global workers</p></div>
                </div>
                <ActionButton
                  className={styles.promoButton}
                  icon="external"
                  iconPosition="trailing"
                >
                  Browse Jobs
                </ActionButton>
              </section>
            </BorderGlow>
          </Enter>

          <Enter index={7}>
            <section className={styles.transactionsSection}>
              <h2 className={styles.sectionTitle}>Recent Transactions</h2>
              <TransactionList
                items={recentTransactions}
                animateFirstRow
                onSelect={openTransactionDetails}
              />
              <ActionButton
                className={styles.viewAllButton}
                icon="eye"
                onClick={() => selectNav("Transactions")}
              >
                View All
              </ActionButton>
            </section>
          </Enter>

          <Enter index={8}>
            <section className={styles.articlesSection}>
              <div className={styles.sectionHeading}>
                <h2 className={styles.sectionTitle}>Articles</h2>
                <div className={styles.dots} aria-label="Article page">
                  {[0, 1, 2].map((dot) => <button type="button" key={dot} aria-label={`Show article ${dot + 1}`} className={articlePage === dot ? styles.dotActive : ""} onClick={() => setArticlePage(dot)} />)}
                </div>
              </div>
              <div className={styles.articleGrid} data-page={articlePage}>
                {articles.map((article) => (
                  <button
                    type="button"
                    key={article.title}
                    className={styles.articleCard}
                    style={{ backgroundImage: `linear-gradient(0deg, rgba(26,26,26,.94) 0%, rgba(26,26,26,0) 68%), url(${article.image})` }}
                  >
                    <span>{article.title}</span>
                  </button>
                ))}
              </div>
            </section>
          </Enter>

          <Enter index={9} className={styles.supportRow}>
            <ActionButton icon="support">Talk with Support</ActionButton>
            <ActionButton icon="whatsapp">WhatsApp</ActionButton>
            <ActionButton icon="help">FAQ</ActionButton>
          </Enter>

          <Enter index={10} className={styles.footer}>
            <span>2026 © Higlobe Inc.</span><span>0.21.40</span>
          </Enter>
            </>
          )}
        </div>
          </div>

      <nav className={styles.compactNavWrap} aria-label="Primary mobile navigation">
        <div className={styles.compactNav}>
          {compactNavItems.map((item) => (
            <button
              type="button"
              key={item.label}
              className={activeNav === item.label ? styles.navActive : ""}
              aria-current={activeNav === item.label ? "page" : undefined}
              onClick={() => selectNav(item.label)}
            >
              <span className={styles.iconSlot}><Icon name={item.icon} size={20} /></span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

        </div>

        <AnimatePresence
          initial={false}
          mode="sync"
          onExitComplete={finishModalExit}
        >
          {depositModalOpen ? (
            <DepositFundsModal
              key="deposit-funds-modal"
              modal={depositIsModal}
              open={depositModalOpen}
              onClose={closeModal}
              triggerRef={depositTriggerRef}
            />
          ) : inviteModalOpen ? (
            <InviteFriendModal
              key="invite-friend-modal"
              open={inviteModalOpen}
              onClose={closeModal}
              triggerRef={inviteTriggerRef}
            />
          ) : transactionModalOpen && modalState.transaction ? (
            <TransactionDetailsModal
              key="transaction-details-modal"
              open={transactionModalOpen}
              onClose={closeModal}
              transaction={modalState.transaction}
              triggerRef={transactionTriggerRef}
              visual={<TransactionAvatar transaction={modalState.transaction} size={64} />}
            />
          ) : null}
        </AnimatePresence>
      </main>
    </LayoutGroup>
  );
}
