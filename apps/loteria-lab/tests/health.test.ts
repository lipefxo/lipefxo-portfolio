import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { evaluateHealth, healthResponse } from "../lib/lottery/health.ts";
import { snapshotResponse } from "../lib/lottery/data-service.ts";
import type { Dataset } from "../lib/lottery/types.ts";

const dataset = JSON.parse(readFileSync(new URL("../data/megasena.json", import.meta.url), "utf8")) as Dataset;
const now = Date.parse("2026-11-13T12:00:00Z");
function current() {
  const data = snapshotResponse(dataset);
  data.freshness = { status: "current", checkedAt: new Date(now).toISOString(), latestAvailableContest: dataset.draws.at(-1)!.contest, message: "ok" };
  return data;
}
describe("release health", () => {
  it("accepts a current check regardless of the last draw date", () => {
    assert.equal(evaluateHealth(current(), now).status, "current");
  });
  it("enforces the 30-hour boundary and rejects future or invalid checks", () => {
    const data = current();
    data.freshness.checkedAt = new Date(now - 30 * 3600_000).toISOString();
    assert.equal(evaluateHealth(data, now).status, "current");
    data.freshness.checkedAt = new Date(now - 30 * 3600_000 - 1).toISOString();
    assert.equal(evaluateHealth(data, now).status, "stale");
    for (const timestamp of ["invalid", null, new Date(now + 1).toISOString()]) {
      data.freshness.checkedAt = timestamp;
      assert.equal(evaluateHealth(data, now).status, "stale");
    }
  });
  it("reports mismatches, snapshots, and the latest failed attempt", () => {
    const data = current();
    data.freshness.latestAvailableContest!++;
    assert.equal(evaluateHealth(data, now).status, "update-required");
    assert.equal(evaluateHealth(snapshotResponse(dataset), now).status, "snapshot");
    assert.equal(evaluateHealth(null, now).status, "snapshot");
    assert.equal(evaluateHealth(current(), now, { status: "unavailable", checkedAt: new Date(now).toISOString(), latestAvailableContest: null }).status, "unavailable");
  });
  it("returns no-store 503 for missing, unseeded, and failing storage", async () => {
    const unseeded = { prepare() { return { bind() { return { async first() { return null; } }; } }; } } as unknown as D1Database;
    const broken = { prepare() { throw new Error("storage failure"); } } as unknown as D1Database;
    for (const db of [undefined, unseeded, broken]) {
      const response = await healthResponse(db, now);
      assert.equal(response.status, 503);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(((await response.json()) as { status: string }).status, db === unseeded ? "snapshot" : "unavailable");
    }
  });
});
