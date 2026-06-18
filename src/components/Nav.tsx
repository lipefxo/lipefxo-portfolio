"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { site } from "@/config/site";
import { TransitionLink } from "./TransitionLink";
import { ProfileAvatar } from "./ProfileAvatar";
import { socialLinks } from "./SocialIconLinks";
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
  const active = isProjectPage || scrolled;

  useEffect(() => {
    if (isProjectPage) return;

    // On the home page the bar reveals as the hero leaves the top of the
    // viewport. On other pages without a hero it reveals once the user
    // scrolls a touch past the top.
    const hero = document.getElementById("hero");
    if (hero) {
      const observer = new IntersectionObserver(
        ([entry]) => setScrolled(!entry.isIntersecting),
        { rootMargin: "-8px 0px 0px 0px" },
      );
      observer.observe(hero);
      return () => observer.disconnect();
    }

    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isProjectPage]);

  const reveal = "transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

  return (
    <div
      data-scrolled={active}
      className={`pointer-events-none fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color,backdrop-filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
        active
          ? "border-zinc-200/70 bg-white/70 backdrop-blur-md dark:border-zinc-800/70 dark:bg-black/50"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto grid max-w-3xl grid-cols-[1fr_auto_1fr] items-center gap-6 px-6 py-3.5 sm:px-10">
        <TransitionLink
          href="/"
          className={`inline-flex items-center gap-2 justify-self-start text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 ${reveal} ${
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

        <ul
          className={`flex items-center justify-self-center gap-4 text-zinc-500 delay-75 dark:text-zinc-400 ${reveal} ${
            active
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-1 opacity-0"
          }`}
        >
          {socialLinks.map((link) => (
            <li key={link.label} className="flex">
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.label}
                className="inline-flex items-center transition-colors hover:text-zinc-950 dark:hover:text-zinc-50"
              >
                {link.icon}
              </a>
            </li>
          ))}
        </ul>

        <ThemeToggle className="pointer-events-auto justify-self-end" />
      </div>
    </div>
  );
}
