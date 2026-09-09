import * as THREE from "three";

/** Eight shadow-free lights, with lightweight landscape pools for the repeated fixtures. */
export function installVillageLighting(village: THREE.Group, layout: "a" | "c") {
  const warm = new THREE.Color("#ffd19a");
  const emitters: { material: THREE.MeshStandardMaterial; strength: number }[] = [];
  const fades: { material: THREE.Material & { opacity: number }; strength: number }[] = [];
  const lights: { light: THREE.PointLight; strength: number }[] = [];
  const lighting = new THREE.Group();
  lighting.name = "village-night-lighting";
  village.add(lighting);

  // A radial falloff shared by the small lens halos and ground illumination.
  // DataTexture also keeps this module usable in geometry tests without a DOM.
  const size = 64;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const radius = Math.hypot((x + 0.5 - size / 2) / (size / 2), (y + 0.5 - size / 2) / (size / 2));
    const offset = (y * size + x) * 4;
    pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 255;
    pixels[offset + 3] = Math.round(255 * Math.pow(Math.max(0, 1 - radius), 2.1));
  }
  const radial = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  radial.needsUpdate = true;
  radial.magFilter = radial.minFilter = THREE.LinearFilter;
  const box = new THREE.BoxGeometry(1, 1, 1);
  const plane = new THREE.PlaneGeometry(1, 1);
  const metal = new THREE.MeshStandardMaterial({ color: "#303733", metalness: 0.6, roughness: 0.42 });

  const point = (parent: THREE.Object3D, name: string, x: number, y: number, z: number, strength: number, distance: number, color: THREE.ColorRepresentation = warm) => {
    const light = new THREE.PointLight(color, 0, distance, 2);
    light.name = name; light.position.set(x, y, z);
    light.userData.maxIntensity = strength;
    parent.add(light); lights.push({ light, strength });
  };
  const luminous = (mesh: THREE.Mesh, strength: number) => {
    const original = mesh.material as THREE.MeshStandardMaterial;
    const material = original.clone();
    material.emissive.copy(warm); material.emissiveIntensity = 0;
    mesh.material = material; emitters.push({ material, strength });
  };
  const lens = (parent: THREE.Object3D, name: string, x: number, y: number, z: number, width: number, depth: number) => {
    const material = new THREE.MeshStandardMaterial({ color: "#ede5cd", emissive: warm, emissiveIntensity: 0, roughness: 0.35 });
    const mesh = new THREE.Mesh(box, material);
    mesh.name = name; mesh.position.set(x, y, z); mesh.scale.set(width, 0.07, depth);
    parent.add(mesh); emitters.push({ material, strength: 3 });
  };
  const halo = (parent: THREE.Object3D, x: number, y: number, z: number) => {
    const material = new THREE.SpriteMaterial({ color: warm, map: radial, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const sprite = new THREE.Sprite(material); sprite.name = "lamp-halo";
    sprite.position.set(x, y, z); sprite.scale.setScalar(0.7); parent.add(sprite);
    fades.push({ material, strength: 0.55 });
  };
  const groundPool = (parent: THREE.Object3D, name: string, x: number, z: number, width: number, depth: number, strength = 0.4, y = 0.155, color: THREE.ColorRepresentation = warm) => {
    const material = new THREE.MeshBasicMaterial({ color, map: radial, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const mesh = new THREE.Mesh(plane, material); mesh.name = name;
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, y, z); mesh.scale.set(width, depth, 1);
    mesh.renderOrder = 2; parent.add(mesh); fades.push({ material, strength });
  };
  const bollard = (x: number, z: number, name: string) => {
    const fixture = new THREE.Group(); fixture.name = name; fixture.position.set(x, 0, z); lighting.add(fixture);
    const stem = new THREE.Mesh(box, metal); stem.position.y = 0.55; stem.scale.set(0.14, 1.1, 0.14); fixture.add(stem);
    lens(fixture, "lamp-lens", 0, 1, 0, 0.18, 0.18); halo(fixture, 0, 1, 0);
    groundPool(fixture, "lamp-ground-pool", 0, 0, 3.2, 3.2);
  };

  const promenadeZ = layout === "a" ? 49 : 52;
  // Upgrade the existing promenade fixtures in place; never touch the shared fabric material.
  for (const object of village.children) {
    if (!(object instanceof THREE.Mesh) || Math.abs(object.position.y - 0.91) > 0.001 || Math.abs(object.position.z - (promenadeZ + 2)) > 0.001) continue;
    object.name = "promenade-lamp-lens"; luminous(object, 3);
    halo(lighting, object.position.x, 0.95, object.position.z);
    groundPool(lighting, "promenade-light-pool", object.position.x, promenadeZ + 0.45, 4.2, 2.8, 0.5);
  }

  for (let i = 1; i <= 4; i++) {
    const house = village.getObjectByName(`house-H${i}`);
    if (!house) continue;
    // Clone only house glazing: vehicle windows share the original glass material.
    house.traverse(object => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshPhysicalMaterial && object.material.transmission > 0) luminous(object, 0.32);
    });
    for (const x of [-5.75, -1.95, 1.95, 5.75]) {
      lens(house, "interior-ceiling-light", x, 3.27, 0.9, 1.2, 0.22);
      lens(house, "veranda-downlight", x, 3.33, 3.65, 0.18, 0.18);
      groundPool(house, "veranda-light-pool", x, 4.03, 3.7, 2.2, 0.36, 0.247);
    }
    point(house, "house-interior-light", 0, 2.25, 2, 48, 13);
    const center = 55 + (i - 1) * 33;
    bollard(center + (layout === "a" ? 3.3 : -11.5), 31.2, `parking-H${i}-lamp`);
  }
  const social = village.getObjectByName("social-pavilion");
  if (social) {
    social.traverse(object => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshPhysicalMaterial && object.material.transmission > 0) luminous(object, 0.4);
    });
    for (const x of [-5, 5]) {
      lens(social, "social-ceiling-light", x, 3.47, 1.3, 2.2, 0.25);
      point(social, "social-interior-light", x, 2.7, 2.5, 65, 12);
      groundPool(social, "social-terrace-light-pool", x, 6, 7, 5, 0.34);
    }
  }
  const pool = village.getObjectByName("pool");
  if (pool) {
    point(pool, "pool-water-light", 0, 0.65, 0, 9, 5, "#7eddd6");
    groundPool(pool, "pool-water-glow", 0, 0, 2.8, 6.8, 0.37, 0.317, "#6be7df");
  }
  const midpoint = (promenadeZ + 69) / 2;
  bollard(108, midpoint, "social-approach-lamp");
  point(lighting, "social-approach-light", 107.5, 1.2, midpoint, 8, 7);
  bollard(180, 17.5, "visitor-parking-lamp");
  bollard(117, 79.5, "pool-terrace-lamp");

  const setLevel = (value: number) => {
    const level = Number.isFinite(value) ? THREE.MathUtils.clamp(value, 0, 1) : 0;
    for (const { light, strength } of lights) light.intensity = strength * level;
    for (const { material, strength } of emitters) material.emissiveIntensity = strength * level;
    for (const { material, strength } of fades) material.opacity = strength * level;
    lighting.userData.nightLevel = level;
  };
  setLevel(0);
  return { setLevel };
}
