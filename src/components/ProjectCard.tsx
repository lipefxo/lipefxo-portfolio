"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type {
  ProjectDetail,
  TimelineProjectCardData,
} from "@/lib/projects";
import { Reveal } from "./Reveal";
import { TransitionLink } from "./TransitionLink";

interface Props {
  project: TimelineProjectCardData;
  onOpen: (project: ProjectDetail) => void;
  /** Stagger delay (ms) for the scroll reveal. */
  revealDelay?: number;
}

const rowClassName =
  "flex w-full items-start gap-2.5 rounded-lg text-left outline-offset-2 transition-opacity duration-200 ease-out group-hover/card:opacity-80 group-focus-within/card:opacity-80";

const thumbClassName =
  "relative size-11 shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900";

const focusClassName =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100";

const lockedHintLabels = [
  "Almost there!",
  "Still pixel-pushing",
  "Tiny chaos inside",
  "Plot twist loading",
  "Not ready yet",
  "Polishing pixels",
  "Backstage tinkering",
];

function getLockedHintStartIndex(project: TimelineProjectCardData) {
  const seed = `${project.title}:${project.label}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % lockedHintLabels.length;
}

export function ProjectCard({ project, onOpen, revealDelay = 0 }: Props) {
  const [isShaking, setIsShaking] = useState(false);
  const [isLockedHintVisible, setIsLockedHintVisible] = useState(false);
  const [lockedHintIndex, setLockedHintIndex] = useState(() => {
    const startIndex = getLockedHintStartIndex(project);
    return (startIndex + lockedHintLabels.length - 1) % lockedHintLabels.length;
  });
  const shakeTimeoutRef = useRef<number | null>(null);
  const hintTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (shakeTimeoutRef.current !== null) {
        window.clearTimeout(shakeTimeoutRef.current);
      }
      if (hintTimeoutRef.current !== null) {
        window.clearTimeout(hintTimeoutRef.current);
      }
    };
  }, []);

  function shakeLockedCard() {
    if (shakeTimeoutRef.current !== null) {
      window.clearTimeout(shakeTimeoutRef.current);
    }
    if (hintTimeoutRef.current !== null) {
      window.clearTimeout(hintTimeoutRef.current);
    }

    setIsShaking(false);
    setLockedHintIndex((index) => (index + 1) % lockedHintLabels.length);
    setIsLockedHintVisible(true);
    window.requestAnimationFrame(() => {
      setIsShaking(true);
      shakeTimeoutRef.current = window.setTimeout(() => {
        setIsShaking(false);
        shakeTimeoutRef.current = null;
      }, 180);
    });
    hintTimeoutRef.current = window.setTimeout(() => {
      setIsLockedHintVisible(false);
      hintTimeoutRef.current = null;
    }, 1400);
  }

  const content = <CardBody project={project} />;

  if (project.locked) {
    return (
      <Reveal delay={revealDelay} className="group/card w-full">
        <div
          className="t-project-card-shake relative w-full"
          data-shaking={isShaking ? "true" : undefined}
        >
          <div className={rowClassName}>{content}</div>
          <button
            type="button"
            onClick={(event) => {
              shakeLockedCard();
              event.currentTarget.blur();
            }}
            aria-label={`${project.title} case study coming soon`}
            className={`absolute inset-0 z-10 rounded-lg ${focusClassName}`}
          />
          <CardLockIcon
            showHint={isLockedHintVisible}
            hintLabel={lockedHintLabels[lockedHintIndex]}
          />
        </div>
      </Reveal>
    );
  }

  return (
    <Reveal delay={revealDelay} className="group/card w-full">
      <ProjectCardAction project={project} onOpen={onOpen}>
        {content}
      </ProjectCardAction>
    </Reveal>
  );
}

function ProjectCardAction({
  project,
  onOpen,
  children,
}: {
  project: TimelineProjectCardData;
  onOpen: (project: ProjectDetail) => void;
  children: ReactNode;
}) {
  if (project.href) {
    return (
      <TransitionLink
        href={project.href}
        aria-label={
          project.type === "side"
            ? `Open ${project.title}`
            : `View ${project.title} case study`
        }
        className={`${rowClassName} ${focusClassName}`}
      >
        {children}
      </TransitionLink>
    );
  }

  if (project.modalProject) {
    return (
      <button
        type="button"
        onClick={() => onOpen(project.modalProject!)}
        aria-label={`View ${project.title}`}
        className={`${rowClassName} ${focusClassName}`}
      >
        {children}
      </button>
    );
  }

  return <div className={rowClassName}>{children}</div>;
}

function CardBody({ project }: { project: TimelineProjectCardData }) {
  return (
    <>
      <span
        className={`${thumbClassName} ${
          project.image
            ? ""
            : "border-dashed border-zinc-300 dark:border-zinc-700"
        }`}
      >
        <CardImage project={project} />
      </span>
      <span className="min-w-0 pt-px">
        <span className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-[13px] font-semibold leading-5 text-zinc-950 dark:text-zinc-50">
            {project.title}
          </span>
          {project.year ? (
            <span className="text-[11px] leading-4 text-zinc-400 tabular-nums dark:text-zinc-600">
              {project.year}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block line-clamp-2 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">
          {project.blurb}
        </span>
      </span>
    </>
  );
}

function CardImage({ project }: { project: TimelineProjectCardData }) {
  if (!project.image) return null;

  return (
    <Image
      src={project.image.src}
      alt=""
      fill
      sizes="44px"
      className={`transition-transform duration-300 ease-out group-hover/card:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover/card:scale-100 ${
        project.image.fit === "contain"
          ? "object-contain p-1"
          : "object-cover"
      }`}
    />
  );
}

function CardLockIcon({
  showHint,
  hintLabel,
}: {
  showHint: boolean;
  hintLabel: string;
}) {
  return (
    <span
      className="pointer-events-none absolute top-7 left-5 z-20 inline-flex h-4 items-center gap-1 text-white"
      aria-hidden="true"
    >
      <span className="inline-flex size-4 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm">
        <LockIcon />
      </span>
      <span
        className={`whitespace-nowrap rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] font-medium backdrop-blur-sm transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none ${
          showHint ? "translate-x-0 opacity-100" : "translate-x-1 opacity-0"
        }`}
      >
        {hintLabel}
      </span>
    </span>
  );
}

function LockIcon() {
  return (
    <svg
      width="8"
      height="8"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
