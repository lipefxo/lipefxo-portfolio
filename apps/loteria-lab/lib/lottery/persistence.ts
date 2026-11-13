import { validateDraws } from "./math.ts";
import type { DataResponse } from "./types.ts";

/** Stores complete immutable revisions and records every completed ingestion attempt. */
export interface DatasetStore {
  read(): Promise<DataResponse | null>;
  save(response: DataResponse): Promise<void>;
}

export async function fullRecordHash(response: DataResponse): Promise<string> {
  // Explicit field order makes the revision identity independent of object key order.
  const records = response.dataset.draws.map((d) => [
    d.contest,
    d.date,
    d.numbers,
    d.winners,
    d.prizes,
  ]);
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      JSON.stringify([
        records,
        response.dataset.next,
        response.dataset.source,
        response.dataset.fetchedAt,
      ]),
    ),
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

export function createD1Store(db: D1Database): DatasetStore {
  return {
    async read() {
      const row = await db
        .prepare(
          `SELECT r.dataset, r.hash, s.status, s.checked_at, s.latest_available_contest, s.message
        FROM ingestion_state s JOIN dataset_revisions r ON r.hash = s.revision_hash WHERE s.game = ?`,
        )
        .bind("megasena")
        .first<{
          dataset: string;
          hash: string;
          status: DataResponse["freshness"]["status"];
          checked_at: string;
          latest_available_contest: number | null;
          message: string;
        }>();
      if (!row) return null;
      const dataset = JSON.parse(row.dataset) as DataResponse["dataset"];
      validateDraws(dataset.draws);
      if (dataset.game !== "megasena")
        throw new Error("Revisão persistida inválida.");
      const result = {
        dataset,
        freshness: {
          status: row.status,
          checkedAt: row.status === "snapshot" ? null : row.checked_at,
          latestAvailableContest: row.latest_available_contest,
          message: row.message,
        },
      };
      if ((await fullRecordHash(result)) !== row.hash)
        throw new Error("Revisão persistida corrompida.");
      return result;
    },
    async save(response) {
      validateDraws(response.dataset.draws);
      const hash = await fullRecordHash(response);
      const last = response.dataset.draws.at(-1)!.contest;
      const checked = response.freshness.checkedAt ?? new Date().toISOString();
      // A batch is transactional in D1. Conditional promotion prevents a slow,
      // older invocation from replacing a newer or more complete revision.
      await db.batch([
        db
          .prepare(
            "INSERT OR IGNORE INTO dataset_revisions (hash, dataset, last_contest, created_at) VALUES (?, ?, ?, ?)",
          )
          .bind(hash, JSON.stringify(response.dataset), last, checked),
        db
          .prepare(
            `INSERT INTO ingestion_state (game, revision_hash, last_contest, checked_at, latest_available_contest, status, message)
          VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(game) DO UPDATE SET
          revision_hash=excluded.revision_hash, last_contest=excluded.last_contest, checked_at=excluded.checked_at,
          latest_available_contest=excluded.latest_available_contest, status=excluded.status, message=excluded.message
          WHERE excluded.last_contest >= ingestion_state.last_contest AND excluded.checked_at >= ingestion_state.checked_at
          AND (excluded.status <> 'snapshot' OR
            julianday(json_extract((SELECT dataset FROM dataset_revisions WHERE hash=excluded.revision_hash), '$.fetchedAt')) >
            julianday(json_extract((SELECT dataset FROM dataset_revisions WHERE hash=ingestion_state.revision_hash), '$.fetchedAt')))`,
          )
          .bind(
            "megasena",
            hash,
            last,
            checked,
            response.freshness.latestAvailableContest,
            response.freshness.status,
            response.freshness.message,
          ),
        db
          .prepare(
            "INSERT INTO ingestion_attempts (id, checked_at, status, latest_available_contest, last_contest, message) VALUES (?, ?, ?, ?, ?, ?)",
          )
          .bind(
            crypto.randomUUID(),
            checked,
            response.freshness.status,
            response.freshness.latestAvailableContest,
            last,
            response.freshness.message,
          ),
      ]);
    },
  };
}

export async function recentIngestionAttempts(db: D1Database) {
  const result = await db
    .prepare(
      `SELECT checked_at AS checkedAt, status,
    latest_available_contest AS latestAvailableContest, last_contest AS lastContest, message
    FROM ingestion_attempts WHERE status <> 'snapshot' ORDER BY checked_at DESC LIMIT 20`,
    )
    .all();
  return result.results;
}
