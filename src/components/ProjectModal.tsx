"use client";

import { useEffect, useRef, useState } from "react";
import type { ProjectDetail } from "@/lib/projects";
import { TechTag } from "./TechTag";

interface Props {
  project: ProjectDetail;
  onClose: () => void;
}

export function ProjectModal({ project, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    const frame = requestAnimationFrame(() => setOpen(true));
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    // Lock background scroll while the modal is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="t-panel-slide relative z-10 w-full max-w-lg rounded-lg border border-zinc-200 bg-white p-6 shadow-xl sm:p-8 dark:border-zinc-800 dark:bg-zinc-950"
        data-open={open}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <h3
          id="project-modal-title"
          className="pr-8 text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
        >
          {project.title}
        </h3>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          {project.language && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
              {project.language}
            </span>
          )}
          {typeof project.stars === "number" && project.stars > 0 && (
            <span>★ {project.stars}</span>
          )}
        </div>

        <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          {project.description}
        </p>

        {project.tech && project.tech.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2">
            {project.tech.map((t) => (
              <li key={t}>
                <TechTag label={t} />
              </li>
            ))}
          </ul>
        )}

        {(project.githubUrl || project.demoUrl) && (
          <div className="mt-6 flex flex-wrap gap-3">
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-950 px-4 text-xs font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-300"
              >
                View on GitHub
              </a>
            )}
            {project.demoUrl && (
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 px-4 text-xs font-medium text-zinc-800 transition-colors hover:border-zinc-400 hover:text-zinc-950 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:text-zinc-50"
              >
                Live demo
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
