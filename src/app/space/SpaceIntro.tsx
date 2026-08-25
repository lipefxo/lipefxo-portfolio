"use client";

import {
  useCallback,
  useEffect,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import styles from "./space.module.css";

const INTRO_HOLD_DURATION = 2_400;
const INTRO_EXIT_DURATION = 640;

type IntroStage = "enter" | "exit";

export function SpaceIntro() {
  const [stage, setStage] = useState<IntroStage | null>("enter");

  const dismissIntro = useCallback(() => {
    setStage((current) => (current === "enter" ? "exit" : current));
  }, []);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const respectReducedMotion = () => {
      if (motionQuery.matches) setStage(null);
    };

    respectReducedMotion();
    if (motionQuery.matches) return;

    const autoDismiss = window.setTimeout(dismissIntro, INTRO_HOLD_DURATION);
    motionQuery.addEventListener("change", respectReducedMotion);

    return () => {
      window.clearTimeout(autoDismiss);
      motionQuery.removeEventListener("change", respectReducedMotion);
    };
  }, [dismissIntro]);

  useEffect(() => {
    if (stage !== "exit") return;
    const finishExit = window.setTimeout(() => setStage(null), INTRO_EXIT_DURATION);
    return () => window.clearTimeout(finishExit);
  }, [stage]);

  if (!stage) return null;

  const stopPointerPropagation = (event: ReactPointerEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    event.stopPropagation();
    if (event.key !== "Escape") return;
    event.preventDefault();
    dismissIntro();
  };

  return (
    <section
      className={styles.spaceIntro}
      data-state={stage}
      aria-labelledby="space-intro-title"
      onPointerEnter={stopPointerPropagation}
      onPointerLeave={stopPointerPropagation}
      onPointerDown={stopPointerPropagation}
      onPointerMove={stopPointerPropagation}
      onPointerUp={stopPointerPropagation}
      onPointerCancel={stopPointerPropagation}
      onWheel={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.introMap} aria-hidden="true">
        <span className={`${styles.introOrbit} ${styles.introOrbitOne}`} />
        <span className={`${styles.introOrbit} ${styles.introOrbitTwo}`} />
        <span className={`${styles.introOrbit} ${styles.introOrbitThree}`} />
        <span className={`${styles.introOrbit} ${styles.introOrbitFour}`} />
        <span className={`${styles.introPlanet} ${styles.introPlanetOne}`} />
        <span className={`${styles.introPlanet} ${styles.introPlanetTwo}`} />
        <span className={`${styles.introPlanet} ${styles.introPlanetThree}`} />
        <span className={styles.introSun} />
      </div>

      <div className={styles.introContent}>
        <p className={styles.introKicker}>ORBITAL ATLAS / 01</p>
        <h1 id="space-intro-title" className={styles.introTitle}>
          <span className={styles.introTitlePrimary}>SOLAR</span>
          <span className={styles.introTitleSecondary}>SYSTEM</span>
        </h1>
        <p className={styles.introDescription}>
          A living map of our local star system.
        </p>
        <div className={styles.introStatus}>
          <span className={styles.introStatusMark} aria-hidden="true" />
          Ephemeris synchronized
        </div>
      </div>

      <button
        type="button"
        className={styles.introSkip}
        onClick={dismissIntro}
        aria-label="Skip opening sequence"
      >
        Skip sequence <span aria-hidden="true">↗</span>
      </button>
    </section>
  );
}
