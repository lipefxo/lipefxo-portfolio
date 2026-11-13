# Collection benchmark v1

Exploratory rolling-origin comparison of ensemble against uniform and uniformOptimized on the bundled Mega-Sena snapshot. Run from this app directory with `node --experimental-strip-types scripts/benchmark-collection.ts`; add `--verify` to recompute and compare all non-runtime JSON values. The protocol is frozen in [collection-v1.protocol.json](collection-v1.protocol.json), and the complete machine-readable settings, provenance, case results and per-contest/seed measurements are in [collection-v1.report.json](collection-v1.report.json). Both the protocol and input data and implementation fingerprints are checked before computation.

Three separated periods of 100 draws each use the preceding 200 draws as a rolling training window. Each target sees only prior data. Each case uses seeds 20261113–20261117, six numbers per ticket, no fixed/excluded numbers or balance/sum filters, and the same ticket and candidate budgets across methods. UniformOptimized selects from the same uniform candidate pool as uniform. Runtime for this run: 20.04 seconds (machine- and load-dependent).

## Budget and runtime

Nominal per-draw cost uses the app’s simple-ticket tariff of R$ 6.00, checked 2026-10-24; it does not represent historical prices or total expenditure. For each portfolio of distinct six-number tickets, exact Sena coverage is the number of tickets divided by the 50,063,860 possible draws.

| Tickets per draw | Nominal cost per draw | Exact Sena coverage |
|---:|---:|---:|
| 2 | R$ 12.00 | 2 / 50,063,860 |
| 10 | R$ 60.00 | 10 / 50,063,860 |

Case timings include generating and evaluating all methods across the 100 targets and five seeds.

| Contests | Tickets | Objective | Seconds |
|---|---:|---|---:|
| 901–1000 | 2 | sena | 1.93 |
| 901–1000 | 2 | any-prize | 1.76 |
| 901–1000 | 10 | sena | 3.93 |
| 901–1000 | 10 | any-prize | 1.83 |
| 1901–2000 | 2 | sena | 1.04 |
| 1901–2000 | 2 | any-prize | 1.35 |
| 1901–2000 | 10 | sena | 1.78 |
| 1901–2000 | 10 | any-prize | 2.12 |
| 2976–3075 | 2 | sena | 0.85 |
| 2976–3075 | 2 | any-prize | 0.89 |
| 2976–3075 | 10 | sena | 1.37 |
| 2976–3075 | 10 | any-prize | 1.17 |

## Measurements

Values are averages across contests after averaging the five seeds within each contest. Max hits is the best ticket's number of matching numbers. Observed any-prize is the fraction of contest/seed runs with at least one 4+ match; prize tickets is the mean count of tickets with 4+ matches. Coverage bounds give mathematical limits on the probability of at least one prize over all possible draws for the generated portfolio; they are **not observed hit rates**. Displayed bounds are rounded to six decimal places and can appear equal even when the unrounded bounds differ; the JSON retains full precision.

| Contests | Tickets | Objective | Method | Mean max hits | Observed any-prize | Prize tickets | Coverage bounds |
|---|---:|---|---|---:|---:|---:|---:|
| 901–1000 | 2 | sena | ensemble | 0.970 | 0.0000 | 0.0000 | 0.000870–0.000870 |
| 901–1000 | 2 | sena | uniform | 0.954 | 0.0000 | 0.0000 | 0.000870–0.000870 |
| 901–1000 | 2 | sena | uniformOptimized | 0.954 | 0.0000 | 0.0000 | 0.000870–0.000870 |
| 901–1000 | 2 | any-prize | ensemble | 1.012 | 0.0000 | 0.0000 | 0.000870–0.000870 |
| 901–1000 | 2 | any-prize | uniform | 0.954 | 0.0000 | 0.0000 | 0.000870–0.000870 |
| 901–1000 | 2 | any-prize | uniformOptimized | 0.996 | 0.0000 | 0.0000 | 0.000870–0.000870 |
| 901–1000 | 10 | sena | ensemble | 1.756 | 0.0000 | 0.0000 | 0.004344–0.004344 |
| 901–1000 | 10 | sena | uniform | 1.764 | 0.0020 | 0.0020 | 0.004344–0.004344 |
| 901–1000 | 10 | sena | uniformOptimized | 1.764 | 0.0020 | 0.0020 | 0.004344–0.004344 |
| 901–1000 | 10 | any-prize | ensemble | 1.870 | 0.0040 | 0.0040 | 0.004352–0.004352 |
| 901–1000 | 10 | any-prize | uniform | 1.764 | 0.0020 | 0.0020 | 0.004344–0.004344 |
| 901–1000 | 10 | any-prize | uniformOptimized | 1.834 | 0.0020 | 0.0020 | 0.004352–0.004352 |
| 1901–2000 | 2 | sena | ensemble | 0.924 | 0.0000 | 0.0000 | 0.000870–0.000870 |
| 1901–2000 | 2 | sena | uniform | 0.980 | 0.0000 | 0.0000 | 0.000870–0.000870 |
| 1901–2000 | 2 | sena | uniformOptimized | 0.980 | 0.0000 | 0.0000 | 0.000870–0.000870 |
| 1901–2000 | 2 | any-prize | ensemble | 0.932 | 0.0000 | 0.0000 | 0.000870–0.000870 |
| 1901–2000 | 2 | any-prize | uniform | 0.980 | 0.0000 | 0.0000 | 0.000870–0.000870 |
| 1901–2000 | 2 | any-prize | uniformOptimized | 0.948 | 0.0000 | 0.0000 | 0.000870–0.000870 |
| 1901–2000 | 10 | sena | ensemble | 1.720 | 0.0040 | 0.0040 | 0.004344–0.004345 |
| 1901–2000 | 10 | sena | uniform | 1.758 | 0.0020 | 0.0020 | 0.004344–0.004344 |
| 1901–2000 | 10 | sena | uniformOptimized | 1.758 | 0.0020 | 0.0020 | 0.004344–0.004344 |
| 1901–2000 | 10 | any-prize | ensemble | 1.846 | 0.0000 | 0.0000 | 0.004352–0.004352 |
| 1901–2000 | 10 | any-prize | uniform | 1.758 | 0.0020 | 0.0020 | 0.004344–0.004344 |
| 1901–2000 | 10 | any-prize | uniformOptimized | 1.844 | 0.0000 | 0.0000 | 0.004352–0.004352 |
| 2976–3075 | 2 | sena | ensemble | 0.956 | 0.0000 | 0.0000 | 0.000870–0.000870 |
| 2976–3075 | 2 | sena | uniform | 0.950 | 0.0020 | 0.0020 | 0.000870–0.000870 |
| 2976–3075 | 2 | sena | uniformOptimized | 0.950 | 0.0020 | 0.0020 | 0.000870–0.000870 |
| 2976–3075 | 2 | any-prize | ensemble | 0.964 | 0.0020 | 0.0020 | 0.000870–0.000870 |
| 2976–3075 | 2 | any-prize | uniform | 0.950 | 0.0020 | 0.0020 | 0.000870–0.000870 |
| 2976–3075 | 2 | any-prize | uniformOptimized | 0.952 | 0.0020 | 0.0020 | 0.000870–0.000870 |
| 2976–3075 | 10 | sena | ensemble | 1.786 | 0.0040 | 0.0040 | 0.004344–0.004344 |
| 2976–3075 | 10 | sena | uniform | 1.760 | 0.0080 | 0.0080 | 0.004344–0.004344 |
| 2976–3075 | 10 | sena | uniformOptimized | 1.760 | 0.0080 | 0.0080 | 0.004344–0.004344 |
| 2976–3075 | 10 | any-prize | ensemble | 1.822 | 0.0020 | 0.0020 | 0.004352–0.004352 |
| 2976–3075 | 10 | any-prize | uniform | 1.760 | 0.0080 | 0.0080 | 0.004344–0.004344 |
| 2976–3075 | 10 | any-prize | uniformOptimized | 1.870 | 0.0080 | 0.0080 | 0.004352–0.004352 |

## Paired max-hit differences

Ensemble minus baseline. Each interval is an unadjusted 95% normal interval calculated from contest-level paired differences after averaging seeds. Negative values favor the baseline. Multiple comparisons and overlapping training windows limit interpretation; these intervals are exploratory, not adjusted for selection or multiplicity.

| Contests | Tickets | Objective | Baseline | Difference | Normal interval |
|---|---:|---|---|---:|---|
| 901–1000 | 2 | sena | uniform | 0.016 | [-0.068, 0.100] |
| 901–1000 | 2 | sena | uniformOptimized | 0.016 | [-0.068, 0.100] |
| 901–1000 | 2 | any-prize | uniform | 0.058 | [-0.032, 0.148] |
| 901–1000 | 2 | any-prize | uniformOptimized | 0.016 | [-0.060, 0.092] |
| 901–1000 | 10 | sena | uniform | -0.008 | [-0.085, 0.069] |
| 901–1000 | 10 | sena | uniformOptimized | -0.008 | [-0.085, 0.069] |
| 901–1000 | 10 | any-prize | uniform | 0.106 | [0.031, 0.181] |
| 901–1000 | 10 | any-prize | uniformOptimized | 0.036 | [-0.031, 0.103] |
| 1901–2000 | 2 | sena | uniform | -0.056 | [-0.141, 0.029] |
| 1901–2000 | 2 | sena | uniformOptimized | -0.056 | [-0.141, 0.029] |
| 1901–2000 | 2 | any-prize | uniform | -0.048 | [-0.129, 0.033] |
| 1901–2000 | 2 | any-prize | uniformOptimized | -0.016 | [-0.110, 0.078] |
| 1901–2000 | 10 | sena | uniform | -0.038 | [-0.120, 0.044] |
| 1901–2000 | 10 | sena | uniformOptimized | -0.038 | [-0.120, 0.044] |
| 1901–2000 | 10 | any-prize | uniform | 0.088 | [0.017, 0.159] |
| 1901–2000 | 10 | any-prize | uniformOptimized | 0.002 | [-0.062, 0.066] |
| 2976–3075 | 2 | sena | uniform | 0.006 | [-0.084, 0.096] |
| 2976–3075 | 2 | sena | uniformOptimized | 0.006 | [-0.084, 0.096] |
| 2976–3075 | 2 | any-prize | uniform | 0.014 | [-0.077, 0.105] |
| 2976–3075 | 2 | any-prize | uniformOptimized | 0.012 | [-0.078, 0.102] |
| 2976–3075 | 10 | sena | uniform | 0.026 | [-0.053, 0.105] |
| 2976–3075 | 10 | sena | uniformOptimized | 0.026 | [-0.053, 0.105] |
| 2976–3075 | 10 | any-prize | uniform | 0.062 | [-0.012, 0.136] |
| 2976–3075 | 10 | any-prize | uniformOptimized | -0.048 | [-0.122, 0.026] |

## Interpretation and limitations

For 10 tickets with the any-prize objective, ensemble had higher mean max hits than raw uniform in all three periods, but its differences against uniformOptimized were small or negative and all three intervals included zero. Ensemble also trailed both controls in several cases, including 2-ticket runs in contests 1901–2000. These comparisons do not establish an advantage in actual prizes.

The dataset and historical periods have been inspected previously: these are not untouched holdouts. Repeated training windows overlap heavily, and seeds share each target draw; seeds are therefore not treated as independent contests. The small windows have very little power for rare prizes, especially quina and sena, so absence or presence of a few hits cannot establish an advantage. Coverage bounds describe portfolio overlap under a uniform-draw model, not evidence that historical patterns predict future outcomes. This protocol compares configurations on this snapshot and does not establish predictive skill or future returns. Underperforming cases remain in the tables. Six-number distinct tickets have identical jackpot coverage for a fixed budget; under the Sena objective the two uniform controls may coincide.
