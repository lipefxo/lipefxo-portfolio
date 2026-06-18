import type { CSSProperties } from "react";
import { site } from "@/config/site";

export function About() {
  const shimmerText = "details";
  const shimmerIndex = site.bio.lastIndexOf(shimmerText);
  const hasShimmerText = shimmerIndex >= 0;
  const beforeShimmer = hasShimmerText
    ? site.bio.slice(0, shimmerIndex)
    : site.bio;
  const afterShimmer = hasShimmerText
    ? site.bio.slice(shimmerIndex + shimmerText.length)
    : "";

  return (
    <section
      id="about"
      className="t-intro-item scroll-mt-20"
      style={{ "--intro-index": 3 } as CSSProperties}
    >
      <p className="max-w-[48ch] text-base leading-7 text-zinc-700 dark:text-zinc-300">
        {beforeShimmer}
        {hasShimmerText && (
          <span className="t-shimmer" data-text={shimmerText}>
            {shimmerText}
          </span>
        )}
        {afterShimmer}
      </p>
    </section>
  );
}
