import { choose, evenCount, sumOf, summarize, type Summary } from "./math.ts";
import { selectPortfolio } from "./portfolio.ts";
import { STRATEGIES } from "./games.ts";
import type {
  Draw,
  GeneratorOptions,
  MethodContribution,
  Strategy,
} from "./types.ts";

export type RandomSource = () => number;
export const secureRandom: RandomSource = () =>
  crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;

/** Mulberry32, for reproducible experiments only; never the default generator. */
export function seededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedIndex(weights: number[], random: RandomSource) {
  const total = sumOf(weights);
  let threshold = random() * total;
  for (let i = 0; i < weights.length; i++) {
    threshold -= weights[i];
    if (threshold < 0) return i;
  }
  return weights.length - 1;
}

function assertOptions(options: GeneratorOptions, summary: Summary) {
  if (
    options.objective !== undefined &&
    !["sena", "any-prize"].includes(options.objective)
  )
    throw new Error("Objetivo desconhecido.");
  if (
    !["uniform", "frequent", "infrequent", "pairs", "ensemble"].includes(
      options.strategy,
    )
  )
    throw new Error("Método desconhecido.");
  if (!Number.isInteger(options.size) || options.size < 6 || options.size > 20)
    throw new Error("Escolha de 6 a 20 dezenas por jogo.");
  if (
    !Number.isInteger(options.count) ||
    options.count < 1 ||
    options.count > 20
  )
    throw new Error("Gere de 1 a 20 jogos por vez.");
  for (const values of [options.fixed, options.excluded])
    if (
      new Set(values).size !== values.length ||
      values.some((n) => !Number.isInteger(n) || n < 1 || n > 60)
    )
      throw new Error("Dezenas fixas ou excluídas inválidas.");
  if (options.fixed.some((n) => options.excluded.includes(n)))
    throw new Error(
      "Uma dezena não pode estar fixa e excluída ao mesmo tempo.",
    );
  if (options.fixed.length > options.size)
    throw new Error("Há mais dezenas fixas do que vagas no jogo.");
  const available = Array.from({ length: 60 }, (_, i) => i + 1).filter(
    (n) => !options.excluded.includes(n) && !options.fixed.includes(n),
  );
  const remaining = options.size - options.fixed.length;
  if (available.length < remaining)
    throw new Error("Restam poucas dezenas disponíveis para este jogo.");
  if (choose(available.length, remaining) < options.count)
    throw new Error(
      "Não existem jogos distintos suficientes com essas dezenas fixas e excluídas.",
    );
  if (options.strategy !== "uniform" && !summary.count)
    throw new Error("Selecione um período com resultados para este método.");
  if (
    [options.minSum, options.maxSum].some(
      (n) => n !== undefined && (!Number.isInteger(n) || !Number.isFinite(n)),
    )
  )
    throw new Error("Os limites da soma devem ser números inteiros.");
  if ((options.minSum ?? 0) > (options.maxSum ?? Infinity))
    throw new Error("A soma mínima deve ser menor ou igual à máxima.");
  const minPossible =
    sumOf(options.fixed) + sumOf(available.slice(0, remaining));
  const maxPossible =
    sumOf(options.fixed) + sumOf(remaining ? available.slice(-remaining) : []);
  if (
    (options.minSum ?? 0) > maxPossible ||
    (options.maxSum ?? Infinity) < minPossible
  )
    throw new Error(
      `A soma possível com estas dezenas fica entre ${minPossible} e ${maxPossible}.`,
    );
  if (options.balanced) {
    const even = evenCount(options.fixed);
    const evenAvailable = evenCount(available);
    const possible = [
      Math.floor(options.size / 2),
      Math.ceil(options.size / 2),
    ].some(
      (target) =>
        target >= even &&
        target - even <= Math.min(remaining, evenAvailable) &&
        remaining - target + even <= available.length - evenAvailable,
    );
    if (!possible)
      throw new Error(
        "As dezenas fixas e excluídas impedem o equilíbrio entre pares e ímpares.",
      );
  }
}

type SingleMethodOptions = Omit<GeneratorOptions, "strategy"> & {
  strategy: Strategy;
};
type TicketSelection = {
  numbers: number[];
  seedPair: number[] | null;
  strategy: Strategy;
};

function sampleWithTrace(
  summary: Summary,
  options: SingleMethodOptions,
  random: RandomSource,
): TicketSelection {
  const selected = [...options.fixed];
  let seedPair: number[] | null = null;
  if (options.strategy === "pairs" && selected.length < options.size) {
    const candidates = summary.pairs.slice(0, 20).filter((pair) => {
      const freeNumbers = pair.numbers.filter(
        (n) => !selected.includes(n),
      ).length;
      return (
        pair.numbers.every((n) => !options.excluded.includes(n)) &&
        freeNumbers > 0 &&
        freeNumbers <= options.size - selected.length
      );
    });
    if (candidates.length) {
      const pair =
        candidates[
          weightedIndex(
            candidates.map((p) => p.count + 1),
            random,
          )
        ];
      seedPair = [...pair.numbers];
      for (const n of pair.numbers) if (!selected.includes(n)) selected.push(n);
    }
  }
  const remaining = summary.numbers.filter(
    (stat) =>
      !selected.includes(stat.number) &&
      !options.excluded.includes(stat.number),
  );
  const maxCount = Math.max(...summary.numbers.map((stat) => stat.count));
  while (selected.length < options.size) {
    const weights = remaining.map((stat) =>
      options.strategy === "frequent"
        ? stat.count + 1
        : options.strategy === "infrequent"
          ? maxCount - stat.count + 1
          : 1,
    );
    const index = weightedIndex(weights, random);
    selected.push(remaining[index].number);
    remaining.splice(index, 1);
  }
  return {
    numbers: selected.sort((a, b) => a - b),
    seedPair,
    strategy: options.strategy,
  };
}

export function sampleTicket(
  summary: Summary,
  options: SingleMethodOptions,
  random: RandomSource,
): number[] {
  return sampleWithTrace(summary, options, random).numbers;
}

export function generateTickets(
  draws: Draw[],
  options: GeneratorOptions,
  random: RandomSource = secureRandom,
) {
  const summary = summarize(draws);
  assertOptions(options, summary);
  const objective = options.objective ?? "sena";
  const ensemble = options.strategy === "ensemble";
  const methods: Strategy[] = ensemble
    ? (Object.keys(STRATEGIES) as Strategy[])
    : [options.strategy as Strategy];
  // Randomize priority so smaller collections and partial rounds do not always
  // favor the first listed method. Each method retains its actual sampling trace.
  if (ensemble)
    for (let i = methods.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [methods[i], methods[j]] = [methods[j], methods[i]];
    }
  const candidates: TicketSelection[] = [];
  const needsSearch =
    ensemble ||
    (options.count > 1 && (objective === "any-prize" || options.size > 6));
  const candidateTarget = Math.min(
    needsSearch ? Math.max(64, options.count * 16) : options.count,
    choose(
      60 - options.excluded.length - options.fixed.length,
      options.size - options.fixed.length,
    ),
  );
  const seen = new Set<string>();
  let attempts = 0;
  const quota = Math.ceil(candidateTarget / methods.length);
  const attemptLimit = Math.floor(20000 / methods.length);
  for (const strategy of methods) {
    let methodAttempts = 0;
    let methodCandidates = 0;
    while (
      methodCandidates < quota &&
      candidates.length < candidateTarget &&
      methodAttempts < attemptLimit
    ) {
      attempts++;
      methodAttempts++;
      const selection = sampleWithTrace(
        summary,
        { ...options, strategy },
        random,
      );
      const ticket = selection.numbers;
      const even = evenCount(ticket);
      const sum = sumOf(ticket);
      if (options.balanced && Math.abs(even - (options.size - even)) > 1)
        continue;
      if (sum < (options.minSum ?? 0) || sum > (options.maxSum ?? Infinity))
        continue;
      const key = ticket.join("-");
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(selection);
      methodCandidates++;
    }
  }
  if (!candidates.length)
    throw new Error(
      "Nenhum jogo encontrado com estes filtros. Amplie os limites da soma ou remova restrições.",
    );
  const selections = selectPortfolio(
    candidates,
    options.count,
    objective,
    ensemble ? (candidate) => candidate.strategy : undefined,
  );
  const tickets = selections.map((selection) => selection.numbers);
  const contributions: MethodContribution[] = (
    Object.keys(STRATEGIES) as Strategy[]
  )
    .filter((strategy) => methods.includes(strategy))
    .map((strategy) => ({
      strategy,
      candidates: candidates.filter(
        (candidate) => candidate.strategy === strategy,
      ).length,
      selected: selections.filter(
        (selection) => selection.strategy === strategy,
      ).length,
    }));
  return {
    tickets,
    selections,
    attempts,
    complete: tickets.length === options.count,
    candidatesConsidered: candidates.length,
    methods: contributions,
    objective,
  };
}

const numberLabel = (n: number) => String(n).padStart(2, "0");

export function explainTicket(
  numbers: number[],
  summary: Summary,
  strategy: Strategy,
  context: { fixed?: number[]; seedPair?: number[] | null } = {},
): string[] {
  const fixed = context.fixed ?? [];
  const ranked = summary.numbers
    .filter(
      (stat) => numbers.includes(stat.number) && !fixed.includes(stat.number),
    )
    .sort(
      (a, b) =>
        (strategy === "infrequent" ? a.count - b.count : b.count - a.count) ||
        a.number - b.number,
    );
  const pair = context.seedPair
    ? summary.pairs.find(
        (pair) => pair.numbers.join("-") === context.seedPair!.join("-"),
      )
    : null;
  const reasoning: string[] = [];
  if (!ranked.length)
    reasoning.push(
      "Todas as dezenas foram fixadas por você; o método não fez uma seleção aleatória.",
    );
  else if (strategy === "uniform")
    reasoning.push(
      "Na escolha inicial, todas as dezenas disponíveis tiveram o mesmo peso. Seus filtros foram respeitados.",
    );
  else if (strategy === "pairs") {
    if (pair)
      reasoning.push(
        `A seleção partiu da dupla ${pair.numbers.map(numberLabel).join(" e ")}, que saiu junta ${pair.count} vezes no período. Ela foi sorteada entre as 20 duplas mais recorrentes compatíveis; as demais dezenas foram escolhidas com pesos iguais.`,
      );
    else
      reasoning.push(
        context.seedPair === null
          ? "Nenhuma das 20 duplas mais recorrentes coube nas vagas livres e nas restrições. Essas vagas foram preenchidas com pesos iguais."
          : "O método tenta usar uma das 20 duplas mais recorrentes compatíveis e preenche as vagas restantes com pesos iguais.",
      );
  } else {
    const lead = ranked[0];
    reasoning.push(
      `O sorteio deu mais peso às dezenas que apareceram ${strategy === "frequent" ? "mais" : "menos"} no período. Entre as escolhidas, ${numberLabel(lead.number)} saiu ${lead.count} vezes em ${summary.count} concursos (${(lead.rate * 100).toFixed(1).replace(".", ",")}%).`,
    );
  }
  if (fixed.length && ranked.length)
    reasoning.push(
      `Fixadas por você: ${fixed.map(numberLabel).join(", ")}. Essas dezenas não participaram da escolha aleatória.`,
    );
  reasoning.push(
    `${evenCount(numbers)} pares e ${numbers.length - evenCount(numbers)} ímpares; soma ${sumOf(numbers)}.`,
  );
  if (numbers.length === 6) {
    const repeated = summary.repeatedResults.find(
      (result) => result.numbers.join("-") === numbers.join("-"),
    );
    reasoning.push(
      repeated
        ? `Esta combinação consta ${repeated.count} vezes na janela. Repetição não aumenta sua chance futura.`
        : "A chance teórica deste jogo é a mesma de qualquer outro jogo de 6 dezenas.",
    );
  } else
    reasoning.push(
      "As dezenas extras cobrem mais combinações simples; custo e chance crescem na mesma proporção.",
    );
  return reasoning;
}
