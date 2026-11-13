import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fullRecordHash, createD1Store } from "../lib/lottery/persistence.ts";
import { snapshotResponse } from "../lib/lottery/data-service.ts";
import type { Dataset } from "../lib/lottery/types.ts";

const snapshot = JSON.parse(
  readFileSync(new URL("../data/megasena.json", import.meta.url), "utf8"),
) as Dataset;

describe("durable revisions", () => {
  it("includes payouts and winner counts in the revision hash", async () => {
    const first = snapshotResponse(snapshot);
    const changed = structuredClone(first);
    changed.dataset.draws[0].prizes[0] =
      (changed.dataset.draws[0].prizes[0] ?? 0) + 1;
    assert.notEqual(await fullRecordHash(first), await fullRecordHash(changed));
    changed.dataset.draws[0].prizes[0] = first.dataset.draws[0].prizes[0];
    changed.dataset.draws[0].winners[0]++;
    assert.notEqual(await fullRecordHash(first), await fullRecordHash(changed));
  });
  it("promotes revisions and records attempts together in one D1 batch", async () => {
    const statements: { sql: string; values: unknown[] }[] = [];
    let batches = 0;
    const db = {
      prepare(sql: string) {
        return {
          bind(...values: unknown[]) {
            return { sql, values };
          },
        };
      },
      async batch(batch: typeof statements) {
        batches++;
        statements.push(...batch);
        return [];
      },
    } as unknown as D1Database;
    await createD1Store(db).save(snapshotResponse(snapshot));
    assert.equal(batches, 1);
    assert.equal(statements.length, 3);
    assert.match(statements[0].sql, /dataset_revisions/);
    assert.match(
      statements[1].sql,
      /excluded.last_contest >= ingestion_state.last_contest/,
    );
    assert.match(statements[2].sql, /ingestion_attempts/);
  });
});

// Exercise the actual migration and D1 SQL against SQLite, including rollback.
import { DatabaseSync } from "node:sqlite";
function sqliteD1() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(
    readFileSync(
      new URL("../drizzle/0000_ancient_giant_girl.sql", import.meta.url),
      "utf8",
    ),
  );
  type Entry = { sql: string; values: (string | number | null)[] };
  let failNextBatch = false;
  const db = {
    prepare(sql: string) {
      return {
        bind(...values: Entry["values"]) {
          return {
            sql,
            values,
            async first() {
              return sqlite.prepare(sql).get(...values) ?? null;
            },
            async all() {
              return { results: sqlite.prepare(sql).all(...values) };
            },
          };
        },
      };
    },
    async batch(entries: Entry[]) {
      sqlite.exec("BEGIN");
      try {
        for (const [index, entry] of entries.entries()) {
          if (failNextBatch && index === 2) throw new Error("injected failure");
          sqlite.prepare(entry.sql).run(...entry.values);
        }
        sqlite.exec("COMMIT");
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      } finally {
        failNextBatch = false;
      }
      return [];
    },
  } as unknown as D1Database;
  return {
    db,
    sqlite,
    fail() {
      failNextBatch = true;
    },
  };
}

describe("SQLite promotion transaction", () => {
  it("rolls back a failed promotion and rejects older or less complete writes", async () => {
    const fixture = sqliteD1();
    const store = createD1Store(fixture.db);
    const current = snapshotResponse(snapshot);
    current.freshness = {
      status: "current",
      checkedAt: "2026-10-25T00:00:00.000Z",
      latestAvailableContest: snapshot.draws.length,
      message: "ok",
    };
    await store.save(current);
    const stale = structuredClone(current);
    stale.freshness.checkedAt = "2026-10-24T00:00:00.000Z";
    stale.dataset.draws[0].winners[0]++;
    await store.save(stale);
    assert.deepEqual((await store.read())?.dataset, current.dataset);
    const oldBundle = snapshotResponse(structuredClone(snapshot));
    oldBundle.dataset.fetchedAt = "2000-01-01T00:00:00.000Z";
    oldBundle.dataset.draws[0].winners[0]++;
    await store.save(oldBundle);
    assert.deepEqual((await store.read())?.dataset, current.dataset);
    const shorter = structuredClone(current);
    shorter.freshness.checkedAt = "2026-10-26T00:00:00.000Z";
    shorter.dataset.draws.pop();
    await store.save(shorter);
    assert.deepEqual((await store.read())?.dataset, current.dataset);
    const valid = structuredClone(current);
    valid.freshness.checkedAt = "2026-10-27T00:00:00.000Z";
    valid.dataset.draws[0].winners[0]++;
    fixture.fail();
    await assert.rejects(store.save(valid), /injected failure/);
    assert.deepEqual((await store.read())?.dataset, current.dataset);
    assert.equal(
      (
        fixture.sqlite
          .prepare("SELECT count(*) AS n FROM dataset_revisions")
          .get() as { n: number }
      ).n,
      4,
    );
  });
});
