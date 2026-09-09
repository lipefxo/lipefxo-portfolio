import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires explicit extensions.
import { DEFAULT_SOLAR_SETTINGS, getSolarPosition } from "./solarPosition.ts";

const position = (timeMinutes: number, date = "2026-09-09", northRotationDeg = 0) =>
  getSolarPosition({ date, timeMinutes, northRotationDeg });

test("rise, transit, and set agree with independent US Naval Observatory ephemeris", () => {
  // Retrieved 2026-09-09: Rise 06:11, Upper Transit 12:08, Set 18:06, Brasília UTC−3.
  // https://aa.usno.navy.mil/api/rstt/oneday?date=2026-09-09&coords=-15.594963,-47.772479&tz=-3
  const sun = position(728);
  assert.ok(Math.abs(sun.sunriseMinutes! - 371) < 1);
  assert.ok(Math.abs(sun.sunsetMinutes! - 1086) < 1);
  assert.ok(sun.azimuth < 1 || sun.azimuth > 359);
  assert.ok(sun.elevation > position(698).elevation);
  assert.ok(sun.elevation > position(758).elevation);
  assert.ok(Math.abs(position(sun.sunriseMinutes!).elevation + 0.833) < 0.001);
  assert.ok(Math.abs(position(sun.sunsetMinutes!).elevation + 0.833) < 0.001);
});

test("morning/evening face east/west; night is below the horizon", () => {
  assert.ok(position(480).azimuth > 0 && position(480).azimuth < 180);
  assert.ok(position(960).azimuth > 180 && position(960).azimuth < 360);
  assert.ok(position(480).direction.x > 0);
  assert.ok(position(960).direction.x < 0);
  assert.ok(position(0).elevation < 0);
  assert.ok(position(1200).elevation < 0);
});

test("southern hemisphere summer has longer days and a higher noon sun", () => {
  const winter = position(730, "2026-06-21");
  const summer = position(730, "2026-12-21");
  assert.ok(summer.elevation > winter.elevation + 20);
  assert.ok(summer.sunsetMinutes! - summer.sunriseMinutes! > winter.sunsetMinutes! - winter.sunriseMinutes! + 90);
});

test("north rotation maps north to +X and east to +Z at 90 degrees", () => {
  const original = position(480);
  const rotated = position(480, "2026-09-09", 90);
  assert.ok(Math.abs(rotated.direction.x + original.direction.z) < 1e-12);
  assert.ok(Math.abs(rotated.direction.z - original.direction.x) < 1e-12);
  assert.equal(original.elevation, rotated.elevation);
  assert.equal(original.azimuth, rotated.azimuth);
  assert.ok(Math.abs(Math.hypot(...Object.values(rotated.direction)) - 1) < 1e-12);
});

test("invalid date, leap date, and invalid settings remain finite and deterministic", () => {
  const expected = getSolarPosition(DEFAULT_SOLAR_SETTINGS);
  for (const date of ["", "2026-02-30", "invalid", "2200-01-01"]) {
    assert.deepEqual(getSolarPosition({ ...DEFAULT_SOLAR_SETTINGS, date }), expected);
  }
  assert.deepEqual(getSolarPosition({ ...DEFAULT_SOLAR_SETTINGS, timeMinutes: NaN, northRotationDeg: Infinity }), expected);
  assert.ok(Number.isFinite(position(720, "2028-02-29").elevation));
  assert.deepEqual(position(-10), position(0));
  assert.deepEqual(position(1500), position(1439));
});
