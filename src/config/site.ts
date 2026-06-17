/**
 * Single editable source of truth for all portfolio content.
 * Search for `TODO: edit` to find placeholder copy to personalize.
 */

export interface SocialLinks {
  email: string;
  github: string; // GitHub username
  x: string; // X/Twitter handle without the @
  linkedin: string; // full https URL
}

export interface FeaturedConfig {
  /** Short one-liner shown on the card. */
  blurb: string;
  /** Longer description shown in the modal. */
  longDescription: string;
}

/** Per-project accent colors for the card's border glow. */
export interface GlowPalette {
  /** 2–3 mesh-gradient colors (hex); the first is the dominant base. */
  colors: string[];
  /** Outer glow color as an HSL triple, e.g. "142 58 34". */
  glowColor: string;
}

/** A single image slot in a case study. */
export interface CaseImage {
  /** Text shown inside the gray placeholder box. */
  label: string;
  /** Aspect ratio, e.g. "16/9" (default), "4/3", "1/1", "9/16". */
  ratio?: string;
  /** Set this (e.g. "/work/bags/hero.png") to render a real image instead of the placeholder. */
  src?: string;
  /** Alt text used once a real `src` is set. */
  alt?: string;
  /** Optional caption shown under the image. */
  caption?: string;
}

/** A narrative block: heading + copy + optional images. */
export interface CaseSection {
  /** Editorial heading, e.g. "The starting point." Omit for image-only blocks. */
  heading?: string;
  /** Body copy — one string per paragraph. */
  body?: string[];
  images?: CaseImage[];
  /** Image layout: "stack" (full-width stacked, default), "split" (side-by-side pair), "gallery" (grid). */
  layout?: "stack" | "split" | "gallery";
}

/** A single big metric in the stat band. */
export interface CaseStat {
  /** e.g. "40%" */
  value: string;
  /** e.g. "faster design-to-development handoff" */
  label: string;
}

/** GitHub-style contribution stats (branch icon + diff), shown near the top. */
export interface CaseGitStats {
  /** Merged PRs / branches (shown with a branch icon). */
  prs?: number;
  /** Feature commits — used when the repo had no PRs (shown with a commit icon). */
  commits?: number;
  /** Lines added. */
  additions?: number;
  /** Lines removed. */
  deletions?: number;
  /** Files touched. */
  files?: number;
}

/** A pull-quote / reflection. */
export interface CaseQuote {
  text: string;
  attribution?: string;
}

/** The full case-study content for a work project. */
export interface CaseStudy {
  /** Hero headline (may differ from the project name). */
  headline: string;
  /** One-liner under the headline. */
  summary: string;
  hero: CaseImage;
  meta: {
    role: string;
    year: string;
    timeline: string;
    platform: string;
    collaborators?: {
      role: string;
    }[];
    /** e.g. ["Product Design", "Design Systems", "Front-end"] */
    scope: string[];
    /** Optional live link, e.g. panorama.cash. */
    liveUrl?: string;
  };
  stats?: CaseStat[];
  /** Optional GitHub-style diffstat shown under the hero. */
  git?: CaseGitStats;
  /** Overview, challenge, approach, feature deep-dives. */
  sections: CaseSection[];
  quote?: CaseQuote;
  outcome?: { heading?: string; body: string[] };
}

export interface WorkProject {
  name: string;
  /** URL slug for the case-study page, e.g. "bags" -> /work/bags. */
  slug: string;
  /** Short one-liner shown on the card. */
  blurb: string;
  /** Longer description shown in the modal. */
  longDescription: string;
  /** Tech tags shown on the card and in the modal. */
  tech: string[];
  /** Optional accent colors for the hover border glow. */
  glow?: GlowPalette;
  /** Optional full case study shown at /work/<slug>. */
  caseStudy?: CaseStudy;
}

export interface ExperienceItem {
  company: string;
  role: string;
  /** e.g. "Mar 2023 — Present" */
  period: string;
  /** One-line summary of the role. */
  summary: string;
  /** A few concise highlight bullets. */
  highlights: string[];
}

export interface SiteConfig {
  name: string;
  tagline: string;
  bio: string;
  githubUser: string;
  socials: SocialLinks;
  skills: string[];
  tools: string[];
  experience: ExperienceItem[];
  resumeUrl: string;
  /** Public repos hidden from the open-source feed. */
  hiddenRepos: string[];
  /** Curated copy for public repos, keyed by repo name. */
  featured: Record<string, FeaturedConfig>;
  /** Hand-authored private/work projects (no source links). */
  work: WorkProject[];
}

export const site: SiteConfig = {
  // Display name. Switch to "Luis Felipe Lins" if you'd rather use your full name.
  name: "lipefxo",
  tagline: "Senior Product Designer & Design Engineer.",
  bio: "I design and ship digital products across the full path from strategy to production. My work sits between product design, systems thinking, and front-end implementation: shaping the user experience, defining scalable interface patterns, and turning ideas into working software with modern AI-assisted workflows.",
  githubUser: "lipefxo",
  socials: {
    email: "lipefxo@gmail.com",
    github: "lipefxo",
    x: "lpfx0",
    linkedin: "https://www.linkedin.com/in/lipefxo/",
  },
  // From CV — edit freely.
  skills: [
    "Product Design",
    "UI Design",
    "UX Design",
    "Design Systems",
    "Brand Design",
    "Visual Design",
    "Information Architecture",
    "Responsive Design",
    "Userflow",
    "Prototyping",
    "Atomic Design",
    "Styleguides",
    "Qualitative Research",
    "Quantitative Research",
    "User Interviews",
    "Agile Methods",
    "HTML",
    "CSS",
    "JavaScript",
    "Tailwind CSS",
  ],
  tools: [
    "Figma",
    "Cursor",
    "Codex",
    "Claude Code",
    "v0",
    "VS Code",
    "Retool",
    "Webflow",
    "Framer",
    "GitHub",
    "Supabase",
    "Vercel",
    "Zeroheight",
    "Zeplin",
    "Notion",
    "Slack",
    "Jira",
    "Linear",
    "Miro",
    "ClickUp",
    "Confluence",
    "HubSpot",
    "Hotjar",
    "Intercom",
    "Lovable",
    "MagicPath",
  ],
  experience: [
    {
      company: "SecureBags",
      role: "Senior Product Designer / Design Engineer",
      period: "Mar 2023 — Present",
      summary:
        "I lead product design and front-end execution for a fintech SaaS platform, turning complex lending and operations workflows into clear, reusable product experiences. The role spans product strategy, UX, design systems, React implementation, and internal tooling, with a focus on shortening the distance between design decisions and shipped software.",
      highlights: [
        "Promoted from Senior Product Designer to Design Engineer for shipping production-quality code alongside design.",
        "Pioneered a Figma-to-production workflow with Cursor, React, Chakra UI, and MCP, partnering with AI tools end to end.",
        "Built a modular Figma design system, cutting design-to-development delivery time by 40%.",
        "Owned end-to-end UX/UI for a new SaaS platform — onboarding, dashboards, lending workflows, and integrations.",
        "Shipped production React components and built internal Retool back-office tools, reducing manual work by 35%.",
      ],
    },
    {
      company: "Suflex",
      role: "Lead Product Designer",
      period: "Aug 2020 — Jan 2023",
      summary:
        "I established the product design practice for two SaaS products, guiding both B2B and B2C experiences from early discovery through MVP launch. I worked closely with engineering and leadership to define flows, validate concepts, build the design system, and create a product language the team could scale.",
      highlights: [
        "Promoted to Lead Product Designer; coached designers and set design direction with engineering leadership.",
        "Established the Suflex Design System, reducing feature delivery time by 30%.",
        "Owned the full UX/UI lifecycle — discovery, research, journey mapping, prototyping, and high-fidelity handoff.",
      ],
    },
    {
      company: "Grafite Design",
      role: "Product & Brand Designer",
      period: "2015 — 2025",
      summary:
        "I ran independent product and brand design work across startups, small businesses, and organizations that needed clearer identities and better digital experiences. Projects ranged from positioning and visual systems to complete product interfaces, giving me a broad foundation in how brand, UX, and implementation shape each other.",
      highlights: [
        "Created 40+ brand identity and strategy projects for startups, small businesses, and NGOs.",
        "Delivered 10+ product design projects from style guide through complete UI/UX.",
        "Built production-ready interfaces with Material Design, Human Interface Guidelines, Tailwind, Chakra UI, and NaiveUI.",
      ],
    },
  ],
  // Drop a PDF at public/resume.pdf to make this work.
  resumeUrl: "/resume.pdf",
  hiddenRepos: ["lipefxo", "origami-coffee"],

  // Curated copy for public GitHub repos. Repos not listed here fall back to
  // their GitHub description.
  featured: {
    handshake: {
      // TODO: edit — describe what handshake is.
      blurb: "A web app exploring connections and introductions.",
      longDescription:
        "handshake is a TypeScript web app with a live deployment. Replace this description with the real story: what problem it solves, the stack, and what you're proud of.",
    },
  },

  // Private/work projects — shown as description-only cards (no source links).
  work: [
    {
      name: "Bags",
      slug: "bags",
      blurb: "Financial platform that helps business owners understand their numbers, clean up their books, and access funding to scale.",
      longDescription:
        "Bags helps business owners scale with clarity — pairing a financial insights platform with expert bookkeeping and a funding strategy. I worked across product design, the design system, and the React front-end to make real financial clarity approachable for owners without an accounting degree.",
      glow: {
        colors: ["#166534", "#15803d", "#34d399"],
        glowColor: "142 58 34",
      },
      tech: [
        "Product Design",
        "UI Design",
        "UX Design",
        "Figma",
        "Cursor",
        "Notion",
        "Paper Design",
        "Conductor",
        "GitHub",
        "Auth0",
        "React",
        "TypeScript",
        "Chakra UI",
        "FastAPI",
        "Python",
        "PostHog",
        "Docker",
        "PostgreSQL",
      ],
      caseStudy: {
        headline: "Helping business owners scale with financial clarity",
        summary:
          "Bags pairs a financial insights platform with expert bookkeeping and funding strategy — so owners can understand their numbers and grow with confidence.",
        hero: { label: "Bags — financial overview dashboard", ratio: "16/9" },
        meta: {
          role: "Senior Product Designer & Design Engineer",
          year: "2023 - 2026",
          timeline: "Ongoing",
          platform: "Web platform",
          collaborators: [
            { role: "Senior Developer" },
            { role: "Senior Engineer" },
            { role: "Senior Developer" },
          ],
          scope: [
            "Product Design",
            "UX / UI",
            "Design Systems",
            "Front-end (React, TypeScript)",
            "Analytics (PostHog)",
            "Internal tooling",
          ],
        },
        git: { prs: 98, additions: 17800, deletions: 7950, files: 797 },
        sections: [
          {
            heading: "Growing with Bags.",
            body: [
              "Bags is built for business owners who have done the hard part — building a company from the ground up — and are ready to scale with clarity. It helps them take ownership of their numbers, understand their margins, and make smarter decisions every day: clean books, expert support, AI-powered insights, and access to funding that grows with them.",
              "My role spans the full path from product strategy and UX to the design system and the React front-end that ships to production.",
            ],
          },
          {
            heading: "Flying blind on the numbers.",
            body: [
              "Most owners are excellent operators and reluctant accountants. Books fall behind, margins stay fuzzy, cash flow is a guess, and funding feels like something that happens to other companies. The information needed to make a confident decision usually exists — it is just scattered, stale, or locked in a spreadsheet no one fully trusts.",
              "The design challenge was to make real financial clarity feel approachable — genuinely useful to someone without an accounting degree, on their busiest day.",
            ],
            images: [
              { label: "Before — scattered books & unclear margins", ratio: "4/3" },
            ],
          },
          {
            heading: "Designing a system, not screens.",
            body: [
              "Rather than draw one-off screens, I built a modular design system in Figma and shipped it in production with React. I led the platform's migration to Chakra UI — replacing bespoke chips, tabs, and buttons with a standard, themeable library — and introduced an OKLCH color system so theming stayed consistent and predictable.",
              "A reusable PageHeader rolled out across Accounting, Profile, Documents, Debt Tracker, and the Transactions Hub gave every surface the same backbone. This is where the role earned its second title: shipping production-quality components alongside the design, not handing them over a wall.",
            ],
            images: [
              { label: "Design system — Chakra UI components & OKLCH tokens", ratio: "16/9" },
            ],
          },
          {
            heading: "Financial insights, no accounting degree needed.",
            body: [
              "The Bags platform lets owners track their financial performance and surface insights at a glance. I designed dashboards that turn raw bookkeeping into the few numbers that actually drive decisions — performance, margins, and where the money is really going.",
            ],
            layout: "split",
            images: [
              { label: "Performance dashboard", ratio: "4/3" },
              { label: "Margin breakdown", ratio: "4/3" },
            ],
          },
          {
            heading: "Accounting & bookkeeping, done right.",
            body: [
              "For owners who would rather grow than reconcile, a dedicated team keeps the books clean and the numbers matching reality. I designed the back-office tooling — built in Retool — that powers that service: the faster, purpose-built interfaces the bookkeeping team uses to keep every account accurate.",
            ],
            images: [
              { label: "Bookkeeping & reconciliation tooling", ratio: "16/9" },
            ],
          },
          {
            heading: "Funding strategy & execution.",
            body: [
              "Once the financials are clean, Bags helps owners build a debt strategy, match with the right lenders, and move through securing capital. I designed the flows that turn a complex, intimidating funding process into a guided, legible path rather than a black box.",
            ],
            images: [
              { label: "Funding strategy & lender matching", ratio: "16/9" },
            ],
          },
          {
            heading: "Designed and shipped, end to end.",
            body: [
              "Bags is where the design-engineer title is most literal. Across two iterations of the platform — a legacy app and the monorepo I migrated it into — I shipped the frontend myself: 98 merged pull requests and roughly 17.8k lines of production React and TypeScript over about nine months.",
              "Beyond the core financial views, that meant building a Debt Tracker (KPIs, sorting, pagination), QuickBooks import logic, admin role and squad-management controls, redesigned pricing and upgrade flows, and end-to-end PostHog analytics across the frontend and backend — so the team can finally see how the product is actually used.",
            ],
            images: [
              { label: "Debt Tracker, admin controls & analytics", ratio: "16/9" },
            ],
          },
        ],
        outcome: {
          heading: "Where it landed.",
          body: [
            "Two platform iterations, ~98 merged PRs, and a design system that finally made design and development speak the same language — the internal bookkeeping tooling cut manual work by roughly a third along the way.",
            "More than the numbers, Bags gives owners something they rarely have: a calm, trustworthy view of their business — clean books, clear margins, and a real path to the funding they need to grow.",
          ],
        },
      },
    },
    {
      name: "AlphaDeal",
      slug: "alphadeal",
      blurb:
        "Deal workflow platform for real estate teams to evaluate opportunities and move faster from intake to decision.",
      longDescription:
        "AlphaDeal helps real estate teams manage the early deal process: capturing opportunities, organizing deal context, comparing assumptions, and keeping the path from first look to investment decision clear. The product focuses on reducing scattered handoffs and giving analysts, principals, and operators a shared workspace for evaluating whether a deal is worth pursuing.",
      glow: {
        colors: ["#84cc16", "#f97316", "#bef264"],
        glowColor: "84 74 48",
      },
      tech: [
        "Product Design",
        "UI Design",
        "UX Design",
        "Figma",
        "Paper Design",
        "Linear",
        "Conductor",
        "GitHub",
        "React",
        "TypeScript",
        "Tailwind CSS",
        "Radix UI",
        "Python",
        "Supabase",
        "Docker",
        "PostgreSQL",
      ],
      caseStudy: {
        headline: "A shared workspace for evaluating real-estate deals faster",
        summary:
          "A deal workflow platform that takes real estate teams from a first look to a confident decision without the scattered handoffs.",
        hero: { label: "AlphaDeal — deal workspace", ratio: "16/9" },
        meta: {
          role: "Product Designer & Design Engineer",
          year: "2026",
          timeline: "~7 weeks",
          platform: "Web platform",
          collaborators: [
            { role: "Senior Developer" },
            { role: "Senior Engineer" },
          ],
          scope: [
            "Product Design",
            "UX / UI",
            "Design Systems",
            "Front-end (React, TypeScript)",
          ],
        },
        git: { prs: 25, additions: 26355, deletions: 14552, files: 635 },
        sections: [
          {
            body: [
              "AlphaDeal is a commercial real-estate platform where teams evaluate and underwrite deals. By the time I focused on the front-end, the product had real depth — but the interface had grown faster than any system underneath it. I led an overhaul to make it feel like one coherent product again.",
            ],
          },
          {
            heading: "A platform that had outgrown its interface.",
            body: [
              "Years of fast feature work had left the UI fragmented: buttons, badges, cards, and dialogs each did their own thing, theming was applied ad hoc, and color lived in a tangle of HSL values that were hard to reason about. Nothing was broken, exactly — it just did not add up to a system, which made every new screen slower to build and harder to keep consistent.",
            ],
            images: [
              { label: "Before — divergent primitives & ad-hoc theming", ratio: "4/3" },
            ],
          },
          {
            heading: "Rebuilding on a real design system.",
            body: [
              "I migrated the entire color system from HSL to OKLCH with a full Tailwind palette, then rebuilt the core primitives on top of it: a unified AppIcon system, buttons set in Geist Mono, and standardized inputs, badges, cards, tabs, collapsibles, tooltips, and empty states — with every modal and dialog consolidated onto Radix.",
              "On that foundation I refreshed the platform navigation, theming controls, and the breadcrumb and deal chrome, so the whole product finally shares one backbone.",
            ],
            layout: "split",
            images: [
              { label: "OKLCH palette & Tailwind tokens", ratio: "4/3" },
              { label: "Primitives on Radix — badges, cards, modals", ratio: "4/3" },
            ],
          },
          {
            heading: "New surfaces, shipped fast.",
            body: [
              "The overhaul was not only cleanup. On the new foundation I shipped a full Settings page, a Landing v2 visual refresh, a new /services development-consultancy landing page, and a split-screen Login redesign — alongside a refreshed chat experience, header breadcrumbs, and underwriting layout fixes.",
            ],
            layout: "gallery",
            images: [
              { label: "Settings page", ratio: "4/3" },
              { label: "Landing v2 refresh", ratio: "4/3" },
              { label: "/services landing", ratio: "4/3" },
            ],
          },
        ],
        outcome: {
          heading: "Where it landed.",
          body: [
            "Twenty-five merged PRs and roughly 26k lines of UI in about seven weeks — a commercial real-estate platform that now reads as one modern, coherent product, on a design system the team can keep building on instead of around.",
          ],
        },
      },
    },
    {
      name: "Cello",
      slug: "cello",
      blurb: "Daily planning app that helps people turn a loose task list into a realistic schedule.",
      longDescription:
        "Cello is designed for planning one day at a time. Instead of treating tasks as an endless list, it helps people decide what actually fits into the day by placing work on a 24-hour timeline, adjusting duration, and tracking progress through focused task timers. The product goal is simple: make daily planning feel concrete, calm, and easy to revise.",
      glow: {
        colors: ["#c2410c", "#57534e", "#9a3412"],
        glowColor: "20 80 44",
      },
      tech: [
        "Product Design",
        "UI Design",
        "UX Design",
        "Figma",
        "Paper Design",
        "Conductor",
        "GitHub",
        "SwiftUI",
        "macOS",
      ],
      caseStudy: {
        headline: "Planning one realistic day at a time",
        summary:
          "A native macOS app that turns a loose task list into a schedule that actually fits the day.",
        hero: { label: "Cello — daily timeline", ratio: "16/9" },
        meta: {
          role: "Product Design Engineer",
          year: "2026",
          timeline: "2 sprints",
          platform: "macOS menu-bar app",
          scope: [
            "Product Design",
            "UX / UI",
            "Interaction Design",
            "Native (Swift 6 / SwiftUI)",
          ],
        },
        git: { commits: 12, additions: 6800, deletions: 1140, files: 32 },
        sections: [
          {
            body: [
              "Cello is a native macOS menu-bar app for planning one day at a time. It started from a personal frustration: to-do apps are great at collecting tasks and terrible at telling you whether they fit into a real day. I designed and built it solo in Swift 6, SwiftUI, and SwiftData — local-first, with no backend.",
            ],
          },
          {
            heading: "The endless to-do list problem.",
            body: [
              "A list has no sense of time. It will happily hold thirty tasks for a day that has room for six, which quietly sets you up to feel behind. The core insight was that planning isn't about capturing more — it's about deciding what actually fits.",
            ],
            images: [
              { label: "The overloaded list problem", ratio: "4/3" },
            ],
          },
          {
            heading: "A 24-hour timeline you manipulate directly.",
            body: [
              "The heart of Cello is a 24-hour timeline canvas. You drag on it to create a task, resize the block to set its duration, and drag it to reposition — planning becomes a concrete, physical act rather than wishful thinking. A backlog sidebar holds everything you haven't placed yet, with inline capture and planning groups.",
            ],
            layout: "split",
            images: [
              { label: "Backlog sidebar", ratio: "9/16" },
              { label: "24-hour timeline canvas", ratio: "9/16" },
            ],
          },
          {
            heading: "When blocks collide.",
            body: [
              "Direct manipulation only feels good if collisions feel intelligent. I built a drag system that pushes neighboring blocks out of the way — cascading the shift down the day — or swaps two blocks when that reads better, with conflict prevention that stops any placement from overflowing the day. It's the part of the app I'm proudest of as an engineering problem.",
            ],
            images: [
              { label: "Push-cascade & swap collision handling", ratio: "16/9" },
            ],
          },
          {
            heading: "Cards that track real time.",
            body: [
              "Every block is an always-editable card: inline title editing, on-card tag dropdowns, and completion checkboxes with dashed and hatched styling. Tags pair a color with an SF Symbol from a built-in icon picker. A per-task timer tracks actual versus planned duration to the second, showing live time ranges right on the card — and a daily rollover quietly moves yesterday's unfinished tasks back to the backlog on launch.",
            ],
            images: [
              { label: "Editable cards, tags & per-task timers", ratio: "16/9" },
            ],
          },
          {
            heading: "Built native and local-first.",
            body: [
              "Cello lives in the menu bar — no Dock icon, a floating planner window, and launch-at-login — so it's there when you need it and out of the way when you don't. Everything is stored locally with SwiftData, so the app stays fast and private, with no account and no backend.",
            ],
            images: [
              { label: "Menu-bar planner & native details", ratio: "16/9" },
            ],
          },
        ],
        outcome: {
          heading: "Where it landed.",
          body: [
            "Twelve focused commits and roughly 5.6k net lines across two sprints — a complete, runnable macOS app that makes daily planning feel concrete, calm, and easy to revise: a day you can see, adjust, and actually finish.",
          ],
        },
      },
    },
    {
      name: "Panorama",
      slug: "panorama",
      blurb:
        "Marketing site and authenticated client portal for advisors helping international businesses enter the US market.",
      longDescription:
        "Panorama presents a US market-entry advisory firm. I solo-built its web presence end to end in Next.js — a marketing site that turns a complex consulting offer into a clear, trustworthy narrative, plus an authenticated client portal with Clerk auth, PostHog analytics, and SEO and performance work.",
      glow: {
        colors: ["#9ca3af", "#eab308", "#d1d5db"],
        glowColor: "46 78 54",
      },
      tech: [
        "Product Design",
        "UI Design",
        "UX Design",
        "Figma",
        "Next.js",
        "TypeScript",
        "Tailwind CSS",
        "shadcn/ui",
        "Clerk",
        "Conductor",
        "GitHub",
        "Supabase",
        "Vercel",
        "PostHog",
      ],
      caseStudy: {
        headline: "A clear, trustworthy face for US market-entry advisors",
        summary:
          "A Next.js marketing site and authenticated client portal that turn a complex advisory offer into a clear, trustworthy presence.",
        hero: { label: "Panorama — homepage", ratio: "16/9" },
        meta: {
          role: "Designer & Developer",
          year: "2026",
          timeline: "Solo build",
          platform: "Marketing site + client portal",
          scope: [
            "Product Design",
            "UX / UI",
            "Front-end (Next.js)",
            "Auth (Clerk)",
            "Analytics & SEO",
          ],
          liveUrl: "https://panorama.cash",
        },
        git: { prs: 17, additions: 10494, deletions: 906, files: 155 },
        sections: [
          {
            body: [
              "Panorama helps international businesses understand, plan, and execute their entry into the US market. I built its web presence end to end as a solo designer and developer — the marketing site and an authenticated client portal — on Next.js.",
            ],
          },
          {
            heading: "Making a complex offer feel simple.",
            body: [
              'Market-entry consulting is dense — legal, financial, and operational decisions all tangled together, and the risk is sounding either vague or overwhelming. I built the marketing site from scratch to make the offer feel approachable: a landing page that leads with clarity, pricing packages, a dedicated Tax Services card, and Calendly "Book a Call" CTAs that turn interest into booked conversations.',
            ],
            images: [
              { label: "Landing page & pricing packages", ratio: "16/9" },
            ],
          },
          {
            heading: "From marketing site to client portal.",
            body: [
              "Beyond marketing, Panorama needed a private space for clients. I built the full client portal for panorama.cash, then re-architected its authentication — replacing Supabase Auth with Clerk in the project's largest change (~5,000 lines) — for a more robust, maintainable sign-in.",
            ],
            images: [
              { label: "Authenticated client portal", ratio: "16/9" },
            ],
          },
          {
            heading: "Wired to be found and measured.",
            body: [
              "A marketing site only works if people can find it and you can learn from it. I integrated PostHog product analytics end to end, added a sitemap and robots rules, fixed the hero's LCP so the page paints fast, and canonicalized the domain on www.panorama.cash to resolve Google indexing.",
            ],
            images: [
              { label: "Analytics, SEO & performance", ratio: "16/9" },
            ],
          },
          {
            heading: "The details that build trust.",
            body: [
              "Credibility lives in the details. I added Privacy Policy and Terms of Service pages, resolved web-interface-guideline accessibility and UX issues, wrapped the portal in an error boundary, and cleared the Next.js lint violations — so the experience holds up under scrutiny.",
            ],
            images: [
              { label: "Privacy, terms & accessibility", ratio: "4/3" },
            ],
          },
        ],
        outcome: {
          heading: "Where it landed.",
          body: [
            "Seventeen merged PRs and roughly 9.6k net lines, solo — a fast, measurable, compliant marketing site and client portal that turns Panorama's complex advisory offer into a clear, trustworthy presence at panorama.cash.",
          ],
        },
      },
    },
  ],
};
