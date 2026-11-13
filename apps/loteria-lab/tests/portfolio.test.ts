import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  choose,
  evenCount,
  matchCount,
  portfolioMetrics,
  sumOf,
  TOTAL_COMBINATIONS,
} from "../lib/lottery/math.ts";
import {
  anyPrizeCoverage,
  selectPortfolio,
  winningIntersectionCount,
  winningOutcomeCount,
} from "../lib/lottery/portfolio.ts";
import { generateTickets, seededRandom } from "../lib/lottery/generator.ts";
import type {
  Dataset,
  GeneratorOptions,
  Strategy,
} from "../lib/lottery/types.ts";

const near = (a: number, b: number, tolerance = 1e-10) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);

// Independent oracle: enumerate every subset of the numbers mentioned by the
// tickets, and count the ways to fill the rest of a draw with unmentioned balls.
function enumerateWinningOutcomes(tickets: number[][]) {
  const mentioned = [...new Set(tickets.flat())];
  assert.ok(mentioned.length <= 14, "Keep this exhaustive oracle small.");
  let outcomes = 0;
  for (let mask = 0; mask < 2 ** mentioned.length; mask++) {
    const inside = mentioned.filter((_, i) => mask & (1 << i));
    if (inside.length > 6 || !tickets.some((t) => matchCount(t, inside) >= 4))
      continue;
    outcomes += choose(60 - mentioned.length, 6 - inside.length);
  }
  return outcomes;
}

describe("any-prize coverage", () => {
  it("counts the exact winning outcomes for one simple ticket", () => {
    assert.equal(winningOutcomeCount(6), 21790);
    assert.equal(winningOutcomeCount(6, 6), 1);
    const result = anyPrizeCoverage([[1, 2, 3, 4, 5, 6]]);
    assert.equal(result.exact, true);
    assert.equal(
      result.lowerOutcomes,
      enumerateWinningOutcomes([[1, 2, 3, 4, 5, 6]]),
    );
    near(1 / result.lowerProbability, 2297.5612666360717, 1e-8);
  });

  it("reproduces the two-ticket example without changing jackpot probability or cost", () => {
    const concentrated = [
      [1, 2, 3, 4, 5, 6],
      [1, 2, 3, 4, 5, 7],
    ];
    const diversified = [
      [1, 2, 3, 4, 5, 6],
      [7, 8, 9, 10, 11, 12],
    ];
    for (const tickets of [concentrated, diversified]) {
      const result = anyPrizeCoverage(tickets);
      assert.equal(result.exact, true);
      assert.equal(result.lowerOutcomes, enumerateWinningOutcomes(tickets));
      assert.equal(portfolioMetrics(tickets).cost, 12);
      near(portfolioMetrics(tickets).probability, 2 / TOTAL_COMBINATIONS);
    }
    assert.equal(anyPrizeCoverage(concentrated).lowerOutcomes, 35570);
    assert.equal(anyPrizeCoverage(diversified).lowerOutcomes, 43580);
    assert.equal(winningIntersectionCount(6, 6, 5), 8010);
  });

  it("bounds overlapping portfolios against exhaustive counting, including mixed sizes", () => {
    for (const tickets of [
      [
        [1, 2, 3, 4, 5, 6],
        [1, 2, 3, 4, 5, 7],
        [1, 2, 3, 4, 5, 8],
      ],
      [
        [1, 2, 3, 4, 5, 6],
        [1, 2, 7, 8, 9, 10, 11],
        [3, 4, 7, 8, 9, 10, 11, 12],
      ],
      [
        [1, 2, 3, 4, 5, 6, 7],
        [1, 2, 3, 4, 5, 8, 9],
        [2, 4, 6, 8, 10, 12],
      ],
    ]) {
      const exact = enumerateWinningOutcomes(tickets);
      const result = anyPrizeCoverage(tickets);
      assert.ok(result.lowerOutcomes <= exact);
      assert.ok(result.upperOutcomes >= exact);
      assert.equal(result.exact, result.lowerOutcomes === result.upperOutcomes);
      const reversed = anyPrizeCoverage([...tickets].reverse());
      assert.equal(result.lowerOutcomes, reversed.lowerOutcomes);
      assert.equal(result.upperOutcomes, reversed.upperOutcomes);
    }
  });

  it("handles duplicate and nested tickets without counting their probability twice", () => {
    const a = [1, 2, 3, 4, 5, 6];
    const duplicate = anyPrizeCoverage([a, a, a]);
    assert.equal(duplicate.exact, true);
    assert.equal(duplicate.lowerOutcomes, 21790);
    const nested = anyPrizeCoverage([a, [...a, 7]]);
    assert.equal(nested.exact, true);
    assert.equal(nested.lowerOutcomes, winningOutcomeCount(7));
    assert.equal(winningIntersectionCount(20, 20, 20), winningOutcomeCount(20));
    assert.equal(winningIntersectionCount(20, 20, 7, 6), choose(7, 6));
    assert.deepEqual(anyPrizeCoverage([]), {
      lowerOutcomes: 0,
      upperOutcomes: 0,
      lowerProbability: 0,
      upperProbability: 0,
      exact: true,
      maxSharedNumbers: 0,
    });
  });

  it("keeps large-portfolio bounds within probability limits and rejects invalid tickets", () => {
    const tickets = Array.from({ length: 20 }, (_, i) =>
      Array.from({ length: 20 }, (_, n) => ((i * 3 + n) % 60) + 1),
    );
    const result = anyPrizeCoverage(tickets);
    assert.ok(
      result.lowerProbability >= winningOutcomeCount(20) / TOTAL_COMBINATIONS,
    );
    assert.ok(result.lowerProbability <= result.upperProbability);
    assert.ok(result.upperProbability <= 1);
    assert.throws(() => anyPrizeCoverage([[1, 1, 2, 3, 4, 5]]));
    assert.throws(() => anyPrizeCoverage([[1, 2, 3, 4, 5, 61]]));
    assert.throws(() => winningIntersectionCount(6, 6, 7));
    assert.throws(() => winningOutcomeCount(21));
  });
});

describe("generation objectives", () => {
  const candidates = [
    { numbers: [1, 2, 3, 4, 5, 6], seedPair: [1, 2] },
    { numbers: [1, 2, 3, 4, 5, 7], seedPair: [1, 3] },
    { numbers: [7, 8, 9, 10, 11, 12], seedPair: [7, 9] },
  ];

  it("uses different portfolio criteria while preserving candidate provenance", () => {
    assert.deepEqual(
      selectPortfolio(candidates, 2, "sena"),
      candidates.slice(0, 2),
    );
    const diversified = selectPortfolio(candidates, 2, "any-prize");
    assert.deepEqual(diversified, [candidates[0], candidates[2]]);
    assert.equal(diversified[1], candidates[2]);
    assert.equal(candidates.length, 3);
  });

  it("reduces duplicate six-number coverage for expanded tickets in Sena mode", () => {
    const expanded = [
      { numbers: [1, 2, 3, 4, 5, 6, 7] },
      { numbers: [1, 2, 3, 4, 5, 6, 8] },
      { numbers: [8, 9, 10, 11, 12, 13, 14] },
    ];
    const selected = selectPortfolio(expanded, 2, "sena");
    assert.deepEqual(selected, [expanded[0], expanded[2]]);
    assert.equal(
      portfolioMetrics(selected.map((s) => s.numbers)).distinctCombinations,
      14,
    );
  });

  const dataset = JSON.parse(
    readFileSync(new URL("../data/megasena.json", import.meta.url), "utf8"),
  ) as Dataset;
  const draws = dataset.draws.slice(-100);
  const options: GeneratorOptions = {
    strategy: "uniform",
    size: 6,
    count: 3,
    fixed: [],
    excluded: [],
    balanced: false,
  };

  for (const strategy of [
    "uniform",
    "frequent",
    "infrequent",
    "pairs",
  ] as Strategy[]) {
    it(`preserves hard constraints and traces with ${strategy} and the any-prize objective`, () => {
      const result = generateTickets(
        draws,
        {
          ...options,
          objective: "any-prize",
          strategy,
          count: 20,
          fixed: [1, 2],
          excluded: [59, 60],
          balanced: true,
          minSum: 90,
          maxSum: 210,
        },
        seededRandom(11),
      );
      assert.equal(result.complete, true);
      assert.equal(result.objective, "any-prize");
      assert.ok(result.candidatesConsidered <= 320);
      assert.ok(result.attempts <= 20000);
      assert.equal(new Set(result.tickets.map((t) => t.join("-"))).size, 20);
      for (const selection of result.selections) {
        const ticket = selection.numbers;
        assert.ok(ticket.includes(1) && ticket.includes(2));
        assert.ok(!ticket.includes(59) && !ticket.includes(60));
        assert.equal(evenCount(ticket), 3);
        assert.ok(sumOf(ticket) >= 90 && sumOf(ticket) <= 210);
        if (selection.seedPair)
          assert.ok(selection.seedPair.every((n) => ticket.includes(n)));
      }
    });
  }

  it("keeps one-ticket generation identical across objectives and supports legacy settings", () => {
    const sena = generateTickets(
      draws,
      { ...options, objective: "sena", count: 1 },
      seededRandom(22),
    );
    const any = generateTickets(
      draws,
      { ...options, objective: "any-prize", count: 1 },
      seededRandom(22),
    );
    assert.deepEqual(sena.tickets, any.tickets);
    assert.equal(any.candidatesConsidered, 1);
    assert.equal(
      generateTickets(draws, options, seededRandom(22)).objective,
      "sena",
    );
    assert.throws(
      () =>
        generateTickets(
          draws,
          { ...options, objective: "unknown" as never },
          seededRandom(22),
        ),
      /Objetivo desconhecido/,
    );
  });
});
