import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { SurfaceLibrary } from "./realisticMaterials";

type XYZ = [number, number, number];
function box(g: THREE.Group, size: XYZ, position: XYZ, material: THREE.Material, radius = .15) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 2, Math.min(radius, Math.min(...size) / 3)), material);
  mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); return mesh;
}
function rounded(width: number, height: number, radius = .4) {
  const s = new THREE.Shape(), x = -width / 2, y = -height / 2;
  s.moveTo(x + radius, y); s.lineTo(-x - radius, y); s.quadraticCurveTo(-x, y, -x, y + radius);
  s.lineTo(-x, -y - radius); s.quadraticCurveTo(-x, -y, -x - radius, -y);
  s.lineTo(x + radius, -y); s.quadraticCurveTo(x, -y, x, -y - radius);
  s.lineTo(x, y + radius); s.quadraticCurveTo(x, y, x + radius, y); return s;
}
function cutout(shape: THREE.Shape, opening: THREE.Shape, x: number, y: number) {
  shape.holes.push(new THREE.Path(opening.getPoints(12).reverse().map(p => new THREE.Vector2(p.x + x, p.y + y))));
}
function extrusion(g: THREE.Group, shape: THREE.Shape, depth: number, position: XYZ, material: THREE.Material, bevel = .12) {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 12, steps: 1 });
  const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); return mesh;
}
function ring(g: THREE.Group, radius: number, tube: number, position: XYZ, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, 32), material); mesh.position.set(...position); g.add(mesh); return mesh;
}
function disk(g: THREE.Group, radius: number, depth: number, position: XYZ, material: THREE.Material, segments = 24) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, segments), material);
  mesh.rotation.x = Math.PI / 2; mesh.position.set(...position); mesh.castShadow = true; g.add(mesh); return mesh;
}
function finish(color: string, metalness = .2, emissive = false) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness: .4, emissive: emissive ? color : "#000000", emissiveIntensity: emissive ? .45 : 0 });
}
function contacts(g: THREE.Group, count: number, pitch: number, start: XYZ, size: XYZ, material: THREE.Material) {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(...size), material, count), matrix = new THREE.Matrix4();
  for (let i = 0; i < count; i++) { matrix.makeTranslation(start[0] + i * pitch, start[1], start[2]); mesh.setMatrixAt(i, matrix); } g.add(mesh);
}
function screw(g: THREE.Group, x: number, y: number, s: SurfaceLibrary, z = 1.2) {
  disk(g, 1.7, .6, [x, y, z], s.aluminum);
  box(g, [2.1, .38, .15], [x, y, z + .4], s.rubber);
  box(g, [.38, 2.1, .15], [x, y, z + .4], s.rubber);
}
function socket(g: THREE.Group, width: number, height: number, x: number, y: number, s: SurfaceLibrary, radius = .4) {
  const shell = rounded(width + 1, height + 1, radius + .3);
  cutout(shell, rounded(width, height, radius), 0, 0);
  extrusion(g, shell, 3.5, [x, y, -2.2], s.aluminum);
  box(g, [width, height, .3], [x, y, -2.3], s.rubber);
}
function usbA(g: THREE.Group, x: number, y: number, s: SurfaceLibrary, tongue: THREE.Material, gold: THREE.Material) {
  socket(g, 12, 4.5, x, y, s);
  box(g, [10.8, 1.05, 2.5], [x, y -.7, -.45], tongue);
  contacts(g, 4, 2, [x -3, y -.1, .2], [.7, .12, 1.5], gold);
  for (const dx of [-4, 4]) box(g, [1.3, .45, .8], [x + dx, y +1.9, .7], s.steel);
}
function usbC(g: THREE.Group, x: number, y: number, s: SurfaceLibrary, gold: THREE.Material) {
  socket(g, 8.3, 2.6, x, y, s, 1.2);
  box(g, [6.4, .6, 2], [x, y, -.2], s.plastic, .25);
  contacts(g, 12, .47, [x -2.585, y +.34, .25], [.22, .1, 1.1], gold);
}
function audio(g: THREE.Group, x: number, y: number, s: SurfaceLibrary, accent: THREE.Material) {
  disk(g, 2.8, .7, [x, y, .7], s.rubber);
  ring(g, 2.55, .45, [x, y, 1.25], s.aluminum);
  ring(g, 2.05, .3, [x, y, 1.3], accent);
  ring(g, 1.75, .16, [x, y, .8], s.aluminum);
}
function displayPort(g: THREE.Group, x: number, y: number, hdmi: boolean, s: SurfaceLibrary, gold: THREE.Material) {
  const outline = new THREE.Shape();
  const pts = hdmi ? [[-7,-1],[-5,-2.5],[5,-2.5],[7,-1],[7,2.5],[-7,2.5]] : [[-7,-2.5],[7,-2.5],[7,1],[5.5,2.5],[-7,2.5]];
  outline.setFromPoints(pts.map(p => new THREE.Vector2(p[0],p[1]))); outline.closePath();
  const shell = rounded(15.4, 6.3); cutout(shell, outline, 0, 0);
  extrusion(g, shell, 3.5, [x,y,-2.2], s.aluminum);
  box(g,[14,5,.2],[x,y,-2.25],s.rubber);
  box(g,[10,.7,1.7],[x,y,-.6],s.plastic);
  contacts(g, 10, .9, [x-4.05,y+.4,.1],[.35,.12,1],gold);
}
function label(g: THREE.Group, text: string, x: number, y: number, width: number, height = 2) {
  const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 40;
  const ctx = canvas.getContext("2d"); if (!ctx) return;
  ctx.font = "500 27px Arial"; ctx.fillStyle = "#a7abad"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text,128,20);
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map, transparent:true, depthWrite:false, opacity:.75 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width,height),mat); mesh.position.set(x,y,1.45); g.add(mesh);
}

/** Generic populated AM5 rear I/O, in centered chassis coordinates. */
export function addCaseDetails(group: THREE.Group, surfaces: SurfaceLibrary) {
  const rear = new THREE.Group(); rear.name = "motherboard-rear-io";
  rear.rotation.y = -Math.PI / 2; rear.position.set(-211,43.5,-57); group.add(rear);
  const gold = finish("#c7a35c", .8), blue = finish("#174965"), red = finish("#79312c");
  const shield = rounded(42,157,1);
  const hole = (x: number,y: number,w: number,h: number,r = .4) => cutout(shield, rounded(w,h,r),x,y);
  // Four shielded Type-A ports, plus a high-speed Type-A and Type-C pair.
  for (const y of [47,35]) for (const x of [-9,9]) { usbA(rear,x,y,surfaces,blue,gold); hole(x,y,13.3,5.8); }
  displayPort(rear,-9,20,false,surfaces,gold); hole(-9,20,15.8,6.7);
  displayPort(rear,9,20,true,surfaces,gold); hole(9,20,15.8,6.7);
  usbC(rear,-9,5,surfaces,gold); hole(-9,5,9.7,4,1.4);
  usbA(rear,9,5,surfaces,red,gold); hole(9,5,13.3,5.8);
  label(rear,"DP",-9,26,5); label(rear,"HDMI",9,26,8); label(rear,"USB 10G",0,-1,13);
  // RJ45 stepped key opening, visible contacts and status windows.
  const ethernet = new THREE.Shape(); ethernet.setFromPoints([[-6.2,5.7],[6.2,5.7],[6.2,-3.1],[3.4,-3.1],[3.4,-5.7],[-3.4,-5.7],[-3.4,-3.1],[-6.2,-3.1]].map(p=>new THREE.Vector2(...p as [number,number]))); ethernet.closePath();
  const cage = rounded(15.3,15, .6); cutout(cage,ethernet,0,0); extrusion(rear,cage,5,[-8,-17,-3.7],surfaces.aluminum);
  box(rear,[13,12,.3],[-8,-17,-3.8],surfaces.rubber); hole(-8,-17,15.7,15.4);
  contacts(rear,8,1.1,[-11.85,-14.8,-.2],[.38,.5,4.8],gold);
  box(rear,[2.2,1.2,1],[-13,-22.8,1],finish("#5f8d44",.1,true));
  box(rear,[2.2,1.2,1],[-3,-22.8,1],finish("#bb8c3c",.1,true));
  label(rear,"2.5G",-8,-28,8);
  usbA(rear,10,-15,surfaces,blue,gold); hole(10,-15,13.3,5.8);
  usbA(rear,10,-26,surfaces,blue,gold); hole(10,-26,13.3,5.8);
  for (const [i,color] of ["#527ea0","#62a37e","#a16c7c"].entries()) {
    const x=-12+i*12; audio(rear,x,-48,surfaces,finish(color)); hole(x,-48,6.1,6.1,3);
  }
  label(rear,"LINE  OUT  MIC",0,-56,30);
  // Threaded RP-SMA antenna connectors with hexagonal retaining nuts.
  for (const x of [-7,8]) {
    disk(rear,3.1,1.1,[x,66,1.2],gold,6); disk(rear,2.1,4,[x,66,3.1],gold);
    for(let i=0;i<5;i++) ring(rear,2.12,.17,[x,66,1.9+i*.55],gold);
    disk(rear,1.45,.2,[x,66,5.2],surfaces.rubber); disk(rear,.45,.35,[x,66,5.4],gold);
    hole(x,66,6.5,6.5,3);
  }
  label(rear,"WIFI",1,59,10);
  disk(rear,2.3,.8,[-14,59,1.1],surfaces.rubber); disk(rear,1.65,.5,[-14,59,1.6],surfaces.plastic); hole(-14,59,5,5,2.4);
  label(rear,"BIOS",-13,54,6);
  extrusion(rear,shield,.7,[0,0,-.1],surfaces.steel,.12);
  for (const x of [-18,18]) for (const y of [-74,74]) screw(rear,x,y,surfaces);
  // Rear AC extension inlet and rocker; the PSU itself lives at the front.
  const mains = new THREE.Group(); mains.name="Rear AC inlet"; mains.rotation.y=-Math.PI/2; mains.position.set(-211,111,40); group.add(mains);
  const acBracket = rounded(60, 32, 1);
  cutout(acBracket, rounded(32, 22, 1), -8, 0);
  cutout(acBracket, rounded(11, 17, 1), 17, 0);
  extrusion(mains, acBracket, .7, [8, 0, -.9], surfaces.steel);
  for (const x of [-19, 35]) for (const y of [-13, 13]) screw(mains, x, y, surfaces, .3);
  const inlet = new THREE.Shape(); inlet.setFromPoints([[-12,-8],[12,-8],[12,4],[8,8],[-8,8],[-12,4]].map(p=>new THREE.Vector2(...p as [number,number]))); inlet.closePath();
  const flange=rounded(34,24,2); cutout(flange,inlet,0,0); extrusion(mains,flange,1.5,[0,0,0],surfaces.plastic);
  box(mains,[25,17,.5],[0,0,-4],surfaces.rubber);
  const wall=rounded(26,19,1); cutout(wall,inlet,0,0); extrusion(mains,wall,5,[0,0,-4],surfaces.rubber);
  for(const [x,y] of [[-7,-2],[7,-2],[0,4]]) box(mains,[2,4,4.5],[x,y,-.9],surfaces.aluminum,.25);
  screw(mains,-15,0,surfaces,2); screw(mains,15,0,surfaces,2);
  socket(mains,10,16,25,0,surfaces,1);
  const rocker=box(mains,[9,14,2.5],[25,0,.8],surfaces.plastic,1); rocker.rotation.x=.1;
  label(mains,"I",25,4,2,2.5); ring(mains,1,.18,[25,-4,2.25],surfaces.aluminum);
  label(mains,"AC INPUT",0,-16,18);
}

/** Published B4 port selection/order; mounted on the top-front trim, facing +Y. */
export function addFrontIO(group: THREE.Group, surfaces: SurfaceLibrary) {
  const front = new THREE.Group(); front.name="Top front I/O";
  // Local x maps to chassis -Z (left-to-right when facing the front).
  front.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0,0,-1),new THREE.Vector3(-1,0,0),new THREE.Vector3(0,1,0)));
  front.position.set(193,145,0); group.add(front);
  const trim = rounded(182,34,.8);
  for (const x of [-45,-23]) cutout(trim,rounded(13.4,5.9,.7),x,0);
  cutout(trim,rounded(9.8,4.2,1.8),45,0);
  cutout(trim,rounded(6.4,6.4,3.1),23,0);
  cutout(trim,rounded(12.5,12.5,6.2),0,0);
  extrusion(front,trim,.7,[0,0,-.3],surfaces.steel,.12);
  const gold=finish("#bd9a59",.8);
  usbA(front,-45,0,surfaces,surfaces.plastic,gold);
  usbA(front,-23,0,surfaces,surfaces.plastic,gold);
  audio(front,23,0,surfaces,surfaces.steel);
  usbC(front,45,0,surfaces,gold);
  disk(front,6.1,.4,[0,0,.3],surfaces.rubber);
  ring(front,5.6,.3,[0,0,.7],surfaces.aluminum);
  disk(front,5.25,.45,[0,0,.55],surfaces.steel);
  const powerArc=new THREE.Mesh(new THREE.TorusGeometry(2.1,.16,6,28,Math.PI*1.55),surfaces.aluminum);
  powerArc.rotation.z=Math.PI*.725; powerArc.position.set(0,0,.86); front.add(powerArc);
  box(front,[.32,2.5,.12],[0,1.2,.87],surfaces.aluminum);
}

/** Pulse-style two HDMI / two DisplayPort outputs, attached to the GPU's slot row. */
export function addGpuRearIO(group: THREE.Group, surfaces: SurfaceLibrary) {
  const gpu = new THREE.Group();
  gpu.name = "gpu-rear-io";
  gpu.rotation.y = -Math.PI / 2;
  gpu.position.set(-213, -77, 13);
  const shield = rounded(113, 18, .5);
  const gold = finish("#bb995c", .8);
  for (const [i, x] of [-39, -13, 13, 39].entries()) {
    cutout(shield, rounded(16, 7, .5), x, 0);
    displayPort(gpu, x, 0, i < 2, surfaces, gold);
    label(gpu, i < 2 ? "HDMI" : "DP", x, 6, 7, 1.8);
  }
  extrusion(gpu, shield, .65, [0, 0, -.2], surfaces.steel);
  screw(gpu, -53, 0, surfaces);
  screw(gpu, 53, 0, surfaces);
  group.add(gpu);
}
