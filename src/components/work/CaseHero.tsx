import type { CSSProperties } from "react";
import type { CaseStudy } from "@/config/site";
import { ImagePlaceholder } from "./ImagePlaceholder";
import { CaseGitStats } from "./CaseGitStats";
import { CaseCoverMeta } from "./CaseMeta";

/** Hero: full-width hero image, headline, and one-line summary. */
export function CaseHero({
  caseStudy,
}: {
  caseStudy: CaseStudy;
}) {
  return (
    <header className="space-y-8">
      <div className="space-y-4">
        <div
          className="t-intro-item"
          style={{ "--intro-index": 0 } as CSSProperties}
        >
          <CaseCoverMeta meta={caseStudy.meta} />
        </div>
        <div
          className="t-intro-item"
          style={{ "--intro-index": 1 } as CSSProperties}
        >
          <ImagePlaceholder image={caseStudy.hero} />
        </div>
      </div>
      <div className="space-y-4">
        <h1
          className="t-intro-item text-xl font-semibold tracking-tight text-balance text-zinc-950 sm:text-3xl dark:text-zinc-50"
          style={{ "--intro-index": 2 } as CSSProperties}
        >
          {caseStudy.headline}
        </h1>
        <div className="space-y-5">
          <p
            className="t-intro-item max-w-xl text-sm leading-6 text-zinc-600 sm:text-base sm:leading-7 dark:text-zinc-400"
            style={{ "--intro-index": 3 } as CSSProperties}
          >
            {caseStudy.summary}
          </p>
          {caseStudy.git && (
            <div
              className="t-intro-item"
              style={{ "--intro-index": 4 } as CSSProperties}
            >
              <CaseGitStats git={caseStudy.git} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
