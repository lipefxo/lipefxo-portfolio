# Loteria Lab

Aplicação independente, em português, para explorar o histórico oficial da Mega-Sena, gerar combinações explicáveis e testar hipóteses em concursos posteriores ao treinamento. O portfólio na raiz do repositório continua sendo outro projeto.

## Executar

Requisitos: Node.js **22.13 ou superior**, npm e Python 3 (biblioteca padrão, sem pacotes adicionais).

```sh
cd apps/loteria-lab
npm ci
npm run dev
```

O servidor usa `CONDUCTOR_PORT` quando definido e `55020` como padrão. Para escolher outra porta: `npm run dev -- --port 55021`. Use a URL impressa pelo servidor e uma porta livre do seu workspace.

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm start -- --port 55020
```

Pare o servidor de desenvolvimento antes de executar o preview de produção na mesma porta. `npm start` executa o Worker compilado localmente; não publica o app.

## O que está disponível

- **Visão geral:** último concurso, estimativa oficial do próximo prêmio, filtros de período, mapa das 60 dezenas, ranking e distribuições.
- **Análise:** frequência, intervalo desde a última ocorrência, duplas recorrentes, resultados completos repetidos, paridade, somas e repetição entre concursos. Os gráficos comparam o histórico com expectativas matemáticas.
- **Histórico:** busca por concurso, datas e dezena; detalhes dos rateios; exportação CSV da seleção.
- **Laboratório:** uma **coleção automática** que combina os quatro métodos, com objetivos **Sena** e **Qualquer prêmio**, 6–20 dezenas e 1–20 jogos. O padrão é 4 jogos, com custo mostrado antes de gerar. Dezenas fixas/excluídas e filtros de soma e paridade são opcionais. A composição mostra quantos jogos vieram de cada método. Cada jogo inclui sua origem, objetivo, explicação, período de treinamento, parâmetros, grupo de geração e identidade da base.
- **Teste de estratégias:** coleções completas e métodos individuais, janela móvel, múltiplas sementes, controles uniformes, cobertura, diferenças pareadas e protocolo exportável. Processamento em Web Worker.
- **Meus jogos:** coleções agrupadas, importação/exportação validada, diário de experimentos e comparação com resultados oficiais, armazenados neste navegador. Salvar um jogo não registra uma aposta. Limpar os dados do navegador remove os jogos locais.
- **Fontes e metodologia:** links oficiais, verificação por amostra, datas da consulta, assinaturas SHA-256 e exportação da base.

## Dados oficiais e atualização

O snapshot inicial tem **3.073 concursos**, de **11/03/1996 a 22/10/2026**. Esses números descrevem a importação inicial; novas importações podem ampliar a base.

Fontes:

- [Regras, preços e probabilidades da Mega-Sena](https://loterias.caixa.gov.br/Paginas/Mega-Sena.aspx)
- [Planilha histórica oficial](https://servicebus3.caixa.gov.br/portaldeloterias/api/resultados/download?modalidade=Mega-Sena)
- [API oficial do último concurso](https://servicebus3.caixa.gov.br/portaldeloterias/api/megasena)
- [Configuração pública do portal CAIXA](https://loterias.caixa.gov.br/Style%20Library/json/params.txt)

Atualização permanente do snapshot:

```sh
npm run data:sync
npm test
```

O importador descobre o endereço da API na configuração oficial, baixa o XLSX, verifica a sequência completa, datas, dezenas e rateios e consulta uma amostra dos concursos arquivados também na API. Se a API estiver adiantada, importa cada concurso intermediário. O XLSX original fica em `data/source/megasena.xlsx`; a base normalizada, em `data/megasena.json`. Os dois arquivos são preparados juntos em `data/.import-staging`, com cópias do par anterior. Um manifesto permite recuperar uma operação interrompida antes da próxima importação; as cópias anteriores permanecem até a conclusão. Isso permite recuperação, mas não torna duas substituições um único evento atômico para leitores concorrentes. Não execute importadores ou builds em paralelo com a importação. Uma falha na obtenção ou validação da fonte interrompe a importação.

O botão **Atualizar dados** consulta a API pelo servidor, evita a dependência de CORS e acrescenta até 200 concursos faltantes. Só aceita o novo conjunto depois de validar todos os concursos. Há limite de uma tentativa por minuto por instância e compartilhamento de consultas simultâneas. Falhas preservam a última base válida, com aviso visível. Divergências no último resultado conhecido e bases mais antigas exigem nova importação completa.

O servidor usa **Cloudflare D1 (`DB`)** para revisões imutáveis, estado ativo e histórico de tentativas. A promoção ocorre em lote transacional e rejeita regressões de sequência/tempo. A página e a API leem a revisão persistida; sem armazenamento, exibem explicitamente o snapshot embarcado. Uma importação embarcada mais recente e pelo menos tão completa pode substituir uma revisão antiga, permitindo aplicar correções oficiais. O botão não altera arquivos versionados. Os cinco concursos mais recentes são reconferidos, incluindo rateios.

O Worker implementa `scheduled`, mas o Wrangler não instala um cron próprio. A operação usa tarefas vinculadas ao Sites: atualização diária às **22:30 de Brasília** e monitoramento às **08:00**, sem duplicar gatilhos. A criação das tarefas e a verificação do ambiente publicado ficam registradas no release. Falhas são registradas nas tentativas de ingestão; as tarefas retornam alertas operacionais. `GET /api/draws?diagnostics=1` e Fontes e metodologia mostram as últimas 20 consultas. `GET /api/health` retorna 503 se o D1 falhar, a última consulta falhar, houver divergência de concursos ou a consulta oficial tiver mais de 30 horas. Não há alerta por email configurado. Consulte [OPERATIONS.md](OPERATIONS.md) para acesso, monitoramento e recuperação.

Cada revisão persistida tem uma assinatura separada que inclui dezenas, datas, ganhadores, rateios e metadados. Ela permite detectar corrupção, sem alegar autenticidade criptográfica da CAIXA.

A assinatura dos resultados é SHA-256 da matriz JSON compacta `[[concurso, dataISO, dezena1, …, dezena6], …]`, com dezenas ordenadas. Ela identifica a versão dos resultados, não inclui rateios e não prova autenticidade sozinha. A assinatura separada do XLSX cobre o arquivo original inteiro. Concursos importados apenas da API não são contados como conferência cruzada entre XLSX e API.

## Métodos e limites

| Método             | Regra de seleção                                                                                                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Aleatório uniforme | Pesos iguais para as dezenas disponíveis, sem reposição.                                                                                                                                     |
| Mais frequentes    | Peso de cada dezena = ocorrências na janela + 1.                                                                                                                                             |
| Menos frequentes   | Peso = maior frequência da janela − ocorrências + 1.                                                                                                                                         |
| Duplas recorrentes | Sorteia uma das 20 duplas mais recorrentes compatíveis, com peso ocorrências + 1; completa as vagas com pesos iguais. Empates usam ordem numérica. Sem dupla elegível, usa seleção uniforme. |

Os métodos acima definem a amostragem dos **candidatos**. As dezenas fixas são escolhas do usuário. As explicações distinguem essas escolhas das decisões do método e registram a dupla efetivamente usada. Os filtros de soma e paridade rejeitam candidatos; a busca é limitada a 20.000 tentativas e informa se encontrou menos jogos que o solicitado. O laboratório usa Web Crypto; o teste usa Mulberry32 com semente explícita.

### Coleção automática

O laboratório usa `strategy: "ensemble"` e a versão `ensemble-v1`. Os quatro métodos geram candidatos com metas iguais; a ordem dos métodos é embaralhada para não favorecer sempre o mesmo em coleções pequenas. O total de candidatos é limitado a `max(64, quantidade × 16)` (até 320), ou ao número de combinações possíveis. Cada método recebe no máximo 5.000 tentativas. Duplicatas são descartadas também entre métodos, preservando o método e a dupla que realmente produziram o primeiro candidato aceito.

A seleção prioriza os métodos menos representados que ainda tenham candidatos disponíveis. Dentro dessa rodada, aplica o objetivo de cobertura. Com candidatos suficientes, 4 jogos incluem um de cada método; 8 incluem dois de cada. Quantidades menores usam menos métodos e rodadas incompletas podem variar a distribuição. Filtros restritivos podem limitar a participação de algum método, e a interface mostra os números reais. Se um método esgotar seus candidatos, os demais continuam. O sistema nunca aumenta a quantidade nem o custo solicitados para completar a mistura.

Essa prioridade de variedade é uma escolha de composição, não evidência de ganho preditivo nem garantia de maior probabilidade que qualquer coleção de um método único. O objetivo de cobertura é aplicado **dentro** dessa restrição. O modo Coleções avalia o gerador completo contra coleções uniformes, incluindo um controle que aplica o mesmo otimizador de cobertura. O modo Métodos individuais mantém a comparação anterior. As opções de um método único seguem disponíveis no motor para compatibilidade com jogos anteriores e experimentos.

### Objetivos do conjunto

- **Sena:** prioriza reduzir a sobreposição das combinações de seis dezenas entre jogos expandidos. Jogos simples distintos já têm a mesma cobertura máxima de Sena para sua quantidade; nesse caso, os empates preservam a ordem dos candidatos elegíveis na rodada.
- **Qualquer prêmio:** prioriza reduzir a interseção dos resultados que dariam pelo menos quatro acertos em pares de jogos. Isso distribui as oportunidades de pelo menos um prêmio, em vez de concentrar prêmios simultâneos. Não representa previsão nem maximização de retorno financeiro.

A quantidade de jogos, o tamanho e o custo não mudam ao trocar de objetivo. Com apenas um jogo, as probabilidades são iguais nos dois modos. Entre os candidatos elegíveis, a seleção gulosa escolhe o próximo que menos acrescenta interseções de eventos premiados aos pares. Em Qualquer prêmio, empates favorecem menor soma de quadrados das quantidades de dezenas compartilhadas. É uma heurística limitada, sem garantir o máximo global da probabilidade de união. Os métodos históricos influenciam os candidatos, e a seleção do conjunto pode alterar sua distribuição final. Objetivo, versão, contagens por método, número de candidatos e identificador do grupo acompanham os jogos salvos e exportados; jogos antigos (`coverage-v1` ou sem metadados) continuam compatíveis.

A chance de **Sena** continua sendo a união exata dos subconjuntos de seis dezenas. Para **Qualquer prêmio**, cada evento é “este jogo contém pelo menos quatro das seis dezenas sorteadas”. As interseções de dois eventos são contadas exatamente em quatro grupos: dezenas comuns, exclusivas do primeiro jogo, exclusivas do segundo e fora dos dois. O limite inferior da união é o maior entre a chance individual máxima e a soma das chances individuais menos todas as interseções aos pares (Bonferroni). O superior subtrai da soma individual uma árvore geradora de peso máximo das interseções (limite de Hunter), limitado a 1. Os cálculos usam contagens inteiras de resultados entre C(60, 6).

Quando os limites coincidem, a interface informa a chance exata; isso sempre ocorre para um ou dois jogos e para eventos premiados mutuamente exclusivos. Nos outros casos, mostra **limites matemáticos**, não uma estimativa de simulação ou intervalo de confiança. Dois jogos simples sem dezenas em comum têm chance de qualquer prêmio de aproximadamente 1 em 1.148,78; compartilhando cinco dezenas, aproximadamente 1 em 1.407,47. A chance de Sena é 1 em 25.031.930 nos dois casos.

No modo **Métodos individuais**, cada método gera **um jogo simples por concurso**, usando somente os `trainSize` concursos anteriores. Esse teste usa a mesma amostragem individual, mas **não avalia a coleção automática nem os objetivos de diversificação de conjuntos**. O concurso avaliado e os seguintes ficam fora do treinamento. Os testes de regressão alteram um resultado futuro e verificam que os jogos já escolhidos permanecem iguais. O custo apresentado usa a tarifa atual, sem estimar retorno financeiro histórico.

Sob sorteios uniformes e independentes, todas as combinações de seis dezenas têm a mesma chance: **1 em C(60,6) = 1 em 50.063.860**. Frequência, ausência, duplas e paridade são descrições/heurísticas, sem vantagem preditiva demonstrada. Grupos com somas centrais contêm mais combinações, mas isso não torna cada combinação individual mais provável.

A expectativa de acertos de um jogo simples é **0,6**. A faixa de referência exibida é `0,6 ± 1,96 × √((6 × 0,1 × 0,9 × 54/59) / N)`, uma aproximação sob o modelo de sorteios independentes. É uma comparação exploratória; escolher regras depois de ver os resultados ou comparar várias estratégias impede tratar uma diferença isolada como prova de previsão.

Jogos com `k` dezenas cobrem `C(k,6)` combinações simples. O custo usa a tarifa de **R$ 6,00**, consultada em **24/10/2026** e centralizada em `lib/lottery/games.ts`. A cobertura de vários jogos é a união exata dos subconjuntos de seis dezenas, removendo sobreposições; o custo mantém todas as combinações pagas. Revise a tarifa na fonte oficial antes de atualizá-la no código. O sistema não vende nem registra apostas.

## Estrutura

```text
app/                    Página, estilos e API de atualização
components/lab/         Telas do produto
lib/lottery/            Regras, estatística, geração, testes e serviço de dados
scripts/sync-caixa.py   Importador oficial sem dependências Python
data/                   Snapshot validado e arquivo de origem
tests/                  Regressões matemáticas, de ingestão e de geração
worker/                 Entrada do Worker de produção
.openai/hosting.json    Identidade e configuração de publicação
```

A aplicação usa React, TypeScript e Vinext/Vite, com execução de servidor em Cloudflare Workers. Os scripts e a integração `sites()` do starter suportam instalação, preview e empacotamento. D1 é declarado como `DB` em `.openai/hosting.json`; não há R2, Supabase nem credenciais de CAIXA. As migrações em `drizzle/` são aplicadas pelo publicador Sites e precisam ser aplicadas separadamente ao preview local. Os arquivos de runtime local e `node_modules` ficam fora do Git. Os fontes Inter são hospedados pelo próprio app; a licença está em `public/fonts/OFL.txt`.

O catálogo em `lib/lottery/games.ts` reserva Lotofácil e Quina para futuras expansões. Só Mega-Sena está implementada. Uma nova modalidade precisa de importador/normalizador, validação, regras de aposta, cálculos de probabilidade e testes próprios; as regras de seis entre sessenta não devem ser reutilizadas sem adaptação.

## Coleções, orçamento e diário

O gerador começa pelo orçamento máximo, quantidade e objetivo, com filtros e explicações recolhidos. Nunca gera acima do limite informado; não aumenta o orçamento ao mudar o tamanho. Geração e cobertura usam Web Worker cancelável. O resultado mostra cobertura por real, sobreposição paga e amplitude dos limites matemáticos.

O protocolo `collection-v1` compara o gerador real com (1) jogos uniformes distintos e (2) candidatos uniformes selecionados pelo otimizador de cobertura. Os braços usam os mesmos filtros, tamanho, quantidade, tarifa e total de candidatos. Uma busca incompleta interrompe o teste em vez de comparar custos diferentes. A coleção automática mantém sua prioridade de diversidade de métodos, portanto a comparação mede a política inteira.

A métrica principal predefinida é o melhor acerto médio por coleção. O relatório também mostra prêmios por concurso, acertos de 4/5/6, cobertura exata de Sena e limites de qualquer prêmio. As sementes são agregadas dentro de cada concurso antes da diferença pareada e seu intervalo normal aproximado. O intervalo é exploratório, sem correção para as duas comparações e não elimina dependência de janelas sobrepostas. Não é prova de vantagem preditiva. A execução é cancelável, tem limite explícito de trabalho e exporta o protocolo congelado.

Meus jogos agrupa coleções e oferece importação/exportação validada com prévia de duplicatas e conflitos. O diário requer uma coleção completa e consulta oficial confirmada há menos de 15 minutos. Registra configuração, custo por concurso, versão, fingerprint, corte de treinamento, jogos e intervalo futuro. Não há edição de registros válidos após registrar. Todos os concursos são acompanhados, incluindo zero acertos. Relógio e armazenamento são locais: o registro não prova anterioridade por servidor. Importações são rotuladas como tal. Exporte jogos e diário separadamente para backup.

## Verificação e preview com D1

Depois de `npm run build`, aplique uma única vez cada migração pendente ao banco local:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_ancient_giant_girl.sql
npx playwright install chromium
LOTTERY_TEST_PORT=55022 npm run test:browser
```

Escolha uma porta livre na faixa do workspace. Playwright inicia seu próprio preview headless, recusa reutilizar servidores existentes e grava screenshots/traces em `.context/browser/` na raiz do workspace. A CI tem job independente para testes Node/Python, TypeScript, ESLint, build, migração local e testes de navegador: orçamento, geração, salvar/recarregar/exportar/restaurar, backtest, diário, armazenamento corrompido e navegação mobile.

## Benchmark reproduzível

O [relatório v1](benchmarks/collection-v1.report.md) compara três períodos históricos, dois orçamentos e dois objetivos, com cinco sementes por caso. Inclui resultados desfavoráveis, limites de cobertura, diferenças pareadas e tempo de execução. O protocolo congela as assinaturas dos dados e do motor. A CI verifica os resultados com `npm run benchmark:verify`; `npm run benchmark` regenera os artefatos.

Nos casos de dez jogos com objetivo Qualquer prêmio, a coleção superou a seleção uniforme bruta em acertos máximos médios, mas não mostrou vantagem clara contra a seleção uniforme com o mesmo otimizador. Os intervalos são exploratórios e os dados já foram inspecionados; não demonstram capacidade preditiva nem retorno futuro. A base congelada do benchmark permanece independente das atualizações do D1.

### Limite do preview de cron

Com Wrangler 4.92.0, o endpoint local de cron retornou `exception` quando `assets` estava presente, antes de alcançar o Worker. O mesmo build e D1, em configuração de teste sem `assets`, executaram o handler com HTTP 200, atualizaram até o concurso 3085 e registraram a tentativa. Isso verifica o handler, não a instalação de um gatilho na hospedagem. Não remova assets da configuração de produção. A operação publicada usa o endpoint HTTP autenticado e tarefas vinculadas descritos em [OPERATIONS.md](OPERATIONS.md).
