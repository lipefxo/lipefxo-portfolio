import type { CSSProperties } from "react";
import Image from "next/image";
import { site } from "@/config/site";
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
        style={{ "--intro-index": 12 } as CSSProperties}
      >
        Currently
      </h2>
      <p
        className="t-intro-item mb-6 text-[13px] text-zinc-500 dark:text-zinc-400"
        style={{ "--intro-index": 12 } as CSSProperties}
      >
        A little of what I&apos;m into outside of work right now.
      </p>

      <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4">
        {site.currently.map((item, index) => (
          <Reveal key={item.label} delay={index * 80} className="h-full">
            <li className="flex h-full flex-col gap-3">
              <span className="flex size-[72px] items-center justify-center overflow-hidden rounded-xl bg-zinc-100 text-2xl ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.title}
                    width={72}
                    height={72}
                    sizes="72px"
                    quality={95}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span aria-hidden="true">{item.icon}</span>
                )}
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
                  {item.label}
                </span>
                <span className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                  {item.title}
                </span>
                {item.detail && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {item.detail}
                  </span>
                )}
              </div>
            </li>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
