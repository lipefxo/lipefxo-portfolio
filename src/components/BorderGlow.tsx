"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

interface BorderGlowProps {
  children: ReactNode;
  className?: string;
  edgeSensitivity?: number;
  glowColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
  coneSpread?: number;
  animated?: boolean;
  colors?: string[];
}

interface AnimateOpts {
  start?: number;
  end?: number;
  duration?: number;
  delay?: number;
  ease?: (t: number) => number;
  onUpdate: (v: number) => void;
  onEnd?: () => void;
}

const GRADIENT_POSITIONS = [
  "80% 55%",
  "69% 34%",
  "8% 6%",
  "41% 38%",
  "86% 85%",
  "82% 18%",
  "51% 4%",
];
const COLOR_MAP = [0, 1, 2, 0, 1, 2, 1];

function parseHSL(hslStr: string): { h: number; s: number; l: number } {
  const match = hslStr.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
  if (!match) return { h: 40, s: 80, l: 80 };
  return {
    h: parseFloat(match[1]),
    s: parseFloat(match[2]),
    l: parseFloat(match[3]),
  };
}

function buildBoxShadow(glowColor: string, intensity: number): string {
  const { h, s, l } = parseHSL(glowColor);
  const base = `${h}deg ${s}% ${l}%`;
  const layers: [number, number, number, number, number, boolean][] = [
    [0, 0, 0, 1, 100, true],
    [0, 0, 1, 0, 60, true],
    [0, 0, 3, 0, 50, true],
    [0, 0, 6, 0, 40, true],
    [0, 0, 15, 0, 30, true],
    [0, 0, 25, 2, 20, true],
    [0, 0, 50, 2, 10, true],
    [0, 0, 1, 0, 60, false],
    [0, 0, 3, 0, 50, false],
    [0, 0, 6, 0, 40, false],
    [0, 0, 15, 0, 30, false],
    [0, 0, 25, 2, 20, false],
    [0, 0, 50, 2, 10, false],
  ];
  return layers
    .map(([x, y, blur, spread, alpha, inset]) => {
      const a = Math.min(alpha * intensity, 100);
      return `${inset ? "inset " : ""}${x}px ${y}px ${blur}px ${spread}px hsl(${base} / ${a}%)`;
    })
    .join(", ");
}

function easeOutCubic(x: number) {
  return 1 - Math.pow(1 - x, 3);
}

function easeInCubic(x: number) {
  return x * x * x;
}

function animateValue({
  start = 0,
  end = 100,
  duration = 1000,
  delay = 0,
  ease = easeOutCubic,
  onUpdate,
  onEnd,
}: AnimateOpts) {
  const timeout = window.setTimeout(() => {
    const t0 = performance.now();
    function tick(now: number) {
      const t = Math.min((now - t0) / duration, 1);
      onUpdate(start + (end - start) * ease(t));
      if (t < 1) requestAnimationFrame(tick);
      else onEnd?.();
    }
    requestAnimationFrame(tick);
  }, delay);

  return () => window.clearTimeout(timeout);
}

function buildMeshGradients(colors: string[]): string[] {
  const gradients: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const c = colors[Math.min(COLOR_MAP[i], colors.length - 1)];
    gradients.push(
      `radial-gradient(at ${GRADIENT_POSITIONS[i]}, ${c} 0px, transparent 50%)`,
    );
  }
  gradients.push(`linear-gradient(${colors[0]} 0 100%)`);
  return gradients;
}

export function BorderGlow({
  children,
  className = "",
  edgeSensitivity = 30,
  glowColor = "190 90 70",
  backgroundColor = "transparent",
  borderRadius = 8,
  glowRadius = 32,
  glowIntensity = 0.35,
  coneSpread = 25,
  animated = false,
  colors = ["#14b8a6", "#a855f7", "#38bdf8"],
}: BorderGlowProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [cursorAngle, setCursorAngle] = useState(45);
  const [edgeProximity, setEdgeProximity] = useState(0);
  const [sweepActive, setSweepActive] = useState(false);

  const getCenterOfElement = useCallback((el: HTMLElement) => {
    const { width, height } = el.getBoundingClientRect();
    return [width / 2, height / 2];
  }, []);

  const getEdgeProximity = useCallback(
    (el: HTMLElement, x: number, y: number) => {
      const [cx, cy] = getCenterOfElement(el);
      const dx = x - cx;
      const dy = y - cy;
      let kx = Infinity;
      let ky = Infinity;
      if (dx !== 0) kx = cx / Math.abs(dx);
      if (dy !== 0) ky = cy / Math.abs(dy);
      return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
    },
    [getCenterOfElement],
  );

  const getCursorAngle = useCallback(
    (el: HTMLElement, x: number, y: number) => {
      const [cx, cy] = getCenterOfElement(el);
      const dx = x - cx;
      const dy = y - cy;
      if (dx === 0 && dy === 0) return 0;
      const degrees = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      return degrees < 0 ? degrees + 360 : degrees;
    },
    [getCenterOfElement],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const card = cardRef.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setEdgeProximity(getEdgeProximity(card, x, y));
      setCursorAngle(getCursorAngle(card, x, y));
    },
    [getEdgeProximity, getCursorAngle],
  );

  useEffect(() => {
    if (!animated) return;

    const startFrame = requestAnimationFrame(() => {
      setSweepActive(true);
      setCursorAngle(110);
    });
    const cleanups = [
      animateValue({ duration: 500, onUpdate: (v) => setEdgeProximity(v / 100) }),
      animateValue({
        ease: easeInCubic,
        duration: 1500,
        end: 50,
        onUpdate: (v) => setCursorAngle(355 * (v / 100) + 110),
      }),
      animateValue({
        ease: easeOutCubic,
        delay: 1500,
        duration: 2250,
        start: 50,
        end: 100,
        onUpdate: (v) => setCursorAngle(355 * (v / 100) + 110),
      }),
      animateValue({
        ease: easeInCubic,
        delay: 2500,
        duration: 1500,
        start: 100,
        end: 0,
        onUpdate: (v) => setEdgeProximity(v / 100),
        onEnd: () => setSweepActive(false),
      }),
    ];

    return () => {
      cancelAnimationFrame(startFrame);
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [animated]);

  const colorSensitivity = edgeSensitivity + 20;
  const isVisible = isHovered || sweepActive;
  const borderOpacity = isVisible
    ? 0.72 *
      Math.max(
        0.16,
        (edgeProximity * 100 - colorSensitivity) / (100 - colorSensitivity),
      )
    : 0;
  const glowOpacity = isVisible
    ? Math.max(0, (edgeProximity * 100 - edgeSensitivity) / (100 - edgeSensitivity))
    : 0;
  const meshGradients = buildMeshGradients(colors);
  const borderBg = meshGradients.map((g) => `${g} border-box`);
  const angleDeg = `${cursorAngle.toFixed(3)}deg`;
  const coneMask = `conic-gradient(from ${angleDeg} at center, black ${coneSpread}%, transparent ${coneSpread + 15}%, transparent ${100 - coneSpread - 15}%, black ${100 - coneSpread}%)`;
  // Confine the mesh gradient to a 1px border ring: the full box minus the
  // content box, intersected with the cursor cone above. Without this the
  // gradient bleeds through the card body whenever the inner surface turns
  // translucent (e.g. on hover).
  const ringMask = `${coneMask}, linear-gradient(#000 0 0), linear-gradient(#000 0 0)`;

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      className={`relative isolate grid ${className}`}
      style={{
        background: backgroundColor,
        borderRadius: `${borderRadius}px`,
        // Lift the whole card (glow ring + content together) on hover so the
        // glow stays aligned with the surface it frames.
        transform: `translate3d(0, ${isHovered ? "-1px" : "0px"}, 0.01px)`,
        transition: "transform 0.2s ease-out",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 z-0 rounded-[inherit]"
        style={{
          background: borderBg.join(", "),
          opacity: borderOpacity,
          padding: "1px",
          maskImage: ringMask,
          WebkitMaskImage: ringMask,
          maskClip: "border-box, border-box, content-box",
          WebkitMaskClip: "border-box, border-box, content-box",
          maskComposite: "intersect, subtract, add",
          WebkitMaskComposite: "source-in, source-out, source-over",
          transition: isVisible
            ? "opacity 0.25s ease-out"
            : "opacity 0.75s ease-in-out",
        }}
      />

      <span
        className="pointer-events-none absolute z-[1] rounded-[inherit]"
        style={{
          inset: `${-glowRadius}px`,
          maskImage: `conic-gradient(from ${angleDeg} at center, black 2.5%, transparent 10%, transparent 90%, black 97.5%)`,
          WebkitMaskImage: `conic-gradient(from ${angleDeg} at center, black 2.5%, transparent 10%, transparent 90%, black 97.5%)`,
          opacity: glowOpacity,
          mixBlendMode: "plus-lighter",
          transition: isVisible
            ? "opacity 0.25s ease-out"
            : "opacity 0.75s ease-in-out",
        }}
      >
        <span
          className="absolute rounded-[inherit]"
          style={{
            inset: `${glowRadius}px`,
            boxShadow: buildBoxShadow(glowColor, glowIntensity),
          }}
        />
      </span>

      <div className="relative z-[2] flex h-full flex-col rounded-[inherit] p-px">
        {children}
      </div>
    </div>
  );
}
