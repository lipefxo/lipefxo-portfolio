"use client";

import { useState } from "react";
import type { ProjectDetail } from "@/lib/projects";
import { ProjectCard } from "./ProjectCard";
import { ProjectModal } from "./ProjectModal";

interface Props {
  work: ProjectDetail[];
}

export function Projects({ work }: Props) {
  const [selected, setSelected] = useState<ProjectDetail | null>(null);
  const left = work.filter((_, index) => index % 2 === 0);
  const right = work.filter((_, index) => index % 2 === 1);
  const open = (p: ProjectDetail) => setSelected(p);
  const close = () => setSelected(null);

  return (
    <>
      {work.length > 0 && (
        <Section id="work">
          <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
            <div className="flex flex-1 flex-col gap-4 lg:gap-6">
              {left.map((p, index) => (
                <ProjectCard
                  key={p.title}
                  project={p}
                  onOpen={open}
                  revealDelay={index * 110}
                  href={p.slug ? `/work/${p.slug}` : undefined}
                />
              ))}
            </div>
            <div className="flex flex-1 flex-col gap-4 lg:mt-16 lg:gap-6">
              {right.map((p, index) => (
                <ProjectCard
                  key={p.title}
                  project={p}
                  onOpen={open}
                  revealDelay={80 + index * 110}
                  href={p.slug ? `/work/${p.slug}` : undefined}
                />
              ))}
            </div>
          </div>
        </Section>
      )}

      {selected && <ProjectModal project={selected} onClose={close} />}
    </>
  );
}

function Section({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      {children}
    </section>
  );
}
