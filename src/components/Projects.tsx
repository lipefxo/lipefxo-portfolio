"use client";

import { useState } from "react";
import { site } from "@/config/site";
import type { GitHubActivity } from "@/lib/github";
import type { ProjectDetail } from "@/lib/projects";
import { ProjectCard } from "./ProjectCard";
import { ProjectModal } from "./ProjectModal";

interface Props {
  work: ProjectDetail[];
  featured: ProjectDetail[];
  feed: ProjectDetail[];
  activity: GitHubActivity;
}

export function Projects({ work, featured, feed, activity }: Props) {
  const [selected, setSelected] = useState<ProjectDetail | null>(null);
  const open = (p: ProjectDetail) => setSelected(p);
  const close = () => setSelected(null);

  const hasOpenSource = featured.length > 0 || feed.length > 0;

  return (
    <>
      {work.length > 0 && (
        <Section id="work" title="Selected work">
          <Stack>
            {work.map((p) => (
              <ProjectCard key={p.title} project={p} onOpen={open} />
            ))}
          </Stack>
        </Section>
      )}

      <Section id="open-source" title="Open source">
        {hasOpenSource ? (
          <div className="space-y-6">
            <GitHubActivityPanel activity={activity} />
            {featured.length > 0 && (
              <Stack>
                {featured.map((p) => (
                  <ProjectCard key={p.title} project={p} onOpen={open} />
                ))}
              </Stack>
            )}
            {feed.length > 0 && (
              <Stack>
                {feed.map((p) => (
                  <ProjectCard key={p.title} project={p} onOpen={open} />
                ))}
              </Stack>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Couldn&apos;t load repositories right now.
          </p>
        )}
      </Section>

      {selected && <ProjectModal project={selected} onClose={close} />}
    </>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="mb-6 text-sm font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Stack({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-4">{children}</div>;
}

function GitHubActivityPanel({ activity }: { activity: GitHubActivity }) {
  if (activity.days.length === 0 && activity.commits.length === 0) return null;

  const max =
    activity.days.length > 0
      ? Math.max(...activity.days.map((day) => day.count), 1)
      : 1;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-medium text-zinc-950 dark:text-zinc-50">
          GitHub activity
        </h3>
        <a
          href={`https://github.com/${site.socials.github}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          View profile
        </a>
      </div>

      {activity.days.length > 0 && (
        <div
          className="mt-4 grid grid-flow-col grid-rows-7 gap-1 overflow-hidden"
          aria-label="Public GitHub push activity over the last 12 weeks"
        >
          {activity.days.map((day) => (
            <span
              key={day.date}
              title={`${day.date}: ${day.count} commit${day.count === 1 ? "" : "s"}`}
              aria-label={`${day.date}: ${day.count} commit${day.count === 1 ? "" : "s"}`}
              className={`h-3 w-3 rounded-[3px] ${getActivityColor(day.count, max)}`}
            />
          ))}
        </div>
      )}

      {activity.commits.length > 0 && (
        <ul className="mt-5 space-y-3">
          <li className="text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Latest commits
          </li>
          {activity.commits.map((commit) => (
            <li key={`${commit.repo}-${commit.sha}`}>
              <a
                href={commit.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
              >
                <span className="block truncate text-sm text-zinc-700 transition-colors group-hover:text-zinc-950 dark:text-zinc-300 dark:group-hover:text-zinc-50">
                  {commit.message}
                </span>
                <span className="mt-0.5 block text-xs text-zinc-400 dark:text-zinc-500">
                  {commit.repo} · {commit.sha}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function getActivityColor(count: number, max: number) {
  if (count === 0) return "bg-zinc-100 dark:bg-zinc-900";
  const intensity = count / max;
  if (intensity >= 0.75) return "bg-emerald-600 dark:bg-emerald-400";
  if (intensity >= 0.5) return "bg-emerald-500 dark:bg-emerald-500";
  if (intensity >= 0.25) return "bg-emerald-300 dark:bg-emerald-700";
  return "bg-emerald-200 dark:bg-emerald-900";
}
