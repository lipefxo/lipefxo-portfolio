import type { CSSProperties } from "react";
import { site } from "@/config/site";

export function Experience() {
  return (
    <section id="experience" className="scroll-mt-20">
      <ol className="flex flex-col gap-1.5">
        {site.experience.map((job, index) => (
          <li
            key={`${job.company}-${job.period}`}
            className="t-intro-item"
            style={{ "--intro-index": 4 + index } as CSSProperties}
          >
            <div className="grid w-full grid-cols-1 gap-x-1.5 gap-y-1 text-left text-sm leading-relaxed text-zinc-500 sm:grid-cols-[2.75rem_6.5rem_minmax(0,1fr)] dark:text-zinc-400 lg:whitespace-nowrap">
              <span>{formatExperienceYears(job.period)}</span>
              <span className="font-medium tracking-tight text-zinc-950 dark:text-zinc-50">
                {job.company}
              </span>
              <span>{job.role}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function formatExperienceYears(period: string) {
  const years = period.match(/\d{4}/g);
  if (!years?.length) return period;

  return years[0];
}
