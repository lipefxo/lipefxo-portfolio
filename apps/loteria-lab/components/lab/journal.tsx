"use client";

import { useState, useSyncExternalStore } from "react";
import type { DataResponse, Draw, SavedGame } from "../../lib/lottery/types";
import {
  classifyJournal,
  createJournalRecord,
  parseJournal,
  scoreJournal,
  type JournalRecord,
} from "../../lib/lottery/journal";
import { ticketMetrics } from "../../lib/lottery/math";
import { currency, downloadFile, Notice, PanelHeading } from "./ui";

const key = "loteria-lab:journal:v1";
const listeners = new Set<() => void>();
let memory = "";
let memoryOnly = false;
function read() {
  if (memoryOnly) return memory;
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return memory;
  }
}
function subscribe(fn: () => void) {
  listeners.add(fn);
  window.addEventListener("storage", fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", fn);
  };
}
function persist(records: JournalRecord[]) {
  const raw = JSON.stringify({ schemaVersion: 1, records });
  if (raw.length > 2_000_000)
    throw new Error("O diário excede o limite de 2 MB.");
  try {
    localStorage.setItem(key, raw);
    memory = raw;
    memoryOnly = false;
    listeners.forEach((fn) => fn());
    return true;
  } catch {
    memory = raw;
    memoryOnly = true;
    listeners.forEach((fn) => fn());
    return false;
  }
}
// Parsing backups marks records imported; local reads must preserve their original provenance.
function readRecords(raw: string): JournalRecord[] {
  if (!raw) return [];
  const parsed = parseJournal(raw);
  const originals = JSON.parse(raw).records as JournalRecord[];
  return parsed.map((r, i) => ({ ...r, provenance: originals[i].provenance }));
}

export function Journal({
  games,
  draws,
  fingerprint,
  freshness,
}: {
  games: SavedGame[];
  draws: Draw[];
  fingerprint?: string;
  freshness?: DataResponse["freshness"];
}) {
  const raw = useSyncExternalStore(subscribe, read, () => "");
  let records: JournalRecord[] = [];
  let broken = false;
  try {
    records = readRecords(raw);
  } catch {
    broken = true;
  }
  const groups = [
    ...new Set(
      games
        .map((g) => g.generation?.portfolioId)
        .filter((id): id is string => !!id),
    ),
  ];
  const [selected, setSelected] = useState("");
  const latest = Math.max(0, ...draws.map((d) => d.contest));
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const firstContest = first || String(latest + 1);
  const lastContest = last || firstContest;
  const [message, setMessage] = useState("");
  const group = games.filter((g) => g.generation?.portfolioId === selected);
  function register() {
    try {
      const checked = freshness?.checkedAt
        ? Date.parse(freshness.checkedAt)
        : NaN;
      if (
        freshness?.status !== "current" ||
        freshness.latestAvailableContest !== latest ||
        !Number.isFinite(checked) ||
        Date.now() - checked > 15 * 60 * 1000 ||
        checked > Date.now()
      )
        throw new Error(
          "Atualize os dados oficiais antes de registrar; a conferência deve ter menos de 15 minutos.",
        );
      const firstGame = group[0];
      if (
        !firstGame?.generatorOptions ||
        !firstGame.dataFingerprint ||
        !fingerprint ||
        firstGame.dataFingerprint !== fingerprint ||
        group.length !== firstGame.generation?.portfolioSize ||
        group.some(
          (g) =>
            !g.generatorOptions ||
            JSON.stringify(g.generatorOptions) !==
              JSON.stringify(firstGame.generatorOptions) ||
            g.trainingEnd !== firstGame.trainingEnd ||
            g.dataFingerprint !== firstGame.dataFingerprint,
        )
      )
        throw new Error(
          "Selecione uma coleção completa com configuração e base comuns à base atual.",
        );
      if (broken)
        throw new Error(
          "O diário local está corrompido; exporte ou recupere seus dados antes de alterá-lo.",
        );
      if (records.length >= 200)
        throw new Error("O diário atingiu o limite de 200 registros.");
      const record = createJournalRecord({
        options: firstGame.generatorOptions,
        fingerprint,
        tickets: group.map((g) => g.numbers),
        budget: group.reduce(
          (sum, g) => sum + ticketMetrics(g.numbers.length).cost,
          0,
        ),
        trainingCutoff: firstGame.trainingEnd,
        targetFirst: Number(firstContest),
        targetLast: Number(lastContest),
        latestKnown: latest,
      });
      setMessage(
        persist([...records, record])
          ? "Experimento registrado neste navegador."
          : "Experimento apenas nesta sessão; exporte o diário.",
      );
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Não foi possível registrar.",
      );
    }
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 2_000_000)
        throw new Error("Arquivo do diário excede o limite de 2 MB.");
      if (broken)
        throw new Error(
          "O diário local está corrompido; recupere-o antes de importar.",
        );
      const imported = parseJournal(await file.text());
      const existing = new Map(records.map((r) => [r.id, r]));
      let added = 0;
      let collisions = 0;
      for (const r of imported) {
        const old = existing.get(r.id);
        if (!old) {
          existing.set(r.id, r);
          added++;
        } else if (
          JSON.stringify({ ...old, provenance: "imported" }) !==
          JSON.stringify(r)
        )
          collisions++;
      }
      if (existing.size > 200)
        throw new Error("A importação excede o limite de 200 registros.");
      const saved = persist([...existing.values()]);
      setMessage(
        `${added} registro(s) importado(s); ${collisions} conflito(s) ignorado(s).${saved ? "" : " Apenas nesta sessão; exporte o diário."}`,
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Arquivo inválido.");
    }
  }
  return (
    <section className="panel view-stack">
      <PanelHeading
        title="Diário de experimentos"
        detail="Registre uma coleção antes dos concursos e acompanhe todos os resultados."
      />
      <Notice>
        O registro e o relógio são locais ao navegador. Data e importação não
        comprovam que o experimento existia antes do sorteio. Não é registro de
        aposta nem validação por servidor.
      </Notice>
      {broken && (
        <div role="alert">
          <p>
            Diário local inválido. Exporte o arquivo original antes de limpar
            para tentar recuperá-lo.
          </p>
          <button
            className="button secondary"
            onClick={() =>
              downloadFile(
                "loteria-lab-diario-corrompido.json",
                raw,
                "application/json",
              )
            }
          >
            Exportar original
          </button>{" "}
          <button
            className="button secondary"
            onClick={() => {
              if (
                window.confirm(
                  "Limpar o diário local corrompido? Exporte o original primeiro.",
                )
              ) {
                const saved = persist([]);
                setMessage(
                  saved
                    ? "Diário corrompido limpo."
                    : "Não foi possível limpar o armazenamento; diário vazio apenas nesta sessão.",
                );
              }
            }}
          >
            Limpar diário corrompido
          </button>
        </div>
      )}
      <label className="field">
        <span>Coleção salva completa</span>
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Selecione</option>
          {groups.map((id, index) => (
            <option key={id} value={id}>
              Coleção {index + 1} ·{" "}
              {games.filter((g) => g.generation?.portfolioId === id).length}{" "}
              jogos
            </option>
          ))}
        </select>
      </label>
      <div className="form-row">
        <label className="field">
          <span>Primeiro concurso futuro</span>
          <input
            type="number"
            value={firstContest}
            onChange={(e) => setFirst(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Último concurso</span>
          <input
            type="number"
            value={lastContest}
            onChange={(e) => setLast(e.target.value)}
          />
        </label>
      </div>
      <button className="button primary" onClick={register}>
        Registrar experimento
      </button>
      <div className="generated-actions">
        <button
          className="button secondary"
          onClick={() =>
            downloadFile(
              "loteria-lab-diario.json",
              raw || JSON.stringify({ schemaVersion: 1, records: [] }),
              "application/json",
            )
          }
        >
          Exportar diário
        </button>
        <label className="button secondary">
          Importar diário
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              void importFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {message && <p role="status">{message}</p>}
      {records.map((r) => {
        const score = scoreJournal(r, draws);
        const classification = classifyJournal(r);
        return (
          <article className="saved-game" key={r.id}>
            <h3>
              Concursos #{r.targetFirst} a #{r.targetLast} ·{" "}
              {score.completed ? "Concluído" : "Pendente"}
            </h3>
            <p>
              {classification === "retrospective"
                ? "Retrospectivo"
                : classification === "imported"
                  ? "Importado; anterioridade não verificável"
                  : "Registrado localmente antes do alvo informado; anterioridade não verificável"}{" "}
              · {new Date(r.registeredAt).toLocaleString("pt-BR")}
            </p>
            <p>
              Corte #{r.trainingCutoff} · {currency(r.budget)} por concurso ·
              base <code>{r.fingerprint}</code>
            </p>
            <p>
              {score.counted} de {score.results.length} concursos encontrados,
              inclusive sem acertos.
            </p>
            <details>
              <summary>Jogos e resultados congelados</summary>
              {r.tickets.map((t, i) => (
                <p key={i}>
                  Jogo {i + 1}: {t.join(", ")}
                </p>
              ))}
              {score.results.map((s) => (
                <p key={s.contest}>
                  #{s.contest}:{" "}
                  {s.matches
                    ? s.matches.map((n, i) => `jogo ${i + 1}: ${n}`).join(" · ")
                    : "pendente"}
                </p>
              ))}
            </details>
          </article>
        );
      })}
    </section>
  );
}
