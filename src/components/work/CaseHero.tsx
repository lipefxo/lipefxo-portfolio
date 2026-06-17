import type { CSSProperties } from "react";
import type { CaseStudy } from "@/config/site";
import { ImagePlaceholder } from "./ImagePlaceholder";
import { CaseGitStats } from "./CaseGitStats";

/** Hero: full-width hero image, headline, and one-line summary. */
export function CaseHero({
  caseStudy,
}: {
  caseStudy: CaseStudy;
}) {
  return (
    <header className="space-y-8">
      <div
        className="t-intro-item"
        style={{ "--intro-index": 0 } as CSSProperties}
      >
        <ImagePlaceholder image={caseStudy.hero} />
      </div>
      <div className="space-y-3">
        <h1
          className="t-intro-item text-xl font-semibold tracking-tight text-balance text-zinc-950 sm:text-3xl dark:text-zinc-50"
          style={{ "--intro-index": 1 } as CSSProperties}
        >
          {caseStudy.headline}
        </h1>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-1.5">
          <p
            className="t-intro-item max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base sm:leading-7 dark:text-zinc-400"
            style={{ "--intro-index": 2 } as CSSProperties}
          >
            {caseStudy.summary}
          </p>
          {caseStudy.git && (
            <div
              className="t-intro-item basis-full"
              style={{ "--intro-index": 2 } as CSSProperties}
            >
              <CaseGitStats git={caseStudy.git} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
