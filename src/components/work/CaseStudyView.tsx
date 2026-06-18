"use client";

import { useState } from "react";
import type { CaseStudy, WorkProject } from "@/config/site";
import { removeScopeTechLabels } from "@/lib/projects";
import { Reveal } from "@/components/Reveal";
import { TechTag } from "@/components/TechTag";
import { CaseHero } from "./CaseHero";
import { CaseMeta } from "./CaseMeta";
import { CaseStudyHeader } from "./CaseStudyHeader";
import { CaseStory } from "./CaseStory";
import { CaseTldr } from "./CaseTldr";
import {
  CaseViewToggle,
  type CaseViewMode,
} from "./CaseViewToggle";

interface CaseStudyViewProps {
  cs: CaseStudy;
  tech: string[];
  next?: WorkProject;
}

export function CaseStudyView({ cs, tech, next }: CaseStudyViewProps) {
  const [mode, setMode] = useState<CaseViewMode>("story");

  return (
    <>
      <CaseStudyHeader />

      <div className="mt-10 sm:mt-14">
        <CaseHero caseStudy={cs} />

        <Reveal className="mt-8">
          <div className="space-y-4">
            <section className="space-y-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
              <CaseTechStack items={tech} />

              <CaseMeta meta={cs.meta} />
            </section>

            <div className="flex justify-end">
              <CaseViewToggle mode={mode} onChange={setMode} />
            </div>
          </div>
        </Reveal>

        <div
          key={mode}
          className="mt-4 transition-opacity duration-200 motion-reduce:transition-none"
        >
          {mode === "story" ? (
            <CaseStory cs={cs} next={next} />
          ) : (
            <CaseTldr cs={cs} next={next} />
          )}
        </div>
      </div>
    </>
  );
}

function CaseTechStack({ items }: { items: string[] }) {
  const stack = [...new Set(removeScopeTechLabels(items))];

  if (stack.length === 0) return null;

  return (
    <div>
      <h2 className="sr-only">Stack</h2>
      <div className="flex flex-wrap gap-2">
        {stack.map((item) => (
          <TechTag key={item} label={item} />
        ))}
      </div>
    </div>
  );
}
