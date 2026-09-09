import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { createRealisticMaterials } from "./realisticMaterials";
import { DEFAULT_SOLAR_SETTINGS, getSolarPosition, type SolarSettings } from "./solarPosition";
import { LOT, pointVector } from "./terrainModel";
import { installVillageLighting } from "./villageLighting";
import { lightingLevelForSun } from "./nightLighting";
import { createVillage, type VillageLayout } from "./villageModel";

export type TerrainView = "perspective" | "top";
export type TerrainScene = {
  dispose(): void;
  setView(view: TerrainView): void;
  setLayout(layout: VillageLayout): void;
  reset(): void;
  setSun(settings: SolarSettings): void;
};

function disposeTree(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    const entries = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of entries) if (material) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
    if (object instanceof THREE.InstancedMesh) object.dispose();
  });
  textures.forEach(texture => texture.dispose());
  materials.forEach(material => material.dispose());
  geometries.forEach(geometry => geometry.dispose());
}

/** Full survey lot with metre-based concept geometry. Elevations remain assumed flat. */
export function createTerrainScene(container: HTMLElement): TerrainScene {
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#e8e9e0");
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute("aria-label", "Rotatable 3D village on lot 75. Drag to orbit, scroll to zoom, right-drag to pan.");
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.tabIndex = 0;
  container.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(42, 1, .5, 6000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .1;
  controls.minDistance = 18; controls.maxDistance = 750;
  controls.maxPolarAngle = Math.PI * .475;
  controls.zoomToCursor = true;
  controls.listenToKeyEvents(renderer.domElement);

  let disposed = false, frame = 0, desiredView: TerrainView = "perspective";
  const real = createRealisticMaterials(requestRender);
  const sky = new Sky(); sky.scale.setScalar(2500); scene.add(sky);
  const uniforms = sky.material.uniforms;
  uniforms.turbidity.value = 3.2; uniforms.rayleigh.value = 1.7;
  uniforms.mieCoefficient.value = .005; uniforms.mieDirectionalG.value = .8;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const skyEnvironment = new THREE.Scene(); skyEnvironment.add(sky.clone());
  let environment: THREE.WebGLRenderTarget | null = null;
  let solarElevation = 29;
  let lighting: { a: ReturnType<typeof installVillageLighting>; c: ReturnType<typeof installVillageLighting> } | null = null;
  let environmentTimer: ReturnType<typeof setTimeout> | undefined;
  const hemisphere = new THREE.HemisphereLight("#e4eeff", "#716b48", .5); scene.add(hemisphere);
  const sun = new THREE.DirectionalLight("#fff0d5", 2.3);
  sun.target.position.copy(LOT.reduce((sum, p) => sum.add(pointVector(p)), new THREE.Vector3()).multiplyScalar(.25));
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -155, right: 155, top: 140, bottom: -140, near: 1, far: 850 });
  sun.shadow.bias = -.00012; sun.shadow.normalBias = .055;
  scene.add(sun, sun.target);
  function updateEnvironment() {
    if (disposed || solarElevation < 2) return;
    // Direct light supplies the sun. Excluding its HDR disk prevents half-float
    // overflow in the environment convolution and double-counted illumination.
    uniforms.showSunDisc.value = 0;
    const next = pmrem.fromScene(skyEnvironment, .025, 1, 6000);
    uniforms.showSunDisc.value = 1;
    scene.environment = next.texture; environment?.dispose(); environment = next; requestRender();
  }
  function setSun(settings: SolarSettings) {
    const position = getSolarPosition(settings);
    solarElevation = position.elevation;
    const nightLevel = lightingLevelForSun(solarElevation);
    lighting?.a.setLevel(nightLevel); lighting?.c.setLevel(nightLevel);
    const direction = new THREE.Vector3(position.direction.x, position.direction.y, position.direction.z);
    sun.position.copy(sun.target.position).addScaledVector(direction, 400);
    const daylight = THREE.MathUtils.smoothstep(position.elevation, -8, 5);
    sun.intensity = position.elevation > 0 ? 2.7 * Math.pow(Math.max(0, Math.sin(position.elevation * Math.PI / 180)), .32) : 0;
    sun.color.set("#ffb56d").lerp(new THREE.Color("#fff4e1"), THREE.MathUtils.smoothstep(position.elevation, 0, 35));
    hemisphere.intensity = .22 + daylight * .55;
    hemisphere.color.set("#7686b1").lerp(new THREE.Color("#dceaff"), daylight);
    scene.environmentIntensity = .004 + daylight * .045;
    uniforms.sunPosition.value.copy(direction);
    renderer.toneMappingExposure = .85;
    clearTimeout(environmentTimer); environmentTimer = setTimeout(updateEnvironment, 180);
    requestRender();
  }
  setSun(DEFAULT_SOLAR_SETTINGS);

  const shape = new THREE.Shape(LOT.map(p => new THREE.Vector2(p.x, -p.z)));
  const land = new THREE.Mesh(new THREE.ShapeGeometry(shape), real.ground);
  land.rotation.x = -Math.PI / 2; land.receiveShadow = true; land.name = "survey-lot"; scene.add(land);
  const boundary = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(LOT.map(p => pointVector(p, .07))), new THREE.LineBasicMaterial({ color: "#89927c" })); scene.add(boundary);
  const baseGeometry = new THREE.PlaneGeometry(2200, 2200);
  const baseUV = baseGeometry.getAttribute("uv"), basePositions = baseGeometry.getAttribute("position");
  for (let i = 0; i < baseUV.count; i++) baseUV.setXY(i, basePositions.getX(i), basePositions.getY(i));
  const base = new THREE.Mesh(baseGeometry, real.ground);
  base.rotation.x = -Math.PI / 2; base.position.y = -.15; base.receiveShadow = true; scene.add(base);

  const origin = pointVector(LOT[0]);
  const angle = Math.atan2(LOT[1].z - LOT[0].z, LOT[1].x - LOT[0].x);
  const villageRoot = new THREE.Group(); villageRoot.position.copy(origin); villageRoot.rotation.y = -angle; scene.add(villageRoot);
  let activeLayout: VillageLayout = "a";
  const villages = { a: createVillage("a", real), c: createVillage("c", real) };
  lighting = { a: installVillageLighting(villages.a, "a"), c: installVillageLighting(villages.c, "c") };
  lighting.a.setLevel(lightingLevelForSun(solarElevation));
  lighting.c.setLevel(lightingLevelForSun(solarElevation));
  villages.c.visible = false; villageRoot.add(villages.a, villages.c);
  const roadMaterial = new THREE.MeshStandardMaterial({ color: "#94958d", roughness: .98 });
  function road(a: THREE.Vector3, b: THREE.Vector3) {
    const length = a.distanceTo(b);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(length, .06, 6), roadMaterial);
    mesh.position.copy(a).lerp(b, .5); mesh.position.y = -.025;
    mesh.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); mesh.receiveShadow = true; scene.add(mesh);
  }
  const topA = origin.clone().add(new THREE.Vector3(Math.sin(angle) * 4, 0, -Math.cos(angle) * 4));
  const topB = pointVector(LOT[1]).add(new THREE.Vector3(Math.sin(angle) * 4, 0, -Math.cos(angle) * 4));
  road(topA, topB);
  const rightA = pointVector(LOT[1]).add(new THREE.Vector3(4, 0, 0));
  const rightB = pointVector(LOT[2]).add(new THREE.Vector3(4, 0, 0)); road(rightA, rightB);

  function requestRender() { if (!disposed && !frame) frame = requestAnimationFrame(render); }
  function render() {
    frame = 0; if (disposed) return;
    const moving = controls.update(); renderer.render(scene, camera);
    if (moving) requestRender();
  }
  controls.addEventListener("change", requestRender);
  const target = LOT.reduce((sum, p) => sum.add(pointVector(p)), new THREE.Vector3()).multiplyScalar(.25);
  function fit(view: TerrainView) {
    const direction = view === "top" ? new THREE.Vector3(0, 1, .001) : new THREE.Vector3(.17, .85, 1).normalize();
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
    const up = new THREE.Vector3().crossVectors(direction, right).normalize();
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const tanH = tanV * camera.aspect;
    let distance = 0;
    for (const p of LOT) {
      const relative = pointVector(p).sub(target);
      distance = Math.max(distance, Math.abs(relative.dot(right)) / tanH + relative.dot(direction), Math.abs(relative.dot(up)) / tanV + relative.dot(direction));
    }
    camera.position.copy(target).addScaledVector(direction, distance * 1.14 + 12);
    controls.target.copy(target); controls.update(); requestRender();
  }
  const resize = () => {
    const { width, height } = container.getBoundingClientRect(); if (!width || !height) return;
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); fit(desiredView);
  };
  const observer = new ResizeObserver(resize); observer.observe(container); resize();
  return {
    setView(view) { desiredView = view; fit(view); },
    setLayout(layout) {
      if (layout === activeLayout) return;
      villages[activeLayout].visible = false;
      villages[layout].visible = true;
      activeLayout = layout; requestRender();
    },
    reset() { fit(desiredView); },
    setSun,
    dispose() {
      if (disposed) return; disposed = true; cancelAnimationFrame(frame);
      observer.disconnect(); controls.removeEventListener("change", requestRender); controls.dispose();
      clearTimeout(environmentTimer); disposeTree(scene); environment?.dispose(); pmrem.dispose(); sun.shadow.dispose(); renderer.dispose(); renderer.domElement.remove();
    },
  };
}
