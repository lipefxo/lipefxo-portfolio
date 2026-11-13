"use client";

import { useMemo, useState } from "react";
import {
  choose,
  matchProbability,
  sumOf,
  SUM_BINS,
  theoreticalSumDistribution,
  type Summary,
} from "../../lib/lottery/math";
import type { Draw } from "../../lib/lottery/types";
import {
  ballLabel,
  Balls,
  decimal,
  Icon,
  integer,
  Notice,
  PanelHeading,
  Sparkline,
} from "./ui";

export function FrequencyPanel({
  summary,
  draws,
  expanded = false,
}: {
  summary: Summary;
  draws: Draw[];
  expanded?: boolean;
}) {
  const [mode, setMode] = useState<"frequency" | "gap">("frequency");
  const [selected, setSelected] = useState(10);
  const stat = summary.numbers[selected - 1];
  const values = summary.numbers.map((s) =>
    mode === "frequency" ? s.count : s.gap,
  );
  const min = Math.min(...values);
  const max = Math.max(...values);
  const history = useMemo(() => {
    const size = Math.max(1, Math.ceil(draws.length / 16));
    return Array.from(
      { length: Math.ceil(draws.length / size) },
      (_, i) =>
        draws
          .slice(i * size, (i + 1) * size)
          .filter((draw) => draw.numbers.includes(selected)).length,
    );
  }, [draws, selected]);
  return (
    <section className={`panel frequency-panel ${expanded ? "expanded" : ""}`}>
      <PanelHeading
        title={
          mode === "frequency"
            ? "Frequência das dezenas"
            : "Intervalo sem aparecer"
        }
        detail={
          mode === "frequency"
            ? "Quantas vezes cada dezena saiu no período."
            : "Concursos desde a última ocorrência, dentro do período."
        }
        action={
          <div className="segmented small" aria-label="Métrica do mapa">
            <button
              aria-pressed={mode === "frequency"}
              className={mode === "frequency" ? "active" : ""}
              onClick={() => setMode("frequency")}
            >
              Frequência
            </button>
            <button
              aria-pressed={mode === "gap"}
              className={mode === "gap" ? "active" : ""}
              onClick={() => setMode("gap")}
            >
              Intervalo
            </button>
          </div>
        }
      />
      <div className="number-heatmap">
        {summary.numbers.map((n, i) => {
          const level =
            max === min
              ? 2
              : Math.min(4, Math.floor(((values[i] - min) / (max - min)) * 4));
          return (
            <button
              key={n.number}
              className={`heat-cell level-${level} ${selected === n.number ? "selected" : ""}`}
              aria-pressed={selected === n.number}
              aria-label={`Dezena ${ballLabel(n.number)}: ${mode === "frequency" ? `${n.count} ocorrências` : `${n.censored ? "pelo menos " : ""}${n.gap} concursos sem aparecer`}`}
              onClick={() => setSelected(n.number)}
            >
              <span>{ballLabel(n.number)}</span>
              <small>
                {mode === "frequency"
                  ? `${integer(n.count)}×`
                  : `${n.censored ? "≥" : ""}${n.gap}`}
              </small>
            </button>
          );
        })}
      </div>
      <div className="heatmap-key">
        <span>Clique em uma dezena para explorar</span>
        <div>
          <span>Menos</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <i key={level} className={`level-${level}`} />
          ))}
          <span>Mais</span>
        </div>
      </div>
      <div className="number-insight" aria-live="polite">
        <span className="insight-number">{ballLabel(selected)}</span>
        <div>
          <strong>
            {integer(stat.count)} ocorrências{" "}
            <span>em {integer(summary.count)} concursos</span>
          </strong>
          <p>
            {decimal(stat.rate * 100)}% dos sorteios <span>·</span> esperado:
            10% <span>·</span> intervalo: {stat.censored ? "≥ " : ""}
            {stat.gap}
          </p>
        </div>
        <Sparkline values={history} />
      </div>
      {expanded && (
        <p className="microcopy">
          A linha mostra ocorrências em blocos consecutivos do período; o último
          bloco pode ser menor. “≥” indica que a dezena não apareceu na janela.
          Intervalos e frequências descrevem o passado.
        </p>
      )}
    </section>
  );
}

export function RankingPanel({
  summary,
  onExplore,
}: {
  summary: Summary;
  onExplore?: () => void;
}) {
  const [mode, setMode] = useState<"frequent" | "gap">("frequent");
  const sorted = [...summary.numbers]
    .sort(
      (a, b) =>
        (mode === "frequent" ? b.count - a.count : b.gap - a.gap) ||
        a.number - b.number,
    )
    .slice(0, 5);
  const max = Math.max(
    1,
    mode === "frequent" ? sorted[0].count : sorted[0].gap,
  );
  return (
    <section className="panel ranking-panel">
      <PanelHeading title="Em destaque" detail="Os extremos da sua janela." />
      <div className="segmented full">
        <button
          className={mode === "frequent" ? "active" : ""}
          aria-pressed={mode === "frequent"}
          onClick={() => setMode("frequent")}
        >
          Mais frequentes
        </button>
        <button
          className={mode === "gap" ? "active" : ""}
          aria-pressed={mode === "gap"}
          onClick={() => setMode("gap")}
        >
          Maior intervalo
        </button>
      </div>
      <div className="rank-list">
        {sorted.map((stat, i) => (
          <div className="rank-row" key={stat.number}>
            <span className="rank-position">{i + 1}</span>
            <span className="rank-ball">{ballLabel(stat.number)}</span>
            <div className="rank-track">
              <span
                style={{
                  width: `${((mode === "frequent" ? stat.count : stat.gap) / max) * 100}%`,
                }}
              />
            </div>
            <strong>
              {mode === "frequent"
                ? `${stat.count}×`
                : `${stat.censored ? "≥" : ""}${stat.gap}`}
            </strong>
          </div>
        ))}
      </div>
      <p className="microcopy">
        {mode === "frequent"
          ? "Sair mais vezes no passado não torna uma dezena mais provável no próximo sorteio."
          : "Uma dezena não fica “devendo” uma aparição. A chance continua sendo 10% por concurso."}
      </p>
      {onExplore && (
        <button className="text-button panel-link" onClick={onExplore}>
          Explorar todas as análises <Icon name="right" size={16} />
        </button>
      )}
    </section>
  );
}

export function DistributionPanel({
  summary,
  kind,
}: {
  summary: Summary;
  kind: "parity" | "sum" | "repeats";
}) {
  const theory = useMemo(() => theoreticalSumDistribution(), []);
  let bars: { label: string; count: number; expected: number }[];
  if (kind === "parity")
    bars = summary.parity.map((count, even) => ({
      label: `${even}P / ${6 - even}I`,
      count,
      expected:
        ((choose(30, even) * choose(30, 6 - even)) / choose(60, 6)) *
        summary.count,
    }));
  else if (kind === "sum")
    bars = SUM_BINS.map(([min, max]) => ({
      label: `${min}–${max}`,
      count: summary.sums.filter((sum) => sum >= min && sum <= max).length,
      expected: sumOf(theory.slice(min, max + 1)) * summary.count,
    }));
  else
    bars = summary.repeats.map((count, k) => ({
      label: String(k),
      count,
      expected: matchProbability(6, k) * Math.max(0, summary.count - 1),
    }));
  const maximum = Math.max(
    1,
    ...bars.flatMap((bar) => [bar.count, bar.expected]),
  );
  const title =
    kind === "parity"
      ? "Pares e ímpares"
      : kind === "sum"
        ? "A soma das dezenas"
        : "Repetições do concurso anterior";
  const detail =
    kind === "parity"
      ? "Distribuição dos seis números sorteados."
      : kind === "sum"
        ? `Média observada: ${decimal(summary.averageSum)} · teórica: 183`
        : "Quantas dezenas voltaram no sorteio seguinte.";
  return (
    <section className="panel distribution-panel">
      <PanelHeading title={title} detail={detail} />
      <div className="chart-legend">
        <span>
          <i className="observed" />
          Histórico
        </span>
        <span>
          <i className="expected" />
          Esperado ao acaso
        </span>
      </div>
      <div className="distribution-chart" aria-label={title}>
        {bars.map((bar) => (
          <div className="bar-column" key={bar.label}>
            <span className="bar-value">{bar.count}</span>
            <div className="bar-slot">
              <div
                className="bar observed"
                style={{ height: `${(bar.count / maximum) * 100}%` }}
                title={`${bar.count} ocorrências`}
              />
              <div
                className="bar expected"
                style={{ height: `${(bar.expected / maximum) * 100}%` }}
                title={`${decimal(bar.expected)} esperadas`}
              />
            </div>
            <span className="bar-label">{bar.label}</span>
          </div>
        ))}
      </div>
      <details className="chart-details">
        <summary>
          Ver valores e interpretação <Icon name="down" size={14} />
        </summary>
        <table className="compact-table">
          <thead>
            <tr>
              <th>Grupo</th>
              <th>Observado</th>
              <th>Esperado</th>
            </tr>
          </thead>
          <tbody>
            {bars.map((bar) => (
              <tr key={bar.label}>
                <td>{bar.label}</td>
                <td>{bar.count}</td>
                <td>{decimal(bar.expected, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="microcopy">
          {kind === "parity"
            ? "P = pares; I = ímpares. Há mais combinações equilibradas, mas cada combinação específica tem a mesma chance."
            : kind === "sum"
              ? "O centro reúne mais combinações diferentes. Filtrar pela soma não aumenta a probabilidade individual do jogo."
              : "A referência é hipergeométrica. Um número do sorteio anterior continua com chance de 10% no seguinte."}
        </p>
      </details>
    </section>
  );
}

export function PairsPanel({ summary }: { summary: Summary }) {
  return (
    <section className="panel pairs-panel">
      <PanelHeading
        title="Duplas mais recorrentes"
        detail={`Esperado por dupla na janela: ${decimal(summary.expectedPairCount, 2)} ocorrências.`}
      />
      <div className="pair-list">
        {summary.pairs.slice(0, 8).map((pair, i) => (
          <div className="pair-row" key={pair.numbers.join("-")}>
            <span className="rank-position">{i + 1}</span>
            <Balls numbers={pair.numbers} />
            <span>
              {integer(pair.count)} <small>vezes juntas</small>
            </span>
            <span className="pair-rate">
              {decimal((pair.count / summary.count) * 100)}%
            </span>
          </div>
        ))}
      </div>
      <p className="microcopy">
        São 1.770 duplas possíveis. Algumas se destacam por acaso quando tantas
        são comparadas. Esta lista é descritiva, sem teste de vantagem
        preditiva.
      </p>
    </section>
  );
}

export function AnalysisView({
  summary,
  draws,
}: {
  summary: Summary;
  draws: Draw[];
}) {
  return (
    <div className="view-stack">
      <div className="analysis-grid">
        <FrequencyPanel summary={summary} draws={draws} expanded />
        <RankingPanel summary={summary} />
      </div>
      <div className="three-grid">
        <DistributionPanel summary={summary} kind="parity" />
        <DistributionPanel summary={summary} kind="sum" />
        <DistributionPanel summary={summary} kind="repeats" />
      </div>
      <div className="two-grid">
        <PairsPanel summary={summary} />
        <section className="panel">
          <PanelHeading
            eyebrow="RESULTADOS COMPLETOS"
            title="Uma combinação já se repetiu?"
            detail="Comparação das seis dezenas, sem considerar a ordem."
          />
          {summary.repeatedResults.length ? (
            <div className="repeated-list">
              {summary.repeatedResults.slice(0, 10).map((result) => (
                <div key={result.numbers.join("-")}>
                  <Balls numbers={result.numbers} />
                  <p>
                    {result.count} ocorrências · concursos{" "}
                    {result.contests.join(", ")}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="result-observation">
              <Icon name="layers" size={34} />
              <strong>Nenhum resultado completo repetido</strong>
              <p>
                Nas {integer(summary.count)} extrações desta janela, não há dois
                concursos com as mesmas seis dezenas.
              </p>
            </div>
          )}
          <Notice>
            Uma combinação já sorteada mantém a mesma probabilidade de qualquer
            outra. Excluir resultados antigos reduz o conjunto de escolhas, sem
            criar vantagem por jogo.
          </Notice>
        </section>
      </div>
    </div>
  );
}
