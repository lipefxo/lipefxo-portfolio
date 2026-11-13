import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  explainTicket,
  generateTickets,
  seededRandom,
} from "../lib/lottery/generator.ts";
import { STRATEGIES } from "../lib/lottery/games.ts";
import {
  evenCount,
  sumOf,
  summarize,
  ticketMetrics,
} from "../lib/lottery/math.ts";
import { anyPrizeCoverage, selectPortfolio } from "../lib/lottery/portfolio.ts";
import type {
  Dataset,
  GeneratorOptions,
  Strategy,
} from "../lib/lottery/types.ts";

const dataset = JSON.parse(
  readFileSync(new URL("../data/megasena.json", import.meta.url), "utf8"),
) as Dataset;
const draws = dataset.draws.slice(-100);
const options: GeneratorOptions = {
  strategy: "ensemble",
  size: 6,
  count: 4,
  fixed: [],
  excluded: [],
  balanced: false,
};

describe("automatic mixed-method collections", () => {
  for (const objective of ["sena", "any-prize"] as const) {
    it(`${objective}: balances all four methods, preserves traces and obeys every constraint`, () => {
      const config = {
        ...options,
        objective,
        count: 8,
        fixed: [1, 2],
        excluded: [59, 60],
        balanced: true,
        minSum: 90,
        maxSum: 210,
      };
      const result = generateTickets(draws, config, seededRandom(74));
      assert.equal(result.complete, true);
      assert.equal(result.tickets.length, 8);
      assert.equal(
        new Set(result.tickets.map((ticket) => ticket.join("-"))).size,
        8,
      );
      assert.deepEqual(
        result.methods.map((method) => method.selected),
        [2, 2, 2, 2],
      );
      assert.equal(
        result.methods.reduce((n, method) => n + method.candidates, 0),
        result.candidatesConsidered,
      );
      assert.ok(result.candidatesConsidered <= 320);
      assert.ok(result.attempts <= 20000);
      assert.equal(
        result.tickets.reduce(
          (cost, ticket) => cost + ticketMetrics(ticket.length).cost,
          0,
        ),
        48,
      );
      for (const selection of result.selections) {
        assert.ok(
          selection.numbers.includes(1) && selection.numbers.includes(2),
        );
        assert.ok(
          !selection.numbers.includes(59) && !selection.numbers.includes(60),
        );
        assert.equal(evenCount(selection.numbers), 3);
        assert.ok(
          sumOf(selection.numbers) >= 90 && sumOf(selection.numbers) <= 210,
        );
        if (selection.strategy === "pairs") {
          assert.ok(selection.seedPair);
          assert.ok(
            selection.seedPair.every((n) => selection.numbers.includes(n)),
          );
          const explanation = explainTicket(
            selection.numbers,
            summarize(draws),
            selection.strategy,
            { ...selection, fixed: config.fixed },
          );
          assert.ok(
            explanation[0].includes(
              selection.seedPair
                .map((n) => String(n).padStart(2, "0"))
                .join(" e "),
            ),
          );
        } else assert.equal(selection.seedPair, null);
      }
      for (const method of result.methods)
        assert.equal(
          method.selected,
          result.selections.filter(
            (selection) => selection.strategy === method.strategy,
          ).length,
        );
    });
  }

  it("uses the objective within a method round instead of picking arbitrary representatives", () => {
    const candidates = [
      { numbers: [1, 2, 3, 4, 5, 6], strategy: "uniform" },
      { numbers: [1, 2, 3, 4, 5, 7], strategy: "frequent" },
      { numbers: [7, 8, 9, 10, 11, 12], strategy: "frequent" },
      { numbers: [13, 14, 15, 16, 17, 18], strategy: "uniform" },
    ];
    const sena = selectPortfolio(
      candidates,
      2,
      "sena",
      (candidate) => candidate.strategy,
    );
    const any = selectPortfolio(
      candidates,
      2,
      "any-prize",
      (candidate) => candidate.strategy,
    );
    assert.deepEqual(sena, [candidates[0], candidates[1]]);
    assert.deepEqual(any, [candidates[0], candidates[2]]);
    assert.ok(
      anyPrizeCoverage(any.map((c) => c.numbers)).lowerOutcomes >
        anyPrizeCoverage(sena.map((c) => c.numbers)).lowerOutcomes,
    );
    assert.equal(any[1], candidates[2]);
    assert.equal(candidates.length, 4);
  });

  it("handles exhausted methods without discarding remaining valid games", () => {
    const candidates = [
      { numbers: [1, 2, 3, 4, 5, 6], strategy: "uniform" },
      { numbers: [7, 8, 9, 10, 11, 12], strategy: "pairs" },
      { numbers: [13, 14, 15, 16, 17, 18], strategy: "uniform" },
      { numbers: [19, 20, 21, 22, 23, 24], strategy: "uniform" },
    ];
    assert.deepEqual(
      selectPortfolio(
        candidates,
        4,
        "any-prize",
        (candidate) => candidate.strategy,
      ),
      candidates,
    );
  });

  it("varies the first method reproducibly and uses different methods for small collections", () => {
    const firstMethods = new Set<Strategy>();
    for (let seed = 0; seed < 16; seed++) {
      const result = generateTickets(
        draws,
        { ...options, count: 2 },
        seededRandom(seed),
      );
      firstMethods.add(result.selections[0].strategy);
      assert.equal(
        new Set(result.selections.map((selection) => selection.strategy)).size,
        2,
      );
    }
    assert.equal(firstMethods.size, 4);
    const config = { ...options, count: 5 };
    assert.deepEqual(
      generateTickets(draws, config, seededRandom(3)),
      generateTickets(draws, config, seededRandom(3)),
    );
    assert.deepEqual(
      generateTickets(draws, config, seededRandom(3))
        .methods.map((m) => m.selected)
        .sort(),
      [1, 1, 1, 2],
    );
  });

  it("deduplicates identical candidates across methods in a tiny feasible space", () => {
    const result = generateTickets(
      draws,
      {
        ...options,
        count: 2,
        fixed: [1, 2, 3, 4, 5],
        excluded: Array.from({ length: 53 }, (_, i) => i + 8),
      },
      seededRandom(7),
    );
    assert.equal(result.complete, true);
    assert.deepEqual(
      result.tickets.sort((a, b) => a[5] - b[5]),
      [
        [1, 2, 3, 4, 5, 6],
        [1, 2, 3, 4, 5, 7],
      ],
    );
    assert.equal(result.candidatesConsidered, 2);
    assert.equal(
      result.methods.reduce((n, m) => n + m.candidates, 0),
      2,
    );
    assert.equal(
      result.methods.reduce((n, m) => n + m.selected, 0),
      2,
    );
  });

  it("reports a partial collection when sum filters leave too few distinct games", () => {
    const result = generateTickets(
      draws,
      {
        ...options,
        count: 3,
        fixed: [1, 2, 3, 4, 5],
        excluded: Array.from({ length: 52 }, (_, i) => i + 9),
        maxSum: 22,
      },
      seededRandom(7),
    );
    assert.equal(result.complete, false);
    assert.equal(result.tickets.length, 2);
    assert.ok(result.attempts <= 20000);
    assert.ok(result.tickets.every((ticket) => sumOf(ticket) <= 22));
    assert.equal(
      result.methods.reduce((n, m) => n + m.selected, 0),
      2,
    );
  });

  it("keeps single-game results identical across objectives and explains fully fixed games", () => {
    const config = { ...options, count: 1 };
    assert.deepEqual(
      generateTickets(draws, { ...config, objective: "sena" }, seededRandom(9))
        .selections,
      generateTickets(
        draws,
        { ...config, objective: "any-prize" },
        seededRandom(9),
      ).selections,
    );
    const result = generateTickets(
      draws,
      { ...config, fixed: [1, 2, 3, 4, 5, 6] },
      seededRandom(9),
    );
    assert.deepEqual(result.tickets, [[1, 2, 3, 4, 5, 6]]);
    const selection = result.selections[0];
    assert.match(
      explainTicket(selection.numbers, summarize(draws), selection.strategy, {
        fixed: selection.numbers,
      })[0],
      /Todas as dezenas foram fixadas/,
    );
  });

  it("supports expanded collections and refuses missing historical data", () => {
    const result = generateTickets(
      draws,
      { ...options, size: 20, count: 20 },
      seededRandom(17),
    );
    assert.equal(result.complete, true);
    assert.equal(result.candidatesConsidered, 320);
    assert.deepEqual(
      result.methods.map((m) => m.selected),
      [5, 5, 5, 5],
    );
    assert.ok(result.tickets.every((ticket) => ticket.length === 20));
    assert.throws(
      () => generateTickets([], options, seededRandom(1)),
      /período com resultados/,
    );
  });

  it("preserves single-method configurations for older saved games and experiments", () => {
    for (const strategy of Object.keys(STRATEGIES) as Strategy[]) {
      const result = generateTickets(
        draws,
        { ...options, strategy },
        seededRandom(1),
      );
      assert.ok(
        result.selections.every((selection) => selection.strategy === strategy),
      );
      assert.equal(result.methods.length, 1);
      assert.equal(result.methods[0].selected, 4);
    }
  });
});
