import type { CaseStudy, WorkProject } from "@/config/site";
import { Reveal } from "@/components/Reveal";
import { CaseNextProject } from "./CaseNextProject";
import { CaseOutcome } from "./CaseOutcome";
import { CaseStats } from "./CaseStats";

interface CaseTldrProps {
  cs: CaseStudy;
  next?: WorkProject;
}

export function CaseTldr({ cs, next }: CaseTldrProps) {
  const hasStats = Boolean(cs.stats?.length);
  const intro = cs.sections.find(
    (section) => !section.heading && section.body?.length,
  );
  const highlights = cs.tldr?.length
    ? cs.tldr
    : cs.sections
        .filter((section) => section.heading)
        .map((section) => section.heading as string);

  return (
    <div className="space-y-12">
      {hasStats && (
        <Reveal className="space-y-4">
          <CaseStats stats={cs.stats ?? []} />
        </Reveal>
      )}

      {(intro?.body?.[0] || highlights.length > 0) && (
        <Reveal>
          <section className="space-y-5">
            {intro?.body?.[0] && (
              <p className="text-[15px] leading-7 text-zinc-600 dark:text-zinc-400">
                {intro.body[0]}
              </p>
            )}

            {highlights.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-[11px] font-medium tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
                  Highlights
                </h2>
                <ul className="space-y-3">
                  {highlights.map((highlight) => (
                    <li
                      key={highlight}
                      className="flex gap-3 text-[15px] leading-7 text-zinc-700 dark:text-zinc-300"
                    >
                      <span
                        className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-600"
                        aria-hidden="true"
                      />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
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
    </div>
  );
}
