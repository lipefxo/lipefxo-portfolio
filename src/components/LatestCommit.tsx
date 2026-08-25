"use client";

import { useEffect, useState } from "react";
import type { LatestCommit as LatestCommitData } from "@/lib/latest-commit";

const POLL_MS = 10_000;

interface Props {
  initial: LatestCommitData | null;
  fallback: string;
}

export function LatestCommit({ initial, fallback }: Props) {
  const [commit, setCommit] = useState(initial);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const res = await fetch("/api/latest-commit", { cache: "no-store" });
        if (!res.ok) return;
        const next: LatestCommitData | null = await res.json();
        if (!cancelled) setCommit(next);
      } catch {
        // Keep whatever we last rendered.
      }
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    refresh();
    const poll = window.setInterval(refresh, POLL_MS);
    const tick = window.setInterval(() => setNow(Date.now()), POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  if (!commit) return <>{fallback}</>;

  const relative = formatRelativeTime(commit.date, now);
  const added = formatCount(commit.additions);
  const removed = formatCount(commit.deletions);

  return (
    <a
      href={commit.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Latest commit ${relative}, ${commit.additions} lines added, ${commit.deletions} lines removed`}
      title={commit.message}
      className="inline-flex items-center gap-2 text-xs text-zinc-500 no-underline transition-colors hover:text-zinc-700 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-300 dark:focus-visible:outline-zinc-100"
    >
      <TerminalIcon />
      <span>
        latest commit <span suppressHydrationWarning>{relative}</span>:{" "}
        <span className="text-[#5f8a62] dark:text-[#7d9e80]">+{added}</span>{" "}
        <span className="text-[#b56a62] dark:text-[#c4877e]">-{removed}</span>
      </span>
    </a>
  );
}

function TerminalIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect
        x="0.75"
        y="1.25"
        width="11.5"
        height="10.5"
        rx="1.25"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path
        d="M3.75 4.6 6.15 6.5 3.75 8.4"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

function formatCount(n: number) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatRelativeTime(isoDate: string, now: number) {
  const deltaSeconds = Math.round((now - new Date(isoDate).getTime()) / 1000);
  const abs = Math.abs(deltaSeconds);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "always" });

  if (abs < 60) return rtf.format(-Math.round(deltaSeconds), "second");
  if (abs < 3600) return rtf.format(-Math.round(deltaSeconds / 60), "minute");
  if (abs < 86400) return rtf.format(-Math.round(deltaSeconds / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(-Math.round(deltaSeconds / 86400), "day");
  if (abs < 86400 * 365) {
    return rtf.format(-Math.round(deltaSeconds / (86400 * 30)), "month");
  }
  return rtf.format(-Math.round(deltaSeconds / (86400 * 365)), "year");
}
