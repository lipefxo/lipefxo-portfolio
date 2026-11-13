import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  canonicalDraws,
  choose,
  evenCount,
  matchProbability,
  portfolioMetrics,
  sumOf,
  summarize,
  theoreticalSumDistribution,
  ticketMetrics,
  validateDraws,
} from "../lib/lottery/math.ts";
import {
  explainTicket,
  generateTickets,
  seededRandom,
} from "../lib/lottery/generator.ts";
import { runBacktest } from "../lib/lottery/backtest.ts";
import type {
  Dataset,
  GeneratorOptions,
  Strategy,
} from "../lib/lottery/types.ts";

const dataset = JSON.parse(
  readFileSync(new URL("../data/megasena.json", import.meta.url), "utf8"),
) as Dataset;
const draws = dataset.draws;
const options: GeneratorOptions = {
  strategy: "uniform",
  size: 6,
  count: 3,
  fixed: [],
  excluded: [],
  balanced: false,
};
const near = (a: number, b: number, tolerance = 1e-10) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);

describe("official historical snapshot", () => {
  it("is complete and has a matching results checksum and original workbook", () => {
    validateDraws(draws);
    assert.equal(draws[0].contest, 1);
    assert.ok(draws.length >= 3073);
    assert.equal(draws.length, draws.at(-1)!.contest);
    assert.equal(
      createHash("sha256").update(canonicalDraws(draws)).digest("hex"),
      dataset.source.drawsSha256,
    );
    assert.equal(
      createHash("sha256")
        .update(
          readFileSync(
            new URL("../data/source/megasena.xlsx", import.meta.url),
          ),
        )
        .digest("hex"),
      dataset.source.archiveSha256,
    );
    assert.deepEqual(draws[0].numbers, [4, 5, 30, 33, 41, 52]);
    assert.deepEqual(draws[3072].numbers, [4, 13, 23, 28, 41, 58]);
    assert.ok(dataset.source.apiVerifiedContests.includes(1));
    assert.ok(
      dataset.source.apiVerifiedContests.includes(draws.at(-1)!.contest),
    );
  });
  it("rejects duplicates, gaps, reversed chronology, impossible dates and invalid numbers", () => {
    assert.throws(() => validateDraws([draws[0], draws[0]]));
    assert.throws(() => validateDraws([draws[0], draws[2]]));
    assert.throws(() =>
      validateDraws([{ ...draws[0], numbers: [1, 1, 2, 3, 4, 5] }]),
    );
    assert.throws(() =>
      validateDraws([{ ...draws[0], numbers: [0, 1, 2, 3, 4, 61] }]),
    );
    assert.throws(() => validateDraws([{ ...draws[0], date: "2020-02-30" }]));
    assert.throws(() => validateDraws([{ ...draws[0], date: "2099-01-01" }]));
    assert.throws(() =>
      validateDraws([draws[0], { ...draws[1], date: "1996-01-01" }]),
    );
    assert.throws(() => validateDraws([{ ...draws[0], prizes: [NaN, 1, 2] }]));
  });
  it("accounts for exactly six appearances and fifteen pairs per draw", () => {
    const stats = summarize(draws);
    assert.equal(sumOf(stats.numbers.map((n) => n.count)), draws.length * 6);
    assert.equal(
      sumOf(stats.pairs.map((pair) => pair.count)),
      draws.length * 15,
    );
    assert.equal(sumOf(stats.parity), draws.length);
    assert.equal(sumOf(stats.repeats), draws.length - 1);
    for (const n of draws.at(-1)!.numbers)
      assert.equal(stats.numbers[n - 1].gap, 0);
  });
  it("marks absent numbers as censored rather than inventing their last occurrence", () => {
    const stats = summarize(draws.slice(0, 1));
    assert.equal(stats.numbers[0].gap, 1);
    assert.equal(stats.numbers[0].censored, true);
    assert.equal(stats.numbers[0].lastContest, null);
    assert.equal(stats.numbers[3].gap, 0);
    assert.equal(stats.numbers[3].censored, false);
  });
});

describe("exact probability and coverage", () => {
  it("matches the official simple and expanded ticket table", () => {
    assert.equal(choose(60, 6), 50063860);
    assert.equal(ticketMetrics(6).oneIn, 50063860);
    assert.equal(ticketMetrics(6).cost, 6);
    assert.equal(ticketMetrics(7).oneIn, 7151980);
    assert.equal(ticketMetrics(7).cost, 42);
    assert.equal(ticketMetrics(20).combinations, 38760);
    assert.equal(ticketMetrics(20).cost, 232560);
    assert.throws(() => ticketMetrics(5));
    assert.throws(() => ticketMetrics(21));
  });
  it("the match distribution sums to one and has the correct expectation", () => {
    for (const size of [6, 7, 10, 20]) {
      const probabilities = Array.from({ length: 7 }, (_, k) =>
        matchProbability(size, k),
      );
      near(sumOf(probabilities), 1);
      near(sumOf(probabilities.map((p, k) => p * k)), size / 10);
    }
    near(1 / matchProbability(6, 5), 154518.0864197531, 1e-6);
  });
  it("counts overlapping combinations once while retaining the paid cost", () => {
    const result = portfolioMetrics([
      [1, 2, 3, 4, 5, 6, 7],
      [1, 2, 3, 4, 5, 6],
    ]);
    assert.equal(result.distinctCombinations, 7);
    assert.equal(result.overlappingCombinations, 1);
    assert.equal(result.cost, 48);
    near(result.probability, 7 / 50063860);
    assert.equal(
      portfolioMetrics([
        [1, 2, 3, 4, 5, 6],
        [1, 2, 3, 4, 5, 6],
      ]).distinctCombinations,
      1,
    );
  });
  it("the exact sum distribution normalizes, has mean 183, and is symmetric", () => {
    const probabilities = theoreticalSumDistribution();
    near(sumOf(probabilities), 1);
    near(sumOf(probabilities.map((p, value) => p * value)), 183);
    near(probabilities[21], 1 / 50063860);
    for (let value = 21; value <= 345; value++)
      near(probabilities[value], probabilities[366 - value]);
  });
});

describe("constrained generation", () => {
  for (const strategy of [
    "uniform",
    "frequent",
    "infrequent",
    "pairs",
  ] as Strategy[]) {
    it(`${strategy} produces distinct valid games and respects hard constraints`, () => {
      const settings = {
        ...options,
        strategy,
        count: 20,
        fixed: [1, 2],
        excluded: [59, 60],
        balanced: true,
        minSum: 90,
        maxSum: 210,
      };
      const result = generateTickets(
        draws.slice(-100),
        settings,
        seededRandom(11),
      );
      assert.equal(result.complete, true);
      assert.equal(result.tickets.length, 20);
      assert.equal(new Set(result.tickets.map((t) => t.join("-"))).size, 20);
      for (const ticket of result.tickets) {
        assert.equal(ticket.length, 6);
        assert.equal(new Set(ticket).size, 6);
        assert.ok(ticket.includes(1) && ticket.includes(2));
        assert.ok(!ticket.includes(59) && !ticket.includes(60));
        assert.equal(evenCount(ticket), 3);
        assert.ok(sumOf(ticket) >= 90 && sumOf(ticket) <= 210);
        assert.deepEqual(
          ticket,
          [...ticket].sort((a, b) => a - b),
        );
      }
    });
  }
  it("rejects contradictory or impossible choices explicitly", () => {
    for (const invalid of [
      { fixed: [1], excluded: [1] },
      { fixed: [1, 1] },
      { minSum: 400 },
      { maxSum: 20 },
      { minSum: 200, maxSum: 100 },
      { fixed: [1, 3, 5, 7], balanced: true },
      { fixed: [1, 2, 3, 4, 5, 6], count: 2 },
      { size: 5 },
      { excluded: Array.from({ length: 55 }, (_, i) => i + 1) },
      { fixed: [61] },
    ])
      assert.throws(() =>
        generateTickets(
          draws.slice(-30),
          { ...options, ...invalid },
          seededRandom(1),
        ),
      );
  });
  it("supports expanded tickets and returns the only possible fully fixed game", () => {
    const expanded = generateTickets(
      draws,
      { ...options, size: 20, count: 1 },
      seededRandom(5),
    );
    assert.equal(expanded.tickets[0].length, 20);
    const fixed = generateTickets(
      draws,
      { ...options, fixed: [1, 2, 3, 4, 5, 6], count: 1 },
      seededRandom(5),
    );
    assert.deepEqual(fixed.tickets, [[1, 2, 3, 4, 5, 6]]);
  });
  it("explains the actual seed pair and distinguishes user-fixed choices", () => {
    const window = draws.slice(-100);
    const summary = summarize(window);
    const result = generateTickets(
      window,
      { ...options, strategy: "pairs" },
      seededRandom(11),
    );
    for (const selection of result.selections) {
      assert.ok(selection.seedPair);
      assert.ok(selection.seedPair.every((n) => selection.numbers.includes(n)));
      const explanation = explainTicket(
        selection.numbers,
        summary,
        "pairs",
        selection,
      );
      assert.ok(
        explanation[0].includes(
          selection.seedPair.map((n) => String(n).padStart(2, "0")).join(" e "),
        ),
      );
    }
    const fixed = [1, 2, 3, 4, 5, 6];
    const explanation = explainTicket(fixed, summary, "frequent", {
      fixed,
      seedPair: null,
    });
    assert.match(explanation[0], /Todas as dezenas foram fixadas/);
    assert.doesNotMatch(explanation.join(" "), /seleção usou os pesos/);
  });
  it("reports uniform fallback when exclusions remove every recurring pair", () => {
    const window = [draws[0]];
    const result = generateTickets(
      window,
      {
        ...options,
        strategy: "pairs",
        count: 1,
        excluded: [...draws[0].numbers],
      },
      seededRandom(11),
    );
    assert.equal(result.selections[0].seedPair, null);
    const explanation = explainTicket(
      result.tickets[0],
      summarize(window),
      "pairs",
      result.selections[0],
    );
    assert.match(explanation[0], /preenchidas com pesos iguais/);
    assert.doesNotMatch(explanation.join(" "), /maior frequência/);
  });
});

describe("rolling historical experiments", () => {
  const settings = { trainSize: 30, testSize: 10, seed: 42 };
  const sample = draws.slice(0, 80);
  it("is reproducible and evaluates one six-number game per method and draw", () => {
    const result = runBacktest(sample, settings);
    assert.deepEqual(runBacktest(sample, settings), result);
    for (const row of result.results) {
      assert.equal(sumOf(row.distribution), settings.testSize);
      assert.equal(row.timeline.length, settings.testSize);
      for (const example of row.examples) {
        assert.equal(example.trainingEnd, example.contest - 1);
        assert.equal(example.ticket.length, 6);
      }
    }
  });
  it("never uses the evaluated draw or future outcomes to choose a game", () => {
    const result = runBacktest(sample, settings);
    const modified = sample.map((draw, index) =>
      index === sample.length - 1
        ? { ...draw, numbers: [1, 2, 3, 4, 5, 6] }
        : draw,
    );
    const changed = runBacktest(modified, settings);
    for (let i = 0; i < result.results.length; i++) {
      assert.deepEqual(
        result.results[i].examples.map((row) => row.ticket),
        changed.results[i].examples.map((row) => row.ticket),
      );
      assert.deepEqual(
        result.results[i].timeline.slice(0, -1),
        changed.results[i].timeline.slice(0, -1),
      );
    }
  });
  it("rejects insufficient data and invalid seeds instead of shrinking the experiment", () => {
    assert.throws(() => runBacktest(draws.slice(0, 20), settings));
    assert.throws(() => runBacktest(sample, { ...settings, seed: NaN }));
    assert.throws(() => runBacktest(sample, { ...settings, trainSize: 0 }));
  });
});
