import { site } from "@/config/site";

export function Experience() {
  return (
    <section id="experience" className="scroll-mt-20">
      <h2 className="mb-6 text-sm font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
        Experience
      </h2>

      <ol className="space-y-10">
        {site.experience.map((job) => (
          <li key={`${job.company}-${job.period}`}>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
              <h3 className="font-medium text-zinc-950 dark:text-zinc-50">
                {job.role}
                <span className="text-zinc-400 dark:text-zinc-500"> · {job.company}</span>
              </h3>
              <span className="shrink-0 text-sm text-zinc-400 dark:text-zinc-500">
                {job.period}
              </span>
            </div>

            <p className="mt-2 max-w-2xl leading-7 text-zinc-600 dark:text-zinc-400">
              {job.summary}
            </p>

            <ul className="mt-3 space-y-1.5">
              {job.highlights.map((h) => (
                <li
                  key={h}
                  className="relative max-w-2xl pl-5 text-sm leading-6 text-zinc-500 before:absolute before:left-0 before:text-zinc-300 before:content-['–'] dark:text-zinc-400 dark:before:text-zinc-600"
                >
                  {h}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
