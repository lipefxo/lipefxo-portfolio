"use client";

import type { ProjectDetail } from "@/lib/projects";

interface Props {
  project: ProjectDetail;
  onOpen: (project: ProjectDetail) => void;
}

export function ProjectCard({ project, onOpen }: Props) {
  return (
    <button
      type="button"
      onClick={() => onOpen(project)}
      className="flex h-full w-full flex-col rounded-lg border border-zinc-200 bg-white p-5 text-left transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
    >
      <h3 className="font-medium text-zinc-950 dark:text-zinc-50">
        {project.title}
      </h3>

      <p className="mt-2 flex-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        {project.blurb}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-500">
        {project.language && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-500" />
            {project.language}
          </span>
        )}
        {typeof project.stars === "number" && project.stars > 0 && (
          <span>★ {project.stars}</span>
        )}
        {project.tech?.slice(0, 4).map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </button>
  );
}
