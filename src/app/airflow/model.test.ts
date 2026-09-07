import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { DEFAULT_CONFIG, componentCooling, evaluate, type Fan } from "./model.ts";

const config = (changes: Partial<typeof DEFAULT_CONFIG>) => ({
  ...DEFAULT_CONFIG,
  ...changes,
  fans: { ...DEFAULT_CONFIG.fans, ...(changes.fans ?? {}) },
});

test("zero heat does not create an air temperature rise", () => {
  const input = config({ cpuPower: 0, gpuPower: 0 });
  const result = evaluate(input);
  assert.equal(result.airRise, 0);
  assert.equal(result.cpuTemp, input.ambient);
  assert.equal(result.gpuTemp, input.ambient);
});

test("a fanless configuration returns finite temperatures", () => {
  const fans = Object.fromEntries(
    Object.entries(DEFAULT_CONFIG.fans).map(([id, fan]) => [
      id,
      { ...fan, installed: false, rpm: 0 },
    ]),
  );
  const result = evaluate(config({ fans }));
  assert.equal(result.activeFans, 0);
  assert.ok(Number.isFinite(result.cpuTemp));
  assert.ok(Number.isFinite(result.gpuTemp));
});

test("reversing all default fans flips the pressure direction", () => {
  const reversed: Record<string, Fan> = Object.fromEntries(
    Object.entries(DEFAULT_CONFIG.fans).map(([id, fan]) => [
      id,
      {
        ...fan,
        direction: fan.direction === "intake" ? "exhaust" : "intake",
      },
    ]),
  );
  assert.equal(evaluate(config({ fans: reversed })).pressure, "Negative");
});

test("Pulse requires slim bottom fans and respects front GPU clearance", () => {
  const thickBottom = {
    ...DEFAULT_CONFIG.fans,
    "bottom-rear": {
      ...DEFAULT_CONFIG.fans["bottom-rear"],
      thickness: 25 as const,
    },
  };
  const bottom = evaluate(config({ fans: thickBottom }));
  assert.ok(
    bottom.issues.some((issue) => issue.id === "bottom-slim-bottom-rear"),
  );
  assert.equal(bottom.activeFans, 4);
  const front = {
    ...DEFAULT_CONFIG.fans,
    front: {
      installed: true,
      direction: "intake" as const,
      rpm: 1000,
      size: 120 as const,
      thickness: 15 as const,
    },
  };
  const clearance = evaluate(config({ fans: front, gpuLength: 350 }));
  assert.ok(
    clearance.issues.some((issue) => issue.id === "front-gpu-clearance"),
  );
});

test("each multi-fan bank validates its own 140 mm layout", () => {
  for (const [bank, first, third] of [
    ["top", "top-rear", "top-front"],
    ["bottom", "bottom-rear", "bottom-front"],
    ["side", "side-rear", "side-front"],
  ] as const) {
    const fans: Record<string, Fan> = {
      ...DEFAULT_CONFIG.fans,
      [first]: {
        installed: true,
        direction: "intake",
        rpm: 1000,
        size: 120,
        thickness: 15,
      },
      [third]: {
        installed: true,
        direction: "intake",
        rpm: 1000,
        size: 140,
        thickness: 15,
      },
    };
    const result = evaluate(config({ fans, sideBracket: bank === "side" }));
    assert.ok(result.issues.some((issue) => issue.id === `mixed-bank-${bank}`));
  }
  const side140 = {
    ...DEFAULT_CONFIG.fans,
    "side-front": {
      installed: true,
      direction: "intake" as const,
      rpm: 1000,
      size: 140 as const,
      thickness: 15 as const,
    },
  };
  assert.ok(
    evaluate(config({ fans: side140, sideBracket: true })).issues.some(
      (issue) => issue.id === "bank-140-position-side-front",
    ),
  );
});

test("reports stopped fans, side hardware conflicts, and GPU envelope warnings", () => {
  const stopped = {
    ...DEFAULT_CONFIG.fans,
    rear: {
      installed: true,
      direction: "exhaust" as const,
      rpm: 0,
      size: 120 as const,
      thickness: 25 as const,
    },
  };
  assert.ok(
    evaluate(config({ fans: stopped })).issues.some(
      (issue) => issue.id === "stopped-fan-rear",
    ),
  );
  const side = {
    ...DEFAULT_CONFIG.fans,
    "side-rear": {
      installed: true,
      direction: "intake" as const,
      rpm: 1000,
      size: 120 as const,
      thickness: 15 as const,
    },
  };
  const noBracket = evaluate(config({ fans: side }));
  assert.ok(
    noBracket.issues.some((issue) => issue.id === "side-bracket-side-rear"),
  );
  assert.ok(noBracket.invalidFanIds.includes("side-rear"));
  assert.ok(
    evaluate(config({ fans: side, sideBracket: true })).issues.some(
      (issue) => issue.id === "side-cooler-side-rear",
    ),
  );
  for (const id of ["front", "rear"] as const) {
    const fans = {
      ...DEFAULT_CONFIG.fans,
      [id]: {
        installed: true,
        direction: "intake" as const,
        rpm: 1000,
        size: 140 as const,
        thickness: 15 as const,
      },
    };
    assert.ok(
      evaluate(config({ fans })).issues.some(
        (issue) => issue.id === `${id}-size`,
      ),
    );
  }
  const gpu = evaluate(config({ gpuThickness: 85, gpuWidth: 151 }));
  assert.ok(gpu.issues.some((issue) => issue.id === "gpu-thickness"));
  assert.ok(gpu.issues.some((issue) => issue.id === "gpu-width-cable"));
});

test("ambient and restriction move thermal estimates in the expected direction", () => {
  const baseline = evaluate(config({ ambient: 20, restriction: 0.1 }));
  const hotRoom = evaluate(config({ ambient: 30, restriction: 0.1 }));
  const restricted = evaluate(config({ ambient: 20, restriction: 0.9 }));
  assert.ok(hotRoom.cpuTemp > baseline.cpuTemp);
  assert.ok(hotRoom.gpuTemp > baseline.gpuTemp);
  assert.ok(restricted.effectiveCfm < baseline.effectiveCfm);
  assert.ok(restricted.airRise > baseline.airRise);
});


test("component fans cool locally without changing chassis exchange or pressure", () => {
  const twoFan = config({ gpuLength: 200 });
  const threeFan = config({ gpuLength: 313 });
  const a = evaluate(twoFan), b = evaluate(threeFan);
  assert.ok(b.gpuTemp < a.gpuTemp);
  assert.equal(a.effectiveCfm, b.effectiveCfm);
  assert.equal(a.pressure, b.pressure);
  assert.equal(a.airRise, b.airRise);
  assert.equal(componentCooling(config({ gpuInstalled: false })).gpuCfm, 0);
  assert.ok(componentCooling(config({ cpuPower: 150 })).cpuRpm > componentCooling(config({ cpuPower: 0 })).cpuRpm);
});
