import { test } from "node:test";
import assert from "node:assert/strict";
import { checkHostedData, siteOrigin } from "../scripts/check-hosted-data.mjs";

test("hosted checker refreshes then reads persisted health without forwarding credentials", async () => {
  const paths: string[] = [];
  const health = { status: "current", checkedAt: "2026-11-13T12:00:00.000Z", lastIncludedContest: 3000, latestAvailableContest: 3000 };
  const result = await checkHostedData({ url: siteOrigin, token: "test-only", refresh: true }, (async (url: string, init: RequestInit) => {
    paths.push(url);
    assert.equal(init.redirect, "error");
    assert.equal((init.headers as Record<string, string>)["OAI-Sites-Authorization"], "Bearer test-only");
    return Response.json(url.endsWith("/api/health") ? { ...health, unexpectedSecret: "must-not-output" } : { freshness: { status: "current" } });
  }) as typeof fetch);
  assert.deepEqual(paths, [`${siteOrigin}/api/draws?refresh=1`, `${siteOrigin}/api/health`]);
  assert.deepEqual(result, health);
});

test("hosted checker never exposes invalid JSON response bodies", async () => {
  await assert.rejects(checkHostedData({ url: siteOrigin, token: "test-only" }, (async () => new Response("private-sentinel-not-json")) as typeof fetch), (error: Error) => {
    assert.equal(error.message, "Hosted endpoint returned invalid JSON.");
    assert.ok(!String(error).includes("private-sentinel"));
    return true;
  });
});

test("hosted checker rejects another origin before using a credential", async () => {
  await assert.rejects(checkHostedData({ url: "https://example.com", token: "test-only" }, (() => { throw new Error("must not fetch"); }) as typeof fetch), /current Site URL/);
});

test("hosted checker fails on HTTP errors, incomplete refresh, and unhealthy persistence", async () => {
  const input = { url: siteOrigin, token: "test-only", refresh: true };
  await assert.rejects(checkHostedData(input, (async () => new Response("private error body", { status: 503 })) as typeof fetch), /HTTP 503/);
  await assert.rejects(checkHostedData(input, (async () => Response.json({ freshness: { status: "unavailable" } })) as typeof fetch), /did not reach current/);
  await assert.rejects(checkHostedData({ ...input, refresh: false }, (async () => Response.json({ status: "stale" })) as typeof fetch), /not current/);
});
