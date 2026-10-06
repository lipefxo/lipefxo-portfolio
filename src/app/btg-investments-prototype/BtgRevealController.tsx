"use client";

import { useLayoutEffect } from "react";

const revealSelector = "[data-btg-reveal]";
const motionPreferenceQuery = "(prefers-reduced-motion: reduce)";

export function BtgRevealController({ rootId }: { rootId: string }) {
  useLayoutEffect(() => {
    const motionRoot = document.getElementById(rootId);
    if (!motionRoot) return;

    const elements = Array.from(
      motionRoot.querySelectorAll<HTMLElement>(revealSelector),
    );
    if (elements.length === 0) return;

    const motionPreference = window.matchMedia(motionPreferenceQuery);
    let observer: IntersectionObserver | null = null;

    const settleElements = () => {
      observer?.disconnect();
      observer = null;
      motionRoot.dataset.btgMotionReady = "true";
      motionRoot.dataset.btgReducedMotion = "true";

      for (const element of elements) {
        element.dataset.btgVisible = "true";
      }
    };

    const observeElements = () => {
      observer?.disconnect();

      if (typeof IntersectionObserver === "undefined") {
        settleElements();
        return;
      }

      delete motionRoot.dataset.btgReducedMotion;
      motionRoot.dataset.btgMotionReady = "true";

      for (const element of elements) {
        element.dataset.btgVisible = "false";
      }

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const element = entry.target as HTMLElement;
            element.dataset.btgVisible = entry.isIntersecting ? "true" : "false";
          }
        },
        {
          root: null,
          rootMargin: "8% 0px -10% 0px",
          threshold: 0.01,
        },
      );

      for (const element of elements) {
        observer.observe(element);
      }
    };

    const syncMotionPreference = () => {
      if (motionPreference.matches) {
        settleElements();
      } else {
        observeElements();
      }
    };

    syncMotionPreference();
    motionPreference.addEventListener("change", syncMotionPreference);

    return () => {
      observer?.disconnect();
      motionPreference.removeEventListener("change", syncMotionPreference);
      delete motionRoot.dataset.btgMotionReady;
      delete motionRoot.dataset.btgReducedMotion;

      for (const element of elements) {
        delete element.dataset.btgVisible;
      }
    };
  }, [rootId]);

  return null;
}
