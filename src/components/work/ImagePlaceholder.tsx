"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CaseImage } from "@/config/site";

interface ImagePlaceholderProps {
  image: CaseImage;
  expandable?: boolean;
}

/**
 * Renders a case-study image slot. Until a real `src` is provided it shows a
 * neutral, labeled placeholder box; set `image.src` (e.g. "/work/bags/hero.png")
 * to swap in the real screenshot with no other change.
 */
export function ImagePlaceholder({
  image,
  expandable = true,
}: ImagePlaceholderProps) {
  const ratio = image.ratio ?? "16/9";
  const alt = image.alt ?? image.label;
  const canExpand = expandable && Boolean(image.src);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!lightboxOpen) return;

    const frame = requestAnimationFrame(() => {
      setLightboxVisible(true);
      closeButtonRef.current?.focus();
    });
    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;

    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLightboxOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      setLightboxVisible(false);
      trigger?.focus();
    };
  }, [lightboxOpen]);

  return (
    <figure className="w-full">
      <div
        className="t-case-image group relative w-full overflow-hidden rounded-lg"
        style={{ aspectRatio: ratio }}
      >
        {image.src ? (
          <>
            <Image
              src={image.src}
              alt={alt}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="rounded-lg object-cover"
            />
            {canExpand && (
              <button
                ref={triggerRef}
                type="button"
                aria-label="Open image full screen"
                onClick={() => setLightboxOpen(true)}
                className="t-image-expand-button absolute right-3 bottom-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-black/45 text-white shadow-sm backdrop-blur-md transition-colors hover:bg-black/60 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40 focus-visible:outline-none dark:border-white/10"
              >
                <ExpandIcon />
              </button>
            )}
          </>
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
      {canExpand &&
        lightboxOpen &&
        image.src &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] bg-black/88 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label={alt}
          >
            <div
              className="absolute inset-0"
              aria-hidden="true"
              onClick={() => setLightboxOpen(false)}
            />
            <div
              className="pointer-events-none relative z-10 flex h-dvh min-h-screen w-screen items-center justify-center p-4 sm:p-8"
            >
              <div
                className={`t-modal relative h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] sm:h-[calc(100dvh-4rem)] sm:w-[calc(100vw-4rem)] ${lightboxVisible ? "is-open" : ""}`}
              >
                <Image
                  src={image.src}
                  alt={alt}
                  fill
                  sizes="100vw"
                  className="object-contain drop-shadow-2xl"
                />
              </div>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Close full screen image"
              onClick={() => setLightboxOpen(false)}
              className="fixed top-4 right-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/50 text-white shadow-sm backdrop-blur-md transition-colors hover:bg-black/65 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40 focus-visible:outline-none"
            >
              <CloseIcon />
            </button>
          </div>,
          document.body,
        )}
    </figure>
  );
}

function ExpandIcon() {
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
      <path d="M15 3h6v6" />
      <path d="m21 3-7 7" />
      <path d="M9 21H3v-6" />
      <path d="m3 21 7-7" />
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
