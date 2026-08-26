"use client";

import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import { useReducedMotion } from "motion/react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MutableRefObject,
  type RefObject,
} from "react";
import styles from "./nxt-level-prototype.module.css";

const FULL_TURN = Math.PI * 2;

type HeroCoinProps = {
  revealDelay?: number;
  serviceAreas: readonly string[];
};

type CoinFrame = {
  x: number;
  y: number;
};

type CoinVisualProps = {
  animateEntrance?: boolean;
  interactive?: boolean;
  stageRef?: RefObject<HTMLDivElement | null>;
  transitionProgressRef?: MutableRefObject<number>;
};

type CoinTransitionGeometry = {
  sourceLeft: number;
  sourceDocumentTop: number;
  sourceTopAtStart: number;
  sourceWidth: number;
  sourceHeight: number;
  targetLeft: number;
  targetTop: number;
  targetWidth: number;
  targetHeight: number;
  startScroll: number;
  endScroll: number;
};

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function interpolate(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function easeInOut(progress: number) {
  return progress * progress * (3 - 2 * progress);
}

function getDocumentOffset(element: HTMLElement) {
  let left = 0;
  let top = 0;
  let current: HTMLElement | null = element;

  while (current) {
    left += current.offsetLeft;
    top += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }

  return { left, top };
}

function setCoinFrame(
  element: HTMLDivElement,
  pointer: CoinFrame,
  elapsed: number,
  strength = 1,
) {
  const floatPhase = elapsed / 9000 * FULL_TURN;
  const floatY = Math.sin(floatPhase) * 2.5 * strength;
  const floatRoll = Math.sin(floatPhase + 0.5) * 0.5 * strength;

  element.style.setProperty("--coin-x", (pointer.x * 3 * strength).toFixed(3));
  element.style.setProperty(
    "--coin-y",
    (floatY + pointer.y * 2 * strength).toFixed(3),
  );
  element.style.setProperty(
    "--coin-tilt-x",
    (-pointer.y * 10 * strength).toFixed(3),
  );
  element.style.setProperty(
    "--coin-tilt-y",
    (pointer.x * 14 * strength).toFixed(3),
  );
  element.style.setProperty("--coin-roll", floatRoll.toFixed(3));
  element.style.setProperty("--coin-glint-x", `${50 + pointer.x * 18}%`);
  element.style.setProperty("--coin-glint-y", `${36 + pointer.y * 14}%`);
}

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function CoinVisual({
  animateEntrance = false,
  interactive = false,
  stageRef,
  transitionProgressRef,
}: CoinVisualProps) {
  const visualRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!interactive) return;

    const stage = stageRef?.current;
    const visual = visualRef.current;
    if (!stage || !visual) return;

    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const finePointerQuery = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    );
    const reducedMotion = reducedMotionQuery.matches;

    if (reducedMotion) {
      setCoinFrame(visual, { x: 0, y: 0 }, 0);
      return;
    }

    let frame = 0;
    let visible = !document.hidden;
    let intersecting = true;
    let lastFrameAt = performance.now();
    const startedAt = lastFrameAt;
    const targetPointer = { x: 0, y: 0 };
    const currentPointer = { x: 0, y: 0 };

    const render = (now: number) => {
      const delta = Math.min(Math.max((now - lastFrameAt) / 1000, 0), 0.05);
      lastFrameAt = now;
      const damping = 1 - Math.exp(-8.5 * delta);
      currentPointer.x += (targetPointer.x - currentPointer.x) * damping;
      currentPointer.y += (targetPointer.y - currentPointer.y) * damping;
      const transitionProgress = transitionProgressRef?.current ?? 0;
      setCoinFrame(
        visual,
        currentPointer,
        now - startedAt,
        1 - transitionProgress,
      );
    };

    const loop = (now: number) => {
      frame = 0;
      render(now);
      if (visible && intersecting) {
        frame = window.requestAnimationFrame(loop);
      }
    };

    const syncLoop = () => {
      if (visible && intersecting) {
        if (!frame) {
          lastFrameAt = performance.now();
          frame = window.requestAnimationFrame(loop);
        }
      } else if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!finePointerQuery.matches) return;
      const bounds = stage.getBoundingClientRect();
      targetPointer.x = Math.max(
        -1,
        Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1),
      );
      targetPointer.y = Math.max(
        -1,
        Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1),
      );
    };

    const onPointerLeave = () => {
      targetPointer.x = 0;
      targetPointer.y = 0;
    };

    const onVisibilityChange = () => {
      visible = !document.hidden;
      syncLoop();
    };

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        intersecting = entry?.isIntersecting ?? true;
        syncLoop();
      },
      { rootMargin: "80px" },
    );

    intersectionObserver.observe(stage);
    document.addEventListener("visibilitychange", onVisibilityChange);
    stage.addEventListener("pointermove", onPointerMove, { passive: true });
    stage.addEventListener("pointerleave", onPointerLeave, { passive: true });
    render(performance.now());
    syncLoop();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [interactive, stageRef, transitionProgressRef]);

  const visualClassName = [
    styles.heroCoinVisual,
    animateEntrance ? "" : styles.heroCoinVisualSettled,
    interactive ? "" : styles.heroCoinVisualDocked,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={visualRef} className={visualClassName}>
      <Image
        className={styles.heroCoinArtwork}
        src="/nxt-level-prototype/hero-coin-option-3-transparent.png"
        width={1024}
        height={1024}
        alt=""
        priority
      />
      {interactive ? <span className={styles.heroCoinGlint} /> : null}
    </div>
  );
}

export function HeroCoin({
  revealDelay = 70,
  serviceAreas,
}: HeroCoinProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dockSlotRef = useRef<HTMLDivElement>(null);
  const floatingNavRef = useRef<HTMLElement>(null);
  const navSurfaceRef = useRef<HTMLSpanElement>(null);
  const navPillsRef = useRef<HTMLUListElement>(null);
  const navCtaRef = useRef<HTMLAnchorElement>(null);
  const scrollCoinRef = useRef<HTMLDivElement>(null);
  const transitionProgressRef = useRef(0);
  const dockedRef = useRef(false);
  const hasDockedRef = useRef(false);
  const [isDocked, setIsDocked] = useState(false);
  const [hasDocked, setHasDocked] = useState(false);
  const reducedMotion = Boolean(useReducedMotion());

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    stage.dataset.rendererState = supportsWebGL() ? "ready" : "fallback";
  }, []);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const dockSlot = dockSlotRef.current;
    const floatingNav = floatingNavRef.current;
    const navSurface = navSurfaceRef.current;
    const navPills = navPillsRef.current;
    const navCta = navCtaRef.current;
    const scrollCoin = scrollCoinRef.current;
    if (
      !stage ||
      !dockSlot ||
      !floatingNav ||
      !navSurface ||
      !navPills ||
      !navCta ||
      !scrollCoin
    ) return;

    let frame = 0;
    let geometry: CoinTransitionGeometry | null = null;
    let shouldMeasure = true;
    let disposed = false;

    const measureGeometry = () => {
      const stageBounds = stage.getBoundingClientRect();
      const dockBounds = dockSlot.getBoundingClientRect();
      const stageOffset = getDocumentOffset(stage);
      const endScroll = Math.max(
        1,
        stageOffset.top - dockBounds.bottom,
      );
      const transitionDistance = Math.min(
        260,
        Math.max(140, stageBounds.height * 0.75),
      );
      const startScroll = Math.max(0, endScroll - transitionDistance);

      geometry = {
        sourceLeft: stageBounds.left,
        sourceDocumentTop: stageOffset.top,
        sourceTopAtStart: stageOffset.top - startScroll,
        sourceWidth: stageBounds.width,
        sourceHeight: stageBounds.height,
        targetLeft: dockBounds.left,
        targetTop: dockBounds.top,
        targetWidth: dockBounds.width,
        targetHeight: dockBounds.height,
        startScroll,
        endScroll,
      };
      scrollCoin.style.width = `${stageBounds.width.toFixed(3)}px`;
      scrollCoin.style.height = `${stageBounds.height.toFixed(3)}px`;
      shouldMeasure = false;
    };

    const renderTransition = () => {
      frame = 0;
      if (shouldMeasure || !geometry) measureGeometry();
      if (!geometry) return;

      const scrollTop = window.scrollY;
      const range = Math.max(1, geometry.endScroll - geometry.startScroll);
      const progress = clamp((scrollTop - geometry.startScroll) / range);
      const nextDocked = progress >= 1;
      const easedProgress = easeInOut(progress);
      const placementProgress = reducedMotion
        ? nextDocked ? 1 : 0
        : easedProgress;

      let left: number;
      let top: number;
      let width: number;
      let height: number;

      if (placementProgress <= 0) {
        left = geometry.sourceLeft;
        top = geometry.sourceDocumentTop - scrollTop;
        width = geometry.sourceWidth;
        height = geometry.sourceHeight;
      } else {
        left = interpolate(
          geometry.sourceLeft,
          geometry.targetLeft,
          placementProgress,
        );
        top = interpolate(
          geometry.sourceTopAtStart,
          geometry.targetTop,
          placementProgress,
        );
        width = interpolate(
          geometry.sourceWidth,
          geometry.targetWidth,
          placementProgress,
        );
        height = interpolate(
          geometry.sourceHeight,
          geometry.targetHeight,
          placementProgress,
        );
      }

      const navProgress = reducedMotion
        ? nextDocked ? 1 : 0
        : easeInOut(clamp((progress - 0.7) / 0.3));
      const scaleX = width / geometry.sourceWidth;
      const scaleY = height / geometry.sourceHeight;

      transitionProgressRef.current = placementProgress;
      scrollCoin.style.transform = `translate3d(${left.toFixed(3)}px, ${top.toFixed(3)}px, 0) scale3d(${scaleX.toFixed(5)}, ${scaleY.toFixed(5)}, 1)`;
      scrollCoin.dataset.positioned = "true";
      floatingNav.dataset.transitionProgress = navProgress.toFixed(3);
      navSurface.style.opacity = navProgress.toFixed(3);
      navSurface.style.transform = `scale(${(0.97 + navProgress * 0.03).toFixed(4)})`;
      navPills.style.opacity = navProgress.toFixed(3);
      navCta.style.opacity = navProgress.toFixed(3);

      if (nextDocked && !hasDockedRef.current) {
        hasDockedRef.current = true;
        setHasDocked(true);
      }

      if (nextDocked !== dockedRef.current) {
        dockedRef.current = nextDocked;
        setIsDocked(nextDocked);
      }
    };

    const requestRender = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(renderTransition);
      }
    };

    const requestMeasure = () => {
      shouldMeasure = true;
      requestRender();
    };

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(requestMeasure);

    resizeObserver?.observe(stage);
    resizeObserver?.observe(dockSlot);
    resizeObserver?.observe(floatingNav);
    window.addEventListener("scroll", requestRender, { passive: true });
    window.addEventListener("resize", requestMeasure, { passive: true });
    window.addEventListener("hashchange", requestMeasure);
    window.addEventListener("pageshow", requestMeasure);
    document.fonts.ready.then(() => {
      if (!disposed) requestMeasure();
    });
    renderTransition();

    return () => {
      disposed = true;
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener("scroll", requestRender);
      window.removeEventListener("resize", requestMeasure);
      window.removeEventListener("hashchange", requestMeasure);
      window.removeEventListener("pageshow", requestMeasure);
    };
  }, [reducedMotion]);

  const revealStyle = {
    "--nxt-reveal-delay": `${revealDelay}ms`,
  } as CSSProperties;

  return (
    <>
      <nav
        ref={floatingNavRef}
        className={styles.floatingNav}
        data-coin-nav
        data-docked={isDocked ? "true" : "false"}
        aria-label="Floating page navigation"
      >
        <span
          ref={navSurfaceRef}
          className={styles.floatingNavSurface}
          data-coin-nav-surface
          aria-hidden="true"
        />
        <div
          ref={dockSlotRef}
          className={styles.floatingNavCoinSlot}
          data-coin-dock-slot
          aria-hidden="true"
        />
        <ul
          ref={navPillsRef}
          className={`${styles.pillList} ${styles.floatingNavPillList}`}
          aria-hidden="true"
        >
          {serviceAreas.map((area) => (
            <li className={`${styles.pill} ${styles.floatingNavPill}`} key={area}>
              {area}
            </li>
          ))}
        </ul>
        <a
          ref={navCtaRef}
          className={styles.floatingNavCta}
          href="#contact"
          tabIndex={isDocked ? 0 : -1}
          aria-hidden={!isDocked}
        >
          Book a Call
          <HugeiconsIcon
            icon={ArrowUpRight01Icon}
            size={14}
            strokeWidth={2}
            aria-hidden="true"
          />
        </a>
      </nav>

      <div
        ref={scrollCoinRef}
        className={styles.scrollCoin}
        data-coin-state={isDocked ? "docked" : "hero"}
        aria-hidden="true"
      >
        <CoinVisual
          animateEntrance={!hasDocked}
          interactive={!isDocked}
          stageRef={stageRef}
          transitionProgressRef={transitionProgressRef}
        />
      </div>

      <div
        ref={stageRef}
        className={styles.heroCoin}
        data-renderer-state="loading"
        data-nxt-reveal
        style={revealStyle}
        aria-hidden="true"
      />
    </>
  );
}
