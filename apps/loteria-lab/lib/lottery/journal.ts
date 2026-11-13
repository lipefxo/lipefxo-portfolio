import type { Draw, GeneratorOptions } from "./types.ts";
import { evenCount, matchCount, sumOf, ticketMetrics } from "./math.ts";
import { validGeneratorOptions } from "./storage.ts";

export type JournalRecord = {
  version: 1;
  id: string;
  registeredAt: string;
  provenance: "local" | "imported";
  options: GeneratorOptions;
  budget: number;
  fingerprint: string;
  tickets: number[][];
  trainingCutoff: number;
  targetFirst: number;
  targetLast: number;
  latestKnown: number;
};
export function validJournalRecord(v: unknown): v is JournalRecord {
  if (!v || typeof v !== "object") return false;
  const r = v as JournalRecord;
  return (
    r.version === 1 &&
    typeof r.id === "string" &&
    !!r.id &&
    typeof r.registeredAt === "string" &&
    Number.isFinite(Date.parse(r.registeredAt)) &&
    (r.provenance === "local" || r.provenance === "imported") &&
    validGeneratorOptions(r.options) &&
    typeof r.fingerprint === "string" &&
    /^[a-f0-9]{64}$/.test(r.fingerprint) &&
    Array.isArray(r.tickets) &&
    r.tickets.length > 0 &&
    r.tickets.length <= 100 &&
    r.tickets.every(
      (t) =>
        Array.isArray(t) &&
        t.length >= 6 &&
        t.length <= 20 &&
        new Set(t).size === t.length &&
        t.every((n) => Number.isInteger(n) && n >= 1 && n <= 60),
    ) &&
    r.options.count === r.tickets.length &&
    r.tickets.every(
      (t) =>
        t.length === r.options.size &&
        r.options.fixed.every((n) => t.includes(n)) &&
        r.options.excluded.every((n) => !t.includes(n)) &&
        (!r.options.balanced ||
          Math.abs(evenCount(t) - (t.length - evenCount(t))) <= 1) &&
        (r.options.minSum === undefined || sumOf(t) >= r.options.minSum) &&
        (r.options.maxSum === undefined || sumOf(t) <= r.options.maxSum),
    ) &&
    new Set(r.tickets.map((t) => [...t].sort((a, b) => a - b).join(",")))
      .size === r.tickets.length &&
    Number.isSafeInteger(r.trainingCutoff) &&
    r.trainingCutoff > 0 &&
    Number.isSafeInteger(r.targetFirst) &&
    Number.isSafeInteger(r.targetLast) &&
    r.targetFirst > r.trainingCutoff &&
    r.targetLast >= r.targetFirst &&
    r.targetLast - r.targetFirst <= 1000 &&
    Number.isSafeInteger(r.latestKnown) &&
    r.latestKnown >= r.trainingCutoff &&
    Number.isFinite(r.budget) &&
    r.budget ===
      r.tickets.reduce((sum, t) => sum + ticketMetrics(t.length).cost, 0)
  );
}
export function createJournalRecord(
  input: Omit<JournalRecord, "version" | "id" | "registeredAt" | "provenance">,
): JournalRecord {
  const record: JournalRecord = {
    ...structuredClone(input),
    version: 1,
    id: crypto.randomUUID(),
    registeredAt: new Date().toISOString(),
    provenance: "local",
  };
  if (!validJournalRecord(record) || record.targetFirst <= record.latestKnown)
    throw new Error(
      "O primeiro concurso deve ser futuro e posterior ao treinamento.",
    );
  return record;
}
export function parseJournal(raw: string): JournalRecord[] {
  if (raw.length > 2_000_000)
    throw new Error("Arquivo do diário excede o limite de 2 MB.");
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    throw new Error("JSON do diário inválido.");
  }
  if (!v || typeof v !== "object")
    throw new Error("Arquivo do diário inválido.");
  const data = v as { schemaVersion?: unknown; records?: unknown };
  if (
    data.schemaVersion !== 1 ||
    !Array.isArray(data.records) ||
    data.records.length > 200 ||
    !data.records.every(validJournalRecord)
  )
    throw new Error("Arquivo do diário inválido.");
  return data.records.map((r) => ({ ...r, provenance: "imported" as const }));
}
export function classifyJournal(
  r: JournalRecord,
): "retrospective" | "forward-local" | "imported" {
  if (r.targetFirst <= r.latestKnown) return "retrospective";
  return r.provenance === "local" ? "forward-local" : "imported";
}
export function scoreJournal(r: JournalRecord, draws: Draw[]) {
  const byContest = new Map(draws.map((d) => [d.contest, d]));
  const results = Array.from(
    { length: r.targetLast - r.targetFirst + 1 },
    (_, i) => {
      const contest = r.targetFirst + i;
      const draw = byContest.get(contest);
      return {
        contest,
        matches: draw
          ? r.tickets.map((t) => matchCount(t, draw.numbers))
          : null,
      };
    },
  );
  return {
    results,
    completed: results.every((r) => r.matches !== null),
    counted: results.filter((r) => r.matches !== null).length,
  };
}
