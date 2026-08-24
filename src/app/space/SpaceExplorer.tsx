"use client";

import "dialkit/styles.css";
import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import styles from "./space.module.css";
import { hexToRgba, useSpaceDials, type SpaceDials } from "./useSpaceDials";

const SpaceDialRoot = dynamic(
  () => import("dialkit").then((module) => module.DialRoot),
  { ssr: false },
);

type BodyId =
  | "sun"
  | "mercury"
  | "venus"
  | "earth"
  | "moon"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune";

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
  labelPriority: number;
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

type PointerInfo = {
  x: number;
  y: number;
};

type PinchState = {
  distance: number;
  worldAnchor: Point;
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
    labelPriority: 100,
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
    labelPriority: 70,
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
    labelPriority: 74,
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
    labelPriority: 96,
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
    labelPriority: 48,
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
    labelPriority: 76,
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
    labelPriority: 90,
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
    labelPriority: 92,
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
    labelPriority: 80,
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
    labelPriority: 84,
    flavor: "The last blue lantern before the solar dark.",
  },
] as const;

const BODY_BY_ID = new Map(CELESTIAL_BODIES.map((body) => [body.id, body]));
const BODY_INDEX = new Map(CELESTIAL_BODIES.map((body, index) => [body.id, index]));
const spriteCache = new Map<string, HTMLCanvasElement>();

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function distance(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
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
          const alpha = clamp(layer.alpha * twinkle * dials.starfield.opacity, 0.04, 1);
          const size = bright > 0.92 ? 2 : 1;
          const colorRoll = hashNumber(seed + 88);
          context.globalAlpha = alpha;
          context.fillStyle =
            colorRoll > 0.94 ? dials.starfield.warm : colorRoll < 0.08 ? dials.starfield.cool : dials.starfield.white;
          context.fillRect(Math.round(x), Math.round(y), size, size);

          if (bright > 0.975 && layerIndex === 2) {
            context.globalAlpha = alpha * 0.45;
            context.fillRect(Math.round(x) - 2, Math.round(y), 5, 1);
            context.fillRect(Math.round(x), Math.round(y) - 2, 1, 5);
          }
        }
      }
    }
  }
  context.restore();
}

function drawOrbit(
  context: CanvasRenderingContext2D,
  radius: number,
  camera: CameraState,
  viewport: ViewportState,
  yFactor: number,
  dials: SpaceDials,
  parent: Point = { x: 0, y: 0 },
  moonOrbit = false,
) {
  context.save();
  context.beginPath();
  for (let index = 0; index <= ORBIT_SAMPLE_COUNT; index += 1) {
    const angle = (index / ORBIT_SAMPLE_COUNT) * TAU;
    const local = orbitPosition(radius, angle);
    const point = worldToScreen(
      { x: local.x + parent.x, y: local.y + parent.y },
      camera,
      viewport,
      yFactor,
    );
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  }
  context.closePath();
  context.setLineDash(moonOrbit ? [2, dials.orbits.moonDash] : [2, dials.orbits.dash]);
  context.lineDashOffset = moonOrbit ? 0 : 2;
  context.lineWidth = 1;
  context.strokeStyle = moonOrbit
    ? hexToRgba(dials.orbits.moonColor, dials.orbits.moonOpacity)
    : hexToRgba(dials.orbits.color, dials.orbits.opacity);
  context.stroke();
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
) {
  const motion = reducedMotion ? 0 : (elapsedSeconds / 260) * dials.asteroids.speed;
  const count = Math.round(dials.asteroids.count);
  context.save();
  for (let index = 0; index < count; index += 1) {
    const seededAngle = hashNumber(index * 31 + 8) * TAU;
    const radius = dials.asteroids.radius + (hashNumber(index * 83 + 19) - 0.5) * dials.asteroids.spread;
    const drift = motion * (0.72 + hashNumber(index + 91) * 0.45);
    const position = orbitPosition(radius, seededAngle + drift);
    const screen = worldToScreen(position, camera, viewport, yFactor);
    if (
      screen.x < -4 ||
      screen.x > viewport.width + 4 ||
      screen.y < -4 ||
      screen.y > viewport.height + 4
    ) {
      continue;
    }
    const size = hashNumber(index * 17) > 0.9 ? 2 : 1;
    context.globalAlpha = (0.32 + hashNumber(index * 57) * 0.38) * dials.asteroids.opacity;
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
  x: number,
  y: number,
  nx: number,
  ny: number,
  lighting: number,
) {
  const baseIndex = shadeIndex(lighting);
  const noise = hash2d(x, y, BODY_INDEX.get(body.id) ?? 0);

  if (body.recipe === "earth") {
    const continent =
      Math.sin(nx * 8.4 + Math.sin(ny * 7.2) * 1.6) +
        Math.cos(ny * 10.7 - nx * 2.2) +
        noise * 1.7 >
      1.25;
    const cloud =
      lighting > -0.1 &&
      Math.sin(ny * 18 + nx * 4.5) + noise * 1.25 > 1.78;
    if (cloud) return lighting > 0.42 ? "#f4fbf3" : "#a7c8ce";
    if (continent) {
      const landPalette = ["#17372d", "#24543d", "#39734c", "#6a9b5b", "#b7c47b"];
      return landPalette[baseIndex];
    }
  }

  if (body.recipe === "jupiter") {
    const band = Math.sin(ny * 25 + noise * 2.4);
    const spot = ((nx - 0.35) / 0.27) ** 2 + ((ny - 0.18) / 0.13) ** 2 < 1;
    if (spot) return lighting > 0.32 ? "#d66c4f" : "#833b36";
    const adjustment = band > 0.5 ? 1 : band < -0.48 ? -1 : 0;
    return body.palette[clamp(baseIndex + adjustment, 0, 4)];
  }

  if (body.recipe === "saturn" || body.recipe === "venus" || body.recipe === "ice") {
    const band = Math.sin(ny * (body.recipe === "venus" ? 17 : 24) + noise * 1.8);
    const adjustment = band > 0.68 ? 1 : band < -0.7 ? -1 : 0;
    return body.palette[clamp(baseIndex + adjustment, 0, 4)];
  }

  if (body.recipe === "mars" || body.recipe === "rock") {
    const crater = noise > 0.82 && hash2d(x + 1, y, 4) > 0.52;
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
      const lighting = nx * lightX + ny * lightY + nz * lightZ - 0.08;
      context.fillStyle = getSurfaceColor(body, x, y, nx, ny, lighting);
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
) {
  for (let y = Math.floor(centerY - radius - 2); y <= Math.ceil(centerY + radius + 2); y += 1) {
    for (let x = Math.floor(centerX - radius - 2); x <= Math.ceil(centerX + radius + 2); x += 1) {
      const nx = (x + 0.5 - centerX) / radius;
      const ny = (y + 0.5 - centerY) / radius;
      const radial = Math.hypot(nx, ny);
      const noise = hash2d(x, y, 99);
      if (radial > 1) {
        if (radial < 1.12 && noise > 0.64) {
          context.fillStyle = noise > 0.87 ? body.palette[3] : body.palette[1];
          context.fillRect(x, y, 1, 1);
        }
        continue;
      }
      const hotSpot = Math.sin(x * 1.23) * Math.cos(y * 0.91) + noise * 1.2;
      const level = clamp(Math.floor((1 - radial) * 3.4 + hotSpot * 0.65 + 1.1), 0, 4);
      context.fillStyle = body.palette[level];
      context.fillRect(x, y, 1, 1);
    }
  }

  context.fillStyle = body.palette[4];
  context.fillRect(Math.round(centerX - radius * 0.34), Math.round(centerY - radius * 0.42), 3, 2);
  context.fillRect(Math.round(centerX + radius * 0.18), Math.round(centerY + radius * 0.12), 2, 1);
}

function createBodySprite(body: CelestialBody, lightStep: number) {
  const cacheKey = `${body.id}:${lightStep}`;
  const cached = spriteCache.get(cacheKey);
  if (cached) return cached;

  const ringed = body.recipe === "saturn";
  const padding = body.recipe === "sun" ? 8 : 4;
  const width = ringed ? body.spritePixels * 2 + 12 : body.spritePixels + padding * 2;
  const height = ringed ? body.spritePixels + 12 : body.spritePixels + padding * 2;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.imageSmoothingEnabled = false;

  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const radius = body.spritePixels * 0.5;
  const lightAngle = (lightStep / 16) * TAU;

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
    drawPixelSun(context, body, centerX, centerY, radius);
  } else {
    drawPixelSphere(context, body, centerX, centerY, radius, lightAngle);
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

  spriteCache.set(cacheKey, canvas);
  return canvas;
}

function drawBodyGlow(
  context: CanvasRenderingContext2D,
  rendered: RenderedBody,
  elapsedSeconds: number,
  reducedMotion: boolean,
  dials: SpaceDials,
) {
  const { body, screen, visualSize } = rendered;
  if (body.id !== "sun" && body.id !== "moon" && body.id !== "earth") return;
  const intensity = body.id === "sun" ? dials.glow.sun : body.id === "moon" ? dials.glow.moon : dials.glow.earth;
  if (intensity <= 0) return;
  const pulse = reducedMotion ? 1 : 1 + Math.sin(elapsedSeconds * 1.65) * 0.055;
  const glowRadius =
    (body.id === "sun" ? visualSize * 1.3 * pulse : body.id === "moon" ? visualSize * 0.72 : visualSize * 0.58) * intensity;
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
    gradient.addColorStop(0, hexToRgba(dials.glow.sunCore, 0.38 * intensity));
    gradient.addColorStop(0.32, hexToRgba(dials.glow.sunMid, 0.2 * intensity));
    gradient.addColorStop(1, hexToRgba(dials.glow.sunEdge, 0));
  } else if (body.id === "moon") {
    gradient.addColorStop(0, hexToRgba("#c2dcf4", 0.16 * intensity));
    gradient.addColorStop(1, hexToRgba("#7baedb", 0));
  } else {
    gradient.addColorStop(0, hexToRgba("#3d99d3", 0.1 * intensity));
    gradient.addColorStop(1, hexToRgba("#3d99d3", 0));
  }
  context.save();
  context.globalCompositeOperation = "screen";
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
  dials: SpaceDials,
) {
  const count = Math.round(dials.glow.motes);
  if (count <= 0) return;
  const motion = reducedMotion ? 0 : elapsedSeconds * 0.18;
  context.save();
  for (let index = 0; index < count; index += 1) {
    const seed = hashNumber(index * 43 + 17);
    const angle = seed * TAU + motion * (0.65 + hashNumber(index + 7));
    const radius = sun.visualSize * (0.53 + hashNumber(index * 19) * 0.65);
    const x = sun.screen.x + Math.cos(angle) * radius;
    const y = sun.screen.y + Math.sin(angle) * radius * 0.52;
    const alpha = 0.18 + hashNumber(index * 67) * 0.42;
    context.globalAlpha = alpha * dials.glow.sun;
    context.fillStyle = index % 3 === 0 ? dials.glow.moteHot : dials.glow.moteEmber;
    context.fillRect(Math.round(x), Math.round(y), index % 7 === 0 ? 2 : 1, 1);
  }
  context.restore();
}

function drawCelestialBody(
  context: CanvasRenderingContext2D,
  rendered: RenderedBody,
  sunScreen: Point,
) {
  const { body, screen, visualSize } = rendered;
  const lightAngle = Math.atan2(sunScreen.y - screen.y, sunScreen.x - screen.x);
  const lightStep = body.id === "sun" ? 0 : Math.round(((lightAngle + TAU) % TAU) / TAU * 16) % 16;
  const sprite = createBodySprite(body, lightStep);
  const aspect = sprite.width / sprite.height;
  const targetWidth = Math.max(1, Math.round(visualSize));
  const targetHeight = Math.max(1, Math.round(visualSize / aspect));
  context.save();
  context.imageSmoothingEnabled = false;
  context.drawImage(
    sprite,
    Math.round(screen.x - targetWidth * 0.5),
    Math.round(screen.y - targetHeight * 0.5),
    targetWidth,
    targetHeight,
  );
  context.restore();
}

function rectanglesOverlap(a: DOMRectLike, b: DOMRectLike) {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

type DOMRectLike = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

function positionBodyControls(
  renderedBodies: readonly RenderedBody[],
  bodyButtons: Map<BodyId, HTMLButtonElement>,
  selectedId: BodyId | null,
  hoveredId: BodyId | null,
  viewport: ViewportState,
  camera: CameraState,
  labelHeight: number,
) {
  const sorted = [...renderedBodies].sort(
    (a, b) => b.body.labelPriority - a.body.labelPriority,
  );
  const occupied: DOMRectLike[] = [];
  const visibleLabels = new Set<BodyId>();

  for (let index = 0; index < sorted.length; index += 1) {
    const rendered = sorted[index];
    const { body, screen, visualSize, hitSize } = rendered;
    const button = bodyButtons.get(body.id);
    if (!button) continue;
    const inside =
      screen.x > -hitSize &&
      screen.x < viewport.width + hitSize &&
      screen.y > -hitSize &&
      screen.y < viewport.height + hitSize;
    button.style.display = inside ? "grid" : "none";
    if (!inside) continue;

    button.style.setProperty("--body-x", `${screen.x}px`);
    button.style.setProperty("--body-y", `${screen.y}px`);
    button.style.setProperty("--hit-size", `${hitSize * 2}px`);
    button.style.setProperty("--visual-size", `${visualSize}px`);

    const forced = selectedId === body.id || hoveredId === body.id;
    const zoomAllows = body.id !== "moon" || camera.zoom >= 0.78;
    const width = Math.max(52, body.name.length * 7.4 + 24);
    const box: DOMRectLike = {
      left: screen.x - width * 0.5,
      right: screen.x + width * 0.5,
      top: screen.y - Math.max(visualSize, 18) * 0.5 - labelHeight - 8,
      bottom: screen.y - Math.max(visualSize, 18) * 0.5 - 8,
    };
    const collides = occupied.some((other) => rectanglesOverlap(box, other));
    if (forced || (zoomAllows && !collides)) {
      visibleLabels.add(body.id);
      occupied.push(box);
    }
  }

  for (let index = 0; index < renderedBodies.length; index += 1) {
    const body = renderedBodies[index].body;
    const button = bodyButtons.get(body.id);
    if (button) button.dataset.labelVisible = visibleLabels.has(body.id) ? "true" : "false";
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
        <div><dt>Pan</dt><dd>Drag · one finger · arrow keys</dd></div>
        <div><dt>Zoom</dt><dd>Wheel · pinch · + / −</dd></div>
        <div><dt>Inspect</dt><dd>Click, tap, or focus a world</dd></div>
        <div><dt>Return</dt><dd>Home key · recenter control</dd></div>
      </dl>
    </section>
  );
}

export function SpaceExplorer() {
  const dials = useSpaceDials();
  const dialsRef = useRef(dials);
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectionCardRef = useRef<HTMLElement>(null);
  const bodyButtonsRef = useRef(new Map<BodyId, HTMLButtonElement>());
  const cameraRef = useRef<CameraState>({ x: 0, y: 0, zoom: 0.5 });
  const viewportRef = useRef<ViewportState>({ width: 0, height: 0, dpr: 1 });
  const minZoomRef = useRef(0.1);
  const maxZoomRef = useRef(3.5);
  const renderedBodiesRef = useRef<RenderedBody[]>([]);
  const pointersRef = useRef(new Map<number, PointerInfo>());
  const dragOriginRef = useRef<Point | null>(null);
  const dragCameraRef = useRef<CameraState | null>(null);
  const pinchRef = useRef<PinchState | null>(null);
  const movedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const cameraMovedRef = useRef(false);
  const requestDrawRef = useRef<() => void>(() => undefined);
  const selectedIdRef = useRef<BodyId | null>(null);
  const hoveredIdRef = useRef<BodyId | null>(null);
  const [selectedId, setSelectedId] = useState<BodyId | null>(null);
  const [hoveredId, setHoveredId] = useState<BodyId | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const selectedBody = useMemo(
    () => (selectedId ? BODY_BY_ID.get(selectedId) ?? null : null),
    [selectedId],
  );

  useEffect(() => {
    selectedIdRef.current = selectedId;
    requestDrawRef.current();
  }, [selectedId]);

  useEffect(() => {
    hoveredIdRef.current = hoveredId;
    requestDrawRef.current();
  }, [hoveredId]);

  useEffect(() => {
    dialsRef.current = dials;
    requestDrawRef.current();
  }, [dials]);

  const markInteracted = useCallback(() => {
    setHasInteracted((current) => current || true);
  }, []);

  const resetCamera = useCallback(() => {
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
    if (!root || !canvas) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    let disposed = false;
    let frameId = 0;
    let queuedReducedFrame = false;
    let visible = document.visibilityState !== "hidden";
    let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let elapsedSeconds = 0;
    let previousTime = performance.now();

    const render = (now: number) => {
      if (disposed) return;
      queuedReducedFrame = false;
      const viewport = viewportRef.current;
      const camera = cameraRef.current;
      if (!reducedMotion) {
        elapsedSeconds += Math.min(0.05, Math.max(0, (now - previousTime) / 1000));
      }
      previousTime = now;

      context.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
      const dials = dialsRef.current;
      const yFactor = dials.scene.isometricY;
      const bodies = resolveBodies(dials);
      context.fillStyle = dials.scene.background;
      context.fillRect(0, 0, viewport.width, viewport.height);

      drawInfiniteStarfield(context, camera, viewport, elapsedSeconds, reducedMotion, yFactor, dials);

      const positions = getBodyWorldPositions(bodies, elapsedSeconds, reducedMotion);
      for (let index = 1; index < bodies.length; index += 1) {
        const body = bodies[index];
        if (body.parentId) {
          const parent = positions.get(body.parentId) ?? { x: 0, y: 0 };
          drawOrbit(context, body.orbitRadius, camera, viewport, yFactor, dials, parent, true);
        } else {
          drawOrbit(context, body.orbitRadius, camera, viewport, yFactor, dials);
        }
      }
      drawAsteroidBelt(context, camera, viewport, elapsedSeconds, reducedMotion, yFactor, dials);

      const renderedBodies: RenderedBody[] = [];
      for (let index = 0; index < bodies.length; index += 1) {
        const body = bodies[index];
        const world = positions.get(body.id) ?? { x: 0, y: 0 };
        const screen = worldToScreen(world, camera, viewport, yFactor);
        const compactScale = clamp(viewport.width / 700, 0.54, 1);
        const visualSize = Math.max(
          body.minDisplaySize * compactScale,
          body.displaySize * camera.zoom,
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

      for (let index = 0; index < renderedBodies.length; index += 1) {
        drawBodyGlow(context, renderedBodies[index], elapsedSeconds, reducedMotion, dials);
      }

      const sun = renderedBodies.find((item) => item.body.id === "sun");
      const sunScreen = sun?.screen ?? { x: viewport.width * 0.5, y: viewport.height * 0.5 };
      if (sun) drawSolarMotes(context, sun, elapsedSeconds, reducedMotion, dials);
      for (let index = 0; index < renderedBodies.length; index += 1) {
        drawCelestialBody(context, renderedBodies[index], sunScreen);
      }

      positionBodyControls(
        renderedBodies,
        bodyButtonsRef.current,
        selectedIdRef.current,
        hoveredIdRef.current,
        viewport,
        camera,
        Math.max(16, dials.labels.fontSize * 2.75),
      );

      const selectionCard = selectionCardRef.current;
      if (selectionCard && selectedIdRef.current) {
        const selected = renderedBodies.find((item) => item.body.id === selectedIdRef.current);
        if (selected) {
          const cardX = clamp(selected.screen.x, 178, Math.max(178, viewport.width - 178));
          const cardY = clamp(
            selected.screen.y - selected.visualSize * 0.55 - 20,
            128,
            Math.max(128, viewport.height - 98),
          );
          selectionCard.style.setProperty("--card-x", `${cardX}px`);
          selectionCard.style.setProperty("--card-y", `${cardY}px`);
        }
      }

      if (!reducedMotion && visible) frameId = window.requestAnimationFrame(render);
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
      if (!cameraMovedRef.current) {
        cameraRef.current = { x: 0, y: 0, zoom: fitZoom };
      } else {
        cameraRef.current.zoom = clamp(
          cameraRef.current.zoom,
          minZoomRef.current,
          maxZoomRef.current,
        );
      }
      requestDraw();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(root);
    resize();

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => {
      reducedMotion = motionQuery.matches;
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
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      motionQuery.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      root.removeEventListener("wheel", onWheel);
      requestDrawRef.current = () => undefined;
    };
  }, [zoomAt]);

  const updateHover = useCallback((id: BodyId | null) => {
    setHoveredId((current) => (current === id ? current : id));
  }, []);

  const setBodyButtonRef = useCallback((id: BodyId, node: HTMLButtonElement | null) => {
    if (node) bodyButtonsRef.current.set(id, node);
    else bodyButtonsRef.current.delete(id);
  }, []);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest(`.${styles.interfaceControl}`)) return;
    const root = event.currentTarget;
    const captureTarget = event.target as HTMLElement;
    captureTarget.setPointerCapture(event.pointerId);
    root.dataset.dragging = "true";
    const local = getLocalPoint(event, root);
    pointersRef.current.set(event.pointerId, local);
    movedRef.current = false;
    suppressClickRef.current = false;
    markInteracted();

    if (pointersRef.current.size === 1) {
      dragOriginRef.current = local;
      dragCameraRef.current = { ...cameraRef.current };
      pinchRef.current = null;
    } else {
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
    if (wasSinglePointer && !movedRef.current) {
      let closest: RenderedBody | null = null;
      let closestDistance = Number.POSITIVE_INFINITY;
      const renderedBodies = renderedBodiesRef.current;
      for (let index = 0; index < renderedBodies.length; index += 1) {
        const candidate = renderedBodies[index];
        const candidateDistance = distance(releasePoint, candidate.screen);
        if (candidateDistance <= candidate.hitSize && candidateDistance < closestDistance) {
          closest = candidate;
          closestDistance = candidateDistance;
        }
      }
      if (closest) {
        setSelectedId(closest.body.id);
        setHelpOpen(false);
        markInteracted();
        suppressClickRef.current = true;
      }
    }
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size === 0) event.currentTarget.dataset.dragging = "false";
    const captureTarget = event.target as HTMLElement;
    if (captureTarget.hasPointerCapture(event.pointerId)) {
      captureTarget.releasePointerCapture(event.pointerId);
    }
    if (movedRef.current) suppressClickRef.current = true;
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
    }
  }, [markInteracted]);

  const selectBody = useCallback((id: BodyId) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    setSelectedId(id);
    setHelpOpen(false);
    markInteracted();
  }, [markInteracted]);

  const centerBodyForKeyboard = useCallback((id: BodyId) => {
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

  const handleKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
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
        setSelectedId(null);
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
  }, [markInteracted, resetCamera, zoomAt]);

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if ((event.target as HTMLElement).closest("button, article, section")) return;
    setSelectedId(null);
  }, []);

  const chromeStyle = {
    "--space-bg": dials.scene.background,
    "--pixel-wash-opacity": String(dials.scene.pixelWashOpacity),
    "--ui-ink": dials.ui.ink,
    "--ui-muted": dials.ui.muted,
    "--ui-line": hexToRgba(dials.ui.line, dials.ui.lineOpacity),
    "--ui-panel": hexToRgba(dials.card.fill, dials.card.fillOpacity),
    "--nav-size": `${dials.navigator.buttonSize}px`,
    "--nav-bottom": `${dials.navigator.bottom}px`,
    "--nav-opacity": String(dials.navigator.opacity),
    "--nav-ink": dials.navigator.ink,
    "--nav-active-ink": dials.navigator.activeInk,
    "--nav-fill": hexToRgba(dials.navigator.fill, dials.navigator.fillOpacity),
    "--label-size": `${dials.labels.fontSize}px`,
    "--label-tracking": `${dials.labels.letterSpacing}em`,
    "--label-offset": `${dials.labels.offset}px`,
    "--label-fill": dials.labels.fill,
    "--label-active-fill": dials.labels.activeFill,
    "--card-width": `${dials.card.width}px`,
    "--card-title-size": `${dials.card.titleSize}px`,
    "--card-body-size": `${dials.card.bodySize}px`,
  } as CSSProperties;

  return (
    <>
    <SpaceDialRoot theme="dark" position="top-right" defaultOpen />
    <main
      ref={rootRef}
      className={styles.space}
      style={chromeStyle}
      data-dragging="false"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onKeyDown={handleKeyDown}
      onClick={handleCanvasClick}
      tabIndex={-1}
      aria-label="Interactive pixel-art map of the solar system"
    >
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <div className={styles.pixelWash} aria-hidden="true" />

      <div className={styles.bodyLayer} aria-label="Celestial bodies">
        {CELESTIAL_BODIES.map((body) => (
          <button
            key={body.id}
            ref={(node) => setBodyButtonRef(body.id, node)}
            type="button"
            className={styles.bodyTarget}
            aria-label={`${body.name}. ${body.flavor}`}
            aria-pressed={selectedId === body.id}
            onPointerEnter={() => updateHover(body.id)}
            onPointerLeave={() => updateHover(null)}
            onFocus={() => {
              updateHover(body.id);
              setSelectedId(body.id);
              centerBodyForKeyboard(body.id);
            }}
            onBlur={() => updateHover(null)}
            onClick={(event) => {
              event.stopPropagation();
              selectBody(body.id);
            }}
          >
            <span className={styles.focusReticle} aria-hidden="true" />
            <span className={styles.bodyLabel}>{body.name}</span>
          </button>
        ))}
      </div>

      {selectedBody ? (
        <article
          ref={selectionCardRef}
          className={`${styles.selectionCard} ${styles.interfaceControl}`}
          aria-live="polite"
          style={{ "--card-x": "50vw", "--card-y": "50vh" } as CSSProperties}
        >
          <span className={styles.cardIndex}>
            OBJECT {String((BODY_INDEX.get(selectedBody.id) ?? 0) + 1).padStart(2, "0")}
          </span>
          <button
            type="button"
            className={styles.cardClose}
            onClick={() => setSelectedId(null)}
            aria-label={`Close ${selectedBody.name} details`}
          >
            ×
          </button>
          <h2>{selectedBody.name}</h2>
          <p>{selectedBody.flavor}</p>
        </article>
      ) : null}

      {!hasInteracted ? (
        <div className={`${styles.gestureHint} ${styles.interfaceControl}`} role="status">
          <span className={styles.mouseGlyph} aria-hidden="true"><i /></span>
          <span><strong>Drag</strong> to travel · <strong>Scroll</strong> to zoom</span>
        </div>
      ) : null}

      <nav className={`${styles.navigator} ${styles.interfaceControl}`} aria-label="Map controls">
        <button type="button" onClick={() => zoomAt(cameraRef.current.zoom / 1.28)} aria-label="Zoom out" title="Zoom out">
          −
        </button>
        <button type="button" onClick={() => zoomAt(cameraRef.current.zoom * 1.28)} aria-label="Zoom in" title="Zoom in">
          +
        </button>
        <button type="button" onClick={resetCamera} aria-label="Recenter the solar system" title="Recenter">
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
        {selectedBody ? `${selectedBody.name}. ${selectedBody.flavor}` : "No celestial body selected."}
      </div>
    </main>
    </>
  );
}
