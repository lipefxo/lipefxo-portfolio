"use client";

import { useMemo, useState } from "react";
import {
  matchCount,
  portfolioMetrics,
  ticketMetrics,
} from "../../lib/lottery/math";
import { anyPrizeCoverage } from "../../lib/lottery/portfolio";
import { MEGASENA, STRATEGIES } from "../../lib/lottery/games";
import {
  mergeSavedGames,
  parseSavedCollection,
} from "../../lib/lottery/storage";
import type { DataResponse, Draw, SavedGame } from "../../lib/lottery/types";
import {
  Balls,
  currency,
  dateLabel,
  decimal,
  downloadFile,
  EmptyState,
  Icon,
  integer,
  Notice,
  PanelHeading,
  timestampLabel,
} from "./ui";
import { Journal } from "./journal";

function exportGames(games: SavedGame[], name: string) {
  downloadFile(
    name,
    JSON.stringify({ schemaVersion: 2, game: "megasena", games }, null, 2),
    "application/json",
  );
}
function Collection({
  games,
  target,
  onRemove,
}: {
  games: SavedGame[];
  target?: Draw;
  onRemove: (id: string) => void;
}) {
  const metrics = useMemo(() => {
    const tickets = games.map((g) => g.numbers);
    if (
      tickets.length > 100 ||
      tickets.reduce(
        (sum, t) => sum + ticketMetrics(t.length).combinations,
        0,
      ) > 1_000_000
    )
      return null;
    return { ...portfolioMetrics(tickets), prize: anyPrizeCoverage(tickets) };
  }, [games]);
  return (
    <section className="panel">
      <PanelHeading
        title={
          games[0].generation
            ? `Coleção · ${games.length} jogos`
            : "Jogo individual"
        }
        detail={
          games[0].generation
            ? `${games.length} de ${games[0].generation.portfolioSize} jogos originais salvos`
            : undefined
        }
        action={
          <button
            className="button secondary"
            onClick={() => exportGames(games, "loteria-lab-colecao.json")}
          >
            Exportar coleção
          </button>
        }
      />
      {metrics ? (
        <div className="portfolio-summary">
          <div>
            <span>Custo por concurso</span>
            <strong>{currency(metrics.cost)}</strong>
          </div>
          <div>
            <span>Combinações distintas de Sena</span>
            <strong>{integer(metrics.distinctCombinations)}</strong>
          </div>
          <div>
            <span>Sobreposição paga</span>
            <strong>
              {integer(metrics.overlappingCombinations)} ·{" "}
              {currency(metrics.overlappingCombinations * MEGASENA.simplePrice)}
            </strong>
          </div>
          <div>
            <span>Cobertura de Sena por R$ 1</span>
            <strong>
              {decimal((metrics.probability / metrics.cost) * 100, 9)}%
            </strong>
          </div>
          <div>
            <span>Qualquer prêmio · limites</span>
            <strong>
              {decimal(metrics.prize.lowerProbability * 100, 6)}% a{" "}
              {decimal(metrics.prize.upperProbability * 100, 6)}%
            </strong>
          </div>
          <div>
            <span>Largura dos limites</span>
            <strong>
              {decimal(
                (metrics.prize.upperProbability -
                  metrics.prize.lowerProbability) *
                  100,
                6,
              )}{" "}
              pontos percentuais
            </strong>
          </div>
          <div>
            <span>Qualquer prêmio por R$ 1 · limites</span>
            <strong>
              {decimal(
                (metrics.prize.lowerProbability / metrics.cost) * 100,
                9,
              )}
              % a{" "}
              {decimal(
                (metrics.prize.upperProbability / metrics.cost) * 100,
                9,
              )}
              %
            </strong>
          </div>
        </div>
      ) : (
        <p>
          Esta coleção excede o limite de cálculo de cobertura neste navegador.
        </p>
      )}
      <details>
        <summary>Ver jogos e critérios</summary>
        <div className="saved-grid">
          {games.map((game) => (
            <article className="saved-game" key={game.id}>
              <div className="saved-game-header">
                <span className="badge neutral">
                  {STRATEGIES[game.strategy].short}
                </span>
                <button
                  className="icon-button"
                  aria-label={`Remover jogo ${game.numbers.join(", ")}`}
                  onClick={() => onRemove(game.id)}
                >
                  <Icon name="delete" size={16} />
                </button>
              </div>
              <Balls
                numbers={game.numbers}
                size="large"
                matches={target?.numbers}
              />
              <p>
                {target
                  ? `${matchCount(game.numbers, target.numbers)} dezenas em comum`
                  : "Sem concurso para comparar"}
              </p>
              {target && (
                <p className="microcopy">
                  {game.trainingEnd >= target.contest ||
                  game.createdAt.slice(0, 10) > target.date
                    ? "Retrospectivo: treinamento ou criação posterior ao concurso."
                    : game.createdAt.slice(0, 10) === target.date
                      ? "Criado no dia do sorteio: a data não comprova anterioridade."
                      : "Criado antes da data informada do sorteio pelo relógio local; anterioridade não verificada."}
                </p>
              )}
              <p className="microcopy">
                Gerado em {timestampLabel(game.createdAt)} · treinamento #
                {game.trainingStart} a #{game.trainingEnd} (
                {integer(game.trainingCount)} concursos).
              </p>
              <details>
                <summary>Raciocínio e critérios</summary>
                <ul>
                  {game.reasoning.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
                <p>{game.constraints}</p>
                {game.dataFingerprint && (
                  <p>
                    Base: <code>{game.dataFingerprint}</code>
                  </p>
                )}
              </details>
            </article>
          ))}
        </div>
      </details>
    </section>
  );
}
export function SavedView({
  games,
  draws,
  onRemove,
  onGenerate,
  onImport,
  fingerprint,
  freshness,
}: {
  games: SavedGame[];
  draws: Draw[];
  onRemove: (id: string) => void;
  onGenerate: () => void;
  onImport: (games: SavedGame[]) => void;
  fingerprint?: string;
  freshness?: DataResponse["freshness"];
}) {
  const [contest, setContest] = useState(String(draws.at(-1)?.contest ?? ""));
  const [preview, setPreview] = useState<SavedGame[] | null>(null);
  const [message, setMessage] = useState("");
  const target = draws.find((draw) => draw.contest === Number(contest));
  const groups = useMemo(() => {
    const result = new Map<string, SavedGame[]>();
    games.forEach((g) => {
      const key = g.generation?.portfolioId
        ? `portfolio:${g.generation.portfolioId}`
        : `game:${g.id}`;
      result.set(key, [...(result.get(key) ?? []), g]);
    });
    return [...result.entries()];
  }, [games]);
  const merge = preview ? mergeSavedGames(games, preview) : null;
  async function readFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 2_000_000)
        throw new Error("Arquivo de jogos excede o limite de 2 MB.");
      setPreview(parseSavedCollection(await file.text()));
      setMessage("");
    } catch (e) {
      setPreview(null);
      setMessage(e instanceof Error ? e.message : "Arquivo inválido.");
    }
  }
  return (
    <div className="view-stack">
      <Notice>
        Esta conferência usa resultados já conhecidos. Não registra apostas nem
        valida previsões.
      </Notice>
      <section className="panel">
        <PanelHeading
          title={`${games.length} jogos salvos`}
          detail="Coleções e critérios neste navegador."
          action={
            <button
              className="button secondary"
              onClick={() => exportGames(games, "loteria-lab-meus-jogos.json")}
            >
              Exportar todos
            </button>
          }
        />
        <label className="button secondary">
          Selecionar arquivo para importar
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              void readFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        {message && <p role="alert">{message}</p>}
        {merge && preview && (
          <div>
            <p>
              Prévia: {preview.length} jogos · {merge.added} novos ·{" "}
              {merge.duplicates} já existentes · {merge.collisions} IDs
              conflitantes ignorados.
            </p>
            <button
              className="button primary"
              onClick={() => {
                onImport(preview);
                setPreview(null);
                setMessage(`${merge.added} jogos enviados para importação.`);
              }}
            >
              Importar novos jogos
            </button>
            <button
              className="button secondary"
              onClick={() => setPreview(null)}
            >
              Cancelar
            </button>
          </div>
        )}
        {games.length > 0 && (
          <div className="saved-check">
            <label className="field">
              <span>Conferir com o concurso</span>
              <input
                type="number"
                value={contest}
                min="1"
                max={draws.at(-1)?.contest}
                onChange={(e) => setContest(e.target.value)}
              />
            </label>
            {target ? (
              <div>
                <span className="muted">
                  Resultado oficial · {dateLabel(target.date)}
                </span>
                <Balls numbers={target.numbers} />
              </div>
            ) : (
              <p className="form-error" role="status">
                Concurso não encontrado nesta base.
              </p>
            )}
          </div>
        )}
        {!games.length && (
          <EmptyState
            title="Um lugar para seus experimentos"
            description="Salve ou importe coleções para preservar os critérios."
            action={
              <button className="button primary" onClick={onGenerate}>
                Criar combinações
              </button>
            }
          />
        )}
      </section>
      {groups.map(([key, group]) => (
        <Collection
          key={key}
          games={group}
          target={target}
          onRemove={onRemove}
        />
      ))}
      <Journal
        games={games}
        draws={draws}
        fingerprint={fingerprint}
        freshness={freshness}
      />
    </div>
  );
}
