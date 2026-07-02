import type { CSSProperties } from "react";
import { site } from "@/config/site";
import { LocalTime } from "./LocalTime";
import { ProfileAvatar } from "./ProfileAvatar";
import { SocialIconLinks } from "./SocialIconLinks";

const FLAG_RE = /(\p{Regional_Indicator}{2})/u;

function LocationWithFlag({ text }: { text: string }) {
  return (
    <>
      {text.split(FLAG_RE).map((part, i) =>
        FLAG_RE.test(part) ? (
          <span key={i} className="t-flag-wave">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

export function Hero() {
  return (
    <header
      id="hero"
      className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-5 pt-8 sm:pt-16"
    >
      <h1
        className="t-intro-item flex items-center gap-3 text-zinc-950 dark:text-zinc-50"
        style={{ "--intro-index": 0 } as CSSProperties}
      >
        <ProfileAvatar size={34} className="sm:size-9" />
        <span className="font-brand text-3xl leading-none font-normal tracking-normal sm:text-4xl">
          {site.name}
        </span>
      </h1>
      <p
        className="t-intro-item col-start-1 max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-400"
        style={{ "--intro-index": 1 } as CSSProperties}
      >
        {site.tagline}
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-5 text-zinc-500 dark:text-zinc-500">
          <span>
            <LocationWithFlag text={site.location} />
          </span>
          <LocalTime />
        </span>
      </p>
      <div
        className="t-intro-item col-start-1 lg:hidden"
        style={{ "--intro-index": 2 } as CSSProperties}
      >
        <SocialIconLinks />
      </div>
    </header>
  );
}
