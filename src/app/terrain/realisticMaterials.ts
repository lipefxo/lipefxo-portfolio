import * as THREE from "three";

/** Box UVs measured in metres, independent of dimensions and parent rotation. */
export function applyBoxUVScale(mesh: THREE.Mesh) {
  if (mesh.geometry.type !== "BoxGeometry") return;
  const geometry = mesh.geometry.clone();
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const uv = geometry.getAttribute("uv");
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i) * mesh.scale.x;
    const y = position.getY(i) * mesh.scale.y;
    const z = position.getZ(i) * mesh.scale.z;
    if (Math.abs(normal.getY(i)) > 0.5) uv.setXY(i, x, -z);
    else if (Math.abs(normal.getX(i)) > 0.5) uv.setXY(i, -z * Math.sign(normal.getX(i)), y);
    else uv.setXY(i, x * Math.sign(normal.getZ(i)), y);
  }
  uv.needsUpdate = true;
  mesh.geometry = geometry;
}

function configure(texture: THREE.Texture, size: number, color = true) {
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.setScalar(1 / size);
  texture.anisotropy = 8;
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return texture;
}

// Deterministic, seam-safe fine detail supplements the photographic surfaces.
function procedural(kind: "paving" | "timber" | "roof" | "road", bump = false) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  const pixels = context.createImageData(size, size);
  let seed = 7319;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const base = kind === "paving" ? [188, 185, 174] : kind === "timber" ? [121, 86, 55] : kind === "roof" ? [148, 151, 140] : [109, 111, 104];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const noise = (random() - 0.5) * (kind === "road" ? 28 : 12);
    let detail = 0;
    if (kind === "paving" || kind === "road") {
      const block = kind === "paving" ? 256 : 64;
      const row = Math.floor(y / block);
      const offsetX = (x + (row % 2) * block / 2) % block;
      const joint = offsetX < 2 || y % block < 2;
      detail = joint ? -36 : 4 * Math.sin(Math.floor((x + (row % 2) * block / 2) / block) * 2.7 + row * 6.3);
    } else if (kind === "timber") {
      detail = Math.sin(x * Math.PI / 8 + 2 * Math.sin(y * Math.PI * 2 / size)) * 10 + Math.sin(x * Math.PI / 2) * 3;
    } else detail = x % 128 < 3 ? -28 : 0;
    const index = (y * size + x) * 4;
    for (let c = 0; c < 3; c++) pixels.data[index + c] = (bump ? 160 : base[c]) + detail + noise;
    pixels.data[index + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  return configure(new THREE.CanvasTexture(canvas), kind === "paving" ? 2.4 : kind === "road" ? 1.6 : 1.2, !bump);
}

export function createRealisticMaterials(onLoad: () => void) {
  const loader = new THREE.TextureLoader();
  const brick = new THREE.MeshStandardMaterial({ color: "#b89a78", roughness: 0.88 });
  const ground = new THREE.MeshStandardMaterial({ color: "#73805a", roughness: 1 });
  const loadSurface = (material: THREE.MeshStandardMaterial, url: string, size: number, bumpScale: number) => {
    let disposed = false;
    material.addEventListener("dispose", () => { disposed = true; });
    // Keep the pending texture reachable so teardown also disposes in-flight loads.
    const texture = loader.load(url, loaded => {
      if (disposed) { loaded.dispose(); return; }
      material.color.set("#ffffff");
      material.needsUpdate = true;
      // Height data is linear, unlike the source photograph's albedo.
      const height = loaded.clone();
      height.colorSpace = THREE.NoColorSpace;
      height.needsUpdate = true;
      material.bumpMap = height;
      material.bumpScale = bumpScale;
      onLoad();
    }, undefined, () => {
      if (disposed) { texture.dispose(); return; }
      material.map = null;
      material.needsUpdate = true;
      texture.dispose();
      onLoad();
    });
    configure(texture, size);
    material.map = texture;
  };
  loadSurface(brick, "/terrain/textures/brick.webp", 1.2, 0.025);
  loadSurface(ground, "/terrain/textures/grass.webp", 4, 0.055);
  ground.onBeforeCompile = shader => {
    shader.vertexShader = "varying vec3 vMeadowPosition;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvMeadowPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = "varying vec3 vMeadowPosition;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
      float meadow = sin(vMeadowPosition.x * .14 + sin(vMeadowPosition.z * .09) * 2.0) * sin(vMeadowPosition.z * .16) * .5 + .5;
      diffuseColor.rgb *= mix(vec3(.73, .76, .68), vec3(.98, .96, .84), meadow);`);
  };
  ground.customProgramCacheKey = () => "meadow-macro-v1";

  const paving = new THREE.MeshStandardMaterial({ map: procedural("paving"), bumpMap: procedural("paving", true), bumpScale: 0.016, roughness: 0.82 });
  const road = new THREE.MeshStandardMaterial({ map: procedural("road"), bumpMap: procedural("road", true), bumpScale: 0.022, roughness: 0.96 });
  const roof = new THREE.MeshStandardMaterial({ map: procedural("roof"), bumpMap: procedural("roof", true), bumpScale: 0.028, roughness: 0.52, metalness: 0.32 });
  const timber = new THREE.MeshStandardMaterial({ map: procedural("timber"), bumpMap: procedural("timber", true), bumpScale: 0.006, roughness: 0.68 });
  const glass = new THREE.MeshPhysicalMaterial({ color: "#aec5c6", metalness: 0, roughness: 0.075, transmission: 0.38, thickness: 0.06, ior: 1.5, transparent: true, opacity: 0.84, envMapIntensity: 1.1 });
  return { brick, paving, roof, timber, glass, ground, road };
}
