"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { SKIP_INTRO_KEY } from "./TransitionLink";

/**
 * `route-fade-out` is added by TransitionLink and normally cleared by
 * IntroReveal. Standalone routes (prototypes, playgrounds) don't mount
 * IntroReveal, so this drops the class if it's still on the document.
 */
export function RouteFadeCleanup() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/" || pathname.startsWith("/work/")) return;
    document.documentElement.classList.remove("route-fade-out");
    try {
      sessionStorage.removeItem(SKIP_INTRO_KEY);
    } catch {}
  }, [pathname]);

  return null;
}
