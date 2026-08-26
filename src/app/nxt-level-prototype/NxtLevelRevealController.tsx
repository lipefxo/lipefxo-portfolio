"use client";

import { useLayoutEffect } from "react";

const revealSelector = "[data-nxt-reveal]";

export function NxtLevelRevealController({ rootId }: { rootId: string }) {
  useLayoutEffect(() => {
    const root = document.getElementById(rootId);
    if (!root) return;
    const motionRoot = root;

    const elements = Array.from(
      motionRoot.querySelectorAll<HTMLElement>(revealSelector),
    );
    if (elements.length === 0) return;

    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    let observer: IntersectionObserver | null = null;

    function settleElements() {
      observer?.disconnect();
      observer = null;
      motionRoot.dataset.nxtMotionReady = "true";

      for (const element of elements) {
        element.dataset.nxtVisible = "true";
      }
    }

    function observeElements() {
      observer?.disconnect();

      if (typeof IntersectionObserver === "undefined") {
        settleElements();
        return;
      }

      for (const element of elements) {
        element.dataset.nxtVisible = "false";
      }
      motionRoot.dataset.nxtMotionReady = "true";

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            (entry.target as HTMLElement).dataset.nxtVisible = entry.isIntersecting
              ? "true"
              : "false";
          }
        },
        {
          rootMargin: "8% 0px -10% 0px",
          threshold: 0.01,
        },
      );

      for (const element of elements) {
        observer.observe(element);
      }
    }

    function syncMotionPreference() {
      if (motionPreference.matches) {
        settleElements();
      } else {
        observeElements();
      }
    }

    syncMotionPreference();
    motionPreference.addEventListener("change", syncMotionPreference);

    return () => {
      observer?.disconnect();
      motionPreference.removeEventListener("change", syncMotionPreference);
      delete motionRoot.dataset.nxtMotionReady;

      for (const element of elements) {
        delete element.dataset.nxtVisible;
      }
    };
  }, [rootId]);

  return null;
}
