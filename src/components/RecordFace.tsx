"use client";

import Image from "next/image";
import type { MusicAlbum } from "@/config/site";

interface RecordFaceProps {
  album: MusicAlbum;
  className?: string;
  sizes?: string;
}

export function RecordFace({
  album,
  className = "",
  sizes = "180px",
}: RecordFaceProps) {
  return (
    <span
      aria-hidden="true"
      className={`relative block aspect-square ${className}`}
    >
      <Image
        src="/on-rotation/vinyl-record.png"
        alt=""
        fill
        sizes={sizes}
        className="pointer-events-none object-contain"
      />
      <span className="absolute inset-[36.4%] overflow-hidden rounded-full border border-black/30 bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.12)]">
        <Image
          src={album.cover}
          alt=""
          fill
          sizes="64px"
          className="object-cover"
        />
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_36%_28%,rgba(255,255,255,0.24),transparent_35%)] mix-blend-screen" />
      </span>
      <span className="absolute top-1/2 left-1/2 size-[2.2%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#080706] shadow-[0_0_0_1px_rgba(255,255,255,0.18)]" />
    </span>
  );
}
