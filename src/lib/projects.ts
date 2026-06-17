import { site, type WorkProject } from "@/config/site";
import type { Repo } from "@/lib/github";

/** Unified shape consumed by the project card + modal. */
export interface ProjectDetail {
  title: string;
  /** One-liner for the card. */
  blurb: string;
  /** Longer description for the modal. */
  description: string;
  tech?: string[];
  language?: string | null;
  stars?: number;
  githubUrl?: string;
  demoUrl?: string;
  /** Whether this is private/work (no source links). */
  isWork?: boolean;
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

/** Map a private/work project into the unified detail shape (no links). */
export function workToDetail(work: WorkProject): ProjectDetail {
  return {
    title: work.name,
    blurb: work.blurb,
    description: work.longDescription,
    tech: work.tech,
    isWork: true,
  };
}
