import { choose, matchCount, TOTAL_COMBINATIONS } from "./math.ts";
import type { GenerationObjective } from "./types.ts";

type PrizeThreshold = 4 | 6;

function assertSize(size: number) {
  if (!Number.isInteger(size) || size < 6 || size > 20)
    throw new Error("Escolha de 6 a 20 dezenas por jogo.");
}

/** Number of six-ball outcomes that award at least the requested match count. */
export function winningOutcomeCount(
  size: number,
  threshold: PrizeThreshold = 4,
) {
  assertSize(size);
  let total = 0;
  for (let hits = threshold; hits <= 6; hits++)
    total += choose(size, hits) * choose(60 - size, 6 - hits);
  return total;
}

const intersectionCache = new Map<string, number>();

/** Exact intersection of two winning events, including expanded tickets. */
export function winningIntersectionCount(
  sizeA: number,
  sizeB: number,
  shared: number,
  threshold: PrizeThreshold = 4,
) {
  assertSize(sizeA);
  assertSize(sizeB);
  if (
    !Number.isInteger(shared) ||
    shared < 0 ||
    shared > Math.min(sizeA, sizeB)
  )
    throw new Error("Interseção inválida entre os jogos.");
  if (threshold === 6) return choose(shared, 6);
  // Two events requiring four matches need at least two shared numbers.
  if (shared < 2) return 0;
  const key = `${Math.min(sizeA, sizeB)}:${Math.max(sizeA, sizeB)}:${shared}`;
  const cached = intersectionCache.get(key);
  if (cached !== undefined) return cached;
  let total = 0;
  for (let common = 0; common <= Math.min(shared, 6); common++) {
    for (
      let onlyA = 0;
      onlyA <= Math.min(sizeA - shared, 6 - common);
      onlyA++
    ) {
      if (common + onlyA < 4) continue;
      for (
        let onlyB = 0;
        onlyB <= Math.min(sizeB - shared, 6 - common - onlyA);
        onlyB++
      ) {
        if (common + onlyB < 4) continue;
        const neither = 6 - common - onlyA - onlyB;
        total +=
          choose(shared, common) *
          choose(sizeA - shared, onlyA) *
          choose(sizeB - shared, onlyB) *
          choose(60 - sizeA - sizeB + shared, neither);
      }
    }
  }
  intersectionCache.set(key, total);
  return total;
}

/**
 * Certified bounds, not a Monte Carlo estimate or confidence interval.
 * Lower: second-order Bonferroni, also at least the largest single event.
 * Upper: Hunter's spanning-tree bound, using a maximum-weight tree.
 * Bounds coincide for one/two tickets and mutually exclusive winning events.
 */
export function anyPrizeCoverage(tickets: number[][]) {
  for (const ticket of tickets) {
    assertSize(ticket.length);
    if (
      new Set(ticket).size !== ticket.length ||
      ticket.some((n) => !Number.isInteger(n) || n < 1 || n > 60)
    )
      throw new Error("Jogo inválido.");
  }
  const individual = tickets.map((ticket) =>
    winningOutcomeCount(ticket.length),
  );
  const sum = individual.reduce((total, n) => total + n, 0);
  const intersections = tickets.map(() =>
    Array<number>(tickets.length).fill(0),
  );
  let pairSum = 0;
  let maxSharedNumbers = 0;
  for (let i = 0; i < tickets.length; i++) {
    for (let j = i + 1; j < tickets.length; j++) {
      const shared = matchCount(tickets[i], tickets[j]);
      maxSharedNumbers = Math.max(maxSharedNumbers, shared);
      const overlap = winningIntersectionCount(
        tickets[i].length,
        tickets[j].length,
        shared,
      );
      intersections[i][j] = intersections[j][i] = overlap;
      pairSum += overlap;
    }
  }
  const visited = new Set<number>();
  const bestEdge = Array<number>(tickets.length).fill(0);
  let treeWeight = 0;
  for (let step = 0; step < tickets.length; step++) {
    let next = -1;
    for (let i = 0; i < tickets.length; i++)
      if (!visited.has(i) && (next < 0 || bestEdge[i] > bestEdge[next]))
        next = i;
    treeWeight += bestEdge[next];
    visited.add(next);
    for (let j = 0; j < tickets.length; j++)
      if (!visited.has(j))
        bestEdge[j] = Math.max(bestEdge[j], intersections[next][j]);
  }
  const lowerOutcomes = Math.max(0, ...individual, sum - pairSum);
  const upperOutcomes = Math.min(TOTAL_COMBINATIONS, sum - treeWeight);
  return {
    lowerOutcomes,
    upperOutcomes,
    lowerProbability: lowerOutcomes / TOTAL_COMBINATIONS,
    upperProbability: upperOutcomes / TOTAL_COMBINATIONS,
    exact: lowerOutcomes === upperOutcomes,
    maxSharedNumbers,
  };
}

/**
 * Greedy search among valid, unique candidates. Minimizes pair intersections,
 * improving the second-order union bound; it is not a global union optimizer.
 * In Sena mode, distinct simple tickets tie and retain eligible candidate order.
 * When groupBy is supplied, first restrict to the least represented available
 * methods. This balances the collection; overlap is optimized within that round.
 */
export function selectPortfolio<T extends { numbers: number[] }>(
  candidates: T[],
  count: number,
  objective: GenerationObjective,
  groupBy?: (candidate: T) => string,
): T[] {
  const remaining = candidates.map((candidate) => ({
    candidate,
    group: groupBy?.(candidate),
    overlap: 0,
    spread: 0,
  }));
  const selected: T[] = [];
  const groupCounts = new Map<string, number>();
  const threshold = objective === "sena" ? 6 : 4;
  while (selected.length < count && remaining.length) {
    const minimumCount = groupBy
      ? Math.min(...remaining.map((item) => groupCounts.get(item.group!) ?? 0))
      : 0;
    let best = -1;
    for (let i = 0; i < remaining.length; i++) {
      if (groupBy && (groupCounts.get(remaining[i].group!) ?? 0) > minimumCount)
        continue;
      if (
        best < 0 ||
        remaining[i].overlap < remaining[best].overlap ||
        (objective === "any-prize" &&
          remaining[i].overlap === remaining[best].overlap &&
          remaining[i].spread < remaining[best].spread)
      )
        best = i;
    }
    const [{ candidate: next, group }] = remaining.splice(best, 1);
    selected.push(next);
    if (group !== undefined)
      groupCounts.set(group, (groupCounts.get(group) ?? 0) + 1);
    for (const item of remaining) {
      const shared = matchCount(item.candidate.numbers, next.numbers);
      item.overlap += winningIntersectionCount(
        item.candidate.numbers.length,
        next.numbers.length,
        shared,
        threshold,
      );
      item.spread += shared * shared;
    }
  }
  return selected;
}
