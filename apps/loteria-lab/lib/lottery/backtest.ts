import { matchCount, matchProbability, summarize } from "./math.ts";
import { sampleTicket, seededRandom } from "./generator.ts";
import type { Draw, Strategy } from "./types.ts";
import { MEGASENA } from "./games.ts";

export type BacktestSettings = {
  trainSize: number;
  testSize: number;
  seed: number;
};
export type BacktestResult = ReturnType<typeof runBacktest>;

export function runBacktest(draws: Draw[], settings: BacktestSettings) {
  const { trainSize, testSize, seed } = settings;
  if (
    !Number.isInteger(trainSize) ||
    trainSize < 30 ||
    trainSize > 1000 ||
    !Number.isInteger(testSize) ||
    testSize < 10 ||
    testSize > 1000 ||
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 4294967295
  )
    throw new Error(
      "Use uma janela de 30 a 1.000 concursos, teste de 10 a 1.000 e semente inteira de 0 a 4.294.967.295.",
    );
  if (draws.length < trainSize + testSize)
    throw new Error(
      `São necessários ${trainSize + testSize} concursos para esta configuração.`,
    );
  const strategies: Strategy[] = ["uniform", "frequent", "infrequent", "pairs"];
  const results = strategies.map((strategy) => ({
    strategy,
    distribution: Array<number>(7).fill(0),
    totalHits: 0,
    averageHits: 0,
    fourOrMore: 0,
    timeline: [] as { contest: number; average: number }[],
    examples: [] as {
      contest: number;
      trainingEnd: number;
      ticket: number[];
      actual: number[];
      hits: number;
    }[],
  }));
  const start = draws.length - testSize;
  for (let index = start; index < draws.length; index++) {
    // The current draw and all future draws are deliberately excluded.
    const training = draws.slice(index - trainSize, index);
    const stats = summarize(training);
    const target = draws[index];
    for (let s = 0; s < strategies.length; s++) {
      const random = seededRandom(
        (seed ^
          Math.imul(target.contest, 2654435761) ^
          Math.imul(s + 1, 1597334677)) >>>
          0,
      );
      const ticket = sampleTicket(
        stats,
        {
          strategy: strategies[s],
          size: 6,
          count: 1,
          fixed: [],
          excluded: [],
          balanced: false,
        },
        random,
      );
      const hits = matchCount(ticket, target.numbers);
      const result = results[s];
      result.distribution[hits]++;
      result.totalHits += hits;
      if (hits >= 4) result.fourOrMore++;
      result.timeline.push({
        contest: target.contest,
        average: result.totalHits / (index - start + 1),
      });
      if (index >= draws.length - 5)
        result.examples.push({
          contest: target.contest,
          trainingEnd: training.at(-1)!.contest,
          ticket,
          actual: target.numbers,
          hits,
        });
    }
  }
  for (const result of results)
    result.averageHits = result.totalHits / testSize;
  const expectedHits = 0.6;
  const standardError = Math.sqrt((6 * 0.1 * 0.9 * 54) / 59 / testSize);
  return {
    settings,
    firstContest: draws[start].contest,
    lastContest: draws.at(-1)!.contest,
    results,
    expectedHits,
    baselineInterval: [
      Math.max(0, expectedHits - 1.96 * standardError),
      expectedHits + 1.96 * standardError,
    ],
    expectedDistribution: Array.from(
      { length: 7 },
      (_, k) => matchProbability(6, k) * testSize,
    ),
    equivalentCurrentCost: testSize * MEGASENA.simplePrice,
  };
}
