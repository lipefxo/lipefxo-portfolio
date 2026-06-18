import type { WorkProject } from "@/config/site";
import { TransitionLink } from "@/components/TransitionLink";
import { ImagePlaceholder } from "./ImagePlaceholder";

/** "More work this way" — links to the next case study. */
export function CaseNextProject({ project }: { project: WorkProject }) {
  // Reuse the next project's hero image once it's set; otherwise a labeled placeholder.
  const thumb =
    project.caseStudy?.hero ?? { label: `${project.name} — preview`, ratio: "16/9" };

  return (
    <section className="space-y-5 border-t border-zinc-200 pt-10 dark:border-zinc-800">
      <p className="text-[11px] font-medium tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Next project
      </p>
      <TransitionLink href={`/work/${project.slug}`} className="group block space-y-4">
        <div className="transition-opacity duration-200 group-hover:opacity-90">
          <ImagePlaceholder
            image={{ ...thumb, ratio: "32/9" }}
            expandable={false}
          />
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {project.name}
            </h2>
            <p className="max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
              {project.blurb}
            </p>
          </div>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="mt-1 shrink-0 text-zinc-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-zinc-900 dark:group-hover:text-zinc-50"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </div>
      </TransitionLink>
    </section>
  );
}
