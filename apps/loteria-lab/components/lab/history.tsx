"use client";

import { useMemo, useState } from "react";
import { evenCount, sumOf } from "../../lib/lottery/math";
import { MEGASENA } from "../../lib/lottery/games";
import type { Draw } from "../../lib/lottery/types";
import {
  Balls,
  currency,
  dateLabel,
  downloadFile,
  EmptyState,
  Icon,
  integer,
  Notice,
  PanelHeading,
} from "./ui";

export function exportDraws(draws: Draw[]) {
  const header = [
    "Concurso",
    "Data",
    "Dezena 1",
    "Dezena 2",
    "Dezena 3",
    "Dezena 4",
    "Dezena 5",
    "Dezena 6",
    "Soma",
    "Pares",
    "Ganhadores Sena",
    "Ganhadores Quina",
    "Ganhadores Quadra",
  ];
  const rows = draws.map((draw) =>
    [
      draw.contest,
      draw.date,
      ...draw.numbers,
      sumOf(draw.numbers),
      evenCount(draw.numbers),
      ...draw.winners,
    ].join(";"),
  );
  downloadFile(
    `megasena-${draws[0]?.contest ?? 0}-${draws.at(-1)?.contest ?? 0}.csv`,
    "\uFEFF" + [header.join(";"), ...rows].join("\r\n"),
  );
}

export function DrawTable({
  draws,
  compact = false,
}: {
  draws: Draw[];
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <div className="table-scroll">
      <table className={`draw-table ${compact ? "compact" : ""}`}>
        <thead>
          <tr>
            <th>Concurso</th>
            <th>Data</th>
            <th>Dezenas sorteadas</th>
            {!compact && (
              <>
                <th>Soma</th>
                <th>Pares</th>
              </>
            )}
            <th>Sena</th>
            <th>
              <span className="sr-only">Detalhes</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {draws.flatMap((draw) => [
            <tr key={draw.contest}>
              <td>
                <strong className="contest-label">
                  {integer(draw.contest)}
                </strong>
              </td>
              <td className="date-cell">{dateLabel(draw.date)}</td>
              <td>
                <Balls numbers={draw.numbers} />
              </td>
              {!compact && (
                <>
                  <td>{sumOf(draw.numbers)}</td>
                  <td>{evenCount(draw.numbers)}</td>
                </>
              )}
              <td>
                {draw.winners[0] ? (
                  <span className="winner-label">
                    {draw.winners[0]}{" "}
                    {draw.winners[0] === 1 ? "ganhador" : "ganhadores"}
                  </span>
                ) : (
                  <span className="accumulated-label">Acumulou</span>
                )}
              </td>
              <td>
                <button
                  className="icon-button"
                  onClick={() =>
                    setExpanded(expanded === draw.contest ? null : draw.contest)
                  }
                  aria-label={`Detalhes do concurso ${draw.contest}`}
                  aria-expanded={expanded === draw.contest}
                >
                  <Icon
                    name={expanded === draw.contest ? "close" : "next"}
                    size={16}
                  />
                </button>
              </td>
            </tr>,
            ...(expanded === draw.contest
              ? [
                  <tr
                    key={`${draw.contest}-detail`}
                    className="draw-detail-row"
                  >
                    <td colSpan={compact ? 6 : 8}>
                      <div className="draw-details">
                        {["Sena", "Quina", "Quadra"].map((label, i) => (
                          <div key={label}>
                            <span>{label}</span>
                            <strong>
                              {integer(draw.winners[i])}{" "}
                              {draw.winners[i] === 1
                                ? "ganhador"
                                : "ganhadores"}
                            </strong>
                            <small>
                              {draw.prizes[i] === null
                                ? "Rateio não informado"
                                : `${currency(draw.prizes[i]!)} por ganhador`}
                            </small>
                          </div>
                        ))}
                        <a
                          href={`${MEGASENA.apiUrl}/${draw.contest}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Ver registro oficial{" "}
                          <Icon name="external" size={14} />
                        </a>
                      </div>
                    </td>
                  </tr>,
                ]
              : []),
          ])}
        </tbody>
      </table>
    </div>
  );
}

export function HistoryView({ draws }: { draws: Draw[] }) {
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [number, setNumber] = useState("");
  const [page, setPage] = useState(1);
  const filtered = useMemo(
    () =>
      draws.filter(
        (draw) =>
          (!search || String(draw.contest).includes(search.trim())) &&
          (!from || draw.date >= from) &&
          (!to || draw.date <= to) &&
          (!number || draw.numbers.includes(Number(number))),
      ),
    [draws, search, from, to, number],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pages);
  const visible = [...filtered]
    .reverse()
    .slice((currentPage - 1) * 20, currentPage * 20);
  const update = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };
  return (
    <section className="panel history-panel">
      <PanelHeading
        title="Arquivo de resultados"
        detail="Resultados oficiais, do mais recente ao mais antigo."
        action={
          <button
            className="button secondary"
            disabled={!filtered.length}
            onClick={() => exportDraws(filtered)}
          >
            <Icon name="download" size={16} />
            Exportar seleção
          </button>
        }
      />
      <div className="history-filters">
        <label className="search-field">
          <Icon name="search" size={17} />
          <input
            aria-label="Buscar concurso"
            placeholder="Buscar concurso..."
            value={search}
            onChange={(event) =>
              update(setSearch, event.target.value.replace(/\D/g, ""))
            }
          />
        </label>
        <label className="field">
          <span>De</span>
          <input
            aria-label="Data inicial"
            type="date"
            value={from}
            onChange={(e) => update(setFrom, e.target.value)}
          />
        </label>
        <label className="field">
          <span>Até</span>
          <input
            aria-label="Data final"
            type="date"
            value={to}
            onChange={(e) => update(setTo, e.target.value)}
          />
        </label>
        <label className="field">
          <span>Contém a dezena</span>
          <select
            value={number}
            onChange={(e) => update(setNumber, e.target.value)}
          >
            <option value="">Todas</option>
            {Array.from({ length: 60 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {String(i + 1).padStart(2, "0")}
              </option>
            ))}
          </select>
        </label>
        {(search || from || to || number) && (
          <button
            className="text-button"
            onClick={() => {
              setSearch("");
              setFrom("");
              setTo("");
              setNumber("");
              setPage(1);
            }}
          >
            Limpar
          </button>
        )}
      </div>
      {from && to && from > to && (
        <Notice tone="amber">
          A data inicial precisa ser anterior à data final.
        </Notice>
      )}
      {visible.length ? (
        <DrawTable draws={visible} />
      ) : (
        <EmptyState
          title="Nenhum concurso encontrado"
          description="Ajuste os filtros ou amplie o período no topo da página."
        />
      )}
      <div className="table-footer">
        <span>
          {integer(filtered.length)}{" "}
          {filtered.length === 1
            ? "concurso encontrado"
            : "concursos encontrados"}{" "}
          <span className="muted">· dentro do período selecionado</span>
        </span>
        <div className="pagination">
          <button
            className="icon-button"
            aria-label="Página anterior"
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
          >
            <Icon name="left" size={16} />
          </button>
          <span>
            {currentPage} <span className="muted">de {pages}</span>
          </span>
          <button
            className="icon-button"
            aria-label="Próxima página"
            disabled={currentPage >= pages}
            onClick={() => setPage(currentPage + 1)}
          >
            <Icon name="next" size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
