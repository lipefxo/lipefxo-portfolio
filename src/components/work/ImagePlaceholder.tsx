import Image from "next/image";
import type { CaseImage } from "@/config/site";

/**
 * Renders a case-study image slot. Until a real `src` is provided it shows a
 * neutral, labeled placeholder box; set `image.src` (e.g. "/work/bags/hero.png")
 * to swap in the real screenshot with no other change.
 */
export function ImagePlaceholder({ image }: { image: CaseImage }) {
  const ratio = image.ratio ?? "16/9";

  return (
    <figure className="w-full">
      <div
        className="relative w-full overflow-hidden rounded-lg"
        style={{ aspectRatio: ratio }}
      >
        {image.src ? (
          <Image
            src={image.src}
            alt={image.alt ?? image.label}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="rounded-lg object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 rounded-lg border border-dashed border-zinc-300 bg-zinc-100 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
            <span className="px-6 text-center text-xs leading-4 text-zinc-500 dark:text-zinc-400">
              {image.label}
            </span>
            <span className="font-mono text-[10px] tracking-wide text-zinc-400 dark:text-zinc-600">
              {ratio}
            </span>
          </div>
        )}
      </div>
      {image.caption && (
        <figcaption className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
          {image.caption}
        </figcaption>
      )}
    </figure>
  );
}
