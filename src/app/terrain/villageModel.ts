import * as THREE from "three";
// @ts-expect-error Node test runner requires an explicit TypeScript extension.
import { applyBoxUVScale, type createRealisticMaterials } from "./realisticMaterials.ts";

export type VillageLayout = "a" | "c";
export const HOUSE_CENTERS = [55, 88, 121, 154] as const;

export function getVillageFootprints(layout: VillageLayout) {
  return [
    ...HOUSE_CENTERS.map((x, i) => ({ name: `house-H${i + 1}`, x, z: layout === "a" ? 40 : 38, width: layout === "a" ? 17 : 6, depth: layout === "a" ? 6 : 17 })),
    { name: "social-pavilion", x: 106, z: 72, width: 18, depth: 8 },
    { name: "pool", x: 121, z: 76, width: 3, depth: 7 },
  ];
}

// Conservative bounds include roof overhangs and the full veranda, rotated with each home.
export function getVillageBuildingEnvelopes(layout: VillageLayout) {
  return HOUSE_CENTERS.map((x, i) => ({
    name: `house-H${i + 1}`,
    x: x + (layout === "c" ? 0.85 : 0), z: layout === "a" ? 40.85 : 38,
    width: layout === "a" ? 18 : 8.9, depth: layout === "a" ? 8.9 : 18,
  }));
}

export function getVillageParking(layout: VillageLayout) {
  return HOUSE_CENTERS.map((x, i) => ({
    name: `parking-H${i + 1}`, x: x - (layout === "c" ? 8.2 : 0), z: 28.6, width: 6.3, depth: 6.4,
  }));
}

export function getVillageVehicles(layout: VillageLayout) {
  return [
    ...getVillageParking(layout).flatMap((bay, i) => [-1.5, 1.5].map((offset, j) => ({
      name: `car-H${i + 1}-${j + 1}`, bay: bay.name, x: bay.x + offset, z: 28.5, width: 2, depth: 4.3, paint: i + j,
    }))),
    ...Array.from({ length: 4 }, (_, i) => ({
      name: `visitor-car-${i + 1}`, bay: "visitor-parking", x: 168.5 + i * 2.8, z: 15, width: 2, depth: 4.3, paint: i,
    })),
  ];
}

// Metres in the survey's road-aligned frame. These are concept massings, not a building plan.
export function createVillage(layout: VillageLayout, real: ReturnType<typeof createRealisticMaterials>): THREE.Group {
  const root = new THREE.Group();
  root.name = `village-${layout}`;
  let seed = layout === "a" ? 4321 : 8765;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const texture = (kind: "brick" | "stone" | "solar" | "water") => {
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = kind === "brick" ? "#b48d69" : kind === "stone" ? "#c5c1b2" : kind === "solar" ? "#14283d" : "#8080ff";
    ctx.fillRect(0, 0, 256, 256);
    if (kind === "brick" || kind === "stone") {
      const h = kind === "brick" ? 24 : 64;
      const w = kind === "brick" ? 64 : 64;
      for (let row = 0; row < 256 / h; row++) for (let col = -1; col < 5; col++) {
        const x = col * w + (row % 2) * w / 2;
        const shade = Math.floor(random() * 15);
        ctx.fillStyle = kind === "brick" ? `rgb(${179 + shade},${141 + shade},${106 + shade})` : `rgb(${184 + shade},${180 + shade},${165 + shade})`;
        ctx.fillRect(x + 1, row * h + 1, w - 2, h - 2);
      }
      for (let i = 0; i < 6000; i++) { ctx.fillStyle = `rgba(62,49,29,${random() * 0.1})`; ctx.fillRect(random() * 256, random() * 256, 1, 1); }
    } else if (kind === "solar") {
      ctx.strokeStyle = "#80949c"; ctx.lineWidth = 1;
      for (let i = 0; i <= 256; i += 32) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke(); }
      for (let i = 0; i <= 256; i += 64) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke(); }
      ctx.strokeStyle = "#b6c0c1"; ctx.lineWidth = 5; ctx.strokeRect(0, 0, 256, 256);
    } else {
      for (let i = 0; i < 60; i++) { ctx.strokeStyle = `rgba(${110 + Math.floor(random() * 30)},${110 + Math.floor(random() * 30)},255,.35)`; ctx.beginPath(); ctx.ellipse(random() * 256, random() * 256, 8 + random() * 36, 2 + random() * 5, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
    const map = new THREE.CanvasTexture(canvas); map.wrapS = map.wrapT = THREE.RepeatWrapping;
    if (kind !== "water") map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    if (kind === "brick") map.repeat.set(4, 1);
    if (kind === "stone") map.repeat.set(8, 3);
    if (kind === "water") map.repeat.set(3, 5);
    return map;
  };
  const mat = (color: THREE.ColorRepresentation, roughness = 0.8) => new THREE.MeshStandardMaterial({ color, roughness });
  const { brick, paving, roof, timber, glass } = real;
  const trim = mat("#dbd6c5"), metal = mat("#373c36", 0.5);
  const mapped = new Set<THREE.Material>([brick, paving, roof, timber, real.road]);
  const solar = new THREE.MeshStandardMaterial({ map: texture("solar"), metalness: 0.4, roughness: 0.26 });
  const green = mat("#526b3b"), leaf = mat("#536c38"), bark = mat("#6d5940"), soil = mat("#625a3d"), fabric = mat("#ede5cd");
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const box = (parent: THREE.Object3D, material: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number) => {
    const mesh = new THREE.Mesh(cube, material); mesh.position.set(x, y, z); mesh.scale.set(w, h, d); if (mapped.has(material)) applyBoxUVScale(mesh); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  const slab = (x: number, z: number, w: number, d: number, parent: THREE.Object3D = root, y = 0.07) => box(parent, parent.name.startsWith("parking") ? real.road : paving, x, y, z, w, 0.14, d);
  const group = (name: string, parent: THREE.Object3D = root) => { const g = new THREE.Group(); g.name = name; parent.add(g); return g; };
  const bench = (parent: THREE.Object3D, x: number, z: number, angle = 0) => {
    const b = group("bench", parent); b.position.set(x, 0, z); b.rotation.y = angle;
    box(b, timber, 0, 0.52, 0, 1.8, 0.12, 0.55);
    box(b, timber, 0, 0.86, -0.23, 1.8, 0.48, 0.08);
    for (const dx of [-0.65, 0.65]) box(b, metal, dx, 0.25, 0, 0.08, 0.5, 0.45);
  };
  const panels = (parent: THREE.Object3D, name: string, x: number, y: number, z: number, cols: number, rows: number) => {
    const g = group(name, parent); g.position.set(x, y, z);
    for (let col = 0; col < cols; col++) for (let row = 0; row < rows; row++) {
      const panel = box(g, solar, (col - (cols - 1) / 2) * 1.15, row * 0.1, (row - (rows - 1) / 2) * 1.85, 1.08, 0.08, 1.76); panel.rotation.x = -0.12;
    }
    return g;
  };
  const carPaint = [mat("#dadbd5", 0.28), mat("#3b494c", 0.27), mat("#acac9f", 0.33)];
  const tires = mat("#242726");
  const car = (parent: THREE.Object3D, x: number, z: number, index: number) => {
    const g = group("car", parent); g.position.set(x, 0.15, z);
    box(g, carPaint[index % 3], 0, 0.55, 0, 1.8, 0.65, 4.2);
    box(g, glass, 0, 1.08, 0.15, 1.55, 0.56, 2.3);
    box(g, carPaint[index % 3], 0, 1.39, 0.15, 1.56, 0.1, 1.65);
    for (const side of [-1, 1]) for (const end of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.2, 10), tires); wheel.rotation.z = Math.PI / 2; wheel.position.set(side * 0.88, 0.36, end * 1.35); g.add(wheel);
    }
    box(g, trim, 0, 0.65, -2.11, 1.55, 0.16, 0.035);
  };
  const promenadeZ = layout === "a" ? 49 : 52;
  const access = group("parking-and-access");
  slab(115, 23, 146, 5.5, access); slab(185, 12, 5.5, 24, access);
  const residentBays = getVillageParking(layout);
  const vehicles = getVillageVehicles(layout);
  // Leave the curb open at every driveway so the bays connect directly to the lane.
  box(access, trim, 104.5, 0.16, 20.15, 121, 0.18, 0.18);
  let curbStart = 42;
  for (const bay of residentBays) {
    const bayStart = bay.x - bay.width / 2;
    if (bayStart > curbStart) box(access, trim, (curbStart + bayStart) / 2, 0.16, 25.85, bayStart - curbStart, 0.18, 0.18);
    curbStart = bay.x + bay.width / 2;
  }
  box(access, trim, (curbStart + 182) / 2, 0.16, 25.85, 182 - curbStart, 0.18, 0.18);
  slab(173, 15.25, 12, 10, access);
  vehicles.filter(vehicle => vehicle.bay === "visitor-parking").forEach((vehicle, i) => {
    car(access, vehicle.x, vehicle.z, vehicle.paint);
    box(access, trim, 167.1 + i * 2.8, 0.16, 15, 0.08, 0.025, 5.5);
  });
  slab(108, promenadeZ, 139, 3.4);
  slab(106, (promenadeZ + 69) / 2, 3.2, 69 - promenadeZ);
  panels(root, "shared-solar", 55, 1.25, 13, 12, 3);
  for (const x of [49, 55, 61]) box(root, metal, x, 0.55, 13, 0.12, 1.1, 5.2);

  HOUSE_CENTERS.forEach((x, i) => {
    const id = `H${i + 1}`;
    const g = group(`house-${id}`); g.position.set(x, 0, layout === "a" ? 40 : 38);
    // A uses the long elevation toward the village; C turns the pavilion toward its own side garden.
    if (layout === "c") g.rotation.y = Math.PI / 2;
    g.userData = { bedrooms: 3, floorArea: 102, width: 17, depth: 6, material: "tijolo ecológico" };
    slab(0, 0.2, 17.5, 7, g, 0.17);
    box(g, brick, 0, 1.7, -2.86, 17, 3.1, 0.28);
    for (const side of [-1, 1]) {
      if (layout === "c" && side === -1) {
        // Garden Comb's promenade entrance is an actual opening in its short end wall.
        for (const dz of [-1.9, 1.9]) box(g, brick, -8.36, 1.7, dz, 0.28, 3.1, 2.2);
        box(g, brick, -8.36, 3.02, 0, 0.28, 0.46, 1.6);
        box(g, glass, -8.38, 1.46, 0, 0.06, 2.58, 1.55);
        for (const dz of [-0.79, 0.79]) box(g, timber, -8.42, 1.48, dz, 0.13, 2.62, 0.08);
        box(g, metal, -8.47, 1.38, 0.54, 0.08, 0.45, 0.045);
      } else box(g, brick, side * 8.36, 1.7, 0, 0.28, 3.1, 6);
    }
    // Full-height openings articulate three bedroom bays plus a living room bay.
    for (const dx of [-7.6, -3.9, 0, 3.9, 7.6]) box(g, brick, dx, 1.7, 2.86, 0.7, 3.1, 0.28);
    for (const dx of [-5.75, -1.95, 1.95, 5.75]) {
      box(g, glass, dx, 1.68, 2.85, 3.05, 2.9, 0.06);
      for (const side of [-1, 0, 1]) box(g, timber, dx + side * 1.48, 1.7, 2.91, 0.06, 3, 0.11);
      box(g, trim, dx, 0.3, 2.92, 3.05, 0.1, 0.12);
    }
    slab(0, 4.1, 17.6, 2.3, g, 0.17);
    box(g, roof, 0, 3.45, 0.5, 18, 0.2, 7.9);
    box(g, trim, 0, 3.56, -3.45, 18, 0.18, 0.13);
    for (const dx of [-8.35, 0, 8.35]) box(g, timber, dx, 1.8, 4.27, 0.13, 3.3, 0.13);
    // Slender veranda canopy leaves the solar roof legible from above.
    box(g, roof, 0, 3.44, 4, 18, 0.12, 1.9);
    panels(g, `rooftop-solar-${id}`, 0, 3.77, -0.3, 10, 2);
    bench(g, -4, 4.1);
    box(g, fabric, 4.8, 0.55, 4.12, 1.65, 0.4, 0.7);
    box(g, timber, 2.8, 0.4, 4.12, 0.8, 0.12, 0.65);
    const bay = residentBays[i];
    const parking = group(bay.name); slab(bay.x, bay.z, bay.width, bay.depth, parking);
    vehicles.filter(vehicle => vehicle.bay === bay.name).forEach(vehicle => car(parking, vehicle.x, vehicle.z, vehicle.paint));
    box(parking, trim, bay.x, 0.16, bay.z, 0.08, 0.025, bay.depth - 0.5);
    if (layout === "a") {
      slab(x, 46.15, 2.3, 5.7);
      slab(x + 10.5, 37.2, 1.4, 16.5);
      slab(x + 6.3, 30.5, 8.4, 1.4);
      for (const side of [-1, 1]) { box(root, brick, x + side * 13, 0.43, 39, 0.32, 0.75, 15); box(root, green, x + side * 13, 0.95, 39, 0.85, 0.7, 15); }
    } else {
      slab(x, 49.2, 2.1, 5.6);
      slab(x + 6, 40, 2.8, 24);
      // Follow the rear garden edge, then turn toward the short-end entrance.
      slab(x - 6.5, 32.3, 4.8, 1.4);
      slab(x - 4.8, 40.4, 1.4, 17.6);
      slab(x - 2.4, 48.5, 6.2, 1.4);
      for (const side of [-1, 1]) { box(root, brick, x + side * 13, 0.4, 38, 0.3, 0.7, 21); box(root, green, x + side * 13, 0.95, 38, 0.9, 0.8, 21); }
      slab(x + 9, 43, 5.6, 4.6); bench(root, x + 9, 43);
    }
  });

  const social = group("social-pavilion"); social.position.set(106, 0, 72);
  social.userData = { use: "Meetings and parties", floorArea: 144 };
  slab(0, 1.7, 23, 15, social);
  box(social, brick, 0, 1.85, -3.87, 18, 3.4, 0.26);
  for (const dx of [-8.85, 8.85]) box(social, brick, dx, 1.85, -0.5, 0.3, 3.4, 7);
  box(social, glass, 0, 1.9, 3.8, 17.5, 3.1, 0.08);
  for (const dx of [-8.5, -4.25, 0, 4.25, 8.5]) box(social, timber, dx, 1.9, 3.86, 0.12, 3.4, 0.12);
  box(social, roof, 0, 3.65, 0.7, 19.7, 0.22, 10.2);
  for (const dx of [-8.8, 0, 8.8]) box(social, timber, dx, 1.9, 5.3, 0.14, 3.6, 0.14);
  for (const dx of [-5, 3]) {
    box(social, timber, dx, 0.85, 6.6, 2.5, 0.12, 1.1);
    for (const side of [-1, 1]) { box(social, timber, dx + side * 0.85, 0.4, 6.6, 0.1, 0.8, 0.6); box(social, fabric, dx, 0.45, 6.6 + side * 1.1, 2.4, 0.25, 0.65); }
  }
  const pool = group("pool"); pool.position.set(121, 0, 76); pool.userData = { waterWidth: 3, waterLength: 7 };
  slab(0, 0, 8, 11, pool);
  box(pool, mat("#4b9796"), 0, 0.14, 0, 3.1, 0.2, 7.1);
  const water = new THREE.MeshPhysicalMaterial({ color: "#3aafb3", metalness: 0.12, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.12, normalMap: texture("water"), normalScale: new THREE.Vector2(0.14, 0.14) });
  box(pool, water, 0, 0.29, 0, 3, 0.04, 7);
  for (const side of [-1, 1]) { box(pool, trim, side * 1.72, 0.27, 0, 0.42, 0.22, 7.8); box(pool, trim, 0, 0.27, side * 3.72, 3.9, 0.22, 0.44); }
  for (const z of [-2, 1]) { box(pool, timber, 2.95, 0.48, z, 0.9, 0.15, 2); box(pool, fabric, 2.95, 0.6, z, 0.82, 0.12, 1.9); const back = box(pool, fabric, 2.95, 0.82, z - 0.75, 0.82, 0.12, 0.6); back.rotation.x = 0.5; }

  // Deterministic, instanced clustered crowns: soft organic silhouettes without one draw call per leaf.
  const treeSpots: {x:number;z:number;r:number;kind:number}[] = [];
  const addTree = (x: number, z: number, r: number, kind = 0) => treeSpots.push({x,z,r,kind});
  for (let i = 0; i < 22; i++) { const x = 22 + i * 8.1; if ((x > 40 && x < 70) || (x > 161 && x < 191)) continue; addTree(x, 6 + random() * 3, 2.1 + random() * 1.1, i % 7 === 0 ? 1 : 0); }
  for (let i = 0; i < 20; i++) addTree(41 + i * 8.5, 91 + random() * 3, 2.8 + random() * 1.8, i % 8 === 0 ? 2 : 0);
  for (let i = 0; i < 10; i++) { const z = 15 + i * 8; addTree(16 + z * 0.33, z, 2.7 + random(), i % 4 === 0 ? 1 : 0); addTree(190 + z * 0.3, z, 2.8 + random()); }
  for (const x of [44, 73, 104, 137, 168]) addTree(x, promenadeZ + 5.8, 2.1, x % 2 === 0 ? 1 : 2);
  for (const [x,z,kind] of [[78,72,1],[85,84,2],[137,82,1],[152,73,0],[175,82,0],[59,76,0],[184,61,2],[191,39,0],[95,10,0],[123,10,0],[143,11,1]]) addTree(x,z,3.2,kind);
  for (const [x, z] of [[43,65],[63,63],[70,86],[91,88],[145,63],[160,87],[180,70],[203,80],[201,60],[194,48],[180,35],[82,14],[111,14],[154,13],[152,84]]) addTree(x + random() * 2, z + random() * 2, 2.4 + random() * 0.8);
  if (layout === "c") for (const x of HOUSE_CENTERS) addTree(x - 8, 40, 1.8);
  const trunkGeometry = new THREE.CylinderGeometry(0.14, 0.25, 1, 7);
  const trunkMesh = new THREE.InstancedMesh(trunkGeometry, bark, treeSpots.length);
  const crownGeometry = new THREE.IcosahedronGeometry(1, 1);
  const positions = crownGeometry.getAttribute("position");
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const distortion = 0.83 + 0.25 * Math.sin(x * 19 + z * 13) * Math.cos(y * 21 - x * 9);
    positions.setXYZ(i, x * distortion, y * distortion, z * distortion);
  }
  crownGeometry.computeVertexNormals();
  const leavesCanvas = document.createElement("canvas"); leavesCanvas.width = leavesCanvas.height = 128;
  const leavesContext = leavesCanvas.getContext("2d")!;
  for (let i = 0; i < 370; i++) {
    const shade = 180 + Math.floor(random() * 75); leavesContext.fillStyle = `rgb(${shade},${shade},${shade})`;
    leavesContext.beginPath(); leavesContext.ellipse(random() * 128, random() * 128, 3 + random() * 6, 1.7 + random() * 3, random() * Math.PI, 0, Math.PI * 2); leavesContext.fill();
  }
  const leavesTexture = new THREE.CanvasTexture(leavesCanvas); leavesTexture.colorSpace = THREE.SRGBColorSpace;
  const crownMats = [leaf, mat("#d4aa39"), mat("#b47cab")];
  crownMats.forEach(material => { material.map = leavesTexture; material.alphaTest = 0.4; material.side = THREE.DoubleSide; });
  const clusters: THREE.Matrix4[][] = [[],[],[]];
  const transform = new THREE.Object3D();
  treeSpots.forEach((t,index) => {
    const height = t.r * 1.25;
    transform.position.set(t.x, height / 2, t.z); transform.scale.set(1, height, 1); transform.rotation.set(0, random(), 0); transform.updateMatrix(); trunkMesh.setMatrixAt(index, transform.matrix);
    for (let j = 0; j < 42; j++) {
      const angle = j * 2.39996; const spread = Math.sqrt(j / 42) * t.r * 0.9;
      transform.position.set(t.x + Math.cos(angle) * spread, height + t.r * (0.15 + 0.85 * Math.sqrt(1 - j / 44)) + random() * t.r * 0.3, t.z + Math.sin(angle) * spread);
      const size = t.r * (0.21 + random() * 0.17); transform.scale.set(size, size * (0.7 + random() * 0.5), size); transform.rotation.set(random(), random(), random()); transform.updateMatrix(); clusters[t.kind].push(transform.matrix.clone());
    }
    box(root, soil, t.x, 0.025, t.z, 0.8, 0.025, 0.8);
  });
  trunkMesh.castShadow = true; root.add(trunkMesh);
  clusters.forEach((matrices,index) => {
    const mesh = new THREE.InstancedMesh(crownGeometry, crownMats[index], matrices.length); mesh.name = ["native-trees","yellow-ipes","purple-ipes"][index]; matrices.forEach((matrix,i) => { mesh.setMatrixAt(i,matrix); mesh.setColorAt(i, new THREE.Color().setHSL(0.08 + random() * 0.1, 0.12 + random() * 0.1, 0.67 + random() * 0.3)); }); mesh.castShadow = mesh.receiveShadow = true; root.add(mesh);
  });
  // Low planting beds and repeated bollards give the shared promenade a finished landscape edge.
  for (let x = 40; x < 176; x += 6) {
    if (Math.abs(x - 106) < 4) continue;
    box(root, green, x, 0.32, promenadeZ + 2.25, 3.4, 0.48, 0.9);
    box(root, metal, x + 2, 0.5, promenadeZ + 2, 0.14, 1, 0.14);
    box(root, fabric, x + 2, 0.91, promenadeZ + 2, 0.16, 0.12, 0.16);
  }
  for (const x of [69, 135, 160]) bench(root, x, promenadeZ + 3.2, Math.PI);
  return root;
}
