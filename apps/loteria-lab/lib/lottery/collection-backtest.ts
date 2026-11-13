import { generateTickets, sampleTicket, seededRandom } from "./generator.ts";
import {
  choose,
  evenCount,
  matchCount,
  portfolioMetrics,
  sumOf,
  summarize,
} from "./math.ts";
import { anyPrizeCoverage, selectPortfolio } from "./portfolio.ts";
import type { Draw, GeneratorOptions } from "./types.ts";

export type CollectionSettings = {
  trainSize: number;
  testSize: number;
  seed: number;
  seeds: number;
  options: GeneratorOptions;
};
type Outcome = {
  tickets: number[][];
  maxHits: number;
  prizeTickets: number;
  four: number;
  five: number;
  six: number;
  anyPrize: number;
  jackpot: number;
  jackpotProbability: number;
  prizeLower: number;
  prizeUpper: number;
};
const names = ["ensemble", "uniform", "uniformOptimized"] as const;
type Name = (typeof names)[number];

function outcome(tickets: number[][], target: number[]): Outcome {
  const hits = tickets.map((ticket) => matchCount(ticket, target));
  const coverage = anyPrizeCoverage(tickets);
  return {
    tickets,
    maxHits: Math.max(...hits),
    prizeTickets: hits.filter((n) => n >= 4).length,
    four: hits.filter((n) => n === 4).length,
    five: hits.filter((n) => n === 5).length,
    six: hits.filter((n) => n === 6).length,
    anyPrize: Number(hits.some((n) => n >= 4)),
    jackpot: Number(hits.some((n) => n >= 6)),
    jackpotProbability: portfolioMetrics(tickets).probability,
    prizeLower: coverage.lowerProbability,
    prizeUpper: coverage.upperProbability,
  };
}

/** Fixed protocol: one ensemble and two uniform controls per contest and seed. */
export function runCollectionBacktest(
  draws: Draw[],
  settings: CollectionSettings,
  progress?: (completed: number, total: number) => void,
) {
  const { trainSize, testSize, seed, seeds } = settings;
  const options = { ...settings.options, strategy: "ensemble" as const };
  if (
    !Number.isInteger(trainSize) ||
    trainSize < 30 ||
    trainSize > 1000 ||
    !Number.isInteger(testSize) ||
    testSize < 10 ||
    testSize > 100 ||
    !Number.isInteger(seeds) ||
    seeds < 1 ||
    seeds > 5 ||
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 4294967295
  )
    throw new Error(
      "Use janela de 30 a 1.000, teste de 10 a 100, 1 a 5 sementes e semente inicial válida.",
    );
  if (draws.length < trainSize + testSize)
    throw new Error(
      `São necessários ${trainSize + testSize} concursos para esta configuração.`,
    );
  if (
    !Number.isInteger(options.size) ||
    options.size < 6 ||
    options.size > 20 ||
    !Number.isInteger(options.count) ||
    options.count < 1 ||
    options.count > 20
  )
    throw new Error("Escolha de 6 a 20 dezenas e de 1 a 20 jogos.");
  if (choose(options.size, 6) * options.count * testSize * seeds * 3 > 6000000)
    throw new Error(
      "Esta configuração exige cobertura demais para o navegador. Reduza jogos, dezenas, concursos ou sementes.",
    );
  const contests: {
    contest: number;
    trainingEnd: number;
    runs: {
      seed: number;
      candidates: number;
      outcomes: Record<Name, Outcome>;
    }[];
  }[] = [];
  for (let index = draws.length - testSize; index < draws.length; index++) {
    const training = draws.slice(index - trainSize, index);
    const target = draws[index];
    const summary = summarize(training);
    const runs = [];
    for (let s = 0; s < seeds; s++) {
      const runSeed = (seed + s) >>> 0;
      const mix = (runSeed ^ Math.imul(target.contest, 2654435761)) >>> 0;
      const generated = generateTickets(training, options, seededRandom(mix));
      if (!generated.complete)
        throw new Error(
          "A coleção ficou incompleta com estes filtros; amplie as restrições para comparar orçamentos iguais.",
        );
      const random = seededRandom((mix ^ 0xa5a5a5a5) >>> 0);
      const candidates: { numbers: number[] }[] = [];
      const seen = new Set<string>();
      for (
        let attempt = 0;
        attempt < 20000 && candidates.length < generated.candidatesConsidered;
        attempt++
      ) {
        const ticket = sampleTicket(
          summary,
          { ...options, strategy: "uniform" },
          random,
        );
        const even = evenCount(ticket),
          sum = sumOf(ticket);
        if (
          (options.balanced && Math.abs(even - (options.size - even)) > 1) ||
          sum < (options.minSum ?? 0) ||
          sum > (options.maxSum ?? Infinity)
        )
          continue;
        const key = ticket.join("-");
        if (!seen.has(key)) {
          seen.add(key);
          candidates.push({ numbers: ticket });
        }
      }
      if (
        candidates.length !== generated.candidatesConsidered ||
        candidates.length < options.count
      )
        throw new Error(
          "Não foi possível obter o mesmo número de candidatos uniformes com estes filtros.",
        );
      const raw = candidates.slice(0, options.count).map((c) => c.numbers);
      const optimized = selectPortfolio(
        candidates,
        options.count,
        options.objective ?? "sena",
      ).map((c) => c.numbers);
      runs.push({
        seed: runSeed,
        candidates: candidates.length,
        outcomes: {
          ensemble: outcome(generated.tickets, target.numbers),
          uniform: outcome(raw, target.numbers),
          uniformOptimized: outcome(optimized, target.numbers),
        },
      });
    }
    contests.push({
      contest: target.contest,
      trainingEnd: training.at(-1)!.contest,
      runs,
    });
    progress?.(contests.length, testSize);
  }
  const metrics = [
    "maxHits",
    "prizeTickets",
    "four",
    "five",
    "six",
    "anyPrize",
    "jackpot",
    "jackpotProbability",
    "prizeLower",
    "prizeUpper",
  ] as const;
  const results = names.map((name) => ({
    name,
    ...Object.fromEntries(
      metrics.map((metric) => [
        metric,
        contests.reduce(
          (total, contest) =>
            total +
            contest.runs.reduce(
              (sum, run) => sum + run.outcomes[name][metric],
              0,
            ) /
              seeds,
          0,
        ) / testSize,
      ]),
    ),
  })) as (Record<(typeof metrics)[number], number> & { name: Name })[];
  // Seeds share the same draw; average them within each contest before estimating uncertainty.
  const comparisons = (["uniform", "uniformOptimized"] as const).map(
    (baseline) => {
      const differences = contests.map(
        (contest) =>
          contest.runs.reduce(
            (sum, run) =>
              sum +
              run.outcomes.ensemble.maxHits -
              run.outcomes[baseline].maxHits,
            0,
          ) / seeds,
      );
      const mean = differences.reduce((a, b) => a + b, 0) / differences.length;
      const variance =
        differences.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
        (differences.length - 1);
      const margin = 1.96 * Math.sqrt(variance / differences.length);
      return {
        baseline,
        metric: "maxHits" as const,
        mean,
        interval: [mean - margin, mean + margin],
      };
    },
  );
  return {
    protocol: "collection-v1" as const,
    settings: { ...settings, options },
    firstContest: contests[0].contest,
    lastContest: contests.at(-1)!.contest,
    results,
    comparisons,
    contests,
  };
}
export type CollectionResult = ReturnType<typeof runCollectionBacktest>;
