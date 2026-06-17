"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SKIP_INTRO_KEY } from "./TransitionLink";

interface IntroRevealProps {
  children: ReactNode;
  className?: string;
}

export function IntroReveal({ children, className = "" }: IntroRevealProps) {
  // Arriving via a view-transition navigation (see TransitionLink): start
  // already settled so the page crossfade reveals finished content instead of
  // replaying the staggered intro on top of it. On a fresh load the flag is
  // absent and the intro plays as usual.
  const [shown, setShown] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(SKIP_INTRO_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.remove("route-fade-out");

    if (shown) {
      try {
        sessionStorage.removeItem(SKIP_INTRO_KEY);
      } catch {}
      return;
    }
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
    // Runs once on mount; `shown` is only consumed for its initial value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={`t-intro ${shown ? "is-shown" : ""} ${className}`}>
      {children}
    </main>
  );
}
