import type { SpaceDials } from "./useSpaceDials";

export type LivingBodyId =
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

export type CelestialEvent = "comet" | "meteor-cluster" | "solar-flare" | "eclipse";

type Point = { x: number; y: number };
type CameraState = Point & { zoom: number };
type ViewportState = { width: number; height: number; dpr: number };

export type LivingRenderedBody = {
  body: { id: LivingBodyId; recipe: string };
  world: Point;
  screen: Point;
  visualSize: number;
  hitSize: number;
};

type TimedEvent = {
  kind: CelestialEvent;
  startedAt: number;
  duration: number;
  seed: number;
};

type CometEvent = TimedEvent & {
  kind: "comet";
  fromWorld: Point;
  toWorld: Point;
};

type MeteorStream = {
  fromWorld: Point;
  toWorld: Point;
  delay: number;
  duration: number;
};

type MeteorEvent = TimedEvent & {
  kind: "meteor-cluster";
  streams: MeteorStream[];
};

type SolarFlareEvent = TimedEvent & {
  kind: "solar-flare";
  angle: number;
};

type EclipseEvent = TimedEvent & {
  kind: "eclipse";
  occluderId: LivingBodyId;
  targetId: LivingBodyId;
  alignmentScore: number;
};

export type ActiveEvent = CometEvent | MeteorEvent | SolarFlareEvent | EclipseEvent;

export type EventSchedulerState = {
  seed: number;
  sequence: number;
  nextEventAt: number;
  lastPrimary: Exclude<CelestialEvent, "meteor-cluster"> | null;
  active: ActiveEvent[];
};

type EventFrame = {
  camera: CameraState;
  viewport: ViewportState;
  yFactor: number;
  renderedBodies: readonly LivingRenderedBody[];
  elapsedSeconds: number;
  reducedMotion: boolean;
  dials: SpaceDials;
};

const TAU = Math.PI * 2;
const EVENT_SEED = 0x51ace;

type BodyMotionProfile = {
  speed: number;
  phase: number;
  intensity: number;
  spinDirection: 1 | -1;
};

const BODY_MOTION_PROFILES: Readonly<Record<LivingBodyId, BodyMotionProfile>> = {
  sun: { speed: 1, phase: 0.4, intensity: 0.9, spinDirection: 1 },
  mercury: { speed: 0.72, phase: 1.3, intensity: 0.7, spinDirection: 1 },
  venus: { speed: 0.52, phase: 2.1, intensity: 0.72, spinDirection: -1 },
  earth: { speed: 0.8, phase: 3.2, intensity: 0.82, spinDirection: 1 },
  moon: { speed: 0.22, phase: 0.8, intensity: 0.58, spinDirection: 1 },
  mars: { speed: 0.48, phase: 2.7, intensity: 0.68, spinDirection: 1 },
  jupiter: { speed: 0.68, phase: 4.1, intensity: 0.78, spinDirection: 1 },
  saturn: { speed: 0.38, phase: 1.7, intensity: 0.72, spinDirection: 1 },
  uranus: { speed: 0.28, phase: 3.8, intensity: 0.62, spinDirection: -1 },
  neptune: { speed: 1.08, phase: 2.4, intensity: 0.72, spinDirection: 1 },
};

export function getBodyBaseSpin(id: LivingBodyId) {
  const profile = BODY_MOTION_PROFILES[id];
  return profile.speed * profile.spinDirection * 0.055;
}

export function createEventScheduler(): EventSchedulerState {
  return {
    seed: EVENT_SEED,
    sequence: 0,
    nextEventAt: 16,
    lastPrimary: null,
    active: [],
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hashNumber(value: number) {
  const x = Math.sin(value * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function eventRandom(state: EventSchedulerState, salt: number) {
  return hashNumber(state.seed + state.sequence * 7919 + salt * 104729);
}

function lerp(a: number, b: number, progress: number) {
  return a + (b - a) * progress;
}

function lerpPoint(a: Point, b: Point, progress: number): Point {
  return { x: lerp(a.x, b.x, progress), y: lerp(a.y, b.y, progress) };
}

function isometricProject(point: Point, yFactor: number): Point {
  return { x: point.x - point.y, y: (point.x + point.y) * yFactor };
}

function isometricUnproject(point: Point, yFactor: number): Point {
  const sum = yFactor === 0 ? 0 : point.y / yFactor;
  return { x: (sum + point.x) * 0.5, y: (sum - point.x) * 0.5 };
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
  return isometricUnproject(
    {
      x: projectedCamera.x + (screen.x - viewport.width * 0.5) / camera.zoom,
      y: projectedCamera.y + (screen.y - viewport.height * 0.5) / camera.zoom,
    },
    yFactor,
  );
}

function findBody(
  renderedBodies: readonly LivingRenderedBody[],
  id: LivingBodyId,
) {
  for (let index = 0; index < renderedBodies.length; index += 1) {
    if (renderedBodies[index].body.id === id) return renderedBodies[index];
  }
  return undefined;
}

function isVisible(body: LivingRenderedBody | undefined, viewport: ViewportState, margin = 80) {
  if (!body) return false;
  return (
    body.screen.x >= -margin &&
    body.screen.x <= viewport.width + margin &&
    body.screen.y >= -margin &&
    body.screen.y <= viewport.height + margin
  );
}

function eventProgress(event: ActiveEvent, elapsedSeconds: number) {
  return clamp((elapsedSeconds - event.startedAt) / event.duration, 0, 1);
}

function eventEnvelope(event: ActiveEvent, elapsedSeconds: number) {
  return Math.sin(eventProgress(event, elapsedSeconds) * Math.PI);
}

function removeExpiredEvents(state: EventSchedulerState, elapsedSeconds: number) {
  let writeIndex = 0;
  for (let index = 0; index < state.active.length; index += 1) {
    const event = state.active[index];
    if (elapsedSeconds < event.startedAt + event.duration) {
      state.active[writeIndex] = event;
      writeIndex += 1;
    }
  }
  state.active.length = writeIndex;
}

function createCometEvent(
  state: EventSchedulerState,
  frame: EventFrame,
  startedAt: number,
): CometEvent {
  const { viewport, camera, yFactor } = frame;
  const direction = eventRandom(state, 17) > 0.5 ? 1 : -1;
  const startScreen = {
    x: direction > 0 ? -100 : viewport.width + 100,
    y: viewport.height * (0.12 + eventRandom(state, 18) * 0.38),
  };
  const endScreen = {
    x: direction > 0 ? viewport.width + 120 : -120,
    y: clamp(
      startScreen.y + viewport.height * (0.2 + eventRandom(state, 19) * 0.26),
      80,
      viewport.height - 50,
    ),
  };
  return {
    kind: "comet",
    startedAt,
    duration: 6.2,
    seed: state.sequence * 17 + state.seed,
    fromWorld: screenToWorld(startScreen, camera, viewport, yFactor),
    toWorld: screenToWorld(endScreen, camera, viewport, yFactor),
  };
}

function createMeteorEvent(
  state: EventSchedulerState,
  frame: EventFrame,
  startedAt: number,
): MeteorEvent {
  const streams: MeteorStream[] = [];
  const count = 4 + Math.floor(eventRandom(state, 31) * 4);
  for (let index = 0; index < count; index += 1) {
    const startScreen = {
      x: frame.viewport.width * (0.08 + eventRandom(state, 32 + index) * 0.74),
      y: -35 - index * 8,
    };
    const endScreen = {
      x: startScreen.x + frame.viewport.width * (0.14 + eventRandom(state, 52 + index) * 0.12),
      y: frame.viewport.height * (0.28 + eventRandom(state, 72 + index) * 0.45),
    };
    streams.push({
      fromWorld: screenToWorld(startScreen, frame.camera, frame.viewport, frame.yFactor),
      toWorld: screenToWorld(endScreen, frame.camera, frame.viewport, frame.yFactor),
      delay: index * 0.14 + eventRandom(state, 92 + index) * 0.18,
      duration: 1.25 + eventRandom(state, 112 + index) * 0.65,
    });
  }
  return {
    kind: "meteor-cluster",
    startedAt,
    duration: 3.2,
    seed: state.sequence * 31 + state.seed,
    streams,
  };
}

function createFlareEvent(
  state: EventSchedulerState,
  startedAt: number,
): SolarFlareEvent {
  return {
    kind: "solar-flare",
    startedAt,
    duration: 4.8,
    seed: state.sequence * 47 + state.seed,
    angle: eventRandom(state, 141) * TAU,
  };
}

function angularSeparation(a: Point, b: Point) {
  const dot = a.x * b.x + a.y * b.y;
  const cross = a.x * b.y - a.y * b.x;
  return Math.abs(Math.atan2(cross, dot));
}

function findAlignment(frame: EventFrame) {
  let best:
    | { occluderId: LivingBodyId; targetId: LivingBodyId; score: number }
    | undefined;
  const { renderedBodies, viewport } = frame;

  for (let targetIndex = 0; targetIndex < renderedBodies.length; targetIndex += 1) {
    const target = renderedBodies[targetIndex];
    if (target.body.id === "sun" || !isVisible(target, viewport, 48)) continue;
    const targetDistance = Math.hypot(target.world.x, target.world.y);
    if (targetDistance < 1) continue;

    for (let occluderIndex = 0; occluderIndex < renderedBodies.length; occluderIndex += 1) {
      const occluder = renderedBodies[occluderIndex];
      if (
        occluder.body.id === "sun" ||
        occluder.body.id === target.body.id ||
        !isVisible(occluder, viewport, 48)
      ) {
        continue;
      }
      const occluderDistance = Math.hypot(occluder.world.x, occluder.world.y);
      if (occluderDistance >= targetDistance * 0.99 || occluderDistance < 1) continue;
      const angle = angularSeparation(target.world, occluder.world);
      if (angle > 0.58) continue;
      const distancePenalty = Math.abs(targetDistance - occluderDistance) / targetDistance;
      const moonBonus =
        (occluder.body.id === "moon" && target.body.id === "earth") ||
        (occluder.body.id === "earth" && target.body.id === "moon")
          ? -0.16
          : 0;
      const score = angle + distancePenalty * 0.08 + moonBonus;
      if (!best || score < best.score) {
        best = {
          occluderId: occluder.body.id,
          targetId: target.body.id,
          score,
        };
      }
    }
  }
  return best;
}

function hasLightingEvent(events: readonly ActiveEvent[]) {
  for (let index = 0; index < events.length; index += 1) {
    if (events[index].kind === "solar-flare" || events[index].kind === "eclipse") return true;
  }
  return false;
}

export function updateLivingEvents(state: EventSchedulerState, frame: EventFrame) {
  const { elapsedSeconds, reducedMotion, dials, renderedBodies, viewport } = frame;
  const interval = Math.max(8, dials.events.eventInterval);
  removeExpiredEvents(state, elapsedSeconds);

  if (reducedMotion) {
    state.active.length = 0;
    state.nextEventAt = elapsedSeconds + interval;
    return;
  }
  if (elapsedSeconds < state.nextEventAt) return;

  state.sequence += 1;
  state.nextEventAt =
    elapsedSeconds + interval * (0.74 + eventRandom(state, 2) * 0.58);

  const primaryKinds = ["comet", "solar-flare", "eclipse"] as const;
  let kind = primaryKinds[Math.floor(eventRandom(state, 3) * primaryKinds.length)];
  if (kind === state.lastPrimary) {
    kind = primaryKinds[(primaryKinds.indexOf(kind) + 1) % primaryKinds.length];
  }

  let primary: ActiveEvent | undefined;
  if (kind === "comet" && dials.events.cometIntensity > 0) {
    primary = createCometEvent(state, frame, elapsedSeconds);
  } else if (
    kind === "solar-flare" &&
    dials.events.flareIntensity > 0 &&
    !hasLightingEvent(state.active) &&
    isVisible(findBody(renderedBodies, "sun"), viewport, 80)
  ) {
    primary = createFlareEvent(state, elapsedSeconds);
  } else if (
    kind === "eclipse" &&
    dials.events.shadowIntensity > 0 &&
    !hasLightingEvent(state.active)
  ) {
    const alignment = findAlignment(frame);
    if (alignment) {
      primary = {
        kind: "eclipse",
        startedAt: elapsedSeconds,
        duration: 5.6,
        seed: state.sequence * 61 + state.seed,
        occluderId: alignment.occluderId,
        targetId: alignment.targetId,
        alignmentScore: alignment.score,
      };
    }
  }

  if (!primary) return;
  state.active.push(primary);
  state.lastPrimary = primary.kind === "meteor-cluster" ? state.lastPrimary : primary.kind;

  const lighting = primary.kind === "solar-flare" || primary.kind === "eclipse";
  if (
    lighting &&
    eventRandom(state, 5) < dials.events.overlapChance
  ) {
    if (eventRandom(state, 6) > 0.46 && dials.events.cometIntensity > 0) {
      state.active.push(createCometEvent(state, frame, elapsedSeconds + 0.45));
    } else if (dials.events.meteorIntensity > 0) {
      state.active.push(createMeteorEvent(state, frame, elapsedSeconds + 0.35));
    }
  }
}

function bodyDiscRadius(body: LivingRenderedBody) {
  if (body.body.id === "sun") return body.visualSize * 0.34;
  if (body.body.id === "saturn") return body.visualSize * 0.2;
  return body.visualSize * 0.35;
}

function pixel(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  alpha: number,
) {
  if (alpha <= 0) return;
  context.globalAlpha = clamp(alpha, 0, 1);
  context.fillStyle = color;
  context.fillRect(Math.round(x), Math.round(y), size, size);
}

function drawPixelArc(
  context: CanvasRenderingContext2D,
  center: Point,
  radiusX: number,
  radiusY: number,
  start: number,
  end: number,
  count: number,
  color: string,
  alpha: number,
  size = 1,
) {
  for (let index = 0; index <= count; index += 1) {
    const angle = lerp(start, end, index / count);
    pixel(
      context,
      center.x + Math.cos(angle) * radiusX,
      center.y + Math.sin(angle) * radiusY,
      size,
      color,
      alpha * (0.65 + (index % 3) * 0.16),
    );
  }
}

function drawFlareBack(
  context: CanvasRenderingContext2D,
  event: SolarFlareEvent,
  sun: LivingRenderedBody,
  elapsedSeconds: number,
  dials: SpaceDials,
) {
  const envelope = eventEnvelope(event, elapsedSeconds) * dials.events.flareIntensity;
  if (envelope <= 0) return;
  const radius = sun.visualSize * (0.55 + eventProgress(event, elapsedSeconds) * 0.72);
  const gradient = context.createRadialGradient(
    sun.screen.x,
    sun.screen.y,
    sun.visualSize * 0.18,
    sun.screen.x,
    sun.screen.y,
    radius,
  );
  gradient.addColorStop(0, `rgba(255, 216, 99, ${0.18 * envelope})`);
  gradient.addColorStop(0.42, `rgba(255, 112, 31, ${0.12 * envelope})`);
  gradient.addColorStop(1, "rgba(255, 69, 20, 0)");
  context.save();
  context.globalCompositeOperation = "screen";
  context.fillStyle = gradient;
  context.fillRect(sun.screen.x - radius, sun.screen.y - radius, radius * 2, radius * 2);
  context.restore();
}

function drawEclipseCone(
  context: CanvasRenderingContext2D,
  event: EclipseEvent,
  renderedBodies: readonly LivingRenderedBody[],
  elapsedSeconds: number,
  dials: SpaceDials,
) {
  const occluder = findBody(renderedBodies, event.occluderId);
  const target = findBody(renderedBodies, event.targetId);
  if (!occluder || !target) return;
  const envelope = eventEnvelope(event, elapsedSeconds) * dials.events.shadowIntensity;
  const dx = target.screen.x - occluder.screen.x;
  const dy = target.screen.y - occluder.screen.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const normal = { x: -dy / length, y: dx / length };
  const nearWidth = Math.max(2, bodyDiscRadius(occluder) * 0.34);
  const farWidth = Math.max(4, bodyDiscRadius(target) * 0.8);
  context.save();
  context.globalAlpha = clamp(0.16 * envelope, 0, 0.38);
  context.fillStyle = "#02040a";
  context.beginPath();
  context.moveTo(
    occluder.screen.x + normal.x * nearWidth,
    occluder.screen.y + normal.y * nearWidth,
  );
  context.lineTo(target.screen.x + normal.x * farWidth, target.screen.y + normal.y * farWidth);
  context.lineTo(target.screen.x - normal.x * farWidth, target.screen.y - normal.y * farWidth);
  context.lineTo(
    occluder.screen.x - normal.x * nearWidth,
    occluder.screen.y - normal.y * nearWidth,
  );
  context.closePath();
  context.fill();
  context.restore();
}

export function drawLivingEventBackLayers(
  context: CanvasRenderingContext2D,
  events: readonly ActiveEvent[],
  renderedBodies: readonly LivingRenderedBody[],
  elapsedSeconds: number,
  dials: SpaceDials,
) {
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (elapsedSeconds < event.startedAt) continue;
    if (event.kind === "solar-flare") {
      const sun = findBody(renderedBodies, "sun");
      if (sun) drawFlareBack(context, event, sun, elapsedSeconds, dials);
    } else if (event.kind === "eclipse") {
      drawEclipseCone(context, event, renderedBodies, elapsedSeconds, dials);
    }
  }
}

function activeEclipseForBody(
  events: readonly ActiveEvent[],
  id: LivingBodyId,
  elapsedSeconds: number,
) {
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (
      event.kind === "eclipse" &&
      event.targetId === id &&
      elapsedSeconds >= event.startedAt &&
      elapsedSeconds <= event.startedAt + event.duration
    ) {
      return event;
    }
  }
  return undefined;
}

function drawGenericRim(
  context: CanvasRenderingContext2D,
  body: LivingRenderedBody,
  sunScreen: Point,
  radius: number,
  intensity: number,
) {
  const angle = Math.atan2(sunScreen.y - body.screen.y, sunScreen.x - body.screen.x);
  const unit = Math.max(1, Math.round(body.visualSize / 54));
  for (let index = -2; index <= 2; index += 1) {
    const spread = index * 0.16;
    pixel(
      context,
      body.screen.x + Math.cos(angle + spread) * radius * 0.82,
      body.screen.y + Math.sin(angle + spread) * radius * 0.82,
      unit,
      "#dff4ef",
      0.22 * intensity * (1 - Math.abs(index) * 0.12),
    );
  }
}

export function drawLivingSurface(
  context: CanvasRenderingContext2D,
  body: LivingRenderedBody,
  sunScreen: Point,
  events: readonly ActiveEvent[],
  elapsedSeconds: number,
  reducedMotion: boolean,
  hoveredId: LivingBodyId | null,
  selectedId: LivingBodyId | null,
  rotationPhase: number,
  pulseScale: number,
  pulseEnvelope: number,
  dials: SpaceDials,
) {
  const profile = BODY_MOTION_PROFILES[body.body.id];
  const interactionBoost =
    body.body.id === selectedId
      ? dials.living.selectedBoost
      : body.body.id === hoveredId
        ? dials.living.hoverBoost
        : 1;
  const intensity = clamp(
    dials.living.surfaceMotion * profile.intensity * interactionBoost,
    0,
    5,
  );
  if (intensity <= 0) return;
  const time = reducedMotion
    ? profile.phase
    : elapsedSeconds * dials.living.surfaceSpeed * profile.speed + profile.phase;
  const displaySize = body.visualSize * pulseScale;
  const radius = bodyDiscRadius(body) * pulseScale;
  const unit = Math.max(1, Math.round(displaySize / 48));
  const center = body.screen;

  context.save();
  context.save();
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, TAU);
  context.clip();
  drawGenericRim(
    context,
    body,
    sunScreen,
    radius,
    intensity * dials.living.lightResponse * (1 + pulseEnvelope * 0.72),
  );

  switch (body.body.id) {
    case "sun": {
      for (let index = 0; index < 15; index += 1) {
        const angle =
          hashNumber(index * 29 + 7) * TAU +
          rotationPhase +
          time * (0.04 + index * 0.002);
        const distance = Math.sqrt(hashNumber(index * 47 + 9)) * radius * 0.68;
        const flicker = 0.35 + Math.sin(time * 1.8 + index * 2.1) * 0.2;
        pixel(
          context,
          center.x + Math.cos(angle) * distance,
          center.y + Math.sin(angle) * distance,
          unit,
          index % 4 === 0 ? "#fff1a2" : "#ffb13f",
          flicker * intensity,
        );
      }
      break;
    }
    case "mercury": {
      const lightAngle = Math.atan2(sunScreen.y - center.y, sunScreen.x - center.x);
      for (let index = -2; index <= 2; index += 1) {
        const angle = lightAngle + index * 0.22;
        const shimmer = 0.32 + Math.sin(time * 3.2 + index) * 0.18;
        pixel(
          context,
          center.x + Math.cos(angle) * radius * 0.62,
          center.y + Math.sin(angle) * radius * 0.62,
          unit,
          index % 2 === 0 ? "#f0c98f" : "#bd8b63",
          shimmer * intensity,
        );
      }
      break;
    }
    case "venus": {
      for (let band = -2; band <= 2; band += 1) {
        const y = center.y + band * radius * 0.23;
        const span = Math.sqrt(Math.max(0, radius * radius - (y - center.y) ** 2));
        const spinOffset = (rotationPhase / TAU) * 7;
        const offset =
          ((time * (2.1 + band * 0.12) + spinOffset + band * 7) % 7) - 3;
        for (let x = -span; x <= span; x += 6) {
          pixel(context, center.x + x + offset, y, unit, "#ffe0a0", 0.2 * intensity);
        }
      }
      break;
    }
    case "earth": {
      const lightAngle = Math.atan2(sunScreen.y - center.y, sunScreen.x - center.x);
      for (let index = 0; index < 13; index += 1) {
        const px = (hashNumber(index * 37 + 3) * 2 - 1) * radius * 0.78;
        const py = (hashNumber(index * 53 + 5) * 2 - 1) * radius * 0.72;
        if (px * px + py * py > radius * radius * 0.75) continue;
        const lightDot =
          (px / radius) * Math.cos(lightAngle) + (py / radius) * Math.sin(lightAngle);
        if (lightDot < -0.12) {
          pixel(context, center.x + px, center.y + py, unit, "#ffd36a", 0.62 * intensity);
        }
      }
      for (let index = 0; index < 8; index += 1) {
        const spinOffset = (rotationPhase / TAU) * radius * 1.3;
        const x =
          center.x -
          radius * 0.65 +
          ((index * radius * 0.22 + time * 1.7 + spinOffset) % (radius * 1.3));
        const y = center.y + Math.sin(index * 2.7) * radius * 0.46;
        pixel(context, x, y, unit, "#f0fbf5", 0.3 * intensity);
      }
      const auroraShimmer = reducedMotion ? 0.72 : 0.58 + Math.sin(time * 2.2) * 0.16;
      const auroraDrift = Math.sin(time * 0.25) * 0.05;
      drawPixelArc(
        context,
        center,
        radius * 0.58,
        radius * 0.22,
        Math.PI * 1.08 + auroraDrift,
        Math.PI * 1.9 + auroraDrift,
        8,
        "#5ef0bf",
        0.34 * intensity * auroraShimmer,
        unit,
      );
      break;
    }
    case "moon": {
      const lightAngle = Math.atan2(sunScreen.y - center.y, sunScreen.x - center.x);
      for (let index = 0; index < 5; index += 1) {
        const angle = hashNumber(index * 41 + 2) * TAU - rotationPhase;
        const distance = hashNumber(index * 73 + 8) * radius * 0.62;
        const glint = reducedMotion
          ? 0.18
          : 0.13 + (Math.sin(time * 1.8 + index * 1.7) + 1) * 0.08;
        const lightFacing = 0.6 + Math.max(0, Math.cos(angle - lightAngle)) * 0.4;
        pixel(
          context,
          center.x + Math.cos(angle) * distance,
          center.y + Math.sin(angle) * distance,
          unit,
          "#edf3ed",
          glint * lightFacing * intensity,
        );
      }
      break;
    }
    case "mars": {
      const spinOffset = (rotationPhase / TAU) * radius * 2.4;
      const offset = ((time * 2.6 + spinOffset) % (radius * 2.4)) - radius * 1.2;
      for (let index = 0; index < 9; index += 1) {
        pixel(
          context,
          center.x + offset + index * unit * 2,
          center.y + Math.sin(index * 1.7) * radius * 0.22,
          unit,
          index % 3 === 0 ? "#f0a064" : "#c96a3e",
          0.27 * intensity,
        );
      }
      const storm = reducedMotion
        ? 0
        : clamp((Math.sin(time * 0.18 + 0.9) - 0.68) / 0.32, 0, 1);
      if (storm > 0) {
        for (let index = -5; index <= 5; index += 1) {
          pixel(
            context,
            center.x + index * unit * 1.5,
            center.y - radius * 0.12 + Math.sin(index * 1.2) * unit,
            unit,
            "#e88952",
            0.42 * storm * intensity,
          );
        }
      }
      break;
    }
    case "jupiter": {
      for (let band = -3; band <= 3; band += 1) {
        const y = center.y + band * radius * 0.2;
        const span = Math.sqrt(Math.max(0, radius * radius - (y - center.y) ** 2));
        const spinOffset = (rotationPhase / TAU) * 6;
        const offset =
          ((time * (band % 2 === 0 ? 1.6 : -1.2) + spinOffset) % 6) - 3;
        for (let x = -span; x < span; x += 7) {
          pixel(context, center.x + x + offset, y, unit, band % 2 === 0 ? "#f4d1a1" : "#9c6656", 0.2 * intensity);
        }
      }
      const spotLongitude = 1.08 - rotationPhase + time * 0.08;
      const spotVisibility = clamp(Math.cos(spotLongitude), 0, 1);
      const spotX = center.x + Math.sin(spotLongitude) * radius * 0.62;
      pixel(
        context,
        spotX,
        center.y + radius * 0.21,
        unit * 2,
        "#c86149",
        0.58 * intensity * spotVisibility,
      );
      pixel(
        context,
        spotX + unit * 2,
        center.y + radius * 0.21,
        unit,
        "#ec9970",
        0.46 * intensity * spotVisibility,
      );
      break;
    }
    case "saturn": {
      const shadowOffset = Math.sin(time * 0.12) * radius * 0.12;
      context.globalAlpha = clamp(0.28 * intensity, 0, 0.72);
      context.fillStyle = "#4a3b32";
      context.fillRect(
        Math.round(center.x - radius),
        Math.round(center.y + shadowOffset),
        Math.round(radius * 2),
        Math.max(1, unit),
      );
      break;
    }
    case "uranus": {
      const bandY = center.y - radius * 0.63 + ((time * 0.8) % (radius * 1.26));
      context.globalAlpha = clamp(0.14 * intensity, 0, 0.55);
      context.fillStyle = "#b9f1e8";
      context.save();
      context.translate(center.x, center.y);
      context.rotate(-0.18);
      context.fillRect(
        Math.round(-radius * 0.78),
        Math.round(bandY - center.y),
        Math.round(radius * 1.56),
        Math.max(1, unit),
      );
      context.restore();
      break;
    }
    case "neptune": {
      for (let band = -2; band <= 2; band += 1) {
        const y = center.y + band * radius * 0.25;
        const spinOffset = (rotationPhase / TAU) * radius * 1.4;
        const offset =
          ((time * 4.2 + spinOffset + band * 5) % (radius * 1.4)) - radius * 0.7;
        pixel(context, center.x + offset, y, unit * 3, "#a8d8f3", 0.3 * intensity);
      }
      const stormX =
        center.x + Math.sin(time * 0.16 - rotationPhase) * radius * 0.42;
      const stormY = center.y + radius * 0.18 + Math.cos(time * 0.31) * radius * 0.08;
      pixel(context, stormX, stormY, unit * 2, "#142662", 0.52 * intensity);
      break;
    }
  }
  context.restore();

  if (body.body.id === "sun") {
    const prominenceAlpha = 0.22 * intensity;
    drawPixelArc(context, center, radius * 1.12, radius * 0.78, -0.3 + time * 0.03, 0.48 + time * 0.03, 9, "#ff7a27", prominenceAlpha, unit);
    drawPixelArc(context, center, radius * 1.08, radius * 0.72, 2.6 - time * 0.02, 3.28 - time * 0.02, 8, "#ffc34e", prominenceAlpha * 0.74, unit);
  } else if (body.body.id === "mercury") {
    const lightAngle = Math.atan2(sunScreen.y - center.y, sunScreen.x - center.x);
    for (let index = 1; index <= 3; index += 1) {
      const shimmer = reducedMotion
        ? 0.8
        : 0.62 + Math.sin(time * 3.4 + index) * 0.22;
      pixel(
        context,
        center.x + Math.cos(lightAngle) * (radius + index * 2),
        center.y + Math.sin(lightAngle) * (radius + index * 2),
        1,
        "#d99252",
        (0.15 / index) * intensity * shimmer,
      );
    }
  } else if (body.body.id === "saturn") {
    for (let index = 0; index < 8; index += 1) {
      const angle = index * (TAU / 8) + time * 0.09 + rotationPhase;
      pixel(context, center.x + Math.cos(angle) * displaySize * 0.44, center.y + Math.sin(angle) * displaySize * 0.12, unit, "#fff0bd", 0.28 * intensity);
    }
  } else if (body.body.id === "uranus") {
    drawPixelArc(
      context,
      center,
      displaySize * 0.48,
      displaySize * 0.11,
      time * 0.06 + rotationPhase,
      TAU + time * 0.06 + rotationPhase,
      24,
      "#88d4d5",
      0.2 * intensity,
      unit,
    );
  }

  const eclipse = activeEclipseForBody(events, body.body.id, elapsedSeconds);
  if (eclipse) {
    const progress = eventProgress(eclipse, elapsedSeconds);
    const envelope = eventEnvelope(eclipse, elapsedSeconds) * dials.events.shadowIntensity;
    const shadowAngle = Math.atan2(center.y - sunScreen.y, center.x - sunScreen.x);
    const perpendicular = { x: -Math.sin(shadowAngle), y: Math.cos(shadowAngle) };
    const offset = (progress * 2 - 1) * radius * 1.45;
    context.save();
    context.beginPath();
    context.arc(center.x, center.y, radius, 0, TAU);
    context.clip();
    context.globalAlpha = clamp(0.56 * envelope, 0, 0.78);
    context.fillStyle = body.body.id === "moon" ? "#381b20" : "#02040a";
    context.beginPath();
    context.arc(
      center.x + perpendicular.x * offset,
      center.y + perpendicular.y * offset,
      radius * 1.05,
      0,
      TAU,
    );
    context.fill();
    context.restore();
  }
  context.restore();
}

function drawWorldTrail(
  context: CanvasRenderingContext2D,
  fromWorld: Point,
  toWorld: Point,
  progress: number,
  camera: CameraState,
  viewport: ViewportState,
  yFactor: number,
  trailLength: number,
  intensity: number,
  hotColor: string,
  tailColor: string,
) {
  const steps = Math.max(8, Math.round(22 * trailLength));
  for (let index = steps; index >= 0; index -= 1) {
    const sample = progress - (index / steps) * 0.13 * trailLength;
    if (sample < 0 || sample > 1) continue;
    const screen = worldToScreen(lerpPoint(fromWorld, toWorld, sample), camera, viewport, yFactor);
    const closeness = 1 - index / Math.max(1, steps);
    const size = index <= 1 ? 3 : closeness > 0.72 ? 2 : 1;
    pixel(
      context,
      screen.x,
      screen.y,
      size,
      index <= 1 ? hotColor : tailColor,
      intensity * (0.08 + closeness * 0.78),
    );
  }
}

function drawComet(
  context: CanvasRenderingContext2D,
  event: CometEvent,
  frame: Omit<EventFrame, "renderedBodies" | "reducedMotion">,
) {
  const progress = eventProgress(event, frame.elapsedSeconds);
  const envelope = eventEnvelope(event, frame.elapsedSeconds);
  const intensity = frame.dials.events.cometIntensity * envelope;
  drawWorldTrail(
    context,
    event.fromWorld,
    event.toWorld,
    progress,
    frame.camera,
    frame.viewport,
    frame.yFactor,
    frame.dials.events.trailLength,
    intensity,
    "#fff6d0",
    "#82cbe2",
  );
  const head = worldToScreen(
    lerpPoint(event.fromWorld, event.toWorld, progress),
    frame.camera,
    frame.viewport,
    frame.yFactor,
  );
  const glow = context.createRadialGradient(head.x, head.y, 0, head.x, head.y, 13);
  glow.addColorStop(0, `rgba(237, 250, 255, ${clamp(0.48 * intensity, 0, 1)})`);
  glow.addColorStop(1, "rgba(103, 198, 225, 0)");
  context.save();
  context.globalCompositeOperation = "screen";
  context.fillStyle = glow;
  context.fillRect(head.x - 13, head.y - 13, 26, 26);
  context.restore();
}

function drawMeteorCluster(
  context: CanvasRenderingContext2D,
  event: MeteorEvent,
  frame: Omit<EventFrame, "renderedBodies" | "reducedMotion">,
) {
  const intensity = frame.dials.events.meteorIntensity;
  for (let index = 0; index < event.streams.length; index += 1) {
    const stream = event.streams[index];
    const progress = clamp(
      (frame.elapsedSeconds - event.startedAt - stream.delay) / stream.duration,
      0,
      1,
    );
    if (progress <= 0 || progress >= 1) continue;
    drawWorldTrail(
      context,
      stream.fromWorld,
      stream.toWorld,
      progress,
      frame.camera,
      frame.viewport,
      frame.yFactor,
      frame.dials.events.trailLength * 0.58,
      eventEnvelope(event, frame.elapsedSeconds) * intensity,
      "#fff2c7",
      "#d28a64",
    );
  }
}

function drawFlareFront(
  context: CanvasRenderingContext2D,
  event: SolarFlareEvent,
  sun: LivingRenderedBody,
  elapsedSeconds: number,
  dials: SpaceDials,
) {
  const progress = eventProgress(event, elapsedSeconds);
  const envelope = eventEnvelope(event, elapsedSeconds) * dials.events.flareIntensity;
  const radius = bodyDiscRadius(sun);
  const arcRadius = radius * (1.05 + progress * 0.82);
  const arcCenter = {
    x: sun.screen.x + Math.cos(event.angle) * radius * 0.32,
    y: sun.screen.y + Math.sin(event.angle) * radius * 0.32,
  };
  drawPixelArc(
    context,
    arcCenter,
    arcRadius,
    arcRadius * 0.58,
    event.angle - 0.48,
    event.angle + 0.48,
    18,
    "#ffd25a",
    0.72 * envelope,
    Math.max(1, Math.round(sun.visualSize / 62)),
  );
  for (let index = 0; index < 12; index += 1) {
    const spread = (hashNumber(event.seed + index * 13) - 0.5) * 0.76;
    const distance = radius * (1 + progress * (1.2 + hashNumber(index + 77)));
    pixel(
      context,
      sun.screen.x + Math.cos(event.angle + spread) * distance,
      sun.screen.y + Math.sin(event.angle + spread) * distance,
      index % 5 === 0 ? 2 : 1,
      index % 3 === 0 ? "#fff1a2" : "#f57924",
      0.5 * envelope,
    );
  }
}

export function drawLivingEventFrontLayers(
  context: CanvasRenderingContext2D,
  events: readonly ActiveEvent[],
  frame: Omit<EventFrame, "reducedMotion">,
) {
  context.save();
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (
      frame.elapsedSeconds < event.startedAt ||
      frame.elapsedSeconds > event.startedAt + event.duration
    ) {
      continue;
    }
    if (event.kind === "comet") {
      drawComet(context, event, frame);
    } else if (event.kind === "meteor-cluster") {
      drawMeteorCluster(context, event, frame);
    } else if (event.kind === "solar-flare") {
      const sun = findBody(frame.renderedBodies, "sun");
      if (sun) drawFlareFront(context, event, sun, frame.elapsedSeconds, frame.dials);
    }
  }
  context.restore();
}
