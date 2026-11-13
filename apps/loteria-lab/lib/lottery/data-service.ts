import { MEGASENA } from "./games.ts";
import { canonicalDraws, validateDraws } from "./math.ts";
import type { DataResponse, Dataset, Draw } from "./types.ts";
import type { DatasetStore } from "./persistence.ts";

export function snapshotResponse(dataset: Dataset): DataResponse {
  return {
    dataset,
    freshness: {
      status: "snapshot",
      checkedAt: null,
      latestAvailableContest: null,
      message:
        "Histórico oficial importado e validado. Use Atualizar dados para consultar novos resultados.",
    },
  };
}

function dateFromCaixa(value: unknown): string {
  if (typeof value !== "string" || !/^\d{2}\/\d{2}\/\d{4}$/.test(value))
    throw new Error("Formato de data inesperado na CAIXA.");
  const [day, month, year] = value.split("/");
  const date = `${year}-${month}-${day}`;
  if (
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  )
    throw new Error("Data inválida na CAIXA.");
  return date;
}

export function normalizeCaixa(value: unknown): Draw {
  if (!value || typeof value !== "object")
    throw new Error("Resposta oficial inválida.");
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.listaDezenas) || !Array.isArray(raw.listaRateioPremio))
    throw new Error("A estrutura da fonte oficial mudou.");
  const rates = raw.listaRateioPremio as Record<string, unknown>[];
  const levels = [1, 2, 3].map((level) =>
    rates.find((rate) => rate.faixa === level),
  );
  if (levels.some((level) => !level))
    throw new Error("Rateio incompleto na fonte oficial.");
  const draw: Draw = {
    contest: raw.numero as number,
    date: dateFromCaixa(raw.dataApuracao),
    numbers: raw.listaDezenas
      .map((n) =>
        typeof n === "string" && /^\d{1,2}$/.test(n)
          ? Number(n)
          : typeof n === "number"
            ? n
            : NaN,
      )
      .sort((a, b) => a - b),
    winners: levels.map((level) => level!.numeroDeGanhadores as number),
    prizes: levels.map((level) => level!.valorPremio as number),
  };
  validateDraws([draw], false);
  return draw;
}

export function createDataService(
  initial: Dataset,
  fetcher: typeof fetch = fetch,
  store?: DatasetStore,
) {
  validateDraws(initial.draws);
  let cached = snapshotResponse(initial);
  let pending: Promise<DataResponse> | undefined;
  let lastAttemptAt = 0;

  async function official(suffix = ""): Promise<Record<string, unknown>> {
    const response = await fetcher(`${MEGASENA.apiUrl}${suffix}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok)
      throw new Error(`A fonte oficial retornou HTTP ${response.status}.`);
    return (await response.json()) as Record<string, unknown>;
  }

  async function load(): Promise<DataResponse> {
    if (!store) return cached;
    const stored = await store.read();
    const incomingTime = Date.parse(initial.fetchedAt);
    const storedTime = stored
      ? Date.parse(stored.dataset.fetchedAt)
      : -Infinity;
    const canAdopt =
      !stored ||
      (Number.isFinite(incomingTime) &&
        Number.isFinite(storedTime) &&
        incomingTime > storedTime &&
        initial.draws.at(-1)!.contest >= stored.dataset.draws.at(-1)!.contest);
    if (canAdopt) {
      await store.save(snapshotResponse(initial));
      const adopted = await store.read();
      if (!adopted)
        throw new Error("Não foi possível confirmar o snapshot persistido.");
      return adopted;
    }
    return stored;
  }

  async function refresh(): Promise<DataResponse> {
    let checkedAt = new Date().toISOString();
    let latestAvailable: number | null = null;
    let baseline = cached;
    let storageRead = !store;
    try {
      if (store) {
        cached = await load();
        storageRead = true;
        checkedAt = new Date().toISOString();
      }
      baseline = cached;
      const raw = await official();
      const latest = normalizeCaixa(raw);
      latestAvailable = latest.contest;
      const last = cached.dataset.draws.at(-1)!;
      if (latest.contest < last.contest)
        throw new Error("A API oficial está atrás da base validada.");
      if (latest.contest - last.contest > 200) {
        cached = {
          dataset: cached.dataset,
          freshness: {
            status: "update-required",
            checkedAt,
            latestAvailableContest: latest.contest,
            message: `A CAIXA já está no concurso ${latest.contest}. Esta base termina no ${last.contest}; é necessária uma nova importação completa.`,
          },
        };
        if (store) await store.save(cached);
        return cached;
      }
      if (
        latest.contest === last.contest &&
        JSON.stringify(latest) !== JSON.stringify(last)
      )
        throw new Error(
          "O resultado oficial diverge do snapshot. Reimporte para verificar uma possível correção.",
        );
      // Check a rolling recent window, including payouts, before accepting additions.
      const recent = cached.dataset.draws.slice(-5);
      for (const known of recent) {
        const observed =
          known.contest === latest.contest
            ? latest
            : normalizeCaixa(await official(`/${known.contest}`));
        if (
          observed.contest !== known.contest ||
          JSON.stringify(observed) !== JSON.stringify(known)
        )
          throw new Error(
            `O concurso ${known.contest} foi corrigido ou diverge da base; é necessária uma reimportação.`,
          );
      }
      const additions: Draw[] = [];
      // Bound concurrency and import every intermediate contest before committing.
      for (let start = last.contest + 1; start <= latest.contest; start += 4) {
        const ids = Array.from(
          { length: Math.min(4, latest.contest - start + 1) },
          (_, i) => start + i,
        );
        const batch = await Promise.all(
          ids.map(async (id) => {
            const draw =
              id === latest.contest
                ? latest
                : normalizeCaixa(await official(`/${id}`));
            if (draw.contest !== id)
              throw new Error(
                "A API retornou um concurso diferente do solicitado.",
              );
            return draw;
          }),
        );
        additions.push(...batch);
      }
      const draws = [...cached.dataset.draws, ...additions];
      validateDraws(draws);
      const nextContest = raw.numeroConcursoProximo;
      const prize = raw.valorEstimadoProximoConcurso;
      if (
        nextContest !== undefined &&
        (!Number.isInteger(nextContest) ||
          (nextContest as number) <= latest.contest)
      )
        throw new Error("Próximo concurso inválido.");
      if (
        prize !== undefined &&
        (typeof prize !== "number" || !Number.isFinite(prize) || prize < 0)
      )
        throw new Error("Estimativa de prêmio inválida.");
      const next = {
        contest: typeof nextContest === "number" ? nextContest : null,
        date: raw.dataProximoConcurso
          ? dateFromCaixa(raw.dataProximoConcurso)
          : null,
        estimatedPrize: typeof prize === "number" ? prize : null,
      };
      const hash = additions.length
        ? Array.from(
            new Uint8Array(
              await crypto.subtle.digest(
                "SHA-256",
                new TextEncoder().encode(canonicalDraws(draws)),
              ),
            ),
          )
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join("")
        : cached.dataset.source.drawsSha256;
      cached = {
        // API-only additions are not workbook/API cross-checks. Preserve the
        // independently checked sample until a new archive import is performed.
        dataset: {
          ...cached.dataset,
          draws,
          next,
          fetchedAt: additions.length ? checkedAt : cached.dataset.fetchedAt,
          source: { ...cached.dataset.source, drawsSha256: hash },
        },
        freshness: {
          status: "current",
          checkedAt,
          latestAvailableContest: latest.contest,
          message: additions.length
            ? `${additions.length} novo(s) concurso(s) oficial(is) importado(s) e validado(s).`
            : `Concurso ${latest.contest} confirmado na CAIXA. Nenhum resultado novo disponível.`,
        },
      };
      if (store) {
        await store.save(cached);
        cached = (await store.read()) ?? cached;
      }
    } catch (error) {
      cached = {
        dataset: baseline.dataset,
        freshness: {
          status: "unavailable",
          checkedAt,
          latestAvailableContest: latestAvailable,
          message: `Consulta não concluída. A base validada foi preservada. ${error instanceof Error ? error.message : "Tente novamente mais tarde."}`,
        },
      };
      if (store && storageRead) {
        try {
          await store.save(cached);
        } catch {
          cached.freshness.message +=
            " Não foi possível registrar a falha no armazenamento.";
        }
      }
    }
    return cached;
  }

  return {
    snapshot: () => cached,
    async get(refreshRequested = false): Promise<DataResponse> {
      if (!refreshRequested) {
        if (!store) return cached;
        try {
          cached = await load();
          return cached;
        } catch {
          const fallback = snapshotResponse(initial);
          fallback.freshness.message =
            "Armazenamento indisponível; exibindo o snapshot incluído no aplicativo.";
          return fallback;
        }
      }
      if (pending) return pending;
      // Shared per isolate, avoids repeated requests from refresh clicks.
      if (lastAttemptAt && Date.now() - lastAttemptAt < 60000) return cached;
      lastAttemptAt = Date.now();
      pending = refresh();
      try {
        return await pending;
      } finally {
        pending = undefined;
      }
    },
  };
}
