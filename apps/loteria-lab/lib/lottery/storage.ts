import type { GeneratorOptions, SavedGame, Strategy } from "./types.ts";

const strategies = ["uniform", "frequent", "infrequent", "pairs"];
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const positive = (v: unknown): v is number =>
  Number.isSafeInteger(v) && (v as number) > 0;
const nonnegative = (v: unknown): v is number =>
  Number.isSafeInteger(v) && (v as number) >= 0;
const numbers = (v: unknown, min = 0, max = 60): v is number[] =>
  Array.isArray(v) &&
  v.length >= min &&
  v.length <= max &&
  new Set(v).size === v.length &&
  v.every((n) => Number.isInteger(n) && n >= 1 && n <= 60);
const strategy = (v: unknown): v is Strategy =>
  typeof v === "string" && strategies.includes(v);

export function validGeneratorOptions(v: unknown): v is GeneratorOptions {
  if (!object(v)) return false;
  return (
    (strategy(v.strategy) || v.strategy === "ensemble") &&
    (v.objective === undefined ||
      v.objective === "sena" ||
      v.objective === "any-prize") &&
    positive(v.size) &&
    v.size >= 6 &&
    v.size <= 20 &&
    positive(v.count) &&
    v.count <= 100 &&
    numbers(v.fixed) &&
    v.fixed.length <= v.size &&
    numbers(v.excluded) &&
    !v.fixed.some((n) => (v.excluded as number[]).includes(n)) &&
    typeof v.balanced === "boolean" &&
    (v.minSum === undefined ||
      (Number.isInteger(v.minSum) &&
        (v.minSum as number) >= 0 &&
        (v.minSum as number) <= 1200)) &&
    (v.maxSum === undefined ||
      (Number.isInteger(v.maxSum) &&
        (v.maxSum as number) >= 0 &&
        (v.maxSum as number) <= 1200)) &&
    (v.minSum === undefined ||
      v.maxSum === undefined ||
      (v.minSum as number) <= (v.maxSum as number))
  );
}
export function validSavedGame(v: unknown): v is SavedGame {
  if (
    !object(v) ||
    typeof v.id !== "string" ||
    !v.id ||
    typeof v.createdAt !== "string" ||
    !Number.isFinite(Date.parse(v.createdAt)) ||
    !strategy(v.strategy) ||
    !numbers(v.numbers, 6, 20) ||
    !positive(v.trainingStart) ||
    !positive(v.trainingEnd) ||
    v.trainingEnd < v.trainingStart ||
    !positive(v.trainingCount) ||
    typeof v.constraints !== "string" ||
    !Array.isArray(v.reasoning) ||
    !v.reasoning.every((s) => typeof s === "string") ||
    (v.dataFingerprint !== undefined &&
      (typeof v.dataFingerprint !== "string" ||
        !/^[a-f0-9]{64}$/.test(v.dataFingerprint))) ||
    (v.generatorOptions !== undefined &&
      (!validGeneratorOptions(v.generatorOptions) ||
        v.generatorOptions.size !== v.numbers.length))
  )
    return false;
  if (v.generation !== undefined) {
    const g = v.generation;
    if (
      !object(g) ||
      (g.version !== "coverage-v1" && g.version !== "ensemble-v1") ||
      typeof g.portfolioId !== "string" ||
      !g.portfolioId ||
      !positive(g.portfolioSize) ||
      g.portfolioSize > 100 ||
      !nonnegative(g.candidatesConsidered) ||
      (g.methods !== undefined &&
        (!Array.isArray(g.methods) ||
          !g.methods.every(
            (m) =>
              object(m) &&
              strategy(m.strategy) &&
              nonnegative(m.candidates) &&
              nonnegative(m.selected) &&
              m.selected <= m.candidates,
          )))
    )
      return false;
  }
  return true;
}
export function parseSavedCollection(raw: string): SavedGame[] {
  if (raw.length > 2_000_000)
    throw new Error("Arquivo de jogos excede o limite de 2 MB.");
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    throw new Error("JSON inválido.");
  }
  if (
    !object(v) ||
    (v.schemaVersion !== undefined &&
      v.schemaVersion !== 1 &&
      v.schemaVersion !== 2) ||
    (v.game !== undefined && v.game !== "megasena") ||
    !Array.isArray(v.games) ||
    v.games.length > 500 ||
    !v.games.every(validSavedGame)
  )
    throw new Error("Arquivo de jogos inválido ou versão não reconhecida.");
  return v.games;
}
export function mergeSavedGames(existing: SavedGame[], incoming: SavedGame[]) {
  const games = [...existing];
  let added = 0,
    duplicates = 0,
    collisions = 0;
  const ids = new Map(existing.map((g) => [g.id, g]));
  for (const g of incoming) {
    const old = ids.get(g.id);
    if (old) {
      if (JSON.stringify(old) === JSON.stringify(g)) duplicates++;
      else collisions++;
      continue;
    }
    ids.set(g.id, g);
    games.push(g);
    added++;
  }
  return { games, added, duplicates, collisions };
}
