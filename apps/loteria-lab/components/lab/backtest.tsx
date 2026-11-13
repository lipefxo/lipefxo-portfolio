"use client";

import { useEffect, useRef, useState } from "react";
import BacktestWorker from "../../lib/lottery/backtest-worker?worker";
import type { BacktestResult } from "../../lib/lottery/backtest";
import { STRATEGIES, MEGASENA } from "../../lib/lottery/games";
import { choose } from "../../lib/lottery/math";
import type { Draw, GeneratorOptions, Strategy } from "../../lib/lottery/types";
import type { CollectionResult } from "../../lib/lottery/collection-backtest";
import {
  Balls,
  currency,
  decimal,
  downloadFile,
  EmptyState,
  Icon,
  integer,
  Notice,
  PanelHeading,
} from "./ui";

const colors = ["#8c9693", "#166b50", "#ac7836", "#5a839e"];

function BacktestChart({ result }: { result: BacktestResult }) {
  const width = 800;
  const height = 225;
  const padX = 42;
  const padY = 20;
  const maximum = Math.max(
    1.2,
    ...result.results.flatMap((row) =>
      row.timeline.map((point) => point.average),
    ),
  );
  const y = (value: number) =>
    height - padY - (value / maximum) * (height - padY * 2);
  const x = (index: number) =>
    padX + (index / (result.settings.testSize - 1)) * (width - padX - 15);
  const step = Math.max(1, Math.floor(result.settings.testSize / 100));
  return (
    <div className="backtest-chart">
      <svg
        viewBox={`0 0 ${width} ${height + 23}`}
        role="img"
        aria-labelledby="backtest-chart-title"
      >
        <title id="backtest-chart-title">
          Acertos médios acumulados por jogo; linha tracejada em 0,6 é a
          expectativa matemática do acaso.
        </title>
        {[0, 1, 2, 3].map((i) => {
          const value = (maximum / 3) * i;
          return (
            <g key={i}>
              <line
                x1={padX}
                x2={width - 15}
                y1={y(value)}
                y2={y(value)}
                stroke="#edf0eb"
              />
              <text x={padX - 10} y={y(value) + 4} textAnchor="end">
                {decimal(value, 1)}
              </text>
            </g>
          );
        })}
        <line
          x1={padX}
          x2={width - 15}
          y1={y(0.6)}
          y2={y(0.6)}
          stroke="#667b55"
          strokeWidth="1.5"
          strokeDasharray="5 5"
        />
        {result.results.map((row, i) => (
          <polyline
            key={row.strategy}
            points={row.timeline
              .map((point, index) => ({ point, index }))
              .filter(
                ({ index }) =>
                  index % step === 0 || index === row.timeline.length - 1,
              )
              .map(({ point, index }) => `${x(index)},${y(point.average)}`)
              .join(" ")}
            stroke={colors[i]}
            strokeWidth="2"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
        {[0, 1, 2, 3, 4].map((i) => {
          const index = Math.round((i / 4) * (result.settings.testSize - 1));
          return (
            <text
              key={i}
              x={x(index)}
              y={height + 12}
              textAnchor={i === 4 ? "end" : i === 0 ? "start" : "middle"}
            >
              #{result.results[0].timeline[index].contest}
            </text>
          );
        })}
      </svg>
      <div className="chart-legend wrap">
        {result.results.map((row, index) => (
          <span key={row.strategy}>
            <i style={{ background: colors[index] }} />
            {STRATEGIES[row.strategy].short}
          </span>
        ))}
        <span>
          <i className="dashed" />
          Expectativa: 0,6
        </span>
      </div>
    </div>
  );
}

function IndividualBacktestView({
  draws,
  fingerprint,
}: {
  draws: Draw[];
  fingerprint: string;
}) {
  const [trainSize, setTrainSize] = useState(100);
  const [testSize, setTestSize] = useState(250);
  const [seed, setSeed] = useState("42");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [runFingerprint, setRunFingerprint] = useState("");
  const [detailStrategy, setDetailStrategy] = useState<Strategy>("frequent");
  const workerRef = useRef<Worker | null>(null);
  useEffect(() => () => workerRef.current?.terminate(), []);

  function run() {
    setBusy(true);
    setError("");
    try {
      workerRef.current?.terminate();
      const worker = new BacktestWorker();
      workerRef.current = worker;
      worker.onmessage = (event) => {
        if (event.data.ok) {
          setResult(event.data.result);
          setRunFingerprint(fingerprint);
        } else setError(event.data.error);
        setBusy(false);
        worker.terminate();
        workerRef.current = null;
      };
      worker.onerror = () => {
        setError("O teste não pôde iniciar neste navegador. Tente novamente.");
        setBusy(false);
        worker.terminate();
        workerRef.current = null;
      };
      worker.postMessage({
        draws,
        settings: {
          trainSize,
          testSize,
          seed: seed.trim() ? Number(seed) : NaN,
        },
      });
    } catch (error) {
      console.error("Backtest worker initialization failed", error);
      setError("Não foi possível iniciar o processamento local.");
      setBusy(false);
    }
  }

  return (
    <div className="view-stack">
      <Notice tone="green">
        <strong>Uma regra importante: o resultado fica de fora.</strong> Antes
        de cada concurso, o método consulta apenas a janela anterior. Os quatro
        métodos usam um jogo de 6 dezenas por sorteio, sem filtros adicionais.
        Este teste avalia os métodos individualmente; não avalia a coleção
        automática nem os objetivos Sena e Qualquer prêmio para conjuntos.
      </Notice>
      <section className="panel">
        <PanelHeading
          title="Monte um experimento reproduzível"
          detail="O teste usa a base completa; o período do painel não limita os dados de treinamento."
        />
        <div className="backtest-form">
          <label className="field">
            <span>Janela de treinamento</span>
            <select
              value={trainSize}
              disabled={busy}
              onChange={(e) => setTrainSize(Number(e.target.value))}
            >
              {[30, 50, 100, 200, 500, 1000].map((n) => (
                <option value={n} key={n}>
                  {integer(n)} concursos anteriores
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Período de teste</span>
            <select
              value={testSize}
              disabled={busy}
              onChange={(e) => setTestSize(Number(e.target.value))}
            >
              {[50, 100, 250, 500, 1000].map((n) => (
                <option value={n} key={n}>
                  Últimos {integer(n)} concursos
                </option>
              ))}
            </select>
          </label>
          <label className="field seed-field">
            <span>Semente aleatória</span>
            <input
              type="number"
              value={seed}
              disabled={busy}
              min="0"
              max="4294967295"
              onChange={(e) => setSeed(e.target.value)}
            />
          </label>
          <button className="button primary" onClick={run} disabled={busy}>
            <Icon
              name={busy ? "refresh" : "play"}
              className={busy ? "spin" : ""}
              size={17}
            />
            {busy ? "Executando…" : "Executar teste"}
          </button>
        </div>
        <p className="microcopy">
          Mesmos dados, parâmetros e semente produzem o mesmo resultado.
          Treinamento móvel, sem incluir o concurso avaliado.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </section>
      {result ? (
        <>
          <section className="panel">
            <PanelHeading
              title="O que aconteceu fora da janela de treinamento"
              detail={`Concursos #${result.firstContest} a #${result.lastContest} · janela de ${result.settings.trainSize} · semente ${result.settings.seed}`}
              action={
                <button
                  className="button secondary"
                  onClick={() =>
                    downloadFile(
                      "loteria-lab-experimento.json",
                      JSON.stringify(
                        { dataFingerprint: runFingerprint, ...result },
                        null,
                        2,
                      ),
                      "application/json",
                    )
                  }
                >
                  <Icon name="download" size={16} />
                  Exportar teste
                </button>
              }
            />
            <div className="test-baseline">
              <div>
                <span>Expectativa por jogo</span>
                <strong>
                  0,60 <small>acerto</small>
                </strong>
              </div>
              <div>
                <span>Faixa de referência de 95%¹</span>
                <strong>
                  {decimal(result.baselineInterval[0], 3)} –{" "}
                  {decimal(result.baselineInterval[1], 3)}
                </strong>
              </div>
              <div>
                <span>Custo equivalente hoje, por método</span>
                <strong>{currency(result.equivalentCurrentCost)}</strong>
              </div>
            </div>
            <BacktestChart result={result} />
            <div className="table-scroll">
              <table className="backtest-table">
                <thead>
                  <tr>
                    <th>Método</th>
                    <th>Média de acertos</th>
                    <th>Quadras</th>
                    <th>Quinas</th>
                    <th>Senas</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((row, i) => (
                    <tr key={row.strategy}>
                      <td>
                        <span
                          className="strategy-color"
                          style={{ background: colors[i] }}
                        />
                        <strong>{STRATEGIES[row.strategy].label}</strong>
                      </td>
                      <td className="monospace">
                        {decimal(row.averageHits, 3)}
                      </td>
                      <td>{row.distribution[4]}</td>
                      <td>{row.distribution[5]}</td>
                      <td>{row.distribution[6]}</td>
                    </tr>
                  ))}
                  <tr className="expected-row">
                    <td>Expectativa matemática</td>
                    <td>0,600</td>
                    <td>{decimal(result.expectedDistribution[4], 3)}</td>
                    <td>{decimal(result.expectedDistribution[5], 4)}</td>
                    <td>{decimal(result.expectedDistribution[6], 6)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="microcopy">
              ¹ Intervalo aproximado para a média sob sorteios independentes:
              0,6 ± 1,96 × √(variância hipergeométrica / número de testes).
              Comparações múltiplas e escolhas feitas após ver os resultados
              impedem interpretar uma diferença isolada como evidência de
              previsão. O custo usa a tarifa atual; não é retorno financeiro
              histórico.
            </p>
          </section>
          <section className="panel">
            <PanelHeading
              title="Abra a caixa do experimento"
              detail="Os últimos cinco jogos gerados, com o limite dos dados usados."
              action={
                <select
                  className="select-control"
                  aria-label="Método para conferir jogos do teste"
                  value={detailStrategy}
                  onChange={(e) =>
                    setDetailStrategy(e.target.value as Strategy)
                  }
                >
                  {Object.entries(STRATEGIES).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.label}
                    </option>
                  ))}
                </select>
              }
            />
            <div className="experiment-examples">
              {result.results
                .find((row) => row.strategy === detailStrategy)!
                .examples.map((example) => (
                  <div className="experiment-example" key={example.contest}>
                    <div>
                      <strong>Concurso #{example.contest}</strong>
                      <small>Dados até #{example.trainingEnd}</small>
                    </div>
                    <div>
                      <span className="eyebrow">JOGO GERADO</span>
                      <Balls
                        numbers={example.ticket}
                        matches={example.actual}
                      />
                    </div>
                    <div>
                      <span className="eyebrow">RESULTADO OFICIAL</span>
                      <Balls numbers={example.actual} />
                    </div>
                    <span className="badge neutral">
                      {example.hits} {example.hits === 1 ? "acerto" : "acertos"}
                    </span>
                  </div>
                ))}
            </div>
          </section>
          <Notice>
            Este é um experimento retrospectivo exploratório. Uma estratégia
            pode superar outra nesta amostra por acaso. Para uma validação
            prospectiva, seria preciso congelar o método e acompanhar sorteios
            ainda não realizados.
          </Notice>
        </>
      ) : (
        <section className="panel">
          <EmptyState
            title="Coloque as hipóteses à prova"
            description="Compare frequências, duplas e seleção uniforme sob o mesmo orçamento. O teste apresenta acertos reais, expectativa matemática e os jogos de cada método."
            action={
              <span className="badge neutral">
                <Icon name="data" size={14} />
                {integer(draws.length)} concursos disponíveis
              </span>
            }
          />
        </section>
      )}
    </div>
  );
}

const collectionLabels = {
  ensemble: "Coleção automática",
  uniform: "Uniforme",
  uniformOptimized: "Uniforme + otimização",
};
const defaultOptions: GeneratorOptions = {
  strategy: "ensemble",
  objective: "sena",
  size: 6,
  count: 4,
  fixed: [],
  excluded: [],
  balanced: false,
};

export function BacktestView({
  draws,
  fingerprint,
  initialOptions,
}: {
  draws: Draw[];
  fingerprint: string;
  initialOptions?: GeneratorOptions;
}) {
  const [mode, setMode] = useState<"collection" | "individual">("collection");
  return (
    <div className="view-stack">
      <div className="backtest-form">
        <button
          className={`button ${mode === "collection" ? "primary" : "secondary"}`}
          onClick={() => setMode("collection")}
        >
          Coleções
        </button>
        <button
          className={`button ${mode === "individual" ? "primary" : "secondary"}`}
          onClick={() => setMode("individual")}
        >
          Métodos individuais
        </button>
      </div>
      {mode === "collection" ? (
        <CollectionBacktest
          draws={draws}
          fingerprint={fingerprint}
          options={initialOptions ?? defaultOptions}
        />
      ) : (
        <IndividualBacktestView draws={draws} fingerprint={fingerprint} />
      )}
    </div>
  );
}

function CollectionBacktest({
  draws,
  fingerprint,
  options,
}: {
  draws: Draw[];
  fingerprint: string;
  options: GeneratorOptions;
}) {
  const [trainSize, setTrainSize] = useState(100);
  const [testSize, setTestSize] = useState(50);
  const [seed, setSeed] = useState("42");
  const [seeds, setSeeds] = useState(3);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CollectionResult | null>(null);
  const [runFingerprint, setRunFingerprint] = useState("");
  const workerRef = useRef<Worker | null>(null);
  useEffect(() => () => workerRef.current?.terminate(), []);
  function run() {
    setError("");
    setProgress(0);
    setBusy(true);
    setResult(null);
    try {
      const worker = new BacktestWorker();
      workerRef.current = worker;
      worker.onmessage = (event) => {
        if (event.data.progress) {
          setProgress(event.data.progress.completed);
          return;
        }
        if (event.data.ok) {
          setResult(event.data.result);
          setRunFingerprint(fingerprint);
        } else setError(event.data.error);
        setBusy(false);
        worker.terminate();
        workerRef.current = null;
      };
      worker.onerror = () => {
        setError("Não foi possível executar o teste neste navegador.");
        setBusy(false);
        worker.terminate();
        workerRef.current = null;
      };
      worker.postMessage({
        mode: "collection",
        draws,
        settings: {
          trainSize,
          testSize,
          seed: seed.trim() ? Number(seed) : NaN,
          seeds,
          options,
        },
      });
    } catch {
      setError("Não foi possível iniciar o processamento local.");
      setBusy(false);
    }
  }
  const percent = (value: number) => `${decimal(value * 100, 6)}%`;
  return (
    <div className="view-stack">
      <Notice tone="green">
        <strong>Teste retrospectivo de coleções.</strong> Cada concurso usa
        apenas a janela anterior. Comparamos a coleção automática com jogos
        uniformes distintos e com candidatos uniformes escolhidos pelo mesmo
        otimizador de cobertura. Todos têm o mesmo número de jogos e candidatos;
        a seleção automática também equilibra seus métodos.
      </Notice>
      <section className="panel">
        <PanelHeading
          title="Protocolo da coleção"
          detail="Configuração atual do gerador; o teste sempre usa a coleção automática."
        />
        <p className="microcopy">
          Objetivo:{" "}
          {options.objective === "any-prize" ? "qualquer prêmio" : "Sena"} ·{" "}
          {options.count} jogos de {options.size} dezenas · Fixas:{" "}
          {options.fixed.join(", ") || "nenhuma"} · Excluídas:{" "}
          {options.excluded.join(", ") || "nenhuma"} · Pares equilibrados:{" "}
          {options.balanced ? "sim" : "não"} · Soma:{" "}
          {options.minSum ?? "sem mínimo"} a {options.maxSum ?? "sem máximo"}
        </p>
        <div className="backtest-form">
          <label className="field">
            <span>Janela anterior</span>
            <select
              disabled={busy}
              value={trainSize}
              onChange={(e) => setTrainSize(Number(e.target.value))}
            >
              {[30, 50, 100, 200, 500, 1000].map((n) => (
                <option key={n} value={n}>
                  {n} concursos
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Concursos de teste</span>
            <select
              disabled={busy}
              value={testSize}
              onChange={(e) => setTestSize(Number(e.target.value))}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} concursos
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Sementes</span>
            <select
              disabled={busy}
              value={seeds}
              onChange={(e) => setSeeds(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="field seed-field">
            <span>Semente inicial</span>
            <input
              type="number"
              min="0"
              max="4294967295"
              disabled={busy}
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
            />
          </label>
          {busy ? (
            <button
              className="button secondary"
              onClick={() => {
                workerRef.current?.terminate();
                workerRef.current = null;
                setBusy(false);
              }}
            >
              Cancelar
            </button>
          ) : (
            <button className="button primary" onClick={run}>
              Executar teste
            </button>
          )}
        </div>
        {busy && (
          <p role="status">
            Processando {progress} de {testSize} concursos…
          </p>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <p className="microcopy">
          O protocolo é fixado antes da execução. Configurações grandes podem
          exigir redução de jogos, dezenas, concursos ou sementes para limitar o
          trabalho no navegador.
        </p>
      </section>
      {result && (
        <section className="panel">
          {JSON.stringify({ ...options, strategy: "ensemble" }) !==
            JSON.stringify(result.settings.options) && (
            <Notice>
              O gerador mudou desde este teste. Os resultados abaixo mantêm a
              configuração congelada na execução; execute novamente para avaliar
              a configuração atual.
            </Notice>
          )}
          <PanelHeading
            title="Resultados por concurso"
            detail={`Concursos #${result.firstContest} a #${result.lastContest} · ${result.settings.seeds} sementes por concurso`}
            action={
              <button
                className="button secondary"
                onClick={() =>
                  downloadFile(
                    "loteria-lab-colecoes.json",
                    JSON.stringify(
                      { dataFingerprint: runFingerprint, ...result },
                      null,
                      2,
                    ),
                    "application/json",
                  )
                }
              >
                <Icon name="download" size={16} /> Exportar protocolo e
                resultados
              </button>
            }
          />
          <div className="table-scroll">
            <table className="backtest-table">
              <thead>
                <tr>
                  <th>Coleção</th>
                  <th>Melhor acerto médio</th>
                  <th>Jogos premiados médios</th>
                  <th>Jogos com 4 / 5 / 6 acertos</th>
                  <th>Concurso com prêmio</th>
                  <th>Concurso com sena</th>
                  <th>Cobertura Sena exata¹</th>
                  <th>Qualquer prêmio: limites¹</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((row) => (
                  <tr key={row.name}>
                    <td>
                      <strong>{collectionLabels[row.name]}</strong>
                    </td>
                    <td>{decimal(row.maxHits, 3)}</td>
                    <td>{decimal(row.prizeTickets, 3)}</td>
                    <td>
                      {decimal(row.four, 3)} / {decimal(row.five, 3)} /{" "}
                      {decimal(row.six, 3)}
                    </td>
                    <td>{percent(row.anyPrize)}</td>
                    <td>{percent(row.jackpot)}</td>
                    <td>{percent(row.jackpotProbability)}</td>
                    <td>
                      {percent(row.prizeLower)} – {percent(row.prizeUpper)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="microcopy">
            Custo equivalente por coleção, à tarifa atual:{" "}
            {currency(
              result.settings.options.count *
                choose(result.settings.options.size, 6) *
                MEGASENA.simplePrice,
            )}
            .
          </p>
          <p className="microcopy">
            ¹ Médias das coberturas teóricas de cada coleção, sob sorteio
            uniforme. A cobertura da Sena é exata; os limites de qualquer prêmio
            são garantidos, não intervalos de confiança. Jogos premiados contam
            bilhetes com pelo menos quatro acertos; não representam retorno
            financeiro.
          </p>
          <details>
            <summary>Resultados por concurso (média das sementes)</summary>
            <div className="table-scroll">
              <table className="backtest-table">
                <thead>
                  <tr>
                    <th>Concurso</th>
                    <th>Dados até</th>
                    <th>Coleção</th>
                    <th>Melhor acerto</th>
                    <th>Jogos com 4 / 5 / 6 acertos</th>
                    <th>Com prêmio</th>
                  </tr>
                </thead>
                <tbody>
                  {result.contests.flatMap((contest) =>
                    result.results.map((row) => {
                      const average = (
                        key: "maxHits" | "four" | "five" | "six" | "anyPrize",
                      ) =>
                        contest.runs.reduce(
                          (sum, run) => sum + run.outcomes[row.name][key],
                          0,
                        ) / contest.runs.length;
                      return (
                        <tr key={`${contest.contest}-${row.name}`}>
                          <td>#{contest.contest}</td>
                          <td>#{contest.trainingEnd}</td>
                          <td>{collectionLabels[row.name]}</td>
                          <td>{decimal(average("maxHits"), 2)}</td>
                          <td>
                            {decimal(average("four"), 2)} /{" "}
                            {decimal(average("five"), 2)} /{" "}
                            {decimal(average("six"), 2)}
                          </td>
                          <td>{percent(average("anyPrize"))}</td>
                        </tr>
                      );
                    }),
                  )}
                </tbody>
              </table>
            </div>
          </details>
          <p>
            <strong>
              Métrica principal predefinida: diferença pareada no melhor acerto
              médio (automática menos controle).
            </strong>
          </p>
          <ul>
            {result.comparisons.map((c) => (
              <li key={c.baseline}>
                {collectionLabels[c.baseline]}: {decimal(c.mean, 3)} (intervalo
                aproximado de 95%: {decimal(c.interval[0], 3)} a{" "}
                {decimal(c.interval[1], 3)})
              </li>
            ))}
          </ul>
          <p className="microcopy">
            A incerteza usa as diferenças médias entre sementes em cada
            concurso; o número de concursos, não de sementes, determina o
            tamanho da amostra. O intervalo é uma aproximação normal
            exploratória, sem ajuste para as duas comparações. Janelas de
            treinamento sobrepostas e padrões repetidos na base podem criar
            dependência entre concursos; a aproximação pode ser imprecisa,
            sobretudo para prêmios raros ou quando todas as diferenças são
            iguais. Não é teste de significância.
          </p>
          <Notice>
            Experimento exploratório, não evidência de capacidade preditiva.
            Quadras, quinas e especialmente senas são raras; ausência ou
            presença de prêmios nesta amostra não demonstra vantagem. Escolher
            parâmetros após observar resultados aumenta o risco de conclusões
            por acaso. Uma avaliação prospectiva exige congelar o protocolo
            antes de novos sorteios.
          </Notice>
        </section>
      )}
    </div>
  );
}
