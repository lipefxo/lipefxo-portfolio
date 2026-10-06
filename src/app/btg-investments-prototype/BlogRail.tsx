"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import styles from "./btg-investments-prototype.module.css";

const stories = [
  { image: "/btg-investments-prototype/blog-01.webp", title: "Como montar uma carteira para o cenário das eleições de 2026?", meta: "ESTRATÉGIA · 8 MIN" },
  { image: "/btg-investments-prototype/blog-02.webp", title: "De quanto preciso para começar a investir?", meta: "GUIA · 6 MIN" },
  { image: "/btg-investments-prototype/blog-03.webp", title: "Trading para iniciantes: veja os primeiros passos antes da Copa BTG Trader", meta: "EDUCAÇÃO · 7 MIN" },
  { image: "/btg-investments-prototype/blog-04.webp", title: "O que é trader? Conheça conceitos essenciais antes da Copa BTG Trader", meta: "GLOSSÁRIO · 5 MIN" },
] as const;

export function BlogRail() {
  const railRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const [currentSlide, setCurrentSlide] = useState(1);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const updateSlide = () => {
      frameRef.current = null;
      const width = rail.clientWidth || 1;
      const nextSlide = Math.min(stories.length, Math.max(1, Math.round(rail.scrollLeft / width) + 1));
      setCurrentSlide((previous) => (previous === nextSlide ? previous : nextSlide));
    };
    const onScroll = () => {
      if (frameRef.current === null) frameRef.current = requestAnimationFrame(updateSlide);
    };
    rail.addEventListener("scroll", onScroll, { passive: true });
    updateSlide();
    return () => {
      rail.removeEventListener("scroll", onScroll);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <div data-btg-reveal>
        <div ref={railRef} className={`${styles.rail} -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8 md:-mx-[72px] md:px-[72px] lg:mx-0 lg:grid lg:snap-none lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:px-0`} aria-label="Artigos em destaque">
          {stories.map((story) => (
            <article key={story.title} className="w-[298px] shrink-0 snap-start overflow-hidden rounded-[2px] border border-[#06172e]/10 bg-white transition-[border-color,transform] duration-200 hover:-translate-y-1 hover:border-[#2B72FF]/30 lg:w-auto">
              <a href="#newsletter" className="group block h-full focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#2B72FF]">
                <div className="relative aspect-[1.32] overflow-hidden bg-[#EEF3F8]"><Image src={story.image} alt="" fill sizes="(max-width: 639px) 298px, (max-width: 1023px) 298px, 25vw" className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035]" /></div>
                <div className="flex min-h-[174px] flex-col p-5"><p className="text-[10px] font-bold tracking-[0.13em] text-[#0055B8]">{story.meta}</p><h3 className="mt-3 text-[17px] font-semibold leading-[1.23] tracking-[-0.03em] text-[#06172E]">{story.title}</h3><span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-[#0055B8]">Ler artigo <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} aria-hidden="true" /></span></div>
              </a>
            </article>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between lg:hidden"><span className="text-xs font-semibold tracking-[0.1em] text-[#06172E]/55">{String(currentSlide).padStart(2, "0")} / {String(stories.length).padStart(2, "0")}</span><div className="flex gap-1.5" aria-hidden="true">{stories.map((story, index) => <span key={story.title} className={`h-1.5 rounded-full transition-[width,background-color] duration-200 ${index + 1 === currentSlide ? "w-5 bg-[#2B72FF]" : "w-1.5 bg-[#06172E]/15"}`} />)}</div></div>
    </div>
  );
}
