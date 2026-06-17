"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";

/** sessionStorage key read by IntroReveal to skip its replayed intro. */
export const SKIP_INTRO_KEY = "skip-intro";

/**
 * Drop-in replacement for <Link> for in-app navigation. Next's
 * `experimental.viewTransition` already wraps the route change in a view
 * transition that crossfades the whole page (see globals.css). This wrapper
 * just flags the destination to skip its staggered intro, so the crossfade
 * reveals the new page already settled instead of fading into the middle of
 * its intro animation. The flag is only set when a view transition will
 * actually run, so reduced-motion and unsupported browsers keep the normal
 * intro.
 */
export function TransitionLink({
  onClick,
  ...props
}: ComponentProps<typeof Link>) {
  const pathname = usePathname();

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented) return;
    // Leave new-tab / modified / non-primary clicks to the browser.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }

    const { href } = props;
    if (typeof href !== "string") return;

    // Same-route clicks don't remount the page, so don't strand the flag.
    const dest = new URL(href, window.location.href);
    if (dest.pathname === pathname) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("startViewTransition" in document)) return;

    document.documentElement.classList.add("route-fade-out");
    try {
      sessionStorage.setItem(SKIP_INTRO_KEY, "1");
    } catch {}
  }

  return <Link {...props} onClick={handleClick} />;
}
