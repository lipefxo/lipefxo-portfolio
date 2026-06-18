"use client";

import type { ReactNode } from "react";
import { removeScopeTechLabels, type ProjectDetail } from "@/lib/projects";
import { TransitionLink } from "./TransitionLink";
import { BorderGlow } from "./BorderGlow";
import { Reveal } from "./Reveal";
import { TechTag } from "./TechTag";

interface Props {
  project: ProjectDetail;
  onOpen: (project: ProjectDetail) => void;
  /** Stagger delay (ms) for the scroll reveal. */
  revealDelay?: number;
  /** When set, the card links to this URL instead of opening the modal. */
  href?: string;
}

const cardClassName =
  "flex h-full w-full flex-col rounded-lg border border-zinc-200 bg-white p-5 text-left shadow-sm shadow-zinc-950/[0.015] transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out group-hover/card:border-transparent group-hover/card:bg-zinc-50/70 group-hover/card:shadow-md group-hover/card:shadow-zinc-950/[0.035] group-focus-within/card:-translate-y-px group-focus-within/card:border-zinc-300 group-focus-within/card:bg-zinc-50/70 group-focus-within/card:shadow-md group-focus-within/card:shadow-zinc-950/[0.035] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/10 dark:group-hover/card:border-transparent dark:group-hover/card:bg-zinc-900/40 dark:group-hover/card:shadow-black/20 dark:group-focus-within/card:border-zinc-700 dark:group-focus-within/card:bg-zinc-900/40 dark:group-focus-within/card:shadow-black/20";

export function ProjectCard({ project, onOpen, revealDelay = 0, href }: Props) {
  const stack = removeScopeTechLabels(project.tech);
  const visibleTech = stack.slice(0, 4);
  const hiddenTechCount = Math.max(stack.length - visibleTech.length, 0);

  const content: ReactNode = (
    <>
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
          {project.title}
        </h3>
        {project.year && (
          <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-500">
            {project.year}
          </span>
        )}
      </div>

      <p className="mt-2 max-w-[58ch] flex-1 text-[13px] leading-5 text-zinc-600 dark:text-zinc-400">
        {project.blurb}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-500">
        {project.language && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-500" />
            {project.language}
          </span>
        )}
        {typeof project.stars === "number" && project.stars > 0 && (
          <span>★ {project.stars}</span>
        )}
        {visibleTech.map((t) => (
          <TechTag key={t} label={t} variant="compact" />
        ))}
        {hiddenTechCount > 0 && (
          <span className="inline-flex h-6 shrink-0 items-center rounded-md border border-zinc-200 bg-white/55 px-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
            +{hiddenTechCount}
          </span>
        )}
      </div>
    </>
  );

  if (project.locked) {
    return (
      <Reveal delay={revealDelay} className="group/card h-full w-full">
        <div className="relative h-full w-full overflow-hidden rounded-lg">
          <div
            className={`${cardClassName} pointer-events-none select-none transition-[filter] duration-200 ease-out group-hover/card:blur-[2px]`}
            aria-hidden="true"
          >
            {content}
          </div>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2.5 rounded-lg bg-white/55 text-center opacity-0 backdrop-blur-[1px] transition-opacity duration-200 ease-out group-hover/card:opacity-100 dark:bg-zinc-950/55">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white/80 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <span
              className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
              aria-hidden="true"
            >
              Coming soon
            </span>
            <span className="sr-only">{project.title} — case study coming soon</span>
          </div>
        </div>
      </Reveal>
    );
  }

  return (
    <Reveal delay={revealDelay} className="group/card h-full w-full">
      <BorderGlow
        className="h-full w-full rounded-lg"
        edgeSensitivity={24}
        glowRadius={28}
        glowIntensity={0.18}
        colors={project.glow?.colors}
        glowColor={project.glow?.glowColor}
      >
        {href ? (
          <TransitionLink href={href} className={cardClassName}>
            {content}
          </TransitionLink>
        ) : (
          <button
            type="button"
            onClick={() => onOpen(project)}
            className={cardClassName}
          >
            {content}
          </button>
        )}
      </BorderGlow>
    </Reveal>
  );
}
