"use client";

import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { addCaseDetails, addFrontIO, addGpuRearIO } from "./caseDetails";
import { createSceneExperience } from "./sceneExperience";
import { DEFAULT_EXPERIENCE, type Experience, type HardwarePart } from "./experience";
import { createEnergyFlow } from "./energyFlow";
import { addHardwareComponents, createHardwareFan } from "./hardwareModels";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { componentCooling, evaluate, MOUNTS, type Config } from "./model";
import { createSurfaceLibrary, type SurfaceLibrary } from "./realisticMaterials";

type Props = {
  selection?: string | null;
  leaderRef?: RefObject<SVGLineElement | null>;
  onDeselect?: () => void;
  anchorRef?: RefObject<HTMLDivElement | null>;
  config: Config;
  selectedMount: string;
  onSelectMount: (id: string) => void;
  showAirflow: boolean;
  showPanels: boolean;
  showComponents: boolean;
  view: "perspective" | "side" | "front" | "rear" | "top";
  resetKey: number;
  showDimensions?: boolean;
  experience?: Experience;
  selectedComponent?: HardwarePart | null;
  onSelectComponent?: (part: HardwarePart) => void;
};

type Runtime = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  staticGroup: THREE.Group;
  dynamicGroup: THREE.Group;
  componentGroup: THREE.Group;
  mountMeshes: THREE.Object3D[];
  raycaster: THREE.Raycaster;
  pointer: THREE.Vector2;
  streams: Array<{ material: THREE.ShaderMaterial; speed: number; mountId: string }>;
  componentFans: Array<{ rotor: THREE.Object3D; flow: THREE.Group; material: THREE.ShaderMaterial; kind: "cpu" | "gpu" }>;
  blades: Array<{ mesh: THREE.Group; speed: number; axis: THREE.Vector3 }>;
  frame: number;
  lastTime: number;
  needsRender: boolean;
  experienceController: ReturnType<typeof createSceneExperience>;
  cameraTween: { from: THREE.Vector3; to: THREE.Vector3; elapsed: number } | null;
  explosionZoom: number;
  surfaces: SurfaceLibrary;
  dispose: () => void;
};

const CASE = { depth: 420, height: 288, width: 191 };
const cyan = new THREE.Color("#009eaa");
const amber = new THREE.Color("#df7522");

function material(color: THREE.ColorRepresentation, opacity = 1) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.55,
    roughness: 0.38,
    transparent: opacity < 1,
    opacity,
    side: THREE.DoubleSide,
  });
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.InstancedMesh) child.dispose();
    const mesh = child as THREE.Mesh;
    mesh.geometry?.dispose?.();
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    materials.forEach((entry) => {
      if (entry?.userData.shared) return;
      const maps = entry as THREE.MeshStandardMaterial | undefined;
      for (const texture of [maps?.map, maps?.alphaMap])
        if (texture && !texture.userData.shared) texture.dispose();
      entry?.dispose?.();
    });
  });
}

function box(
  size: [number, number, number],
  surface: THREE.ColorRepresentation | THREE.Material | THREE.Material[],
  pos: [number, number, number],
  opacity = 1,
  outlined = false,
) {
  const baseMaterial = typeof surface === "string" || typeof surface === "number" || surface instanceof THREE.Color ? material(surface, opacity) : surface;
  const mesh = new THREE.Mesh(
    new RoundedBoxGeometry(...size, 2, Math.min(0.7, Math.min(...size) / 5)),
    baseMaterial,
  );
  mesh.position.set(...pos);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (outlined) {
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry),
      new THREE.LineBasicMaterial({ color: "#91a1ad", transparent: true, opacity: 0.35 }),
    );
    mesh.add(edges);
  }
  return mesh;
}

function orient(object: THREE.Object3D, normal: readonly number[]) {
  object.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(...normal).normalize(),
  );
}

function labelSprite(text: string, color = "#59655f") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.Object3D();
  context.font = "400 30px ui-monospace, SFMono-Regular, monospace";
  canvas.width = Math.ceil(context.measureText(text).width + 24);
  context.font = "400 30px ui-monospace, SFMono-Regular, monospace";
  context.fillStyle = color;
  context.fillText(text, 12, 43);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      toneMapped: false,
      transparent: true,
      depthTest: false,
    }),
  );
  sprite.scale.set(canvas.width * 0.24, canvas.height * 0.24, 1);
  return sprite;
}

function addFrame(group: THREE.Group, surfaces: SurfaceLibrary) {
  const { depth, height, width } = CASE;
  const rails: [number, number, number, number, number, number][] = [
    [depth, 8, 8, 0, -height / 2, -width / 2],
    [depth, 8, 8, 0, height / 2, -width / 2],
    [depth, 8, 8, 0, -height / 2, width / 2],
    [depth, 8, 8, 0, height / 2, width / 2],
    [8, height, 8, -depth / 2, 0, -width / 2],
    [8, height, 8, depth / 2, 0, -width / 2],
    [8, height, 8, -depth / 2, 0, width / 2],
    [8, height, 8, depth / 2, 0, width / 2],
  ];
  rails.forEach(([x, y, z, px, py, pz]) =>
    group.add(box([x, y, z], surfaces.steel, [px, py, pz])),
  );
  // central width rails and small feet complete the skeletal case silhouette.
  [-height / 2, height / 2].forEach((y) =>
    group.add(box([5, 5, width], surfaces.steel, [-depth / 2, y, 0])),
  );
  [-depth / 2 + 28, depth / 2 - 28].forEach((x) =>
    [-width / 2 + 26, width / 2 - 26].forEach((z) =>
      group.add(box([22, 8, 22], surfaces.rubber, [x, -height / 2 - 5, z])),
    ),
  );
  const floor = perforatedPanel(CASE.depth - 16, CASE.width - 16, surfaces);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -height / 2 + 3;
  group.add(floor);
  const front = perforatedPanel(width - 18, height - 18, surfaces);
  front.rotation.y = Math.PI / 2;
  front.position.x = depth / 2;
  group.add(front);
  for (const x of [-depth / 2, depth / 2]) {
    for (const y of [-height / 2, height / 2])
      group.add(box([8, 8, width], surfaces.steel, [x, y, 0]));
    for (const z of [-width / 2, width / 2])
      group.add(box([18, height - 12, 1.5], surfaces.steel, [x + (x < 0 ? 7 : -7), 0, z]));
  }
  // Folded fan-mount flanges, panel screws and rear expansion covers.
  for (const y of [-height / 2 + 5, height / 2 - 5])
    for (const z of [-61, 61])
      group.add(box([depth - 18, 2, 10], surfaces.steel, [0, y, z]));
  const screwGeometry = new THREE.CylinderGeometry(2.3, 2.3, 1.2, 12);
  const screws = new THREE.InstancedMesh(screwGeometry, surfaces.aluminum, 24);
  const screwPose = new THREE.Object3D();
  screwPose.rotation.x = Math.PI / 2;
  let screwIndex = 0;
  for (const x of [-197, 197]) for (const y of [-131, 0, 131]) for (const z of [-91, 91]) {
    screwPose.position.set(x, y, z);
    screwPose.updateMatrix();
    screws.setMatrixAt(screwIndex++, screwPose.matrix);
  }
  screws.count = screwIndex;
  group.add(screws);
  for (let slot = 0; slot < 4; slot++) {
    group.add(box([2, 14, 115], surfaces.steel, [-207, -115 + slot * 19, 13]));
    for (let vent = 0; vent < 8; vent++)
      group.add(box([2.4, 2, 8], surfaces.rubber, [-208.3, -115 + slot * 19, -35 + vent * 13]));
  }
  addFrontIO(group, surfaces);
  addCaseDetails(group, surfaces);
  addGpuRearIO(group, surfaces);
  // Stamped rear sheet with real motherboard, fan, expansion and AC openings.
  const rearOutline = new THREE.Shape();
  rearOutline.moveTo(-91, -140); rearOutline.lineTo(91, -140);
  rearOutline.lineTo(91, 140); rearOutline.lineTo(-91, 140); rearOutline.closePath();
  const rearOpening = (x: number, y: number, width: number, height: number) => {
    const hole = new THREE.Path();
    hole.moveTo(x - width / 2, y - height / 2);
    hole.lineTo(x - width / 2, y + height / 2);
    hole.lineTo(x + width / 2, y + height / 2);
    hole.lineTo(x + width / 2, y - height / 2); hole.closePath();
    rearOutline.holes.push(hole);
  };
  rearOpening(-57, 43.5, 44, 159);
  rearOpening(13, -88, 120, 82);
  rearOpening(48, 111, 58, 26);
  const rearFanOpening = new THREE.Path();
  rearFanOpening.absarc(32, 35, 58, 0, Math.PI * 2, true);
  rearOutline.holes.push(rearFanOpening);
  const rearSheet = new THREE.Mesh(new THREE.ExtrudeGeometry(rearOutline, { depth: 1.2, bevelEnabled: false }), surfaces.steel);
  rearSheet.rotation.y = -Math.PI / 2;
  rearSheet.position.x = -209.5;
  rearSheet.castShadow = rearSheet.receiveShadow = true;
  group.add(rearSheet);
  for (const y of [-22, 92]) for (const z of [-25, 89]) {
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 1.1, 16), surfaces.aluminum);
    screw.rotation.z = Math.PI / 2;
    screw.position.set(-212, y, z);
    group.add(screw);
  }
  // Continuous front bezel: satin rolled steel, a fine recessed seam, and folded returns.
  for (const z of [-91, 91]) {
    group.add(box([3, 280, 8], surfaces.steel, [211, 0, z]));
    group.add(box([8, 280, 1.2], surfaces.steel, [207, 0, z + Math.sign(z) * 4]));
  }
  for (const y of [-140, 140]) group.add(box([3, 8, 182], surfaces.steel, [211, y, 0]));
  // Captive top bracket fasteners and panel retention clips sit inside the frame.
  for (const x of [-193, 160]) for (const z of [-87, 87]) {
    group.add(box([11, 2, 8], surfaces.steel, [x, 137, z]));
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 1.1, 16), surfaces.aluminum);
    bolt.position.set(x, 138.5, z);
    group.add(bolt);
  }
  // Magnetic dust-filter perimeter and a small removal tab below the perforated floor.
  for (const z of [-87, 87]) group.add(box([399, 1.2, 4], surfaces.rubber, [0, -145.8, z]));
  for (const x of [-200, 200]) group.add(box([4, 1.2, 174], surfaces.rubber, [x, -145.8, 0]));
  group.add(box([14, 1.4, 8], surfaces.rubber, [183, -145.8, 90]));
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200000, 200000), new THREE.ShadowMaterial({ color: "#686c65", opacity: 0.14 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -height / 2 - 10.2;
  ground.receiveShadow = true;
  group.add(ground);
  // motherboard tray, intentionally offset toward the open/visible side
  group.add(box([248, 220, 4], surfaces.steel, [-30, 0, -80]));
  for (let x = -120; x <= 60; x += 60)
    for (let y = -84; y <= 66; y += 52) {
      const stand = new THREE.Mesh(
        new THREE.CylinderGeometry(3, 3, 8, 12),
        material("#aab4bd"),
      );
      stand.rotation.x = Math.PI / 2;
      stand.position.set(x, y, -74);
      group.add(stand);
    }
  const tag = labelSprite("B4-mATX  ·  MESH", "#7c8b96");
  tag.position.set(-152, -126, -97);
  tag.scale.multiplyScalar(0.72);
  group.add(tag);
  const grid = new THREE.Mesh(
    new THREE.PlaneGeometry(200000, 200000),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: `varying vec3 worldPosition; void main() { vec4 p = modelMatrix * vec4(position, 1.0); worldPosition = p.xyz; gl_Position = projectionMatrix * viewMatrix * p; }`,
      fragmentShader: `varying vec3 worldPosition;
      float gridLine(float spacing) { vec2 p = worldPosition.xz / spacing; vec2 a = abs(fract(p - 0.5) - 0.5) / max(fwidth(p), vec2(0.00001)); return 1.0 - min(min(a.x, a.y), 1.0); }
      void main() { float fade = exp(-length(worldPosition.xz - cameraPosition.xz) * 0.0018); float line = gridLine(25.0) * 0.07 + gridLine(100.0) * 0.09; gl_FragColor = vec4(vec3(0.36, 0.40, 0.37), line * fade); }`,
    }),
  );
  grid.rotation.x = -Math.PI / 2;
  grid.position.y = -height / 2 - 10;
  grid.name = "drafting-grid";
  grid.visible = false;
  group.add(grid);
}

function addDimensionLine(
  group: THREE.Group,
  from: THREE.Vector3,
  to: THREE.Vector3,
  text: string,
  labelPosition: THREE.Vector3,
) {
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([from, to]),
    new THREE.LineBasicMaterial({
      color: "#7893a3",
      transparent: true,
      opacity: 0.8,
    }),
  );
  group.add(line);
  const tickOffset =
    Math.abs(to.y - from.y) > Math.abs(to.x - from.x) + Math.abs(to.z - from.z)
      ? new THREE.Vector3(8, 0, 0)
      : new THREE.Vector3(0, 8, 0);
  const ticks = [from, to];
  ticks.forEach((point) => {
    const tick = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        point.clone().sub(tickOffset),
        point.clone().add(tickOffset),
      ]),
      new THREE.LineBasicMaterial({ color: "#7893a3" }),
    );
    group.add(tick);
  });
  const label = labelSprite(text, "#56665f");
  label.position.copy(labelPosition);
  label.scale.multiplyScalar(1.1);
  group.add(label);
}

function addDimensions(group: THREE.Group, visible: boolean) {
  disposeObject(group);
  group.clear();
  if (!visible) return;
  addDimensionLine(
    group,
    new THREE.Vector3(-210, -162, 108),
    new THREE.Vector3(210, -162, 108),
    "420 mm",
    new THREE.Vector3(0, -154, 108),
  );
  addDimensionLine(
    group,
    new THREE.Vector3(-222, -144, 108),
    new THREE.Vector3(-222, 144, 108),
    "288 mm",
    new THREE.Vector3(-222, 0, 108),
  );
  addDimensionLine(
    group,
    new THREE.Vector3(223, -154, -95),
    new THREE.Vector3(223, -154, 95),
    "191 mm",
    new THREE.Vector3(223, -145, 0),
  );
  const axis = new THREE.AxesHelper(48);
  axis.position.set(-185, -132, 78);
  group.add(axis);
  const hint = labelSprite("X depth  ·  Y height  ·  Z width", "#7f9cab");
  hint.position.set(-112, -122, 108);
  hint.scale.multiplyScalar(0.46);
  group.add(hint);
}

/** Thin perforated sheet: two skins, real bore walls, and a solid perimeter edge. */
function perforatedPanel(width: number, height: number, surfaces: SurfaceLibrary) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = "black";
  ctx.beginPath(); ctx.arc(32, 32, 24, 0, Math.PI * 2); ctx.fill();
  const alphaMap = new THREE.CanvasTexture(canvas);
  alphaMap.wrapS = alphaMap.wrapT = THREE.RepeatWrapping;
  const columns = Math.round(width / 3.5), rows = Math.round(height / 3.5);
  const pitchX = width / columns, pitchY = height / rows;
  const thickness = 0.7; // Millimeters; a light sheet-metal gauge.
  alphaMap.repeat.set(columns, rows);
  const surface = surfaces.steel.clone();
  surface.userData = {};
  let disposed = false;
  surface.addEventListener("dispose", () => { disposed = true; });
  // The shared albedo may finish loading after these per-panel cutout materials exist.
  void surfaces.ready.then(() => {
    if (disposed) return;
    surface.map = surfaces.steel.map;
    surface.bumpMap = surfaces.steel.bumpMap;
    surface.bumpScale = surfaces.steel.bumpScale;
    surface.color.copy(surfaces.steel.color);
    surface.needsUpdate = true;
  }).catch(() => {});
  surface.alphaMap = alphaMap;
  surface.alphaTest = 0.5;
  surface.alphaToCoverage = true;
  surface.side = THREE.DoubleSide;
  const panel = new THREE.Group();
  panel.name = "Perforated sheet · 0.7 mm";
  for (const z of [-thickness / 2, thickness / 2]) {
    const skin = new THREE.Mesh(new THREE.PlaneGeometry(width, height), surface);
    skin.position.z = z;
    skin.receiveShadow = true;
    panel.add(skin);
  }
  // Instancing keeps thousands of tiny hole interiors to one draw call per panel.
  const boreMaterial = surfaces.steel.clone();
  boreMaterial.userData = {};
  boreMaterial.side = THREE.BackSide;
  const boreGeometry = new THREE.CylinderGeometry(.375, .375, 1, 12, 1, true);
  boreGeometry.rotateX(Math.PI / 2);
  const bores = new THREE.InstancedMesh(boreGeometry, boreMaterial, columns * rows);
  bores.name = "Perforation interiors";
  const transform = new THREE.Matrix4();
  let instance = 0;
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    transform.makeScale(pitchX, pitchY, thickness);
    transform.setPosition(-width / 2 + (x + .5) * pitchX, -height / 2 + (y + .5) * pitchY, 0);
    bores.setMatrixAt(instance++, transform);
  }
  bores.instanceMatrix.needsUpdate = true;
  bores.receiveShadow = true;
  panel.add(bores);
  // A narrow unpunched hem catches light at grazing angles.
  for (const y of [-height / 2, height / 2]) panel.add(box([width + .8, .8, thickness], surfaces.steel, [0,y,0]));
  for (const x of [-width / 2, width / 2]) panel.add(box([.8, height, thickness], surfaces.steel, [x,0,0]));
  return panel;
}

function addPanels(group: THREE.Group, enabled: boolean, surfaces: SurfaceLibrary) {
  disposeObject(group);
  group.clear();
  if (!enabled) return;
  for (const z of [-CASE.width / 2 - 1, CASE.width / 2 + 1]) {
    const assembly = new THREE.Group();
    assembly.name = z < 0 ? "panel-left" : "panel-right";
    assembly.userData.explodeVector = new THREE.Vector3(0, 0, Math.sign(z) * 155);
    group.add(assembly);
    const side = perforatedPanel(CASE.depth - 12, CASE.height - 12, surfaces);
    side.position.z = z;
    assembly.add(side);
    for (const x of [-202, 202]) {
      assembly.add(box([1.2, CASE.height - 12, 4], surfaces.steel, [x, 0, z - Math.sign(z) * 2]));
      assembly.add(box([0.65, CASE.height - 14, 0.6], surfaces.rubber, [x + Math.sign(x) * 3.5, 0, z + Math.sign(z) * 0.25]));
    }
    for (const y of [-CASE.height / 2 + 3, CASE.height / 2 - 3])
      assembly.add(box([CASE.depth, 6, 1.5], surfaces.steel, [0, y, z]));
    for (const x of [-CASE.depth / 2 + 3, CASE.depth / 2 - 3])
      assembly.add(box([6, CASE.height, 1.5], surfaces.steel, [x, 0, z]));
  }
  const topAssembly = new THREE.Group();
  topAssembly.name = "panel-top";
  topAssembly.userData.explodeVector = new THREE.Vector3(0, 160, 0);
  group.add(topAssembly);
  const top = perforatedPanel(CASE.depth - 46, CASE.width - 18, surfaces);
  top.rotation.x = -Math.PI / 2;
  top.position.set(-17, CASE.height / 2 + 1, 0);
  topAssembly.add(top);
  for (const z of [-91, 91]) {
    topAssembly.add(box([382, 1.5, 8], surfaces.steel, [-17, 145, z]));
    topAssembly.add(box([382, 4, 1], surfaces.steel, [-17, 143, z]));
  }
  topAssembly.add(box([8, 1.5, 182], surfaces.steel, [-206, 145, 0]));
  topAssembly.add(box([6, 1.5, 182], surfaces.steel, [173, 145, 0]));
  // Tool-less pull recess along the rear lip.
  topAssembly.add(box([4, 1.2, 42], surfaces.rubber, [-207, 146, 0]));
}

function createFan(
  mount: (typeof MOUNTS)[number],
  settings: Config["fans"][string],
  selected: boolean,
  streams: Runtime["streams"],
  blades: Runtime["blades"],
  airflow: boolean,
  surfaces: SurfaceLibrary,
) {
  const group = new THREE.Group();
  group.userData.mountId = mount.id;
  group.position.set(...mount.position);
  orient(group, mount.normal);
  // A mount lies on the panel plane; bring its depth fully into the chassis.
  group.position.addScaledVector(
    new THREE.Vector3(...mount.normal),
    -settings.thickness / 2,
  );
  const color = settings.direction === "intake" ? cyan : amber;
  const radius = settings.size / 2;
  const hardware = createHardwareFan(settings.size, settings.thickness, surfaces);
  group.add(hardware);
  // The thin overlay belongs to selection/airflow, not to the physical fan.
  if (selected || airflow) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius - 5.5, radius - 4.7, 64),
      new THREE.MeshBasicMaterial({ color: selected ? "#e8f4ff" : color, transparent: true, opacity: selected ? 0.8 : 0.38, side: THREE.DoubleSide, depthWrite: false }),
    );
    ring.position.z = settings.thickness / 2 + 0.8;
    group.add(ring);
  }
  const bladeGroup = hardware.getObjectByName("rotor") as THREE.Group;
  blades.push({
    mesh: bladeGroup,
    speed: settings.rpm / 2400,
    axis: new THREE.Vector3(0, 0, 1),
  });
  if (airflow && settings.rpm > 0) {
    const sign = settings.direction === "intake" ? -1 : 1;
    const energy = createEnergyFlow(radius, sign, color);
    energy.group.traverse((node) => { node.raycast = () => {}; });
    group.add(energy.group);
    streams.push({ material: energy.material, speed: settings.rpm / 1200, mountId: mount.id });
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, sign),
      new THREE.Vector3(0, 0, 18 * sign),
      31,
      color.getHex(),
      10,
      6,
    );
    group.add(arrow);
  }
  return group;
}

function mountGhost(mount: (typeof MOUNTS)[number], selected: boolean) {
  const group = new THREE.Group();
  group.position.set(...mount.position);
  orient(group, mount.normal);
  group.userData.mountId = mount.id;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(57.2, 58, 64),
    new THREE.MeshBasicMaterial({
      color: selected ? "#254e47" : "#698078",
      transparent: true,
      opacity: selected ? 0.9 : 0.28,
      side: THREE.DoubleSide,
    }),
  );
  group.add(ring);
  const dot = new THREE.Mesh(
    new THREE.CircleGeometry(4, 12),
    new THREE.MeshBasicMaterial({
      color: selected ? "#254e47" : "#697f76",
      transparent: true,
      opacity: 0.6,
    }),
  );
  dot.position.z = 0.5;
  group.add(dot);
  return group;
}

export default function CaseScene({
  config,
  selectedMount,
  onSelectMount,
  showAirflow,
  showPanels,
  showComponents,
  view,
  resetKey,
  showDimensions = true,
  experience = DEFAULT_EXPERIENCE,
  selectedComponent = null,
  onSelectComponent,
  selection = null,
  anchorRef,
  leaderRef,
  onDeselect,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const callbackRef = useRef(onSelectMount);
  const componentCallbackRef = useRef(onSelectComponent);
  const experienceRef = useRef({ experience, selectedComponent, config, selectedMount, selection, anchorRef, leaderRef, onDeselect, thermal: evaluate(config), cooling: componentCooling(config), showAirflow });
  useEffect(() => {
    componentCallbackRef.current = onSelectComponent;
    experienceRef.current = { experience, selectedComponent, config, selectedMount, selection, anchorRef, leaderRef, onDeselect, thermal: evaluate(config), cooling: componentCooling(config), showAirflow };
    if (runtimeRef.current) runtimeRef.current.needsRender = true;
  }, [experience, selectedComponent, config, selectedMount, onSelectComponent, selection, anchorRef, leaderRef, onDeselect, showAirflow]);
  useEffect(() => {
    callbackRef.current = onSelectMount;
  }, [onSelectMount]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let runtime: Runtime | null = null;
    try {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color("#fafaf8");
      const camera = new THREE.PerspectiveCamera(50, 1, 1, 20000);
      camera.position.set(620, 395, 615);
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.localClippingEnabled = true;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      host.appendChild(renderer.domElement);
      const surfaces = createSurfaceLibrary(renderer);
      void surfaces.ready.then(() => {
        host.setAttribute("data-textures-ready", "true");
        if (runtime) runtime.needsRender = true;
      }).catch(() => console.warn("Some component textures could not load; using base materials."));
      const pmrem = new THREE.PMREMGenerator(renderer);
      const room = new RoomEnvironment();
      const environment = pmrem.fromScene(room, 0.04);
      scene.environment = environment.texture;
      scene.environmentIntensity = 0.55;
      room.dispose();
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 0, 0);
      controls.enableDamping = true;
      controls.dampingFactor = 0.09;
      controls.rotateSpeed = 0.65;
      // Keep the chassis origin as the fixed pivot for every input device.
      controls.enablePan = false;
      controls.zoomSpeed = 0.75;
      controls.zoomToCursor = false;
      controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
      controls.mouseButtons.MIDDLE = THREE.MOUSE.ROTATE;
      controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
      controls.touches.ONE = THREE.TOUCH.ROTATE;
      controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
      renderer.domElement.style.cursor = "grab";
      renderer.domElement.tabIndex = 0;
      renderer.domElement.setAttribute(
        "aria-label",
        "3D case. Drag or middle-drag to orbit the case center; scroll to zoom. Shift plus arrow keys rotates. Touch: drag to rotate and pinch to zoom. The case stays centered.",
      );
      controls.listenToKeyEvents(renderer.domElement);
      controls.minDistance = 180;
      controls.maxDistance = 2600;
      scene.add(new THREE.HemisphereLight("#ffffff", "#b6b4ac", 1.1));
      const key = new THREE.DirectionalLight("#fff4e5", 2.0);
      key.position.set(250, 440, 300);
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      key.shadow.camera.far = 1600;
      key.shadow.normalBias = 0.4;
      key.shadow.camera.left = -500; key.shadow.camera.right = 500; key.shadow.camera.top = 500; key.shadow.camera.bottom = -500;
      scene.add(key);
      const accent = new THREE.PointLight("#9fc5d1", 32, 680);
      accent.position.set(-170, 110, 170);
      scene.add(accent);
      const rim = new THREE.DirectionalLight("#ffffff", 1.6);
      rim.position.set(-300, 180, -250);
      scene.add(rim);
      const fill = new THREE.DirectionalLight("#f6f6f1", 0.8);
      fill.position.set(-220, 50, 450);
      scene.add(fill);
      const staticGroup = new THREE.Group(),
        dynamicGroup = new THREE.Group();
      const componentGroup = new THREE.Group();
      componentGroup.position.y = -CASE.height / 2;
      scene.add(staticGroup, dynamicGroup, componentGroup);
      addFrame(staticGroup, surfaces);
      const panelGroup = new THREE.Group();
      staticGroup.add(panelGroup);
      const dimensionGroup = new THREE.Group();
      staticGroup.add(dimensionGroup);
      const mountMeshes: THREE.Object3D[] = [],
        streams: Runtime["streams"] = [],
        blades: Runtime["blades"] = [];
      runtime = {
        scene,
        camera,
        renderer,
        controls,
        staticGroup,
        dynamicGroup,
        componentGroup,
        mountMeshes,
        raycaster: new THREE.Raycaster(),
        pointer: new THREE.Vector2(),
        streams,
        blades,
        componentFans: [],
        frame: 0,
        lastTime: performance.now(),
        needsRender: true,
        experienceController: createSceneExperience(scene, staticGroup, componentGroup, dynamicGroup, surfaces),
        cameraTween: null,
        explosionZoom: 1,
        surfaces,
        dispose: () => {},
      };
      runtimeRef.current = runtime;
      const resize = () => {
        const rect = host.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        camera.aspect = rect.width / rect.height;
        camera.fov =
          (2 *
            Math.atan(
              Math.tan((25 * Math.PI) / 180) *
                Math.max(
                  1,
                  0.9 / camera.aspect,
                  rect.width > 760
                    ? (rect.height * 0.62) / Math.max(250, rect.height - 330)
                    : 1,
                ),
            ) *
            180) /
          Math.PI;
        camera.clearViewOffset();
        camera.updateProjectionMatrix();
        renderer.setSize(rect.width, rect.height, false);
        if (runtime) runtime.needsRender = true;
      };
      const observer = new ResizeObserver(resize);
      observer.observe(host);
      resize();
      const stopCameraTween = () => { if (runtime) runtime.cameraTween = null; };
      controls.addEventListener("start", stopCameraTween);
      const pick = (clientX: number, clientY: number): THREE.Object3D | null => {
        const rect = renderer.domElement.getBoundingClientRect();
        runtime!.pointer.set(
          ((clientX - rect.left) / rect.width) * 2 - 1,
          -((clientY - rect.top) / rect.height) * 2 + 1,
        );
        runtime!.raycaster.setFromCamera(runtime!.pointer, camera);
        const hit = runtime!.raycaster.intersectObjects(
          [...runtime!.mountMeshes, runtime!.componentGroup],
          true,
        ).find((intersection) => {
          for (let node: THREE.Object3D | null = intersection.object; node; node = node.parent)
            if (!node.visible) return false;
          const mesh = intersection.object as THREE.Mesh;
          const surface = Array.isArray(mesh.material) ? mesh.material[intersection.face?.materialIndex ?? 0] : mesh.material;
          return !surface?.clippingPlanes?.some((plane) => plane.distanceToPoint(intersection.point) < 0);
        });

        let target: THREE.Object3D | null = hit?.object ?? null;
        while (target && !target.userData.mountId && !target.userData.partId) target = target.parent;
        return target;
      };
      const hoverLayer = new THREE.Group(); hoverLayer.name = "Component hover"; scene.add(hoverLayer);
      let hovered: THREE.Object3D | null = null;
      let hoverPoint: { x: number; y: number } | null = null;
      let hoverDirty = false;
      const hoverCopies: { source: THREE.Mesh; copy: THREE.Mesh; material: THREE.MeshBasicMaterial }[] = [];
      const clearHover = () => {
        for (const {copy,material} of hoverCopies) {
          if(copy instanceof THREE.InstancedMesh) copy.dispose();
          material.dispose(); // The geometry belongs to the hardware, not the highlight.
        }
        hoverCopies.length=0; hoverLayer.clear(); hovered=null;
        renderer.domElement.style.cursor="grab";
        if(runtime) runtime.needsRender=true;
      };
      const setHover = (target: THREE.Object3D | null) => {
        if(target===hovered) return;
        clearHover(); hovered=target;
        if(!target) return;
        renderer.domElement.style.cursor="pointer";
        target.traverse(node => {
          if(!(node instanceof THREE.Mesh)) return;
          const sourceMaterial=Array.isArray(node.material)?node.material[0]:node.material;
          // Flow ribbons and temperature graphics aren't interactive hardware.
          if(sourceMaterial instanceof THREE.ShaderMaterial) return;
          const material=new THREE.MeshBasicMaterial({
            color:"#8ce0cd", transparent:true, opacity:.23, depthWrite:false,
            polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2,
            side:sourceMaterial.side, clippingPlanes:sourceMaterial.clippingPlanes,
          });
          const copy=node.clone(false) as THREE.Mesh;
          copy.material=material; copy.matrixAutoUpdate=false; copy.renderOrder=8;
          copy.raycast=()=>{};
          hoverLayer.add(copy); hoverCopies.push({source:node,copy,material});
        });
      };
      const hoverMove = (event: PointerEvent) => {
        if(event.pointerType==="touch" || event.buttons) { hoverPoint=null; clearHover(); if(event.buttons) renderer.domElement.style.cursor="grabbing"; return; }
        hoverPoint={x:event.clientX,y:event.clientY}; hoverDirty=true;
      };
      const hoverLeave = () => { hoverPoint=null; clearHover(); };
      let pointerStart: { x: number; y: number } | null = null;
      const pointerDown = (event: PointerEvent) => {
        hoverLeave();
        renderer.domElement.focus({ preventScroll: true });
        renderer.domElement.style.cursor = "grabbing";
        pointerStart = event.button === 0 && !event.shiftKey && !event.ctrlKey && !event.metaKey
          ? { x: event.clientX, y: event.clientY } : null;
      };
      const cancelPointer = () => {
        pointerStart = null;
        renderer.domElement.style.cursor = "grab";
      };
      const click = (event: PointerEvent) => {
        const start = pointerStart;
        cancelPointer();
        if (
          !start || event.button !== 0 ||
          Math.hypot(
            event.clientX - start.x,
            event.clientY - start.y,
          ) > 5
        )
          return;
        const target = pick(event.clientX, event.clientY);
        if (target) {
          if (target.userData.mountId)
            callbackRef.current(target.userData.mountId as string);
          else if (target?.userData.partId)
            componentCallbackRef.current?.(target.userData.partId as HardwarePart);
        } else experienceRef.current.onDeselect?.();
      };
      renderer.domElement.addEventListener("pointermove", hoverMove);
      renderer.domElement.addEventListener("pointerleave", hoverLeave);
      renderer.domElement.addEventListener("pointerdown", pointerDown);
      renderer.domElement.addEventListener("pointerup", click);
      renderer.domElement.addEventListener("pointercancel", cancelPointer);
      renderer.domElement.addEventListener("lostpointercapture", cancelPointer);
      const prefersReduced = matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const tick = (now: number) => {
        if (!runtime) return;
        const delta = Math.min(0.05, (now - runtime.lastTime) / 1000);
        runtime.lastTime = now;
        if (!document.hidden) {
          const state = experienceRef.current;
          const experienceChanged = runtime.experienceController.update(state.experience, state.selectedComponent, state.config, delta, prefersReduced, { cpu: state.thermal.cpuTemp, gpu: state.thermal.gpuTemp });
          const zoomTarget = 1 / (1 + state.experience.explode * 0.72);
          const nextZoom = prefersReduced ? zoomTarget : THREE.MathUtils.damp(runtime.explosionZoom, zoomTarget, 7, delta);
          const zoomChanged = Math.abs(nextZoom - runtime.explosionZoom) > 0.00001;
          if (zoomChanged) {
            runtime.explosionZoom = nextZoom;
            camera.zoom = nextZoom;
            camera.updateProjectionMatrix();
          }
          let tweenChanged = false;
          if (runtime.cameraTween) {
            const tween = runtime.cameraTween;
            tween.elapsed += delta;
            const progress = prefersReduced ? 1 : Math.min(1, tween.elapsed / 0.9);
            const eased = progress * progress * (3 - 2 * progress);
            const from = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1), tween.from.clone().normalize());
            const to = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1), tween.to.clone().normalize());
            camera.position.set(0,0,1).applyQuaternion(from.slerp(to, eased)).multiplyScalar(THREE.MathUtils.lerp(tween.from.length(), tween.to.length(), eased));
            runtime.controls.target.set(0,0,0);
            if (progress === 1) runtime.cameraTween = null;
            tweenChanged = true;
          }
          const cameraChanged = runtime.controls.update();
          if (hoverPoint && (hoverDirty || runtime.needsRender || cameraChanged || experienceChanged || tweenChanged || !hovered?.parent)) {
            setHover(pick(hoverPoint.x,hoverPoint.y)); hoverDirty=false;
          }
          for (const {source,copy,material} of hoverCopies) {
            source.updateWorldMatrix(true,false); copy.matrix.copy(source.matrixWorld);
            let shown=true;
            for(let node: THREE.Object3D | null=source;node;node=node.parent) if(!node.visible) shown=false;
            copy.visible=shown;
            const original=Array.isArray(source.material)?source.material[0]:source.material;
            const planes=original.clippingPlanes;
            if(Boolean(material.clippingPlanes?.length)!==Boolean(planes?.length)) material.needsUpdate=true;
            material.clippingPlanes=planes;
          }

          const popover = state.anchorRef?.current;
          if (popover && state.selection) {
            let selectedObject: THREE.Object3D | undefined;
            runtime.componentGroup.traverse(object => { if (object.userData.partId === state.selection) selectedObject = object; });
            runtime.dynamicGroup.traverse(object => { if (object.userData.mountId === state.selection && !selectedObject) selectedObject = object; });
            const point = new THREE.Vector3();
            if (selectedObject) {
              selectedObject.updateWorldMatrix(true, false);
              if (selectedObject.userData.partId) {
                const centers: Record<string, [number, number, number]> = {gpu: [-33,55,13],cooler: [-85,150,-10],motherboard: [-55,140,-60],psu:[153,237,-24]};
                point.fromArray(centers[state.selection] ?? [0,0,0]);
                selectedObject.localToWorld(point);
              } else selectedObject.getWorldPosition(point);
            }
            point.project(camera);
            const width = renderer.domElement.clientWidth;
            const height = renderer.domElement.clientHeight;
            const px = (point.x + 1) * width / 2;
            const py = (1 - point.y) * height / 2;
            if (width > 760) {
              const left = px + 110 + popover.offsetWidth < width - 20 ? px + 110 : px - popover.offsetWidth - 110;
              popover.style.left = `${Math.max(16, Math.min(width - popover.offsetWidth - 16, left))}px`;
              popover.style.top = `${Math.max(84, Math.min(height - popover.offsetHeight - 105, py - 70))}px`;
              const line = state.leaderRef?.current;
              if (line) {
                line.setAttribute('x1', String(px)); line.setAttribute('y1', String(py));
                line.setAttribute('x2', String(Number.parseFloat(popover.style.left) + (left < px ? popover.offsetWidth : 0)));
                line.setAttribute('y2', String(Number.parseFloat(popover.style.top) + 35));
              }
            } else { popover.style.left = ''; popover.style.top = ''; }
          }

          runtime.streams.forEach(({ material, mountId }) => {
            const selected = mountId === state.selectedMount;
            const target = state.experience.isolateFlow && state.config.fans[state.selectedMount]?.installed ? (selected ? 1.25 : 0.035) : state.experience.mode === "airflow" ? (selected ? 1.2 : 0.4) : state.experience.mode === "heat" ? 0.2 : 1;
            if (material.uniforms.intensity) material.uniforms.intensity.value = prefersReduced ? target : THREE.MathUtils.damp(material.uniforms.intensity.value, target, 8, delta);
          });
          const grid = runtime.staticGroup.getObjectByName("drafting-grid");
          if (grid) {
            grid.position.x = runtime.camera.position.x;
            grid.position.z = runtime.camera.position.z;
          }
          runtime.componentFans.forEach(({rotor, flow, material, kind}) => {
            const rpm = kind === "cpu" ? state.cooling.cpuRpm : state.cooling.gpuRpm;
            flow.visible = state.showAirflow && rpm > 0;
            const isolated = state.experience.isolateFlow && state.config.fans[state.selectedMount]?.installed;
            material.uniforms.intensity.value = isolated ? .035 : state.experience.mode === "heat" ? .18 : .65;
            if (!prefersReduced) {
              // Deliberately slowed for readable blades rather than temporal aliasing at real RPM.
              rotor.rotation.z += delta * 7.2 * rpm / 2400;
              material.uniforms.time.value += delta * rpm / 1200;
            }
          });
          if (!prefersReduced) {
            runtime.blades.forEach(
              ({ mesh, speed }) => (mesh.rotation.z += delta * 7.2 * speed),
            );
            runtime.streams.forEach(({ material, speed }) => {
              material.uniforms.time.value += delta * speed;
            });
          }
          if (!prefersReduced || runtime.needsRender || cameraChanged || experienceChanged || zoomChanged || tweenChanged) {
            renderer.render(scene, camera);
            runtime.needsRender = false;
          }
        }
        runtime.frame = requestAnimationFrame(tick);
      };
      tick(performance.now());
      runtime.dispose = () => {
        cancelAnimationFrame(runtime!.frame);
        observer.disconnect();
        clearHover(); scene.remove(hoverLayer);
        renderer.domElement.removeEventListener("pointermove", hoverMove);
        renderer.domElement.removeEventListener("pointerleave", hoverLeave);
        renderer.domElement.removeEventListener("pointerdown", pointerDown);
        renderer.domElement.removeEventListener("pointerup", click);
        renderer.domElement.removeEventListener("pointercancel", cancelPointer);
        renderer.domElement.removeEventListener("lostpointercapture", cancelPointer);
        controls.removeEventListener("start", stopCameraTween);
        controls.dispose();
        runtime!.experienceController.dispose();
        disposeObject(scene);
        environment.dispose();
        pmrem.dispose();
        surfaces.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
      // panel group is held in static scene and rebuilt by following effect via custom property
      staticGroup.userData.panelGroup = panelGroup;
      staticGroup.userData.dimensionGroup = dimensionGroup;
    } catch {
      host.setAttribute("data-webgl-error", "true");
      if (fallbackRef.current) fallbackRef.current.style.display = "grid";
    }
    return () => {
      runtime?.dispose();
      runtimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.needsRender = true;
    disposeObject(runtime.dynamicGroup);
    runtime.dynamicGroup.clear();
    runtime.mountMeshes.length = 0;
    runtime.streams.length = 0;
    runtime.blades.length = 0;
    const invalidFanIds = new Set(evaluate(config).invalidFanIds);
    MOUNTS.forEach((mount) => {
      const settings = config.fans[mount.id];
      const bank = MOUNTS.filter(
        (candidate) =>
          candidate.zone === mount.zone &&
          config.fans[candidate.id]?.size === 140,
      );
      const bankIndex = bank.findIndex(
        (candidate) => candidate.id === mount.id,
      );
      const visualMount =
        settings?.size === 140 &&
        (mount.zone === "bottom" || mount.zone === "side") &&
        bankIndex >= 0 &&
        bankIndex < 2
          ? {
              ...mount,
              position: [
                bankIndex === 0 ? -75 : 75,
                mount.position[1],
                mount.position[2],
              ] as [number, number, number],
            }
          : mount;
      const node = settings?.installed
        ? createFan(
            visualMount,
            settings,
            selectedMount === mount.id,
            runtime.streams,
            runtime.blades,
            showAirflow && !invalidFanIds.has(mount.id),
            runtime.surfaces,
          )
        : mountGhost(visualMount, selectedMount === mount.id);
      node.userData.basePosition = node.position.clone();
      node.userData.explodeVector = new THREE.Vector3(...visualMount.normal).multiplyScalar(110);
      runtime.dynamicGroup.add(node);
      runtime.mountMeshes.push(node);
    });
  }, [
    config,
    selectedMount,
    showAirflow,
  ]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.needsRender = true;
    addPanels(runtime.staticGroup.userData.panelGroup, showPanels, runtime.surfaces);
  }, [showPanels]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.needsRender = true;
    addDimensions(runtime.staticGroup.userData.dimensionGroup, showDimensions);
  }, [showDimensions]);

  const { gpuInstalled, gpuLength, gpuWidth, gpuThickness, coolerHeight } = config;
  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.needsRender = true;
    disposeObject(runtime.componentGroup);
    runtime.componentGroup.clear();
    const gpuIO = runtime.staticGroup.getObjectByName("gpu-rear-io");
    if (gpuIO) gpuIO.visible = gpuInstalled && runtime.componentGroup.visible;
    addHardwareComponents(runtime.componentGroup, { gpuInstalled, gpuLength, gpuWidth, gpuThickness, coolerHeight }, runtime.surfaces);
    runtime.componentFans.length = 0;
    const fans: THREE.Object3D[] = [];
    runtime.componentGroup.traverse(node => { if(node.userData.coolingFan) fans.push(node); });
    for (const fan of fans) {
      const rotor = fan.getObjectByName("rotor");
      if (!rotor) continue;
      const energy = createEnergyFlow(fan.userData.fanSize / 2, -1, new THREE.Color("#2b9e96"));
      // These fans recirculate air through their heatsinks inside the enclosure.
      // CPU: toward the rear (-X). GPU: up from the fan face into the fin stack (+Y).
      energy.group.scale.z = fan.userData.coolingFan === "cpu" ? .65 : .3;
      energy.group.traverse(node => { node.raycast = () => {}; });
      fan.add(energy.group);
      runtime.componentFans.push({ rotor, flow: energy.group, material: energy.material, kind: fan.userData.coolingFan });
    }

  }, [gpuInstalled, gpuLength, gpuWidth, gpuThickness, coolerHeight]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (runtime) {
      runtime.componentGroup.visible = showComponents;
      const rearIO = runtime.staticGroup.getObjectByName("motherboard-rear-io");
      if (rearIO) rearIO.visible = showComponents;
      const gpuIO = runtime.staticGroup.getObjectByName("gpu-rear-io");
      if (gpuIO) gpuIO.visible = showComponents && gpuInstalled;
      runtime.needsRender = true;
    }
  }, [showComponents, gpuInstalled]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.needsRender = true;
    const presets: Record<Props["view"], [number, number, number]> = {
      perspective: [620, 395, 615],
      side: [0, 0, 720],
      front: [700, 0, 0],
      rear: [-700, 0, 0],
      top: [0, 700, 0],
    };
    runtime.controls.enableDamping = false;
    runtime.controls.update();
    runtime.controls.enableDamping = true;
    runtime.cameraTween = { from: runtime.camera.position.clone(), to: new THREE.Vector3(...presets[view]), elapsed: 0 };
  }, [view, resetKey]);

  return (
    <div
      ref={hostRef}
      role="application"
      aria-label="Interactive 3D Lian Li B4-mATX airflow model. Drag or middle-drag to orbit the case center, scroll to zoom, and click a fan mount to select it."
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        ref={fallbackRef}
        data-webgl-fallback="true"
        style={{
          display: "none",
          position: "absolute",
          inset: 0,
          placeItems: "center",
          color: "#202724",
          background: "#fafaf8",
        }}
      >
        WebGL is unavailable in this browser.
      </div>
    </div>
  );
}
