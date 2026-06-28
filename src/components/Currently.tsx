import type { CSSProperties } from "react";
import { site } from "@/config/site";
import { CurrentlyCard } from "./CurrentlyCard";
import { Reveal } from "./Reveal";

/**
 * A personal "currently into" section: a small grid of what I'm watching,
 * playing, listening to, and drinking right now. Items float directly on the
 * page (no card) — just an image tile with the label, title, and detail below.
 */
export function Currently() {
  return (
    <section id="currently" className="scroll-mt-20">
      <h2
        className="t-intro-item mb-1 text-base font-medium tracking-tight text-zinc-950 dark:text-zinc-50"
        style={{ "--intro-index": 7 } as CSSProperties}
      >
        Currently
      </h2>
      <p
        className="t-intro-item mb-6 text-[13px] text-zinc-500 dark:text-zinc-400"
        style={{ "--intro-index": 7 } as CSSProperties}
      >
        A little of what I&apos;m into outside of work right now.
      </p>

      <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4">
        {site.currently.map((item, index) => (
          <li key={item.label} className="h-full">
            <Reveal delay={index * 80} className="h-full">
              <CurrentlyCard category={item} />
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
