import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires explicit extensions.
import { getVillageFootprints, getVillageBuildingEnvelopes, getVillageParking, getVillageVehicles, type VillageLayout } from "./villageModel.ts";
// @ts-expect-error Node's native TypeScript runner requires explicit extensions.
import { LOT } from "./terrainModel.ts";

const angle = Math.atan2(LOT[1].z - LOT[0].z, LOT[1].x - LOT[0].x);
const polygon = LOT.map(p => {
  const x = p.x - LOT[0].x, z = p.z - LOT[0].z;
  return { x: x * Math.cos(angle) + z * Math.sin(angle), z: -x * Math.sin(angle) + z * Math.cos(angle) };
});
function inside(x: number, z: number) {
  return polygon.every((p, i) => {
    const q = polygon[(i + 1) % polygon.length];
    return (q.x - p.x) * (z - p.z) - (q.z - p.z) * (x - p.x) >= 0;
  });
}
for (const layout of ["a", "c"] as VillageLayout[]) {
  test(`${layout}: four compact homes and common amenities fit inside the surveyed lot without overlaps`, () => {
    const footprints = getVillageFootprints(layout);
    const homes = footprints.filter(p => p.name.startsWith("house-"));
    assert.equal(homes.length, 4);
    homes.forEach(p => assert.ok(p.width * p.depth >= 90 && p.width * p.depth <= 110));
    for (const p of footprints) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      assert.ok(inside(p.x + sx * p.width / 2, p.z + sz * p.depth / 2), `${p.name} extends outside site`);
    }
    for (let i = 0; i < footprints.length; i++) for (let j = i + 1; j < footprints.length; j++) {
      const a = footprints[i], b = footprints[j];
      const overlap = Math.abs(a.x - b.x) < (a.width + b.width) / 2 && Math.abs(a.z - b.z) < (a.depth + b.depth) / 2;
      assert.equal(overlap, false, `${a.name} overlaps ${b.name}`);
    }
  });
}

for (const layout of ["a", "c"] as VillageLayout[]) {
  test(`${layout}: all twelve cars clear roofs/verandas and parking connects to the lane`, () => {
    const bays = getVillageParking(layout);
    const cars = getVillageVehicles(layout);
    const envelopes = getVillageBuildingEnvelopes(layout);
    assert.equal(cars.length, 12);
    assert.equal(cars.filter(car => car.bay === "visitor-parking").length, 4);
    const overlaps = (a: {x:number;z:number;width:number;depth:number}, b: typeof a, clearance = 0) =>
      Math.abs(a.x - b.x) < (a.width + b.width) / 2 + clearance && Math.abs(a.z - b.z) < (a.depth + b.depth) / 2 + clearance;
    for (const bay of bays) {
      const residents = cars.filter(car => car.bay === bay.name);
      assert.equal(residents.length, 2);
      assert.ok(bay.z - bay.depth / 2 <= 25.75, `${bay.name} does not reach the access lane`);
      assert.ok(bay.x - bay.width / 2 >= 42 && bay.x + bay.width / 2 <= 188);
      for (const car of residents) {
        assert.ok(Math.abs(car.x - bay.x) + car.width / 2 <= bay.width / 2);
        assert.ok(Math.abs(car.z - bay.z) + car.depth / 2 <= bay.depth / 2);
      }
      for (const house of envelopes) assert.ok(!overlaps(bay, house, 1), `${bay.name} lacks one metre of roof/veranda clearance from ${house.name}`);
    }
    for (const car of cars) {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) assert.ok(inside(car.x + sx * car.width / 2, car.z + sz * car.depth / 2), `${car.name} outside site`);
      for (const house of envelopes) assert.ok(!overlaps(car, house, 1), `${car.name} intersects ${house.name} roof/veranda`);
    }
    for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) assert.ok(!overlaps(cars[i], cars[j]), `${cars[i].name} intersects ${cars[j].name}`);
  });
}
