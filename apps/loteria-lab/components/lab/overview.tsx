import { type Summary } from "../../lib/lottery/math";
import type { DataResponse, Draw } from "../../lib/lottery/types";
import { DistributionPanel, FrequencyPanel, RankingPanel } from "./analysis";
import { DrawTable } from "./history";
import {
  Balls,
  ballLabel,
  dateLabel,
  decimal,
  Icon,
  integer,
  Notice,
  PanelHeading,
  shortCurrency,
} from "./ui";

export function Overview({
  data,
  draws,
  summary,
  navigate,
}: {
  data: DataResponse;
  draws: Draw[];
  summary: Summary;
  navigate: (view: "history" | "analysis" | "test") => void;
}) {
  const last = data.dataset.draws.at(-1)!;
  const frequent = [...summary.numbers].sort(
    (a, b) => b.count - a.count || a.number - b.number,
  )[0];
  const gap = [...summary.numbers].sort(
    (a, b) => b.gap - a.gap || a.number - b.number,
  )[0];
  return (
    <div className="view-stack">
      <div className="latest-grid">
        <section className="latest-result">
          <div className="latest-result-head">
            <span className="eyebrow">
              <span className="status-dot" />
              ÚLTIMO RESULTADO DISPONÍVEL
            </span>
            <span className="badge result-badge">
              {last.winners[0]
                ? `${last.winners[0]} ${last.winners[0] === 1 ? "ganhador" : "ganhadores"}`
                : "Acumulou"}
            </span>
          </div>
          <div className="latest-result-body">
            <div className="latest-contest">
              <h2>Concurso {integer(last.contest)}</h2>
              <p>
                <Icon name="calendar" size={14} />
                {dateLabel(last.date)}
              </p>
            </div>
            <Balls numbers={last.numbers} size="large" />
          </div>
          <div className="latest-result-footer">
            <span>
              <Icon name="verified" size={14} />
              Resultado da CAIXA
            </span>
            <button className="text-button" onClick={() => navigate("history")}>
              Ver histórico <Icon name="right" size={15} />
            </button>
          </div>
        </section>
        <section className="next-draw-card">
          <span className="eyebrow">ESTIMATIVA DO PRÓXIMO PRÊMIO</span>
          <strong>
            {data.dataset.next.estimatedPrize !== null
              ? shortCurrency(data.dataset.next.estimatedPrize)
              : "Não informada"}
          </strong>
          <span>
            {data.dataset.next.contest
              ? `Concurso ${integer(data.dataset.next.contest)}`
              : "Próximo concurso"}
            {data.dataset.next.date
              ? ` · ${dateLabel(data.dataset.next.date)}`
              : ""}
          </span>
          <div className="next-draw-decoration" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </section>
      </div>
      <div className="metrics-grid">
        <article className="metric">
          <div>
            <span>Concursos analisados</span>
            <Icon name="data" size={17} />
          </div>
          <strong>
            {integer(summary.count)}
            <small>concursos</small>
          </strong>
          <p>
            de {dateLabel(draws[0].date)} a {dateLabel(draws.at(-1)!.date)}
          </p>
        </article>
        <article className="metric">
          <div>
            <span>Dezena mais frequente</span>
            <Icon name="analysis" size={17} />
          </div>
          <strong>
            {ballLabel(frequent.number)}
            <small>{frequent.count} ocorrências</small>
          </strong>
          <p>
            <span className="metric-emphasis">
              {decimal(frequent.rate * 100)}%
            </span>{" "}
            dos sorteios na janela
          </p>
        </article>
        <article className="metric">
          <div>
            <span>Maior intervalo atual</span>
            <Icon name="history" size={17} />
          </div>
          <strong>
            {gap.censored ? "≥ " : ""}
            {gap.gap}
            <small>concursos</small>
          </strong>
          <p>
            Dezena{" "}
            <span className="metric-emphasis">{ballLabel(gap.number)}</span> ·
            ausência na janela
          </p>
        </article>
        <article className="metric">
          <div>
            <span>Soma média das dezenas</span>
            <Icon name="test" size={17} />
          </div>
          <strong>
            {decimal(summary.averageSum, 1)}
            <small>pontos</small>
          </strong>
          <p>
            Referência matemática: <span className="metric-emphasis">183</span>
          </p>
        </article>
      </div>
      <div className="analysis-grid">
        <FrequencyPanel summary={summary} draws={draws} />
        <RankingPanel
          summary={summary}
          onExplore={() => navigate("analysis")}
        />
      </div>
      <section className="panel recent-panel">
        <PanelHeading
          title="Últimos concursos"
          detail="Resultados do período selecionado."
          action={
            <button className="text-button" onClick={() => navigate("history")}>
              Explorar histórico <Icon name="right" size={16} />
            </button>
          }
        />
        <DrawTable draws={draws.slice(-5).reverse()} compact />
      </section>
      <div className="two-grid">
        <DistributionPanel summary={summary} kind="parity" />
        <DistributionPanel summary={summary} kind="sum" />
      </div>
      <div className="insight-banner">
        <span className="insight-banner-icon">
          <Icon name="lab" size={26} />
        </span>
        <div>
          <p className="eyebrow">DO HISTÓRICO À HIPÓTESE</p>
          <h3>Curiosidade é um bom começo. Testar é o próximo passo.</h3>
          <p>
            Compare métodos com a seleção aleatória e veja o que os dados
            realmente sustentam.
          </p>
        </div>
        <button className="button secondary" onClick={() => navigate("test")}>
          Testar estratégias <Icon name="right" size={16} />
        </button>
      </div>
      <Notice>
        Cada combinação de 6 dezenas tem a mesma chance de sena:{" "}
        <strong>1 em 50.063.860</strong>. Frequências e padrões descrevem o
        histórico; não mudam essa chance no próximo concurso.
      </Notice>
    </div>
  );
}
