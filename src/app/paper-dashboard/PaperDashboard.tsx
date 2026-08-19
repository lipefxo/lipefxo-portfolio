"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowDataTransferHorizontalIcon,
  ArrowUpRight01Icon,
  CreditCardIcon,
  CustomerSupportIcon,
  Download01Icon,
  Globe02Icon,
  HappyIcon,
  HelpCircleIcon,
  Home01Icon,
  LinkSquare01Icon,
  Menu01Icon,
  MoneyReceiveCircleIcon,
  MoneySendCircleIcon,
  ReceiptTextIcon,
  UserCircleIcon,
  ViewIcon,
  WhatsappIcon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import styles from "./paper-dashboard.module.css";
import { FeatureArt } from "./FeatureArt";
import { BorderGlow } from "./BorderGlow";

const Topography = dynamic(() => import("./Topography"), { ssr: false });

type IconName =
  | "home"
  | "send"
  | "receive"
  | "exchange"
  | "transactions"
  | "card"
  | "refer"
  | "eye"
  | "withdraw"
  | "arrow"
  | "external"
  | "globe"
  | "support"
  | "whatsapp"
  | "help"
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
  { label: "Refer a Friend", icon: "refer" },
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

const BRL_RATE_SEQUENCE = [5.18, 5.17, 5.19, 5.18, 5.16, 5.19, 5.17, 5.18] as const;
type RateDirection = "up" | "down" | "steady";
const BALANCE_VALUE = 16_720;

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
  refer: HappyIcon,
  eye: ViewIcon,
  withdraw: Download01Icon,
  arrow: ArrowUpRight01Icon,
  external: LinkSquare01Icon,
  globe: Globe02Icon,
  support: CustomerSupportIcon,
  whatsapp: WhatsappIcon,
  help: HelpCircleIcon,
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
  children: ReactNode;
  className?: string;
  icon?: IconName;
  iconPosition?: "leading" | "trailing";
  onClick: () => void;
  variant?: "secondary" | "primary";
}

function ActionButton({
  children,
  className = "",
  icon,
  iconPosition = "leading",
  onClick,
  variant = "secondary",
}: ActionButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.actionButton} ${variant === "primary" ? styles.actionPrimary : ""} ${className}`}
      onClick={onClick}
    >
      {icon && iconPosition === "leading" ? <Icon name={icon} size={15} /> : null}
      <span>{children}</span>
      {icon && iconPosition === "trailing" ? <Icon name={icon} size={15} /> : null}
    </button>
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
  const amountRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = amountRef.current;
    if (!element) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      element.textContent = formatBalance(BALANCE_VALUE);
      return;
    }

    const duration = 1_150;
    const start = performance.now();
    let frameId = 0;

    const update = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      element.textContent = formatBalance(BALANCE_VALUE * eased);
      if (progress < 1) frameId = window.requestAnimationFrame(update);
    };

    element.textContent = formatBalance(0);
    frameId = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  return (
    <span
      ref={amountRef}
      className={styles.tabularNumber}
      aria-label={formatBalance(BALANCE_VALUE)}
    >
      {formatBalance(0)}
    </span>
  );
}

export function PaperDashboard() {
  const [activeNav, setActiveNav] = useState("Home");
  const [collapsedNavOpen, setCollapsedNavOpen] = useState(false);
  const [toast, setToast] = useState("Ready to explore");
  const [articlePage, setArticlePage] = useState(0);
  const [brlRateStep, setBrlRateStep] = useState(0);

  const notify = useCallback((message: string) => setToast(message), []);
  const selectNav = useCallback((label: string) => {
    setActiveNav(label);
    setCollapsedNavOpen(false);
    notify(`${label} selected`);
  }, [notify]);

  useEffect(() => {
    if (!collapsedNavOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCollapsedNavOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [collapsedNavOpen]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 921px)");
    const closeOnDesktop = () => {
      if (desktopQuery.matches) setCollapsedNavOpen(false);
    };

    desktopQuery.addEventListener("change", closeOnDesktop);
    return () => desktopQuery.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

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

  return (
    <main className={styles.viewport}>
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
            <button type="button" className={styles.accountButton} onClick={() => notify("Account switcher opened")}>
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
              onClick={() => notify("Account switcher opened")}
            >
              <Icon name="user" size={18} />
              <span>HG</span>
              <Icon name="chevron" size={16} />
            </button>
          </div>
        </header>

        <div className={styles.mainColumn}>
          <Enter index={1}>
            <section className={styles.balanceCard} aria-label="Account balance">
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
              <div className={styles.exchangeRate}>
                <span className={styles.currencyRate}><Image src="/paper-dashboard/flag-us.png" width={16} height={16} alt="United States" />1.00</span>
                <span className={styles.exchangeIcon}><Icon name="exchange" size={14} /></span>
                <span key={brlRateStep} className={`${styles.currencyRate} ${styles.brlRate}`} data-direction={brlDirection}>
                  <Image src="/paper-dashboard/flag-br.png" width={16} height={16} alt="Brazil" />
                  <AnimatedAmount
                    amount={brlRate.toFixed(2)}
                    previousAmount={previousBrlRate.toFixed(2)}
                    direction={brlDirection}
                  />
                </span>
              </div>
              <div className={styles.balanceBottom}>
                <div className={styles.balanceValue}>
                  <strong><AnimatedBalance /></strong>
                  <span className={styles.positive}>+$231,45</span>
                </div>
                <div className={styles.primaryActions}>
                  <ActionButton icon="eye" onClick={() => notify("Balance details opened")}>Details</ActionButton>
                  <ActionButton icon="withdraw" variant="primary" onClick={() => notify("Withdrawal flow started")}>Withdraw</ActionButton>
                </div>
              </div>
            </section>
          </Enter>

          <section className={styles.featureGrid} aria-label="Account tools">
            {features.map((feature, index) => (
              <Enter key={feature.title} index={index + 2}>
                <button type="button" className={styles.featureCard} onClick={() => notify(feature.title)}>
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
              </Enter>
            ))}
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
                <ActionButton className={styles.promoButton} icon="external" iconPosition="trailing" onClick={() => notify("Opening The Global Hire")}>Browse Jobs</ActionButton>
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
                      onClick={() => notify(`${transaction.company}: ${transaction.amount}`)}
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
              <ActionButton className={styles.viewAllButton} icon="eye" onClick={() => notify("All transactions loaded")}>View All</ActionButton>
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
                {articles.map((article, index) => (
                  <button type="button" key={article.title} className={styles.articleCard} style={{ backgroundImage: `linear-gradient(0deg, rgba(26,26,26,.94) 0%, rgba(26,26,26,0) 68%), url(${article.image})` }} onClick={() => notify(`Article ${index + 1} selected`)}>
                    <span>{article.title}</span>
                  </button>
                ))}
              </div>
            </section>
          </Enter>

          <Enter index={9} className={styles.supportRow}>
            <ActionButton icon="support" onClick={() => notify("Support chat opened")}>Talk with Support</ActionButton>
            <ActionButton icon="whatsapp" onClick={() => notify("WhatsApp opened")}>WhatsApp</ActionButton>
            <ActionButton icon="help" onClick={() => notify("FAQ opened")}>FAQ</ActionButton>
          </Enter>

          <Enter index={10} className={styles.footer}>
            <span>2026 © Higlobe Inc.</span><span>0.21.40</span>
          </Enter>
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

      <div className={`${styles.toast} ${toast ? styles.toastVisible : ""}`} role="status" aria-live="polite">{toast}</div>
    </main>
  );
}
