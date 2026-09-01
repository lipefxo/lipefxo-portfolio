import {
  site,
  type ExperienceGroup,
  type ExperienceRole,
  type ExperienceProjectReference,
  type GlowPalette,
  type WorkProject,
} from "@/config/site";
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

/** Minimal, serializable shape used by the interactive homepage project grid. */
export interface TimelineProjectCardData {
  id: string;
  type: "work" | "side";
  title: string;
  blurb: string;
  label: string;
  /** Year or range shown under the project title. */
  year?: string;
  href?: string;
  externalUrl?: string;
  locked?: boolean;
  glow?: GlowPalette;
  image?: {
    src: string;
    alt: string;
    fit: "cover" | "contain";
  };
  /** Only included when a work item needs the modal fallback. */
  modalProject?: ProjectDetail;
}

export interface ResolvedExperienceRole {
  role: ExperienceRole;
  projects: TimelineProjectCardData[];
}

export interface ResolvedExperienceGroup {
  experience: ExperienceGroup;
  roles: ResolvedExperienceRole[];
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

/** Resolve the ordered project references used by the homepage timeline. */
export function resolveExperienceGroups(): ResolvedExperienceGroup[] {
  const seenReferences = new Set<string>();

  return site.experience.map((experience) => ({
    experience,
    roles: experience.roles.map((role) => ({
      role,
      projects: (role.projects ?? []).map((reference) => {
        const key = referenceKey(reference);
        if (seenReferences.has(key)) {
          throw new Error(`Duplicate experience project reference: ${key}`);
        }
        seenReferences.add(key);
        return referenceToTimelineProject(reference);
      }),
    })),
  }));
}

function referenceToTimelineProject(
  reference: ExperienceProjectReference,
): TimelineProjectCardData {
  if (reference.type === "work") {
    const work = site.work.find((project) => project.slug === reference.slug);
    if (!work) {
      throw new Error(`Unknown work project reference: ${reference.slug}`);
    }

    return workToTimelineProject(work);
  }

  const project = site.sideProjects.find((item) => item.href === reference.href);
  if (!project) {
    throw new Error(`Unknown side project reference: ${reference.href}`);
  }

  return {
    id: `side:${project.href}`,
    type: "side",
    title: project.name,
    blurb: project.blurb,
    label: project.kind,
    year: formatTimelineYear(project.year),
    href: project.href,
    image: {
      src: project.logo,
      alt: project.name,
      fit: project.logo.endsWith(".svg") ? "contain" : "cover",
    },
  };
}

export function workToTimelineProject(
  work: WorkProject,
): TimelineProjectCardData {
  const detail = workToDetail(work);
  const href = detail.slug ? `/work/${detail.slug}` : undefined;

  return {
    id: `work:${work.slug}`,
    type: "work",
    title: detail.title,
    blurb: detail.blurb,
    label: detail.year ?? "Case study",
    year: formatTimelineYear(work.year ?? detail.year),
    href,
    externalUrl: detail.demoUrl,
    locked: detail.locked,
    glow: detail.glow,
    image: work.cover?.src
      ? {
          src: work.cover.src,
          alt: work.cover.alt ?? work.cover.label,
          fit: "cover",
        }
      : undefined,
    modalProject: !href && !detail.locked ? detail : undefined,
  };
}

function formatTimelineYear(year?: string) {
  if (!year) return undefined;
  return year.replace(/\s*-\s*/g, " — ");
}

function referenceKey(reference: ExperienceProjectReference) {
  return reference.type === "work"
    ? `work:${reference.slug}`
    : `side:${reference.href}`;
}

/** Look up a work project (with its case study) by slug. */
export function getWorkBySlug(slug: string): WorkProject | undefined {
  return site.work.find((w) => w.slug === slug);
}

/** Slugs of all navigable work projects (have a case study, not locked) — used for static params. */
export function workSlugs(): string[] {
  return site.work.filter((w) => w.caseStudy && !w.locked).map((w) => w.slug);
}
