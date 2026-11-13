export const MEGASENA = {
  id: "megasena",
  name: "Mega-Sena",
  population: 60,
  drawn: 6,
  minPicks: 6,
  maxPicks: 20,
  simplePrice: 6,
  priceCheckedAt: "2026-10-24",
  rulesUrl: "https://loterias.caixa.gov.br/Paginas/Mega-Sena.aspx",
  apiUrl: "https://servicebus3.caixa.gov.br/portaldeloterias/api/megasena",
} as const;

/** Each future game gets its own adapter and probability model. */
export const GAME_CATALOG = [
  {
    id: "megasena",
    name: "Mega-Sena",
    available: true,
    description: "6 dezenas entre 60",
  },
  {
    id: "lotofacil",
    name: "Lotofácil",
    available: false,
    description: "Próxima expansão",
  },
  {
    id: "quina",
    name: "Quina",
    available: false,
    description: "Próxima expansão",
  },
] as const;

export const STRATEGIES = {
  uniform: {
    label: "Aleatório uniforme",
    short: "Uniforme",
    description:
      "Explora todas as dezenas sem favorecer nenhuma. É a referência para comparar os outros métodos.",
    rule: "Todas as dezenas disponíveis recebem peso 1.",
  },
  frequent: {
    label: "Mais frequentes",
    short: "Frequentes",
    description:
      "Dá mais espaço às dezenas que mais apareceram no período, sem excluir as demais.",
    rule: "Peso de cada dezena = ocorrências no período + 1.",
  },
  infrequent: {
    label: "Menos frequentes",
    short: "Menos frequentes",
    description:
      "Explora dezenas que apareceram menos, para variar a seleção. Isso não significa que estejam para sair.",
    rule: "Peso = maior frequência do período − ocorrências da dezena + 1.",
  },
  pairs: {
    label: "Duplas recorrentes",
    short: "Duplas",
    description:
      "Parte de dois números que já saíram juntos com frequência e sorteia as outras dezenas.",
    rule: "Sorteia uma das 20 duplas mais recorrentes compatíveis, com peso ocorrências + 1; completa as vagas com pesos iguais.",
  },
} as const;

export const OBJECTIVES = {
  sena: {
    label: "Sena",
    description:
      "Prioriza combinações de 6 dezenas distintas. Jogos simples diferentes têm a mesma chance, mesmo com dezenas em comum.",
    reasoning:
      "Objetivo Sena: a seleção busca reduzir combinações de 6 dezenas pagas mais de uma vez. Para jogos simples distintos, a cobertura de Sena já é máxima para essa quantidade de jogos.",
  },
  "any-prize": {
    label: "Qualquer prêmio",
    description:
      "Prioriza a chance de pelo menos um jogo acertar 4, 5 ou 6 dezenas, reduzindo a sobreposição entre resultados premiados.",
    reasoning:
      "Objetivo Qualquer prêmio: a seleção busca reduzir resultados que premiariam vários jogos ao mesmo tempo, distribuindo as oportunidades de pelo menos um acerto de 4 ou mais dezenas.",
  },
} as const;
