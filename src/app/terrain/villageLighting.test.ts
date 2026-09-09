import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
// @ts-expect-error Node test runner requires explicit TypeScript extensions.
import { installVillageLighting } from "./villageLighting.ts";

for (const layout of ["a", "c"] as const) {
  test(`${layout}: fixture levels update without lighting shared vehicle glazing`, () => {
    const village = new THREE.Group();
    const sharedGlass = new THREE.MeshPhysicalMaterial({ transmission: .38 });
    for (const name of ["house-H1", "house-H2", "house-H3", "house-H4", "social-pavilion", "pool"]) {
      const group = new THREE.Group(); group.name = name;
      if (layout === "c" && name.startsWith("house")) group.rotation.y = Math.PI / 2;
      group.add(new THREE.Mesh(new THREE.BoxGeometry(), sharedGlass)); village.add(group);
    }
    const car = new THREE.Mesh(new THREE.BoxGeometry(), sharedGlass); village.add(car);
    const fixtures = installVillageLighting(village, layout);
    const lights: THREE.PointLight[] = [];
    village.traverse(object => { if (object instanceof THREE.PointLight) lights.push(object); });
    assert.equal(lights.length, 8);
    lights.forEach(light => assert.equal(light.intensity, 0));
    const window = village.getObjectByName("house-H1")!.children[0] as THREE.Mesh;
    assert.notEqual(window.material, sharedGlass);
    fixtures.setLevel(1);
    lights.forEach(light => assert.equal(light.intensity, light.userData.maxIntensity));
    assert.ok((window.material as THREE.MeshPhysicalMaterial).emissiveIntensity > 0);
    assert.equal(sharedGlass.emissive.getHex(), 0);
    assert.equal(car.material, sharedGlass);
    fixtures.setLevel(.5);
    lights.forEach(light => assert.equal(light.intensity, light.userData.maxIntensity * .5));
    fixtures.setLevel(0);
    lights.forEach(light => assert.equal(light.intensity, 0));
    assert.equal((window.material as THREE.MeshPhysicalMaterial).emissiveIntensity, 0);
  });
}
