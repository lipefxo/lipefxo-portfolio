import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Config } from "./model";
import type { HardwarePart } from "./experience";
import type { SurfaceLibrary } from "./realisticMaterials";

type XYZ = [number, number, number];
function block(parent: THREE.Group, size: XYZ, position: XYZ, material: THREE.Material | THREE.Material[], radius = 0) {
  const mesh = new THREE.Mesh(radius ? new RoundedBoxGeometry(...size, 2, radius) : new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function tube(parent: THREE.Group, points: XYZ[], radius: number, material: THREE.Material) {
  const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, 24, radius, 6, false), material);
  mesh.castShadow = true;
  parent.add(mesh);
}
function repeated(parent: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material, positions: XYZ[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, positions.length);
  const transform = new THREE.Matrix4();
  positions.forEach((p, index) => { transform.makeTranslation(...p); mesh.setMatrixAt(index, transform); });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function screw(parent: THREE.Group, x: number, y: number, z: number, surfaces: SurfaceLibrary) {
  const head = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 1, 10), surfaces.aluminum);
  head.rotation.x = Math.PI / 2;
  head.position.set(x, y, z);
  parent.add(head);
  block(parent, [2, .45, .2], [x, y, z + .55], surfaces.rubber);
  block(parent, [.45, 2, .2], [x, y, z + .55], surfaces.rubber);
}

/** Mechanical axial fan, centered on the origin with its shaft along +Z. */
export function createHardwareFan(size: number, thickness: number, surfaces: SurfaceLibrary): THREE.Group {
  const fan = new THREE.Group();
  const half = size / 2;
  const corner = size * .065;
  const outline = new THREE.Shape();
  outline.moveTo(-half + corner, -half);
  outline.lineTo(half - corner, -half);
  outline.quadraticCurveTo(half, -half, half, -half + corner);
  outline.lineTo(half, half - corner);
  outline.quadraticCurveTo(half, half, half - corner, half);
  outline.lineTo(-half + corner, half);
  outline.quadraticCurveTo(-half, half, -half, half - corner);
  outline.lineTo(-half, -half + corner);
  outline.quadraticCurveTo(-half, -half, -half + corner, -half);
  const opening = new THREE.Path();
  opening.absarc(0, 0, size * .451, 0, Math.PI * 2, true);
  outline.holes.push(opening);
  const frameGeometry = new THREE.ExtrudeGeometry(outline, { depth: thickness, bevelEnabled: true, bevelSize: .65, bevelThickness: .65, bevelSegments: 2, steps: 1, curveSegments: 32 });
  frameGeometry.translate(0, 0, -thickness / 2);
  const frame = new THREE.Mesh(frameGeometry, surfaces.plastic);
  frame.name = "frame";
  frame.castShadow = true;
  frame.receiveShadow = true;
  fan.add(frame);
  for (const x of [-1, 1]) for (const y of [-1, 1]) {
    const px = x * (half - corner), py = y * (half - corner);
    block(fan, [corner * 1.4, corner * 1.4, 1.6], [px, py, thickness / 2 + .3], surfaces.rubber, 1);
    screw(fan, px, py, thickness / 2 + 1.4, surfaces);
  }
  for (let index = 0; index < 4; index++) {
    const spoke = block(fan, [size * .37, size * .025, 2], [0, 0, -thickness * .36], surfaces.plastic, .7);
    const angle = index * Math.PI / 2 + .38;
    spoke.position.x = Math.cos(angle) * size * .25;
    spoke.position.y = Math.sin(angle) * size * .25;
    spoke.rotation.z = angle;
  }
  const rotor = new THREE.Group();
  rotor.name = "rotor";
  fan.add(rotor);
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(size * .1, -size * .055);
  bladeShape.bezierCurveTo(size * .23, -size * .19, size * .37, -size * .18, size * .435, -size * .055);
  bladeShape.bezierCurveTo(size * .44, size * .012, size * .4, size * .08, size * .355, size * .09);
  bladeShape.bezierCurveTo(size * .24, size * .11, size * .22, size * .015, size * .11, size * .04);
  bladeShape.closePath();
  const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, { depth: Math.max(.6, size * .008), bevelEnabled: false, curveSegments: 10 });
  const vertices = bladeGeometry.attributes.position;
  for (let index = 0; index < vertices.count; index++) {
    const x = vertices.getX(index), y = vertices.getY(index);
    vertices.setZ(index, vertices.getZ(index) + y * .3 + Math.sin(x / size * Math.PI) * thickness * .12);
  }
  bladeGeometry.computeVertexNormals();
  for (let index = 0; index < 9; index++) {
    const blade = new THREE.Mesh(bladeGeometry, surfaces.plastic);
    blade.rotation.z = index * Math.PI * 2 / 9;
    blade.castShadow = true;
    rotor.add(blade);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(size * .118, size * .14, thickness * .55, 32), surfaces.plastic);
  hub.rotation.x = Math.PI / 2;
  rotor.add(hub);
  const cap = new THREE.Mesh(new THREE.CircleGeometry(size * .076, 24), surfaces.steel);
  cap.position.z = thickness * .28 + .1;
  rotor.add(cap);
  return fan;
}

export function addHardwareComponents(rootGroup: THREE.Group, config: Pick<Config, "gpuInstalled" | "gpuLength" | "gpuWidth" | "gpuThickness" | "coolerHeight">, surfaces: SurfaceLibrary) {
  const addPart = (partId: HardwarePart) => {
    const part = new THREE.Group();
    part.name = partId;
    part.userData.partId = partId;
    rootGroup.add(part);
    return part;
  };
  let group = addPart("motherboard");
  const { steel, plastic, aluminum, pcb, rubber, copper } = surfaces;
  // Board lies in XY. The populated face and socket project toward +Z.
  block(group, [244, 244, 2], [-55, 142, -77], [steel, steel, steel, steel, pcb, steel]);
  for (const x of [-167, -55, 57]) for (const y of [30, 142, 254]) screw(group, x, y, -75, surfaces);
  block(group, [46, 46, 5], [-92, 151, -72], steel, 2);
  block(group, [36, 36, 4], [-92, 151, -68], aluminum, 1);
  // Rear IO housing, VRM heatsinks and physically populated DIMMs.
  block(group, [22, 115, 30], [-164, 190, -60], steel, 2);
  repeated(group, new THREE.BoxGeometry(2, 111, 11), aluminum, Array.from({ length: 7 }, (_, i) => [-173 + i * 3, 190, -40]));
  block(group, [65, 17, 15], [-108, 239, -67], steel, 1);
  for (let i = 0; i < 4; i++) {
    const x = -32 + i * 13;
    block(group, [8, 104, 8], [x, 170, -71], plastic, 1);
    block(group, [2, 94, 29], [x, 170, -54], pcb);
    block(group, [5, 87, 18], [x, 170, -48], steel, .7);
    block(group, [5.5, 89, 2], [x, 170, -38], aluminum, .6);
    for (const y of [116, 224]) block(group, [9, 6, 10], [x, y, -66], plastic, 1);
  }
  for (let i = 0; i < 7; i++) {
    block(group, [9, 11, 7], [-136 + i * 13, 219, -71], aluminum, .5);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 6, 10), aluminum);
    cap.rotation.x = Math.PI / 2; cap.position.set(-135 + i * 13, 205, -71); group.add(cap);
  }
  block(group, [130, 8, 8], [-92, 81, -71], plastic, .7);
  block(group, [76, 17, 4], [-8, 102, -72], steel, 1);
  block(group, [27, 35, 9], [35, 61, -70], aluminum, 1);
  for (let i = 0; i < 5; i++) block(group, [19, 7, 9], [53, 44 + i * 10, -69], plastic, .6);
  block(group, [11, 46, 13], [59, 186, -69], plastic, .6);

  group = addPart("cooler");
  // Open tower: individual thin aluminum plates with visible air channels.
  const depth = config.coolerHeight;
  const stackStart = -56;
  const stackEnd = -69.5 + depth - 3;
  const count = Math.max(6, Math.floor((stackEnd - stackStart) / 2.8));
  repeated(group, new THREE.BoxGeometry(88, 108, .55), aluminum,
    Array.from({ length: count }, (_, i) => [-87, 151, stackStart + i * (stackEnd - stackStart) / (count - 1)]));
  for (let i = 0; i < 4; i++) {
    const x = -115 + i * 18;
    tube(group, [[x, 137, stackEnd + 1], [x, 137, -54], [x, 146, -64], [x, 165, -64], [x, 176, -54], [x, 176, stackEnd + 1]], 2.3, copper);
  }
  block(group, [91, 110, 1.5], [-87, 151, stackEnd + 1.7], steel, .6);
  for (let i = 0; i < 4; i++) for (const y of [137, 176]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 2.5, 12), aluminum);
    cap.rotation.x = Math.PI / 2;
    cap.position.set(-115 + i * 18, y, stackEnd + 3.2);
    group.add(cap);
  }
  for (const x of [-125, -49]) for (const y of [106, 196]) screw(group, x, y, stackEnd + 3, surfaces);
  const fanSize = Math.max(36, Math.min(106, depth - 14));
  const coolerFan = createHardwareFan(fanSize, 18, surfaces);
  coolerFan.userData.coolingFan = "cpu"; coolerFan.userData.fanSize = fanSize;
  coolerFan.rotation.y = Math.PI / 2;
  coolerFan.position.set(-34, 151, (-69.5 + depth - 56) / 2);
  group.add(coolerFan);
  for (const y of [112, 190]) tube(group, [[-39, y, stackEnd - 8], [-24, y, stackEnd - 8], [-24, y, stackStart + 8], [-43, y, stackStart + 8]], .65, aluminum);

  group = addPart("psu");
  // SFX enclosure with recessed fan, wire grille, modular sockets and sleeved leads.
  block(group, [100, 63.5, 125], [153, 237, -24], [steel, steel, steel, steel, surfaces.psuLabel, steel], 1.8);
  const psuFan = createHardwareFan(52, 6, surfaces);
  psuFan.rotation.y = Math.PI / 2; psuFan.position.set(204, 237, -24); group.add(psuFan);
  for (let radius = 6; radius < 26; radius += 4) {
    const grille = new THREE.Mesh(new THREE.TorusGeometry(radius, .65, 5, 40), steel);
    grille.rotation.y = Math.PI / 2; grille.position.set(209, 237, -24); group.add(grille);
  }
  for (let i = 0; i < 3; i++) {
    block(group, [3, 13, 20], [101, 225 + i * 14, -48], rubber, 1);
    for (let j = 0; j < 4; j++) tube(group, [[99, 222 + i * 14, -55 + j * 4], [85 - i * 2, 214, -55 + j * 4], [76, 192, -67 + j * 2], [66, 187 - i * 4, -65 + j * 2]], 1.35, rubber);
  }
  for (let i = 0; i < 4; i++) tube(group, [[99, 222, -35 + i * 3], [84, 204, -31 + i * 3], [77, 139, -43 + i * 3], [60, 102, -57 + i * 3]], 1.4, rubber);

  if (!config.gpuInstalled) return;
  group = addPart("gpu");
  const { gpuLength: length, gpuThickness: thickness, gpuWidth: width } = config;
  const center = -190 + length / 2;
  const top = 81, bottom = top - thickness;
  block(group, [length, 2, width], [center, top - 1, 13], [steel, steel, surfaces.gpuBackplate, steel, steel, steel], .6);
  block(group, [length - 9, 1.6, width - 13], [center, top - 5, 13], pcb);
  const finHeight = Math.max(4, thickness - 17);
  const finCount = Math.floor((length - 16) / 3.4);
  repeated(group, new THREE.BoxGeometry(.55, finHeight, width - 16), aluminum,
    Array.from({ length: finCount }, (_, i) => [-181 + i * (length - 18) / (finCount - 1), bottom + 9 + finHeight / 2, 13]));
  for (const z of [-1, 1]) {
    block(group, [length - 4, 9, 5], [center, bottom + 5, 13 + z * (width / 2 - 3)], plastic, 1.5);
    block(group, [length * .62, 2, 1], [center, bottom + 9, 13 + z * (width / 2 - .4)], aluminum, .3);
  }
  for (const x of [-188, -192 + length]) block(group, [4, thickness - 3, width - 2], [x, bottom + thickness / 2, 13], steel, .8);
  const fanCount = length < 220 ? 2 : 3;
  const size = Math.min(width - 12, (length - 14) / fanCount - 5, 86);
  for (let i = 0; i < fanCount; i++) {
    const fan = createHardwareFan(size, 7, surfaces);
    fan.userData.coolingFan = "gpu"; fan.userData.fanSize = size;
    fan.rotation.x = Math.PI / 2;
    fan.position.set(-190 + length * (i + .5) / fanCount, bottom + 4, 13);
    group.add(fan);
  }
  // Slot bracket at the rear, and power connector along the exposed outer edge.
  block(group, [2, thickness + 9, 112], [-191, top - thickness / 2, 8], aluminum, .5);
  for (let i = 0; i < 3; i++) block(group, [2.5, 8, 17], [-192.5, top - 14, -28 + i * 30], rubber, .6);
  block(group, [25, 10, 10], [center + length * .22, top - 7, 13 + width / 2], plastic, .8);
  for (let i = 0; i < 4; i++) tube(group, [[center + length * .22 - 9 + i * 5, top - 7, 19 + width / 2], [center + length * .22 - 9 + i * 5, top + 12, 24 + width / 2], [78 + i * 3, 115, 43], [91 + i * 3, 207, -16]], 1.5, rubber);
}
