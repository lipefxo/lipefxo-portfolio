import * as THREE from "three";

/** AI-reconstructed albedo surfaces, lit in real time rather than baked product photos. */
export type SurfaceLibrary = {
  steel: THREE.MeshStandardMaterial;
  plastic: THREE.MeshStandardMaterial;
  aluminum: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  pcb: THREE.MeshStandardMaterial;
  gpuBackplate: THREE.MeshStandardMaterial;
  psuLabel: THREE.MeshStandardMaterial;
  copper: THREE.MeshStandardMaterial;
  ready: Promise<void>;
  dispose: () => void;
};

export function createSurfaceLibrary(renderer: THREE.WebGLRenderer): SurfaceLibrary {
  const ownedTextures = new Set<THREE.Texture>();
  const materials: THREE.MeshStandardMaterial[] = [];
  let disposed = false;
  const make = (name: string, color: THREE.ColorRepresentation, metalness: number, roughness: number) => {
    const m = new THREE.MeshStandardMaterial({ name, color, metalness, roughness });
    m.userData.shared = true;
    materials.push(m);
    return m;
  };
  const steel = make("Black powder-coated steel", "#35383b", .18, .52);
  const plastic = make("Satin reinforced polymer", "#333639", .04, .48);
  const aluminum = make("Brushed aluminum", "#b7bec4", .94, .34);
  const rubber = make("Anti-vibration rubber", "#111315", .02, .91);
  const pcb = make("AM5 micro-ATX PCB", "#282c2c", .23, .69);
  const gpuBackplate = make("Sapphire Pulse backplate", "#303235", .25, .46);
  const psuLabel = make("Corsair SF1000 side panel", "#333638", .36, .58);
  const copper = make("Copper heat pipes", "#b77743", .92, .26);
  const loader = new THREE.TextureLoader();
  const maximumAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const apply = async (name: string, material: THREE.MeshStandardMaterial, repeat: number, microBump: number) => {
    const texture = await loader.loadAsync(`/airflow/textures/${name}.webp`);
    if (disposed) { texture.dispose(); return; }
    texture.name = name;
    texture.userData.shared = true;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = maximumAnisotropy;
    texture.wrapS = texture.wrapT = repeat > 1 ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
    texture.repeat.set(repeat, repeat);
    ownedTextures.add(texture);
    material.map = texture;
    // Keep metal/polymer albedo dark; silver specular response comes from lighting.
    material.color.set(material === aluminum ? "#c4c9cd" : material === steel || material === plastic ? "#969ba0" : "#c7cbce");
    if (microBump > 0) {
      // Low-amplitude luminance relief represents only the manufacturing micrograin,
      // never a claim that the generated albedo contains measured surface heights.
      const bump = texture.clone();
      bump.colorSpace = THREE.NoColorSpace;
      bump.userData.shared = true;
      bump.needsUpdate = true;
      ownedTextures.add(bump);
      material.bumpMap = bump;
      material.bumpScale = microBump;
    }
    material.needsUpdate = true;
  };
  const ready = Promise.all([
    apply("powder-coat", steel, 4, .018),
    apply("fan-polymer", plastic, 3, .008),
    apply("brushed-aluminum", aluminum, 3, .006),
    apply("motherboard-pcb", pcb, 1, 0),
    apply("pulse-backplate", gpuBackplate, 1, 0),
    apply("sf1000-label", psuLabel, 1, 0),
  ]).then(() => undefined);
  return { steel, plastic, aluminum, rubber, pcb, gpuBackplate, psuLabel, copper, ready, dispose() {
    disposed = true;
    materials.forEach(m => m.dispose());
    ownedTextures.forEach(t => t.dispose());
    ownedTextures.clear();
  } };
}
