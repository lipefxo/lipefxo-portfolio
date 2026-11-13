"use client";

import { useState } from "react";
import { MEGASENA, STRATEGIES } from "../../lib/lottery/games";
import type { DataResponse } from "../../lib/lottery/types";
import {
  dateLabel,
  downloadFile,
  Icon,
  integer,
  Notice,
  PanelHeading,
  timestampLabel,
} from "./ui";

export function SourcesView({
  data,
  refresh,
  busy,
}: {
  data: DataResponse;
  refresh: () => void;
  busy: boolean;
}) {
  const [attempts, setAttempts] = useState<
    | {
        checkedAt: string;
        status: string;
        lastContest: number;
        message: string;
      }[]
    | null
  >(null);
  const [diagnosticError, setDiagnosticError] = useState("");
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  async function loadAttempts() {
    setLoadingAttempts(true);
    setDiagnosticError("");
    try {
      const response = await fetch("/api/draws?diagnostics=1", {
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok)
        throw new Error(
          "O histórico de atualizações não está disponível agora.",
        );
      const result = (await response.json()) as { attempts: NonNullable<typeof attempts> };
      if (!Array.isArray(result.attempts)) throw new Error("Resposta de diagnóstico inválida.");
      setAttempts(result.attempts);
    } catch (error) {
      setDiagnosticError(
        error instanceof Error ? error.message : "Consulta indisponível.",
      );
    } finally {
      setLoadingAttempts(false);
    }
  }
  const { dataset, freshness } = data;
  const first = dataset.draws[0];
  const last = dataset.draws.at(-1)!;
  return (
    <div className="view-stack">
      <section className="source-hero panel">
        <span className="source-seal">
          <Icon name="verified" size={28} />
        </span>
        <div>
          <p className="eyebrow">PROVENIÊNCIA E TRANSPARÊNCIA</p>
          <h2>Dados que você pode conferir.</h2>
          <p>
            O histórico vem diretamente da CAIXA. A origem, as verificações e os
            limites de cada análise ficam visíveis aqui.
          </p>
        </div>
        <a
          className="button secondary"
          href={MEGASENA.rulesUrl}
          target="_blank"
          rel="noreferrer"
        >
          Portal oficial <Icon name="external" size={16} />
        </a>
      </section>
      <div className="two-grid">
        <section className="panel">
          <PanelHeading
            title="Integridade do histórico"
            detail="Validações exigidas antes de aceitar uma importação."
          />
          <div className="audit-list">
            {[
              [
                "Sequência completa",
                `${integer(dataset.draws.length)} concursos, de #${first.contest} a #${last.contest}`,
              ],
              [
                "Sem concursos duplicados",
                "Identificadores únicos, em ordem crescente",
              ],
              [
                "Dezenas válidas",
                "6 dezenas diferentes entre 01 e 60 em cada resultado",
              ],
              [
                "Datas consistentes",
                `${dateLabel(first.date)} a ${dateLabel(last.date)}, sem inversões`,
              ],
              [
                "Conferência cruzada por amostragem",
                `${dataset.source.apiVerifiedContests.length} concursos conferidos também na API`,
              ],
            ].map(([label, detail]) => (
              <div key={label}>
                <Icon name="verified" size={19} />
                <span>
                  <strong>{label}</strong>
                  <small>{detail}</small>
                </span>
              </div>
            ))}
          </div>
          <details className="game-criteria">
            <summary>
              Ver concursos da conferência cruzada{" "}
              <Icon name="down" size={14} />
            </summary>
            <p>
              {dataset.source.apiVerifiedContests
                .map((n) => `#${n}`)
                .join(", ")}
            </p>
            <p>
              As verificações de formato, sequência e datas cobrem toda a base.
              A segunda consulta à API é uma conferência por amostra.
            </p>
          </details>
        </section>
        <section className="panel">
          <PanelHeading title="Origem e atualização" />
          <div className="source-links">
            <a
              href={dataset.source.archiveUrl}
              target="_blank"
              rel="noreferrer"
            >
              <span>
                <Icon name="data" />
                <strong>
                  Histórico oficial da Mega-Sena
                  <small>Arquivo XLSX publicado pela CAIXA</small>
                </strong>
              </span>
              <Icon name="external" size={16} />
            </a>
            <a href={dataset.source.apiUrl} target="_blank" rel="noreferrer">
              <span>
                <Icon name="refresh" />
                <strong>
                  API de resultados da CAIXA
                  <small>Último resultado e consulta por concurso</small>
                </strong>
              </span>
              <Icon name="external" size={16} />
            </a>
            <a href={dataset.source.rulesUrl} target="_blank" rel="noreferrer">
              <span>
                <Icon name="info" />
                <strong>
                  Regras, preços e probabilidades
                  <small>
                    Tarifa consultada em {dateLabel(MEGASENA.priceCheckedAt)}
                  </small>
                </strong>
              </span>
              <Icon name="external" size={16} />
            </a>
          </div>
          <div className="data-timestamps">
            <p>
              <span>Base importada/atualizada</span>
              <strong>{timestampLabel(dataset.fetchedAt)} (Brasília)</strong>
            </p>
            <p>
              <span>Última consulta à fonte</span>
              <strong>
                {freshness.checkedAt
                  ? timestampLabel(freshness.checkedAt)
                  : "Ainda não realizada"}
              </strong>
            </p>
          </div>
          <button
            className="button secondary"
            onClick={refresh}
            disabled={busy}
          >
            <Icon name="refresh" size={16} className={busy ? "spin" : ""} />
            {busy ? "Consultando…" : "Consultar novos resultados"}
          </button>
        </section>
      </div>
      <Notice
        tone={
          freshness.status === "unavailable" ||
          freshness.status === "update-required"
            ? "amber"
            : "neutral"
        }
      >
        {freshness.message} Se a fonte estiver indisponível, a base validada
        continua acessível.
      </Notice>
      <section className="panel">
        <PanelHeading
          title="Como interpretar as análises"
          detail="As regras matemáticas por trás dos painéis."
        />
        <div className="methodology-grid">
          <article>
            <span className="methodology-number">01</span>
            <h3>Todos os jogos simples têm a mesma chance</h3>
            <p>
              Existem C(60, 6) = 50.063.860 combinações. Cada uma tem chance de
              1 em 50.063.860, sob um sorteio uniforme e independente. O
              histórico não muda essa probabilidade.
            </p>
          </article>
          <article>
            <span className="methodology-number">02</span>
            <h3>Frequência descreve uma amostra</h3>
            <p>
              Cada dezena tem chance de 6/60 = 10% por sorteio. Em N concursos,
              sua contagem esperada é N/10. Para uma dupla, a expectativa é N ×
              (6 × 5)/(60 × 59).
            </p>
          </article>
          <article>
            <span className="methodology-number">03</span>
            <h3>Intervalo não significa dívida</h3>
            <p>
              O intervalo conta os concursos desde a última aparição dentro da
              janela. “≥” indica ausência em toda a janela. Uma dezena ausente
              não fica mais provável no próximo sorteio.
            </p>
          </article>
          <article>
            <span className="methodology-number">04</span>
            <h3>Padrões agrupam jogos diferentes</h3>
            <p>
              Há mais combinações com somas centrais ou paridade equilibrada.
              Isso explica a frequência dos grupos; não torna um jogo específico
              desses grupos mais provável que outro.
            </p>
          </article>
          <article>
            <span className="methodology-number">05</span>
            <h3>Mais cobertura tem mais custo</h3>
            <p>
              Uma aposta com k dezenas cobre C(k, 6) combinações simples. O
              custo é C(k, 6) × R$ 6,00. Para vários jogos, a cobertura de sena
              é a união das combinações, removendo sobreposições.
            </p>
          </article>
          <article>
            <span className="methodology-number">06</span>
            <h3>Testar sem consultar o futuro</h3>
            <p>
              O experimento treina em uma janela móvel anterior ao concurso
              avaliado. Compara um jogo simples por método e por concurso, com
              semente fixa. Resultados retrospectivos são exploratórios e não
              garantem vantagem futura.
            </p>
          </article>
          <article>
            <span className="methodology-number">07</span>
            <h3>Dois objetivos para o conjunto</h3>
            <p>
              Sena busca evitar sobreposição de combinações de 6 dezenas.
              Qualquer prêmio busca reduzir resultados que dariam 4 ou mais
              acertos em vários jogos ao mesmo tempo. Isso distribui as
              oportunidades de pelo menos um prêmio. A quantidade de jogos e o
              custo não mudam ao trocar de objetivo.
            </p>
          </article>
          <article>
            <span className="methodology-number">08</span>
            <h3>Busca limitada, chances transparentes</h3>
            <p>
              A coleção alterna os métodos disponíveis e, dentro de cada rodada,
              busca reduzir a sobreposição entre pares de jogos. Essa prioridade
              de variedade não garante o conjunto ótimo. A chance de Sena é
              exata; a chance de qualquer prêmio usa limites matemáticos da
              união dos resultados premiados. Quando os limites coincidem, a
              chance também é exata. Um único jogo tem as mesmas chances nos
              dois objetivos.
            </p>
          </article>
        </div>
      </section>
      <section className="panel">
        <PanelHeading
          title="Como os métodos formam uma coleção"
          detail="O laboratório combina os quatro métodos; o teste compara coleções completas e também preserva o modo individual."
        />
        <p className="microcopy">
          Cada método recebe a mesma meta de candidatos, respeitando seus
          filtros. Jogos repetidos são descartados, inclusive entre métodos. A
          seleção prioriza os métodos menos representados e usa o objetivo
          escolhido para comparar os jogos elegíveis. A ordem inicial varia a
          cada geração. Se faltarem candidatos de um método, os demais continuam
          a seleção. Os resultados mostram a distribuição realmente gerada.
        </p>
        <div className="method-list">
          {Object.entries(STRATEGIES).map(([id, strategy]) => (
            <div key={id}>
              <h3>{strategy.label}</h3>
              <p>
                {strategy.description} {strategy.rule}{" "}
                {id === "pairs"
                  ? "As 20 duplas são ordenadas por ocorrências, com desempate numérico. Entre as elegíveis, o peso é ocorrências + 1; sem dupla elegível, a seleção é uniforme."
                  : "A amostragem é sem reposição: uma dezena não se repete no mesmo jogo."}
              </p>
            </div>
          ))}
        </div>
        <p className="microcopy">
          O teste de coleções usa a configuração do laboratório, com o mesmo
          orçamento, filtros e número de candidatos para os controles uniformes.
          Cada concurso usa somente dados anteriores. Sementes repetidas medem a
          variação da geração; não são novos sorteios independentes.
        </p>
        <p className="microcopy">
          No laboratório, a aleatoriedade usa Web Crypto. Nos testes, usa
          Mulberry32 para reproduzir o experimento. Restrições de soma e
          paridade usam rejeição limitada; buscas parciais são informadas. Os
          métodos não fornecem uma pontuação de “chance de sair”.
        </p>
      </section>
      <section className="panel">
        <PanelHeading
          title="Histórico de atualizações"
          detail="Verificações oficiais, falhas e revisões preservadas no servidor."
          action={
            <button
              className="button secondary"
              disabled={loadingAttempts}
              onClick={loadAttempts}
            >
              {loadingAttempts ? "Consultando…" : "Ver verificações recentes"}
            </button>
          }
        />
        <p className="microcopy">
          Atualizações validadas sobrevivem a reinícios quando o armazenamento
          está disponível. Uma divergência preserva a última base válida e exige
          reimportação. Os cinco concursos mais recentes são conferidos
          novamente a cada atualização.
        </p>
        {diagnosticError && <p role="alert">{diagnosticError}</p>}
        {attempts &&
          (attempts.length ? (
            <div className="table-scroll">
              <table className="backtest-table">
                <thead>
                  <tr>
                    <th>Consulta</th>
                    <th>Estado</th>
                    <th>Incluído até</th>
                    <th>Detalhe</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((attempt, index) => (
                    <tr key={`${attempt.checkedAt}-${index}`}>
                      <td>{timestampLabel(attempt.checkedAt)}</td>
                      <td>
                        {attempt.status === "current"
                          ? "Confirmado"
                          : attempt.status === "update-required"
                            ? "Reimportação necessária"
                            : "Falha"}
                      </td>
                      <td>#{attempt.lastContest}</td>
                      <td>{attempt.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>Ainda não há consultas oficiais registradas.</p>
          ))}
      </section>
      <section className="panel fingerprint-panel">
        <PanelHeading
          title="Identidade desta base"
          detail="Assinaturas SHA-256 para comparar uma exportação com esta versão."
          action={
            <button
              className="button secondary"
              onClick={() =>
                downloadFile(
                  "megasena-base-validada.json",
                  JSON.stringify(dataset),
                  "application/json",
                )
              }
            >
              <Icon name="download" size={16} />
              Exportar base completa
            </button>
          }
        />
        <div>
          <label>Resultados normalizados</label>
          <code>{dataset.source.drawsSha256}</code>
        </div>
        <div>
          <label>
            Arquivo XLSX original · até o concurso #
            {dataset.source.archiveThroughContest}
          </label>
          <code>{dataset.source.archiveSha256}</code>
        </div>
        <p className="microcopy">
          A assinatura normalizada usa uma matriz JSON compacta de [concurso,
          data ISO, seis dezenas ordenadas]. A assinatura comprova identidade,
          não autenticidade por si só. Os links oficiais permitem conferir a
          origem.
        </p>
      </section>
      <p className="microcopy">
        Loteria Lab é um projeto independente, sem vínculo com a CAIXA. Nesta
        versão, apenas Mega-Sena está disponível. As demais modalidades terão
        importação e regras próprias.
      </p>
    </div>
  );
}
