"use client";

import type { WorkProject } from "@/config/site";
import { ProjectCard } from "@/components/ProjectCard";
import { workToDetail } from "@/lib/projects";

/** "More work this way" — links to the next case study. */
export function CaseNextProject({ project }: { project: WorkProject }) {
  const detail = workToDetail(project);

  return (
    <section className="space-y-5 border-t border-zinc-200 pt-10 dark:border-zinc-800">
      <p className="text-[11px] font-medium tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Next project
      </p>
      <ProjectCard
        project={detail}
        onOpen={noop}
        href={detail.slug ? `/work/${detail.slug}` : undefined}
      />
    </section>
  );
}

function noop() {}
