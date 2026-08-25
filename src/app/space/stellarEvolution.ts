import { hexToRgba, type SpaceDials } from "./useSpaceDials";

export type StellarPhase =
  | "idle"
  | "collapsing"
  | "catastrophe"
  | "void"
  | "rebirth";

export type StellarCamera = {
  x: number;
  y: number;
  zoom: number;
};

export type StellarPoint = {
  x: number;
  y: number;
};

export type StellarPalette = readonly [string, string, string, string, string];

export type StellarEvolutionState = {
  clicks: number;
  displayedProgress: number;
  phase: StellarPhase;
  phaseElapsed: number;
  savedCamera: StellarCamera | null;
  navigationLocked: boolean;
};

export type StellarAppearance = {
  progress: number;
  quantizedStep: number;
  spriteKey: number;
  palette: StellarPalette;
  sizeScale: number;
  glowCore: string;
  glowMid: string;
  glowEdge: string;
  glowIntensity: number;
  moteHot: string;
  moteEmber: string;
  moteCountScale: number;
  surfaceActivity: number;
  prominenceA: string;
  prominenceB: string;
  sceneTint: string;
  sceneTintAlpha: number;
  isBlackHole: boolean;
  blackHoleIntensity: number;
};

export type BlackHoleVisualFrame = {
  visible: boolean;
  opacity: number;
  horizonRadius: number;
  diskRadiusX: number;
  diskRadiusY: number;
  fieldRadius: number;
  diskReveal: number;
  photonIntensity: number;
  lensStrength: number;
  fieldStrength: number;
  flash: number;
  shockwave: number;
  textureFrame: number;
  haloPulse: number;
};

export type CatastropheFrame = {
  active: boolean;
  phase: StellarPhase;
  spiral: number;
  rebirth: number;
  orbitFade: number;
  eventsSuspended: boolean;
  trailsSuspended: boolean;
  burst: number;
};

export type CatastrophePose = {
  world: StellarPoint;
  scale: number;
  alpha: number;
  swallowed: boolean;
};

export type StellarUiSnapshot = {
  clicks: number;
  phase: StellarPhase;
  locked: boolean;
  sunLabel: string;
  announcement: string;
};

const TAU = Math.PI * 2;
const CLICK_LERP_SECONDS = 0.35;
const FORMATION_SECONDS = 3;
const CAMERA_REFIT_SECONDS = 0.9;
const COMPRESSION_END = 0.55;
const FLASH_END = 0.72;
const DARKNESS_END = 1.05;
const REVEAL_END = 2.25;
const CATASTROPHE_SECONDS = 10;
const VOID_SECONDS = 1;
const REBIRTH_SECONDS = 2;
const REDUCED_HOLD_SECONDS = 2;
const MAX_CLICKS = 10;
const SYSTEM_SPAN = 820;

const NORMAL_PALETTE: StellarPalette = [
  "#b92f16",
  "#e95d1d",
  "#ff9728",
  "#ffd45a",
  "#fff2a1",
];
const HOT_PALETTE: StellarPalette = [
  "#d44512",
  "#ff6e1c",
  "#ffb347",
  "#ffe27a",
  "#fff6d0",
];
const WHITE_HOT_PALETTE: StellarPalette = [
  "#ff7a32",
  "#ffc36a",
  "#fff1c4",
  "#ffffff",
  "#e8f4ff",
];
const BLUE_DWARF_PALETTE: StellarPalette = [
  "#1a4a8c",
  "#3d7ad4",
  "#7ec8ff",
  "#c8eeff",
  "#f4fbff",
];
const UNSTABLE_PALETTE: StellarPalette = [
  "#2a3aa8",
  "#5b8cff",
  "#b8e0ff",
  "#fff4d8",
  "#ffffff",
];
const CRITICAL_PALETTE: StellarPalette = [
  "#12183a",
  "#3a5cff",
  "#9ad0ff",
  "#ffe6b0",
  "#ffffff",
];

const DEFAULT_SUN_FLAVOR =
  "A small god of fire, holding every wandering world in its light.";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function hashNumber(value: number) {
  const x = Math.sin(value * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function parseHex(hex: string) {
  const raw = hex.replace("#", "");
  const value =
    raw.length === 3
      ? raw
          .split("")
          .map((character) => `${character}${character}`)
          .join("")
      : raw.slice(0, 6);
  const numeric = Number.parseInt(value, 16);
  if (Number.isNaN(numeric)) return { r: 0, g: 0, b: 0 };
  return {
    r: (numeric >> 16) & 255,
    g: (numeric >> 8) & 255,
    b: numeric & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (channel: number) =>
    clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function lerpHex(a: string, b: string, t: number) {
  const from = parseHex(a);
  const to = parseHex(b);
  return rgbToHex(
    lerp(from.r, to.r, t),
    lerp(from.g, to.g, t),
    lerp(from.b, to.b, t),
  );
}

function lerpPalette(a: StellarPalette, b: StellarPalette, t: number): StellarPalette {
  return [
    lerpHex(a[0], b[0], t),
    lerpHex(a[1], b[1], t),
    lerpHex(a[2], b[2], t),
    lerpHex(a[3], b[3], t),
    lerpHex(a[4], b[4], t),
  ];
}

function easeInCubic(t: number) {
  return t * t * t;
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function mixKeyframe(
  progress: number,
  fromAt: number,
  toAt: number,
  from: StellarPalette,
  to: StellarPalette,
) {
  const span = Math.max(0.0001, toAt - fromAt);
  return lerpPalette(from, to, clamp((progress - fromAt) / span, 0, 1));
}

export function createStellarEvolutionState(): StellarEvolutionState {
  return {
    clicks: 0,
    displayedProgress: 0,
    phase: "idle",
    phaseElapsed: 0,
    savedCamera: null,
    navigationLocked: false,
  };
}

export function isStellarCinematic(state: StellarEvolutionState) {
  return state.phase !== "idle";
}

export function stellarNeedsAnimation(state: StellarEvolutionState) {
  if (state.phase !== "idle") return true;
  return Math.abs(state.displayedProgress - state.clicks) > 0.0008;
}

function sunStageName(clicks: number, phase: StellarPhase) {
  if (phase === "rebirth") return "The solar system is being restored.";
  if (phase === "void" || phase === "catastrophe" || phase === "collapsing" || clicks >= 10) {
    return "The Sun has collapsed into a black hole.";
  }
  if (clicks >= 6) return `Unstable blue dwarf. Activation ${clicks} of 10.`;
  if (clicks >= 5) return "The Sun has become a blue dwarf.";
  if (clicks >= 1) return `The Sun is growing hotter. Activation ${clicks} of 10.`;
  return DEFAULT_SUN_FLAVOR;
}

export function getSunAccessibleLabel(clicks: number, phase: StellarPhase) {
  const stage = sunStageName(clicks, phase);
  if (phase === "idle" && clicks === 0) {
    return `Sun. ${DEFAULT_SUN_FLAVOR} Click to inspect; drag horizontally to spin.`;
  }
  return `Sun. ${stage} Click to inspect; drag horizontally to spin.`;
}

export function getStellarAnnouncement(clicks: number, phase: StellarPhase) {
  if (phase === "rebirth") return "The solar system is restored.";
  if (phase === "catastrophe") return "The solar system is falling into the black hole.";
  if (phase === "void" || phase === "collapsing" || clicks >= 10) {
    return "The Sun has collapsed into a black hole.";
  }
  if (clicks === 5) return "The Sun has become a blue dwarf.";
  if (clicks >= 6) return `Blue dwarf destabilizing. Activation ${clicks} of 10.`;
  if (clicks >= 1) return `Sun heating. Activation ${clicks} of 10.`;
  return "";
}

export function getStellarUiSnapshot(state: StellarEvolutionState): StellarUiSnapshot {
  return {
    clicks: state.clicks,
    phase: state.phase,
    locked: state.navigationLocked,
    sunLabel: getSunAccessibleLabel(state.clicks, state.phase),
    announcement: getStellarAnnouncement(state.clicks, state.phase),
  };
}

function copyCamera(camera: StellarCamera): StellarCamera {
  return { x: camera.x, y: camera.y, zoom: camera.zoom };
}

function lerpCamera(from: StellarCamera, to: StellarCamera, t: number): StellarCamera {
  return {
    x: lerp(from.x, to.x, t),
    y: lerp(from.y, to.y, t),
    zoom: lerp(from.zoom, to.zoom, t),
  };
}

export function activateSun(
  state: StellarEvolutionState,
  camera: StellarCamera,
  reducedMotion: boolean,
): StellarUiSnapshot | null {
  if (state.navigationLocked || state.phase !== "idle") return null;
  if (state.clicks >= MAX_CLICKS) return null;

  state.clicks += 1;
  if (reducedMotion) state.displayedProgress = state.clicks;

  if (state.clicks >= MAX_CLICKS) {
    state.savedCamera = copyCamera(camera);
    state.navigationLocked = true;
    if (reducedMotion) {
      state.phase = "void";
      state.phaseElapsed = 0;
      state.displayedProgress = MAX_CLICKS;
    } else {
      state.phase = "collapsing";
      state.phaseElapsed = 0;
    }
  }

  return getStellarUiSnapshot(state);
}

function finishRestore(state: StellarEvolutionState) {
  state.clicks = 0;
  state.displayedProgress = 0;
  state.phase = "idle";
  state.phaseElapsed = 0;
  state.savedCamera = null;
  state.navigationLocked = false;
}

export function skipStellarSequence(state: StellarEvolutionState): StellarUiSnapshot | null {
  if (state.phase === "idle" && state.clicks === 0) return null;
  finishRestore(state);
  return {
    ...getStellarUiSnapshot(state),
    announcement: "The solar system is restored.",
  };
}

export function stepStellarEvolution(
  state: StellarEvolutionState,
  deltaSeconds: number,
  reducedMotion: boolean,
) {
  if (state.phase === "idle") {
    if (reducedMotion) {
      state.displayedProgress = state.clicks;
      return;
    }
    const difference = state.clicks - state.displayedProgress;
    if (Math.abs(difference) <= 0.0008) {
      state.displayedProgress = state.clicks;
      return;
    }
    const step = (deltaSeconds / CLICK_LERP_SECONDS) * Math.sign(difference);
    if (Math.abs(step) >= Math.abs(difference)) state.displayedProgress = state.clicks;
    else state.displayedProgress += step;
    return;
  }

  state.phaseElapsed += deltaSeconds;

  if (reducedMotion) {
    if (state.phaseElapsed >= REDUCED_HOLD_SECONDS) finishRestore(state);
    else state.displayedProgress = MAX_CLICKS;
    return;
  }

  if (state.phase === "collapsing") {
    const compression = clamp(state.phaseElapsed / COMPRESSION_END, 0, 1);
    state.displayedProgress = lerp(
      Math.min(9, state.displayedProgress),
      MAX_CLICKS,
      easeInCubic(compression),
    );
    if (state.phaseElapsed >= FORMATION_SECONDS) {
      state.phase = "catastrophe";
      state.phaseElapsed = 0;
      state.displayedProgress = MAX_CLICKS;
    }
    return;
  }

  if (state.phase === "catastrophe") {
    state.displayedProgress = MAX_CLICKS;
    if (state.phaseElapsed >= CATASTROPHE_SECONDS) {
      state.phase = "void";
      state.phaseElapsed = 0;
    }
    return;
  }

  if (state.phase === "void") {
    state.displayedProgress = MAX_CLICKS;
    if (state.phaseElapsed >= VOID_SECONDS) {
      state.phase = "rebirth";
      state.phaseElapsed = 0;
    }
    return;
  }

  if (state.phaseElapsed >= REBIRTH_SECONDS) {
    finishRestore(state);
    return;
  }

  const rebirth = clamp(state.phaseElapsed / REBIRTH_SECONDS, 0, 1);
  state.displayedProgress = lerp(MAX_CLICKS, 0, easeOutCubic(rebirth));
}

export function getStellarCamera(
  state: StellarEvolutionState,
  current: StellarCamera,
  systemView: StellarCamera,
  reducedMotion: boolean,
): StellarCamera {
  if (!state.navigationLocked || !state.savedCamera) return current;
  if (reducedMotion) return systemView;

  if (state.phase === "collapsing") {
    const t = easeInOutCubic(
      clamp(state.phaseElapsed / CAMERA_REFIT_SECONDS, 0, 1),
    );
    return lerpCamera(state.savedCamera, systemView, t);
  }

  if (state.phase === "catastrophe" || state.phase === "void") return systemView;

  if (state.phase === "rebirth") {
    const t = easeInOutCubic(clamp(state.phaseElapsed / REBIRTH_SECONDS, 0, 1));
    return lerpCamera(systemView, state.savedCamera, t);
  }

  return current;
}

export function getStellarAppearance(
  state: StellarEvolutionState,
  dials: SpaceDials,
): StellarAppearance {
  const progress = clamp(state.displayedProgress, 0, MAX_CLICKS);
  const quantizedStep = Math.round(progress * 8);
  const phaseKey =
    state.phase === "rebirth" ? 300 : state.phase === "void" ? 200 : state.phase === "catastrophe" ? 100 : 0;
  let palette: StellarPalette = NORMAL_PALETTE;
  let sizeScale = 1;
  let glowIntensity = 1;
  let moteCountScale = 1;
  let surfaceActivity = 1;
  let glowCore = dials.glow.sunCore;
  let glowMid = dials.glow.sunMid;
  let glowEdge = dials.glow.sunEdge;
  let moteHot = dials.glow.moteHot;
  let moteEmber = dials.glow.moteEmber;
  let prominenceA = "#ff7a27";
  let prominenceB = "#ffc34e";
  let sceneTint = "#ff8a3a";
  let sceneTintAlpha = 0;
  let isBlackHole = false;
  let blackHoleIntensity = 0;

  if (progress <= 2.5) {
    const t = progress / 2.5;
    palette = lerpPalette(NORMAL_PALETTE, HOT_PALETTE, t);
    sizeScale = lerp(1, 1.05, t);
    glowIntensity = lerp(1, 1.28, t);
    moteCountScale = lerp(1, 1.18, t);
    surfaceActivity = lerp(1, 1.35, t);
    glowCore = lerpHex(dials.glow.sunCore, "#fff4c4", t);
    glowMid = lerpHex(dials.glow.sunMid, "#ffb04a", t);
    glowEdge = lerpHex(dials.glow.sunEdge, "#ff6a24", t);
    moteHot = lerpHex(dials.glow.moteHot, "#fff6d0", t);
    sceneTintAlpha = t * 0.08;
  } else if (progress <= 5) {
    const t = (progress - 2.5) / 2.5;
    palette = mixKeyframe(progress, 2.5, 4, HOT_PALETTE, WHITE_HOT_PALETTE);
    if (progress > 4) {
      palette = mixKeyframe(progress, 4, 5, WHITE_HOT_PALETTE, BLUE_DWARF_PALETTE);
    }
    sizeScale = lerp(1.05, 0.62, easeInOutCubic(t));
    glowIntensity = lerp(1.28, 1.12, t);
    moteCountScale = lerp(1.18, 0.82, t);
    surfaceActivity = lerp(1.35, 1.15, t);
    glowCore = lerpHex("#fff4c4", "#e8f6ff", t);
    glowMid = lerpHex("#ffb04a", "#7ec8ff", t);
    glowEdge = lerpHex("#ff6a24", "#3d7ad4", t);
    moteHot = lerpHex("#fff6d0", "#d8f0ff", t);
    moteEmber = lerpHex(dials.glow.moteEmber, "#7ec8ff", t);
    prominenceA = lerpHex("#ff7a27", "#6eb8ff", t);
    prominenceB = lerpHex("#ffc34e", "#d8f4ff", t);
    sceneTint = lerpHex("#ff8a3a", "#6ec8ff", t);
    sceneTintAlpha = lerp(0.08, 0.12, t);
  } else if (progress <= 9) {
    const t = (progress - 5) / 4;
    palette = mixKeyframe(progress, 5, 7.5, BLUE_DWARF_PALETTE, UNSTABLE_PALETTE);
    if (progress > 7.5) {
      palette = mixKeyframe(progress, 7.5, 9, UNSTABLE_PALETTE, CRITICAL_PALETTE);
    }
    sizeScale = lerp(0.62, 0.5, t);
    glowIntensity = lerp(1.12, 1.55, t);
    moteCountScale = lerp(0.82, 1.35, t);
    surfaceActivity = lerp(1.15, 2.05, t);
    glowCore = lerpHex("#e8f6ff", "#ffffff", t);
    glowMid = lerpHex("#7ec8ff", "#9ad0ff", t);
    glowEdge = lerpHex("#3d7ad4", "#5a4cff", t);
    moteHot = "#ffffff";
    moteEmber = lerpHex("#7ec8ff", "#ffd8a0", t);
    prominenceA = lerpHex("#6eb8ff", "#ffd18a", t);
    prominenceB = "#ffffff";
    sceneTint = lerpHex("#6ec8ff", "#8a6cff", t);
    sceneTintAlpha = lerp(0.12, 0.18, t);
  } else {
    const t = clamp(progress - 9, 0, 1);
    palette = CRITICAL_PALETTE;
    sizeScale = lerp(0.5, 0.34, easeInCubic(t));
    glowIntensity = lerp(1.55, 0.42, t);
    moteCountScale = lerp(1.35, 0.2, t);
    surfaceActivity = lerp(2.05, 0.2, t);
    glowCore = lerpHex("#ffffff", "#ffd8a0", t);
    glowMid = lerpHex("#9ad0ff", "#ff6a2a", t);
    glowEdge = lerpHex("#5a4cff", "#3a1020", t);
    moteHot = "#ffd8a0";
    moteEmber = "#ff5a24";
    prominenceA = "#ff7a27";
    prominenceB = "#3a1020";
    sceneTint = lerpHex("#8a6cff", "#140814", t);
    sceneTintAlpha = lerp(0.18, 0.28, t);
    isBlackHole = t > 0.28;
    blackHoleIntensity = easeInOutCubic(clamp((t - 0.18) / 0.82, 0, 1));
  }

  if (state.phase === "catastrophe" || state.phase === "void") {
    isBlackHole = true;
    blackHoleIntensity = 1;
    sizeScale = 0.34;
    surfaceActivity = 0;
    moteCountScale = 0.12;
    glowIntensity = 0.38;
    sceneTint = "#12060c";
    sceneTintAlpha = state.phase === "void" ? 0.34 : 0.26;
  }

  if (state.phase === "rebirth") {
    const rebirth = clamp(state.phaseElapsed / REBIRTH_SECONDS, 0, 1);
    const flash = rebirth < 0.28 ? 1 - rebirth / 0.28 : clamp(1 - (rebirth - 0.28) / 0.22, 0, 1);
    isBlackHole = rebirth < 0.22;
    blackHoleIntensity = clamp(1 - rebirth / 0.22, 0, 1);
    sizeScale = lerp(0.2, 1, easeOutCubic(rebirth));
    palette = lerpPalette(WHITE_HOT_PALETTE, NORMAL_PALETTE, easeOutCubic(rebirth));
    glowCore = lerpHex("#ffffff", dials.glow.sunCore, rebirth);
    glowMid = lerpHex("#ffe9a8", dials.glow.sunMid, rebirth);
    glowEdge = lerpHex("#ff9a4a", dials.glow.sunEdge, rebirth);
    glowIntensity = lerp(1.8, 1, rebirth);
    moteCountScale = lerp(1.8, 1, rebirth);
    surfaceActivity = lerp(1.6, 1, rebirth);
    moteHot = lerpHex("#ffffff", dials.glow.moteHot, rebirth);
    moteEmber = lerpHex("#ffd18a", dials.glow.moteEmber, rebirth);
    prominenceA = lerpHex("#ffffff", "#ff7a27", rebirth);
    prominenceB = lerpHex("#ffe9a8", "#ffc34e", rebirth);
    sceneTint = "#fff4d8";
    sceneTintAlpha = 0.08 + flash * 0.42;
  }

  return {
    progress,
    quantizedStep,
    spriteKey: quantizedStep + phaseKey,
    palette,
    sizeScale,
    glowCore,
    glowMid,
    glowEdge,
    glowIntensity,
    moteHot,
    moteEmber,
    moteCountScale,
    surfaceActivity,
    prominenceA,
    prominenceB,
    sceneTint,
    sceneTintAlpha,
    isBlackHole,
    blackHoleIntensity,
  };
}

export function getBlackHoleVisualFrame(
  state: StellarEvolutionState,
  viewport: { width: number; height: number },
  reducedMotion: boolean,
  elapsedSeconds: number,
): BlackHoleVisualFrame {
  const visualScale = 0.5;
  const minViewport = Math.max(1, Math.min(viewport.width, viewport.height));
  const baseHorizonRadius = clamp(minViewport * 0.07, 28, 88) * visualScale;
  const baseDiskRadiusX = clamp(minViewport * 0.29, 120, 360) * visualScale;
  const baseFieldRadius = clamp(minViewport * 0.45, 180, 620) * visualScale;

  let opacity = 0;
  let horizonScale = 0.55;
  let diskReveal = 0;
  let photonIntensity = 0;
  let lensStrength = 0;
  let fieldStrength = 0;
  let flash = 0;
  let shockwave = 0;

  if (reducedMotion && state.navigationLocked) {
    opacity = 1;
    horizonScale = 1;
    diskReveal = 1;
    photonIntensity = 1;
    lensStrength = 1;
    fieldStrength = 1;
  } else if (state.phase === "collapsing") {
    const time = state.phaseElapsed;
    if (time >= COMPRESSION_END && time < FLASH_END) {
      const flashProgress = clamp(
        (time - COMPRESSION_END) / (FLASH_END - COMPRESSION_END),
        0,
        1,
      );
      flash = Math.sin(flashProgress * Math.PI);
    }
    if (time >= COMPRESSION_END && time < DARKNESS_END) {
      const darkness = clamp(
        (time - COMPRESSION_END) / (DARKNESS_END - COMPRESSION_END),
        0,
        1,
      );
      opacity = lerp(0.06, 0.18, easeOutCubic(darkness));
      photonIntensity = lerp(0.08, 0.18, darkness);
      fieldStrength = lerp(0.48, 0.9, darkness);
      shockwave = darkness;
    } else if (time >= DARKNESS_END) {
      const reveal = easeInOutCubic(
        clamp((time - DARKNESS_END) / (REVEAL_END - DARKNESS_END), 0, 1),
      );
      opacity = lerp(0.18, 1, easeOutCubic(reveal));
      horizonScale = lerp(0.55, 1, reveal);
      diskReveal = easeOutCubic(clamp((reveal - 0.08) / 0.92, 0, 1));
      photonIntensity = lerp(0.18, 1, easeOutCubic(reveal));
      lensStrength = easeOutCubic(clamp((reveal - 0.12) / 0.88, 0, 1));
      fieldStrength = lerp(0.9, 1, easeOutCubic(reveal));
      shockwave = 1;
    }
  } else if (state.phase === "catastrophe" || state.phase === "void") {
    opacity = 1;
    horizonScale = 1;
    diskReveal = 1;
    photonIntensity = 1;
    lensStrength = 1;
    fieldStrength = 1;
    shockwave = 1;
  } else if (state.phase === "rebirth") {
    const rebirth = clamp(state.phaseElapsed / REBIRTH_SECONDS, 0, 1);
    const remaining = clamp(1 - rebirth / 0.22, 0, 1);
    opacity = remaining;
    horizonScale = 1;
    diskReveal = remaining;
    photonIntensity = remaining;
    lensStrength = remaining;
    fieldStrength = remaining;
    shockwave = 1;
  }

  const haloPulse = reducedMotion
    ? 1
    : 1 + Math.sin(elapsedSeconds * 0.72) * 0.03;
  return {
    visible: opacity > 0.01 || flash > 0.01,
    opacity,
    horizonRadius: baseHorizonRadius * horizonScale,
    diskRadiusX: baseDiskRadiusX,
    diskRadiusY: baseDiskRadiusX * 0.19,
    fieldRadius: baseFieldRadius,
    diskReveal,
    photonIntensity,
    lensStrength,
    fieldStrength,
    flash,
    shockwave,
    textureFrame: reducedMotion ? 0 : Math.floor(elapsedSeconds * 24),
    haloPulse,
  };
}

export function getCatastropheFrame(state: StellarEvolutionState): CatastropheFrame {
  const cinematic = isStellarCinematic(state);
  const spiral =
    state.phase === "catastrophe"
      ? clamp(state.phaseElapsed / CATASTROPHE_SECONDS, 0, 1)
      : state.phase === "void" || state.phase === "rebirth"
        ? 1
        : 0;
  const rebirth =
    state.phase === "rebirth"
      ? clamp(state.phaseElapsed / REBIRTH_SECONDS, 0, 1)
      : 0;
  const burst =
    state.phase === "rebirth"
      ? Math.sin(clamp(state.phaseElapsed / 0.55, 0, 1) * Math.PI)
      : 0;

  return {
    active: cinematic && (spiral > 0 || rebirth > 0),
    phase: state.phase,
    spiral,
    rebirth,
    orbitFade:
      state.phase === "rebirth"
        ? easeOutCubic(rebirth)
        : state.phase === "void"
          ? 0
          : 1 - easeInCubic(spiral),
    eventsSuspended: cinematic,
    trailsSuspended: cinematic && state.phase !== "rebirth",
    burst,
  };
}

function ingestProgress(distance: number, spiral: number) {
  const start = clamp(distance / (SYSTEM_SPAN * 1.05), 0, 1) * 0.58;
  const duration = 0.4 + (1 - start) * 0.08;
  return clamp((spiral - start) / duration, 0, 1);
}

export function applyCatastrophePose(
  world: StellarPoint,
  frame: CatastropheFrame,
  seed: number,
  reducedMotion: boolean,
): CatastrophePose {
  if (reducedMotion || !frame.active) {
    return { world, scale: 1, alpha: 1, swallowed: false };
  }

  if (frame.phase === "rebirth") {
    const t = easeOutCubic(frame.rebirth);
    const spin = (1 - t) * (1.6 + hashNumber(seed) * 1.2);
    const radius = Math.hypot(world.x, world.y) * t;
    const angle = Math.atan2(world.y, world.x) + spin;
    return {
      world: {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      },
      scale: clamp(t * 1.05, 0, 1),
      alpha: clamp(t * 1.15, 0, 1),
      swallowed: t <= 0.02,
    };
  }

  const distance = Math.max(1, Math.hypot(world.x, world.y));
  const local = ingestProgress(distance, frame.spiral);
  if (local <= 0) return { world, scale: 1, alpha: 1, swallowed: false };

  const pull = easeInCubic(local);
  const spin = pull * (5.5 + hashNumber(seed + 9) * 4.2) * TAU;
  const angle = Math.atan2(world.y, world.x) + spin;
  const radius = distance * (1 - pull);
  const swallowed = local >= 0.985 || radius < 6;
  return {
    world: swallowed
      ? { x: 0, y: 0 }
      : { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius },
    scale: swallowed ? 0 : 1 - pull * 0.92,
    alpha: swallowed ? 0 : 1 - pull ** 1.35,
    swallowed,
  };
}

export function catastropheOrbitFactor(
  orbitRadius: number,
  parentDistance: number,
  frame: CatastropheFrame,
  reducedMotion: boolean,
) {
  if (!frame.active || reducedMotion) {
    if (frame.phase === "void" && !reducedMotion) return { scale: 0, alpha: 0 };
    if (frame.phase === "rebirth" && !reducedMotion) {
      const t = easeOutCubic(frame.rebirth);
      return { scale: t, alpha: t * frame.orbitFade };
    }
    return { scale: 1, alpha: 1 };
  }
  const distance = Math.max(orbitRadius, parentDistance);
  const local = ingestProgress(distance, frame.spiral);
  const pull = easeInCubic(local);
  return {
    scale: Math.max(0, 1 - pull),
    alpha: Math.max(0, (1 - pull ** 1.2) * frame.orbitFade),
  };
}

function pixel(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  alpha: number,
) {
  if (alpha <= 0.01) return;
  context.globalAlpha = clamp(alpha, 0, 1);
  context.fillStyle = color;
  context.fillRect(Math.round(x), Math.round(y), size, size);
}

type BlackHoleDiskBuffer = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D | null;
  width: number;
  height: number;
  textureFrame: number;
};

let blackHoleDiskBuffer: BlackHoleDiskBuffer | null = null;

function drawPixelEllipseArc(
  context: CanvasRenderingContext2D,
  center: StellarPoint,
  radiusX: number,
  radiusY: number,
  start: number,
  end: number,
  color: string,
  alpha: number,
  size: number,
  phase = 0,
) {
  const samples = Math.max(24, Math.ceil(Math.abs(end - start) * radiusX * 1.3));
  for (let index = 0; index <= samples; index += 1) {
    const angle = lerp(start, end, index / samples);
    const shimmer = 0.72 + hashNumber(index * 31 + phase * 17) * 0.28;
    pixel(
      context,
      center.x + Math.cos(angle) * radiusX,
      center.y + Math.sin(angle) * radiusY,
      size,
      color,
      alpha * shimmer,
    );
  }
}

function getBlackHoleDiskTexture(frame: BlackHoleVisualFrame) {
  const width = Math.max(48, Math.round(frame.diskRadiusX));
  const height = Math.max(18, Math.round(frame.diskRadiusY));
  if (!blackHoleDiskBuffer) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (context) context.imageSmoothingEnabled = false;
    blackHoleDiskBuffer = {
      canvas,
      context,
      width: 0,
      height: 0,
      textureFrame: -1,
    };
  }
  const buffer = blackHoleDiskBuffer;
  if (
    buffer.width === width &&
    buffer.height === height &&
    buffer.textureFrame === frame.textureFrame
  ) {
    return buffer.canvas;
  }

  buffer.width = width;
  buffer.height = height;
  buffer.textureFrame = frame.textureFrame;
  buffer.canvas.width = width;
  buffer.canvas.height = height;
  const context = buffer.context;
  if (!context) return buffer.canvas;
  context.clearRect(0, 0, width, height);
  context.imageSmoothingEnabled = false;

  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const radiusX = Math.max(1, centerX - 1);
  const radiusY = Math.max(1, centerY - 1);
  const motion = frame.textureFrame / 24;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const nx = (x + 0.5 - centerX) / radiusX;
      const ny = (y + 0.5 - centerY) / radiusY;
      const radial = Math.hypot(nx, ny);
      if (radial < 0.17 || radial > 1) continue;

      const angle = Math.atan2(ny, nx);
      const stableNoise = hashNumber(x * 79 + y * 131 + 17);
      const current =
        Math.sin(angle * 5 - motion * 1.28 + radial * 13) * 0.5 + 0.5;
      if (stableNoise > 0.9 && current < 0.58) continue;

      const approaching = clamp((-nx + 1) * 0.5, 0, 1);
      const inner = clamp(1 - Math.abs(radial - 0.31) / 0.16, 0, 1);
      const middle = clamp(1 - Math.abs(radial - 0.56) / 0.25, 0, 1);
      const outer = clamp(1 - Math.abs(radial - 0.84) / 0.22, 0, 1);
      const bandStrength = Math.max(inner, middle * 0.78, outer * 0.4);
      const alpha =
        bandStrength *
        (0.45 + current * 0.48) *
        (0.72 + stableNoise * 0.28);
      if (alpha <= 0.025) continue;

      let color: string;
      if (inner > 0.62) {
        color =
          approaching > 0.64
            ? stableNoise > 0.55
              ? "#f2fbff"
              : "#91d8ff"
            : stableNoise > 0.54
              ? "#fff4cc"
              : "#ffbd62";
      } else if (approaching > 0.62) {
        color = current > 0.54 ? "#65b9f4" : "#355fbb";
      } else {
        color = current > 0.58 ? "#ff7c32" : outer > 0.42 ? "#7b263f" : "#3a1738";
      }
      pixel(context, x, y, 1, color, alpha);
    }
  }

  return buffer.canvas;
}

function drawDiskTextureHalf(
  context: CanvasRenderingContext2D,
  center: StellarPoint,
  frame: BlackHoleVisualFrame,
  half: "back" | "front",
) {
  if (frame.diskReveal <= 0.01 || frame.opacity <= 0.01) return;
  const texture = getBlackHoleDiskTexture(frame);
  const displayRadiusX = frame.diskRadiusX * lerp(0.28, 1, frame.diskReveal);
  const displayRadiusY = frame.diskRadiusY * lerp(0.62, 1, frame.diskReveal);
  const sourceY = half === "back" ? 0 : Math.floor(texture.height * 0.5);
  const sourceHeight =
    half === "back" ? Math.ceil(texture.height * 0.5) : texture.height - sourceY;
  const targetY = half === "back" ? center.y - displayRadiusY : center.y;
  context.save();
  context.imageSmoothingEnabled = false;
  context.globalCompositeOperation = "screen";
  context.globalAlpha = frame.opacity * frame.diskReveal;
  context.drawImage(
    texture,
    0,
    sourceY,
    texture.width,
    sourceHeight,
    center.x - displayRadiusX,
    targetY,
    displayRadiusX * 2,
    displayRadiusY,
  );
  context.restore();
}

export function lensStarPoint(
  point: StellarPoint,
  center: StellarPoint,
  frame: BlackHoleVisualFrame,
) {
  if (frame.lensStrength <= 0.01) {
    return { point, alpha: 1, brightness: 1, echo: null as StellarPoint | null };
  }
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const distance = Math.max(0.001, Math.hypot(dx, dy));
  if (distance > frame.fieldRadius) {
    return { point, alpha: 1, brightness: 1, echo: null as StellarPoint | null };
  }
  if (distance < frame.horizonRadius * 0.88) {
    return { point, alpha: 0, brightness: 0, echo: null as StellarPoint | null };
  }

  const influence =
    (1 - distance / frame.fieldRadius) ** 2 * frame.lensStrength;
  const deflection =
    (frame.horizonRadius * frame.horizonRadius * 0.92 * influence) /
    Math.max(distance, frame.horizonRadius * 0.72);
  const warpedDistance = distance + deflection;
  const ux = dx / distance;
  const uy = dy / distance;
  const photonDistance = Math.abs(distance - frame.horizonRadius * 1.24);
  const photonBoost = clamp(
    1 - photonDistance / (frame.horizonRadius * 0.42),
    0,
    1,
  ) * frame.lensStrength;
  const warped = {
    x: center.x + ux * warpedDistance,
    y: center.y + uy * warpedDistance,
  };
  const echo =
    photonBoost > 0.18
      ? {
          x: warped.x - uy * (2 + photonBoost * 3),
          y: warped.y + ux * (2 + photonBoost * 3),
        }
      : null;
  return {
    point: warped,
    alpha: lerp(1, 0.58, influence),
    brightness: 1 + photonBoost * 1.4,
    echo,
  };
}

export function drawBlackHoleBackLayer(
  context: CanvasRenderingContext2D,
  center: StellarPoint,
  frame: BlackHoleVisualFrame,
) {
  if (!frame.visible) return;
  context.save();

  if (frame.fieldStrength > 0.01) {
    const halo = context.createRadialGradient(
      center.x,
      center.y,
      frame.horizonRadius * 0.72,
      center.x,
      center.y,
      frame.fieldRadius,
    );
    halo.addColorStop(0, hexToRgba("#6fbfff", 0.12 * frame.opacity));
    halo.addColorStop(0.12, hexToRgba("#ffb45f", 0.09 * frame.opacity));
    halo.addColorStop(0.42, hexToRgba("#5a285f", 0.055 * frame.fieldStrength));
    halo.addColorStop(1, hexToRgba("#10051c", 0));
    context.globalCompositeOperation = "screen";
    context.globalAlpha = frame.haloPulse;
    context.fillStyle = halo;
    context.fillRect(
      center.x - frame.fieldRadius,
      center.y - frame.fieldRadius,
      frame.fieldRadius * 2,
      frame.fieldRadius * 2,
    );
  }

  const shockwaveEnvelope = Math.sin(clamp(frame.shockwave, 0, 1) * Math.PI);
  if (shockwaveEnvelope > 0.01) {
    const shockRadius = frame.horizonRadius * (1.1 + frame.shockwave * 4.8);
    drawPixelEllipseArc(
      context,
      center,
      shockRadius,
      shockRadius * 0.54,
      0,
      TAU,
      "#dff5ff",
      shockwaveEnvelope * 0.72,
      2,
      frame.textureFrame,
    );
  }

  drawDiskTextureHalf(context, center, frame, "back");

  if (frame.lensStrength > 0.02) {
    const ringRadius = frame.horizonRadius * 1.34;
    drawPixelEllipseArc(
      context,
      center,
      ringRadius,
      ringRadius * 0.83,
      Math.PI * 1.03,
      TAU - 0.03,
      "#eaf9ff",
      0.52 * frame.photonIntensity,
      2,
      frame.textureFrame,
    );
    drawPixelEllipseArc(
      context,
      center,
      ringRadius * 1.03,
      ringRadius * 0.54,
      Math.PI * 1.09,
      TAU - 0.09,
      "#ffbf64",
      0.32 * frame.photonIntensity,
      1,
      frame.textureFrame + 7,
    );
  }

  const motion = frame.textureFrame / 24;
  const displayDiskRadiusX =
    frame.diskRadiusX * lerp(0.28, 1, frame.diskReveal);
  for (let index = 0; index < 72; index += 1) {
    const seed = hashNumber(index * 47 + 19);
    const angle = seed * TAU + motion * (0.08 + hashNumber(index + 4) * 0.16);
    const radius =
      displayDiskRadiusX * (0.72 + hashNumber(index * 29) * 0.72);
    const x = center.x + Math.cos(angle) * radius;
    const y = center.y + Math.sin(angle) * radius * 0.22;
    const color = index % 5 === 0 ? "#8ed8ff" : index % 3 === 0 ? "#ffc66f" : "#85324f";
    pixel(
      context,
      x,
      y,
      index % 17 === 0 ? 2 : 1,
      color,
      frame.diskReveal * frame.opacity * (0.12 + seed * 0.34),
    );
  }
  context.restore();
}

function drawEventHorizon(
  context: CanvasRenderingContext2D,
  center: StellarPoint,
  frame: BlackHoleVisualFrame,
) {
  const radius = frame.horizonRadius;
  const top = Math.floor(center.y - radius - 1);
  const bottom = Math.ceil(center.y + radius + 1);
  context.save();
  context.globalCompositeOperation = "source-over";
  context.globalAlpha = clamp(frame.opacity * 1.08, 0, 1);
  context.fillStyle = "#010107";
  for (let y = top; y <= bottom; y += 1) {
    const normalizedY = (y + 0.5 - center.y) / radius;
    if (Math.abs(normalizedY) > 1) continue;
    const halfWidth = Math.sqrt(Math.max(0, 1 - normalizedY * normalizedY)) * radius;
    const edgeNoise = (hashNumber(y * 113 + 29) - 0.5) * 1.8;
    const left = Math.round(center.x - halfWidth - edgeNoise);
    const right = Math.round(center.x + halfWidth + edgeNoise);
    context.fillRect(left, y, Math.max(1, right - left + 1), 1);
  }
  context.restore();
}

export function drawBlackHoleFrontMatterLayer(
  context: CanvasRenderingContext2D,
  center: StellarPoint,
  frame: BlackHoleVisualFrame,
) {
  if (!frame.visible || frame.opacity <= 0.01) return;
  context.save();
  drawDiskTextureHalf(context, center, frame, "front");

  if (frame.lensStrength > 0.02) {
    const ringRadius = frame.horizonRadius * 1.34;
    drawPixelEllipseArc(
      context,
      center,
      ringRadius,
      ringRadius * 0.82,
      0.04,
      Math.PI - 0.04,
      "#ffc76e",
      0.46 * frame.photonIntensity,
      2,
      frame.textureFrame + 13,
    );
  }

  const motion = frame.textureFrame / 24;
  const displayDiskRadiusX =
    frame.diskRadiusX * lerp(0.28, 1, frame.diskReveal);
  const photonRadius = frame.horizonRadius * 1.16;
  for (let index = 0; index < 46; index += 1) {
    const seed = hashNumber(index * 83 + 5);
    const speed = 0.09 + hashNumber(index * 31 + 7) * 0.16;
    const progress = (seed + motion * speed) % 1;
    const radius = lerp(
      displayDiskRadiusX * 0.62,
      photonRadius * 1.24,
      progress,
    );
    const angle = seed * TAU + motion * 0.34 + progress * 5.2;
    const x = center.x + Math.cos(angle) * radius;
    const y = center.y + Math.sin(angle) * radius * 0.2;
    const color = Math.cos(angle) < 0 ? "#9bdfff" : "#ffd181";
    pixel(
      context,
      x,
      y,
      index % 13 === 0 ? 3 : index % 5 === 0 ? 2 : 1,
      color,
      frame.diskReveal * frame.opacity * (0.18 + (1 - progress) * 0.62),
    );
  }
  context.restore();
}

export function drawBlackHoleCoreLayer(
  context: CanvasRenderingContext2D,
  center: StellarPoint,
  frame: BlackHoleVisualFrame,
) {
  if (!frame.visible || frame.opacity <= 0.01) return;
  context.save();
  drawEventHorizon(context, center, frame);

  const photonRadius = frame.horizonRadius * 1.16;
  const photonSize = clamp(Math.round(frame.horizonRadius / 28), 2, 4);
  const samples = Math.max(100, Math.round(photonRadius * TAU * 1.4));
  for (let index = 0; index < samples; index += 1) {
    const angle = (index / samples) * TAU;
    const noise = hashNumber(index * 73 + 11);
    const radius = photonRadius * (0.982 + noise * 0.036);
    const approaching = Math.cos(angle) < 0;
    const color = approaching
      ? noise > 0.58
        ? "#f5fdff"
        : "#85d6ff"
      : noise > 0.62
        ? "#fff5d5"
        : "#ffc36a";
    pixel(
      context,
      center.x + Math.cos(angle) * radius,
      center.y + Math.sin(angle) * radius,
      photonSize,
      color,
      frame.photonIntensity * frame.opacity * (0.62 + noise * 0.38),
    );
  }
  context.restore();
}

export function drawSceneAtmosphere(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  center: StellarPoint,
  appearance: StellarAppearance,
  blackHole: BlackHoleVisualFrame,
) {
  context.save();
  if (blackHole.fieldStrength > 0.01) {
    const darkness = context.createRadialGradient(
      center.x,
      center.y,
      blackHole.horizonRadius * 0.55,
      center.x,
      center.y,
      blackHole.fieldRadius,
    );
    darkness.addColorStop(0, `rgba(16, 12, 24, ${0.16 * blackHole.fieldStrength})`);
    darkness.addColorStop(0.28, `rgba(7, 6, 16, ${0.28 * blackHole.fieldStrength})`);
    darkness.addColorStop(0.68, `rgba(3, 3, 11, ${0.48 * blackHole.fieldStrength})`);
    darkness.addColorStop(1, `rgba(1, 2, 8, ${0.66 * blackHole.fieldStrength})`);
    context.globalCompositeOperation = "multiply";
    context.fillStyle = darkness;
    context.fillRect(0, 0, width, height);
  }

  const tintAlpha =
    appearance.sceneTintAlpha * (1 - blackHole.fieldStrength * 0.78);
  if (tintAlpha > 0.004) {
    context.globalCompositeOperation = "screen";
    context.fillStyle = hexToRgba(appearance.sceneTint, tintAlpha);
    context.fillRect(0, 0, width, height);
  }

  if (blackHole.flash > 0.01) {
    const flashRadius = Math.max(width, height) * 0.72;
    const flash = context.createRadialGradient(
      center.x,
      center.y,
      0,
      center.x,
      center.y,
      flashRadius,
    );
    flash.addColorStop(0, `rgba(255, 255, 255, ${0.82 * blackHole.flash})`);
    flash.addColorStop(0.18, `rgba(210, 240, 255, ${0.54 * blackHole.flash})`);
    flash.addColorStop(1, "rgba(108, 164, 255, 0)");
    context.globalCompositeOperation = "screen";
    context.fillStyle = flash;
    context.fillRect(0, 0, width, height);
  }
  context.restore();
}

export function drawRebirthBurst(
  context: CanvasRenderingContext2D,
  center: StellarPoint,
  frame: CatastropheFrame,
  blackHole: BlackHoleVisualFrame,
  reducedMotion: boolean,
) {
  if (frame.burst <= 0.01 || reducedMotion) return;
  const count = 132;
  context.save();
  for (let index = 0; index < count; index += 1) {
    const seed = hashNumber(index * 17 + 4);
    const angle = seed * TAU;
    const travel =
      (0.08 + hashNumber(index * 29) * 0.92) *
      blackHole.fieldRadius *
      frame.burst;
    const x = center.x + Math.cos(angle) * travel;
    const y = center.y + Math.sin(angle) * travel * 0.58;
    const size = index % 11 === 0 ? 3 : index % 4 === 0 ? 2 : 1;
    const color =
      index % 5 === 0 ? "#ffffff" : index % 3 === 0 ? "#ffe9a8" : "#ff9a4a";
    pixel(context, x, y, size, color, frame.burst * (0.35 + seed * 0.55));
  }
  const ring = blackHole.fieldRadius * (0.08 + frame.burst * 0.92);
  const gradient = context.createRadialGradient(
    center.x,
    center.y,
    blackHole.horizonRadius * 0.18,
    center.x,
    center.y,
    ring,
  );
  gradient.addColorStop(0, `rgba(255, 250, 230, ${0.42 * frame.burst})`);
  gradient.addColorStop(0.45, `rgba(255, 186, 82, ${0.16 * frame.burst})`);
  gradient.addColorStop(1, "rgba(255, 120, 40, 0)");
  context.globalCompositeOperation = "screen";
  context.fillStyle = gradient;
  context.fillRect(center.x - ring, center.y - ring, ring * 2, ring * 2);
  context.restore();
}
