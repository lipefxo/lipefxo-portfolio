import type { SpaceDials } from "./useSpaceDials";
import type { LivingBodyId } from "./livingDiorama";

export type MissionId =
  | "roadster"
  | "iss"
  | "hubble"
  | "webb"
  | "parker"
  | "new-horizons"
  | "voyager-1"
  | "voyager-2";

export type Point = { x: number; y: number };

type CameraState = Point & { zoom: number };
type ViewportState = { width: number; height: number; dpr: number };

type MissionRecipe =
  | "roadster"
  | "station"
  | "hubble"
  | "webb"
  | "parker"
  | "new-horizons"
  | "voyager";

export type MissionDefinition = {
  id: MissionId;
  name: string;
  launchYear: number;
  region: string;
  fact: string;
  flavor: string;
  recipe: MissionRecipe;
  displaySize: number;
  minDisplaySize: number;
  revealZoom: number;
};

export type RenderedMission = {
  mission: MissionDefinition;
  world: Point;
  screen: Point;
  visualSize: number;
  hitSize: number;
  rotation: number;
  revealed: boolean;
};

type MissionFrame = {
  camera: CameraState;
  viewport: ViewportState;
  yFactor: number;
  bodyPositions: ReadonlyMap<LivingBodyId, Point>;
  elapsedSeconds: number;
  reducedMotion: boolean;
  dials: SpaceDials;
};

type MissionPose = {
  world: Point;
  rotation: number;
};

const TAU = Math.PI * 2;
const SPRITE_SIZE = 64;

export const MISSION_DEFINITIONS: readonly MissionDefinition[] = [
  {
    id: "roadster",
    name: "Roadster + Starman",
    launchYear: 2018,
    region: "HELIOCENTRIC · EARTH / MARS",
    fact: "A red sports car and its mannequin passenger circle the Sun on an orbit that reaches beyond Mars.",
    flavor: "Top down. No traffic. Still looking for a charging station.",
    recipe: "roadster",
    displaySize: 62,
    minDisplaySize: 25,
    revealZoom: 0,
  },
  {
    id: "iss",
    name: "International Space Station",
    launchYear: 1998,
    region: "LOW EARTH ORBIT",
    fact: "The largest human-made object to orbit Earth is a laboratory assembled by partners around the world.",
    flavor: "The fastest shared apartment humanity has ever built.",
    recipe: "station",
    displaySize: 58,
    minDisplaySize: 23,
    revealZoom: 0.9,
  },
  {
    id: "hubble",
    name: "Hubble Space Telescope",
    launchYear: 1990,
    region: "LOW EARTH ORBIT",
    fact: "Hubble circles above the atmosphere, recording the universe in ultraviolet, visible, and near-infrared light.",
    flavor: "Still taking impossible portraits after all these years.",
    recipe: "hubble",
    displaySize: 50,
    minDisplaySize: 21,
    revealZoom: 0.9,
  },
  {
    id: "webb",
    name: "James Webb Space Telescope",
    launchYear: 2021,
    region: "SUN–EARTH L2",
    fact: "Webb loops around the second Sun–Earth Lagrange point, about 1.5 million kilometers beyond Earth.",
    flavor: "Keeping its gold mirrors cool on the night side of home.",
    recipe: "webb",
    displaySize: 58,
    minDisplaySize: 23,
    revealZoom: 0.55,
  },
  {
    id: "parker",
    name: "Parker Solar Probe",
    launchYear: 2018,
    region: "SOLAR CORONA",
    fact: "The first spacecraft to fly through the Sun’s corona survives each close pass behind a carbon-composite heat shield.",
    flavor: "The only probe with “touch the Sun” in its job description.",
    recipe: "parker",
    displaySize: 52,
    minDisplaySize: 22,
    revealZoom: 0,
  },
  {
    id: "new-horizons",
    name: "New Horizons",
    launchYear: 2006,
    region: "KUIPER BELT",
    fact: "The first spacecraft to explore Pluto up close continues outward through the Kuiper Belt.",
    flavor: "Pluto was the first stop, not the finish line.",
    recipe: "new-horizons",
    displaySize: 51,
    minDisplaySize: 22,
    revealZoom: 0,
  },
  {
    id: "voyager-1",
    name: "Voyager 1",
    launchYear: 1977,
    region: "INTERSTELLAR SPACE",
    fact: "Voyager 1 is one of only two spacecraft to operate beyond the Sun’s heliosphere.",
    flavor: "Carrying Earth’s mixtape into the dark.",
    recipe: "voyager",
    displaySize: 49,
    minDisplaySize: 22,
    revealZoom: 0,
  },
  {
    id: "voyager-2",
    name: "Voyager 2",
    launchYear: 1977,
    region: "INTERSTELLAR SPACE",
    fact: "Voyager 2 followed a different path beyond the heliosphere after visiting all four giant planets.",
    flavor: "Same golden record. Different exit.",
    recipe: "voyager",
    displaySize: 49,
    minDisplaySize: 22,
    revealZoom: 0,
  },
] as const;

export const MISSION_BY_ID = new Map(
  MISSION_DEFINITIONS.map((mission) => [mission.id, mission]),
);

const spriteCache = new Map<MissionId, HTMLCanvasElement>();

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function orbitPosition(radius: number, angle: number): Point {
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

function worldToScreen(
  world: Point,
  camera: CameraState,
  viewport: ViewportState,
  yFactor: number,
): Point {
  const projectedWorld = {
    x: world.x - world.y,
    y: (world.x + world.y) * yFactor,
  };
  const projectedCamera = {
    x: camera.x - camera.y,
    y: (camera.x + camera.y) * yFactor,
  };
  return {
    x: viewport.width * 0.5 + (projectedWorld.x - projectedCamera.x) * camera.zoom,
    y: viewport.height * 0.5 + (projectedWorld.y - projectedCamera.y) * camera.zoom,
  };
}

function polarEllipse(
  semiMajor: number,
  eccentricity: number,
  angle: number,
): Point {
  const radius =
    (semiMajor * (1 - eccentricity * eccentricity)) /
    (1 + eccentricity * Math.cos(angle));
  return orbitPosition(radius, angle);
}

function staticOuterPose(radius: number, angle: number, drift: number): Point {
  const tangent = { x: -Math.sin(angle), y: Math.cos(angle) };
  const base = orbitPosition(radius, angle);
  return {
    x: base.x + tangent.x * drift,
    y: base.y + tangent.y * drift,
  };
}

function missionWorldAt(
  mission: MissionDefinition,
  bodyPositions: ReadonlyMap<LivingBodyId, Point>,
  elapsedSeconds: number,
  reducedMotion: boolean,
  dials: SpaceDials,
): Point {
  const time = reducedMotion ? 0 : elapsedSeconds * dials.missions.motionSpeed;
  const spacing = dials.bodies.spacingScale;
  const earth = bodyPositions.get("earth") ?? { x: 244 * spacing, y: 0 };

  switch (mission.id) {
    case "roadster": {
      const angle = 5.56 + (time / 148) * TAU;
      return polarEllipse(306 * spacing, 0.18, angle);
    }
    case "iss":
      return add(earth, orbitPosition(48 * spacing, 0.22 + (time / 13) * TAU));
    case "hubble":
      return add(earth, orbitPosition(61 * spacing, 3.48 + (time / 17) * TAU));
    case "webb": {
      const earthDistance = Math.max(1, Math.hypot(earth.x, earth.y));
      const outward = { x: earth.x / earthDistance, y: earth.y / earthDistance };
      const tangent = { x: -outward.y, y: outward.x };
      const halo = 0.72 + (time / 46) * TAU;
      return {
        x:
          earth.x +
          outward.x * (82 * spacing + Math.cos(halo) * 14 * spacing) +
          tangent.x * Math.sin(halo) * 26 * spacing,
        y:
          earth.y +
          outward.y * (82 * spacing + Math.cos(halo) * 14 * spacing) +
          tangent.y * Math.sin(halo) * 26 * spacing,
      };
    }
    case "parker": {
      const mean = 2.15 + (time / 43) * TAU;
      const trueAngle = mean + Math.sin(mean) * 0.56;
      return polarEllipse(96 * spacing, 0.62, trueAngle);
    }
    case "new-horizons":
      return staticOuterPose(868 * spacing, 5.72, Math.sin(time * 0.08) * 4);
    case "voyager-1":
      return staticOuterPose(936 * spacing, 0.46, Math.sin(time * 0.055 + 1) * 4);
    case "voyager-2":
      return staticOuterPose(908 * spacing, 2.63, Math.sin(time * 0.052 + 2) * 4);
  }
}

function missionPoseAt(
  mission: MissionDefinition,
  bodyPositions: ReadonlyMap<LivingBodyId, Point>,
  elapsedSeconds: number,
  reducedMotion: boolean,
  dials: SpaceDials,
): MissionPose {
  const world = missionWorldAt(
    mission,
    bodyPositions,
    elapsedSeconds,
    reducedMotion,
    dials,
  );
  const previous = missionWorldAt(
    mission,
    bodyPositions,
    Math.max(0, elapsedSeconds - 0.08),
    reducedMotion,
    dials,
  );
  let rotation = Math.atan2(world.y - previous.y, world.x - previous.x);

  if (mission.id === "roadster") {
    rotation += reducedMotion ? 0.18 : elapsedSeconds * dials.missions.motionSpeed * 0.62;
  } else if (mission.id === "webb") {
    rotation = Math.atan2(world.y, world.x) + Math.PI * 0.5;
  } else if (
    mission.id === "new-horizons" ||
    mission.id === "voyager-1" ||
    mission.id === "voyager-2"
  ) {
    rotation = Math.atan2(world.y, world.x);
  }

  return { world, rotation };
}

export function getRenderedMissions(frame: MissionFrame): RenderedMission[] {
  const rendered: RenderedMission[] = [];
  const compactScale = clamp(frame.viewport.width / 700, 0.62, 1);

  for (let index = 0; index < MISSION_DEFINITIONS.length; index += 1) {
    const mission = MISSION_DEFINITIONS[index];
    const revealZoom =
      mission.id === "iss" || mission.id === "hubble"
        ? frame.dials.missions.nearEarthReveal
        : mission.revealZoom;
    const pose = missionPoseAt(
      mission,
      frame.bodyPositions,
      frame.elapsedSeconds,
      frame.reducedMotion,
      frame.dials,
    );
    const scaledSize = mission.displaySize * frame.camera.zoom * frame.dials.missions.spriteScale;
    const minimum = mission.minDisplaySize * compactScale * frame.dials.missions.spriteScale;
    const visualSize = clamp(
      Math.max(minimum, scaledSize),
      12,
      mission.displaySize * 1.42 * frame.dials.missions.spriteScale,
    );
    rendered.push({
      mission,
      world: pose.world,
      screen: worldToScreen(pose.world, frame.camera, frame.viewport, frame.yFactor),
      visualSize,
      hitSize: Math.max(22, visualSize * 0.58),
      rotation: pose.rotation,
      revealed: frame.camera.zoom >= revealZoom,
    });
  }

  return rendered;
}

function fillRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
) {
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
}

function polygon(
  context: CanvasRenderingContext2D,
  points: readonly Point[],
  color: string,
) {
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index].x, points[index].y);
  }
  context.closePath();
  context.fill();
}

function drawRoadsterSprite(context: CanvasRenderingContext2D) {
  fillRect(context, 15, 28, 34, 11, "#6f101d");
  fillRect(context, 20, 24, 21, 6, "#d72d42");
  fillRect(context, 16, 29, 31, 6, "#f04a5f");
  fillRect(context, 39, 31, 12, 5, "#a41329");
  fillRect(context, 25, 25, 9, 5, "#73b9d1");
  fillRect(context, 30, 21, 4, 4, "#eef7ef");
  fillRect(context, 31, 20, 2, 2, "#ffffff");
  fillRect(context, 19, 37, 7, 5, "#171a25");
  fillRect(context, 40, 37, 7, 5, "#171a25");
  fillRect(context, 20, 38, 5, 2, "#5b6570");
  fillRect(context, 41, 38, 5, 2, "#5b6570");
  fillRect(context, 47, 30, 4, 2, "#ffd2c4");
}

function drawStationSprite(context: CanvasRenderingContext2D) {
  fillRect(context, 7, 23, 20, 8, "#315792");
  fillRect(context, 7, 33, 20, 8, "#244579");
  fillRect(context, 37, 23, 20, 8, "#315792");
  fillRect(context, 37, 33, 20, 8, "#244579");
  for (let x = 10; x <= 53; x += 5) fillRect(context, x, 23, 1, 18, "#7aa8cf");
  fillRect(context, 27, 20, 10, 24, "#b8c2c5");
  fillRect(context, 21, 29, 22, 6, "#e8ece8");
  fillRect(context, 30, 16, 4, 32, "#838e94");
  fillRect(context, 43, 31, 7, 2, "#f4f0d7");
}

function drawHubbleSprite(context: CanvasRenderingContext2D) {
  fillRect(context, 17, 26, 29, 13, "#7f8a93");
  fillRect(context, 20, 28, 23, 9, "#c8d0d1");
  fillRect(context, 14, 28, 6, 9, "#385e8e");
  fillRect(context, 12, 30, 3, 5, "#68b5e6");
  fillRect(context, 45, 29, 6, 7, "#eef0e7");
  fillRect(context, 51, 31, 5, 3, "#a8b0b3");
  fillRect(context, 25, 17, 4, 9, "#334e77");
  fillRect(context, 35, 39, 4, 9, "#334e77");
  fillRect(context, 21, 16, 12, 3, "#5579a8");
  fillRect(context, 31, 46, 12, 3, "#5579a8");
}

function drawWebbSprite(context: CanvasRenderingContext2D) {
  polygon(
    context,
    [
      { x: 14, y: 34 },
      { x: 32, y: 25 },
      { x: 52, y: 34 },
      { x: 32, y: 43 },
    ],
    "#d8c9a4",
  );
  polygon(
    context,
    [
      { x: 17, y: 35 },
      { x: 32, y: 29 },
      { x: 49, y: 35 },
      { x: 32, y: 40 },
    ],
    "#f2ead1",
  );
  const mirrors = [
    [28, 15], [34, 15], [25, 20], [31, 20], [37, 20], [28, 25], [34, 25],
  ] as const;
  for (let index = 0; index < mirrors.length; index += 1) {
    const [x, y] = mirrors[index];
    fillRect(context, x, y, 5, 5, index % 2 === 0 ? "#ffd15c" : "#e99a2f");
  }
  fillRect(context, 31, 30, 3, 8, "#8f7d62");
}

function drawParkerSprite(context: CanvasRenderingContext2D) {
  fillRect(context, 17, 20, 7, 25, "#f0bb48");
  fillRect(context, 20, 22, 5, 21, "#fff0a0");
  fillRect(context, 24, 27, 22, 12, "#9aa5a3");
  fillRect(context, 27, 29, 15, 8, "#d4dbd5");
  fillRect(context, 43, 23, 4, 20, "#485867");
  fillRect(context, 47, 30, 7, 5, "#7593a6");
  fillRect(context, 31, 20, 3, 7, "#e6edf0");
}

function drawDishProbeSprite(
  context: CanvasRenderingContext2D,
  dish: string,
  body: string,
  wideDish: boolean,
) {
  polygon(
    context,
    [
      { x: 16, y: wideDish ? 19 : 22 },
      { x: 36, y: 31 },
      { x: 16, y: wideDish ? 43 : 40 },
    ],
    dish,
  );
  fillRect(context, 18, 30, 22, 3, "#f4e0a2");
  fillRect(context, 36, 27, 10, 11, body);
  fillRect(context, 45, 30, 12, 4, "#87929a");
  fillRect(context, 49, 25, 3, 5, "#d5dcda");
  fillRect(context, 40, 38, 3, 7, "#444b55");
}

function createMissionSprite(mission: MissionDefinition) {
  const cached = spriteCache.get(mission.id);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE_SIZE;
  canvas.height = SPRITE_SIZE;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.imageSmoothingEnabled = false;

  switch (mission.recipe) {
    case "roadster":
      drawRoadsterSprite(context);
      break;
    case "station":
      drawStationSprite(context);
      break;
    case "hubble":
      drawHubbleSprite(context);
      break;
    case "webb":
      drawWebbSprite(context);
      break;
    case "parker":
      drawParkerSprite(context);
      break;
    case "new-horizons":
      drawDishProbeSprite(context, "#dfe7e4", "#9ea9a7", true);
      break;
    case "voyager":
      drawDishProbeSprite(context, "#d7ad48", "#8d7847", false);
      break;
  }
  spriteCache.set(mission.id, canvas);
  return canvas;
}

function drawTrailPixels(
  context: CanvasRenderingContext2D,
  mission: MissionDefinition,
  frame: MissionFrame,
  colorA: string,
  colorB: string,
  sampleCount: number,
  secondsPerSample: number,
) {
  for (let index = sampleCount; index >= 1; index -= 1) {
    const sampleTime = Math.max(
      0,
      frame.elapsedSeconds - index * secondsPerSample * frame.dials.missions.trailLength,
    );
    const world = missionWorldAt(
      mission,
      frame.bodyPositions,
      sampleTime,
      false,
      frame.dials,
    );
    const screen = worldToScreen(world, frame.camera, frame.viewport, frame.yFactor);
    const closeness = 1 - index / sampleCount;
    context.globalAlpha =
      frame.dials.missions.trailOpacity * (0.12 + closeness * 0.62);
    context.fillStyle = index % 2 === 0 ? colorA : colorB;
    const size = closeness > 0.72 ? 2 : 1;
    context.fillRect(Math.round(screen.x), Math.round(screen.y), size, size);
  }
}

export function drawMissionTrails(
  context: CanvasRenderingContext2D,
  renderedMissions: readonly RenderedMission[],
  frame: MissionFrame,
) {
  if (frame.reducedMotion || frame.dials.missions.trailOpacity <= 0) return;
  context.save();
  context.globalCompositeOperation = "screen";
  for (let index = 0; index < renderedMissions.length; index += 1) {
    const rendered = renderedMissions[index];
    if (!rendered.revealed) continue;
    if (rendered.mission.id === "roadster") {
      drawTrailPixels(context, rendered.mission, frame, "#ff3d7a", "#50d9f3", 20, 0.36);
    } else if (rendered.mission.id === "parker") {
      drawTrailPixels(context, rendered.mission, frame, "#ffb62f", "#ef5a21", 16, 0.22);
    } else if (rendered.mission.id === "iss") {
      drawTrailPixels(context, rendered.mission, frame, "#8ee5ff", "#ffffff", 8, 0.08);
    } else if (rendered.mission.id === "hubble") {
      drawTrailPixels(context, rendered.mission, frame, "#6f9ed4", "#dcefff", 7, 0.1);
    }
  }
  context.restore();
}

function drawGlow(
  context: CanvasRenderingContext2D,
  center: Point,
  radius: number,
  color: string,
  alpha: number,
) {
  const gradient = context.createRadialGradient(
    center.x,
    center.y,
    0,
    center.x,
    center.y,
    radius,
  );
  gradient.addColorStop(0, color.replace("ALPHA", String(alpha)));
  gradient.addColorStop(1, color.replace("ALPHA", "0"));
  context.fillStyle = gradient;
  context.fillRect(center.x - radius, center.y - radius, radius * 2, radius * 2);
}

function drawSignal(
  context: CanvasRenderingContext2D,
  rendered: RenderedMission,
  sunScreen: Point,
  elapsedSeconds: number,
  color: string,
  intensity: number,
) {
  const dx = sunScreen.x - rendered.screen.x;
  const dy = sunScreen.y - rendered.screen.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const direction = { x: dx / length, y: dy / length };
  const phase = (elapsedSeconds * 7) % 8;
  for (let index = 0; index < 10; index += 1) {
    const distance = 11 + index * 7 + phase;
    context.globalAlpha = (1 - index / 11) * 0.5 * intensity;
    context.fillStyle = color;
    context.fillRect(
      Math.round(rendered.screen.x + direction.x * distance),
      Math.round(rendered.screen.y + direction.y * distance),
      index < 2 ? 2 : 1,
      1,
    );
  }
}

export function drawMission(
  context: CanvasRenderingContext2D,
  rendered: RenderedMission,
  sunScreen: Point,
  elapsedSeconds: number,
  reducedMotion: boolean,
  selected: boolean,
  hovered: boolean,
  dials: SpaceDials,
) {
  if (!rendered.revealed) return;
  const sprite = createMissionSprite(rendered.mission);
  const interactionScale = selected ? 1.18 : hovered ? 1.09 : 1;
  const size = rendered.visualSize * interactionScale;
  const signalIntensity = dials.missions.signalIntensity;

  context.save();
  context.globalCompositeOperation = "screen";
  if (selected || hovered) {
    drawGlow(
      context,
      rendered.screen,
      size * 0.78,
      "rgba(88, 218, 244, ALPHA)",
      selected ? 0.28 : 0.16,
    );
  }

  if (!reducedMotion) {
    const time = elapsedSeconds * dials.missions.motionSpeed;
    if (rendered.mission.id === "iss") {
      const glint = clamp((Math.sin(time * 2.4) - 0.76) / 0.24, 0, 1);
      if (glint > 0) {
        context.globalAlpha = glint * 0.85;
        context.fillStyle = "#ffffff";
        context.fillRect(Math.round(rendered.screen.x - 8), Math.round(rendered.screen.y), 17, 1);
        context.fillRect(Math.round(rendered.screen.x), Math.round(rendered.screen.y - 8), 1, 17);
      }
    } else if (rendered.mission.id === "hubble") {
      const flash = clamp((Math.sin(time * 1.72 + 1.4) - 0.86) / 0.14, 0, 1);
      if (flash > 0) {
        drawGlow(
          context,
          rendered.screen,
          14,
          "rgba(106, 198, 255, ALPHA)",
          flash * 0.72,
        );
      }
    } else if (rendered.mission.id === "webb") {
      const shimmer = 0.32 + (Math.sin(time * 1.1) + 1) * 0.24;
      context.globalAlpha = shimmer * signalIntensity;
      context.fillStyle = "#ffe98e";
      context.fillRect(Math.round(rendered.screen.x - 2), Math.round(rendered.screen.y - size * 0.28), 4, 2);
    } else if (rendered.mission.id === "new-horizons") {
      const progress = (time * 0.32) % 1;
      context.globalAlpha = (1 - progress) * 0.48 * signalIntensity;
      context.strokeStyle = "#72e1ef";
      context.lineWidth = 1;
      context.beginPath();
      context.arc(rendered.screen.x, rendered.screen.y, 8 + progress * 24, 0, TAU);
      context.stroke();
    } else if (
      rendered.mission.id === "voyager-1" ||
      rendered.mission.id === "voyager-2"
    ) {
      drawSignal(
        context,
        rendered,
        sunScreen,
        time,
        rendered.mission.id === "voyager-1" ? "#f3ca62" : "#78bcea",
        signalIntensity,
      );
    }
  }
  context.restore();

  context.save();
  context.translate(Math.round(rendered.screen.x), Math.round(rendered.screen.y));
  context.rotate(rendered.rotation);
  context.imageSmoothingEnabled = false;
  context.drawImage(sprite, -size * 0.5, -size * 0.5, size, size);
  context.restore();
}
