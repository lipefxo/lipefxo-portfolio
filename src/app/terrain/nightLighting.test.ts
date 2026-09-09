import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node test runner requires explicit TypeScript extensions.
import { lightingLevelForSun } from "./nightLighting.ts";
// @ts-expect-error Node test runner requires explicit TypeScript extensions.
import { DEFAULT_SOLAR_SETTINGS, getSolarPosition } from "./solarPosition.ts";

test("fixtures are off in daylight, fade through dusk, and stay on at night", () => {
  assert.equal(lightingLevelForSun(60), 0);
  assert.equal(lightingLevelForSun(2), 0);
  assert.equal(lightingLevelForSun(0), .5);
  assert.equal(lightingLevelForSun(-2), 1);
  assert.equal(lightingLevelForSun(-50), 1);
  let previous = 0;
  for (let elevation = 4; elevation >= -4; elevation -= .1) {
    const level = lightingLevelForSun(elevation);
    assert.ok(level >= previous && level <= 1); previous = level;
  }
  assert.equal(lightingLevelForSun(NaN), 0);
});
test("site lights respond to solar time across seasons, including sunrise", () => {
  for (const date of ["2026-06-21", "2026-12-21"]) {
    const level = (timeMinutes: number) => lightingLevelForSun(getSolarPosition({ ...DEFAULT_SOLAR_SETTINGS, date, timeMinutes }).elevation);
    assert.equal(level(720), 0);
    assert.equal(level(60), 1);
    assert.equal(level(1320), 1);
    const sun = getSolarPosition({ ...DEFAULT_SOLAR_SETTINGS, date });
    assert.ok(level(sun.sunsetMinutes!) > .5);
    assert.ok(level(sun.sunriseMinutes! - 30) > level(sun.sunriseMinutes! + 30));
  }
});
