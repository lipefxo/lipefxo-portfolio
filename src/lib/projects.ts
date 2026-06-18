import { site, type GlowPalette, type WorkProject } from "@/config/site";
import type { Repo } from "@/lib/github";

const scopeTechLabels = new Set(["Product Design", "UI Design", "UX Design"]);

export function removeScopeTechLabels(tech: string[] = []): string[] {
  return tech.filter((item) => !scopeTechLabels.has(item));
}

/** Unified shape consumed by the project card + modal. */
export interface ProjectDetail {
  title: string;
  /** One-liner for the card. */
  blurb: string;
  /** Longer description for the modal. */
  description: string;
  tech?: string[];
  year?: string;
  language?: string | null;
  stars?: number;
  githubUrl?: string;
  demoUrl?: string;
  /** Whether this is private/work (no source links). */
  isWork?: boolean;
  /** Case-study slug; when set, the card links to /work/<slug>. */
  slug?: string;
  /** Optional accent colors for the hover border glow. */
  glow?: GlowPalette;
  /** Optional decorative cover image for homepage card reveals. */
  coverImage?: { src: string };
  /** When true, the card is shown as a non-clickable "Coming soon" locked card. */
  locked?: boolean;
}

/** Map a public GitHub repo into the unified detail shape. */
export function repoToDetail(repo: Repo): ProjectDetail {
  const curated = site.featured[repo.name];
  const blurb =
    curated?.blurb ?? repo.description ?? "No description yet.";
  const description =
    curated?.longDescription ??
    repo.description ??
    "No description yet — add one on GitHub or in the site config.";

  return {
    title: repo.name,
    blurb,
    description,
    language: repo.language,
    stars: repo.stars,
    githubUrl: repo.htmlUrl,
    demoUrl: repo.homepage ?? undefined,
  };
}

/** Map a private/work project into the unified detail shape. */
export function workToDetail(work: WorkProject): ProjectDetail {
  return {
    title: work.name,
    blurb: work.blurb,
    description: work.longDescription,
    tech: work.tech,
    year: work.caseStudy?.meta.year,
    demoUrl: work.caseStudy?.meta.liveUrl,
    isWork: true,
    // Only expose a slug when there's a case study to link to AND it isn't locked.
    slug: work.caseStudy && !work.locked ? work.slug : undefined,
    glow: work.glow,
    coverImage: work.cover?.src ? { src: work.cover.src } : undefined,
    locked: work.locked,
  };
}

/** Look up a work project (with its case study) by slug. */
export function getWorkBySlug(slug: string): WorkProject | undefined {
  return site.work.find((w) => w.slug === slug);
}

/** Slugs of all navigable work projects (have a case study, not locked) — used for static params. */
export function workSlugs(): string[] {
  return site.work.filter((w) => w.caseStudy && !w.locked).map((w) => w.slug);
}
