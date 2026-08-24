"use client";

import { useDialKit, type DialConfig } from "dialkit";

function slider(
  value: number,
  min: number,
  max: number,
  step?: number,
): [number, number, number, number?] {
  return step === undefined ? [value, min, max] : [value, min, max, step];
}

const SPACE_DIAL_CONFIG = {
  scene: {
    background: "#02040b",
    pixelWashOpacity: slider(0.45, 0, 1, 0.01),
    isometricY: slider(0.55, 0.2, 1, 0.01),
    motionSpeed: slider(0.9, 0, 5, 0.01),
  },
  camera: {
    fitPaddingX: slider(77, 0, 240, 1),
    fitPaddingY: slider(161, 0, 360, 1),
    fitScale: slider(0.95, 0.5, 1.2, 0.01),
  },
  starfield: {
    opacity: slider(0.59, 0, 2, 0.01),
    twinkle: slider(2.62, 0, 3, 0.01),
    farAlpha: slider(0.78, 0, 1, 0.01),
    midAlpha: slider(0.94, 0, 1, 0.01),
    nearAlpha: slider(0.89, 0, 1, 0.01),
    warm: "#edc99c",
    cool: "#9bc9e8",
    white: "#dce4ef",
  },
  orbits: {
    color: "#ffffff",
    opacity: slider(0.08, 0, 1, 0.01),
    dash: slider(6, 0, 24, 1),
    moonColor: "#96b7d7",
    moonOpacity: slider(0.24, 0, 1, 0.01),
    moonDash: slider(5, 0, 20, 1),
    hoverColor: "#dfe2e2",
    hoverOpacity: slider(0.9, 0, 1, 0.01),
    hoverGlow: slider(8, 0, 24, 1),
    hoverLineWidth: slider(0.5, 0.5, 3, 0.25),
    hoverHaloWidth: slider(2.25, 1, 10, 0.25),
    hoverRevealDuration: slider(0.6, 0.12, 0.6, 0.01),
    hoverRetractDuration: slider(0.4, 0.08, 0.4, 0.01),
    hoverEasingWeight: slider(1.2, 1, 6, 0.1),
    hoverFrontLength: slider(0.045, 0.01, 0.14, 0.005),
    hoverFrontWidth: slider(2, 1, 5, 0.25),
    hoverFrontIntensity: slider(1, 0, 2, 0.01),
    hoverMeetDuration: slider(0.32, 0.04, 0.4, 0.01),
    hoverMeetIntensity: slider(1.89, 0, 2, 0.01),
  },
  asteroids: {
    count: slider(747, 0, 800, 1),
    radius: slider(209, 120, 900, 1),
    spread: slider(78, 0, 240, 1),
    opacity: slider(1.08, 0, 2, 0.01),
    speed: slider(2.67, 0, 4, 0.01),
    warm: "#a18b72",
    cool: "#655f62",
  },
  glow: {
    sun: slider(1.29, 0, 3, 0.01),
    earth: slider(1.75, 0, 3, 0.01),
    moon: slider(2.04, 0, 3, 0.01),
    motes: slider(73, 0, 80, 1),
    sunCore: "#ffd15b",
    sunMid: "#ff8723",
    sunEdge: "#ff5814",
    moteHot: "#ffcf58",
    moteEmber: "#f06b25",
  },
  living: {
    surfaceMotion: slider(1, 0, 3, 0.01),
    surfaceSpeed: slider(1, 0, 4, 0.01),
    hoverBoost: slider(1.24, 1, 2, 0.01),
    selectedBoost: slider(1.7, 1, 3, 0.01),
    lightResponse: slider(1, 0, 2.5, 0.01),
  },
  interaction: {
    pulseScale: slider(0.12, 0, 0.3, 0.01),
    pulseDuration: slider(0.42, 0.15, 1, 0.01),
    spinSensitivity: slider(1, 0.25, 2.5, 0.01),
    maxSpinSpeed: slider(10, 1, 20, 0.25),
    settleTime: slider(1.7, 0.4, 4, 0.1),
  },
  events: {
    eventInterval: slider(22, 8, 60, 1),
    overlapChance: slider(0.18, 0, 0.6, 0.01),
    trailLength: slider(1, 0.3, 2.5, 0.01),
    cometIntensity: slider(1, 0, 3, 0.01),
    meteorIntensity: slider(1, 0, 3, 0.01),
    flareIntensity: slider(1, 0, 3, 0.01),
    shadowIntensity: slider(1, 0, 3, 0.01),
  },
  missions: {
    spriteScale: slider(1, 0.5, 2, 0.01),
    trailOpacity: slider(0.86, 0, 1.5, 0.01),
    trailLength: slider(1, 0.35, 2.5, 0.01),
    motionSpeed: slider(1, 0, 3, 0.01),
    nearEarthReveal: slider(0.9, 0.45, 1.8, 0.01),
    signalIntensity: slider(1, 0, 2.5, 0.01),
  },
  bodies: {
    sizeScale: slider(0.96, 0.3, 2.5, 0.01),
    minSizeScale: slider(0.88, 0.3, 2.5, 0.01),
    spacingScale: slider(1.31, 0.4, 2.2, 0.01),
    hitScale: slider(1, 0.5, 2, 0.01),
  },
  planets: {
    _collapsed: true,
    sun: {
      size: slider(150, 24, 260, 1),
      minSize: slider(44, 8, 120, 1),
    },
    mercury: {
      size: slider(18, 6, 80, 1),
      minSize: slider(10, 4, 40, 1),
      orbit: slider(112, 40, 400, 1),
      period: slider(68, 8, 400, 1),
    },
    venus: {
      size: slider(28, 6, 90, 1),
      minSize: slider(12, 4, 40, 1),
      orbit: slider(174, 60, 500, 1),
      period: slider(94, 8, 400, 1),
    },
    earth: {
      size: slider(50, 6, 100, 1),
      minSize: slider(14, 4, 48, 1),
      orbit: slider(244, 80, 600, 1),
      period: slider(126, 8, 500, 1),
    },
    moon: {
      size: slider(16, 4, 48, 1),
      minSize: slider(7, 4, 28, 1),
      orbit: slider(39, 12, 120, 1),
      period: slider(24, 6, 120, 1),
    },
    mars: {
      size: slider(31, 6, 80, 1),
      minSize: slider(11, 4, 40, 1),
      orbit: slider(326, 120, 700, 1),
      period: slider(158, 8, 600, 1),
    },
    jupiter: {
      size: slider(68, 12, 160, 1),
      minSize: slider(22, 8, 64, 1),
      orbit: slider(452, 180, 900, 1),
      period: slider(220, 20, 800, 1),
    },
    saturn: {
      size: slider(92, 16, 200, 1),
      minSize: slider(29, 8, 80, 1),
      orbit: slider(570, 220, 1100, 1),
      period: slider(274, 20, 900, 1),
    },
    uranus: {
      size: slider(48, 8, 120, 1),
      minSize: slider(16, 6, 56, 1),
      orbit: slider(680, 280, 1200, 1),
      period: slider(326, 20, 1000, 1),
    },
    neptune: {
      size: slider(47, 8, 120, 1),
      minSize: slider(16, 6, 56, 1),
      orbit: slider(790, 320, 1400, 1),
      period: slider(380, 20, 1200, 1),
    },
  },
  navigator: {
    buttonSize: slider(44, 32, 72, 1),
    bottom: slider(24, 8, 96, 1),
    opacity: slider(1, 0, 1, 0.01),
    ink: "#82969c",
    activeInk: "#dbe8e7",
    fill: "#03080e",
    fillOpacity: slider(0.84, 0, 1, 0.01),
  },
  ui: {
    ink: "#dce8ed",
    muted: "#71838d",
    line: "#6f97a6",
    lineOpacity: slider(0.76, 0, 1, 0.01),
  },
} satisfies DialConfig;

export type SpaceDials = ReturnType<typeof useSpaceDials>;

export function hexToRgba(hex: string, alpha: number) {
  const raw = hex.replace("#", "");
  const value =
    raw.length === 3
      ? raw
          .split("")
          .map((character) => `${character}${character}`)
          .join("")
      : raw.slice(0, 6);
  const numeric = Number.parseInt(value, 16);
  if (Number.isNaN(numeric)) return `rgba(0, 0, 0, ${alpha})`;
  const red = (numeric >> 16) & 255;
  const green = (numeric >> 8) & 255;
  const blue = numeric & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function useSpaceDials() {
  return useDialKit("Space", SPACE_DIAL_CONFIG, {
    id: "space-explorer",
    persist: true,
  });
}
