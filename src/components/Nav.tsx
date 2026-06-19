"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { site } from "@/config/site";
import { TransitionLink } from "./TransitionLink";
import { ProfileAvatar } from "./ProfileAvatar";
import {
  EMAIL_COPIED_EVENT,
  copyEmailToClipboard,
  socialLinks,
} from "./SocialIconLinks";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Fixed top navigation. The bar itself is always present so the theme toggle
 * stays reachable, but it reads as part of the hero at first: the background,
 * hairline border, name, and social icons only fade / slide in once the hero
 * scrolls past — so the hero quietly hands off to the bar. The name sits on the
 * same left edge as the hero heading to keep the handoff continuous.
 */
export function Nav() {
  const pathname = usePathname();
  const isProjectPage = pathname.startsWith("/work/");
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const active = isProjectPage || scrolled;
  const framed = active || drawerOpen;

  useEffect(() => {
    if (isProjectPage) return;

    // On the home page the bar reveals as the hero leaves the top of the
    // viewport. On other pages without a hero it reveals once the user
    // scrolls a touch past the top.
    const hero = document.getElementById("hero");
    if (hero) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          const nextScrolled = !entry.isIntersecting;
          setScrolled(nextScrolled);
          if (!nextScrolled) setDrawerOpen(false);
        },
        { rootMargin: "-8px 0px 0px 0px" },
      );
      observer.observe(hero);
      return () => observer.disconnect();
    }

    const onScroll = () => {
      const nextScrolled = window.scrollY > 24;
      setScrolled(nextScrolled);
      if (!nextScrolled) setDrawerOpen(false);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isProjectPage]);

  useEffect(() => {
    if (!drawerOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [drawerOpen]);

  useEffect(() => {
    let timeout: number | undefined;

    const onEmailCopied = () => {
      setEmailCopied(true);
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setEmailCopied(false), 2200);
    };

    window.addEventListener(EMAIL_COPIED_EVENT, onEmailCopied);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener(EMAIL_COPIED_EVENT, onEmailCopied);
    };
  }, []);

  async function onCopyEmail(closeDrawer = false) {
    await copyEmailToClipboard();
    if (closeDrawer) setDrawerOpen(false);
  }

  const reveal = "transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

  return (
    <div
      data-scrolled={active}
      className={`pointer-events-none fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color,backdrop-filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
        framed
          ? "border-transparent bg-transparent md:border-zinc-200/70 md:bg-white/70 md:backdrop-blur-md md:dark:border-zinc-800/70 md:dark:bg-black/50"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto grid max-w-3xl grid-cols-[1fr_auto] items-center gap-4 px-6 py-3.5 sm:px-10 md:grid-cols-[1fr_auto_1fr] md:gap-6">
        <div className="flex min-w-0 items-center gap-3 justify-self-start">
          <TransitionLink
            href="/"
            className={`hidden items-center gap-2 text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:inline-flex ${reveal} ${
              active
                ? "pointer-events-auto translate-x-0 opacity-100"
                : "pointer-events-none -translate-x-1 opacity-0"
            }`}
          >
            <ProfileAvatar size={20} tooltip={false} />
            <span className="font-brand text-lg leading-none font-normal tracking-normal">
              {site.name}
            </span>
          </TransitionLink>
        </div>

        <ul
          className={`hidden items-center justify-self-center gap-4 text-zinc-500 delay-75 dark:text-zinc-400 md:flex ${reveal} ${
            active
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-1 opacity-0"
          }`}
        >
          {socialLinks.map((link) => (
            <li key={link.label} className="flex">
              {"action" in link ? (
                <button
                  type="button"
                  aria-label={`Copy ${link.label.toLowerCase()}`}
                  className="inline-flex items-center transition-colors hover:text-zinc-950 dark:hover:text-zinc-50"
                  onClick={() => onCopyEmail()}
                >
                  {link.icon}
                </button>
              ) : (
                <a
                  href={link.href}
                  target={link.download ? undefined : "_blank"}
                  rel={link.download ? undefined : "noopener noreferrer"}
                  download={link.download}
                  aria-label={link.label}
                  className={`inline-flex items-center transition-colors hover:text-zinc-950 dark:hover:text-zinc-50 ${
                    link.download ? "gap-1.5 text-xs font-semibold tracking-tight" : ""
                  }`}
                >
                  {link.icon}
                  {link.download ? <span>{link.label}</span> : null}
                </a>
              )}
            </li>
          ))}
        </ul>

        <div className="pointer-events-auto flex items-center gap-2 justify-self-end">
          <div className="hidden md:flex">
            <ThemeToggle />
          </div>
          <button
            type="button"
            aria-label="Open menu"
            aria-controls="mobile-nav-drawer"
            aria-expanded={drawerOpen}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200/75 bg-white/65 text-zinc-600 shadow-[0_1px_12px_rgba(0,0,0,0.04)] backdrop-blur transition-[background-color,border-color,color,opacity,transform] duration-300 hover:border-zinc-300 hover:bg-white hover:text-zinc-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 dark:border-zinc-800/80 dark:bg-zinc-950/55 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-950 dark:hover:text-zinc-50 dark:focus-visible:outline-zinc-50 md:hidden ${
              active || drawerOpen
                ? "pointer-events-auto translate-y-0 opacity-100"
                : "pointer-events-none -translate-y-1 opacity-0"
            }`}
            onClick={() => setDrawerOpen((open) => !open)}
          >
            <MenuIcon />
          </button>
        </div>
      </div>

      <div
        id="mobile-nav-drawer"
        data-open={drawerOpen}
        className="t-panel-slide fixed inset-0 z-50 h-dvh overflow-y-auto bg-white/95 px-6 backdrop-blur-md [--panel-translate-y:-100%] dark:bg-black/95 sm:px-10 md:hidden"
      >
        <div className="mx-auto flex min-h-dvh max-w-3xl flex-col py-3.5">
          <div className="flex items-center justify-between gap-4">
            <TransitionLink
              href="/"
              onClick={() => setDrawerOpen(false)}
              className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
            >
              <ProfileAvatar size={20} tooltip={false} />
              <span className="font-brand text-lg leading-none font-normal tracking-normal">
                {site.name}
              </span>
            </TransitionLink>

            <button
              type="button"
              aria-label="Close menu"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200/75 bg-white/65 text-zinc-600 shadow-[0_1px_12px_rgba(0,0,0,0.04)] backdrop-blur transition-[background-color,border-color,color] duration-200 hover:border-zinc-300 hover:bg-white hover:text-zinc-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 dark:border-zinc-800/80 dark:bg-zinc-950/55 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-950 dark:hover:text-zinc-50 dark:focus-visible:outline-zinc-50"
              onClick={() => setDrawerOpen(false)}
            >
              <CloseIcon />
            </button>
          </div>

          <ul className="mt-8 flex flex-col gap-3 text-sm text-zinc-600 dark:text-zinc-300">
            {socialLinks.map((link) => (
              <li key={link.label}>
                {"action" in link ? (
                  <button
                    type="button"
                    aria-label={`Copy ${link.label.toLowerCase()}`}
                    onClick={() => onCopyEmail(true)}
                    className="flex min-h-11 w-full items-center gap-3 rounded-md border border-zinc-200/70 bg-white/55 px-4 py-3 text-left transition-colors hover:border-zinc-300 hover:bg-white hover:text-zinc-950 dark:border-zinc-800/70 dark:bg-zinc-950/45 dark:hover:border-zinc-700 dark:hover:bg-zinc-950 dark:hover:text-zinc-50"
                  >
                    {link.icon}
                    <span>{link.label}</span>
                  </button>
                ) : (
                  <a
                    href={link.href}
                    target={link.download ? undefined : "_blank"}
                    rel={link.download ? undefined : "noopener noreferrer"}
                    download={link.download}
                    aria-label={link.label}
                    onClick={() => setDrawerOpen(false)}
                    className="flex min-h-11 items-center gap-3 rounded-md border border-zinc-200/70 bg-white/55 px-4 py-3 transition-colors hover:border-zinc-300 hover:bg-white hover:text-zinc-950 dark:border-zinc-800/70 dark:bg-zinc-950/45 dark:hover:border-zinc-700 dark:hover:bg-zinc-950 dark:hover:text-zinc-50"
                  >
                    {link.icon}
                    <span>{link.label}</span>
                  </a>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-auto flex justify-end border-t border-zinc-200/70 py-5 dark:border-zinc-800/70">
            <ThemeToggle className="h-11 w-11 rounded-full border border-zinc-200/75 bg-white/65 shadow-[0_1px_12px_rgba(0,0,0,0.04)] backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/55" />
          </div>
        </div>
      </div>

      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed left-1/2 top-6 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full border border-zinc-200/75 bg-white/85 px-4 py-2 text-sm font-medium text-zinc-700 shadow-[0_1px_20px_rgba(0,0,0,0.08)] backdrop-blur-md transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none dark:border-zinc-800/80 dark:bg-zinc-950/85 dark:text-zinc-200 ${
          emailCopied
            ? "translate-y-0 opacity-100"
            : "-translate-y-4 opacity-0"
        }`}
      >
        <ToastCheckIcon />
        Email copied
      </div>
    </div>
  );
}

function ToastCheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m20 6-11 11-5-5" />
    </svg>
  );
}

function MenuIcon() {
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
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
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
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
