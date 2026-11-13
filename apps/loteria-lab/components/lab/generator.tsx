"use client";

import { useEffect, useRef, useState } from "react";
import GenerationWorker from "../../lib/lottery/generation-worker?worker";
import type { CollectionMetrics } from "../../lib/lottery/generation-worker";
import { MEGASENA, OBJECTIVES, STRATEGIES } from "../../lib/lottery/games";
import { winningOutcomeCount } from "../../lib/lottery/portfolio";
import { ticketMetrics, TOTAL_COMBINATIONS } from "../../lib/lottery/math";
import type {
  Draw,
  GenerationObjective,
  GeneratorOptions,
  SavedGame,
  Strategy,
} from "../../lib/lottery/types";
import {
  Balls,
  ballLabel,
  currency,
  decimal,
  downloadFile,
  EmptyState,
  Icon,
  integer,
  Notice,
  PanelHeading,
} from "./ui";

export function GeneratorView({
  draws,
  fingerprint,
  saved,
  onSave,
  onTest,
}: {
  draws: Draw[];
  fingerprint: string;
  saved: SavedGame[];
  onSave: (games: SavedGame[]) => void;
  onTest: (options: GeneratorOptions) => void;
}) {
  const [objective, setObjective] = useState<GenerationObjective>("sena");
  const [size, setSize] = useState(6);
  const [count, setCount] = useState(4);
  const [budget, setBudget] = useState("24");
  const [fixed, setFixed] = useState<number[]>([]);
  const [excluded, setExcluded] = useState<number[]>([]);
  const [selectionMode, setSelectionMode] = useState<"fixed" | "excluded">(
    "fixed",
  );
  const [balanced, setBalanced] = useState(false);
  const [minSum, setMinSum] = useState("");
  const [maxSum, setMaxSum] = useState("");
  const [games, setGames] = useState<SavedGame[]>([]);
  const [error, setError] = useState("");
  const [partial, setPartial] = useState(false);
  const [busy, setBusy] = useState(false);
  const metrics = ticketMetrics(size);
  const workerRef = useRef<Worker | null>(null);
  useEffect(() => () => workerRef.current?.terminate(), []);
  const [portfolio, setPortfolio] = useState<CollectionMetrics | null>(null);
  const composition = games[0]?.generation?.methods ?? [];
  const representedMethods = composition.filter(
    (method) => method.selected > 0,
  ).length;
  const totalCost = metrics.cost * count;
  const budgetValue = budget.trim() ? Number(budget) : NaN;
  const budgetValid = Number.isFinite(budgetValue) && budgetValue >= totalCost;
  const options: GeneratorOptions = {
    strategy: "ensemble",
    objective,
    size,
    count,
    fixed: [...fixed],
    excluded: [...excluded],
    balanced,
    minSum: minSum === "" ? undefined : Number(minSum),
    maxSum: maxSum === "" ? undefined : Number(maxSum),
  };
  const changed =
    games.length > 0 &&
    JSON.stringify(games[0].generatorOptions) !== JSON.stringify(options);
  const configuration =
    `${fixed.length ? `Fixas: ${fixed.map(ballLabel).join(", ")}. ` : ""}${excluded.length ? `Excluídas: ${excluded.map(ballLabel).join(", ")}. ` : ""}${balanced ? "Pares e ímpares equilibrados. " : ""}${minSum || maxSum ? `Soma: ${minSum || "sem mínimo"} a ${maxSum || "sem máximo"}.` : ""}`.trim() ||
    "Sem restrições adicionais.";

  function toggleNumber(number: number) {
    setError("");
    if (selectionMode === "fixed") {
      if (!fixed.includes(number) && fixed.length >= size) {
        setError(
          `O jogo já tem ${size} dezenas fixas. Remova uma ou aumente o tamanho.`,
        );
        return;
      }
      setFixed((prev) =>
        prev.includes(number)
          ? prev.filter((n) => n !== number)
          : [...prev, number].sort((a, b) => a - b),
      );
      setExcluded((prev) => prev.filter((n) => n !== number));
    } else {
      setExcluded((prev) =>
        prev.includes(number)
          ? prev.filter((n) => n !== number)
          : [...prev, number].sort((a, b) => a - b),
      );
      setFixed((prev) => prev.filter((n) => n !== number));
    }
  }

  function generate() {
    if (!budgetValid) {
      setError("Ajuste o orçamento ou reduza a quantidade de jogos.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      workerRef.current?.terminate();
      const worker = new GenerationWorker();
      workerRef.current = worker;
      worker.onmessage = (event) => {
        if (event.data.ok) {
          setGames(event.data.games);
          setPortfolio(event.data.portfolio);
          setPartial(!event.data.complete);
        } else setError(event.data.error);
        setBusy(false);
        worker.terminate();
        workerRef.current = null;
      };
      worker.onerror = () => {
        setError("Não foi possível iniciar a geração. Tente novamente.");
        setBusy(false);
        worker.terminate();
        workerRef.current = null;
      };
      worker.postMessage({ draws, options, fingerprint, configuration });
    } catch {
      setBusy(false);
      setError("Não foi possível iniciar o processamento local.");
    }
  }

  return (
    <div className="view-stack generator-workflow">
      <section className="panel generator-quick">
        <PanelHeading
          title="Comece pelo seu orçamento"
          detail="Escolha um limite para a coleção."
        />
        <fieldset className="generation-controls" disabled={busy}>
          <legend className="sr-only">Configuração da coleção</legend>
          <label className="field budget-field">
            <span>Orçamento máximo (R$)</span>
            <input
              type="number"
              min="6"
              step="0.01"
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
            />
          </label>
          <div className="form-row">
            <label className="field">
              <span>Dezenas por jogo</span>
              <select
                value={size}
                onChange={(e) => {
                  setSize(Number(e.target.value));
                  setError("");
                }}
              >
                {Array.from({ length: 15 }, (_, i) => (
                  <option key={i + 6} value={i + 6}>
                    {i + 6} dezenas
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Quantidade de jogos</span>
              <select
                value={count}
                onChange={(e) => {
                  setCount(Number(e.target.value));
                  setError("");
                }}
              >
                {Array.from({ length: 20 }, (_, index) => index + 1).map(
                  (n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "jogo" : "jogos"}
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>
          <fieldset
            className="objective-options"
            aria-describedby="objective-detail"
          >
            <legend className="sr-only">Objetivo da geração</legend>
            {(
              Object.entries(OBJECTIVES) as [
                GenerationObjective,
                (typeof OBJECTIVES)[GenerationObjective],
              ][]
            ).map(([key, value]) => (
              <label
                key={key}
                className={`strategy-option objective-option ${objective === key ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="objective"
                  value={key}
                  checked={objective === key}
                  onChange={() => {
                    setObjective(key);
                    setError("");
                  }}
                />
                <span>
                  <strong>{value.label}</strong>
                  <small>
                    {key === "sena"
                      ? "Combinações distintas de 6 dezenas."
                      : "Ao menos um jogo com 4 ou mais acertos."}
                  </small>
                </span>
                {objective === key && <Icon name="check" size={17} />}
              </label>
            ))}
          </fieldset>
          <p id="objective-detail" className="microcopy">
            Mesma quantidade e custo nos dois objetivos. Os métodos não
            demonstram vantagem preditiva.
          </p>
        </fieldset>
        <div className="generation-action">
          <div>
            <span>Total da coleção</span>
            <strong>{currency(totalCost)}</strong>
            <small>
              {count} jogos · {currency(metrics.cost)} por jogo
            </small>
          </div>
          <button
            className="button primary generate-button"
            onClick={generate}
            disabled={busy || !budgetValid}
          >
            <Icon
              name={busy ? "refresh" : "shuffle"}
              className={busy ? "spin" : ""}
              size={17}
            />
            {busy ? "Montando sua coleção…" : "Gerar minha coleção"}
          </button>
          {busy && (
            <button
              className="text-button"
              onClick={() => {
                workerRef.current?.terminate();
                workerRef.current = null;
                setBusy(false);
              }}
            >
              Cancelar
            </button>
          )}
        </div>
        {!budgetValid && (
          <p className="form-error" role="status">
            O total de {currency(totalCost)} ultrapassa o orçamento informado.
            Reduza o tamanho ou a quantidade, ou ajuste o limite.
          </p>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <p className="microcopy">
          {configuration}{" "}
          {size > 6
            ? `Cada jogo cobre ${integer(metrics.combinations)} combinações simples pagas.`
            : "Cada jogo cobre uma combinação simples."}
        </p>
      </section>
      <div className="generator-layout">
        <div className="view-stack generator-details">
          <details className="panel disclosure-panel">
            <summary>
              Filtros opcionais{" "}
              <span>
                {fixed.length} fixas · {excluded.length} excluídas
              </span>
              <Icon name="down" size={16} />
            </summary>
            <p className="microcopy">
              Não aumentam a chance de uma combinação. Dezenas fixas podem
              limitar a diversificação.
            </p>
            <fieldset className="generation-controls" disabled={busy}>
              <legend className="sr-only">Filtros opcionais</legend>
              <div className="number-selector-header">
                <div className="segmented small">
                  <button
                    className={selectionMode === "fixed" ? "active" : ""}
                    aria-pressed={selectionMode === "fixed"}
                    onClick={() => setSelectionMode("fixed")}
                  >
                    <Icon name="lock" size={13} />
                    Fixar dezenas
                  </button>
                  <button
                    className={selectionMode === "excluded" ? "active" : ""}
                    aria-pressed={selectionMode === "excluded"}
                    onClick={() => setSelectionMode("excluded")}
                  >
                    <Icon name="close" size={14} />
                    Excluir
                  </button>
                </div>
                <button
                  className="text-button"
                  onClick={() => {
                    setFixed([]);
                    setExcluded([]);
                  }}
                >
                  Limpar
                </button>
              </div>
              <div className="pick-grid">
                {Array.from({ length: 60 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    className={`pick-number ${fixed.includes(n) ? "fixed" : ""} ${excluded.includes(n) ? "excluded" : ""}`}
                    aria-label={`${selectionMode === "fixed" ? "Fixar" : "Excluir"} dezena ${ballLabel(n)}${fixed.includes(n) ? ", fixa" : excluded.includes(n) ? ", excluída" : ""}`}
                    aria-pressed={
                      selectionMode === "fixed"
                        ? fixed.includes(n)
                        : excluded.includes(n)
                    }
                    onClick={() => toggleNumber(n)}
                  >
                    {ballLabel(n)}
                  </button>
                ))}
              </div>
              <p className="microcopy">
                {fixed.length} fixas · {excluded.length} excluídas ·{" "}
                {60 - excluded.length} disponíveis
              </p>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={balanced}
                  onChange={(e) => {
                    setBalanced(e.target.checked);
                    setError("");
                  }}
                />
                <span>
                  Equilibrar pares e ímpares{" "}
                  <small>Diferença de, no máximo, uma dezena.</small>
                </span>
              </label>
              <div className="form-row">
                <label className="field">
                  <span>
                    Soma mínima <small>opcional</small>
                  </span>
                  <input
                    type="number"
                    placeholder="Sem limite"
                    value={minSum}
                    onChange={(e) => {
                      setMinSum(e.target.value);
                      setError("");
                    }}
                  />
                </label>
                <label className="field">
                  <span>
                    Soma máxima <small>opcional</small>
                  </span>
                  <input
                    type="number"
                    placeholder="Sem limite"
                    value={maxSum}
                    onChange={(e) => {
                      setMaxSum(e.target.value);
                      setError("");
                    }}
                  />
                </label>
              </div>
            </fieldset>
          </details>
          <details className="panel disclosure-panel">
            <summary>
              Como os quatro métodos participam <Icon name="down" size={16} />
            </summary>
            <ul className="ensemble-methods">
              {(
                Object.entries(STRATEGIES) as [
                  Strategy,
                  (typeof STRATEGIES)[Strategy],
                ][]
              ).map(([key, value]) => (
                <li key={key}>
                  <span className="ensemble-method-icon">
                    <Icon
                      name={
                        key === "uniform"
                          ? "shuffle"
                          : key === "pairs"
                            ? "layers"
                            : key === "frequent"
                              ? "analysis"
                              : "history"
                      }
                      size={17}
                    />
                  </span>
                  <span>
                    <strong>{value.label}</strong>
                    <small>{value.description}</small>
                  </span>
                </li>
              ))}
            </ul>
            <div className="ensemble-explanation">
              <Icon name="layers" size={17} />
              <p>
                O sistema alterna os métodos e, em cada rodada, escolhe jogos
                que aproveitem a cobertura do conjunto. Combinações repetidas
                são descartadas.
              </p>
            </div>
            <p className="microcopy">
              Com 4 ou mais jogos, cada método pode participar da coleção. Seus
              filtros e os jogos encontrados podem limitar essa distribuição.
              Misturar métodos não comprova vantagem de previsão.
            </p>
            <div className="training-caption">
              <Icon name="data" size={15} />
              {integer(draws.length)} concursos · #{draws[0].contest} a #
              {draws.at(-1)!.contest}
            </div>
            <button
              className="button secondary"
              onClick={() => onTest(options)}
            >
              Testar esta configuração
            </button>
          </details>
        </div>
        <div className="view-stack generated-column">
          <section className="panel generated-panel">
            <PanelHeading
              eyebrow="02 / RESULTADO"
              title="Sua coleção de jogos"
              detail="Métodos diferentes, organizados para o mesmo objetivo."
              action={
                games.length ? (
                  <span className="badge neutral">
                    {games.length} {games.length === 1 ? "jogo" : "jogos"} ·{" "}
                    {
                      OBJECTIVES[games[0].generatorOptions?.objective ?? "sena"]
                        .label
                    }
                  </span>
                ) : undefined
              }
            />
            {!games.length ? (
              <EmptyState
                title="Uma coleção pensada como conjunto"
                description="Defina seu objetivo e a quantidade de jogos. O app combina os métodos e mostra de onde veio cada jogo, o custo e as chances da coleção."
              />
            ) : (
              <>
                {changed && (
                  <Notice tone="amber">
                    Os controles foram alterados. Os jogos abaixo preservam a
                    configuração anterior; gere novamente para aplicar as
                    mudanças.
                  </Notice>
                )}
                {partial && (
                  <Notice tone="amber">
                    Foram encontrados {games.length} jogos distintos. Os filtros
                    limitaram a busca; amplie os critérios para gerar mais.
                  </Notice>
                )}
                <section
                  className="collection-composition"
                  aria-label="Composição da coleção"
                >
                  <div className="collection-composition-heading">
                    <Icon name="layers" size={17} />
                    <strong>
                      {representedMethods}{" "}
                      {representedMethods === 1
                        ? "método nesta coleção"
                        : "métodos nesta coleção"}
                    </strong>
                    <span>
                      {integer(
                        games[0].generation?.candidatesConsidered ??
                          games.length,
                      )}{" "}
                      opções analisadas
                    </span>
                  </div>
                  <ul className="collection-method-counts">
                    {composition.map((method) => (
                      <li
                        key={method.strategy}
                        className={method.selected ? "" : "unused"}
                      >
                        <span>{STRATEGIES[method.strategy].short}</span>
                        <strong>
                          {method.selected}{" "}
                          {method.selected === 1 ? "jogo" : "jogos"}
                        </strong>
                      </li>
                    ))}
                  </ul>
                  <p className="microcopy">
                    {games.length < 4
                      ? "Com menos de quatro jogos, nem todos os métodos aparecem na coleção. A distribuição acima corresponde aos jogos gerados."
                      : representedMethods < 4
                        ? "Os filtros ou os candidatos encontrados limitaram a participação de alguns métodos. A quantidade gerada e o custo real aparecem abaixo."
                        : "Cada método participa da coleção. A quantidade de jogos por método é equilibrada conforme as opções disponíveis."}
                  </p>
                </section>
                <div className="generated-list">
                  {games.map((game, index) => {
                    const isSaved = saved.some((item) => item.id === game.id);
                    return (
                      <article className="generated-game" key={game.id}>
                        <div className="generated-game-header">
                          <span>JOGO {String(index + 1).padStart(2, "0")}</span>
                          <button
                            className={`text-button ${isSaved ? "is-saved" : ""}`}
                            disabled={isSaved}
                            aria-label={`${isSaved ? "Jogo salvo" : "Salvar jogo"} ${String(index + 1).padStart(2, "0")}`}
                            onClick={() => onSave([game])}
                          >
                            <Icon
                              name={isSaved ? "check" : "saved"}
                              size={15}
                            />
                            {isSaved ? "Salvo" : "Salvar"}
                          </button>
                        </div>
                        <Balls numbers={game.numbers} size="large" />
                        <details className="game-criteria">
                          <summary>
                            Ver detalhes <Icon name="down" size={14} />
                          </summary>
                          <p>
                            {STRATEGIES[game.strategy].label} ·{" "}
                            {
                              OBJECTIVES[
                                game.generatorOptions?.objective ?? "sena"
                              ].label
                            }
                          </p>
                          <ul>
                            {game.reasoning.map((reason) => (
                              <li key={reason}>{reason}</li>
                            ))}
                          </ul>
                          <p>
                            Sena: 1 em{" "}
                            {decimal(
                              ticketMetrics(game.numbers.length).oneIn,
                              game.numbers.length === 6 ? 0 : 2,
                            )}
                            . Qualquer prêmio: 1 em{" "}
                            {decimal(
                              TOTAL_COMBINATIONS /
                                winningOutcomeCount(game.numbers.length),
                              2,
                            )}
                            .
                          </p>
                          <p>{game.constraints}</p>
                          <p>
                            {game.trainingCount} concursos, de #
                            {game.trainingStart} a #{game.trainingEnd}. Gerado
                            em{" "}
                            {new Intl.DateTimeFormat("pt-BR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            }).format(new Date(game.createdAt))}
                            .
                          </p>
                          {game.dataFingerprint && (
                            <p>
                              Identidade da base (SHA-256)
                              <code>{game.dataFingerprint}</code>
                            </p>
                          )}
                        </details>
                      </article>
                    );
                  })}
                </div>
                {portfolio && (
                  <div className="portfolio-summary">
                    <h3>Cobertura desta seleção</h3>
                    <div>
                      <span>Combinações simples distintas</span>
                      <strong>{integer(portfolio.distinctCombinations)}</strong>
                    </div>
                    <div>
                      <span>Combinações sobrepostas</span>
                      <strong>
                        {integer(portfolio.overlappingCombinations)}
                      </strong>
                    </div>
                    <div>
                      <span>Custo total equivalente</span>
                      <strong>{currency(portfolio.cost)}</strong>
                    </div>
                    <div>
                      <span>Chance de Sena · exata</span>
                      <strong>
                        1 em {decimal(1 / portfolio.probability, 2)}
                      </strong>
                    </div>
                    <div>
                      <span>
                        Qualquer prêmio ·{" "}
                        {portfolio.anyPrize.exact
                          ? "exata"
                          : "limites matemáticos"}
                      </span>
                      <strong>
                        {portfolio.anyPrize.exact
                          ? `1 em ${decimal(1 / portfolio.anyPrize.lowerProbability, 2)}`
                          : `${decimal(portfolio.anyPrize.lowerProbability * 100, 6)}% a ${decimal(portfolio.anyPrize.upperProbability * 100, 6)}%`}
                      </strong>
                    </div>
                    <div>
                      <span>Combinações distintas por R$ 1</span>
                      <strong>
                        {decimal(
                          portfolio.distinctCombinations / portfolio.cost,
                          4,
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>Custo de combinações sobrepostas</span>
                      <strong>
                        {currency(
                          portfolio.overlappingCombinations *
                            MEGASENA.simplePrice,
                        )}
                      </strong>
                    </div>
                    {!portfolio.anyPrize.exact && (
                      <div>
                        <span>Amplitude dos limites de qualquer prêmio</span>
                        <strong>
                          {decimal(
                            (portfolio.anyPrize.upperProbability -
                              portfolio.anyPrize.lowerProbability) *
                              100,
                            6,
                          )}{" "}
                          p.p.
                        </strong>
                      </div>
                    )}
                    <p className="microcopy">
                      Cobertura calculada pela união das combinações de 6
                      dezenas. Sobreposições pagas não aumentam essa chance.
                    </p>
                    <p className="microcopy">
                      Qualquer prêmio significa pelo menos um jogo com 4 ou mais
                      acertos no mesmo sorteio.
                      {portfolio.anyPrize.exact
                        ? " A chance do conjunto foi determinada exatamente."
                        : " O valor exato está entre os limites informados; o intervalo não é uma estimativa estatística."}
                    </p>
                    <p className="microcopy">
                      {games.length === 1
                        ? "Com um único jogo, os dois objetivos têm as mesmas probabilidades."
                        : games[0].generatorOptions?.objective === "sena" &&
                            games.every((game) => game.numbers.length === 6)
                          ? "Os jogos simples são distintos: nenhuma combinação de Sena é paga mais de uma vez."
                          : `A seleção alterna os métodos entre ${integer(games[0].generation?.candidatesConsidered ?? games.length)} opções válidas e busca reduzir sobreposições dentro de cada rodada. É uma busca limitada, sem garantia de conjunto ótimo. As restrições são respeitadas.`}
                    </p>
                  </div>
                )}
                <button
                  className="button secondary"
                  onClick={() => onTest(games[0].generatorOptions!)}
                >
                  Testar configuração desta coleção
                </button>
                <div className="generated-actions">
                  <button
                    className="button secondary"
                    onClick={() =>
                      onSave(
                        games.filter(
                          (game) => !saved.some((item) => item.id === game.id),
                        ),
                      )
                    }
                    disabled={games.every((game) =>
                      saved.some((item) => item.id === game.id),
                    )}
                  >
                    <Icon name="saved" size={16} />
                    Salvar coleção
                  </button>
                  <button
                    className="button secondary"
                    onClick={() =>
                      downloadFile(
                        "loteria-lab-jogos.json",
                        JSON.stringify(
                          {
                            schemaVersion: 1,
                            game: "megasena",
                            priceCheckedAt: MEGASENA.priceCheckedAt,
                            games,
                            portfolio,
                          },
                          null,
                          2,
                        ),
                        "application/json",
                      )
                    }
                  >
                    <Icon name="download" size={16} />
                    Exportar
                  </button>
                </div>
              </>
            )}
          </section>
          <div className="quiet-note">
            <Icon name="lock" size={16} />
            <p>
              Seus jogos ficam neste navegador. Gerar ou salvar uma combinação
              não registra uma aposta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
