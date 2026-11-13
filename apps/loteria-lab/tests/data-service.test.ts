import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  createDataService,
  normalizeCaixa,
} from "../lib/lottery/data-service.ts";
import { canonicalDraws } from "../lib/lottery/math.ts";
import type { Dataset, Draw } from "../lib/lottery/types.ts";

const full = JSON.parse(
  readFileSync(new URL("../data/megasena.json", import.meta.url), "utf8"),
) as Dataset;
const initial = {
  ...full,
  draws: full.draws.slice(0, 1),
  source: {
    ...full.source,
    archiveThroughContest: 1,
    apiVerifiedContests: [1],
  },
};
const official = (draw: Draw) => ({
  numero: draw.contest,
  dataApuracao: draw.date.split("-").reverse().join("/"),
  listaDezenas: draw.numbers.map((n) => String(n).padStart(2, "0")),
  listaRateioPremio: draw.winners.map((n, index) => ({
    faixa: index + 1,
    numeroDeGanhadores: n,
    valorPremio: draw.prizes[index],
  })),
  numeroConcursoProximo: draw.contest + 1,
  dataProximoConcurso: "01/04/1996",
  valorEstimadoProximoConcurso: 2000000,
});

describe("official source refresh", () => {
  it("imports every missing contest, validates the complete base, and updates its checksum", async () => {
    const calls: string[] = [];
    const fetcher = (async (url: string) => {
      calls.push(url);
      return Response.json(
        official(
          full.draws[url.endsWith("/1") ? 0 : url.endsWith("/2") ? 1 : 2],
        ),
      );
    }) as typeof fetch;
    const service = createDataService(initial, fetcher);
    const result = await service.get(true);
    assert.equal(result.freshness.status, "current");
    assert.deepEqual(result.dataset.draws, full.draws.slice(0, 3));
    assert.equal(calls.length, 3);
    assert.equal(
      result.dataset.source.drawsSha256,
      createHash("sha256")
        .update(canonicalDraws(result.dataset.draws))
        .digest("hex"),
    );
    assert.deepEqual(result.dataset.source.apiVerifiedContests, [1]);
    assert.equal(result.dataset.source.archiveThroughContest, 1);
  });
  it("keeps the old complete snapshot if an intermediate request fails", async () => {
    const service = createDataService(initial, (async (url: string) =>
      url.endsWith("/2")
        ? new Response("unavailable", { status: 503 })
        : Response.json(official(full.draws[2]))) as typeof fetch);
    const result = await service.get(true);
    assert.equal(result.freshness.status, "unavailable");
    assert.deepEqual(result.dataset, initial);
  });
  it("rejects an API response for the wrong contest, without a partial update", async () => {
    const service = createDataService(initial, (async () =>
      Response.json(official(full.draws[2]))) as typeof fetch);
    const result = await service.get(true);
    assert.equal(result.freshness.status, "unavailable");
    assert.equal(result.dataset.draws.length, 1);
  });
  it("rejects corrections to the known latest draw until re-imported", async () => {
    const raw = official(full.draws[0]);
    raw.listaDezenas = ["01", "02", "03", "04", "05", "06"];
    const service = createDataService(initial, (async () =>
      Response.json(raw)) as typeof fetch);
    const result = await service.get(true);
    assert.equal(result.freshness.status, "unavailable");
    assert.deepEqual(result.dataset, initial);
  });
  it("deduplicates concurrent refreshes and protects the official API from repeated clicks", async () => {
    let calls = 0;
    const service = createDataService(initial, (async () => {
      calls++;
      return Response.json(official(full.draws[0]));
    }) as typeof fetch);
    const [a, b] = await Promise.all([service.get(true), service.get(true)]);
    assert.equal(a.freshness.status, "current");
    assert.deepEqual(a, b);
    await service.get(true);
    assert.equal(calls, 1);
  });
  it("does not silently label an outdated base as current", async () => {
    const service = createDataService(initial, (async () =>
      Response.json(official(full.draws[300]))) as typeof fetch);
    const result = await service.get(true);
    assert.equal(result.freshness.status, "update-required");
    assert.equal(result.freshness.latestAvailableContest, 301);
    assert.equal(result.dataset.draws.length, 1);
  });
  it("rejects malformed numbers, dates, and missing prize levels", () => {
    assert.throws(() =>
      normalizeCaixa({
        ...official(full.draws[0]),
        listaDezenas: ["01", "01", "03", "04", "05", "06"],
      }),
    );
    assert.throws(() =>
      normalizeCaixa({
        ...official(full.draws[0]),
        dataApuracao: "30/02/2020",
      }),
    );
    assert.throws(() =>
      normalizeCaixa({ ...official(full.draws[0]), listaRateioPremio: [] }),
    );
  });
});

describe("persisted ingestion", () => {
  it("loads saved state across service instances and keeps it on a failed refresh", async () => {
    let saved: import("../lib/lottery/types.ts").DataResponse | null = null;
    const store = {
      async read() {
        return saved;
      },
      async save(value: import("../lib/lottery/types.ts").DataResponse) {
        saved = structuredClone(value);
      },
    };
    const fetcher = (async (url: string) =>
      Response.json(
        official(full.draws[url.endsWith("/1") ? 0 : 1]),
      )) as typeof fetch;
    const first = await createDataService(initial, fetcher, store).get(true);
    assert.equal(first.dataset.draws.length, 2);
    const second = createDataService(
      initial,
      (async () => new Response("error", { status: 503 })) as typeof fetch,
      store,
    );
    assert.equal((await second.get()).dataset.draws.length, 2);
    assert.equal((await second.get(true)).freshness.status, "unavailable");
    assert.equal((await second.get()).dataset.draws.length, 2);
  });
  it("detects a payout correction in recent history", async () => {
    const base = { ...initial, draws: full.draws.slice(0, 2) };
    const revised = structuredClone(full.draws[0]);
    revised.prizes[0] = (revised.prizes[0] ?? 0) + 1;
    const service = createDataService(base, (async (url: string) =>
      Response.json(
        official(url.endsWith("/1") ? revised : full.draws[1]),
      )) as typeof fetch);
    const result = await service.get(true);
    assert.equal(result.freshness.status, "unavailable");
    assert.deepEqual(result.dataset, base);
  });
  it("does not expose a revision when durable promotion fails", async () => {
    const store = {
      async read() {
        return null;
      },
      async save() {
        throw new Error("database unavailable");
      },
    };
    const fetcher = (async (url: string) =>
      Response.json(
        official(full.draws[url.endsWith("/1") ? 0 : 1]),
      )) as typeof fetch;
    const result = await createDataService(initial, fetcher, store).get(true);
    assert.equal(result.freshness.status, "unavailable");
    assert.deepEqual(result.dataset, initial);
  });
});

describe("bundled snapshot adoption", () => {
  it("seeds empty storage and adopts a newer complete same-contest correction", async () => {
    let saved: import("../lib/lottery/types.ts").DataResponse | null = null;
    const store = {
      async read() {
        return saved;
      },
      async save(value: import("../lib/lottery/types.ts").DataResponse) {
        saved = structuredClone(value);
      },
    };
    const seeded = await createDataService(initial, fetch, store).get();
    assert.equal(seeded.freshness.status, "snapshot");
    assert.ok(saved);
    const newer = structuredClone(initial);
    newer.fetchedAt = "2099-01-01T00:00:00.000Z";
    newer.draws[0].prizes[0] = (newer.draws[0].prizes[0] ?? 0) + 1;
    const adopted = await createDataService(newer, fetch, store).get();
    assert.deepEqual(adopted.dataset, newer);
    assert.equal(adopted.freshness.checkedAt, null);
    assert.equal(adopted.freshness.status, "snapshot");
  });
  it("does not replace a more complete persisted revision with a newer incomplete bundle", async () => {
    const persisted = {
      dataset: { ...initial, draws: full.draws.slice(0, 2) },
      freshness: {
        status: "current" as const,
        checkedAt: "2026-01-01T00:00:00Z",
        latestAvailableContest: 2,
        message: "OK",
      },
    };
    const newer = { ...initial, fetchedAt: "2099-01-01T00:00:00Z" };
    let writes = 0;
    const store = {
      async read() {
        return persisted;
      },
      async save() {
        writes++;
      },
    };
    const result = await createDataService(newer, fetch, store).get();
    assert.equal(result.dataset.draws.length, 2);
    assert.equal(writes, 0);
  });
  it("reports storage errors without attempting a seed", async () => {
    let writes = 0;
    const store = {
      async read(): Promise<null> {
        throw new Error("offline");
      },
      async save() {
        writes++;
      },
    };
    const result = await createDataService(initial, fetch, store).get();
    assert.match(result.freshness.message, /Armazenamento indisponível/);
    assert.equal(writes, 0);
  });
});
