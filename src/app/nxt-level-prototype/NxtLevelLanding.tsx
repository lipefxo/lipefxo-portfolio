import Image from "next/image";
import type { CSSProperties } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUpRight01Icon,
  Calendar02Icon,
  Clock01Icon,
  Mail02Icon,
} from "@hugeicons/core-free-icons";
import { ContactForm } from "./ContactForm";
import { HeroCoin } from "./HeroCoin";
import { NxtLevelRevealController } from "./NxtLevelRevealController";
import { OfferCalculator } from "./OfferCalculator";
import styles from "./nxt-level-prototype.module.css";

const clientLogos = [
  { name: "Ramp", src: "/nxt-level-prototype/ramp.png", width: 118, height: 32 },
  { name: "Anduril", src: "/nxt-level-prototype/anduril.png", width: 156, height: 32 },
  { name: "Mercury", src: "/nxt-level-prototype/mercury.png", width: 157, height: 32 },
  { name: "Deliverr", src: "/nxt-level-prototype/deliverr.png", width: 158, height: 32 },
  { name: "BetterUp", src: "/nxt-level-prototype/betterup.png", width: 149, height: 26 },
  { name: "Phyn", src: "/nxt-level-prototype/phyn.png", width: 141, height: 32 },
  { name: "Doctronic", src: "/nxt-level-prototype/doctronic.png", width: 158, height: 32 },
] as const;

const practices = [
  {
    title: "Engineering",
    tags: ["Backend", "Infra", "Machine Learning/AI", "Front-End", "Full-Stack"],
    artwork: "/nxt-level-prototype/practice-engineering.jpg",
    artworkPosition: "58% 10%",
  },
  {
    title: "Product",
    tags: ["Growth", "Platform", "Enterprise", "AI Products", "Design", "Marketing"],
    artwork: "/nxt-level-prototype/practice-product.jpg",
    artworkPosition: "58% 18%",
  },
  {
    title: "Executive",
    tags: ["VP Eng", "VP Product", "CTO", "CPO"],
    artwork: "/nxt-level-prototype/practice-executive.jpg",
    artworkPosition: "57% 8%",
  },
] as const;

const searchSteps = [
  {
    title: "Onboarding",
    body: "Deep intake on the role, the team, and the wiring of your business. We learn your bar so we can hold it.",
  },
  {
    title: "Talent Mapping",
    body: "We build a market map of every qualified operator, including the ones who aren't looking. Compensation benchmarks included.",
  },
  {
    title: "Attract & Qualify",
    body: "Custom outreach, real conversations, and rigorous screens against your bar. Only candidates who clear it move forward.",
  },
  {
    title: "Interview Process",
    body: "We manage the loop end-to-end: scheduling, debriefs, calibration, and tight feedback to keep momentum.",
  },
  {
    title: "Offer",
    body: "Negotiate with full context: comp, equity, counter-offers, and start date. We close, then stay through the first 90 days.",
  },
] as const;

const placements = [
  {
    name: "Jordan K",
    role: "Sr. Staff Engineer",
    background: "ex-Stripe · ex-Anthropic · 8yr",
    tags: ["AI-Native", "Distributed Systems"],
    avatar: "/nxt-level-prototype/placement-jordan.jpg",
  },
  {
    name: "Priya M",
    role: "Founding Engineer",
    background: "ex-Figma · ex-Linear · 6yr",
    tags: ["Full-Stack", "Product-Minded"],
    avatar: "/nxt-level-prototype/placement-priya.jpg",
  },
  {
    name: "Diego R",
    role: "VP Engineering",
    background: "ex-Vercel · ex-Plaid · 12yr",
    tags: ["Leadership", "Scaled 4→80"],
    avatar: "/nxt-level-prototype/placement-diego.jpg",
  },
] as const;

const metrics = [
  { value: "2,000+", label: "Engineers placed" },
  { value: "94%", label: "First-year retention" },
  { value: "10", label: "Days to shortlist" },
  { value: "24h", label: "Avg. response time" },
] as const;

function ArrowIcon({ size = 20 }: { size?: number }) {
  return (
    <HugeiconsIcon
      icon={ArrowUpRight01Icon}
      size={size}
      strokeWidth={2}
      aria-hidden="true"
    />
  );
}

function revealDelay(delay: number): CSSProperties {
  return { "--nxt-reveal-delay": `${delay}ms` } as CSSProperties;
}

export function NxtLevelLanding() {
  return (
    <main id="nxt-level-page" className={styles.page}>
      <NxtLevelRevealController rootId="nxt-level-page" />
      <div className={styles.lightSection}>
        <div className={styles.heroGroup}>
          <header
            className={styles.header}
            data-nxt-reveal
            style={revealDelay(0)}
          >
            <ul className={styles.pillList} aria-label="Nxt Level service areas">
              <li className={styles.pill}>Hire</li>
              <li className={styles.pill}>Find</li>
              <li className={styles.pill}>Contact</li>
            </ul>
          </header>

          <section className={styles.hero} aria-labelledby="nxt-level-hero-title">
            <HeroCoin revealDelay={70} />
            <div className={styles.heroCopy}>
              <div className={styles.heroText}>
                <h1
                  id="nxt-level-hero-title"
                  className={styles.heroTitle}
                  data-nxt-reveal
                  style={revealDelay(130)}
                >
                  Find the builders, problem solvers, and AI-native leaders who
                  actually move the company forward.
                </h1>
                <p
                  className={styles.heroAudience}
                  data-nxt-reveal
                  style={revealDelay(190)}
                >
                  For VC-Backed Founders &amp; Hiring Managers
                </p>
              </div>
              <div
                className={styles.heroActions}
                data-nxt-reveal
                style={revealDelay(250)}
              >
                <a className={styles.secondaryButton} href="#offer-calculator">
                  See the Numbers
                </a>
                <a className={styles.primaryButton} href="#contact">
                  Book a Call
                  <ArrowIcon />
                </a>
              </div>
            </div>
          </section>

          <section className={styles.trust} aria-labelledby="trusted-by-heading">
            <h2
              id="trusted-by-heading"
              className={styles.trustTitle}
              data-nxt-reveal
              style={revealDelay(0)}
            >
              Trusted by the teams scaling at
            </h2>
            <div className={styles.logoCloud}>
              {clientLogos.map((logo, index) => (
                <Image
                  key={logo.name}
                  className={styles.clientLogo}
                  src={logo.src}
                  width={logo.width}
                  height={logo.height}
                  alt={logo.name}
                  data-nxt-reveal
                  style={revealDelay(index * 35)}
                />
              ))}
            </div>
          </section>
        </div>

        <section className={styles.intro} aria-labelledby="expertise-heading">
          <h2
            id="expertise-heading"
            className={styles.sectionTitle}
            data-nxt-reveal
            style={revealDelay(0)}
          >
            Laser-Focused Expertise
          </h2>
          <p
            className={styles.introBody}
            data-nxt-reveal
            style={revealDelay(70)}
          >
            We don&apos;t do everything. We do one thing exceptionally well — scale
            technical and executive teams for high-growth, venture-backed companies.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="practices-heading">
          <div className={styles.sectionHeading}>
            <h2
              id="practices-heading"
              className={styles.sectionTitle}
              data-nxt-reveal
              style={revealDelay(0)}
            >
              Three Practices. One Bar.
            </h2>
            <p
              className={styles.sectionBodyCompact}
              data-nxt-reveal
              style={revealDelay(70)}
            >
              Engineering, Product, and Executive, each with deep specialist
              coverage by stage.
            </p>
          </div>
          <div className={styles.practiceGrid}>
            {practices.map((practice, index) => (
              <article
                key={practice.title}
                className={styles.practiceCard}
                data-nxt-reveal
                style={revealDelay(index * 70)}
              >
                <div className={styles.practiceArtwork} aria-hidden="true">
                  <Image
                    src={practice.artwork}
                    alt=""
                    fill
                    sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 900px) 100vw, 420px"
                    style={{ objectPosition: practice.artworkPosition }}
                  />
                </div>
                <div className={styles.cardHeader}>
                  <h3>{practice.title}</h3>
                  <ArrowIcon />
                </div>
                <div className={styles.tagList}>
                  {practice.tags.map((tag) => (
                    <span className={styles.tag} key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="process-heading">
          <div className={styles.sectionHeading}>
            <h2
              id="process-heading"
              className={styles.sectionTitle}
              data-nxt-reveal
              style={revealDelay(0)}
            >
              From Kickoff To Closed
            </h2>
            <p
              className={styles.sectionBodyCompact}
              data-nxt-reveal
              style={revealDelay(70)}
            >
              Five stages. Every search. No shortcuts, and no surprises for you.
            </p>
          </div>
          <ol className={styles.processGrid}>
            {searchSteps.map((step, index) => (
              <li
                key={step.title}
                className={styles.processCard}
                data-nxt-reveal
                style={revealDelay(index * 55)}
              >
                <span className={styles.stepLabel}>
                  Step {String(index + 1).padStart(2, "0")}
                </span>
                <div className={styles.processCopy}>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section
          id="offer-calculator"
          className={`${styles.section} ${styles.anchorTarget}`}
          aria-labelledby="calculator-heading"
        >
          <div className={styles.sectionHeadingWide}>
            <h2
              id="calculator-heading"
              className={styles.sectionTitle}
              data-nxt-reveal
              style={revealDelay(0)}
            >
              Know what your offer is actually worth.
            </h2>
            <p
              className={styles.sectionBodyWide}
              data-nxt-reveal
              style={revealDelay(70)}
            >
              Our offer calculator translates an offer into the only number that
              matters: realistic total compensation and how it stacks against the
              market.
            </p>
          </div>
          <OfferCalculator />
        </section>

        <section className={`${styles.section} ${styles.placementsSection}`} aria-labelledby="placements-heading">
          <div className={styles.sectionHeading}>
            <h2
              id="placements-heading"
              className={styles.sectionTitle}
              data-nxt-reveal
              style={revealDelay(0)}
            >
              The caliber we place
            </h2>
            <p
              className={styles.sectionBodyCompact}
              data-nxt-reveal
              style={revealDelay(70)}
            >
              Recent placements
            </p>
          </div>
          <div className={styles.placementGrid}>
            {placements.map((placement, index) => (
              <article
                key={placement.name}
                className={styles.placementCard}
                data-nxt-reveal
                style={revealDelay(index * 70)}
              >
                <div className={styles.personHeader}>
                  <Image
                    className={styles.personAvatar}
                    src={placement.avatar}
                    width={52}
                    height={52}
                    alt=""
                  />
                  <div>
                    <h3>{placement.name}</h3>
                    <p>{placement.role}</p>
                  </div>
                </div>
                <p className={styles.personBackground}>{placement.background}</p>
                <div className={styles.tagList}>
                  {placement.tags.map((tag) => (
                    <span className={styles.tag} key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
          <dl className={styles.metricsGrid}>
            {metrics.map((metric, index) => (
              <div
                key={metric.label}
                className={styles.metric}
                data-nxt-reveal
                style={revealDelay(index * 60)}
              >
                <dt>{metric.label}</dt>
                <dd>{metric.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <footer id="contact" className={`${styles.footer} ${styles.anchorTarget}`}>
        <div className={styles.footerMain}>
          <div className={styles.footerPitch}>
            <div
              className={styles.footerIntro}
              data-nxt-reveal
              style={revealDelay(0)}
            >
              <h2>Ready to hire the next level?</h2>
              <p>
                Engineering, product, and executive search for VC-backed startups.
                <br />
                Dream big. Hire right.
              </p>
            </div>
            <ul
              className={styles.footerFacts}
              data-nxt-reveal
              style={revealDelay(70)}
            >
              <li>
                <HugeiconsIcon icon={Clock01Icon} size={16} strokeWidth={2} aria-hidden="true" />
                <span>30 minutes to scope your role.</span>
              </li>
              <li>
                <HugeiconsIcon icon={Calendar02Icon} size={16} strokeWidth={2} aria-hidden="true" />
                <span>Shortlist in 10 days.</span>
              </li>
              <li>
                <HugeiconsIcon icon={Mail02Icon} size={16} strokeWidth={2} aria-hidden="true" />
                <span>
                  Prefer email? <a href="mailto:info@nxtlevel.io">info@nxtlevel.io</a>
                </span>
              </li>
            </ul>
            <p
              className={styles.responseNote}
              data-nxt-reveal
              style={revealDelay(140)}
            >
              We respond within one business day.
            </p>
          </div>
          <ContactForm />
        </div>
        <div
          className={styles.footerBottom}
          data-nxt-reveal
          style={revealDelay(150)}
        >
          <p>© 2026 Nxt Level Recruiting</p>
          <p>Built for builders.</p>
        </div>
      </footer>
    </main>
  );
}
