import type { CaseStudy, WorkProject } from "@/config/site";
import { Reveal } from "@/components/Reveal";
import { CaseStats } from "./CaseStats";
import { CaseSection } from "./CaseSection";
import { CaseQuote } from "./CaseQuote";
import { CaseOutcome } from "./CaseOutcome";
import { CaseNextProject } from "./CaseNextProject";
import { CaseCTA } from "./CaseCTA";

interface CaseStoryProps {
  cs: CaseStudy;
  next?: WorkProject;
}

export function CaseStory({ cs, next }: CaseStoryProps) {
  return (
    <div className="space-y-16">
      {cs.stats && cs.stats.length > 0 && (
        <Reveal>
          <CaseStats stats={cs.stats} />
        </Reveal>
      )}

      {cs.sections.map((section, idx) => (
        <Reveal key={idx}>
          <CaseSection section={section} />
        </Reveal>
      ))}

      {cs.quote && (
        <Reveal>
          <CaseQuote quote={cs.quote} />
        </Reveal>
      )}
      {cs.outcome && (
        <Reveal>
          <CaseOutcome outcome={cs.outcome} />
        </Reveal>
      )}
      {next && (
        <Reveal>
          <CaseNextProject project={next} />
        </Reveal>
      )}
      <Reveal>
        <CaseCTA />
      </Reveal>
    </div>
  );
}
