"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
  type ReactNode,
} from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowDataTransferHorizontalIcon,
  ArrowUpRight01Icon,
  CreditCardIcon,
  CustomerSupportIcon,
  Download01Icon,
  Globe02Icon,
  HelpCircleIcon,
  Home01Icon,
  LinkSquare01Icon,
  Menu01Icon,
  MoneyReceiveCircleIcon,
  MoneySendCircleIcon,
  ReceiptTextIcon,
  Search01Icon,
  User03Icon,
  UserAdd01Icon,
  UserCircleIcon,
  UserGroup03Icon,
  ViewIcon,
  WhatsappIcon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import styles from "./paper-dashboard.module.css";
import { FeatureArt } from "./FeatureArt";
import { BorderGlow } from "./BorderGlow";
import { DepositFundsModal } from "./DepositFundsModal";
import { InviteFriendModal } from "./InviteFriendModal";

const Topography = dynamic(() => import("./Topography"), { ssr: false });

type IconName =
  | "home"
  | "send"
  | "receive"
  | "exchange"
  | "transactions"
  | "card"
  | "eye"
  | "withdraw"
  | "arrow"
  | "external"
  | "globe"
  | "support"
  | "whatsapp"
  | "help"
  | "search"
  | "user-add"
  | "individual"
  | "group"
  | "user"
  | "chevron"
  | "menu"
  | "close";

const navItems: Array<{ label: string; icon: IconName }> = [
  { label: "Home", icon: "home" },
  { label: "Send", icon: "send" },
  { label: "Receive", icon: "receive" },
  { label: "Transactions", icon: "transactions" },
  { label: "Higlobe Card", icon: "card" },
];

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

const transactions = [
  {
    company: "Acme, Inc",
    date: "Just now",
    amount: "-$700.00",
    avatar: "/paper-dashboard/avatar-acme.png",
    flag: "/paper-dashboard/flag-us.png",
    negative: true,
  },
  {
    company: "Bank of Westeros",
    date: "August 16th 09:35",
    amount: "€7,000.00",
    avatar: "/paper-dashboard/avatar-bank.png",
    flag: "/paper-dashboard/euro.svg",
    negative: false,
  },
  {
    company: "Avengers LLC",
    date: "August 16th 12:32",
    amount: "$3,500.00",
    avatar: "/paper-dashboard/avatar-avengers.png",
    flag: "/paper-dashboard/flag-us.png",
    negative: false,
  },
  {
    company: "Wayne Enterprises",
    date: "August 16th 12:32",
    amount: "$25,000.00",
    avatar: "/paper-dashboard/avatar-wayne.png",
    flag: "/paper-dashboard/flag-us.png",
    negative: false,
  },
] as const;

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

type SendOption = {
  id: "individual" | "group" | "bitso";
  title: string;
  icon?: "individual" | "group";
  image?: string;
};

type SendRecipient = {
  name: string;
  avatar: string;
};

const sendOptions: SendOption[] = [
  { id: "individual", title: "Pay an Individual", icon: "individual" },
  { id: "group", title: "Pay a Group", icon: "group" },
  { id: "bitso", title: "Pay with Bitso", image: "/paper-dashboard/feature-bitso.svg" },
];

const sendRecipients: SendRecipient[] = [
  { name: "Avengers LLC", avatar: "/paper-dashboard/avatar-avengers.png" },
  { name: "Bank of Westeros", avatar: "/paper-dashboard/avatar-bank.png" },
  { name: "Wayne Enterprises", avatar: "/paper-dashboard/avatar-wayne.png" },
];

const BRL_RATE_SEQUENCE = [5.18, 5.17, 5.19, 5.18, 5.16, 5.19, 5.17, 5.18] as const;
type RateDirection = "up" | "down" | "steady";
type ModalKind = "deposit" | "invite";
type ModalState = {
  kind: ModalKind | null;
  phase: "closed" | "open" | "closing";
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
  home: Home01Icon,
  send: MoneySendCircleIcon,
  receive: MoneyReceiveCircleIcon,
  exchange: ArrowDataTransferHorizontalIcon,
  transactions: ReceiptTextIcon,
  card: CreditCardIcon,
  eye: ViewIcon,
  withdraw: Download01Icon,
  arrow: ArrowUpRight01Icon,
  external: LinkSquare01Icon,
  globe: Globe02Icon,
  support: CustomerSupportIcon,
  whatsapp: WhatsappIcon,
  help: HelpCircleIcon,
  search: Search01Icon,
  "user-add": UserAdd01Icon,
  individual: User03Icon,
  group: UserGroup03Icon,
  user: UserCircleIcon,
  chevron: ArrowDown01Icon,
  menu: Menu01Icon,
  close: Cancel01Icon,
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

function HiglobeLogo() {
  return (
    <Image
      className={styles.logo}
      src="/paper-dashboard/higlobe.svg"
      width={100}
      height={28}
      alt="Higlobe"
      priority
    />
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

function BalanceCard({
  compact,
  reducedMotion,
  brlRate,
  brlRateStep,
  previousBrlRate,
  direction,
  depositExpanded,
  depositPresent,
  depositTriggerRef,
  onDeposit,
}: {
  compact: boolean;
  reducedMotion: boolean;
  brlRate: number;
  brlRateStep: number;
  previousBrlRate: number;
  direction: RateDirection;
  depositExpanded: boolean;
  depositPresent: boolean;
  depositTriggerRef: RefObject<HTMLButtonElement | null>;
  onDeposit: () => void;
}) {
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
        <span className={styles.currencyRate}><Image src="/paper-dashboard/flag-us.png" width={16} height={16} alt="United States" />1.00</span>
        <span className={styles.exchangeIcon}><Icon name="exchange" size={17} /></span>
        <span
          key={brlRateStep}
          className={`${styles.currencyRate} ${styles.brlRate}`}
          data-direction={direction}
        >
          <Image src="/paper-dashboard/flag-br.png" width={20} height={20} alt="Brazil" />
          <AnimatedAmount
            amount={brlRate.toFixed(2)}
            previousAmount={previousBrlRate.toFixed(2)}
            direction={direction}
          />
        </span>
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
              <ActionButton icon="withdraw" variant="primary">Withdraw</ActionButton>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </motion.section>
  );
}

function SendChooser({ onSelect }: { onSelect: () => void }) {
  return (
    <section className={styles.sendChooser} aria-label="Choose how to send money">
      {sendOptions.map((option, index) => (
        <div
          className={styles.sendIntroItem}
          key={option.id}
          style={{ "--paper-index": index } as CSSProperties}
        >
          <button
            type="button"
            className={`${styles.featureCard} ${styles.sendOptionCard}`}
            onClick={onSelect}
          >
            <span className={`${styles.featureTop} ${styles.sendOptionTop}`}>
              {option.image ? (
                <Image
                  className={styles.sendOptionImage}
                  src={option.image}
                  width={56}
                  height={56}
                  alt=""
                />
              ) : option.icon ? (
                <span className={styles.sendOptionIcon}><Icon name={option.icon} size={38} /></span>
              ) : null}
              <span className={styles.sendOptionArrow}><Icon name="arrow" size={18} /></span>
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
  recipients: SendRecipient[];
  inputRef: RefObject<HTMLInputElement | null>;
  onQueryChange: (query: string) => void;
}) {
  return (
    <section className={styles.recipientPicker} aria-label="Choose a recipient">
      <div className={styles.sendIntroItem} style={{ "--paper-index": 0 } as CSSProperties}>
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

      <div className={styles.sendIntroItem} style={{ "--paper-index": 1 } as CSSProperties}>
        <button type="button" className={`${styles.featureCard} ${styles.addRecipientCard}`}>
          <Icon name="user-add" size={25} />
          <div className={styles.featureCopy}><h2>Add a Recipient</h2></div>
        </button>
      </div>

      <div className={styles.sendIntroItem} style={{ "--paper-index": 2 } as CSSProperties}>
        <div className={`${styles.transactionCard} ${styles.recipientList}`} aria-live="polite">
          {recipients.length ? (
            recipients.map((recipient) => (
              <button
                type="button"
                className={`${styles.transactionRow} ${styles.recipientRow}`}
                key={recipient.name}
              >
                <Image className={styles.avatar} src={recipient.avatar} width={42} height={42} alt="" />
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

export function PaperDashboard() {
  const [activeNav, setActiveNav] = useState("Home");
  const [sendStep, setSendStep] = useState<SendStep>("chooser");
  const [recipientQuery, setRecipientQuery] = useState("");
  const [collapsedNavOpen, setCollapsedNavOpen] = useState(false);
  const [modalState, setModalState] = useState<ModalState>({ kind: null, phase: "closed" });
  const [articlePage, setArticlePage] = useState(0);
  const [brlRateStep, setBrlRateStep] = useState(0);
  const depositTriggerRef = useRef<HTMLButtonElement>(null);
  const inviteTriggerRef = useRef<HTMLButtonElement>(null);
  const recipientSearchRef = useRef<HTMLInputElement>(null);
  const reducedMotion = Boolean(useReducedMotion());

  const openModal = useCallback((kind: ModalKind) => {
    setCollapsedNavOpen(false);
    setModalState((state) => state.phase === "closed" ? { kind, phase: "open" } : state);
  }, []);
  const closeModal = useCallback(() => {
    setModalState((state) => state.phase === "open" ? { ...state, phase: "closing" } : state);
  }, []);
  const finishModalExit = useCallback(() => {
    setModalState((state) => state.phase === "closing"
      ? { kind: null, phase: "closed" }
      : state);
  }, []);
  const selectNav = useCallback((label: string) => {
    if (label === "Send") {
      setSendStep("chooser");
      setRecipientQuery("");
    }
    setActiveNav(label);
    setCollapsedNavOpen(false);
  }, []);
  const selectSendOption = useCallback(() => {
    setSendStep("recipients");
  }, []);

  const filteredRecipients = useMemo(() => {
    const normalizedQuery = recipientQuery.trim().toLocaleLowerCase();
    if (!normalizedQuery) return sendRecipients;
    return sendRecipients.filter((recipient) => (
      recipient.name.toLocaleLowerCase().includes(normalizedQuery)
    ));
  }, [recipientQuery]);

  useEffect(() => {
    if (!collapsedNavOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCollapsedNavOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [collapsedNavOpen]);

  useEffect(() => {
    if (activeNav !== "Send" || sendStep !== "recipients") return;

    const frameId = window.requestAnimationFrame(() => recipientSearchRef.current?.focus());
    return () => window.cancelAnimationFrame(frameId);
  }, [activeNav, sendStep]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 921px)");
    const closeOnDesktop = () => {
      if (desktopQuery.matches) setCollapsedNavOpen(false);
    };

    desktopQuery.addEventListener("change", closeOnDesktop);
    return () => desktopQuery.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let intervalId: number | undefined;
    const startId = window.setTimeout(() => {
      setBrlRateStep(1);
      intervalId = window.setInterval(() => {
        setBrlRateStep((step) => (step + 1) % BRL_RATE_SEQUENCE.length);
      }, 4_000);
    }, 2_500);

    return () => {
      window.clearTimeout(startId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, []);

  const brlRate = BRL_RATE_SEQUENCE[brlRateStep];
  const previousBrlRate = BRL_RATE_SEQUENCE[(brlRateStep - 1 + BRL_RATE_SEQUENCE.length) % BRL_RATE_SEQUENCE.length];
  const brlDirection = brlRateStep === 0 || brlRate === previousBrlRate
    ? "steady"
    : brlRate > previousBrlRate ? "up" : "down";
  const modalOpen = modalState.phase === "open";
  const modalPresent = modalState.phase !== "closed";
  const depositModalOpen = modalOpen && modalState.kind === "deposit";
  const depositModalPresent = modalPresent && modalState.kind === "deposit";
  const inviteModalOpen = modalOpen && modalState.kind === "invite";
  const inviteModalPresent = modalPresent && modalState.kind === "invite";

  return (
    <LayoutGroup id="paper-dashboard-invite">
      <main className={styles.viewport}>
        <div
          className={styles.dashboardLayer}
          inert={inviteModalPresent ? true : undefined}
          aria-hidden={inviteModalPresent || undefined}
        >
          <div className={styles.dashboard}>
        <aside className={styles.sidebar} aria-label="Account navigation">
          <Enter index={0} phase="nav"><HiglobeLogo /></Enter>
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
            <button type="button" className={styles.accountButton}>
              <Icon name="user" size={18} />
              <span>HG</span>
              <Icon name="chevron" size={16} />
            </button>
          </Enter>
        </aside>

        <header className={styles.responsiveHeader}>
          <HiglobeLogo />
          <div className={styles.responsiveHeaderActions}>
            <button
              type="button"
              className={styles.responsiveMenuButton}
              aria-expanded={collapsedNavOpen}
              aria-controls="collapsed-account-navigation"
              aria-label={collapsedNavOpen ? "Close navigation menu" : "Open navigation menu"}
              onClick={() => setCollapsedNavOpen((open) => !open)}
            >
              <Icon name={collapsedNavOpen ? "close" : "menu"} size={22} />
              <span>Menu</span>
            </button>
            <button
              type="button"
              className={`${styles.accountButton} ${styles.responsiveAccountButton}`}
            >
              <Icon name="user" size={18} />
              <span>HG</span>
              <Icon name="chevron" size={16} />
            </button>
          </div>
        </header>

        <div className={styles.mainColumn} data-send-active={activeNav === "Send"}>
          <Enter index={1}>
            <BalanceCard
              compact={activeNav === "Send"}
              reducedMotion={reducedMotion}
              brlRate={brlRate}
              brlRateStep={brlRateStep}
              previousBrlRate={previousBrlRate}
              direction={brlDirection}
              depositExpanded={depositModalOpen}
              depositPresent={depositModalPresent}
              depositTriggerRef={depositTriggerRef}
              onDeposit={() => openModal("deposit")}
            />
          </Enter>

          {activeNav === "Send" ? (
            <motion.section
              className={styles.sendFlow}
              aria-label="Send money"
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 8, filter: "blur(2px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.3, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className={styles.sendStage}
                data-page={sendStep === "chooser" ? "1" : "2"}
              >
                <motion.div
                  key={sendStep}
                  className={styles.sendStepPage}
                  initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 8, filter: "blur(3px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={reducedMotion ? { duration: 0 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  {sendStep === "chooser" ? (
                    <SendChooser onSelect={selectSendOption} />
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

              <Enter index={3} className={styles.sendFooter}>
                <footer className={styles.footer}>
                  <span>2026 © Higlobe Inc.</span><span>0.21.40</span>
                </footer>
              </Enter>
            </motion.section>
          ) : (
            <>
            <section className={styles.featureGrid} aria-label="Account tools">
              {features.map((feature, index) => {
                const isInviteCard = feature.art === "send";

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
                      <button type="button" className={styles.featureCard}>
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
                <ActionButton className={styles.promoButton} icon="external" iconPosition="trailing">Browse Jobs</ActionButton>
              </section>
            </BorderGlow>
          </Enter>

          <Enter index={7}>
            <section className={styles.transactionsSection}>
              <h2 className={styles.sectionTitle}>Recent Transactions</h2>
              <div className={styles.transactionCard}>
                {transactions.map((transaction, index) => {
                  const row = (
                    <button
                      type="button"
                      className={styles.transactionRow}
                    >
                      <Image className={styles.avatar} src={transaction.avatar} width={28} height={28} alt="" />
                      <span className={styles.transactionCopy}><strong>{transaction.company}</strong><small>{transaction.date}</small></span>
                      <span className={`${styles.amount} ${transaction.negative ? styles.negative : ""}`}>{transaction.amount}</span>
                      <Image className={styles.flag} src={transaction.flag} width={14} height={14} alt="" />
                    </button>
                  );

                  if (index !== 0) return <Fragment key={transaction.company}>{row}</Fragment>;

                  return (
                    <div key={transaction.company} className={styles.transactionIncoming}>
                      <div className={styles.transactionIncomingClip}>{row}</div>
                    </div>
                  );
                })}
              </div>
              <ActionButton className={styles.viewAllButton} icon="eye">View All</ActionButton>
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
                  <button type="button" key={article.title} className={styles.articleCard} style={{ backgroundImage: `linear-gradient(0deg, rgba(26,26,26,.94) 0%, rgba(26,26,26,0) 68%), url(${article.image})` }}>
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

      <button
        type="button"
        className={styles.collapsedNavBackdrop}
        data-open={collapsedNavOpen}
        aria-label="Close navigation menu"
        tabIndex={-1}
        onClick={() => setCollapsedNavOpen(false)}
      />

      <div
        id="collapsed-account-navigation"
        className={styles.collapsedNavPanel}
        data-open={collapsedNavOpen}
        aria-hidden={!collapsedNavOpen}
      >
        <div className={styles.collapsedNavHeading}>
          <strong>Navigation</strong>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setCollapsedNavOpen(false)}
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        <nav className={styles.collapsedNavList} aria-label="Collapsed account navigation">
          {navItems.map((item) => (
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
        </nav>
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
          ) : null}
        </AnimatePresence>
      </main>
    </LayoutGroup>
  );
}
