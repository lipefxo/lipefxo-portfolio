import { explainTicket, generateTickets } from "./generator";
import { OBJECTIVES } from "./games";
import { portfolioMetrics, summarize } from "./math";
import { anyPrizeCoverage } from "./portfolio";
import type { Draw, GeneratorOptions, SavedGame } from "./types";

export type GenerationRequest = {
  draws: Draw[];
  options: GeneratorOptions;
  fingerprint: string;
  configuration: string;
};
export type CollectionMetrics = ReturnType<typeof portfolioMetrics> & {
  anyPrize: ReturnType<typeof anyPrizeCoverage>;
};

self.onmessage = (event: MessageEvent<GenerationRequest>) => {
  try {
    const { draws, options, fingerprint, configuration } = event.data;
    const result = generateTickets(draws, options);
    const summary = summarize(draws);
    const createdAt = new Date().toISOString();
    const portfolioId = crypto.randomUUID();
    const games: SavedGame[] = result.tickets.map((numbers, index) => ({
      id: crypto.randomUUID(),
      createdAt,
      numbers,
      strategy: result.selections[index].strategy,
      trainingStart: draws[0].contest,
      trainingEnd: draws.at(-1)!.contest,
      trainingCount: draws.length,
      reasoning: [
        ...explainTicket(numbers, summary, result.selections[index].strategy, {
          fixed: options.fixed,
          seedPair: result.selections[index].seedPair,
        }),
        result.tickets.length === 1
          ? "Com um único jogo, os dois objetivos têm as mesmas probabilidades."
          : OBJECTIVES[options.objective ?? "sena"].reasoning,
        "Coleção automática: os métodos se alternam conforme os candidatos disponíveis. O objetivo orienta a escolha dentro de cada rodada.",
      ],
      constraints: configuration,
      dataFingerprint: fingerprint,
      generatorOptions: options,
      generation: {
        version: "ensemble-v1",
        portfolioId,
        portfolioSize: result.tickets.length,
        candidatesConsidered: result.candidatesConsidered,
        methods: result.methods,
      },
    }));
    self.postMessage({
      ok: true,
      games,
      complete: result.complete,
      portfolio: {
        ...portfolioMetrics(result.tickets),
        anyPrize: anyPrizeCoverage(result.tickets),
      },
    });
  } catch (error) {
    self.postMessage({
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível gerar a coleção.",
    });
  }
};
