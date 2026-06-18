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
  /**
   * Concise highlight bullets for the TL;DR view. Each line should actually
   * explain a feature in a few words — not just echo a section title. When
   * omitted, the TL;DR falls back to listing the section headings.
   */
  tldr?: string[];
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
  /** Optional cover image used for subtle homepage card reveals. */
  cover?: CaseImage;
  /** Optional full case study shown at /work/<slug>. */
  caseStudy?: CaseStudy;
  /**
   * When true, the project shows as a "Coming soon" locked card (content
   * blurred, not clickable) and its /work/<slug> page is not generated.
   */
  locked?: boolean;
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

/** A "currently into" card in the personal / about-me section. */
export interface CurrentlyItem {
  /** Category label shown as the eyebrow, e.g. "Watching". */
  label: string;
  /** What it is, e.g. "Spider-Noir". */
  title: string;
  /** Optional context line, e.g. "Prime Video". */
  detail?: string;
  /** Emoji shown in the tile as a fallback when no `image` is set. */
  icon: string;
  /**
   * Square image for the tile, e.g. "/currently/spider-noir.webp".
   * Recommended source: a square image at least 256×256 (displayed at 64×64,
   * so 128×128 covers retina). When set, it replaces the emoji.
   */
  image?: string;
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
  /** Personal "currently into" cards for the about-me section. */
  currently: CurrentlyItem[];
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
  tagline: "Senior Product Design Engineer",
  bio: "Pushing pixels around until they feel just right, while talking at screens until the whole thing ships. Somewhere between product design, systems thinking, and front-end implementation, turning fuzzy ideas into working software while obsessing over the details.",
  githubUser: "lipefxo",
  socials: {
    email: "lipefxo@gmail.com",
    github: "lipefxo",
    x: "lpfx0",
    linkedin: "https://www.linkedin.com/in/felipefxo/",
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
  // What I'm into right now — edit freely.
  currently: [
    {
      label: "Watching",
      title: "Spider-Noir",
      icon: "🕷️",
      image: "/currently/spider-noir-512.webp",
    },
    {
      label: "Playing",
      title: "Arc Raiders",
      icon: "🎮",
      image: "/currently/arc-raiders-512.webp",
    },
    {
      label: "Listening",
      title: "Bad Bunny",
      icon: "🎧",
      image: "/currently/bad-bunny-512.webp",
    },
    {
      label: "Drinking",
      title: "Cold latte",
      icon: "🧊",
      image: "/currently/cold-latte-512.webp",
    },
  ],
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
      blurb: "A financial platform that helps business owners actually get their numbers, tidy up the books, and find funding to grow.",
      longDescription:
        "Most business owners are great at running a business and a lot less keen on the accounting that comes with it. So the books slip, the margins stay fuzzy, and funding feels like something that happens to other people. Bags is there to fix that. It keeps your books clean, turns your numbers into a few things you can actually act on, and helps you find funding when you're ready to grow. I worked on it across product design, the design system, and the React front-end, with one goal: making all of it make sense to someone who never wants to open a spreadsheet.",
      glow: {
        colors: ["#166534", "#15803d", "#34d399"],
        glowColor: "142 58 34",
      },
      cover: {
        label: "Bags cover image",
        ratio: "48/17",
        src: "/work/bags/cover.png",
        alt: "Bags branded cover image with the Bags logo over a florist workspace.",
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
        "Codex",
        "Claude AI",
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
        headline: "Making sense of your numbers, without the accounting degree",
        summary:
          "A financial platform I helped build so business owners can finally make sense of their money, keep their books clean, and find funding to grow.",
        hero: {
          label: "Bags cover image",
          ratio: "48/17",
          src: "/work/bags/cover.png",
          alt: "Bags branded cover image with the Bags logo over a florist workspace.",
        },
        meta: {
          role: "Senior Product Design Engineer",
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
            "Brand & Visual Identity",
            "Brand Guidelines",
            "UX / UI",
            "Design Systems",
            "Front-end (React, TypeScript)",
            "Analytics (PostHog)",
            "Internal tooling",
          ],
          liveUrl: "https://www.securebags.com",
        },
        git: { prs: 98, additions: 17800, deletions: 7950, files: 797 },
        sections: [
          {
            heading: "Growing with Bags.",
            body: [
              "Bags is for people who've already done the hard part of building a company and now want to grow without flying blind. It helps them take real ownership of their numbers: clean books, a team to lean on, insights that actually make sense, and funding that grows with them.",
              "I've been the only designer on the team since the company started. Over that time I've helped grow Bags to around two million in annual revenue, and into profitability, while keeping one person's eye on the whole experience.",
              "I came in as the product designer, owning everything from branding and product visuals to the user experience and journey mapping. As the product matured I grew into a design engineer, taking on the last mile too: tuning the details live in production and building the front-end interactions myself.",
            ],
          },
          {
            heading: "Flying blind on the numbers.",
            body: [
              "Most owners are great operators and reluctant accountants. The books slip, the margins stay fuzzy, cash flow is a guess, and funding feels like something that happens to other companies. The numbers they need to make a call usually exist somewhere. They're just scattered, out of date, or stuck in a spreadsheet nobody really trusts.",
              "So the real job was making all of this feel approachable, the kind of thing that's genuinely useful to someone with no accounting background, even on their busiest day.",
            ],
            images: [
              { label: "Before: scattered books and unclear margins", ratio: "4/3" },
            ],
          },
          {
            heading: "Defining the brand, then the system.",
            body: [
              "Before any screens, this meant defining the brand itself. I led a brand refresh and set the visual language, the look, the styling, and the guidelines for how it all fits together, so there was a real identity to design against instead of a moving target.",
              "From there, instead of drawing one screen at a time, I built a proper design system in Figma and then shipped it for real in the React app. I moved the whole product onto a single, consistent set of building blocks and a color system that stays the same everywhere, so the same buttons, tabs, and cards show up across the app instead of a slightly different version on every page.",
            ],
            images: [
              { label: "Design system: shared components and color tokens", ratio: "16/9" },
            ],
          },
          {
            heading: "Financial insights, no accounting degree needed.",
            body: [
              "At its core, Bags lets owners see how the business is doing at a glance. I designed the dashboards that take all the raw bookkeeping and boil it down to the few numbers that actually matter: how you're performing, what your margins look like, and where the money is really going.",
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
              "Plenty of owners would rather grow the business than reconcile a bank statement, so a dedicated team keeps the books clean for them. I designed the behind-the-scenes tools that team uses every day: faster, purpose-built screens for keeping every account accurate and matching reality.",
            ],
            images: [
              { label: "Bookkeeping & reconciliation tooling", ratio: "16/9" },
            ],
          },
          {
            heading: "Funding strategy & execution.",
            body: [
              "Once the books are clean, Bags helps owners actually go get funding: build a plan, match with the right lenders, and work through securing the money. I designed those flows to feel like a guided path you can follow, instead of a confusing, intimidating black box.",
            ],
            images: [
              { label: "Funding strategy & lender matching", ratio: "16/9" },
            ],
          },
          {
            heading: "Built to flex and scale.",
            body: [
              "More than any single feature, the goal has been a system that can flex and scale as the business grows. It connects with the accounting software owners already use and pulls their information in automatically, so the numbers stay current without anyone copying things over by hand.",
              "I also built analytics into the product end to end, so before we change anything we're looking at real data on how people actually use it, instead of guessing.",
            ],
            images: [
              { label: "Connected accounting data and product analytics", ratio: "16/9" },
            ],
          },
        ],
        tldr: [
          "A financial platform that pairs clean books and a real support team with insights and funding, built for people who'd rather grow than do accounting.",
          "I've been the only designer on the team since the company started, and helped grow Bags to around $2M in annual revenue and into profitability.",
          "I started as the product designer, owning branding, product visuals, UX, and journey mapping, then grew into a design engineer handling the last mile in production and the front-end interactions.",
          "It started with the brand itself: I led a brand refresh and defined the visual language, the styling, and the guidelines, not just the screens on top.",
          "From there, everything sits on one design system I built in Figma and shipped in React, so the whole product feels like the same product.",
          "Dashboards that take all the raw bookkeeping and boil it down to the few numbers owners actually decide on: performance, margins, and where the money goes.",
          "The platform is built to flex and scale: it connects with the accounting software owners already use and pulls their data in automatically, so the numbers stay current.",
          "I built analytics in end to end, so decisions come from real data on how people use the product, not guesses.",
          "Funding flows that turn an intimidating money process into a guided path: build a plan, match with lenders, and secure the capital.",
        ],
      },
    },
    {
      name: "Cello",
      slug: "cello",
      blurb: "A little Mac app I made to plan my day on a timeline, and stop kidding myself about where my time actually goes.",
      longDescription:
        "I made Cello because I kept losing track of where my time went. I'd plan a day assuming I'd get everything done, and then… not. So I built a little Mac app that makes me lay my day out on a timeline, work around the stuff that's already on my calendar, and stick to one thing at a time. Tasks can't overlap, so I can't fool myself about how much fits. It only lets me plan a week at a time, and it quietly keeps score of what I planned versus what actually happened, so I can tell if I'm pushing too hard, taking it too easy, or getting it about right.",
      glow: {
        colors: ["#c2410c", "#57534e", "#9a3412"],
        glowColor: "20 80 44",
      },
      cover: {
        label: "Cello cover image",
        ratio: "48/17",
        src: "/work/cello/cover.png",
        alt: "Cello branded cover image with the Cello logo over a dark timeline interface.",
      },
      tech: [
        "Product Design",
        "UI Design",
        "UX Design",
        "Figma",
        "Paper Design",
        "Conductor",
        "Codex",
        "Claude AI",
        "GitHub",
        "SwiftUI",
        "macOS",
      ],
      caseStudy: {
        headline: "Planning one realistic day at a time",
        summary:
          "A little Mac app I built to lay my day out on a timeline, and finally see where my time actually goes.",
        hero: {
          label: "Cello cover image",
          ratio: "48/17",
          src: "/work/cello/cover.png",
          alt: "Cello branded cover image with the Cello logo over a dark timeline interface.",
        },
        meta: {
          role: "Product Design Engineer",
          year: "2026",
          timeline: "2 sprints",
          platform: "macOS menu-bar app",
          scope: [
            "Product Design",
            "Brand & Visual Identity",
            "UX / UI",
            "Interaction Design",
            "Calendar & GitHub integrations",
            "Native (Swift 6 / SwiftUI)",
          ],
        },
        git: { commits: 12, additions: 6800, deletions: 1140, files: 32 },
        sections: [
          {
            body: [
              "Cello is a little Mac app that lives in the menu bar and helps me plan one day at a time. I made it because I kept running into the same problem: to-do apps are great at piling up tasks and useless at telling you whether they actually fit into a real day. I designed and built the whole thing myself, its identity and look and feel as much as the way it works, and it runs entirely on my own machine. No account, no cloud, nothing to sign into.",
            ],
          },
          {
            heading: "The endless to-do list problem.",
            body: [
              "A list doesn't know what time is. It'll happily hold thirty things for a day that has room for six, and then you spend the day feeling behind for no real reason. The thing I kept coming back to: planning isn't about writing down more, it's about being honest about what actually fits.",
            ],
            images: [
              {
                label: "Cello timeline drag interaction",
                ratio: "16/9",
                src: "/work/cello/image-02-timeline-drag.webp",
                alt: "Cello timeline view showing a new task being dragged into the day schedule.",
              },
            ],
          },
          {
            heading: "Plan the week, live the day.",
            body: [
              "On purpose, Cello only lets me plan the current week. There's no endless future to keep shoving things into, and that one limit does a lot. It keeps me honest and keeps my attention on the day right in front of me, one day and one week at a time.",
            ],
          },
          {
            heading: "A timeline you can just grab.",
            body: [
              "The whole app is built around a timeline of the day. You drag on it to make a task, stretch the block to say how long it'll take, and slide it around to move it, so planning feels like actually doing something instead of just wishing. Anything you haven't slotted in yet waits in a backlog off to the side, where you can jot things down the moment they pop into your head.",
            ],
            layout: "split",
            images: [
              {
                label: "Backlog sidebar",
                ratio: "9/16",
                src: "/work/cello/backlog-sidebar.webp",
                alt: "Cello backlog sidebar with a quick-add field and a list of unplaced task cards grouped by section.",
              },
              {
                label: "24-hour timeline canvas",
                ratio: "9/16",
                src: "/work/cello/timeline-canvas.webp",
                alt: "Cello's vertical day timeline with colored task blocks placed across the hours and a now indicator.",
              },
            ],
          },
          {
            heading: "Planning around your calendar.",
            body: [
              "My day doesn't start as a blank slate. Cello pulls in my calendar so meetings and whatever's already booked show up right on the timeline. They're not tasks and I don't fiddle with them here. They're just the stuff that's already happening, so when I block out time to work, it's time I actually have.",
            ],
            images: [
              {
                label: "Calendar events on the timeline",
                ratio: "16/9",
                src: "/work/cello/calendar-on-timeline.webp",
                alt: "Cello day timeline with calendar events like a team standup and a 1:1 shown as muted, non-task blocks, with tasks planned in the gaps around them.",
              },
            ],
          },
          {
            heading: "When blocks collide.",
            body: [
              "Dragging things around only feels good if the app is smart about what happens when two blocks bump into each other. So I taught it to nudge the neighbors out of the way, pushing the rest of the day down, or swap two blocks when that just makes more sense, and it never lets you cram in more than the day can actually hold.",
            ],
            images: [
              {
                label: "Push-cascade & swap collision handling",
                ratio: "16/9",
                src: "/work/cello/collision-handling.webp",
                alt: "Cello timeline showing a dragged task block pushing neighboring blocks down the day.",
              },
            ],
          },
          {
            heading: "One thing at a time.",
            body: [
              "Cello flat-out won't let two tasks overlap. That's on purpose: a day is one lane, not a pile of things happening at once, so when you commit to a block you're committing to one thing. The app keeps me honest so I don't have to: I can't sneak in a second thing on top of an hour I've already spoken for, which means the plan stays real about what focus actually costs.",
            ],
            images: [
              {
                label: "Non-overlapping blocks across the day",
                ratio: "16/9",
                src: "/work/cello/focus-no-overlap.webp",
                alt: "Cello timeline of a single lane of non-overlapping task blocks, with a blocked drop state preventing an overlap.",
              },
            ],
          },
          {
            heading: "Cards that keep their own time.",
            body: [
              "Every block is a little card you can edit right where it sits: rename it, tag it, check it off when it's done. Tags get a color and an icon so the day is easy to read at a glance. Each card runs its own timer that quietly tracks how long something actually took versus how long I thought it would. And anything I don't finish today just slides back into the backlog when I open the app tomorrow, instead of silently vanishing.",
            ],
            images: [
              {
                label: "Editable cards, tags & per-task timers",
                ratio: "16/9",
                src: "/work/cello/cards-tags-timers.webp",
                alt: "Cello task card with an inline-editable title, a color and icon tag picker, and a tracked-versus-planned timer.",
              },
            ],
          },
          {
            heading: "Tasks linked to GitHub.",
            body: [
              "I can hook a task up to a GitHub issue so my plan stays tied to the actual work. The two keep each other in sync on their own, so what I line up in Cello and what I'm tracking on GitHub stay on the same page, instead of turning into two separate lists I have to babysit.",
            ],
            images: [
              {
                label: "Task linked to a GitHub issue",
                ratio: "16/9",
                src: "/work/cello/github-linked-task.webp",
                alt: "Cello task card linked to a GitHub issue, showing the issue number, open status, and a synced indicator alongside the issue details.",
              },
            ],
          },
          {
            heading: "Seeing where the week went.",
            body: [
              "All those blocks and timers add up to a picture of my week. I can see how much I set out to do, where I guessed wrong on how long things would take, how much I actually got through, and how many hours I really put in. Set against the limits I give myself, it just tells me straight whether I'm overdoing it, coasting, or landing about right, so planning becomes something I learn from instead of guess at.",
            ],
            images: [
              {
                label: "Weekly tracking: planned vs. actual hours",
                ratio: "16/9",
                src: "/work/cello/weekly-tracking.webp",
                alt: "Cello week-in-review screen with planned-versus-tracked hours per day, completion stats, and progress against a weekly hour limit.",
              },
            ],
          },
        ],
        tldr: [
          "A little Mac app that lives in your menu bar and lays your day out on a timeline. You drag to make a task, stretch it to set how long it takes, and slide it around to move it.",
          "It only lets you plan the current week, so there's no endless future to keep shoving tasks into.",
          "It pulls in your calendar, so you plan your day around what's already booked instead of pretending that time is free.",
          "It won't let two tasks overlap. A day is one lane, so the plan stays honest about what actually fits.",
          "When blocks bump into each other it's smart about it, nudging the others out of the way or swapping them, and it never lets you cram in more than the day holds.",
          "Every task is a little card with tags, colors, and its own timer that tracks how long things really took versus how long you thought.",
          "You can link a task to a GitHub issue so the two stay in sync, and anything you don't finish slides back into tomorrow's backlog.",
          "At the end of the week it shows you what you planned versus what actually happened, so you can tell if you're overdoing it, coasting, or getting it about right.",
          "It runs entirely on your own machine. No account, no cloud, nothing to sign into.",
        ],
      },
    },
    {
      name: "AlphaDeal",
      slug: "alphadeal",
      locked: true,
      blurb:
        "A shared workspace where real estate teams size up deals together and get from a first look to a confident yes or no.",
      longDescription:
        "AlphaDeal is where real estate teams figure out whether a deal is worth chasing. It pulls the early part of the process into one place: capturing opportunities, keeping all the context together, comparing assumptions, and keeping the path from first look to final decision clear. Instead of scattered handoffs and a dozen versions of the truth, everyone works in the same space. When I came in, the product already did a lot, but the interface had grown faster than anything holding it together, so I led the front-end work to make it feel like one product again.",
      glow: {
        colors: ["#84cc16", "#f97316", "#bef264"],
        glowColor: "84 74 48",
      },
      cover: {
        label: "AlphaDeal cover image",
        ratio: "48/17",
        src: "/work/alphadeal/cover.png",
        alt: "AlphaDeal branded cover image with the AlphaDeal logo over a textured city skyline.",
      },
      tech: [
        "Product Design",
        "UI Design",
        "UX Design",
        "Figma",
        "Paper Design",
        "Linear",
        "Conductor",
        "Codex",
        "Claude AI",
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
        headline: "Getting real estate teams from a first look to a confident decision",
        summary:
          "A shared workspace where real estate teams size up deals and get from a first look to a confident decision, without the scattered handoffs.",
        hero: {
          label: "AlphaDeal cover image",
          ratio: "48/17",
          src: "/work/alphadeal/cover.png",
          alt: "AlphaDeal branded cover image with the AlphaDeal logo over a textured city skyline.",
        },
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
            "Brand & Visual Identity",
            "Brand Guidelines",
            "UX / UI",
            "Design Systems",
            "Front-end (React, TypeScript)",
          ],
          liveUrl: "https://www.alphadeal.ai",
        },
        git: { prs: 25, additions: 26355, deletions: 14552, files: 635 },
        sections: [
          {
            body: [
              "AlphaDeal is a commercial real estate platform where teams evaluate and underwrite deals. By the time I got to the front-end, the product already did a lot. The problem was that the interface had grown way faster than anything holding it together. So I led a cleanup to make the whole thing feel like one product again.",
            ],
          },
          {
            heading: "A platform that had outgrown its interface.",
            body: [
              "Years of shipping features fast had left the interface all over the place. Buttons, badges, cards, and pop-ups each did their own thing, styling was applied however, and the colors were a tangle nobody really wanted to touch. Nothing was broken exactly. It just didn't add up to a system, which made every new screen slower to build and harder to keep looking right.",
            ],
            images: [
              { label: "Before: mismatched pieces and ad-hoc styling", ratio: "4/3" },
            ],
          },
          {
            heading: "A brand refresh and a real design system.",
            body: [
              "This was as much about the brand as the build. I led a refresh of the visual language, setting the look, the styling, and the guidelines for how everything should feel, so the system had a real identity to stand on rather than just tidier components.",
              "On that, I rebuilt the foundation from the ground up. First a clean, consistent color system, then all the basic building blocks on top of it: one set of icons, one kind of button, and standard inputs, badges, cards, tabs, tooltips, and empty states, with every pop-up and dialog working the same way.",
              "With that in place, I refreshed the navigation, the theming controls, and the deal screens, so the whole product finally shares one backbone instead of a different look on every page.",
            ],
            layout: "split",
            images: [
              { label: "A clean, consistent color palette", ratio: "4/3" },
              { label: "Shared building blocks: badges, cards, pop-ups", ratio: "4/3" },
            ],
          },
          {
            heading: "New surfaces, shipped fast.",
            body: [
              "It wasn't just cleanup, though. Once the foundation was solid, building new things got fast. I shipped a full Settings page, a refreshed landing page, a new services page, and a redesigned login, along with a nicer chat experience and a bunch of fixes to the deal screens.",
            ],
            layout: "gallery",
            images: [
              { label: "Settings page", ratio: "4/3" },
              { label: "Landing v2 refresh", ratio: "4/3" },
              { label: "/services landing", ratio: "4/3" },
            ],
          },
        ],
        tldr: [
          "A commercial real estate platform where teams evaluate and underwrite deals. I led the front-end work to make it feel like one product again.",
          "It wasn't just interface cleanup. I led the brand refresh too, defining the visual language, the styling, and the guidelines underneath the whole system.",
          "It had grown fast and the interface showed it, so I cleaned up the colors and gave everything a single, consistent foundation.",
          "Rebuilt all the basic building blocks on top of that: one set of icons, buttons, inputs, badges, cards, tabs, and tooltips, with every pop-up working the same way.",
          "Refreshed the navigation, theming controls, and deal screens so the whole product shares one backbone.",
          "On the new foundation, shipped real things fast: a Settings page, a refreshed landing page, a new services page, and a redesigned login.",
          "About 25 merged PRs and 26k lines of interface in roughly seven weeks.",
        ],
      },
    },
    {
      name: "Panorama",
      slug: "panorama",
      locked: true,
      blurb:
        "A website and private client portal I built solo for advisors who help businesses around the world break into the US market.",
      longDescription:
        "Panorama helps businesses from around the world figure out how to enter the US market, and then actually do it. I built its whole web presence on my own: a marketing site that takes a dense, complicated consulting offer and makes it feel clear and trustworthy, plus a private portal where clients log in. Along the way I handled the sign-in, the analytics, and the SEO and speed work that make a site like this actually get found and hold up.",
      glow: {
        colors: ["#9ca3af", "#eab308", "#d1d5db"],
        glowColor: "46 78 54",
      },
      cover: {
        label: "Panorama cover image",
        ratio: "48/17",
        src: "/work/panorama/cover.png",
        alt: "Panorama branded cover image with the Panorama logo over a dark floral illustration.",
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
        "Codex",
        "Claude AI",
        "GitHub",
        "Supabase",
        "Vercel",
        "PostHog",
      ],
      caseStudy: {
        headline: "Making a complicated advisory offer feel simple and trustworthy",
        summary:
          "A marketing site and private client portal I built solo, turning a dense advisory offer into something clear and easy to trust.",
        hero: {
          label: "Panorama cover image",
          ratio: "48/17",
          src: "/work/panorama/cover.png",
          alt: "Panorama branded cover image with the Panorama logo over a dark floral illustration.",
        },
        meta: {
          role: "Designer & Developer",
          year: "2026",
          timeline: "Solo build",
          platform: "Marketing site + client portal",
          scope: [
            "Product Design",
            "Brand & Visual Identity",
            "Brand Guidelines",
            "UX / UI",
            "Front-end (Next.js)",
            "Auth (Clerk)",
            "Analytics & SEO",
          ],
          liveUrl: "https://www.panorama.cash",
        },
        git: { prs: 17, additions: 10494, deletions: 906, files: 155 },
        sections: [
          {
            body: [
              "Panorama helps businesses from around the world understand, plan, and actually carry out their move into the US market. I built its whole web presence on my own, both the marketing site and the private client portal, doing the design and the development myself. That started with the brand itself: I led a brand refresh and set the visual language, the styling, and the guidelines, then designed and built everything on top of it.",
            ],
          },
          {
            heading: "Making a complex offer feel simple.",
            body: [
              'This kind of consulting is dense. Legal, financial, and operational decisions are all tangled together, and it\'s easy to come across as either vague or overwhelming. I built the marketing site from scratch to make the offer feel approachable instead: a landing page that leads with the point, clear pricing, a section just for tax services, and "Book a Call" buttons that turn a bit of interest into an actual conversation on the calendar.',
            ],
            images: [
              { label: "Landing page and pricing", ratio: "16/9" },
            ],
          },
          {
            heading: "From marketing site to client portal.",
            body: [
              "A marketing site only gets you so far. Clients also needed a private place to log in, so I built the full client portal. Partway through I rebuilt how signing in works, swapping out the original system for a sturdier, easier-to-maintain one. It was the biggest single change in the whole project, around 5,000 lines.",
            ],
            images: [
              { label: "Authenticated client portal", ratio: "16/9" },
            ],
          },
          {
            heading: "Wired to be found and measured.",
            body: [
              "A site like this only works if people can actually find it and you can learn from how they use it. So I wired in analytics across the whole thing, sorted out the bits that help Google find and list the site, and made the homepage load fast so it doesn't keep anyone waiting.",
            ],
            images: [
              { label: "Analytics, SEO, and performance", ratio: "16/9" },
            ],
          },
          {
            heading: "The details that build trust.",
            body: [
              "With this kind of work, trust lives in the small stuff. I added proper privacy and terms pages, fixed the accessibility and usability issues, made sure the portal fails gracefully if something goes wrong, and cleaned up the code along the way, so the whole thing holds up when someone looks closely.",
            ],
            images: [
              { label: "Privacy, terms, and accessibility", ratio: "4/3" },
            ],
          },
        ],
        tldr: [
          "A marketing site and private client portal I built on my own, end to end, for advisors who help businesses around the world break into the US market.",
          "It started with the brand itself: I led the refresh and set the visual language, the styling, and the guidelines, then designed and built everything on top.",
          "A marketing site built from scratch that makes a dense advisory offer feel approachable: a clear landing page, simple pricing, and \"Book a Call\" buttons.",
          "A private portal where clients log in, with the whole sign-in rebuilt on something sturdier in the project's biggest single change, around 5,000 lines.",
          "Wired so people can find it and I can learn from it: analytics throughout, the SEO basics sorted, and a homepage that loads fast.",
          "The trust details too: privacy and terms pages, accessibility and usability fixes, and a portal that fails gracefully.",
          "Seventeen merged PRs and around 9.6k net lines, solo, live at panorama.cash.",
        ],
      },
    },
    {
      name: "Handshake",
      slug: "handshake",
      locked: true,
      blurb:
        "A proposal studio for turning content into polished, animated proposal pages without making people wrestle with design tools.",
      longDescription:
        "Handshake is a proposal studio for creating beautiful animated proposal pages quickly. It turns written content into something polished and client-ready, so proposals feel considered without needing a designer in the loop every time.",
      glow: {
        colors: ["#2563eb", "#7c3aed", "#06b6d4"],
        glowColor: "221 83 53",
      },
      tech: [
        "Product Design",
        "UI Design",
        "UX Design",
        "Figma",
        "React",
        "TypeScript",
        "Vite",
        "Tailwind CSS",
        "Framer Motion",
        "Supabase",
        "Conductor",
        "Codex",
        "Claude AI",
        "GitHub",
        "Vercel",
      ],
      caseStudy: {
        headline: "Beautiful proposals, sent in minutes",
        summary:
          "A proposal studio for turning content into polished, animated proposal pages without needing design skills.",
        hero: { label: "Handshake proposal studio", ratio: "16/9" },
        meta: {
          role: "Product Designer & Design Engineer",
          year: "2026",
          timeline: "Coming soon",
          platform: "Web platform",
          scope: [
            "Product Design",
            "Brand & Visual Identity",
            "UX / UI",
            "Front-end",
          ],
          liveUrl: "https://www.handshake.design",
        },
        sections: [
          {
            body: [
              "Handshake turns content into stunning animated proposal pages, so teams can send polished, client-ready proposals without needing design skills.",
            ],
          },
        ],
      },
    },
  ],
};
