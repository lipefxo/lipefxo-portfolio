import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { createSceneExperience } from "./sceneExperience.ts";
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { DEFAULT_CONFIG } from "./model.ts";
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { DEFAULT_EXPERIENCE } from "./experience.ts";
import type { SurfaceLibrary } from "./realisticMaterials";

function fixture() {
  const scene = new THREE.Scene(), frame = new THREE.Group(), components = new THREE.Group(), fans = new THREE.Group();
  components.position.y = -144;
  scene.add(frame, components, fans);
  const source = new THREE.MeshStandardMaterial();
  source.userData.shared = true;
  const gpu = new THREE.Group(); gpu.name = "gpu"; gpu.userData.partId = "gpu";
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(313, 52.67, 133.75), source);
  mesh.position.set(-33.5, 54.665, 13); gpu.add(mesh); components.add(gpu);
  const board = new THREE.Group(); board.userData.partId = "motherboard"; components.add(board);
  const surfaces = { ready: Promise.resolve() } as SurfaceLibrary;
  const controller = createSceneExperience(scene, frame, components, fans, surfaces);
  const cleanup = () => { controller.dispose(); mesh.geometry.dispose(); source.dispose(); };
  return { scene, components, gpu, mesh, source, controller, cleanup };
}

test("exploded assembly returns to the exact assembled position without moving the case", () => {
  const f = fixture();
  try {
    f.controller.update({ ...DEFAULT_EXPERIENCE, explode: 1 }, "gpu", DEFAULT_CONFIG, .016, true);
    assert.ok(f.gpu.position.length() > 100);
    assert.deepEqual(f.components.position.toArray(), [0, -144, 0]);
    f.controller.update(DEFAULT_EXPERIENCE, "gpu", DEFAULT_CONFIG, .016, true);
    assert.deepEqual(f.gpu.position.toArray(), [0, 0, 0]);
  } finally { f.cleanup(); }
});

test("heat and section states never mutate shared hardware surfaces and clear correctly", () => {
  const f = fixture();
  try {
    f.controller.update({ ...DEFAULT_EXPERIENCE, mode: "heat", sectionEnabled: true, section: .5 }, "gpu", DEFAULT_CONFIG, .016, true);
    const displayed = f.mesh.material as THREE.MeshStandardMaterial;
    assert.notEqual(displayed, f.source);
    assert.ok(displayed.opacity < 1);
    assert.equal(displayed.clippingPlanes?.length, 1);
    assert.equal(f.source.opacity, 1);
    assert.equal(f.source.transparent, false);
    assert.equal(f.source.clippingPlanes, null);
    f.controller.update(DEFAULT_EXPERIENCE, "gpu", DEFAULT_CONFIG, .016, true);
    assert.equal(displayed.opacity, 1);
    assert.equal(displayed.clippingPlanes, null);
  } finally { f.cleanup(); }
});

test("zero watts produces no heat-source glow", () => {
  const f = fixture();
  try {
    f.controller.update({ ...DEFAULT_EXPERIENCE, mode: "heat" }, "gpu", { ...DEFAULT_CONFIG, cpuPower: 0, gpuPower: 0 }, .016, true);
    for (const name of ["CPU power source", "GPU power source"]) {
      const heat = f.scene.getObjectByName(name) as THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
      assert.equal(heat.material.uniforms.strength.value, 0);
    }
  } finally { f.cleanup(); }
});

test("component rebuilds release old presentation materials and disposal restores originals", () => {
  const f = fixture();
  f.controller.update({ ...DEFAULT_EXPERIENCE, mode: "airflow" }, "gpu", DEFAULT_CONFIG, .016, true);
  const first = f.mesh.material as THREE.Material;
  let disposed = false; first.addEventListener("dispose", () => { disposed = true; });
  f.components.remove(f.gpu);
  const replacement = f.gpu.clone(); replacement.userData.partId = "gpu";
  // A rebuild normally creates fresh meshes with the original surface library.
  replacement.traverse(node => { if (node instanceof THREE.Mesh) node.material = f.source; });
  f.components.add(replacement);
  f.controller.update(DEFAULT_EXPERIENCE, "gpu", DEFAULT_CONFIG, .016, true);
  assert.equal(disposed, true);
  f.controller.dispose();
  assert.equal(f.scene.getObjectByName("Inspection overlays"), undefined);
  assert.equal((replacement.children[0] as THREE.Mesh).material, f.source);
  f.cleanup();
});

test("temperature marks encode estimates, follow exploded hardware, and hide with removed parts", () => {
  const f = fixture();
  try {
    f.controller.update(DEFAULT_EXPERIENCE, null, DEFAULT_CONFIG, .016, true, { cpu: 30, gpu: 30 });
    const mark = f.scene.getObjectByName("GPU temperature indicator") as THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
    assert.equal(mark.visible, true);
    assert.equal(mark.material.uniforms.warmth.value, 0);
    const origin = mark.position.clone();
    f.controller.update({ ...DEFAULT_EXPERIENCE, explode: 1 }, null, DEFAULT_CONFIG, .016, true, { cpu: 30, gpu: 90 });
    assert.equal(mark.material.uniforms.warmth.value, 1);
    assert.ok(mark.position.distanceTo(origin) > 100);
    assert.equal(mark.material.uniforms.time.value, 0);
    f.controller.update(DEFAULT_EXPERIENCE, null, { ...DEFAULT_CONFIG, gpuInstalled: false }, .016, true, { cpu: 30, gpu: 90 });
    assert.equal(mark.visible, false);
  } finally { f.cleanup(); }
});
