import type { Draw } from "./types.ts";
import { MEGASENA } from "./games.ts";

export function choose(n: number, k: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || k < 0 || k > n)
    return 0;
  k = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i;
  return Math.round(result);
}

export const TOTAL_COMBINATIONS = choose(60, 6);

/** Exact probability of k matches for a ticket with `size` distinct numbers. */
export function matchProbability(size: number, k: number): number {
  return (choose(size, k) * choose(60 - size, 6 - k)) / TOTAL_COMBINATIONS;
}

export function ticketMetrics(size: number) {
  if (!Number.isInteger(size) || size < 6 || size > 20)
    throw new Error("Escolha de 6 a 20 dezenas.");
  const combinations = choose(size, 6);
  return {
    combinations,
    cost: combinations * MEGASENA.simplePrice,
    jackpotProbability: combinations / TOTAL_COMBINATIONS,
    oneIn: TOTAL_COMBINATIONS / combinations,
  };
}

/** Exact union of six-number subsets, including overlap between larger tickets. */
export function portfolioMetrics(tickets: number[][]) {
  const covered = new Set<string>();
  for (const ticket of tickets) {
    const values = [...ticket].sort((a, b) => a - b);
    if (
      values.length < 6 ||
      values.length > 20 ||
      new Set(values).size !== values.length ||
      values.some((n) => !Number.isInteger(n) || n < 1 || n > 60)
    )
      throw new Error("Jogo inválido.");
    const walk = (start: number, selected: number[]) => {
      if (selected.length === 6) {
        covered.add(selected.join("-"));
        return;
      }
      for (let i = start; i <= values.length - (6 - selected.length); i++)
        walk(i + 1, [...selected, values[i]]);
    };
    walk(0, []);
  }
  const paidCombinations = tickets.reduce(
    (sum, ticket) => sum + choose(ticket.length, 6),
    0,
  );
  return {
    distinctCombinations: covered.size,
    overlappingCombinations: paidCombinations - covered.size,
    cost: paidCombinations * MEGASENA.simplePrice,
    probability: covered.size / TOTAL_COMBINATIONS,
  };
}

export const sumOf = (numbers: number[]) =>
  numbers.reduce((total, n) => total + n, 0);
export const evenCount = (numbers: number[]) =>
  numbers.filter((n) => n % 2 === 0).length;
export const matchCount = (a: number[], b: number[]) =>
  a.filter((n) => b.includes(n)).length;

export type NumberStat = {
  number: number;
  count: number;
  rate: number;
  gap: number;
  lastContest: number | null;
  censored: boolean;
};
export type PairStat = { numbers: [number, number]; count: number };

export function summarize(draws: Draw[]) {
  const counts = Array<number>(61).fill(0);
  const lastSeen = Array<number>(61).fill(-1);
  const pairCounts = new Map<number, number>();
  const parity = Array<number>(7).fill(0);
  const repeats = Array<number>(7).fill(0);
  const sums: number[] = [];
  const fullResults = new Map<
    string,
    { count: number; contests: number[]; numbers: number[] }
  >();
  draws.forEach((draw, index) => {
    for (const number of draw.numbers) {
      counts[number]++;
      lastSeen[number] = index;
    }
    const sorted = [...draw.numbers].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length; i++)
      for (let j = i + 1; j < sorted.length; j++) {
        const key = sorted[i] * 61 + sorted[j];
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    parity[evenCount(draw.numbers)]++;
    if (index > 0)
      repeats[matchCount(draws[index - 1].numbers, draw.numbers)]++;
    sums.push(sumOf(draw.numbers));
    const key = sorted.join("-");
    const existing = fullResults.get(key) ?? {
      count: 0,
      contests: [],
      numbers: sorted,
    };
    existing.count++;
    existing.contests.push(draw.contest);
    fullResults.set(key, existing);
  });
  const numbers: NumberStat[] = Array.from({ length: 60 }, (_, i) => {
    const number = i + 1;
    return {
      number,
      count: counts[number],
      rate: draws.length ? counts[number] / draws.length : 0,
      gap:
        lastSeen[number] < 0
          ? draws.length
          : draws.length - 1 - lastSeen[number],
      lastContest:
        lastSeen[number] < 0 ? null : draws[lastSeen[number]].contest,
      censored: lastSeen[number] < 0,
    };
  });
  const pairs: PairStat[] = [...pairCounts]
    .map(([key, count]) => ({
      numbers: [Math.floor(key / 61), key % 61] as [number, number],
      count,
    }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.numbers[0] - b.numbers[0] ||
        a.numbers[1] - b.numbers[1],
    );
  return {
    count: draws.length,
    numbers,
    pairs,
    sums,
    parity,
    repeats,
    averageSum: sums.length ? sumOf(sums) / sums.length : 0,
    expectedCount: draws.length / 10,
    expectedPairCount: (draws.length * 6 * 5) / (60 * 59),
    repeatedResults: [...fullResults.values()]
      .filter((result) => result.count > 1)
      .sort((a, b) => b.count - a.count),
  };
}

export type Summary = ReturnType<typeof summarize>;

let sumDistribution: number[] | undefined;
/** Exact distribution of sums, by counting subsets without replacement. */
export function theoreticalSumDistribution(): number[] {
  if (sumDistribution) return sumDistribution;
  const dp = Array.from({ length: 7 }, () => Array<number>(346).fill(0));
  dp[0][0] = 1;
  for (let value = 1; value <= 60; value++) {
    for (let count = 6; count >= 1; count--) {
      for (let sum = 345; sum >= value; sum--)
        dp[count][sum] += dp[count - 1][sum - value];
    }
  }
  sumDistribution = dp[6].map((count) => count / TOTAL_COMBINATIONS);
  return sumDistribution;
}

export const SUM_BINS = [
  [21, 80],
  [81, 120],
  [121, 160],
  [161, 200],
  [201, 240],
  [241, 280],
  [281, 345],
] as const;

export function canonicalDraws(draws: Draw[]) {
  return JSON.stringify(
    draws.map((draw) => [draw.contest, draw.date, ...draw.numbers]),
  );
}

export function validateDraws(
  value: unknown,
  requireComplete = true,
): asserts value is Draw[] {
  if (!Array.isArray(value) || !value.length)
    throw new Error("A base não contém concursos.");
  const seen = new Set<number>();
  let previousDate = "";
  let previousContest = 0;
  for (const item of value) {
    if (!item || typeof item !== "object")
      throw new Error("Formato de concurso inválido.");
    const draw = item as Draw;
    if (
      !Number.isInteger(draw.contest) ||
      draw.contest < 1 ||
      seen.has(draw.contest) ||
      draw.contest <= previousContest
    )
      throw new Error("Concurso repetido ou fora de ordem.");
    if (requireComplete && draw.contest !== previousContest + 1)
      throw new Error("Há lacunas na sequência de concursos.");
    if (
      typeof draw.date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(draw.date) ||
      !Number.isFinite(Date.parse(draw.date)) ||
      new Date(draw.date).toISOString().slice(0, 10) !== draw.date ||
      draw.date < previousDate ||
      draw.date > new Date().toISOString().slice(0, 10)
    )
      throw new Error("Data de sorteio inválida.");
    if (
      !Array.isArray(draw.numbers) ||
      draw.numbers.length !== 6 ||
      new Set(draw.numbers).size !== 6 ||
      draw.numbers.some(
        (n, i, a) =>
          !Number.isInteger(n) || n < 1 || n > 60 || (i > 0 && n <= a[i - 1]),
      )
    )
      throw new Error(
        "O concurso deve conter seis dezenas únicas, ordenadas, de 01 a 60.",
      );
    if (
      !Array.isArray(draw.winners) ||
      draw.winners.length !== 3 ||
      draw.winners.some((n) => !Number.isInteger(n) || n < 0)
    )
      throw new Error("Quantidade de ganhadores inválida.");
    if (
      !Array.isArray(draw.prizes) ||
      draw.prizes.length !== 3 ||
      draw.prizes.some(
        (n) =>
          n !== null && (typeof n !== "number" || !Number.isFinite(n) || n < 0),
      )
    )
      throw new Error("Rateio inválido.");
    seen.add(draw.contest);
    previousDate = draw.date;
    previousContest = draw.contest;
  }
}
