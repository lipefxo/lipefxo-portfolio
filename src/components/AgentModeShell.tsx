"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Nav } from "./Nav";
import { AgentModeContext } from "./AgentModeContext";

type TransitionPhase = "idle" | "leaving" | "entering";

export function AgentModeShell({
  markdown,
  children,
}: {
  markdown: string;
  children: ReactNode;
}) {
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState<TransitionPhase>("idle");
  const visualScrollPosition = useRef(0);
  const transitionTimer = useRef<number | undefined>(undefined);
  const markdownRef = useRef<HTMLElement>(null);
  const transitioning = phase !== "idle";

  const toggle = useCallback(() => {
    if (transitionTimer.current || phase !== "idle") return;

    const nextActive = !active;
    if (!active) visualScrollPosition.current = window.scrollY;

    const setMode = () => {
      setActive(nextActive);
      if (nextActive) {
        window.requestAnimationFrame(() => {
          window.scrollTo({ top: 0, behavior: "auto" });
          markdownRef.current?.focus({ preventScroll: true });
        });
      } else {
        window.requestAnimationFrame(() => {
          window.scrollTo({ top: visualScrollPosition.current, behavior: "auto" });
        });
      }
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMode();
      return;
    }

    setPhase("leaving");
    transitionTimer.current = window.setTimeout(() => {
      transitionTimer.current = undefined;
      setMode();
      setPhase("entering");
      window.requestAnimationFrame(() => setPhase("idle"));
    }, 140);
  }, [active, phase]);

  useEffect(() => {
    return () => {
      if (transitionTimer.current) window.clearTimeout(transitionTimer.current);
    };
  }, []);

  const transitionClass =
    phase === "idle"
      ? "translate-y-0 opacity-100"
      : "translate-y-1 opacity-0";

  return (
    <AgentModeContext.Provider value={{ active, transitioning, toggle }}>
      <Nav />
      {active ? (
        <main
          ref={markdownRef}
          tabIndex={-1}
          aria-label="Agent-readable Markdown portfolio"
          className={`min-h-screen bg-white px-6 pb-16 pt-24 text-zinc-900 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none dark:bg-black dark:text-zinc-100 sm:px-10 ${transitionClass}`}
        >
          <pre className="mx-auto max-w-5xl whitespace-pre-wrap break-words font-mono text-[13px] leading-6 sm:text-sm">
            {markdown}
          </pre>
        </main>
      ) : (
        <div
          className={`transition-[opacity,transform] duration-150 ease-in motion-reduce:transition-none ${transitionClass}`}
        >
          {children}
        </div>
      )}
    </AgentModeContext.Provider>
  );
}
