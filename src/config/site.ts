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

export interface ResumeProfile {
  fullName: string;
  phone: string;
  portfolio: string;
  summary: string;
  education: string;
  certifications: string[];
  languages: string;
}

/** One entry within a Currently category's shuffle deck. */
export interface CurrentlyEntry {
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

/** A "currently into" deck in the personal / about-me section. */
export interface CurrentlyItem {
  /** Category label shown as the eyebrow, e.g. "Watching". */
  label: string;
  /** Deck of entries; the first is shown on top. Click shuffles to the next. */
  items: CurrentlyEntry[];
}

/** A record displayed in the interactive "On rotation" listening console. */
export interface MusicAlbum {
  title: string;
  artist: string;
  /** Existing square cover artwork, displayed without cropping. */
  cover: string;
  /** Full Spotify album URL opened after a successful selection. */
  spotifyUrl: string;
  /** Small per-record accent used by the console metadata and focus treatment. */
  accent: string;
}

export interface SiteConfig {
  name: string;
  tagline: string;
  location: string;
  bio: string;
  resume: ResumeProfile;
  githubUser: string;
  socials: SocialLinks;
  skills: string[];
  tools: string[];
  experience: ExperienceItem[];
  /** Personal "currently into" cards for the about-me section. */
  currently: CurrentlyItem[];
  /** Albums shown in the interactive listening console. */
  onRotation: MusicAlbum[];
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
  tagline: "Product Designer & Design Engineer",
  location: "São Paulo, Brazil 🇧🇷",
  bio: "Pushing pixels around until they feel just right, while talking at screens. Somewhere between product design, systems thinking, and front-end implementation, turning fuzzy ideas into working software while obsessing over the details.",
  resume: {
    fullName: "Luis Felipe Lins",
    phone: "+55 61 98210-5161",
    portfolio: "https://lipefxolio.com",
    summary:
      "Product designer with 10 years across fintech, SaaS, and brand, and founding designer at two startups — building design foundations and systems from zero through rapid growth. Over the past year that has grown into design engineering: I now build what I design, shipping production React and TypeScript into the codebase, running multi-agent development workflows across front-end and back-end, and holding the product roadmap and prioritization.",
    education: "Bachelor of Architecture and Urbanism, UniCEUB | 2018",
    certifications: [
      "Visual Design for Digital Products, Aprender Design | 2025",
      "AI Creator, Human Academy | 2024",
      "Scaling Design Systems, TheStarter | 2023",
      "Product Discovery, Produtos Incríveis | 2023",
    ],
    languages: "English — C1 | Portuguese — Native",
  },
  githubUser: "lipefxo",
  socials: {
    email: "lipefxo@gmail.com",
    github: "lipefxo",
    x: "lpfx0",
    linkedin: "https://www.linkedin.com/in/felipefxo/",
  },
  // From CV — edit freely.
  skills: [
    "UX Design",
    "UI Design",
    "Product Design",
    "Design Systems",
    "User Research (Qualitative and Quantitative)",
    "Information Architecture",
    "Prototyping",
    "Responsive Design",
    "React",
    "TypeScript",
    "HTML/CSS",
    "Tailwind CSS",
    "Multi-Agent Development Workflows",
    "Git Worktrees",
    "MCP (Model Context Protocol)",
    "Product Roadmapping",
    "Prioritization",
    "Product Analytics",
  ],
  tools: [
    "Figma",
    "Cursor",
    "Claude Code",
    "Codex",
    "Conductor",
    "Grok",
    "VS Code",
    "GitHub",
    "Retool",
    "PostHog",
    "Webflow",
    "Framer",
    "Linear",
    "Notion",
  ],
  experience: [
    {
      company: "SecureBags",
      role: "Design Engineer & Acting Product Manager",
      period: "Oct 2025 — Present",
      summary:
        "I own the product roadmap and prioritization while building product experiences directly in the production codebase. The role combines product discovery, React and TypeScript implementation, multi-agent development workflows, analytics, and internal operations tooling.",
      highlights: [
        "Owned the product roadmap and prioritization, running discovery and product sessions with engineering and stakeholders; established the team’s development cycle, working processes, and documentation standards from scratch.",
        "Built components and end-to-end flows directly in the production codebase rather than specifying them for handoff, shipping React and TypeScript and refining spacing, states, motion, and interaction details in code where they can actually be judged.",
        "Set up and ran multi-agent development workflows using Claude Code, Codex, Conductor, and Cursor, running agents in parallel across isolated Git worktrees — enabling sustained concurrent delivery across back-end and front-end as a single contributor — and authored the documentation, reusable agent skills, and workflow conventions that made it a repeatable team practice.",
        "Implemented PostHog across the product, instrumenting key funnels and building the dashboards behind them, giving the team analytics visibility it previously lacked and grounding roadmap decisions in behavioural data rather than assumption.",
        "Designed and built the internal back-office into production for financial review, customer onboarding, and operations, giving support and operations direct ownership of workflows that previously required engineering intervention.",
      ],
    },
    {
      company: "SecureBags",
      role: "Senior Product Designer (founding designer)",
      period: "Mar 2023 — Oct 2025",
      summary:
        "I joined SecureBags as its founding designer and established the design foundations, workflows, and cross-functional processes that supported the company’s rapid growth. I owned the SaaS platform’s UX/UI, design system, and internal tooling from research through production.",
      highlights: [
        "Joined with no existing design infrastructure; established design foundations, workflows, and cross-functional processes that scaled through the company’s rapid growth.",
        "Owned complete UX and UI for a new SaaS platform covering onboarding, account management, dashboards, lending workflows, and integrations, from research through high-fidelity handoff; streamlined onboarding and key flows to reduce drop-off and improve retention.",
        "Built a Figma-to-production pipeline using Cursor, React, Chakra UI, and MCP, and created a modular design system of reusable, dynamically structured components, cutting design-to-development delivery time by 40%.",
        "Identified operational bottlenecks creating manual overhead for the support team; designed and shipped internal back-office tooling in Retool for financial review, customer onboarding, and operations.",
      ],
    },
    {
      company: "Suflex",
      role: "Lead Product Designer (promoted from Product Designer)",
      period: "Aug 2020 — Jan 2023",
      summary:
        "I joined Suflex as its founding designer and grew into the Lead Product Designer role, owning design operations and direction across two SaaS products while partnering with engineering and business leadership.",
      highlights: [
        "Joined as founding designer and promoted to Lead Product Designer; owned design operations, coached junior designers, and presented design direction to engineering and business leadership.",
        "Led design for two SaaS products (B2B and B2C) from concept to MVP launch, owning discovery, research, journey mapping, prototyping, and developer handoff.",
        "Established the Suflex Design System with a unified component library and design guidelines, reducing feature delivery time by 30% and ensuring cross-platform consistency.",
        "Partnered with engineering and product management to align roadmaps, scope initiatives, and fold user feedback into iteration, contributing to product-market fit.",
        "Drove post-launch usability and data-driven refinements that increased product adoption and retention.",
      ],
    },
    {
      company: "Grafite Design",
      role: "Independent Product and Brand Designer",
      period: "Jan 2015 — Jan 2025",
      summary:
        "I ran independent product and brand design work alongside the roles above, helping small businesses, startups, and NGOs build distinctive identities and complete digital products.",
      highlights: [
        "Created over 40 brand identity and strategy projects for small businesses, startups, and NGOs seeking distinctive market positioning.",
        "Served clients across technology, food, legal, finance, medical, and home industries, adapting the design approach to sector-specific needs.",
        "Delivered over 10 end-to-end product design projects for clients without in-house design capability, from style guide definition through complete UI/UX.",
      ],
    },
  ],
  // What I'm into right now — edit freely.
  currently: [
    {
      label: "Watching",
      items: [
        {
          title: "Spider-Noir",
          icon: "🕷️",
          image: "/currently/spider-noir-512.webp",
        },
        {
          title: "House of the Dragon",
          icon: "🐉",
          image: "/currently/house-of-the-dragon-512.png",
        },
        {
          title: "Chernobyl",
          icon: "☢️",
          image: "/currently/chernobyl-512.png",
        },
      ],
    },
    {
      label: "Playing",
      items: [
        {
          title: "Arc Raiders",
          icon: "🎮",
          image: "/currently/arc-raiders-512.webp",
        },
        {
          title: "Crimson Desert",
          icon: "⚔️",
          image: "/currently/crimson-desert-512.png",
        },
        {
          title: "Graveyard Keeper",
          icon: "🪦",
          image: "/currently/graveyard-keeper-512.png",
        },
      ],
    },
    {
      label: "Listening",
      items: [
        {
          title: "Bad Bunny",
          icon: "🎧",
          image: "/currently/bad-bunny-512.webp",
        },
        {
          title: "Stromae",
          icon: "🎤",
          image: "/currently/stromae-512.png",
        },
        {
          title: "Balu Brigada",
          icon: "🎶",
          image: "/currently/balu-brigada-512.png",
        },
        {
          title: "RÜFÜS DU SOL",
          icon: "🌅",
          image: "/currently/rufus-du-sol-512.png",
        },
      ],
    },
    {
      label: "Drinking",
      items: [
        {
          title: "Cold latte",
          icon: "🧊",
          image: "/currently/cold-latte-512.webp",
        },
      ],
    },
  ],
  onRotation: [
    {
      title: "DeBÍ TiRAR MáS FOToS",
      artist: "Bad Bunny",
      cover: "/currently/bad-bunny-512.webp",
      spotifyUrl: "https://open.spotify.com/album/5K79FLRUCSysQnVESLcTdb",
      accent: "#788147",
    },
    {
      title: "Multitude",
      artist: "Stromae",
      cover: "/currently/stromae-512.png",
      spotifyUrl: "https://open.spotify.com/album/5JY3b9cELQsoG7D5TJMOgw",
      accent: "#9ab9bb",
    },
    {
      title: "Portal",
      artist: "Balu Brigada",
      cover: "/currently/balu-brigada-512.png",
      spotifyUrl: "https://open.spotify.com/album/3T5osCmLRKocwvc1yobKwB",
      accent: "#d93724",
    },
    {
      title: "Surrender (Remixes)",
      artist: "RÜFÜS DU SOL",
      cover: "/currently/rufus-du-sol-512.png",
      spotifyUrl: "https://open.spotify.com/album/73TcBRSRsPLKmxnjnVsSV3",
      accent: "#d3784e",
    },
  ],
  hiddenRepos: ["lipefxo", "origami-coffee", "handshake"],

  // Curated copy for public GitHub repos. Repos not listed here fall back to
  // their GitHub description.
  featured: {},

  // Private/work projects — shown as description-only cards (no source links).
  work: [
    {
      name: "Notch Capture",
      slug: "notch-capture",
      blurb:
        "A little Mac app that turns the notch into a private surface for capture, focus, music, camera checks, and desk-light controls.",
      longDescription:
        "I made Notch Capture because half my ideas show up while I'm in the middle of something else, and opening a notes app to save one is exactly how I lose the thing I was already doing. The app keeps a searchable inbox, reusable snippets, music controls, a focus timer, a webcam mirror, and connected-light controls behind the Mac notch. It has no Dock icon, no floating window, and no analytics. One shortcut opens the surface, one composer captures or finds what I need, and Escape puts it away.",
      glow: {
        colors: ["#1e3a8a", "#172554", "#1d4ed8"],
        glowColor: "217 76 28",
      },
      cover: {
        label: "Notch Capture cover image",
        ratio: "48/17",
        src: "/work/notch-capture/cover-3.webp",
        alt: "Notch Capture branded cover image with the app's inbox panel unfolding from a Mac notch.",
      },
      tech: [
        "Product Design",
        "UI Design",
        "UX Design",
        "Conductor",
        "Claude AI",
        "GitHub",
        "Swift 6",
        "macOS",
      ],
      caseStudy: {
        headline: "The notch had one job. Now it has a few.",
        summary:
          "A private, local-first surface for capturing thoughts and keeping small desk utilities close without leaving the work in front of me.",
        hero: {
          label: "Notch Capture cover image",
          ratio: "48/17",
          src: "/work/notch-capture/cover-3.webp",
          alt: "Notch Capture branded cover image with the app's inbox panel unfolding from a Mac notch.",
        },
        meta: {
          role: "Product Design Engineer",
          year: "2026",
          timeline: "2 sprints",
          platform: "macOS notch app",
          scope: [
            "Product Design",
            "UX / UI",
            "Interaction Design",
            "Motion & Micro-interactions",
            "Native (Swift 6 / SwiftUI)",
            "Landing page (Next.js)",
          ],
        },
        git: { prs: 18, additions: 44000, deletions: 7100, files: 127 },
        sections: [
          {
            body: [
              "Notch Capture is a small Mac app that unfolds from the black cutout at the top of the screen. It started as a faster way to save a thought, then grew into the place I reach for the other tiny things that interrupt a work session: reusable text, music controls, a focus timer, a webcam check, and desk-light adjustments. I designed and built it solo over two sprints.",
            ],
          },
          {
            heading: "Thoughts don't wait for the right app.",
            body: [
              "The best ideas have terrible timing. They show up mid-task, and the moment I switch to a notes app to save one, I've traded the thing I was doing for the thing I just thought of. What I kept wanting wasn't a better notes app — it was a shorter distance between thinking something and having it written down.",
            ],
          },
          {
            heading: "It lives in the notch.",
            body: [
              "The notch is the one part of the screen no window uses, which makes it the right front door. Control–Shift–N opens the inbox and Escape dismisses it. There is no Dock icon, menu-bar item, or separate window to find, so opening the app feels like a quick detour instead of a context switch.",
            ],
            images: [
              {
                label: "The expanded Notch Capture inbox",
                ratio: "16/9",
                src: "/work/notch-capture/inbox-composer.webp",
                alt: "Notch Capture expanded beneath the Mac notch with music, snippets, folders, tasks, and the composer visible.",
                caption:
                  "The complete inbox unfolds from the notch and keeps its composer anchored at the bottom.",
              },
            ],
          },
          {
            heading: "One surface to capture and retrieve.",
            body: [
              "The composer does both jobs: typing filters the ledger live, while Return saves new text as an item. Above it, folders keep larger collections legible and colored tags make projects easy to scan. Reusable snippets sit in their own shelf with categories and counts, close enough to copy without digging through the full list.",
            ],
            images: [
              {
                label: "Expanded inbox with snippets and folders",
                ratio: "16/9",
                src: "/work/notch-capture/expanded-inbox.webp",
                alt: "Close view of the Notch Capture inbox showing now playing, snippet categories, colored project tags, and folders.",
                caption:
                  "Music, snippets, project tags, and folders share one compact hierarchy.",
              },
            ],
          },
          {
            heading: "Actions stay in the composer.",
            body: [
              "Typing / turns the same composer into a command palette. From there I can create a reusable snippet, add a top-level folder, or clear completed tasks without adding permanent controls to the interface. The commands explain themselves and keep their shortcuts visible, so the feature is discoverable without making the default view noisy.",
            ],
            images: [
              {
                label: "Slash-command actions in the composer",
                ratio: "4/3",
                src: "/work/notch-capture/capture-actions.webp",
                alt: "Notch Capture slash-command menu offering Create Snippet, Create Folder, and Clear Completed Tasks.",
                caption:
                  "Slash commands add power without crowding the everyday capture flow.",
              },
            ],
          },
          {
            heading: "Focus tools are one click away.",
            body: [
              "A small shelf in the header switches between the inbox, timer, light, mirror, and settings. The timer offers 15, 25, 45, and 60-minute presets, then stays visible in the notch while it runs. Music playback lives beside it, with album art, track information, transport controls, and a draggable progress bar.",
            ],
            images: [
              {
                label: "Focus timer presets",
                ratio: "4/3",
                src: "/work/notch-capture/focus-timer.webp",
                alt: "Notch Capture timer menu with 15, 25, 45, and 60-minute focus presets.",
                caption:
                  "The timer opens from the utility shelf and offers four common focus lengths.",
              },
            ],
          },
          {
            heading: "Useful even when the inbox is closed.",
            body: [
              "Collapsing the inbox does not hide what is active. The compact pill keeps the current track, playback controls, and progress visible without taking over the desktop. The app can shrink to this lightweight state between captures, then expand back into the full inbox from the same place.",
            ],
            images: [
              {
                label: "Compact music player in the notch",
                ratio: "16/9",
                src: "/work/notch-capture/compact-player.webp",
                alt: "Compact Notch Capture music player floating from the Mac notch over a blue desktop.",
                caption:
                  "The compact state leaves playback visible while returning the rest of the screen to work.",
              },
            ],
          },
          {
            heading: "A quick check before the call.",
            body: [
              "The mirror turns the notch into a live webcam preview without recording or saving anything. Compatible cameras expose zoom, recentering, drag-to-aim, and three framing slots, so a preferred crop can be saved and recalled per camera.",
              "The neighboring light panel controls a connected MOLUS G60 from the same shelf. Power, brightness, and color temperature stay together, which means the camera and the light can be checked without opening two more utilities before a call.",
            ],
            layout: "split",
            images: [
              {
                label: "Webcam mirror and framing controls",
                ratio: "4/3",
                src: "/work/notch-capture/mirror-controls.webp",
                alt: "Notch Capture mirror showing a webcam preview with zoom, recenter, framing preset, and save controls.",
                caption:
                  "Mirror controls pair zoom and framing presets with the live preview.",
              },
              {
                label: "Connected desk-light controls",
                ratio: "4/3",
                src: "/work/notch-capture/light-controls.webp",
                alt: "Notch Capture controls for a connected MOLUS G60 light with power, brightness, and color-temperature settings.",
                caption:
                  "The connected-light panel keeps brightness and color temperature beside the camera tools.",
              },
            ],
          },
          {
            heading: "Yours, on your machine.",
            body: [
              "Everything in the inbox is stored locally in SwiftData. There is no account, cloud sync, or analytics, and the mirror feed is drawn on screen and discarded. The app only reaches the network for album art, link previews at capture time, and its own updates. The library can be exported as a portable package and imported again with duplicate detection.",
            ],
          },
        ],
        tldr: [
          "A private surface that opens from the Mac notch with one shortcut and disappears with Escape.",
          "One composer searches the ledger, captures new items, and opens actions such as /snippet, /folder, and /clear.",
          "Reusable snippets, colored project tags, folders, notes, and tasks share one compact inbox.",
          "The utility shelf brings together music controls and a focus timer with 15, 25, 45, and 60-minute presets.",
          "A compact pill keeps active music and timer state visible after the full inbox closes.",
          "The webcam mirror offers zoom, drag-to-aim, and three saved framing presets without recording the feed.",
          "Connected-light controls put power, brightness, and color temperature beside the camera tools.",
          "Everything is local: SwiftData on the machine, no account, no analytics, and only limited requests for media, link previews, and updates.",
          "Designed and built solo over two sprints: 18 PRs, ~44k lines of Swift 6 and SwiftUI, plus a Next.js landing page.",
        ],
      },
    },
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
          role: "Product Design Engineer",
          year: "2023 - 2026",
          timeline: "Ongoing",
          platform: "Web platform",
          collaborators: [
            { role: "Developer" },
            { role: "Engineer" },
            { role: "Developer" },
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
            { role: "Developer" },
            { role: "Engineer" },
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
  ],
};
