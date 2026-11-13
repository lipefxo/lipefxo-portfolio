import test from "node:test";
import assert from "node:assert/strict";
import {
  validSavedGame,
  parseSavedCollection,
  mergeSavedGames,
} from "../lib/lottery/storage.ts";
import {
  classifyJournal,
  createJournalRecord,
  parseJournal,
  scoreJournal,
} from "../lib/lottery/journal.ts";
import type { SavedGame, Draw } from "../lib/lottery/types.ts";

const options = {
  strategy: "ensemble" as const,
  objective: "sena" as const,
  size: 6,
  count: 1,
  fixed: [],
  excluded: [],
  balanced: false,
};
const game: SavedGame = {
  id: "one",
  createdAt: "2026-01-01T00:00:00Z",
  numbers: [1, 2, 3, 4, 5, 6],
  strategy: "uniform",
  trainingStart: 1,
  trainingEnd: 10,
  trainingCount: 10,
  constraints: "",
  reasoning: [],
  generatorOptions: options,
  generation: {
    version: "ensemble-v1",
    portfolioId: "p",
    portfolioSize: 1,
    candidatesConsidered: 2,
    methods: [{ strategy: "uniform", candidates: 2, selected: 1 }],
  },
};
test("validates nested metadata, strategy and old exports", () => {
  assert.equal(validSavedGame(game), true);
  assert.equal(
    validSavedGame({
      ...game,
      generatorOptions: { ...options, strategy: "unknown" },
    }),
    false,
  );
  assert.equal(
    validSavedGame({
      ...game,
      generation: {
        ...game.generation,
        methods: [{ strategy: "unknown", candidates: 1, selected: 1 }],
      },
    }),
    false,
  );
  assert.equal(validSavedGame({ ...game, strategy: "unknown" }), false);
  assert.deepEqual(
    parseSavedCollection(JSON.stringify({ schemaVersion: 1, games: [game] })),
    [game],
  );
  assert.deepEqual(
    parseSavedCollection(JSON.stringify({ game: "megasena", games: [game] })),
    [game],
  );
  assert.throws(() => parseSavedCollection("{"));
  assert.throws(() =>
    parseSavedCollection(
      JSON.stringify({
        schemaVersion: 1,
        games: [game, { ...game, generation: null }],
      }),
    ),
  );
});
test("merge skips duplicates and conflicting identifiers", () => {
  const result = mergeSavedGames(
    [game],
    [game, { ...game, numbers: [7, 8, 9, 10, 11, 12] }, { ...game, id: "two" }],
  );
  assert.deepEqual(
    [result.added, result.duplicates, result.collisions],
    [1, 1, 1],
  );
  assert.equal(result.games[1].generation?.portfolioId, "p");
});
test("journal rejects known targets and counts every scheduled contest", () => {
  const input = {
    options,
    budget: 6,
    fingerprint: "a".repeat(64),
    tickets: [game.numbers],
    trainingCutoff: 10,
    targetFirst: 12,
    targetLast: 13,
    latestKnown: 11,
  };
  const record = createJournalRecord(input);
  assert.equal(classifyJournal(record), "forward-local");
  assert.throws(() => createJournalRecord({ ...input, latestKnown: 12 }));
  assert.throws(() => createJournalRecord({ ...input, trainingCutoff: 12 }));
  const imported = parseJournal(
    JSON.stringify({ schemaVersion: 1, records: [record] }),
  )[0];
  assert.equal(classifyJournal(imported), "imported");
  assert.equal(
    classifyJournal({ ...imported, latestKnown: 12 }),
    "retrospective",
  );
  const draws = [12, 13].map(
    (contest) =>
      ({
        contest,
        date: "2026-01-01",
        numbers: [20, 21, 22, 23, 24, 25],
        winners: [],
        prizes: [],
      }) satisfies Draw,
  );
  const score = scoreJournal(record, draws);
  assert.equal(score.completed, true);
  assert.equal(score.counted, 2);
  assert.deepEqual(
    score.results.map((r) => r.matches),
    [[0], [0]],
  );
  assert.equal(scoreJournal(record, draws.slice(0, 1)).completed, false);
  assert.throws(() => parseJournal("{"));
});
test("journal checks frozen tickets and generator constraints", () => {
  const input = {
    options,
    budget: 6,
    fingerprint: "a".repeat(64),
    tickets: [game.numbers],
    trainingCutoff: 10,
    targetFirst: 12,
    targetLast: 13,
    latestKnown: 11,
  };
  assert.throws(() =>
    createJournalRecord({ ...input, options: { ...options, count: 2 } }),
  );
  assert.throws(() =>
    createJournalRecord({ ...input, options: { ...options, size: 7 } }),
  );
  assert.throws(() =>
    createJournalRecord({ ...input, options: { ...options, fixed: [7] } }),
  );
  assert.throws(() =>
    createJournalRecord({ ...input, options: { ...options, excluded: [1] } }),
  );
  assert.throws(() =>
    createJournalRecord({ ...input, options: { ...options, minSum: 22 } }),
  );
  assert.throws(() => createJournalRecord({ ...input, latestKnown: 9 }));
  assert.throws(() =>
    createJournalRecord({
      ...input,
      tickets: [game.numbers, [...game.numbers].reverse()],
      options: { ...options, count: 2 },
      budget: 12,
    }),
  );
  assert.throws(() => parseSavedCollection(" ".repeat(2_000_001)));
  assert.throws(() => parseJournal(" ".repeat(2_000_001)));
  assert.equal(
    validSavedGame({ ...game, generatorOptions: { ...options, size: 7 } }),
    false,
  );
});
