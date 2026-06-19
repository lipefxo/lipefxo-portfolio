"use client";

import CenterUnderline from "@/components/fancy/text/underline-center";
import type { MouseEventHandler, ReactNode } from "react";

type ProjectTextLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  external?: boolean;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

const baseClassName =
  "inline-flex items-center gap-1.5 no-underline transition-colors focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100";

export function ProjectTextLink({
  href,
  children,
  className = "",
  ariaLabel,
  external = true,
  onClick,
}: ProjectTextLinkProps) {
  return (
    <CenterUnderline
      as="a"
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      aria-label={ariaLabel}
      onClick={onClick}
      className={`${baseClassName} ${className}`}
      underlineHeightRatio={0.08}
      underlinePaddingRatio={0.18}
    >
      {children}
    </CenterUnderline>
  );
}
