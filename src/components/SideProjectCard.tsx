"use client";

import Link from "next/link";
import type { SideProject } from "@/config/site";
import { Reveal } from "./Reveal";

interface Props {
  project: SideProject;
  /** Stagger delay (ms) for the scroll reveal. */
  revealDelay?: number;
}

export function SideProjectCard({ project, revealDelay = 0 }: Props) {
  return (
    <Reveal delay={revealDelay} className="t-tt-wrap">
      <Link
        href={project.href}
        aria-label={`Open ${project.name} ${project.kind.toLowerCase()}`}
        className="t-tt-trigger relative inline-flex size-14 overflow-hidden rounded-full ring-1 ring-zinc-950/10 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:scale-105 hover:shadow-[0_8px_20px_rgba(0,0,0,0.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:ring-white/15 dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.45)] dark:focus-visible:outline-zinc-100"
      >
        {/* SVGs stay vector; next/image is a poor fit for small circular marks. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={project.logo}
          alt=""
          width={56}
          height={56}
          className="size-full object-cover"
        />
      </Link>
      <span className="t-tt text-xs font-medium" role="tooltip">
        {project.name}
      </span>
    </Reveal>
  );
}
