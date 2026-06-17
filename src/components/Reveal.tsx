"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Stagger delay in ms applied once the element scrolls into view. */
  delay?: number;
  style?: CSSProperties;
}

/**
 * Reveals its children with a soft rise + deblur the first time they scroll
 * into view (matching the intro animation's feel), then stays put. Use for
 * content that should animate in on scroll rather than on initial load.
 */
export function Reveal({ children, className = "", delay = 0, style }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      // Reveal once the element's top edge crosses ~90% of the viewport
      // height — i.e. as it scrolls up into view, and never while still below
      // the fold.
      { rootMargin: "0px 0px -10% 0px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-visible={visible}
      className={`t-reveal ${className}`}
      style={{ "--reveal-delay": `${delay}ms`, ...style } as CSSProperties}
    >
      {children}
    </div>
  );
}
