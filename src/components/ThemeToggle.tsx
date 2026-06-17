"use client";

import { useRef, useSyncExternalStore } from "react";

// Subscribe to changes on <html class>, so the icon stays in sync with the theme.
function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

const getSnapshot = () => document.documentElement.classList.contains("dark");
const getServerSnapshot = () => false;

// Flip the theme: toggle the class, sync color-scheme, and persist the choice.
function applyTheme(next: boolean) {
  document.documentElement.classList.toggle("dark", next);
  document.documentElement.style.colorScheme = next ? "dark" : "light";
  try {
    localStorage.setItem("theme", next ? "dark" : "light");
  } catch {}
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Modern-first: browsers without the View Transitions API, and anyone who
    // prefers reduced motion, get the instant switch.
    if (!document.startViewTransition || reduce) {
      applyTheme(next);
      return;
    }

    // Origin of the liquid reveal: the centre of the toggle button (falls back
    // to the top-right corner where the button lives).
    const rect = buttonRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth;
    const y = rect ? rect.top + rect.height / 2 : 0;
    // Radius needed to flood the whole viewport from that origin.
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    // Mark this transition as a theme flip so globals.css drops the navigation
    // dissolve and lets only the clip-path reveal run.
    const root = document.documentElement;
    root.classList.add("theme-vt");

    const transition = document.startViewTransition(() => applyTheme(next));
    transition.finished.finally(() => root.classList.remove("theme-vt"));
    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${radius}px at ${x}px ${y}px)`,
            ],
            // Soft, liquid wavefront: the incoming theme starts blurred at its
            // leading edge and sharpens as it settles.
            filter: ["blur(6px)", "blur(0px)"],
          },
          {
            duration: 650,
            easing: "cubic-bezier(0.65, 0, 0.35, 1)",
            pseudoElement: "::view-transition-new(root)",
          },
        );
      })
      .catch(() => {
        // If the transition is skipped/aborted the class is already flipped.
      });
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={`inline-flex items-center justify-center text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 ${className}`}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function MoonIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}
