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
  const open = (p: ProjectDetail) => setSelected(p);
  const close = () => setSelected(null);

  return (
    <>
      {work.length > 0 && (
        <Section id="work">
          <Stack>
            {work.map((p, index) => (
              <ProjectCard
                key={p.title}
                project={p}
                onOpen={open}
                revealDelay={index * 110}
                href={p.slug ? `/work/${p.slug}` : undefined}
              />
            ))}
          </Stack>
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

function Stack({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-4">{children}</div>;
}
