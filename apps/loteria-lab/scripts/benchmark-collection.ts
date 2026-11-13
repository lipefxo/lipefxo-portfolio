import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { runCollectionBacktest } from "../lib/lottery/collection-backtest.ts";
import { MEGASENA } from "../lib/lottery/games.ts";
import type { Dataset, GeneratorOptions } from "../lib/lottery/types.ts";

// Pin the protocol independently of its contents: edits require a new benchmark version.
const protocolHash = "91631f67dc0a4db5cebf514e1402d7aa516b1d629446c8f93ef70f901d268278";
const root = fileURLToPath(new URL("../", import.meta.url));
const path = (name: string) => join(root, name);
const bytes = (name: string) => readFileSync(path(name));
const hash = (value: Uint8Array) => createHash("sha256").update(value).digest("hex");
const protocolBytes = bytes("benchmarks/collection-v1.protocol.json");
if (hash(protocolBytes) !== protocolHash) throw new Error("Protocol fingerprint mismatch; create a new benchmark version instead of editing v1.");
const protocol = JSON.parse(protocolBytes.toString()) as {
  id: string;
  dataset: { path: string; sha256: string; game: string; draws: number; firstContest: number; lastContest: number };
  implementation: Record<string, string>;
  periodEndContests: number[]; trainSize: number; testSize: number; seed: number; seeds: number;
  counts: number[]; objectives: ("sena" | "any-prize")[];
  options: Omit<GeneratorOptions, "count" | "objective">;
};
if (hash(bytes(protocol.dataset.path)) !== protocol.dataset.sha256) throw new Error("Dataset fingerprint mismatch.");
for (const [file, expected] of Object.entries(protocol.implementation))
  if (hash(bytes(file)) !== expected) throw new Error(`Implementation fingerprint mismatch: ${file}`);
const dataset = JSON.parse(bytes(protocol.dataset.path).toString()) as Dataset;
if (dataset.game !== protocol.dataset.game || dataset.draws.length !== protocol.dataset.draws ||
    dataset.draws[0].contest !== protocol.dataset.firstContest || dataset.draws.at(-1)?.contest !== protocol.dataset.lastContest ||
    dataset.draws.some((draw, i) => i > 0 && draw.contest <= dataset.draws[i - 1].contest))
  throw new Error("Dataset ordering or metadata mismatch.");

const started = performance.now();
const cases = [];
for (const end of protocol.periodEndContests) {
  const index = dataset.draws.findIndex((draw) => draw.contest === end);
  if (index < protocol.trainSize + protocol.testSize - 1) throw new Error(`Invalid period ending ${end}`);
  // The backtest only sees this prefix, and constructs each training window strictly before its target.
  const prefix = dataset.draws.slice(0, index + 1);
  for (const count of protocol.counts) for (const objective of protocol.objectives) {
    const caseStarted = performance.now();
    const result = runCollectionBacktest(prefix, {
      trainSize: protocol.trainSize, testSize: protocol.testSize, seed: protocol.seed, seeds: protocol.seeds,
      options: { ...protocol.options, count, objective },
    });
    for (const contest of result.contests) {
      if (contest.trainingEnd >= contest.contest) throw new Error("Training must precede the target.");
      for (const run of contest.runs) for (const outcome of Object.values(run.outcomes))
        if (outcome.tickets.length !== count) throw new Error("Unequal budgets.");
    }
    cases.push({
      firstContest: result.firstContest, lastContest: result.lastContest, count, objective,
      results: result.results, comparisons: result.comparisons,
      // Preserve per-contest, per-seed measurements without the much larger ticket arrays.
      contests: result.contests.map((contest) => ({ ...contest, runs: contest.runs.map((run) => ({
        ...run, outcomes: Object.fromEntries(Object.entries(run.outcomes).map(([name, outcome]) => [name, Object.fromEntries(Object.entries(outcome).filter(([key]) => key !== "tickets"))])),
      })) })),
      runtimeSeconds: (performance.now() - caseStarted) / 1000,
    });
    console.log(`${result.firstContest}–${result.lastContest}, ${count} tickets, ${objective}: complete`);
  }
}
const report = { protocolSha256: protocolHash, protocol, cases, runtimeSeconds: (performance.now() - started) / 1000 };
const withoutRuntime = (value: unknown) => JSON.stringify(value, (key, item) => key === "runtimeSeconds" ? undefined : item);
const output = "benchmarks/collection-v1.report.json";
if (process.argv.includes("--verify")) {
  const previous = JSON.parse(bytes(output).toString());
  if (withoutRuntime(previous) !== withoutRuntime(report)) throw new Error("Benchmark results differ from the saved report.");
  console.log("All non-runtime report values match the saved report.");
} else {
  writeFileSync(path(output), JSON.stringify(report) + "\n");
  const f = (n: number, digits = 3) => n.toFixed(digits);
  const rows = cases.flatMap((c) => c.results.map((r) => `| ${c.firstContest}–${c.lastContest} | ${c.count} | ${c.objective} | ${r.name} | ${f(r.maxHits)} | ${f(r.anyPrize, 4)} | ${f(r.prizeTickets, 4)} | ${f(r.prizeLower, 6)}–${f(r.prizeUpper, 6)} |`));
  const intervals = cases.flatMap((c) => c.comparisons.map((v) => `| ${c.firstContest}–${c.lastContest} | ${c.count} | ${c.objective} | ${v.baseline} | ${f(v.mean)} | [${f(v.interval[0])}, ${f(v.interval[1])}] |`));
  const budgetRows = protocol.counts.map((count) => `| ${count} | R$ ${(count * MEGASENA.simplePrice).toFixed(2)} | ${count} / 50,063,860 |`);
  const runtimeRows = cases.map((c) => `| ${c.firstContest}–${c.lastContest} | ${c.count} | ${c.objective} | ${f(c.runtimeSeconds, 2)} |`);
  const md = `# Collection benchmark v1\n\nExploratory rolling-origin comparison of ensemble against uniform and uniformOptimized on the bundled Mega-Sena snapshot. Run from this app directory with \`node --experimental-strip-types scripts/benchmark-collection.ts\`; add \`--verify\` to recompute and compare all non-runtime JSON values. The protocol is frozen in [collection-v1.protocol.json](collection-v1.protocol.json), and the complete machine-readable settings, provenance, case results and per-contest/seed measurements are in [collection-v1.report.json](collection-v1.report.json). Both the protocol and input data and implementation fingerprints are checked before computation.\n\nThree separated periods of 100 draws each use the preceding 200 draws as a rolling training window. Each target sees only prior data. Each case uses seeds ${protocol.seed}–${protocol.seed + protocol.seeds - 1}, six numbers per ticket, no fixed/excluded numbers or balance/sum filters, and the same ticket and candidate budgets across methods. UniformOptimized selects from the same uniform candidate pool as uniform. Runtime for this run: ${f(report.runtimeSeconds, 2)} seconds (machine- and load-dependent).\n\n## Budget and runtime\n\nNominal per-draw cost uses the app’s simple-ticket tariff of R$ ${MEGASENA.simplePrice.toFixed(2)}, checked ${MEGASENA.priceCheckedAt}; it does not represent historical prices or total expenditure. For each portfolio of distinct six-number tickets, exact Sena coverage is the number of tickets divided by the 50,063,860 possible draws.\n\n| Tickets per draw | Nominal cost per draw | Exact Sena coverage |\n|---:|---:|---:|\n${budgetRows.join("\n")}\n\nCase timings include generating and evaluating all methods across the 100 targets and five seeds.\n\n| Contests | Tickets | Objective | Seconds |\n|---|---:|---|---:|\n${runtimeRows.join("\n")}\n\n## Measurements\n\nValues are averages across contests after averaging the five seeds within each contest. Max hits is the best ticket's number of matching numbers. Observed any-prize is the fraction of contest/seed runs with at least one 4+ match; prize tickets is the mean count of tickets with 4+ matches. Coverage bounds give mathematical limits on the probability of at least one prize over all possible draws for the generated portfolio; they are **not observed hit rates**. Displayed bounds are rounded to six decimal places and can appear equal even when the unrounded bounds differ; the JSON retains full precision.\n\n| Contests | Tickets | Objective | Method | Mean max hits | Observed any-prize | Prize tickets | Coverage bounds |\n|---|---:|---|---|---:|---:|---:|---:|\n${rows.join("\n")}\n\n## Paired max-hit differences\n\nEnsemble minus baseline. Each interval is an unadjusted 95% normal interval calculated from contest-level paired differences after averaging seeds. Negative values favor the baseline. Multiple comparisons and overlapping training windows limit interpretation; these intervals are exploratory, not adjusted for selection or multiplicity.\n\n| Contests | Tickets | Objective | Baseline | Difference | Normal interval |\n|---|---:|---|---|---:|---|\n${intervals.join("\n")}\n\n## Interpretation and limitations\n\nFor 10 tickets with the any-prize objective, ensemble had higher mean max hits than raw uniform in all three periods, but its differences against uniformOptimized were small or negative and all three intervals included zero. Ensemble also trailed both controls in several cases, including 2-ticket runs in contests 1901–2000. These comparisons do not establish an advantage in actual prizes.\n\nThe dataset and historical periods have been inspected previously: these are not untouched holdouts. Repeated training windows overlap heavily, and seeds share each target draw; seeds are therefore not treated as independent contests. The small windows have very little power for rare prizes, especially quina and sena, so absence or presence of a few hits cannot establish an advantage. Coverage bounds describe portfolio overlap under a uniform-draw model, not evidence that historical patterns predict future outcomes. This protocol compares configurations on this snapshot and does not establish predictive skill or future returns. Underperforming cases remain in the tables. Six-number distinct tickets have identical jackpot coverage for a fixed budget; under the Sena objective the two uniform controls may coincide.\n`;
  writeFileSync(path("benchmarks/collection-v1.report.md"), md);
  console.log(`Wrote report in ${f(report.runtimeSeconds, 2)} seconds.`);
}
