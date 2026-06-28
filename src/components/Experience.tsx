import type { CSSProperties } from "react";
import { site } from "@/config/site";

export function Experience() {
  return (
    <section id="experience" className="scroll-mt-20">
      <ol className="flex flex-col gap-2">
        {site.experience.map((job, index) => (
          <li
            key={`${job.company}-${job.period}`}
            className="t-intro-item"
            style={{ "--intro-index": 4 + index } as CSSProperties}
          >
            <div className="flex w-full flex-wrap items-baseline gap-x-4 gap-y-1 text-left text-sm leading-relaxed text-zinc-500 dark:text-zinc-400 lg:whitespace-nowrap">
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

  const firstYear = years[0];
  const lastYear = years.at(-1);
  if (period.toLowerCase().includes("present")) return `${firstYear} - Present`;
  if (lastYear && lastYear !== firstYear) return `${firstYear} - ${lastYear}`;

  return firstYear;
}
