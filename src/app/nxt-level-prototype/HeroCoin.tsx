"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import styles from "./nxt-level-prototype.module.css";

const FULL_TURN = Math.PI * 2;

type HeroCoinProps = {
  revealDelay?: number;
};

type CoinFrame = {
  x: number;
  y: number;
};

function setCoinFrame(element: HTMLDivElement, pointer: CoinFrame, elapsed: number) {
  const floatPhase = elapsed / 6800 * FULL_TURN;
  const floatY = Math.sin(floatPhase) * 6;
  const floatRoll = Math.sin(floatPhase + 0.5) * 1.5;

  element.style.setProperty("--coin-x", (pointer.x * 3).toFixed(3));
  element.style.setProperty("--coin-y", (floatY + pointer.y * 2).toFixed(3));
  element.style.setProperty("--coin-tilt-x", (-pointer.y * 10).toFixed(3));
  element.style.setProperty("--coin-tilt-y", (pointer.x * 14).toFixed(3));
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

export function HeroCoin({ revealDelay = 70 }: HeroCoinProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const visual = visualRef.current;
    if (!stage || !visual) return;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = reducedMotionQuery.matches;

    stage.dataset.rendererState = supportsWebGL() ? "ready" : "fallback";

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
      setCoinFrame(visual, currentPointer, now - startedAt);
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

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      intersecting = entry?.isIntersecting ?? true;
      syncLoop();
    }, { rootMargin: "80px" });

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
  }, []);

  const revealStyle = {
    "--nxt-reveal-delay": `${revealDelay}ms`,
  } as CSSProperties;

  return (
    <div
      ref={stageRef}
      className={styles.heroCoin}
      data-renderer-state="loading"
      data-nxt-reveal
      style={revealStyle}
      aria-hidden="true"
    >
      <div ref={visualRef} className={styles.heroCoinVisual}>
        <Image
          className={styles.heroCoinArtwork}
          src="/nxt-level-prototype/hero-coin-option-3-fallback.png"
          width={1024}
          height={1024}
          alt=""
          priority
        />
        <span className={styles.heroCoinGlint} />
      </div>
    </div>
  );
}
