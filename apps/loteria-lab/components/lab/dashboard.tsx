"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { GAME_CATALOG } from "../../lib/lottery/games";
import { summarize } from "../../lib/lottery/math";
import type {
  DataResponse,
  GeneratorOptions,
  SavedGame,
} from "../../lib/lottery/types";
import { useSavedGames } from "../../hooks/use-saved-games";
import { mergeSavedGames } from "../../lib/lottery/storage";
import { AnalysisView } from "./analysis";
import { BacktestView } from "./backtest";
import { GeneratorView } from "./generator";
import { exportDraws, HistoryView } from "./history";
import { Overview } from "./overview";
import { SavedView } from "./saved";
import { SourcesView } from "./sources";
import {
  Brand,
  dateLabel,
  downloadFile,
  EmptyState,
  Icon,
  integer,
  Notice,
  timestampLabel,
} from "./ui";

type View =
  "overview" | "analysis" | "history" | "lab" | "test" | "saved" | "sources";
const views: {
  id: View;
  label: string;
  icon: Parameters<typeof Icon>[0]["name"];
}[] = [
  { id: "overview", label: "Visão geral", icon: "dashboard" },
  { id: "analysis", label: "Análise de dezenas", icon: "analysis" },
  { id: "history", label: "Histórico de resultados", icon: "history" },
  { id: "lab", label: "Laboratório", icon: "lab" },
  { id: "test", label: "Teste de estratégias", icon: "test" },
  { id: "saved", label: "Meus jogos", icon: "saved" },
];
const headings: Record<
  View,
  { eyebrow: string; title: string; description: string }
> = {
  overview: {
    eyebrow: "MEGA-SENA / VISÃO GERAL",
    title: "O jogo, visto pelos dados.",
    description:
      "Explore o histórico. Encontre contexto. Faça escolhas informadas.",
  },
  analysis: {
    eyebrow: "MEGA-SENA / ANÁLISE",
    title: "Além dos números sorteados.",
    description:
      "Frequências, intervalos e padrões — sempre com uma referência do acaso.",
  },
  history: {
    eyebrow: "MEGA-SENA / HISTÓRICO",
    title: "Cada concurso, em detalhe.",
    description:
      "Uma base oficial para explorar, filtrar e conferir suas hipóteses.",
  },
  lab: {
    eyebrow: "MEGA-SENA / LABORATÓRIO",
    title: "Sua coleção de jogos.",
    description:
      "Defina um limite, compare a cobertura e preserve suas escolhas.",
  },
  test: {
    eyebrow: "MEGA-SENA / EXPERIMENTOS",
    title: "Hipóteses encontram evidências.",
    description: "Compare métodos em sorteios que ficaram fora do treinamento.",
  },
  saved: {
    eyebrow: "MEGA-SENA / MEUS JOGOS",
    title: "Suas escolhas têm memória.",
    description:
      "Guarde combinações, preserve o raciocínio e confira resultados.",
  },
  sources: {
    eyebrow: "MEGA-SENA / METODOLOGIA",
    title: "Transparência em cada etapa.",
    description:
      "Conheça a origem dos dados, os cálculos e os limites desta análise.",
  },
};
function subscribeLocation(listener: () => void) {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}
function locationSnapshot(): View {
  const hash = window.location.hash.slice(1);
  return Object.hasOwn(headings, hash) ? (hash as View) : "overview";
}

export default function Dashboard({
  initialData,
}: {
  initialData: DataResponse;
}) {
  const [data, setData] = useState(initialData);
  const view = useSyncExternalStore(
    subscribeLocation,
    locationSnapshot,
    () => "overview" as View,
  );
  const [testOptions, setTestOptions] = useState<GeneratorOptions>();
  const [visited, setVisited] = useState<View[]>(["overview"]);
  const [range, setRange] = useState("100");
  const [refreshing, setRefreshing] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [toast, setToast] = useState("");
  const {
    games: saved,
    loaded,
    error: storageError,
    raw: rawStorage,
    store: persistGames,
  } = useSavedGames();
  const sidebarRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  // Keep visited panels mounted without copying external hash state in an effect.
  if (!visited.includes(view)) setVisited([...visited, view]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 9000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!navOpen) return;
    const media = window.matchMedia("(max-width: 780px)");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebarRef.current
      ?.querySelector<HTMLAnchorElement>('a[aria-current="page"]')
      ?.focus();
    function closeOnDesktop() {
      if (!media.matches) setNavOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setNavOpen(false);
        requestAnimationFrame(() => menuButtonRef.current?.focus());
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        sidebarRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button, summary, input, select, [tabindex="0"]',
        ) ?? [],
      ).filter(
        (element) =>
          element.offsetParent !== null && !element.hasAttribute("disabled"),
      );
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    media.addEventListener("change", closeOnDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
      media.removeEventListener("change", closeOnDesktop);
    };
  }, [navOpen]);

  const allDraws = data.dataset.draws;
  const years = useMemo(
    () =>
      [...new Set(allDraws.map((draw) => draw.date.slice(0, 4)))]
        .sort()
        .reverse(),
    [allDraws],
  );
  const selected = useMemo(
    () =>
      range === "all"
        ? allDraws
        : range.startsWith("year:")
          ? allDraws.filter((draw) => draw.date.startsWith(range.slice(5)))
          : allDraws.slice(-Number(range)),
    [allDraws, range],
  );
  const summary = useMemo(() => summarize(selected), [selected]);
  const heading = headings[view];
  const usesRange = ["overview", "analysis", "history", "lab"].includes(view);

  function navigate(next: View) {
    window.location.hash = next;
    setVisited((previous) =>
      previous.includes(next) ? previous : [...previous, next],
    );
    setNavOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() =>
      mainRef.current?.focus({ preventScroll: true }),
    );
  }

  function closeNavigation() {
    setNavOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }

  async function refresh() {
    setRefreshing(true);
    try {
      const response = await fetch("/api/draws?game=megasena&refresh=1", {
        signal: AbortSignal.timeout(45000),
      });
      if (!response.ok) throw new Error("A consulta não foi concluída.");
      const next = (await response.json()) as DataResponse;
      if (!next.dataset?.draws?.length || !next.freshness?.status)
        throw new Error("Resposta inesperada.");
      setData(next);
      setToast(next.freshness.message);
    } catch {
      setToast(
        "Não foi possível consultar a CAIXA agora. O histórico validado continua disponível.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  function storeGames(next: SavedGame[], success: string) {
    if (!loaded) return;
    try {
      const persisted = persistGames(next);
      setToast(
        persisted
          ? success
          : "Jogos mantidos apenas nesta sessão. Exporte para preservar uma cópia.",
      );
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Não foi possível salvar. Os dados anteriores foram preservados.");
    }
  }
  const save = (games: SavedGame[]) => {
    const additions = games.filter(
      (game) => !saved.some((item) => item.id === game.id),
    );
    if (additions.length)
      storeGames(
        [...additions, ...saved],
        `${additions.length} ${additions.length === 1 ? "jogo salvo" : "jogos salvos"} neste navegador.`,
      );
  };

  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Pular para o conteúdo
      </a>
      {navOpen && (
        <button
          className="nav-scrim"
          aria-label="Fechar navegação"
          tabIndex={-1}
          onClick={closeNavigation}
        />
      )}
      <aside
        ref={sidebarRef}
        className={`sidebar ${navOpen ? "open" : ""}`}
        id="sidebar"
        role={navOpen ? "dialog" : undefined}
        aria-modal={navOpen ? true : undefined}
        aria-label={navOpen ? "Navegação principal" : undefined}
      >
        <div className="sidebar-brand-row">
          <button
            className="brand-button"
            onClick={() => navigate("overview")}
            aria-label="Loteria Lab, início"
          >
            <Brand />
          </button>
          <button
            className="icon-button mobile-nav-close"
            aria-label="Fechar menu"
            onClick={closeNavigation}
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <p className="sidebar-caption">UM NOVO OLHAR PARA O ACASO</p>
        <details className="game-switcher">
          <summary>
            <span className="game-icon">
              <Brand small />
            </span>
            <span>
              <strong>Mega-Sena</strong>
              <small>Loterias CAIXA</small>
            </span>
            <Icon name="down" size={15} />
          </summary>
          <div className="game-menu">
            {GAME_CATALOG.map((game) => (
              <div key={game.id}>
                <span>
                  <strong>{game.name}</strong>
                  <small>{game.description}</small>
                </span>
                {game.available ? (
                  <Icon name="check" size={16} />
                ) : (
                  <span className="badge neutral">Em breve</span>
                )}
              </div>
            ))}
          </div>
        </details>
        <div className="nav-label">EXPLORAR</div>
        <nav aria-label="Navegação principal">
          {views.map((item, index) => (
            <div key={item.id}>
              {index === 3 && (
                <div className="nav-label nav-divider">EXPERIMENTAR</div>
              )}
              <a
                href={`#${item.id}`}
                className={`nav-link ${view === item.id ? "active" : ""}`}
                aria-current={view === item.id ? "page" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(item.id);
                }}
              >
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
                {item.id === "saved" && saved.length > 0 && (
                  <span className="nav-count">{saved.length}</span>
                )}
                {view === item.id && <span className="active-nav-dot" />}
              </a>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Icon name="lab" size={25} />
            <strong>Dados, não palpites.</strong>
            <p>
              Mais clareza sobre o passado.
              <br />
              Mais consciência nas escolhas.
            </p>
            <button onClick={() => navigate("sources")}>
              Conheça a metodologia <Icon name="arrow" size={14} />
            </button>
          </div>
          <a
            className={`nav-link ${view === "sources" ? "active" : ""}`}
            href="#sources"
            aria-current={view === "sources" ? "page" : undefined}
            onClick={(e) => {
              e.preventDefault();
              navigate("sources");
            }}
          >
            <Icon name="data" size={18} />
            <span>Fontes e metodologia</span>
          </a>
          <div className="version">
            <span className="status-dot" />
            Loteria Lab <span>v0.1</span>
          </div>
        </div>
      </aside>
      <div className="main-shell" inert={navOpen}>
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              ref={menuButtonRef}
              className="icon-button mobile-menu"
              aria-label="Abrir navegação"
              aria-expanded={navOpen}
              aria-controls="sidebar"
              onClick={() => setNavOpen(!navOpen)}
            >
              <Icon name="menu" size={20} />
            </button>
            <span>Loterias</span>
            <span className="breadcrumb-slash">/</span>
            <strong>Mega-Sena</strong>
            <span className="beta-tag">BETA</span>
          </div>
          <div className="topbar-actions">
            <button
              className={`source-indicator ${data.freshness.status === "current" ? "confirmed" : "unconfirmed"}`}
              aria-label={`Abrir fontes. Último concurso ${allDraws.at(-1)?.contest}. ${data.freshness.status === "current" ? "Consulta oficial confirmada" : "Atualização não confirmada"}`}
              onClick={() => navigate("sources")}
            >
              <span className="status-dot" />
              {data.freshness.status === "current"
                ? "Consulta oficial confirmada"
                : "Atualização não confirmada"}
            </button>
            <span className="topbar-divider" />
            <button
              className="icon-button"
              aria-label="Entender dados e metodologia"
              onClick={() => navigate("sources")}
            >
              <Icon name="help" size={20} />
            </button>
          </div>
        </header>
        <main
          ref={mainRef}
          id="main-content"
          className="main-content"
          tabIndex={-1}
        >
          <div className="view-header">
            <div>
              <p className="eyebrow">{heading.eyebrow}</p>
              <h1>{heading.title}</h1>
              <p className="page-description">{heading.description}</p>
            </div>
            {view === "overview" && (
              <button
                className="button primary"
                onClick={() => navigate("lab")}
              >
                <Icon name="plus" size={17} />
                Gerar combinações
              </button>
            )}
          </div>
          <div className="toolbar">
            <div className="toolbar-left">
              {usesRange ? (
                <label className="range-select">
                  <Icon name="calendar" size={16} />
                  <select
                    aria-label="Período de análise"
                    value={range}
                    onChange={(e) => setRange(e.target.value)}
                  >
                    <option value="50">Últimos 50 concursos</option>
                    <option value="100">Últimos 100 concursos</option>
                    <option value="500">Últimos 500 concursos</option>
                    <option value="all">Todo o histórico</option>
                    <optgroup label="Por ano">
                      {years.map((year) => (
                        <option key={year} value={`year:${year}`}>
                          Ano de {year}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <Icon name="down" size={14} />
                </label>
              ) : (
                <span className="all-data-label">
                  <Icon name="data" size={16} />
                  Base completa
                </span>
              )}
              <span className="data-range-description">
                {integer(usesRange ? selected.length : allDraws.length)}{" "}
                concursos
                {usesRange && selected.length
                  ? ` · ${dateLabel(selected[0].date)} – ${dateLabel(selected.at(-1)!.date)}`
                  : ""}
              </span>
            </div>
            <div className="toolbar-right">
              {["overview", "analysis"].includes(view) && (
                <button
                  className="toolbar-button"
                  onClick={() => exportDraws(selected)}
                  aria-label="Exportar histórico do período"
                >
                  <Icon name="download" size={16} />
                  <span>Exportar</span>
                </button>
              )}
              <button
                className="toolbar-button"
                aria-label={
                  refreshing
                    ? "Consultando resultados oficiais"
                    : "Atualizar dados"
                }
                onClick={refresh}
                disabled={refreshing}
              >
                <Icon
                  name="refresh"
                  size={16}
                  className={refreshing ? "spin" : ""}
                />
                <span>{refreshing ? "Consultando…" : "Atualizar dados"}</span>
              </button>
            </div>
          </div>
          <div className="data-freshness" role="status">
            <span>
              Último incluído: <strong>#{allDraws.at(-1)?.contest}</strong> ·{" "}
              {dateLabel(allDraws.at(-1)!.date)}
            </span>
            <span>
              Consulta oficial:{" "}
              {data.freshness.checkedAt
                ? timestampLabel(data.freshness.checkedAt)
                : "ainda não verificada nesta base"}
            </span>
          </div>
          {storageError && (
            <Notice tone="amber">
              {storageError}{" "}
              <button
                className="inline-link"
                onClick={() =>
                  downloadFile(
                    "loteria-lab-recuperacao.json",
                    rawStorage,
                    "application/json",
                  )
                }
              >
                Baixar dados originais
              </button>
            </Notice>
          )}
          {(data.freshness.status === "unavailable" ||
            data.freshness.status === "update-required") && (
            <div className="stale-notice">
              <Notice tone="amber">{data.freshness.message}</Notice>
            </div>
          )}
          {usesRange && !selected.length ? (
            <section className="panel">
              <EmptyState
                title="Nenhum resultado neste período"
                description="Escolha outro período para continuar explorando os dados."
              />
            </section>
          ) : (
            <>
              {visited.includes("overview") && (
                <div hidden={view !== "overview"}>
                  <Overview
                    data={data}
                    draws={selected}
                    summary={summary}
                    navigate={navigate}
                  />
                </div>
              )}
              {visited.includes("analysis") && (
                <div hidden={view !== "analysis"}>
                  <AnalysisView summary={summary} draws={selected} />
                </div>
              )}
              {visited.includes("history") && (
                <div hidden={view !== "history"}>
                  <HistoryView draws={selected} />
                </div>
              )}
              {visited.includes("lab") && (
                <div hidden={view !== "lab"}>
                  <GeneratorView
                    draws={selected}
                    fingerprint={data.dataset.source.drawsSha256}
                    saved={saved}
                    onSave={save}
                    onTest={(options) => {
                      setTestOptions(options);
                      navigate("test");
                    }}
                  />
                </div>
              )}
              {visited.includes("test") && (
                <div hidden={view !== "test"}>
                  <BacktestView
                    initialOptions={testOptions}
                    draws={allDraws}
                    fingerprint={data.dataset.source.drawsSha256}
                  />
                </div>
              )}
              {visited.includes("saved") && (
                <div hidden={view !== "saved"}>
                  <SavedView
                    games={saved}
                    draws={allDraws}
                    onRemove={(id) =>
                      storeGames(
                        saved.filter((game) => game.id !== id),
                        "Jogo removido.",
                      )
                    }
                    onGenerate={() => navigate("lab")}
                    fingerprint={data.dataset.source.drawsSha256}
                    freshness={data.freshness}
                    onImport={(incoming) => {
                      const merged = mergeSavedGames(saved, incoming);
                      storeGames(
                        merged.games,
                        `${merged.added} importados · ${merged.duplicates} já salvos · ${merged.collisions} conflitos preservados sem substituir.`,
                      );
                    }}
                  />
                </div>
              )}
              {visited.includes("sources") && (
                <div hidden={view !== "sources"}>
                  <SourcesView
                    data={data}
                    refresh={refresh}
                    busy={refreshing}
                  />
                </div>
              )}
            </>
          )}
          <footer className="app-footer">
            <span>Feito para explorar. Construído sobre dados.</span>
            <span>
              Fonte: Loterias CAIXA <span>·</span> Estudo independente
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Icon name="info" size={18} />
          <span>{toast}</span>
          <button
            className="icon-button"
            aria-label="Fechar mensagem"
            onClick={() => setToast("")}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
