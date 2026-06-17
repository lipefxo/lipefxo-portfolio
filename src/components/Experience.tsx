import type { CSSProperties } from "react";
import { site } from "@/config/site";

export function Experience() {
  return (
    <section id="experience" className="scroll-mt-20">
      <h2
        className="t-intro-item mb-4 text-base font-medium tracking-tight text-zinc-950 dark:text-zinc-50"
        style={{ "--intro-index": 8 } as CSSProperties}
      >
        Experiences
      </h2>

      <ol className="divide-y divide-zinc-200 border-t border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {site.experience.map((job, index) => (
          <li
            key={`${job.company}-${job.period}`}
            className="t-intro-item"
            style={{ "--intro-index": 9 + index } as CSSProperties}
          >
            <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
              <h3 className="text-sm font-medium tracking-tight text-zinc-950 dark:text-zinc-50">
                {job.company}
              </h3>

              <span className="text-[13px] text-zinc-500 sm:text-right sm:text-sm dark:text-zinc-400">
                {job.role} / {job.period}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
