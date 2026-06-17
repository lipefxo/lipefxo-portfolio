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

export interface WorkProject {
  name: string;
  /** Short one-liner shown on the card. */
  blurb: string;
  /** Longer description shown in the modal. */
  longDescription: string;
  /** Tech tags shown on the card and in the modal. */
  tech: string[];
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
  bio: "I'm a product designer and design engineer with ~10 years of experience building brands, design systems, and SaaS products — and increasingly shipping the front-end code myself. I partner with AI tools across the whole process to collapse the gap between design and production.",
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
    "v0",
    "VS Code",
    "Retool",
    "Webflow",
    "Framer",
    "GitHub",
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
        "Founding designer turned design engineer at a fintech SaaS — building the design system and shipping production code alongside design.",
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
        "Founding designer who led design for two SaaS products (B2B and B2C) from concept through MVP launch.",
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
        "Independent studio work across many industries — brand identities and end-to-end product design.",
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
      blurb: "Fintech operations platform for lending teams to manage customers, deals, and back-office workflows.",
      longDescription:
        "Bags helps lending and operations teams move from scattered spreadsheets and manual handoffs into a structured product workflow. I worked across product design, design systems, and front-end implementation to shape onboarding, customer profiles, deal tracking, internal review flows, and the operational tools teams need to move faster with more confidence.",
      tech: [
        "Product Design",
        "UI Design",
        "UX Design",
        "Python",
        "FastAPI",
        "React",
        "TypeScript",
        "Docker",
        "PostgreSQL",
      ],
    },
    {
      name: "CRE Co-Pilot",
      blurb:
        "AI underwriting assistant that helps commercial real estate analysts review deals without leaving Excel.",
      longDescription:
        "CRE Co-Pilot supports commercial real estate analysts during underwriting by reading their models, surfacing deal insights, and keeping the analyst in control of the decision-making process. The product is designed around the reality of CRE workflows: Excel remains the system of record, while the assistant reduces repetitive analysis, improves context gathering, and helps teams evaluate affordable-housing opportunities more efficiently.",
      tech: [
        "Product Design",
        "UI Design",
        "UX Design",
        "TypeScript",
        "Python",
        "Hamilton",
        "Docker",
        "PostgreSQL",
      ],
    },
    {
      name: "Panorama",
      // panorama.cash is public — to show a link, add `demoUrl` support here.
      blurb:
        "Brand and marketing site for advisors helping international businesses enter the US market.",
      longDescription:
        "Panorama presents a specialized advisory firm with a clear positioning: helping international businesses understand, plan, and execute US market entry. The site focuses on trust, clarity, and conversion, turning a complex consulting offer into a concise narrative with approachable service pages and a polished visual system.",
      tech: [
        "Product Design",
        "UI Design",
        "UX Design",
        "Next.js",
        "TypeScript",
        "Tailwind CSS",
        "shadcn/ui",
      ],
    },
    {
      name: "Cello",
      blurb: "Daily planning app that helps people turn a loose task list into a realistic schedule.",
      longDescription:
        "Cello is designed for planning one day at a time. Instead of treating tasks as an endless list, it helps people decide what actually fits into the day by placing work on a 24-hour timeline, adjusting duration, and tracking progress through focused task timers. The product goal is simple: make daily planning feel concrete, calm, and easy to revise.",
      tech: [
        "Product Design",
        "UI Design",
        "UX Design",
        "Swift 6",
        "SwiftUI",
        "SwiftData",
        "macOS",
      ],
    },
  ],
};
