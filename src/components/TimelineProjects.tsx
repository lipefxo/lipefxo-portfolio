"use client";

import { useState } from "react";
import type {
  ProjectDetail,
  TimelineProjectCardData,
} from "@/lib/projects";
import { ProjectCard } from "./ProjectCard";
import { ProjectModal } from "./ProjectModal";

export function TimelineProjects({
  projects,
}: {
  projects: TimelineProjectCardData[];
}) {
  const [selected, setSelected] = useState<ProjectDetail | null>(null);

  if (projects.length === 0) return null;

  return (
    <>
      <ul className="flex flex-col gap-4">
        {projects.map((project, index) => (
          <li key={project.id} className="min-w-0">
            <ProjectCard
              project={project}
              onOpen={setSelected}
              revealDelay={index * 70}
            />
          </li>
        ))}
      </ul>

      {selected ? (
        <ProjectModal project={selected} onClose={() => setSelected(null)} />
      ) : null}
    </>
  );
}
