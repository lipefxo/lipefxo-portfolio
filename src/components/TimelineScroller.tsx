"use client";

import { useEffect, useRef, type ReactNode } from "react";

const START_SCAN_RATIO = 0.34;
const NAV_CLEARANCE = 88;
const SNAP_PX = 9;
const SNAP_RELEASE_PX = 42;
const SETTLE_PX = 0.5;
const FOLLOW_RATE = 18;

interface TimelineRow {
  el: HTMLElement;
  top: number;
  bottom: number;
  anchorY: number;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(min: number, max: number, value: number) {
  const progress = clamp((value - min) / (max - min), 0, 1);
  return progress * progress * (3 - 2 * progress);
}

function measureRows(root: HTMLElement): TimelineRow[] {
  const rootTop = root.getBoundingClientRect().top;

  return [...root.querySelectorAll<HTMLElement>("[data-timeline-row]")].map(
    (el) => {
      const rect = el.getBoundingClientRect();
      const anchor = el.querySelector<HTMLElement>("[data-timeline-anchor]");
      const anchorRect = anchor?.getBoundingClientRect();

      return {
        el,
        top: rect.top - rootTop,
        bottom: rect.bottom - rootTop,
        anchorY: anchorRect
          ? anchorRect.top - rootTop + anchorRect.height / 2
          : rect.top - rootTop + 12,
      };
    },
  );
}

export function TimelineScroller({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const progress = progressRef.current;
    const orb = orbRef.current;
    if (!root || !progress || !orb) return;

    // Keep non-null aliases for callbacks that outlive this effect's setup.
    const timelineRoot = root;
    const progressEl = progress;
    const orbEl = orb;

    let rows: TimelineRow[] = [];
    let trackHeight = 0;
    let startScroll = 0;
    let endScroll = 1;
    let displayY = 0;
    let previousTime = 0;
    let initialized = false;
    let activeEl: HTMLElement | null = null;
    let raf = 0;
    let reduced = prefersReducedMotion();

    function recache() {
      rows = measureRows(timelineRoot);
      trackHeight = timelineRoot.offsetHeight;

      const rootTop = timelineRoot.getBoundingClientRect().top + window.scrollY;
      const startViewport = Math.max(
        NAV_CLEARANCE,
        window.innerHeight * START_SCAN_RATIO,
      );
      const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        0,
      );

      startScroll = Math.min(Math.max(rootTop - startViewport, 0), maxScroll);
      endScroll = maxScroll;
    }

    function setActive(next: HTMLElement | null) {
      if (activeEl === next) return;
      activeEl?.removeAttribute("data-active");
      if (next) next.setAttribute("data-active", "true");
      activeEl = next;
    }

    function update(time: number) {
      if (!rows.length) return true;

      const scrollRange = endScroll - startScroll;
      const scrollProgress =
        scrollRange > 0
          ? clamp((window.scrollY - startScroll) / scrollRange, 0, 1)
          : window.scrollY >= endScroll
            ? 1
            : 0;
      let targetY = scrollProgress * trackHeight;
      const visible = window.scrollY >= startScroll;
      const containing = visible
        ? rows.find(
            (row, index) =>
              targetY >= row.top &&
              (index === rows.length - 1
                ? targetY <= row.bottom
                : targetY < row.bottom),
          )
        : undefined;
      const nearest = rows.reduce((closest, row) =>
        Math.abs(row.anchorY - targetY) < Math.abs(closest.anchorY - targetY)
          ? row
          : closest,
      );
      const anchorDistance = Math.abs(nearest.anchorY - targetY);

      // Map the full available page scroll range onto the full track, then ease
      // into a short magnetic hold around each role anchor.
      if (visible && anchorDistance < SNAP_RELEASE_PX) {
        const pull = 1 - smoothstep(SNAP_PX, SNAP_RELEASE_PX, anchorDistance);
        targetY += (nearest.anchorY - targetY) * pull;
      }

      if (!initialized) {
        displayY = targetY;
        initialized = true;
      } else if (reduced) {
        displayY = targetY;
      } else {
        const elapsed = previousTime
          ? Math.min((time - previousTime) / 1000, 0.1)
          : 1 / 60;
        const follow = 1 - Math.exp(-FOLLOW_RATE * elapsed);
        displayY += (targetY - displayY) * follow;
      }
      previousTime = time;

      const settled = Math.abs(targetY - displayY) < SETTLE_PX;
      if (settled) displayY = targetY;

      const progressScale =
        trackHeight > 0 ? clamp(displayY / trackHeight, 0, 1) : 0;
      progressEl.style.transform = `scaleY(${progressScale})`;
      orbEl.style.transform = `translate(-50%, -50%) translateY(${displayY}px)`;
      orbEl.style.opacity = visible ? "1" : "0";
      orbEl.dataset.snapped =
        visible && anchorDistance <= SNAP_PX ? "true" : "false";
      setActive(containing?.el ?? null);

      return settled;
    }

    function tick(time: number) {
      raf = 0;
      const settled = update(time);
      if (!settled && !reduced) {
        raf = window.requestAnimationFrame(tick);
      }
    }

    function requestTick() {
      if (raf) return;
      raf = window.requestAnimationFrame(tick);
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => {
      reduced = media.matches;
      requestTick();
    };

    recache();
    requestTick();

    const introTimer = window.setTimeout(() => {
      recache();
      requestTick();
    }, 900);

    const observer = new ResizeObserver(() => {
      recache();
      requestTick();
    });
    observer.observe(timelineRoot);
    observer.observe(document.body);

    const onResize = () => {
      recache();
      requestTick();
    };

    window.addEventListener("scroll", requestTick, { passive: true });
    window.addEventListener("resize", onResize);
    media.addEventListener("change", onMotion);

    return () => {
      window.clearTimeout(introTimer);
      if (raf) window.cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("scroll", requestTick);
      window.removeEventListener("resize", onResize);
      media.removeEventListener("change", onMotion);
      activeEl?.removeAttribute("data-active");
    };
  }, []);

  return (
    <div ref={rootRef} className="t-timeline-scroller relative pl-6">
      {children}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-10"
      >
        <div className="t-timeline-lines absolute inset-y-0 left-0 w-px -translate-x-1/2">
          <div className="absolute inset-y-0 left-0 w-px bg-zinc-200 dark:bg-zinc-800" />
          <div
            ref={progressRef}
            className="t-timeline-progress absolute inset-y-0 left-0 w-px origin-top"
          />
        </div>
        <div
          ref={orbRef}
          className="t-timeline-orb absolute top-0 left-0 opacity-0"
        />
      </div>
    </div>
  );
}
