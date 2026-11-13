import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runCollectionBacktest } from "../lib/lottery/collection-backtest.ts";
import { evenCount, sumOf } from "../lib/lottery/math.ts";
import type { Dataset, GeneratorOptions } from "../lib/lottery/types.ts";

const draws = (
  JSON.parse(
    readFileSync(new URL("../data/megasena.json", import.meta.url), "utf8"),
  ) as Dataset
).draws.slice(-45);
const options: GeneratorOptions = {
  strategy: "ensemble",
  objective: "sena",
  size: 6,
  count: 4,
  fixed: [1],
  excluded: [60],
  balanced: true,
  minSum: 80,
  maxSum: 220,
};
const settings = { trainSize: 30, testSize: 10, seed: 42, seeds: 2, options };

describe("collection backtest", () => {
  it("is reproducible and compares equal budgets under the same constraints", () => {
    const result = runCollectionBacktest(draws, settings);
    assert.deepEqual(runCollectionBacktest(draws, settings), result);
    for (const contest of result.contests)
      for (const run of contest.runs) {
        assert.ok(run.candidates >= options.count);
        for (const value of Object.values(run.outcomes)) {
          assert.equal(value.tickets.length, options.count);
          assert.equal(
            new Set(value.tickets.map((t) => t.join("-"))).size,
            options.count,
          );
          for (const ticket of value.tickets) {
            assert.equal(ticket.length, options.size);
            assert.ok(ticket.includes(1) && !ticket.includes(60));
            assert.equal(evenCount(ticket), 3);
            assert.ok(sumOf(ticket) >= 80 && sumOf(ticket) <= 220);
          }
        }
        // Distinct simple tickets tie for Sena, so selection keeps their order.
        assert.deepEqual(run.outcomes.uniform, run.outcomes.uniformOptimized);
      }
    assert.deepEqual(result.comparisons[0], {
      ...result.comparisons[1],
      baseline: "uniform",
    });
  });
  it("never trains on the current or later draw", () => {
    const result = runCollectionBacktest(draws, settings);
    const modified = draws.map((draw, index) =>
      index >= draws.length - settings.testSize
        ? { ...draw, numbers: [1, 2, 3, 4, 5, 6] }
        : draw,
    );
    const changed = runCollectionBacktest(modified, settings);
    assert.deepEqual(
      result.contests[0].runs.map((r) =>
        Object.values(r.outcomes).map((o) => o.tickets),
      ),
      changed.contests[0].runs.map((r) =>
        Object.values(r.outcomes).map((o) => o.tickets),
      ),
    );
    assert.equal(
      result.contests[0].trainingEnd,
      draws[draws.length - settings.testSize - 1].contest,
    );
  });
  it("rejects excessive work and invalid seeds", () => {
    assert.throws(() =>
      runCollectionBacktest(draws, { ...settings, seed: NaN }),
    );
    assert.throws(() =>
      runCollectionBacktest(draws, {
        ...settings,
        options: { ...options, size: 20, count: 20 },
        testSize: 100,
      }),
    );
  });
});
