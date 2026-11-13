import { env } from "cloudflare:workers";
import { recentIngestionAttempts } from "../../../lib/lottery/persistence";
import { runtimeService } from "../../../lib/lottery/runtime";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if ((url.searchParams.get("game") ?? "megasena") !== "megasena") {
    return Response.json(
      { error: "Esta modalidade ainda não está disponível." },
      { status: 400 },
    );
  }
  if (url.searchParams.get("diagnostics") === "1") {
    if (!env.DB) return Response.json({ error: "Armazenamento indisponível." }, { status: 503 });
    try {
      const current = await runtimeService(env.DB).get();
      const attempts = await recentIngestionAttempts(env.DB);
      return Response.json({ freshness: current.freshness, lastIncludedContest: current.dataset.draws.at(-1)?.contest ?? null, attempts }, { headers: { "Cache-Control": "no-store" } });
    } catch {
      return Response.json({ error: "Histórico de ingestão indisponível." }, { status: 503 });
    }
  }
  const response = await runtimeService(env.DB).get(url.searchParams.get("refresh") === "1");
  return Response.json(response, { headers: { "Cache-Control": "no-store" } });
}
