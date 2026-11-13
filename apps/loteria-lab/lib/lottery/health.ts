import { createD1Store, recentIngestionAttempts } from "./persistence.ts";
import type { DataResponse } from "./types.ts";

const MAX_CHECK_AGE_MS = 30 * 60 * 60 * 1000;
type Reason = "current" | "stale" | "unavailable" | "update-required" | "snapshot";
type Check = { status: DataResponse["freshness"]["status"]; checkedAt: string | null; latestAvailableContest: number | null };
type Health = { status: Reason; checkedAt: string | null; lastIncludedContest: number | null; latestAvailableContest: number | null };

/** Evaluate the official check, independent of draw dates (there are no-draw days). */
export function evaluateHealth(data: DataResponse | null, now: number, latestAttempt?: Check): Health {
  const check = latestAttempt ?? data?.freshness;
  const result: Health = {
    status: "snapshot",
    checkedAt: check?.checkedAt ?? null,
    lastIncludedContest: data?.dataset.draws.at(-1)?.contest ?? null,
    latestAvailableContest: check?.latestAvailableContest ?? null,
  };
  if (!data || !check || data.freshness.status === "snapshot") return result;
  if (check.status !== "current") {
    result.status = check.status === "update-required" ? "update-required" : check.status === "snapshot" ? "snapshot" : "unavailable";
    return result;
  }
  if (data.freshness.status !== "current") {
    result.status = data.freshness.status;
    return result;
  }
  if (result.lastIncludedContest === null || result.latestAvailableContest === null || result.lastIncludedContest !== result.latestAvailableContest || result.lastIncludedContest !== data.freshness.latestAvailableContest) {
    result.status = "update-required";
    return result;
  }
  const validTime = (value: string | null) => {
    const checked = value ? Date.parse(value) : NaN;
    return Number.isFinite(checked) && checked <= now && now - checked <= MAX_CHECK_AGE_MS;
  };
  result.status = validTime(check.checkedAt) && validTime(data.freshness.checkedAt) ? "current" : "stale";
  return result;
}

/** Read D1 directly: runtimeService.get() deliberately hides storage errors with a snapshot. */
export async function healthResponse(db?: D1Database, now = Date.now()): Promise<Response> {
  let health: Health;
  try {
    if (!db) throw new Error("D1 unavailable");
    const data = await createD1Store(db).read();
    const attempts = data ? await recentIngestionAttempts(db) : [];
    health = evaluateHealth(data, now, attempts[0] as Check | undefined);
  } catch {
    health = { status: "unavailable", checkedAt: null, lastIncludedContest: null, latestAvailableContest: null };
  }
  return Response.json(health, {
    status: health.status === "current" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
