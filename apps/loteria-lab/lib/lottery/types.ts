export type Draw = {
  contest: number;
  date: string;
  numbers: number[];
  /** Sena, quina, quadra, respectively. */
  winners: number[];
  prizes: (number | null)[];
};

export type Dataset = {
  schemaVersion: number;
  game: string;
  fetchedAt: string;
  source: {
    archiveUrl: string;
    apiUrl: string;
    rulesUrl: string;
    archiveSha256: string;
    drawsSha256: string;
    archiveThroughContest: number;
    apiVerifiedContests: number[];
  };
  draws: Draw[];
  next: {
    contest: number | null;
    date: string | null;
    estimatedPrize: number | null;
  };
};

export type DataResponse = {
  dataset: Dataset;
  freshness: {
    status: "snapshot" | "current" | "unavailable" | "update-required";
    checkedAt: string | null;
    latestAvailableContest: number | null;
    message: string;
  };
};

export type Strategy = "uniform" | "frequent" | "infrequent" | "pairs";
export type GenerationObjective = "sena" | "any-prize";
export type MethodContribution = {
  strategy: Strategy;
  candidates: number;
  selected: number;
};

export type GeneratorOptions = {
  strategy: Strategy | "ensemble";
  /** Older saved configurations have no objective; new generation defaults to Sena. */
  objective?: GenerationObjective;
  size: number;
  count: number;
  fixed: number[];
  excluded: number[];
  balanced: boolean;
  minSum?: number;
  maxSum?: number;
};

export type SavedGame = {
  id: string;
  createdAt: string;
  numbers: number[];
  strategy: Strategy;
  trainingStart: number;
  trainingEnd: number;
  trainingCount: number;
  reasoning: string[];
  constraints: string;
  /** Optional for compatibility with games saved before provenance was recorded. */
  dataFingerprint?: string;
  generatorOptions?: GeneratorOptions;
  generation?: {
    version: "coverage-v1" | "ensemble-v1";
    portfolioId: string;
    portfolioSize: number;
    candidatesConsidered: number;
    methods?: MethodContribution[];
  };
};
