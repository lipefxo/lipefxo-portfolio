export const SPACE_DIALS = {
  scene: {
    background: "#02040b",
    pixelWashOpacity: 0.45,
    isometricY: 0.55,
    motionSpeed: 0.9,
  },
  camera: {
    fitPaddingX: 77,
    fitPaddingY: 161,
    fitScale: 0.95,
  },
  starfield: {
    opacity: 0.59,
    twinkle: 2.62,
    farAlpha: 0.78,
    midAlpha: 0.94,
    nearAlpha: 0.89,
    warm: "#edc99c",
    cool: "#9bc9e8",
    white: "#dce4ef",
  },
  orbits: {
    color: "#ffffff",
    opacity: 0.08,
    dash: 6,
    moonColor: "#96b7d7",
    moonOpacity: 0.24,
    moonDash: 5,
    hoverColor: "#dfe2e2",
    hoverOpacity: 0.9,
    hoverGlow: 8,
    hoverLineWidth: 0.5,
    hoverHaloWidth: 2.25,
    hoverRevealDuration: 0.6,
    hoverRetractDuration: 0.4,
    hoverEasingWeight: 1.2,
    hoverFrontLength: 0.045,
    hoverFrontWidth: 2,
    hoverFrontIntensity: 1,
    hoverMeetDuration: 0.32,
    hoverMeetIntensity: 1.89,
  },
  asteroids: {
    count: 747,
    radius: 209,
    spread: 78,
    opacity: 1.08,
    speed: 2.67,
    warm: "#a18b72",
    cool: "#655f62",
  },
  glow: {
    sun: 1.29,
    earth: 1.75,
    moon: 2.04,
    motes: 73,
    sunCore: "#ffd15b",
    sunMid: "#ff8723",
    sunEdge: "#ff5814",
    moteHot: "#ffcf58",
    moteEmber: "#f06b25",
  },
  living: {
    surfaceMotion: 1,
    surfaceSpeed: 1,
    hoverBoost: 1.24,
    selectedBoost: 1.7,
    lightResponse: 1,
  },
  interaction: {
    pulseScale: 0.12,
    pulseDuration: 0.42,
    spinSensitivity: 1,
    maxSpinSpeed: 10,
    settleTime: 1.7,
  },
  cursorLens: {
    radius: 150,
    strength: 4,
    followLag: 0.08,
    fadeDuration: 0.16,
  },
  events: {
    eventInterval: 22,
    overlapChance: 0.18,
    trailLength: 1,
    cometIntensity: 1,
    meteorIntensity: 1,
    flareIntensity: 1,
    shadowIntensity: 1,
  },
  missions: {
    spriteScale: 1,
    trailOpacity: 0.86,
    trailLength: 1,
    motionSpeed: 1,
    nearEarthReveal: 0.9,
    signalIntensity: 1,
  },
  bodies: {
    sizeScale: 0.96,
    minSizeScale: 0.88,
    spacingScale: 1.31,
    hitScale: 1,
  },
  planets: {
    sun: {
      scale: 1,
      minSize: 46,
    },
    mercury: {
      scale: 1,
      minSize: 9,
      orbit: 112,
      period: 68,
    },
    venus: {
      scale: 1,
      minSize: 12,
      orbit: 174,
      period: 94,
    },
    earth: {
      scale: 1,
      minSize: 13,
      orbit: 244,
      period: 126,
    },
    moon: {
      scale: 1,
      minSize: 7,
      orbit: 39,
      period: 24,
    },
    mars: {
      scale: 1,
      minSize: 10,
      orbit: 326,
      period: 158,
    },
    jupiter: {
      scale: 1,
      minSize: 24,
      orbit: 452,
      period: 220,
    },
    saturn: {
      scale: 1,
      minSize: 22,
      orbit: 570,
      period: 274,
    },
    uranus: {
      scale: 1,
      minSize: 16,
      orbit: 680,
      period: 326,
    },
    neptune: {
      scale: 1,
      minSize: 15,
      orbit: 790,
      period: 380,
    },
  },
  navigator: {
    buttonSize: 44,
    bottom: 24,
    opacity: 1,
    ink: "#82969c",
    activeInk: "#dbe8e7",
    fill: "#03080e",
    fillOpacity: 0.84,
  },
  ui: {
    ink: "#dce8ed",
    muted: "#71838d",
    line: "#6f97a6",
    lineOpacity: 0.76,
  },
};

export type SpaceDials = typeof SPACE_DIALS;

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
