"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { removeScopeTechLabels, type ProjectDetail } from "@/lib/projects";
import { TransitionLink } from "./TransitionLink";
import { BorderGlow } from "./BorderGlow";
import { ProjectTextLink } from "./ProjectTextLink";
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
  "flex w-full flex-col rounded-lg border border-zinc-200 bg-white p-5 text-left shadow-sm shadow-zinc-950/[0.015] transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out group-hover/card:border-transparent group-hover/card:bg-zinc-50/70 group-hover/card:shadow-md group-hover/card:shadow-zinc-950/[0.035] group-focus-within/card:-translate-y-px group-focus-within/card:border-zinc-300 group-focus-within/card:bg-zinc-50/70 group-focus-within/card:shadow-md group-focus-within/card:shadow-zinc-950/[0.035] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/10 dark:group-hover/card:border-transparent dark:group-hover/card:bg-zinc-900/40 dark:group-hover/card:shadow-black/20 dark:group-focus-within/card:border-zinc-700 dark:group-focus-within/card:bg-zinc-900/40 dark:group-focus-within/card:shadow-black/20";

const revealInitialStyle = {
  "--card-reveal-x": "50%",
  "--card-reveal-y": "50%",
} as CSSProperties;

const lockedHintLabels = [
  "Almost there!",
  "Still pixel-pushing",
  "Tiny chaos inside",
  "Plot twist loading",
  "Not ready yet",
  "Polishing pixels",
  "Backstage tinkering",
];

function getLockedHintStartIndex(project: ProjectDetail) {
  const seed = `${project.title}:${project.year ?? ""}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % lockedHintLabels.length;
}

export function ProjectCard({ project, onOpen, revealDelay = 0, href }: Props) {
  const [isShaking, setIsShaking] = useState(false);
  const [isLockedHintVisible, setIsLockedHintVisible] = useState(false);
  const [lockedHintIndex, setLockedHintIndex] = useState(() => {
    const startIndex = getLockedHintStartIndex(project);
    return (startIndex + lockedHintLabels.length - 1) % lockedHintLabels.length;
  });
  const shakeTimeoutRef = useRef<number | null>(null);
  const hintTimeoutRef = useRef<number | null>(null);
  const revealFrameRef = useRef<number | null>(null);
  const revealRectRef = useRef<DOMRect | null>(null);
  const revealTargetRef = useRef<HTMLElement | null>(null);
  const revealPointerRef = useRef({ x: 0, y: 0 });
  const stack = removeScopeTechLabels(project.tech);
  const visibleTech = stack.slice(0, 4);
  const hiddenTechCount = Math.max(stack.length - visibleTech.length, 0);
  const hasCoverReveal = Boolean(project.coverImage?.src);
  const revealHostClassName = hasCoverReveal
    ? " t-project-card-reveal-host"
    : "";

  useEffect(() => {
    return () => {
      if (shakeTimeoutRef.current !== null) {
        window.clearTimeout(shakeTimeoutRef.current);
      }
      if (hintTimeoutRef.current !== null) {
        window.clearTimeout(hintTimeoutRef.current);
      }
      if (revealFrameRef.current !== null) {
        window.cancelAnimationFrame(revealFrameRef.current);
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

  function handleRevealPointerMove(e: ReactPointerEvent<HTMLElement>) {
    if (!hasCoverReveal) return;

    const card = e.currentTarget;
    revealTargetRef.current = card;
    revealPointerRef.current = { x: e.clientX, y: e.clientY };

    if (revealFrameRef.current !== null) return;
    revealFrameRef.current = window.requestAnimationFrame(() => {
      const target = revealTargetRef.current;
      const rect = revealRectRef.current;
      const pointer = revealPointerRef.current;
      if (target && rect) {
        target.style.setProperty("--card-reveal-x", `${pointer.x - rect.left}px`);
        target.style.setProperty("--card-reveal-y", `${pointer.y - rect.top}px`);
      }
      revealFrameRef.current = null;
    });
  }

  function handleRevealPointerEnter(e: ReactPointerEvent<HTMLElement>) {
    if (!hasCoverReveal) return;
    revealRectRef.current = e.currentTarget.getBoundingClientRect();
    e.currentTarget.dataset.revealActive = "true";
    handleRevealPointerMove(e);
  }

  function handleRevealPointerLeave(e: ReactPointerEvent<HTMLElement>) {
    if (!hasCoverReveal) return;
    delete e.currentTarget.dataset.revealActive;
    revealRectRef.current = null;
    revealTargetRef.current = null;
    if (revealFrameRef.current !== null) {
      window.cancelAnimationFrame(revealFrameRef.current);
      revealFrameRef.current = null;
    }
  }

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

      <p className="mt-2 max-w-[48ch] text-[13px] leading-5 text-zinc-600 dark:text-zinc-400">
        {project.blurb}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-1.5 pr-10 text-[11px] text-zinc-500 dark:text-zinc-500">
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
      <Reveal delay={revealDelay} className="group/card w-full">
        <div
          className={`t-project-card-shake relative w-full overflow-hidden rounded-lg${revealHostClassName}`}
          data-shaking={isShaking ? "true" : undefined}
          onPointerEnter={hasCoverReveal ? handleRevealPointerEnter : undefined}
          onPointerMove={hasCoverReveal ? handleRevealPointerMove : undefined}
          onPointerLeave={hasCoverReveal ? handleRevealPointerLeave : undefined}
          style={hasCoverReveal ? revealInitialStyle : undefined}
        >
          <div className={`${cardClassName} relative pb-12 select-none`}>
            <CardCoverReveal coverImage={project.coverImage} />
            <div className="relative z-10 flex flex-col">{content}</div>
          </div>
          <button
            type="button"
            onClick={(event) => {
              shakeLockedCard();
              event.currentTarget.blur();
            }}
            aria-label={`${project.title} case study coming soon`}
            className="absolute inset-0 z-10 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100"
          />
          {project.demoUrl && (
            <WebsiteLink
              href={project.demoUrl}
              label={`Visit ${project.title} website`}
              className="absolute bottom-5 left-5 z-20"
            />
          )}
          <CardStatusIcon
            locked
            showHint={isLockedHintVisible}
            hintLabel={lockedHintLabels[lockedHintIndex]}
          />
        </div>
      </Reveal>
    );
  }

  return (
    <Reveal delay={revealDelay} className="group/card w-full">
      <BorderGlow
        className="w-full rounded-lg"
        edgeSensitivity={24}
        glowRadius={28}
        glowIntensity={0.18}
        colors={project.glow?.colors}
        glowColor={project.glow?.glowColor}
      >
        {href && project.demoUrl ? (
          <div
            className={`${cardClassName} relative${revealHostClassName}`}
            onPointerEnter={hasCoverReveal ? handleRevealPointerEnter : undefined}
            onPointerMove={hasCoverReveal ? handleRevealPointerMove : undefined}
            onPointerLeave={hasCoverReveal ? handleRevealPointerLeave : undefined}
            style={hasCoverReveal ? revealInitialStyle : undefined}
          >
            <CardCoverReveal coverImage={project.coverImage} />
            <TransitionLink
              href={href}
              aria-label={`View ${project.title} case study`}
              className="absolute inset-0 z-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100"
            />
            <div className="pointer-events-none relative z-10 flex flex-col">
              {content}
              <WebsiteLink
                href={project.demoUrl}
                label={`Visit ${project.title} website`}
                className="pointer-events-auto mt-4 self-start"
              />
            </div>
            <CardStatusIcon />
          </div>
        ) : href ? (
          <TransitionLink
            href={href}
            className={`${cardClassName} relative${revealHostClassName}`}
            onPointerEnter={hasCoverReveal ? handleRevealPointerEnter : undefined}
            onPointerMove={hasCoverReveal ? handleRevealPointerMove : undefined}
            onPointerLeave={hasCoverReveal ? handleRevealPointerLeave : undefined}
            style={hasCoverReveal ? revealInitialStyle : undefined}
          >
            <CardCoverReveal coverImage={project.coverImage} />
            <div className="relative z-10 flex flex-col">{content}</div>
            <CardStatusIcon />
          </TransitionLink>
        ) : (
          <button
            type="button"
            onClick={() => onOpen(project)}
            className={`${cardClassName} relative${revealHostClassName}`}
            onPointerEnter={hasCoverReveal ? handleRevealPointerEnter : undefined}
            onPointerMove={hasCoverReveal ? handleRevealPointerMove : undefined}
            onPointerLeave={hasCoverReveal ? handleRevealPointerLeave : undefined}
            style={hasCoverReveal ? revealInitialStyle : undefined}
          >
            <CardCoverReveal coverImage={project.coverImage} />
            <div className="relative z-10 flex flex-col">{content}</div>
            <CardStatusIcon />
          </button>
        )}
      </BorderGlow>
    </Reveal>
  );
}

function CardCoverReveal({
  coverImage,
}: {
  coverImage?: ProjectDetail["coverImage"];
}) {
  if (!coverImage?.src) return null;

  return (
    <span
      aria-hidden="true"
      className="t-project-card-cover-reveal pointer-events-none absolute inset-0 z-0 rounded-[inherit]"
      style={{
        backgroundImage: `url(${JSON.stringify(coverImage.src)})`,
      }}
    />
  );
}

function WebsiteLink({
  href,
  label,
  className = "",
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex ${className}`}>
      <ProjectTextLink
        href={href}
        ariaLabel={label}
        onClick={(event) => event.stopPropagation()}
        className="gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        {formatUrl(href)}
      </ProjectTextLink>
    </span>
  );
}

function CardStatusIcon({
  locked = false,
  showHint = false,
  hintLabel = "Coming Soon",
}: {
  locked?: boolean;
  showHint?: boolean;
  hintLabel?: string;
}) {
  if (locked) {
    return (
      <span
        className="pointer-events-none absolute right-5 bottom-5 z-20 inline-flex h-6 items-center justify-end gap-2 text-zinc-400 transition-colors duration-200 ease-out group-hover/card:text-zinc-700 group-focus-within/card:text-zinc-700 dark:text-zinc-500 dark:group-hover/card:text-zinc-200 dark:group-focus-within/card:text-zinc-200"
        aria-hidden="true"
      >
        <span
          className={`whitespace-nowrap text-[11px] font-medium text-zinc-500 transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none dark:text-zinc-400 ${
            showHint
              ? "translate-x-0 opacity-100"
              : "translate-x-1 opacity-0"
          }`}
        >
          {hintLabel}
        </span>
        <LockIcon />
      </span>
    );
  }

  return (
    <span
      className="pointer-events-none absolute right-5 bottom-5 z-20 inline-flex h-6 w-6 items-center justify-center text-zinc-400 transition-colors duration-200 ease-out group-hover/card:text-zinc-700 group-focus-within/card:text-zinc-700 dark:text-zinc-500 dark:group-hover/card:text-zinc-200 dark:group-focus-within/card:text-zinc-200"
      aria-hidden="true"
    >
      <ArrowUpRightIcon />
    </span>
  );
}

function ArrowUpRightIcon() {
  return (
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
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="15"
      height="15"
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
  );
}

function formatUrl(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
