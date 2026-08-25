"use client";

import "dialkit/styles.css";
import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import styles from "./space.module.css";
import { hexToRgba, useSpaceDials, type SpaceDials } from "./useSpaceDials";
import {
  createEventScheduler,
  drawLivingEventBackLayers,
  drawLivingEventFrontLayers,
  drawLivingSurface,
  getBodyBaseSpin,
  updateLivingEvents,
  type EventSchedulerState,
  type LivingBodyId as BodyId,
} from "./livingDiorama";
import {
  drawMission,
  drawMissionTrails,
  getRenderedMissions,
  MISSION_BY_ID,
  MISSION_DEFINITIONS,
  type MissionDefinition,
  type MissionId,
  type RenderedMission,
} from "./missionDiorama";
import {
  activateSun,
  applyCatastrophePose,
  catastropheOrbitFactor,
  createStellarEvolutionState,
  drawBlackHoleBackLayer,
  drawBlackHoleCoreLayer,
  drawBlackHoleFrontMatterLayer,
  drawRebirthBurst,
  drawSceneAtmosphere,
  getBlackHoleVisualFrame,
  getCatastropheFrame,
  getStellarAppearance,
  getStellarCamera,
  getStellarUiSnapshot,
  lensStarPoint,
  skipStellarSequence,
  stellarNeedsAnimation,
  stepStellarEvolution,
  type BlackHoleVisualFrame,
  type CatastrophePose,
  type StellarAppearance,
  type StellarUiSnapshot,
} from "./stellarEvolution";
import type { BlackHoleLensRenderer } from "./blackHoleLens";

const SpaceDialRoot = dynamic(
  () => import("dialkit").then((module) => module.DialRoot),
  { ssr: false },
);

type BodyKind = "star" | "planet" | "moon";
type SpriteRecipe =
  | "sun"
  | "rock"
  | "venus"
  | "earth"
  | "mars"
  | "jupiter"
  | "saturn"
  | "ice";

type Point = { x: number; y: number };

type CelestialBody = {
  id: BodyId;
  name: string;
  kind: BodyKind;
  parentId?: BodyId;
  orbitRadius: number;
  orbitPeriod: number;
  phase: number;
  displaySize: number;
  minDisplaySize: number;
  spritePixels: number;
  palette: readonly [string, string, string, string, string];
  recipe: SpriteRecipe;
  flavor: string;
};

type CameraState = {
  x: number;
  y: number;
  zoom: number;
};

type ViewportState = {
  width: number;
  height: number;
  dpr: number;
};

type RenderedBody = {
  body: CelestialBody;
  world: Point;
  screen: Point;
  visualSize: number;
  hitSize: number;
};

type MapSelection =
  | { kind: "body"; id: BodyId }
  | { kind: "mission"; id: MissionId };

type HoverSource = "pointer" | "focus";
type HoverTarget = MapSelection & { source: HoverSource };

type SceneItem =
  | { kind: "body"; rendered: RenderedBody }
  | { kind: "mission"; rendered: RenderedMission };

type PointerInfo = {
  x: number;
  y: number;
};

type PinchState = {
  distance: number;
  worldAnchor: Point;
};

type BodyInteractionState = {
  rotationPhase: number;
  angularVelocity: number;
  dragging: boolean;
  pulseElapsed: number;
};

type OrbitHoverState = {
  progress: number;
  transitionFrom: number;
  transitionTarget: 0 | 1;
  transitionElapsed: number;
  transitionDuration: number;
  launchAngle: number;
  convergenceElapsed: number;
  source: HoverSource | null;
  animated: boolean;
};

type OrbitDrawState = {
  progress: number;
  launchAngle: number;
  showEnergy: boolean;
  convergence: number;
};

type SpinDragState = {
  pointerId: number;
  bodyId: BodyId;
  origin: Point;
  lastPoint: Point;
  lastTime: number;
};

type MissionPressState = {
  pointerId: number;
  missionId: MissionId;
};

type SpriteBuffer = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D | null;
  lightStep: number;
  rotationStep: number;
  evolutionStep: number;
};

const TAU = Math.PI * 2;
const SYSTEM_RADIUS = 820;
const ORBIT_SAMPLE_COUNT = 144;
const MAX_DPR = 2;

const CELESTIAL_BODIES: readonly CelestialBody[] = [
  {
    id: "sun",
    name: "Sun",
    kind: "star",
    orbitRadius: 0,
    orbitPeriod: 1,
    phase: 0,
    displaySize: 116,
    minDisplaySize: 44,
    spritePixels: 35,
    palette: ["#b92f16", "#e95d1d", "#ff9728", "#ffd45a", "#fff2a1"],
    recipe: "sun",
    flavor: "A small god of fire, holding every wandering world in its light.",
  },
  {
    id: "mercury",
    name: "Mercury",
    kind: "planet",
    orbitRadius: 112,
    orbitPeriod: 68,
    phase: 0.58,
    displaySize: 25,
    minDisplaySize: 10,
    spritePixels: 11,
    palette: ["#302d31", "#625d61", "#8e8581", "#b9aaa1", "#ded0bd"],
    recipe: "rock",
    flavor: "A scorched iron bead racing through the Sun’s brightest silence.",
  },
  {
    id: "venus",
    name: "Venus",
    kind: "planet",
    orbitRadius: 174,
    orbitPeriod: 94,
    phase: 2.14,
    displaySize: 36,
    minDisplaySize: 12,
    spritePixels: 17,
    palette: ["#5d2c2b", "#9c5837", "#d28a48", "#f2bd69", "#ffe1a0"],
    recipe: "venus",
    flavor: "Cloud-wrapped and brilliant, hiding a furnace beneath gold.",
  },
  {
    id: "earth",
    name: "Earth",
    kind: "planet",
    orbitRadius: 244,
    orbitPeriod: 126,
    phase: 4.72,
    displaySize: 40,
    minDisplaySize: 14,
    spritePixels: 19,
    palette: ["#0b2454", "#16538d", "#238bc1", "#65cce3", "#d9f4e8"],
    recipe: "earth",
    flavor: "An improbable blue ember carrying oceans through the dark.",
  },
  {
    id: "moon",
    name: "Moon",
    kind: "moon",
    parentId: "earth",
    orbitRadius: 39,
    orbitPeriod: 24,
    phase: 0.72,
    displaySize: 16,
    minDisplaySize: 7,
    spritePixels: 9,
    palette: ["#292f3c", "#5b6472", "#9299a3", "#c8cbd0", "#f3f0e8"],
    recipe: "rock",
    flavor: "Earth’s pale companion, pulling quietly at every shore.",
  },
  {
    id: "mars",
    name: "Mars",
    kind: "planet",
    orbitRadius: 326,
    orbitPeriod: 158,
    phase: 3.34,
    displaySize: 31,
    minDisplaySize: 11,
    spritePixels: 15,
    palette: ["#421d20", "#773025", "#aa4930", "#d16b42", "#ef9b68"],
    recipe: "mars",
    flavor: "A rust-red memory of rivers, turning beneath a thin sky.",
  },
  {
    id: "jupiter",
    name: "Jupiter",
    kind: "planet",
    orbitRadius: 452,
    orbitPeriod: 220,
    phase: 5.42,
    displaySize: 68,
    minDisplaySize: 22,
    spritePixels: 29,
    palette: ["#4d3030", "#8f5d50", "#c68a68", "#edbd88", "#f8dfb4"],
    recipe: "jupiter",
    flavor: "A striped giant whose storms have outlived empires.",
  },
  {
    id: "saturn",
    name: "Saturn",
    kind: "planet",
    orbitRadius: 570,
    orbitPeriod: 274,
    phase: 1.12,
    displaySize: 92,
    minDisplaySize: 29,
    spritePixels: 25,
    palette: ["#4a3d32", "#827057", "#bda275", "#e1ca92", "#f6e7ba"],
    recipe: "saturn",
    flavor: "A quiet colossus wearing ice and dust like a crown.",
  },
  {
    id: "uranus",
    name: "Uranus",
    kind: "planet",
    orbitRadius: 680,
    orbitPeriod: 326,
    phase: 2.78,
    displaySize: 48,
    minDisplaySize: 16,
    spritePixels: 21,
    palette: ["#183c48", "#286878", "#4b9aa5", "#83c8c9", "#c3ece5"],
    recipe: "ice",
    flavor: "A cyan world rolling sideways through the outer cold.",
  },
  {
    id: "neptune",
    name: "Neptune",
    kind: "planet",
    orbitRadius: 790,
    orbitPeriod: 380,
    phase: 4.04,
    displaySize: 47,
    minDisplaySize: 16,
    spritePixels: 21,
    palette: ["#111c51", "#193b8a", "#275fc2", "#4b91e2", "#a4c9f2"],
    recipe: "ice",
    flavor: "The last blue lantern before the solar dark.",
  },
] as const;

const BODY_BY_ID = new Map(CELESTIAL_BODIES.map((body) => [body.id, body]));
const BODY_INDEX = new Map(CELESTIAL_BODIES.map((body, index) => [body.id, index]));
const spriteBuffers = new Map<BodyId, SpriteBuffer>();

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function distance(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function wrapAngle(angle: number) {
  const wrapped = angle % TAU;
  return wrapped < 0 ? wrapped + TAU : wrapped;
}

function createBodyInteractionStates(surfaceSpeed: number) {
  const states = new Map<BodyId, BodyInteractionState>();
  for (let index = 0; index < CELESTIAL_BODIES.length; index += 1) {
    const id = CELESTIAL_BODIES[index].id;
    states.set(id, {
      rotationPhase: 0,
      angularVelocity: getBodyBaseSpin(id) * surfaceSpeed,
      dragging: false,
      pulseElapsed: -1,
    });
  }
  return states;
}

function createOrbitHoverStates() {
  const states = new Map<BodyId, OrbitHoverState>();
  for (let index = 1; index < CELESTIAL_BODIES.length; index += 1) {
    const body = CELESTIAL_BODIES[index];
    states.set(body.id, {
      progress: 0,
      transitionFrom: 0,
      transitionTarget: 0,
      transitionElapsed: 0,
      transitionDuration: 0,
      launchAngle: body.phase,
      convergenceElapsed: -1,
      source: null,
      animated: false,
    });
  }
  return states;
}

function easeOutPower(progress: number, weight: number) {
  return 1 - (1 - progress) ** Math.max(1, weight);
}

function beginOrbitTransition(
  state: OrbitHoverState,
  target: 0 | 1,
  fullDuration: number,
) {
  const distanceToTarget = Math.abs(target - state.progress);
  state.transitionFrom = state.progress;
  state.transitionTarget = target;
  state.transitionElapsed = 0;
  state.transitionDuration =
    distanceToTarget <= 0.001
      ? 0
      : Math.max(0.04, fullDuration * distanceToTarget);
}

function getBodyOrbitAngle(
  body: CelestialBody,
  positions: ReadonlyMap<BodyId, Point>,
) {
  const position = positions.get(body.id);
  if (!position) return body.phase;
  const parent = body.parentId ? positions.get(body.parentId) : undefined;
  return Math.atan2(
    position.y - (parent?.y ?? 0),
    position.x - (parent?.x ?? 0),
  );
}

function stepOrbitHoverStates(
  states: Map<BodyId, OrbitHoverState>,
  bodies: readonly CelestialBody[],
  positions: ReadonlyMap<BodyId, Point>,
  hovered: HoverTarget | null,
  deltaSeconds: number,
  reducedMotion: boolean,
  dials: SpaceDials,
) {
  for (let index = 1; index < bodies.length; index += 1) {
    const body = bodies[index];
    const state = states.get(body.id);
    if (!state) continue;
    const active = hovered?.kind === "body" && hovered.id === body.id;
    const source = active ? hovered.source : null;

    if (reducedMotion) {
      if (active && state.progress <= 0.001) {
        state.launchAngle = getBodyOrbitAngle(body, positions);
      }
      state.progress = active ? 1 : 0;
      state.transitionFrom = state.progress;
      state.transitionTarget = active ? 1 : 0;
      state.transitionElapsed = 0;
      state.transitionDuration = 0;
      state.convergenceElapsed = -1;
      state.source = source;
      state.animated = false;
      continue;
    }

    if (source === "focus") {
      if (state.progress <= 0.001) {
        state.launchAngle = getBodyOrbitAngle(body, positions);
      }
      state.progress = 1;
      state.transitionFrom = 1;
      state.transitionTarget = 1;
      state.transitionElapsed = 0;
      state.transitionDuration = 0;
      state.convergenceElapsed = -1;
      state.source = source;
      state.animated = false;
      continue;
    }

    if (!active && state.source === "focus") {
      state.progress = 0;
      state.transitionFrom = 0;
      state.transitionTarget = 0;
      state.transitionElapsed = 0;
      state.transitionDuration = 0;
      state.convergenceElapsed = -1;
      state.source = null;
      state.animated = false;
      continue;
    }

    if (active) {
      if (state.transitionTarget !== 1) {
        if (state.progress <= 0.001) {
          state.launchAngle = getBodyOrbitAngle(body, positions);
        }
        beginOrbitTransition(
          state,
          1,
          dials.orbits.hoverRevealDuration,
        );
        state.convergenceElapsed = -1;
      }
      state.source = "pointer";
      state.animated = true;
    } else if (state.transitionTarget !== 0) {
      beginOrbitTransition(
        state,
        0,
        dials.orbits.hoverRetractDuration,
      );
      state.convergenceElapsed = -1;
      state.source = null;
    }

    if (state.progress !== state.transitionTarget) {
      state.transitionElapsed += deltaSeconds;
      const transitionProgress =
        state.transitionDuration <= 0
          ? 1
          : clamp(
              state.transitionElapsed / state.transitionDuration,
              0,
              1,
            );
      state.progress =
        state.transitionFrom +
        (state.transitionTarget - state.transitionFrom) *
          easeOutPower(transitionProgress, dials.orbits.hoverEasingWeight);

      if (transitionProgress >= 1) {
        state.progress = state.transitionTarget;
        if (state.transitionTarget === 1 && state.animated) {
          state.convergenceElapsed = 0;
        } else if (state.transitionTarget === 0) {
          state.animated = false;
        }
      }
    }

    if (state.convergenceElapsed >= 0) {
      state.convergenceElapsed += deltaSeconds;
      if (state.convergenceElapsed >= dials.orbits.hoverMeetDuration) {
        state.convergenceElapsed = -1;
      }
    }
  }
}

function orbitConvergenceEnvelope(
  state: OrbitHoverState,
  duration: number,
) {
  if (state.convergenceElapsed < 0) return 0;
  return Math.sin(
    clamp(state.convergenceElapsed / Math.max(0.001, duration), 0, 1) *
      Math.PI,
  );
}

function stepBodyInteractions(
  states: Map<BodyId, BodyInteractionState>,
  deltaSeconds: number,
  reducedMotion: boolean,
  dials: SpaceDials,
) {
  for (const [id, state] of states) {
    if (reducedMotion) {
      state.angularVelocity = 0;
      state.pulseElapsed = -1;
      continue;
    }

    if (!state.dragging) {
      const baseline = getBodyBaseSpin(id) * dials.living.surfaceSpeed;
      const damping = Math.exp((-3 * deltaSeconds) / dials.interaction.settleTime);
      state.angularVelocity = baseline + (state.angularVelocity - baseline) * damping;
      if (Math.abs(state.angularVelocity - baseline) < 0.0001) {
        state.angularVelocity = baseline;
      }
      state.rotationPhase = wrapAngle(
        state.rotationPhase + state.angularVelocity * deltaSeconds,
      );
    }

    if (state.pulseElapsed >= 0) {
      state.pulseElapsed += deltaSeconds;
      if (state.pulseElapsed >= dials.interaction.pulseDuration) {
        state.pulseElapsed = -1;
      }
    }
  }
}

function pulseEnvelope(
  state: BodyInteractionState,
  reducedMotion: boolean,
  duration: number,
) {
  if (reducedMotion || state.pulseElapsed < 0 || duration <= 0) return 0;
  const progress = clamp(state.pulseElapsed / duration, 0, 1);
  return Math.sin(progress * Math.PI);
}

function bodyIdFromTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  const rawId = target.closest<HTMLElement>("[data-body-id]")?.dataset.bodyId;
  if (!rawId || !BODY_BY_ID.has(rawId as BodyId)) return null;
  return rawId as BodyId;
}

function missionIdFromTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  const rawId = target.closest<HTMLElement>("[data-mission-id]")?.dataset.missionId;
  if (!rawId || !MISSION_BY_ID.has(rawId as MissionId)) return null;
  return rawId as MissionId;
}

function selectionMatches(
  selection: MapSelection | null,
  kind: MapSelection["kind"],
  id: BodyId | MissionId,
) {
  return selection?.kind === kind && selection.id === id;
}

function isometricProject(point: Point, yFactor: number): Point {
  return {
    x: point.x - point.y,
    y: (point.x + point.y) * yFactor,
  };
}

function isometricUnproject(point: Point, yFactor: number): Point {
  const sum = yFactor === 0 ? 0 : point.y / yFactor;
  return {
    x: (sum + point.x) * 0.5,
    y: (sum - point.x) * 0.5,
  };
}

function worldToScreen(
  world: Point,
  camera: CameraState,
  viewport: ViewportState,
  yFactor: number,
): Point {
  const projectedWorld = isometricProject(world, yFactor);
  const projectedCamera = isometricProject(camera, yFactor);
  return {
    x: viewport.width * 0.5 + (projectedWorld.x - projectedCamera.x) * camera.zoom,
    y: viewport.height * 0.5 + (projectedWorld.y - projectedCamera.y) * camera.zoom,
  };
}

function screenToWorld(
  screen: Point,
  camera: CameraState,
  viewport: ViewportState,
  yFactor: number,
): Point {
  const projectedCamera = isometricProject(camera, yFactor);
  const projected = {
    x: projectedCamera.x + (screen.x - viewport.width * 0.5) / camera.zoom,
    y: projectedCamera.y + (screen.y - viewport.height * 0.5) / camera.zoom,
  };
  return isometricUnproject(projected, yFactor);
}

function computeFitZoom(
  width: number,
  height: number,
  systemRadius: number,
  paddingX: number,
  paddingY: number,
  fitScale: number,
) {
  const usableWidth = Math.max(280, width - paddingX);
  const usableHeight = Math.max(300, height - paddingY);
  const projectedWidth = systemRadius * Math.SQRT2 * 2;
  const projectedHeight = systemRadius * Math.SQRT2;
  return clamp(
    Math.min(usableWidth / projectedWidth, usableHeight / projectedHeight) * fitScale,
    0.12,
    0.88,
  );
}

function planetTune(dials: SpaceDials, id: BodyId) {
  return dials.planets[id];
}

function resolveBody(body: CelestialBody, dials: SpaceDials): CelestialBody {
  const tune = planetTune(dials, body.id);
  const orbitScale = dials.bodies.spacingScale;
  const motionSpeed = Math.max(0.001, dials.scene.motionSpeed);
  return {
    ...body,
    displaySize: tune.size * dials.bodies.sizeScale,
    minDisplaySize: tune.minSize * dials.bodies.minSizeScale,
    orbitRadius: "orbit" in tune ? tune.orbit * orbitScale : 0,
    orbitPeriod: "period" in tune ? Math.max(1, tune.period / motionSpeed) : body.orbitPeriod,
  };
}

function resolveBodies(dials: SpaceDials) {
  return CELESTIAL_BODIES.map((body) => resolveBody(body, dials));
}

function systemRadiusForDials(dials: SpaceDials) {
  const bodies = resolveBodies(dials);
  const farthest = bodies.reduce((max, body) => Math.max(max, body.orbitRadius), 0);
  return Math.max(SYSTEM_RADIUS, farthest + 30);
}

function hashNumber(value: number) {
  const x = Math.sin(value * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function hash2d(x: number, y: number, seed: number) {
  return hashNumber(x * 127.1 + y * 311.7 + seed * 74.7);
}

function orbitPosition(radius: number, angle: number): Point {
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

function getBodyWorldPositions(
  bodies: readonly CelestialBody[],
  elapsedSeconds: number,
  reducedMotion: boolean,
) {
  const positions = new Map<BodyId, Point>();

  for (let index = 0; index < bodies.length; index += 1) {
    const body = bodies[index];
    if (body.id === "sun") {
      positions.set(body.id, { x: 0, y: 0 });
      continue;
    }

    const motion = reducedMotion ? 0 : (elapsedSeconds / body.orbitPeriod) * TAU;
    const localPosition = orbitPosition(body.orbitRadius, body.phase + motion);
    const parent = body.parentId ? positions.get(body.parentId) : undefined;
    positions.set(body.id, {
      x: localPosition.x + (parent?.x ?? 0),
      y: localPosition.y + (parent?.y ?? 0),
    });
  }

  return positions;
}

function drawInfiniteStarfield(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  viewport: ViewportState,
  elapsedSeconds: number,
  reducedMotion: boolean,
  yFactor: number,
  dials: SpaceDials,
  blackHole: { center: Point; frame: BlackHoleVisualFrame } | null = null,
) {
  const projectedCamera = isometricProject(camera, yFactor);
  const layers = [
    { parallax: 0.045, tile: 260, stars: 12, seed: 11, alpha: dials.starfield.farAlpha },
    { parallax: 0.09, tile: 320, stars: 9, seed: 37, alpha: dials.starfield.midAlpha },
    { parallax: 0.16, tile: 400, stars: 6, seed: 73, alpha: dials.starfield.nearAlpha },
  ] as const;

  context.save();
  for (let layerIndex = 0; layerIndex < layers.length; layerIndex += 1) {
    const layer = layers[layerIndex];
    const offsetX = -projectedCamera.x * camera.zoom * layer.parallax;
    const offsetY = -projectedCamera.y * camera.zoom * layer.parallax;
    const firstTileX = Math.floor(-offsetX / layer.tile) - 1;
    const lastTileX = Math.ceil((viewport.width - offsetX) / layer.tile) + 1;
    const firstTileY = Math.floor(-offsetY / layer.tile) - 1;
    const lastTileY = Math.ceil((viewport.height - offsetY) / layer.tile) + 1;

    for (let tileY = firstTileY; tileY <= lastTileY; tileY += 1) {
      for (let tileX = firstTileX; tileX <= lastTileX; tileX += 1) {
        for (let starIndex = 0; starIndex < layer.stars; starIndex += 1) {
          const seed =
            tileX * 92821 + tileY * 68917 + starIndex * 199 + layer.seed * 991;
          const x =
            tileX * layer.tile +
            hashNumber(seed) * layer.tile +
            offsetX;
          const y =
            tileY * layer.tile +
            hashNumber(seed + 17) * layer.tile +
            offsetY;
          const bright = hashNumber(seed + 47);
          const twinkle = reducedMotion
            ? 0.84
            : 0.72 + Math.sin(elapsedSeconds * (0.55 + bright) * dials.starfield.twinkle + seed) * 0.22;
          const baseAlpha = clamp(
            layer.alpha * twinkle * dials.starfield.opacity,
            0.04,
            1,
          );
          const lensed = blackHole
            ? lensStarPoint({ x, y }, blackHole.center, blackHole.frame)
            : { point: { x, y }, alpha: 1, brightness: 1, echo: null };
          if (lensed.alpha <= 0.01) continue;
          const alpha = clamp(
            baseAlpha * lensed.alpha * lensed.brightness,
            0,
            1,
          );
          const size = bright > 0.92 || lensed.brightness > 1.75 ? 2 : 1;
          const colorRoll = hashNumber(seed + 88);
          context.globalAlpha = alpha;
          context.fillStyle =
            colorRoll > 0.94 ? dials.starfield.warm : colorRoll < 0.08 ? dials.starfield.cool : dials.starfield.white;
          context.fillRect(
            Math.round(lensed.point.x),
            Math.round(lensed.point.y),
            size,
            size,
          );

          if (lensed.echo) {
            context.globalAlpha = alpha * 0.34;
            context.fillRect(
              Math.round(lensed.echo.x),
              Math.round(lensed.echo.y),
              1,
              1,
            );
          }

          if (bright > 0.975 && layerIndex === 2) {
            context.globalAlpha = alpha * 0.45;
            context.fillRect(
              Math.round(lensed.point.x) - 2,
              Math.round(lensed.point.y),
              5,
              1,
            );
            context.fillRect(
              Math.round(lensed.point.x),
              Math.round(lensed.point.y) - 2,
              1,
              5,
            );
          }
        }
      }
    }
  }
  context.restore();
}

function orbitPointToScreen(
  radius: number,
  angle: number,
  parent: Point,
  camera: CameraState,
  viewport: ViewportState,
  yFactor: number,
) {
  const local = orbitPosition(radius, angle);
  return worldToScreen(
    { x: local.x + parent.x, y: local.y + parent.y },
    camera,
    viewport,
    yFactor,
  );
}

function traceOrbitArc(
  context: CanvasRenderingContext2D,
  radius: number,
  startAngle: number,
  endAngle: number,
  parent: Point,
  camera: CameraState,
  viewport: ViewportState,
  yFactor: number,
) {
  const sweep = endAngle - startAngle;
  const samples = Math.max(
    2,
    Math.ceil((Math.abs(sweep) / TAU) * ORBIT_SAMPLE_COUNT),
  );
  for (let index = 0; index <= samples; index += 1) {
    const angle = startAngle + (index / samples) * sweep;
    const point = orbitPointToScreen(
      radius,
      angle,
      parent,
      camera,
      viewport,
      yFactor,
    );
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  }
}

function drawOrbit(
  context: CanvasRenderingContext2D,
  sourceRadius: number,
  camera: CameraState,
  viewport: ViewportState,
  yFactor: number,
  dials: SpaceDials,
  parent: Point = { x: 0, y: 0 },
  moonOrbit = false,
  animation: OrbitDrawState | null = null,
  catastrophe: { scale: number; alpha: number } | null = null,
) {
  const radiusScale = catastrophe?.scale ?? 1;
  const fade = catastrophe?.alpha ?? 1;
  const radius = sourceRadius * radiusScale;
  if (radius < 2 || fade <= 0.01) return;
  const progress = clamp(animation?.progress ?? 0, 0, 1);
  const launchAngle = animation?.launchAngle ?? 0;
  const frontSweep = Math.PI * progress;
  context.save();
  context.globalAlpha = fade;
  context.lineCap = "round";

  if (progress < 0.9995) {
    context.beginPath();
    if (progress <= 0.0005) {
      traceOrbitArc(
        context,
        radius,
        0,
        TAU,
        parent,
        camera,
        viewport,
        yFactor,
      );
      context.closePath();
    } else {
      traceOrbitArc(
        context,
        radius,
        launchAngle + frontSweep,
        launchAngle + TAU - frontSweep,
        parent,
        camera,
        viewport,
        yFactor,
      );
    }
  }
  context.setLineDash(moonOrbit ? [2, dials.orbits.moonDash] : [2, dials.orbits.dash]);
  context.lineDashOffset = moonOrbit ? 0 : 2;
  context.lineWidth = 1;
  context.strokeStyle = moonOrbit
    ? hexToRgba(dials.orbits.moonColor, dials.orbits.moonOpacity)
    : hexToRgba(dials.orbits.color, dials.orbits.opacity);
  if (progress < 0.9995) context.stroke();

  if (progress > 0.0005) {
    context.beginPath();
    traceOrbitArc(
      context,
      radius,
      launchAngle,
      launchAngle + frontSweep,
      parent,
      camera,
      viewport,
      yFactor,
    );
    traceOrbitArc(
      context,
      radius,
      launchAngle,
      launchAngle - frontSweep,
      parent,
      camera,
      viewport,
      yFactor,
    );
    context.setLineDash([]);
    context.lineWidth = dials.orbits.hoverHaloWidth;
    context.strokeStyle = hexToRgba(
      dials.orbits.hoverColor,
      dials.orbits.hoverOpacity * 0.24,
    );
    context.shadowColor = hexToRgba(
      dials.orbits.hoverColor,
      dials.orbits.hoverOpacity * 0.72,
    );
    context.shadowBlur = dials.orbits.hoverGlow;
    context.stroke();

    context.shadowBlur = 0;
    context.lineWidth = dials.orbits.hoverLineWidth;
    context.strokeStyle = hexToRgba(
      dials.orbits.hoverColor,
      dials.orbits.hoverOpacity,
    );
    context.stroke();

    if (animation?.showEnergy && progress < 0.9995) {
      const frontAlpha = clamp(
        dials.orbits.hoverOpacity * dials.orbits.hoverFrontIntensity,
        0,
        1,
      );
      const tailSweep = Math.min(
        frontSweep,
        TAU * dials.orbits.hoverFrontLength,
      );
      context.beginPath();
      traceOrbitArc(
        context,
        radius,
        launchAngle + frontSweep - tailSweep,
        launchAngle + frontSweep,
        parent,
        camera,
        viewport,
        yFactor,
      );
      traceOrbitArc(
        context,
        radius,
        launchAngle - frontSweep + tailSweep,
        launchAngle - frontSweep,
        parent,
        camera,
        viewport,
        yFactor,
      );
      context.lineWidth = dials.orbits.hoverFrontWidth;
      context.strokeStyle = hexToRgba(
        dials.orbits.hoverColor,
        frontAlpha * 0.62,
      );
      context.shadowColor = hexToRgba(
        dials.orbits.hoverColor,
        frontAlpha,
      );
      context.shadowBlur = dials.orbits.hoverGlow * 1.15;
      context.stroke();

      const frontAngles = [
        launchAngle + frontSweep,
        launchAngle - frontSweep,
      ];
      context.fillStyle = hexToRgba(
        dials.orbits.hoverColor,
        frontAlpha,
      );
      const frontSize = Math.max(
        1,
        Math.round(dials.orbits.hoverFrontWidth),
      );
      const frontOffset = Math.floor(frontSize * 0.5);
      for (let index = 0; index < frontAngles.length; index += 1) {
        const front = orbitPointToScreen(
          radius,
          frontAngles[index],
          parent,
          camera,
          viewport,
          yFactor,
        );
        context.fillRect(
          Math.round(front.x) - frontOffset,
          Math.round(front.y) - frontOffset,
          frontSize,
          frontSize,
        );
      }
    }
  }

  if (animation && animation.convergence > 0) {
    const meetingPoint = orbitPointToScreen(
      radius,
      launchAngle + Math.PI,
      parent,
      camera,
      viewport,
      yFactor,
    );
    const alpha = clamp(
      animation.convergence *
        dials.orbits.hoverOpacity *
        dials.orbits.hoverMeetIntensity,
      0,
      1,
    );
    context.setLineDash([]);
    context.globalCompositeOperation = "screen";
    context.shadowColor = hexToRgba(dials.orbits.hoverColor, alpha);
    context.shadowBlur = dials.orbits.hoverGlow * 1.35;
    context.fillStyle = dials.orbits.hoverColor;
    context.globalAlpha = alpha;
    context.fillRect(
      Math.round(meetingPoint.x) - 1,
      Math.round(meetingPoint.y) - 1,
      3,
      3,
    );
    context.globalAlpha = alpha * 0.34;
    context.fillRect(Math.round(meetingPoint.x) - 3, Math.round(meetingPoint.y), 7, 1);
    context.fillRect(Math.round(meetingPoint.x), Math.round(meetingPoint.y) - 3, 1, 7);
  }
  context.restore();
}

function drawAsteroidBelt(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  viewport: ViewportState,
  elapsedSeconds: number,
  reducedMotion: boolean,
  yFactor: number,
  dials: SpaceDials,
  catastrophe: ReturnType<typeof getCatastropheFrame> | null = null,
) {
  const motion = reducedMotion ? 0 : (elapsedSeconds / 260) * dials.asteroids.speed;
  const count = Math.round(dials.asteroids.count);
  context.save();
  for (let index = 0; index < count; index += 1) {
    const seededAngle = hashNumber(index * 31 + 8) * TAU;
    const radius = dials.asteroids.radius + (hashNumber(index * 83 + 19) - 0.5) * dials.asteroids.spread;
    const drift = motion * (0.72 + hashNumber(index + 91) * 0.45);
    const position = orbitPosition(radius, seededAngle + drift);
    const pose = catastrophe
      ? applyCatastrophePose(position, catastrophe, index + 200, reducedMotion)
      : null;
    if (pose?.swallowed) continue;
    const world = pose?.world ?? position;
    const screen = worldToScreen(world, camera, viewport, yFactor);
    if (
      screen.x < -4 ||
      screen.x > viewport.width + 4 ||
      screen.y < -4 ||
      screen.y > viewport.height + 4
    ) {
      continue;
    }
    const size = hashNumber(index * 17) > 0.9 ? 2 : 1;
    const fade = pose?.alpha ?? 1;
    context.globalAlpha = (0.32 + hashNumber(index * 57) * 0.38) * dials.asteroids.opacity * fade;
    context.fillStyle = hashNumber(index * 13) > 0.72 ? dials.asteroids.warm : dials.asteroids.cool;
    context.fillRect(Math.round(screen.x), Math.round(screen.y), size, size);
  }
  context.restore();
}

function shadeIndex(value: number) {
  if (value < -0.2) return 0;
  if (value < 0.14) return 1;
  if (value < 0.46) return 2;
  if (value < 0.72) return 3;
  return 4;
}

function getSurfaceColor(
  body: CelestialBody,
  textureX: number,
  textureY: number,
  surfaceX: number,
  surfaceY: number,
  lighting: number,
) {
  const baseIndex = shadeIndex(lighting);
  const noise = hash2d(textureX, textureY, BODY_INDEX.get(body.id) ?? 0);

  if (body.recipe === "earth") {
    const continent =
      Math.sin(surfaceX * 8.4 + Math.sin(surfaceY * 7.2) * 1.6) +
        Math.cos(surfaceY * 10.7 - surfaceX * 2.2) +
        noise * 1.7 >
      1.25;
    const cloud =
      lighting > -0.1 &&
      Math.sin(surfaceY * 18 + surfaceX * 4.5) + noise * 1.25 > 1.78;
    if (cloud) return lighting > 0.42 ? "#f4fbf3" : "#a7c8ce";
    if (continent) {
      const landPalette = ["#17372d", "#24543d", "#39734c", "#6a9b5b", "#b7c47b"];
      return landPalette[baseIndex];
    }
  }

  if (body.recipe === "jupiter") {
    const band = Math.sin(surfaceY * 25 + noise * 2.4);
    const longitudinalDistance = Math.min(
      Math.abs(surfaceX - 0.35),
      2 - Math.abs(surfaceX - 0.35),
    );
    const spot =
      (longitudinalDistance / 0.27) ** 2 + ((surfaceY - 0.18) / 0.13) ** 2 < 1;
    if (spot) return lighting > 0.32 ? "#d66c4f" : "#833b36";
    const adjustment = band > 0.5 ? 1 : band < -0.48 ? -1 : 0;
    return body.palette[clamp(baseIndex + adjustment, 0, 4)];
  }

  if (body.recipe === "saturn" || body.recipe === "venus" || body.recipe === "ice") {
    const band = Math.sin(
      surfaceY * (body.recipe === "venus" ? 17 : 24) + noise * 1.8,
    );
    const adjustment = band > 0.68 ? 1 : band < -0.7 ? -1 : 0;
    return body.palette[clamp(baseIndex + adjustment, 0, 4)];
  }

  if (body.recipe === "mars" || body.recipe === "rock") {
    const crater = noise > 0.82 && hash2d(textureX + 1, textureY, 4) > 0.52;
    const fleck = noise < 0.13;
    if (crater) return body.palette[Math.max(0, baseIndex - 1)];
    if (fleck) return body.palette[Math.min(4, baseIndex + 1)];
  }

  return body.palette[baseIndex];
}

function drawPixelSphere(
  context: CanvasRenderingContext2D,
  body: CelestialBody,
  centerX: number,
  centerY: number,
  radius: number,
  lightAngle: number,
  rotationPhase: number,
) {
  const lightX = Math.cos(lightAngle) * 0.72;
  const lightY = Math.sin(lightAngle) * 0.72;
  const lightZ = 0.7;

  for (let y = Math.floor(centerY - radius); y <= Math.ceil(centerY + radius); y += 1) {
    for (let x = Math.floor(centerX - radius); x <= Math.ceil(centerX + radius); x += 1) {
      const nx = (x + 0.5 - centerX) / radius;
      const ny = (y + 0.5 - centerY) / radius;
      const radiusSquared = nx * nx + ny * ny;
      if (radiusSquared > 1) continue;
      const nz = Math.sqrt(Math.max(0, 1 - radiusSquared));
      const longitude = wrapAngle(Math.atan2(nx, nz) + rotationPhase + Math.PI) - Math.PI;
      const latitude = Math.asin(clamp(ny, -1, 1));
      const surfaceX = longitude / Math.PI;
      const surfaceY = latitude / (Math.PI * 0.5);
      const textureX = Math.floor((surfaceX + 1) * body.spritePixels);
      const textureY = Math.floor((surfaceY + 1) * body.spritePixels * 0.5);
      const lighting = nx * lightX + ny * lightY + nz * lightZ - 0.08;
      context.fillStyle = getSurfaceColor(
        body,
        textureX,
        textureY,
        surfaceX,
        surfaceY,
        lighting,
      );
      context.fillRect(x, y, 1, 1);
    }
  }
}

function drawPixelSun(
  context: CanvasRenderingContext2D,
  body: CelestialBody,
  centerX: number,
  centerY: number,
  radius: number,
  rotationPhase: number,
) {
  for (let y = Math.floor(centerY - radius - 2); y <= Math.ceil(centerY + radius + 2); y += 1) {
    for (let x = Math.floor(centerX - radius - 2); x <= Math.ceil(centerX + radius + 2); x += 1) {
      const nx = (x + 0.5 - centerX) / radius;
      const ny = (y + 0.5 - centerY) / radius;
      const radial = Math.hypot(nx, ny);
      if (radial > 1) {
        const noise = hash2d(x, y, 99);
        if (radial < 1.12 && noise > 0.64) {
          context.fillStyle = noise > 0.87 ? body.palette[3] : body.palette[1];
          context.fillRect(x, y, 1, 1);
        }
        continue;
      }
      const nz = Math.sqrt(Math.max(0, 1 - radial * radial));
      const longitude = wrapAngle(Math.atan2(nx, nz) + rotationPhase + Math.PI) - Math.PI;
      const latitude = Math.asin(clamp(ny, -1, 1));
      const surfaceX = longitude / Math.PI;
      const surfaceY = latitude / (Math.PI * 0.5);
      const textureX = Math.floor((surfaceX + 1) * body.spritePixels);
      const textureY = Math.floor((surfaceY + 1) * body.spritePixels * 0.5);
      const noise = hash2d(textureX, textureY, 99);
      const hotSpot =
        Math.sin(surfaceX * 12.3) * Math.cos(surfaceY * 9.1) + noise * 1.2;
      const level = clamp(Math.floor((1 - radial) * 3.4 + hotSpot * 0.65 + 1.1), 0, 4);
      context.fillStyle = body.palette[level];
      context.fillRect(x, y, 1, 1);
    }
  }
}

function getBodySpriteBuffer(body: CelestialBody) {
  const cached = spriteBuffers.get(body.id);
  if (cached) return cached;
  const ringed = body.recipe === "saturn";
  const padding = body.recipe === "sun" ? 8 : 4;
  const width = ringed ? body.spritePixels * 2 + 12 : body.spritePixels + padding * 2;
  const height = ringed ? body.spritePixels + 12 : body.spritePixels + padding * 2;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context) context.imageSmoothingEnabled = false;
  const buffer = { canvas, context, lightStep: -1, rotationStep: -1, evolutionStep: -1 };
  spriteBuffers.set(body.id, buffer);
  return buffer;
}

function renderBodySprite(
  body: CelestialBody,
  lightStep: number,
  rotationPhase: number,
  evolutionStep = 0,
) {
  const buffer = getBodySpriteBuffer(body);
  const rotationColumns = Math.max(8, body.spritePixels * 2);
  const rotationStep = Math.round((wrapAngle(rotationPhase) / TAU) * rotationColumns) %
    rotationColumns;
  if (
    buffer.lightStep === lightStep &&
    buffer.rotationStep === rotationStep &&
    buffer.evolutionStep === evolutionStep
  ) {
    return buffer.canvas;
  }

  const { canvas, context } = buffer;
  if (!context) return canvas;
  context.clearRect(0, 0, canvas.width, canvas.height);

  const centerX = canvas.width * 0.5;
  const centerY = canvas.height * 0.5;
  const radius = body.spritePixels * 0.5;
  const lightAngle = (lightStep / 16) * TAU;
  const quantizedPhase = (rotationStep / rotationColumns) * TAU;
  const ringed = body.recipe === "saturn";

  if (ringed) {
    context.save();
    context.translate(centerX, centerY);
    context.rotate(-0.12);
    context.strokeStyle = "#75664f";
    context.lineWidth = 3;
    context.beginPath();
    context.ellipse(0, 0, radius * 1.9, radius * 0.56, 0, Math.PI, TAU);
    context.stroke();
    context.strokeStyle = "#d8bd80";
    context.lineWidth = 1;
    context.beginPath();
    context.ellipse(0, 0, radius * 2.12, radius * 0.66, 0, Math.PI, TAU);
    context.stroke();
    context.restore();
  }

  if (body.recipe === "sun") {
    drawPixelSun(context, body, centerX, centerY, radius, quantizedPhase);
  } else {
    drawPixelSphere(
      context,
      body,
      centerX,
      centerY,
      radius,
      lightAngle,
      quantizedPhase,
    );
  }

  if (ringed) {
    context.save();
    context.translate(centerX, centerY);
    context.rotate(-0.12);
    context.strokeStyle = "#b49866";
    context.lineWidth = 3;
    context.beginPath();
    context.ellipse(0, 0, radius * 1.9, radius * 0.56, 0, 0, Math.PI);
    context.stroke();
    context.strokeStyle = "#f1d99b";
    context.lineWidth = 1;
    context.beginPath();
    context.ellipse(0, 0, radius * 2.12, radius * 0.66, 0, 0, Math.PI);
    context.stroke();
    context.restore();
  }

  buffer.lightStep = lightStep;
  buffer.rotationStep = rotationStep;
  buffer.evolutionStep = evolutionStep;
  return canvas;
}

function drawBodyGlow(
  context: CanvasRenderingContext2D,
  rendered: RenderedBody,
  elapsedSeconds: number,
  reducedMotion: boolean,
  selectedId: BodyId | null,
  hoveredId: BodyId | null,
  dials: SpaceDials,
  stellar: StellarAppearance | null,
) {
  const { body, screen, visualSize } = rendered;
  if (body.id !== "sun" && body.id !== "moon" && body.id !== "earth") return;
  const baseIntensity = body.id === "sun" ? dials.glow.sun : body.id === "moon" ? dials.glow.moon : dials.glow.earth;
  const selectedMultiplier =
    selectedId === body.id ? 1 + (dials.living.selectedBoost - 1) * 0.55 : 1;
  const hoverMultiplier =
    body.id === "sun" && hoveredId === "sun"
      ? 1 + (dials.living.hoverBoost - 1) * 1.45
      : 1;
  const stellarGlow =
    body.id === "sun" && stellar
      ? stellar.glowIntensity * (1 - stellar.blackHoleIntensity)
      : 1;
  const intensity = baseIntensity * selectedMultiplier * hoverMultiplier * stellarGlow;
  if (intensity <= 0) return;
  const pulse = reducedMotion ? 1 : 1 + Math.sin(elapsedSeconds * 1.65) * 0.055;
  const glowRadius =
    (body.id === "sun" ? visualSize * 1.3 * pulse : body.id === "moon" ? visualSize * 0.72 : visualSize * 0.58) *
    Math.min(intensity, 1.85);
  if (!Number.isFinite(visualSize) || !Number.isFinite(glowRadius) || glowRadius <= 0) return;
  const gradient = context.createRadialGradient(
    screen.x,
    screen.y,
    visualSize * 0.15,
    screen.x,
    screen.y,
    glowRadius,
  );
  if (body.id === "sun") {
    const core = stellar?.glowCore ?? dials.glow.sunCore;
    const mid = stellar?.glowMid ?? dials.glow.sunMid;
    const edge = stellar?.glowEdge ?? dials.glow.sunEdge;
    gradient.addColorStop(0, hexToRgba(core, clamp(0.38 * intensity, 0, 1)));
    gradient.addColorStop(0.32, hexToRgba(mid, clamp(0.2 * intensity, 0, 1)));
    gradient.addColorStop(1, hexToRgba(edge, 0));
  } else if (body.id === "moon") {
    gradient.addColorStop(0, hexToRgba("#c2dcf4", clamp(0.16 * intensity, 0, 1)));
    gradient.addColorStop(1, hexToRgba("#7baedb", 0));
  } else {
    gradient.addColorStop(0, hexToRgba("#3d99d3", clamp(0.1 * intensity, 0, 1)));
    gradient.addColorStop(1, hexToRgba("#3d99d3", 0));
  }
  context.save();
  context.globalCompositeOperation = "screen";
  context.beginPath();
  context.arc(screen.x, screen.y, glowRadius, 0, TAU);
  context.clip();
  context.fillStyle = gradient;
  context.fillRect(
    screen.x - glowRadius,
    screen.y - glowRadius,
    glowRadius * 2,
    glowRadius * 2,
  );
  context.restore();
}

function drawSolarMotes(
  context: CanvasRenderingContext2D,
  sun: RenderedBody,
  elapsedSeconds: number,
  reducedMotion: boolean,
  selectedId: BodyId | null,
  dials: SpaceDials,
  stellar: StellarAppearance | null,
) {
  const count = Math.round(dials.glow.motes * (stellar?.moteCountScale ?? 1));
  if (count <= 0) return;
  const motion = reducedMotion ? 0 : elapsedSeconds * 0.18 * dials.living.surfaceSpeed;
  const selectedMultiplier =
    selectedId === "sun" ? 1 + (dials.living.selectedBoost - 1) * 0.45 : 1;
  const hot = stellar?.moteHot ?? dials.glow.moteHot;
  const ember = stellar?.moteEmber ?? dials.glow.moteEmber;
  const glowScale = stellar?.glowIntensity ?? 1;
  context.save();
  for (let index = 0; index < count; index += 1) {
    const seed = hashNumber(index * 43 + 17);
    const angle = seed * TAU + motion * (0.65 + hashNumber(index + 7));
    const radius = sun.visualSize * (0.53 + hashNumber(index * 19) * 0.65);
    const x = sun.screen.x + Math.cos(angle) * radius;
    const y = sun.screen.y + Math.sin(angle) * radius * 0.52;
    const alpha = 0.18 + hashNumber(index * 67) * 0.42;
    context.globalAlpha = alpha * dials.glow.sun * selectedMultiplier * glowScale;
    context.fillStyle = index % 3 === 0 ? hot : ember;
    context.fillRect(Math.round(x), Math.round(y), index % 7 === 0 ? 2 : 1, 1);
  }
  context.restore();
}

function drawCelestialBody(
  context: CanvasRenderingContext2D,
  rendered: RenderedBody,
  sunScreen: Point,
  rotationPhase: number,
  pulseScale: number,
  stellar: StellarAppearance | null = null,
) {
  const { body, screen, visualSize } = rendered;
  if (body.id === "sun" && stellar?.isBlackHole && stellar.blackHoleIntensity >= 0.86) {
    return;
  }
  const spriteBody =
    body.id === "sun" && stellar
      ? { ...body, palette: stellar.palette }
      : body;
  const lightAngle = Math.atan2(sunScreen.y - screen.y, sunScreen.x - screen.x);
  const lightStep = body.id === "sun" ? 0 : Math.round(((lightAngle + TAU) % TAU) / TAU * 16) % 16;
  const sprite = renderBodySprite(
    spriteBody,
    lightStep,
    rotationPhase,
    body.id === "sun" ? (stellar?.spriteKey ?? 0) : 0,
  );
  const aspect = sprite.width / sprite.height;
  const targetWidth = Math.max(1, Math.round(visualSize * pulseScale));
  const targetHeight = Math.max(1, Math.round((visualSize * pulseScale) / aspect));
  context.save();
  context.imageSmoothingEnabled = false;
  if (body.id === "sun" && stellar?.blackHoleIntensity) {
    context.globalAlpha = 1 - stellar.blackHoleIntensity;
  }
  context.drawImage(
    sprite,
    Math.round(screen.x - targetWidth * 0.5),
    Math.round(screen.y - targetHeight * 0.5),
    targetWidth,
    targetHeight,
  );
  context.restore();
}

function positionTargetControl(
  button: HTMLButtonElement | undefined,
  screen: Point,
  visualSize: number,
  hitSize: number,
  revealed: boolean,
  viewport: ViewportState,
) {
  if (!button) return;
  const inside =
    revealed &&
    screen.x > -hitSize &&
    screen.x < viewport.width + hitSize &&
    screen.y > -hitSize &&
    screen.y < viewport.height + hitSize;
  button.style.display = inside ? "grid" : "none";
  if (!inside) return;

  button.style.setProperty("--body-x", `${screen.x}px`);
  button.style.setProperty("--body-y", `${screen.y}px`);
  button.style.setProperty("--hit-size", `${hitSize * 2}px`);
  button.style.setProperty("--visual-size", `${visualSize}px`);
}

function positionMapControls(
  renderedBodies: readonly RenderedBody[],
  renderedMissions: readonly RenderedMission[],
  bodyButtons: Map<BodyId, HTMLButtonElement>,
  missionButtons: Map<MissionId, HTMLButtonElement>,
  viewport: ViewportState,
) {
  const visibleBodies = new Set<BodyId>();
  for (let index = 0; index < renderedBodies.length; index += 1) {
    const rendered = renderedBodies[index];
    visibleBodies.add(rendered.body.id);
    positionTargetControl(
      bodyButtons.get(rendered.body.id),
      rendered.screen,
      rendered.visualSize,
      rendered.hitSize,
      true,
      viewport,
    );
  }
  for (const [id, button] of bodyButtons) {
    if (!visibleBodies.has(id)) button.style.display = "none";
  }
  const visibleMissions = new Set<MissionId>();
  for (let index = 0; index < renderedMissions.length; index += 1) {
    const rendered = renderedMissions[index];
    visibleMissions.add(rendered.mission.id);
    positionTargetControl(
      missionButtons.get(rendered.mission.id),
      rendered.screen,
      rendered.visualSize,
      rendered.hitSize,
      rendered.revealed,
      viewport,
    );
  }
  for (const [id, button] of missionButtons) {
    if (!visibleMissions.has(id)) button.style.display = "none";
  }
}

function getLocalPoint(
  event: { clientX: number; clientY: number },
  element: HTMLElement,
): Point {
  const rect = element.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
}

function getTwoPointers(pointers: Map<number, PointerInfo>) {
  const iterator = pointers.values();
  const first = iterator.next().value as PointerInfo | undefined;
  const second = iterator.next().value as PointerInfo | undefined;
  return first && second ? [first, second] as const : null;
}

function HelpPanel({ onClose }: { onClose: () => void }) {
  return (
    <section className={`${styles.helpPanel} ${styles.interfaceControl}`} role="dialog" aria-label="Map controls">
      <div className={styles.panelHeading}>
        <div>
          <span className={styles.panelKicker}>NAVIGATION LOG</span>
          <h2>Move through space</h2>
        </div>
        <button type="button" className={styles.panelClose} onClick={onClose} aria-label="Close help">
          ×
        </button>
      </div>
      <dl className={styles.helpList}>
        <div><dt>Pan</dt><dd>Drag empty space · arrow keys</dd></div>
        <div><dt>Spin</dt><dd>Drag a world · flick to coast</dd></div>
        <div><dt>Zoom</dt><dd>Wheel · pinch · + / −</dd></div>
        <div><dt>Inspect</dt><dd>Click, tap, or focus a world or mission</dd></div>
        <div><dt>Return</dt><dd>Home key · recenter control</dd></div>
      </dl>
      <p className={styles.mapDisclaimer}>
        Mission positions are illustrative · Map not to scale
      </p>
    </section>
  );
}

export function SpaceExplorer() {
  const dials = useSpaceDials();
  const dialsRef = useRef(dials);
  const bodyInteractionsRef = useRef<Map<BodyId, BodyInteractionState> | null>(null);
  const orbitHoverStatesRef = useRef<Map<BodyId, OrbitHoverState> | null>(null);
  if (bodyInteractionsRef.current === null) {
    bodyInteractionsRef.current = createBodyInteractionStates(dials.living.surfaceSpeed);
  }
  if (orbitHoverStatesRef.current === null) {
    orbitHoverStatesRef.current = createOrbitHoverStates();
  }
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lensCanvasRef = useRef<HTMLCanvasElement>(null);
  const bodyButtonsRef = useRef(new Map<BodyId, HTMLButtonElement>());
  const missionButtonsRef = useRef(new Map<MissionId, HTMLButtonElement>());
  const cameraRef = useRef<CameraState>({ x: 0, y: 0, zoom: 0.5 });
  const viewportRef = useRef<ViewportState>({ width: 0, height: 0, dpr: 1 });
  const minZoomRef = useRef(0.1);
  const maxZoomRef = useRef(3.5);
  const renderedBodiesRef = useRef<RenderedBody[]>([]);
  const renderedMissionsRef = useRef<RenderedMission[]>([]);
  const pointersRef = useRef(new Map<number, PointerInfo>());
  const dragOriginRef = useRef<Point | null>(null);
  const dragCameraRef = useRef<CameraState | null>(null);
  const pinchRef = useRef<PinchState | null>(null);
  const spinDragRef = useRef<SpinDragState | null>(null);
  const missionPressRef = useRef<MissionPressState | null>(null);
  const movedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const cameraMovedRef = useRef(false);
  const requestDrawRef = useRef<() => void>(() => undefined);
  const selectedTargetRef = useRef<MapSelection | null>(null);
  const pointerHoveredTargetRef = useRef<MapSelection | null>(null);
  const focusedTargetRef = useRef<MapSelection | null>(null);
  const preferredHoverSourceRef = useRef<HoverSource>("pointer");
  const hoveredTargetRef = useRef<HoverTarget | null>(null);
  const eventSchedulerRef = useRef<EventSchedulerState | null>(null);
  const reducedMotionRef = useRef(false);
  const stellarRef = useRef(createStellarEvolutionState());
  const stellarUiRef = useRef<StellarUiSnapshot>(
    getStellarUiSnapshot(createStellarEvolutionState()),
  );
  const [selectedTarget, setSelectedTarget] = useState<MapSelection | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [stellarUi, setStellarUi] = useState<StellarUiSnapshot>(
    () => getStellarUiSnapshot(createStellarEvolutionState()),
  );

  const selectedBody =
    selectedTarget?.kind === "body"
      ? BODY_BY_ID.get(selectedTarget.id) ?? null
      : null;
  const selectedMission: MissionDefinition | null =
    selectedTarget?.kind === "mission"
      ? MISSION_BY_ID.get(selectedTarget.id) ?? null
      : null;

  useEffect(() => {
    selectedTargetRef.current = selectedTarget;
    requestDrawRef.current();
  }, [selectedTarget]);

  useEffect(() => {
    dialsRef.current = dials;
    requestDrawRef.current();
  }, [dials]);

  const markInteracted = useCallback(() => {
    setHasInteracted((current) => current || true);
  }, []);

  const publishStellarUi = useCallback((snapshot: StellarUiSnapshot) => {
    const previous = stellarUiRef.current;
    if (
      previous.clicks === snapshot.clicks &&
      previous.phase === snapshot.phase &&
      previous.locked === snapshot.locked &&
      previous.sunLabel === snapshot.sunLabel &&
      previous.announcement === snapshot.announcement
    ) {
      return;
    }
    stellarUiRef.current = snapshot;
    setStellarUi(snapshot);
  }, []);

  const restoreStellarCamera = useCallback((saved: CameraState | null) => {
    if (!saved) return;
    cameraRef.current = saved;
    requestDrawRef.current();
  }, []);

  const interruptStellarSequence = useCallback(() => {
    const stellar = stellarRef.current;
    const saved = stellar.savedCamera;
    const snapshot = skipStellarSequence(stellar);
    if (!snapshot) return false;
    restoreStellarCamera(saved);
    publishStellarUi(snapshot);
    requestDrawRef.current();
    return true;
  }, [publishStellarUi, restoreStellarCamera]);

  const commitBodyActivation = useCallback((id: BodyId) => {
    if (stellarRef.current.navigationLocked) return;
    const interaction = bodyInteractionsRef.current?.get(id);
    if (interaction && !reducedMotionRef.current) interaction.pulseElapsed = 0;
    if (id === "sun") {
      const snapshot = activateSun(
        stellarRef.current,
        cameraRef.current,
        reducedMotionRef.current,
      );
      if (snapshot) publishStellarUi(snapshot);
    }
    setSelectedTarget({ kind: "body", id });
    setHelpOpen(false);
    markInteracted();
    requestDrawRef.current();
  }, [markInteracted, publishStellarUi]);

  const selectBody = useCallback((id: BodyId) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    commitBodyActivation(id);
  }, [commitBodyActivation]);

  const commitMissionActivation = useCallback((id: MissionId) => {
    if (stellarRef.current.navigationLocked) return;
    setSelectedTarget({ kind: "mission", id });
    setHelpOpen(false);
    markInteracted();
    requestDrawRef.current();
  }, [markInteracted]);

  const selectMission = useCallback((id: MissionId) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    commitMissionActivation(id);
  }, [commitMissionActivation]);

  const resetCamera = useCallback(() => {
    if (stellarRef.current.navigationLocked) return;
    const viewport = viewportRef.current;
    const current = dialsRef.current;
    const fitZoom = computeFitZoom(
      viewport.width,
      viewport.height,
      systemRadiusForDials(current),
      current.camera.fitPaddingX,
      current.camera.fitPaddingY,
      current.camera.fitScale,
    );
    cameraRef.current = { x: 0, y: 0, zoom: fitZoom };
    minZoomRef.current = fitZoom * 0.72;
    maxZoomRef.current = Math.max(3.4, fitZoom * 6);
    cameraMovedRef.current = false;
    markInteracted();
    requestDrawRef.current();
  }, [markInteracted]);

  const zoomAt = useCallback((nextZoom: number, anchor?: Point) => {
    if (stellarRef.current.navigationLocked) return;
    const camera = cameraRef.current;
    const viewport = viewportRef.current;
    const target = anchor ?? { x: viewport.width * 0.5, y: viewport.height * 0.5 };
    const yFactor = dialsRef.current.scene.isometricY;
    const worldAnchor = screenToWorld(target, camera, viewport, yFactor);
    const zoom = clamp(nextZoom, minZoomRef.current, maxZoomRef.current);
    const projectedOffset = isometricUnproject({
      x: (target.x - viewport.width * 0.5) / zoom,
      y: (target.y - viewport.height * 0.5) / zoom,
    }, yFactor);
    cameraRef.current = {
      x: worldAnchor.x - projectedOffset.x,
      y: worldAnchor.y - projectedOffset.y,
      zoom,
    };
    cameraMovedRef.current = true;
    markInteracted();
    requestDrawRef.current();
  }, [markInteracted]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const lensCanvas = lensCanvasRef.current;
    if (!root || !canvas || !lensCanvas) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;
    const eventScheduler = eventSchedulerRef.current ?? createEventScheduler();
    eventSchedulerRef.current = eventScheduler;

    let disposed = false;
    let frameId = 0;
    let queuedReducedFrame = false;
    let visible = document.visibilityState !== "hidden";
    let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reducedMotionRef.current = reducedMotion;
    let elapsedSeconds = 0;
    let previousTime = performance.now();
    let lensRenderer: BlackHoleLensRenderer | null = null;
    let lensInitializing = false;
    let lensFailed = false;
    let lensInitToken = 0;
    lensCanvas.style.display = "none";

    const ensureLensRenderer = () => {
      if (lensRenderer || lensInitializing || lensFailed || disposed) return;
      lensInitializing = true;
      const token = ++lensInitToken;
      void import("./blackHoleLens")
        .then(({ createBlackHoleLensRenderer }) => {
          if (disposed || token !== lensInitToken) return;
          lensRenderer = createBlackHoleLensRenderer(lensCanvas);
        })
        .catch(() => {
          if (token === lensInitToken) lensFailed = true;
        })
        .finally(() => {
          if (token === lensInitToken) lensInitializing = false;
        });
    };

    const render = (now: number) => {
      if (disposed) return;
      queuedReducedFrame = false;
      const viewport = viewportRef.current;
      const frameDelta = Math.min(0.05, Math.max(0, (now - previousTime) / 1000));
      const deltaSeconds = reducedMotion ? 0 : frameDelta;
      elapsedSeconds += deltaSeconds;
      previousTime = now;

      const stellar = stellarRef.current;
      const savedCamera = stellar.savedCamera;
      const wasLocked = stellar.navigationLocked;
      const previousPhase = stellar.phase;
      stepStellarEvolution(stellar, frameDelta, reducedMotion);
      if (wasLocked && !stellar.navigationLocked) {
        if (savedCamera) cameraRef.current = savedCamera;
        publishStellarUi({
          ...getStellarUiSnapshot(stellar),
          announcement: "The solar system is restored.",
        });
      } else if (stellar.phase !== previousPhase || stellar.clicks !== stellarUiRef.current.clicks) {
        publishStellarUi(getStellarUiSnapshot(stellar));
      }

      const dials = dialsRef.current;
      const systemView = {
        x: 0,
        y: 0,
        zoom: computeFitZoom(
          viewport.width,
          viewport.height,
          systemRadiusForDials(dials),
          dials.camera.fitPaddingX,
          dials.camera.fitPaddingY,
          dials.camera.fitScale,
        ),
      };
      if (stellar.navigationLocked) {
        cameraRef.current = getStellarCamera(
          stellar,
          cameraRef.current,
          systemView,
          reducedMotion,
        );
      }
      const camera = cameraRef.current;
      const appearance = getStellarAppearance(stellar, dials);
      const catastrophe = getCatastropheFrame(stellar);
      const blackHole = getBlackHoleVisualFrame(
        stellar,
        viewport,
        reducedMotion,
        elapsedSeconds,
      );
      if (stellar.clicks >= 9) ensureLensRenderer();
      const gpuLensActive = Boolean(
        lensRenderer &&
        blackHole.visible &&
        blackHole.opacity > 0.02 &&
        blackHole.lensStrength > 0.02,
      );

      context.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
      stepBodyInteractions(
        bodyInteractionsRef.current!,
        deltaSeconds,
        reducedMotion,
        dials,
      );
      const yFactor = dials.scene.isometricY;
      const blackHoleCenter = worldToScreen(
        { x: 0, y: 0 },
        camera,
        viewport,
        yFactor,
      );
      const bodies = resolveBodies(dials);
      const selected = selectedTargetRef.current;
      const hovered = hoveredTargetRef.current;
      const selectedBodyId = selected?.kind === "body" ? selected.id : null;
      const hoveredBodyId = hovered?.kind === "body" ? hovered.id : null;
      context.fillStyle = dials.scene.background;
      context.fillRect(0, 0, viewport.width, viewport.height);

      drawInfiniteStarfield(
        context,
        camera,
        viewport,
        elapsedSeconds,
        reducedMotion,
        yFactor,
        dials,
        blackHole.visible && !gpuLensActive
          ? { center: blackHoleCenter, frame: blackHole }
          : null,
      );
      drawBlackHoleBackLayer(context, blackHoleCenter, blackHole);

      const homePositions = getBodyWorldPositions(bodies, elapsedSeconds, reducedMotion);
      const positions = new Map<BodyId, Point>();
      const catastrophePoses = new Map<BodyId, CatastrophePose>();
      for (let index = 0; index < bodies.length; index += 1) {
        const body = bodies[index];
        const home = homePositions.get(body.id) ?? { x: 0, y: 0 };
        if (body.id === "sun") {
          positions.set(body.id, home);
          continue;
        }
        const pose = applyCatastrophePose(
          home,
          catastrophe,
          (BODY_INDEX.get(body.id) ?? index) + 11,
          reducedMotion,
        );
        catastrophePoses.set(body.id, pose);
        positions.set(body.id, pose.world);
      }
      const orbitHoverStates = orbitHoverStatesRef.current!;
      stepOrbitHoverStates(
        orbitHoverStates,
        bodies,
        homePositions,
        hovered,
        deltaSeconds,
        reducedMotion,
        dials,
      );
      for (let index = 1; index < bodies.length; index += 1) {
        const body = bodies[index];
        const orbitHoverState = orbitHoverStates.get(body.id)!;
        const orbitAnimation: OrbitDrawState = {
          progress: orbitHoverState.progress,
          launchAngle: orbitHoverState.launchAngle,
          showEnergy: orbitHoverState.animated && !reducedMotion && !catastrophe.active,
          convergence: reducedMotion || catastrophe.active
            ? 0
            : orbitConvergenceEnvelope(
                orbitHoverState,
                dials.orbits.hoverMeetDuration,
              ),
        };
        const parentHome = body.parentId
          ? homePositions.get(body.parentId) ?? { x: 0, y: 0 }
          : { x: 0, y: 0 };
        const parent = body.parentId
          ? positions.get(body.parentId) ?? { x: 0, y: 0 }
          : { x: 0, y: 0 };
        const orbitVisual = catastropheOrbitFactor(
          body.orbitRadius + Math.hypot(parentHome.x, parentHome.y),
          Math.hypot(parentHome.x, parentHome.y),
          catastrophe,
          reducedMotion,
        );
        drawOrbit(
          context,
          body.orbitRadius,
          camera,
          viewport,
          yFactor,
          dials,
          parent,
          Boolean(body.parentId),
          orbitAnimation,
          orbitVisual,
        );
      }
      drawAsteroidBelt(
        context,
        camera,
        viewport,
        elapsedSeconds,
        reducedMotion,
        yFactor,
        dials,
        catastrophe,
      );

      const renderedBodies: RenderedBody[] = [];
      for (let index = 0; index < bodies.length; index += 1) {
        const body = bodies[index];
        const pose = catastrophePoses.get(body.id);
        if (pose?.swallowed) continue;
        const world = positions.get(body.id) ?? { x: 0, y: 0 };
        const screen = worldToScreen(world, camera, viewport, yFactor);
        const compactScale = clamp(viewport.width / 700, 0.54, 1);
        const sizeScale =
          (body.id === "sun" ? appearance.sizeScale : 1) * (pose?.scale ?? 1);
        const visualSize = Math.max(
          body.minDisplaySize * compactScale * Math.min(1, sizeScale),
          body.displaySize * camera.zoom * sizeScale,
        );
        renderedBodies.push({
          body,
          world,
          screen,
          visualSize,
          hitSize: Math.max(22, visualSize * 0.58 * dials.bodies.hitScale),
        });
      }
      renderedBodies.sort((a, b) => a.screen.y - b.screen.y);
      renderedBodiesRef.current = renderedBodies;

      const missionFrame = {
        camera,
        viewport,
        yFactor,
        bodyPositions: homePositions,
        elapsedSeconds,
        reducedMotion,
        dials,
      };
      const renderedMissions = getRenderedMissions(missionFrame);
      for (let index = 0; index < renderedMissions.length; index += 1) {
        const mission = renderedMissions[index];
        const pose = applyCatastrophePose(
          mission.world,
          catastrophe,
          80 + index,
          reducedMotion,
        );
        if (pose.swallowed) {
          mission.revealed = false;
          mission.visualSize = 0;
          continue;
        }
        mission.world = pose.world;
        mission.screen = worldToScreen(pose.world, camera, viewport, yFactor);
        mission.visualSize *= pose.scale;
        if (catastrophe.active) mission.revealed = pose.alpha > 0.08;
      }
      if (selected?.kind === "mission") {
        const selectedMission = renderedMissions.find(
          (item) => item.mission.id === selected.id,
        );
        if (selectedMission && selectedMission.visualSize > 0) selectedMission.revealed = true;
      }
      renderedMissionsRef.current = renderedMissions;

      const livingFrame = {
        camera,
        viewport,
        yFactor,
        renderedBodies,
        elapsedSeconds,
        reducedMotion,
        dials,
      };
      updateLivingEvents(eventScheduler, livingFrame, catastrophe.eventsSuspended);
      if (!catastrophe.trailsSuspended) {
        drawMissionTrails(context, renderedMissions, missionFrame);
      }
      if (!catastrophe.eventsSuspended) {
        drawLivingEventBackLayers(
          context,
          eventScheduler.active,
          renderedBodies,
          elapsedSeconds,
          dials,
        );
      }

      for (let index = 0; index < renderedBodies.length; index += 1) {
        drawBodyGlow(
          context,
          renderedBodies[index],
          elapsedSeconds,
          reducedMotion,
          selectedBodyId,
          hoveredBodyId,
          dials,
          appearance,
        );
      }

      const sun = renderedBodies.find((item) => item.body.id === "sun");
      const sunScreen = sun?.screen ?? { x: viewport.width * 0.5, y: viewport.height * 0.5 };
      if (sun && !appearance.isBlackHole && appearance.moteCountScale > 0.04) {
        drawSolarMotes(
          context,
          sun,
          elapsedSeconds,
          reducedMotion,
          selectedBodyId,
          dials,
          appearance,
        );
      }
      const sceneItems: SceneItem[] = [];
      for (let index = 0; index < renderedBodies.length; index += 1) {
        sceneItems.push({ kind: "body", rendered: renderedBodies[index] });
      }
      for (let index = 0; index < renderedMissions.length; index += 1) {
        if (renderedMissions[index].revealed) {
          sceneItems.push({ kind: "mission", rendered: renderedMissions[index] });
        }
      }
      sceneItems.sort((a, b) => a.rendered.screen.y - b.rendered.screen.y);

      for (let index = 0; index < sceneItems.length; index += 1) {
        const item = sceneItems[index];
        if (item.kind === "mission") {
          drawMission(
            context,
            item.rendered,
            sunScreen,
            elapsedSeconds,
            reducedMotion,
            selectionMatches(selected, "mission", item.rendered.mission.id),
            selectionMatches(hovered, "mission", item.rendered.mission.id),
            dials,
          );
          continue;
        }

        const rendered = item.rendered;
        const interaction = bodyInteractionsRef.current!.get(rendered.body.id)!;
        const pose = catastrophePoses.get(rendered.body.id);
        const bodyPulseEnvelope = pulseEnvelope(
          interaction,
          reducedMotion,
          dials.interaction.pulseDuration,
        );
        const bodyPulseScale = 1 + bodyPulseEnvelope * dials.interaction.pulseScale;
        context.save();
        if (pose) context.globalAlpha = pose.alpha;
        drawCelestialBody(
          context,
          rendered,
          sunScreen,
          interaction.rotationPhase,
          bodyPulseScale,
          rendered.body.id === "sun" ? appearance : null,
        );
        if (!(rendered.body.id === "sun" && appearance.isBlackHole)) {
          drawLivingSurface(
            context,
            rendered,
            sunScreen,
            eventScheduler.active,
            elapsedSeconds,
            reducedMotion,
            hoveredBodyId,
            selectedBodyId,
            interaction.rotationPhase,
            bodyPulseScale,
            bodyPulseEnvelope,
            dials,
            rendered.body.id === "sun" ? appearance : null,
          );
        }
        context.restore();
      }
      if (!catastrophe.eventsSuspended) {
        drawLivingEventFrontLayers(context, eventScheduler.active, livingFrame);
      }
      drawSceneAtmosphere(
        context,
        viewport.width,
        viewport.height,
        blackHoleCenter,
        appearance,
        blackHole,
      );
      drawBlackHoleFrontMatterLayer(context, blackHoleCenter, blackHole);
      let coreDrawn = false;
      if (!gpuLensActive) {
        drawBlackHoleCoreLayer(context, blackHoleCenter, blackHole);
        coreDrawn = true;
      }
      drawRebirthBurst(
        context,
        blackHoleCenter,
        catastrophe,
        blackHole,
        reducedMotion,
      );

      let lensRendered = false;
      if (gpuLensActive && lensRenderer) {
        try {
          lensRenderer.render({
            source: canvas,
            viewport,
            center: blackHoleCenter,
            frame: blackHole,
            elapsedSeconds,
            reducedMotion,
          });
          lensRendered = true;
        } catch {
          lensRenderer.destroy();
          lensRenderer = null;
          lensFailed = true;
        }
      }
      if (lensRendered) {
        lensCanvas.style.display = "block";
      } else {
        lensCanvas.style.display = "none";
        if (!coreDrawn) {
          drawBlackHoleCoreLayer(context, blackHoleCenter, blackHole);
        }
      }

      positionMapControls(
        renderedBodies,
        renderedMissions,
        bodyButtonsRef.current,
        missionButtonsRef.current,
        viewport,
      );

      const keepRunning =
        visible && (!reducedMotion || stellarNeedsAnimation(stellarRef.current));
      if (keepRunning) frameId = window.requestAnimationFrame(render);
    };

    const requestDraw = () => {
      if (!reducedMotion || queuedReducedFrame || !visible) return;
      queuedReducedFrame = true;
      frameId = window.requestAnimationFrame(render);
    };
    requestDrawRef.current = requestDraw;

    const resize = () => {
      const rect = root.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      viewportRef.current = { width, height, dpr };
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const current = dialsRef.current;
      const fitZoom = computeFitZoom(
        width,
        height,
        systemRadiusForDials(current),
        current.camera.fitPaddingX,
        current.camera.fitPaddingY,
        current.camera.fitScale,
      );
      minZoomRef.current = fitZoom * 0.72;
      maxZoomRef.current = Math.max(3.4, fitZoom * 6);
      if (!stellarRef.current.navigationLocked) {
        if (!cameraMovedRef.current) {
          cameraRef.current = { x: 0, y: 0, zoom: fitZoom };
        } else {
          cameraRef.current.zoom = clamp(
            cameraRef.current.zoom,
            minZoomRef.current,
            maxZoomRef.current,
          );
        }
      }
      requestDraw();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(root);
    resize();

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => {
      reducedMotion = motionQuery.matches;
      reducedMotionRef.current = reducedMotion;
      window.cancelAnimationFrame(frameId);
      previousTime = performance.now();
      if (visible) {
        if (reducedMotion) requestDraw();
        else frameId = window.requestAnimationFrame(render);
      }
    };
    motionQuery.addEventListener("change", onMotionChange);

    const onVisibilityChange = () => {
      visible = document.visibilityState !== "hidden";
      window.cancelAnimationFrame(frameId);
      previousTime = performance.now();
      if (visible) {
        if (reducedMotion) requestDraw();
        else frameId = window.requestAnimationFrame(render);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const anchor = getLocalPoint(event, root);
      const normalizedDelta = clamp(event.deltaY, -120, 120);
      const factor = Math.exp(-normalizedDelta * 0.0018);
      zoomAt(cameraRef.current.zoom * factor, anchor);
    };
    root.addEventListener("wheel", onWheel, { passive: false });

    if (reducedMotion) requestDraw();
    else frameId = window.requestAnimationFrame(render);

    return () => {
      disposed = true;
      lensInitToken += 1;
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      motionQuery.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      root.removeEventListener("wheel", onWheel);
      lensRenderer?.destroy();
      lensRenderer = null;
      lensCanvas.style.display = "none";
      requestDrawRef.current = () => undefined;
    };
  }, [publishStellarUi, zoomAt]);

  const syncHoveredTarget = useCallback(() => {
    const pointerTarget = pointerHoveredTargetRef.current;
    const focusTarget = focusedTargetRef.current;
    const preferredSource = preferredHoverSourceRef.current;
    const preferredTarget =
      preferredSource === "pointer" ? pointerTarget : focusTarget;
    const fallbackTarget =
      preferredSource === "pointer" ? focusTarget : pointerTarget;
    const fallbackSource: HoverSource =
      preferredSource === "pointer" ? "focus" : "pointer";
    hoveredTargetRef.current = preferredTarget
      ? { ...preferredTarget, source: preferredSource }
      : fallbackTarget
        ? { ...fallbackTarget, source: fallbackSource }
        : null;
    requestDrawRef.current();
  }, []);

  const updateBodyHover = useCallback((
    id: BodyId | null,
    source: HoverSource,
  ) => {
    const target = id ? { kind: "body" as const, id } : null;
    if (source === "pointer") pointerHoveredTargetRef.current = target;
    else focusedTargetRef.current = target;
    if (target) preferredHoverSourceRef.current = source;
    else if (preferredHoverSourceRef.current === source) {
      preferredHoverSourceRef.current =
        source === "pointer" ? "focus" : "pointer";
    }
    syncHoveredTarget();
  }, [syncHoveredTarget]);

  const updateMissionHover = useCallback((
    id: MissionId | null,
    source: HoverSource,
  ) => {
    const target = id ? { kind: "mission" as const, id } : null;
    if (source === "pointer") pointerHoveredTargetRef.current = target;
    else focusedTargetRef.current = target;
    if (target) preferredHoverSourceRef.current = source;
    else if (preferredHoverSourceRef.current === source) {
      preferredHoverSourceRef.current =
        source === "pointer" ? "focus" : "pointer";
    }
    syncHoveredTarget();
  }, [syncHoveredTarget]);

  const setBodyButtonRef = useCallback((id: BodyId, node: HTMLButtonElement | null) => {
    if (node) bodyButtonsRef.current.set(id, node);
    else bodyButtonsRef.current.delete(id);
  }, []);

  const setMissionButtonRef = useCallback((id: MissionId, node: HTMLButtonElement | null) => {
    if (node) missionButtonsRef.current.set(id, node);
    else missionButtonsRef.current.delete(id);
  }, []);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest(`.${styles.interfaceControl}`)) return;
    if (stellarRef.current.navigationLocked) return;
    const root = event.currentTarget;
    const captureTarget = event.target as HTMLElement;
    captureTarget.setPointerCapture(event.pointerId);
    const local = getLocalPoint(event, root);
    const bodyId = bodyIdFromTarget(event.target);
    const missionId = missionIdFromTarget(event.target);
    pointersRef.current.set(event.pointerId, local);
    movedRef.current = false;
    suppressClickRef.current = false;
    markInteracted();

    if (pointersRef.current.size === 1) {
      if (bodyId) {
        missionPressRef.current = null;
        const interaction = bodyInteractionsRef.current?.get(bodyId);
        if (interaction) {
          interaction.dragging = true;
          interaction.angularVelocity =
            getBodyBaseSpin(bodyId) * dialsRef.current.living.surfaceSpeed;
        }
        spinDragRef.current = {
          pointerId: event.pointerId,
          bodyId,
          origin: local,
          lastPoint: local,
          lastTime: event.timeStamp,
        };
        dragOriginRef.current = null;
        dragCameraRef.current = null;
        root.dataset.interaction = "spin";
      } else if (missionId) {
        spinDragRef.current = null;
        missionPressRef.current = {
          pointerId: event.pointerId,
          missionId,
        };
        dragOriginRef.current = local;
        dragCameraRef.current = { ...cameraRef.current };
        root.dataset.interaction = "pan";
      } else {
        spinDragRef.current = null;
        missionPressRef.current = null;
        dragOriginRef.current = local;
        dragCameraRef.current = { ...cameraRef.current };
        root.dataset.interaction = "pan";
      }
      pinchRef.current = null;
    } else {
      const spinDrag = spinDragRef.current;
      if (spinDrag) {
        const interaction = bodyInteractionsRef.current?.get(spinDrag.bodyId);
        if (interaction) {
          interaction.dragging = false;
          interaction.angularVelocity =
            getBodyBaseSpin(spinDrag.bodyId) * dialsRef.current.living.surfaceSpeed;
        }
        spinDragRef.current = null;
      }
      missionPressRef.current = null;
      root.dataset.interaction = "pan";
      const pair = getTwoPointers(pointersRef.current);
      if (pair) {
        const center = midpoint(pair[0], pair[1]);
        pinchRef.current = {
          distance: Math.max(1, distance(pair[0], pair[1])),
          worldAnchor: screenToWorld(center, cameraRef.current, viewportRef.current, dialsRef.current.scene.isometricY),
        };
      }
    }
  }, [markInteracted]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (stellarRef.current.navigationLocked) return;
    if (!pointersRef.current.has(event.pointerId)) return;
    const root = event.currentTarget;
    const local = getLocalPoint(event, root);
    pointersRef.current.set(event.pointerId, local);

    if (pointersRef.current.size >= 2) {
      const pair = getTwoPointers(pointersRef.current);
      const pinch = pinchRef.current;
      if (!pair || !pinch) return;
      const center = midpoint(pair[0], pair[1]);
      const nextZoom = clamp(
        cameraRef.current.zoom * (distance(pair[0], pair[1]) / pinch.distance),
        minZoomRef.current,
        maxZoomRef.current,
      );
      const yFactor = dialsRef.current.scene.isometricY;
      const projectedOffset = isometricUnproject({
        x: (center.x - viewportRef.current.width * 0.5) / nextZoom,
        y: (center.y - viewportRef.current.height * 0.5) / nextZoom,
      }, yFactor);
      cameraRef.current = {
        x: pinch.worldAnchor.x - projectedOffset.x,
        y: pinch.worldAnchor.y - projectedOffset.y,
        zoom: nextZoom,
      };
      pinch.distance = Math.max(1, distance(pair[0], pair[1]));
      pinch.worldAnchor = screenToWorld(center, cameraRef.current, viewportRef.current, dialsRef.current.scene.isometricY);
      movedRef.current = true;
      cameraMovedRef.current = true;
      requestDrawRef.current();
      return;
    }

    const spinDrag = spinDragRef.current;
    if (spinDrag?.pointerId === event.pointerId) {
      const interaction = bodyInteractionsRef.current?.get(spinDrag.bodyId);
      if (!interaction) return;
      const rendered = renderedBodiesRef.current.find(
        (item) => item.body.id === spinDrag.bodyId,
      );
      const diameter = Math.max(24, rendered?.visualSize ?? 24);
      const deltaAngle =
        (-(local.x - spinDrag.lastPoint.x) / diameter) *
        Math.PI *
        dialsRef.current.interaction.spinSensitivity;
      const deltaTime = clamp((event.timeStamp - spinDrag.lastTime) / 1000, 1 / 240, 0.1);
      const instantVelocity = deltaAngle / deltaTime;
      const maxSpinSpeed = dialsRef.current.interaction.maxSpinSpeed;
      interaction.rotationPhase = wrapAngle(interaction.rotationPhase + deltaAngle);
      interaction.angularVelocity = clamp(
        interaction.angularVelocity * 0.55 + instantVelocity * 0.45,
        -maxSpinSpeed,
        maxSpinSpeed,
      );
      spinDrag.lastPoint = local;
      spinDrag.lastTime = event.timeStamp;
      if (distance(spinDrag.origin, local) > 5) movedRef.current = true;
      requestDrawRef.current();
      return;
    }

    const origin = dragOriginRef.current;
    const startCamera = dragCameraRef.current;
    if (!origin || !startCamera) return;
    const screenDelta = { x: local.x - origin.x, y: local.y - origin.y };
    if (Math.hypot(screenDelta.x, screenDelta.y) > 5) movedRef.current = true;
    const worldDelta = isometricUnproject({
      x: -screenDelta.x / startCamera.zoom,
      y: -screenDelta.y / startCamera.zoom,
    }, dialsRef.current.scene.isometricY);
    cameraRef.current = {
      x: startCamera.x + worldDelta.x,
      y: startCamera.y + worldDelta.y,
      zoom: startCamera.zoom,
    };
    cameraMovedRef.current = true;
    requestDrawRef.current();
  }, []);

  const handlePointerEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const wasSinglePointer = pointersRef.current.size === 1;
    const releasePoint = getLocalPoint(event, event.currentTarget);
    const spinDrag = spinDragRef.current;
    const missionPress = missionPressRef.current;
    const handledSpin = spinDrag?.pointerId === event.pointerId;
    const handledMission = missionPress?.pointerId === event.pointerId;
    if (handledMission && missionPress) {
      if (!movedRef.current && event.type !== "pointercancel") {
        commitMissionActivation(missionPress.missionId);
        suppressClickRef.current = true;
      }
      missionPressRef.current = null;
    } else if (handledSpin && spinDrag) {
      const interaction = bodyInteractionsRef.current?.get(spinDrag.bodyId);
      if (interaction) {
        interaction.dragging = false;
        if (event.type === "pointercancel" || reducedMotionRef.current) {
          interaction.angularVelocity = reducedMotionRef.current
            ? 0
            : getBodyBaseSpin(spinDrag.bodyId) * dialsRef.current.living.surfaceSpeed;
        } else if (event.timeStamp - spinDrag.lastTime > 90) {
          interaction.angularVelocity =
            getBodyBaseSpin(spinDrag.bodyId) * dialsRef.current.living.surfaceSpeed;
        } else {
          interaction.angularVelocity = clamp(
            interaction.angularVelocity,
            -dialsRef.current.interaction.maxSpinSpeed,
            dialsRef.current.interaction.maxSpinSpeed,
          );
        }
      }
      if (!movedRef.current && event.type !== "pointercancel") {
        commitBodyActivation(spinDrag.bodyId);
        suppressClickRef.current = true;
      }
      spinDragRef.current = null;
    } else if (wasSinglePointer && !movedRef.current) {
      let closest: MapSelection | null = null;
      let closestDistance = Number.POSITIVE_INFINITY;
      const renderedBodies = renderedBodiesRef.current;
      for (let index = 0; index < renderedBodies.length; index += 1) {
        const candidate = renderedBodies[index];
        const candidateDistance = distance(releasePoint, candidate.screen);
        if (candidateDistance <= candidate.hitSize && candidateDistance < closestDistance) {
          closest = { kind: "body", id: candidate.body.id };
          closestDistance = candidateDistance;
        }
      }
      const renderedMissions = renderedMissionsRef.current;
      for (let index = 0; index < renderedMissions.length; index += 1) {
        const candidate = renderedMissions[index];
        if (!candidate.revealed) continue;
        const candidateDistance = distance(releasePoint, candidate.screen);
        if (candidateDistance <= candidate.hitSize && candidateDistance < closestDistance) {
          closest = { kind: "mission", id: candidate.mission.id };
          closestDistance = candidateDistance;
        }
      }
      if (closest) {
        if (closest.kind === "body") commitBodyActivation(closest.id);
        else commitMissionActivation(closest.id);
        suppressClickRef.current = true;
      }
    }
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size === 0) {
      event.currentTarget.dataset.interaction = "idle";
    }
    const captureTarget = event.target as HTMLElement;
    if (captureTarget.hasPointerCapture(event.pointerId)) {
      captureTarget.releasePointerCapture(event.pointerId);
    }
    if (event.type === "pointercancel") suppressClickRef.current = false;
    else if (movedRef.current) suppressClickRef.current = true;
    const remaining = getTwoPointers(pointersRef.current);
    if (remaining) {
      const center = midpoint(remaining[0], remaining[1]);
      pinchRef.current = {
        distance: Math.max(1, distance(remaining[0], remaining[1])),
        worldAnchor: screenToWorld(center, cameraRef.current, viewportRef.current, dialsRef.current.scene.isometricY),
      };
    } else {
      const single = pointersRef.current.values().next().value as PointerInfo | undefined;
      dragOriginRef.current = single ?? null;
      dragCameraRef.current = single ? { ...cameraRef.current } : null;
      pinchRef.current = null;
      if (single) event.currentTarget.dataset.interaction = "pan";
    }
  }, [commitBodyActivation, commitMissionActivation]);

  const centerBodyForKeyboard = useCallback((id: BodyId) => {
    if (stellarRef.current.navigationLocked) return;
    const rendered = renderedBodiesRef.current.find((item) => item.body.id === id);
    if (!rendered) return;
    cameraRef.current = {
      ...cameraRef.current,
      x: rendered.world.x,
      y: rendered.world.y,
    };
    cameraMovedRef.current = true;
    requestDrawRef.current();
  }, []);

  const centerMissionForKeyboard = useCallback((id: MissionId) => {
    if (stellarRef.current.navigationLocked) return;
    const rendered = renderedMissionsRef.current.find(
      (item) => item.mission.id === id,
    );
    if (!rendered) return;
    cameraRef.current = {
      ...cameraRef.current,
      x: rendered.world.x,
      y: rendered.world.y,
    };
    cameraMovedRef.current = true;
    requestDrawRef.current();
  }, []);

  const handleKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      if (interruptStellarSequence()) {
        event.preventDefault();
        setSelectedTarget(null);
        setHelpOpen(false);
        return;
      }
    }
    if (stellarRef.current.navigationLocked) return;
    const camera = cameraRef.current;
    const panPixels = event.shiftKey ? 96 : 48;
    let handled = true;
    switch (event.key) {
      case "ArrowLeft": {
        const delta = isometricUnproject({ x: -panPixels / camera.zoom, y: 0 }, dialsRef.current.scene.isometricY);
        cameraRef.current = { ...camera, x: camera.x + delta.x, y: camera.y + delta.y };
        break;
      }
      case "ArrowRight": {
        const delta = isometricUnproject({ x: panPixels / camera.zoom, y: 0 }, dialsRef.current.scene.isometricY);
        cameraRef.current = { ...camera, x: camera.x + delta.x, y: camera.y + delta.y };
        break;
      }
      case "ArrowUp": {
        const delta = isometricUnproject({ x: 0, y: -panPixels / camera.zoom }, dialsRef.current.scene.isometricY);
        cameraRef.current = { ...camera, x: camera.x + delta.x, y: camera.y + delta.y };
        break;
      }
      case "ArrowDown": {
        const delta = isometricUnproject({ x: 0, y: panPixels / camera.zoom }, dialsRef.current.scene.isometricY);
        cameraRef.current = { ...camera, x: camera.x + delta.x, y: camera.y + delta.y };
        break;
      }
      case "+":
      case "=":
        zoomAt(camera.zoom * 1.25);
        break;
      case "-":
      case "_":
        zoomAt(camera.zoom / 1.25);
        break;
      case "Home":
        resetCamera();
        break;
      case "Escape":
        setSelectedTarget(null);
        setHelpOpen(false);
        break;
      default:
        handled = false;
    }
    if (!handled) return;
    event.preventDefault();
    cameraMovedRef.current = event.key !== "Home";
    markInteracted();
    requestDrawRef.current();
  }, [interruptStellarSequence, markInteracted, resetCamera, zoomAt]);

  useEffect(() => {
    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (!stellarRef.current.navigationLocked) return;
      event.preventDefault();
      interruptStellarSequence();
      setSelectedTarget(null);
      setHelpOpen(false);
    };
    window.addEventListener("keydown", onWindowKeyDown);
    return () => window.removeEventListener("keydown", onWindowKeyDown);
  }, [interruptStellarSequence]);

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if ((event.target as HTMLElement).closest("button, article, section")) return;
    setSelectedTarget(null);
  }, []);

  const chromeStyle = {
    "--space-bg": dials.scene.background,
    "--pixel-wash-opacity": String(dials.scene.pixelWashOpacity),
    "--ui-ink": dials.ui.ink,
    "--ui-muted": dials.ui.muted,
    "--ui-line": hexToRgba(dials.ui.line, dials.ui.lineOpacity),
    "--nav-size": `${dials.navigator.buttonSize}px`,
    "--nav-bottom": `${dials.navigator.bottom}px`,
    "--nav-opacity": String(dials.navigator.opacity),
    "--nav-ink": dials.navigator.ink,
    "--nav-active-ink": dials.navigator.activeInk,
    "--nav-fill": hexToRgba(dials.navigator.fill, dials.navigator.fillOpacity),
  } as CSSProperties;

  return (
    <>
    <SpaceDialRoot theme="dark" position="top-right" defaultOpen />
    <main
      ref={rootRef}
      className={styles.space}
      style={chromeStyle}
      data-interaction="idle"
      data-cinematic={stellarUi.locked ? "true" : "false"}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onKeyDown={handleKeyDown}
      onClick={handleCanvasClick}
      tabIndex={-1}
      aria-label="Interactive pixel-art map of the solar system and space missions"
    >
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <canvas
        ref={lensCanvasRef}
        className={`${styles.canvas} ${styles.lensCanvas}`}
        aria-hidden="true"
      />
      <div className={styles.pixelWash} aria-hidden="true" />

      <div className={styles.bodyLayer} aria-label="Celestial bodies and space missions">
        {CELESTIAL_BODIES.map((body) => (
          <button
            key={body.id}
            ref={(node) => setBodyButtonRef(body.id, node)}
            data-body-id={body.id}
            type="button"
            className={styles.bodyTarget}
            aria-label={
              body.id === "sun"
                ? stellarUi.sunLabel
                : `${body.name}. ${body.flavor} Click to inspect; drag horizontally to spin.`
            }
            aria-pressed={selectionMatches(selectedTarget, "body", body.id)}
            onPointerEnter={(event) => {
              if (event.pointerType !== "touch") {
                updateBodyHover(body.id, "pointer");
              }
            }}
            onPointerLeave={(event) => {
              if (event.pointerType !== "touch") {
                updateBodyHover(null, "pointer");
              }
            }}
            onFocus={(event) => {
              if (event.currentTarget.matches(":focus-visible")) {
                updateBodyHover(body.id, "focus");
                setSelectedTarget({ kind: "body", id: body.id });
                centerBodyForKeyboard(body.id);
              }
            }}
            onBlur={() => updateBodyHover(null, "focus")}
            onClick={(event) => {
              event.stopPropagation();
              selectBody(body.id);
            }}
          >
            <span className={styles.focusReticle} aria-hidden="true" />
          </button>
        ))}
        {MISSION_DEFINITIONS.map((mission) => (
          <button
            key={mission.id}
            ref={(node) => setMissionButtonRef(mission.id, node)}
            data-mission-id={mission.id}
            type="button"
            className={`${styles.bodyTarget} ${styles.missionTarget}`}
            aria-label={`${mission.name}, launched ${mission.launchYear}. ${mission.fact} Click to inspect.`}
            aria-pressed={selectionMatches(selectedTarget, "mission", mission.id)}
            onPointerEnter={(event) => {
              if (event.pointerType !== "touch") {
                updateMissionHover(mission.id, "pointer");
              }
            }}
            onPointerLeave={(event) => {
              if (event.pointerType !== "touch") {
                updateMissionHover(null, "pointer");
              }
            }}
            onFocus={(event) => {
              if (event.currentTarget.matches(":focus-visible")) {
                updateMissionHover(mission.id, "focus");
                setSelectedTarget({ kind: "mission", id: mission.id });
                centerMissionForKeyboard(mission.id);
              }
            }}
            onBlur={() => updateMissionHover(null, "focus")}
            onClick={(event) => {
              event.stopPropagation();
              selectMission(mission.id);
            }}
          >
            <span className={styles.focusReticle} aria-hidden="true" />
          </button>
        ))}
      </div>

      {!hasInteracted ? (
        <div className={`${styles.gestureHint} ${styles.interfaceControl}`} role="status">
          <span className={styles.mouseGlyph} aria-hidden="true"><i /></span>
          <span><strong>Drag worlds</strong> to spin · <strong>drag space</strong> to travel</span>
        </div>
      ) : null}

      <nav className={`${styles.navigator} ${styles.interfaceControl}`} aria-label="Map controls">
        <button
          type="button"
          onClick={() => zoomAt(cameraRef.current.zoom / 1.28)}
          aria-label="Zoom out"
          title="Zoom out"
          disabled={stellarUi.locked}
        >
          −
        </button>
        <button
          type="button"
          onClick={() => zoomAt(cameraRef.current.zoom * 1.28)}
          aria-label="Zoom in"
          title="Zoom in"
          disabled={stellarUi.locked}
        >
          +
        </button>
        <button
          type="button"
          onClick={resetCamera}
          aria-label="Recenter the solar system"
          title="Recenter"
          disabled={stellarUi.locked}
        >
          ◎
        </button>
        <button
          type="button"
          aria-label="Show map controls"
          aria-expanded={helpOpen}
          onClick={() => {
            setHelpOpen((current) => !current);
            markInteracted();
          }}
          title="Help"
        >
          ?
        </button>
      </nav>

      {helpOpen ? <HelpPanel onClose={() => setHelpOpen(false)} /> : null}

      <div className={styles.srOnly} aria-live="polite">
        {stellarUi.announcement
          ? stellarUi.announcement
          : selectedMission
            ? `${selectedMission.name}. ${selectedMission.fact} ${selectedMission.flavor}`
            : selectedBody
              ? `${selectedBody.name}. ${selectedBody.flavor}`
              : "No celestial body or mission selected."}
      </div>
    </main>
    </>
  );
}
