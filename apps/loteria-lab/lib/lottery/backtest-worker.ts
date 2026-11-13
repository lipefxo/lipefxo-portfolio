import { runBacktest, type BacktestSettings } from "./backtest";
import { runCollectionBacktest, type CollectionSettings } from "./collection-backtest";
import type { Draw } from "./types";

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<{ draws: Draw[]; settings: BacktestSettings | CollectionSettings; mode?: "collection" }>) => void) | null;
  postMessage: (value: unknown) => void;
};
scope.onmessage = (event) => {
  try {
    const result = event.data.mode === "collection"
      ? runCollectionBacktest(event.data.draws, event.data.settings as CollectionSettings, (completed, total) => scope.postMessage({ progress: { completed, total } }))
      : runBacktest(event.data.draws, event.data.settings as BacktestSettings);
    scope.postMessage({ ok: true, result });
  } catch (error) {
    scope.postMessage({ ok: false, error: error instanceof Error ? error.message : "Não foi possível executar o teste." });
  }
};
