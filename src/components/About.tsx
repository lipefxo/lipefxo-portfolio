import type { CSSProperties } from "react";
import { site } from "@/config/site";

export function About() {
  return (
    <section
      id="about"
      className="t-intro-item scroll-mt-20"
      style={{ "--intro-index": 3 } as CSSProperties}
    >
      <p className="max-w-2xl text-base leading-7 text-zinc-700 dark:text-zinc-300">
        {site.bio}
      </p>
    </section>
  );
}
