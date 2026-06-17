import type { CSSProperties } from "react";
import { site } from "@/config/site";
import { ProfileAvatar } from "./ProfileAvatar";
import { SocialIconLinks } from "./SocialIconLinks";

export function Hero() {
  return (
    <header id="hero" className="flex flex-col gap-6 pt-8 sm:pt-16">
      <h1
        className="t-intro-item flex items-center gap-3 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl dark:text-zinc-50"
        style={{ "--intro-index": 0 } as CSSProperties}
      >
        <ProfileAvatar size={34} className="sm:size-9" />
        {site.name}
      </h1>
      <p
        className="t-intro-item max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-400"
        style={{ "--intro-index": 1 } as CSSProperties}
      >
        {site.tagline}
      </p>
      <div
        className="t-intro-item"
        style={{ "--intro-index": 2 } as CSSProperties}
      >
        <SocialIconLinks />
      </div>
    </header>
  );
}
