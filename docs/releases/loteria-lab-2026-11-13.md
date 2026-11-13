# Loteria Lab release — 2026-11-13

The independent app is live at https://loteria-lab-lipefxo.lipefxo.chatgpt.site with its existing owner-private access preserved. The portfolio is a separate deployment.

## Provenance

- GitHub implementation commit: `d80fab9eed6e7ad3c55ad5616e5a8db974b581eb`.
- Pull request: https://github.com/lipefxo/lipefxo-portfolio/pull/43 (not merged by this release).
- Sites version: **6**.
- Sites source commit: `8501e79b59b6178e3fddec76a46adb5a879756fe`.
- Site project: `appgprj_6add4123f81c81918da5f5018ea9aa9b`.
- Deployment: `appgdep_6af705a67bf0819182d8897e14bcbc5c`, succeeded at `2026-11-13T12:42:34.591407+00:00`.
- Saved version: `appgprj_6add4123f81c81918da5f5018ea9aa9b~appgver_e1fa0dda0f18819193be2fa807d5de2d`.

## Hosted verification

The published authenticated refresh returned current status. An independent `/api/health` request read back the validated D1 revision with `lastIncludedContest: 3085`, `latestAvailableContest: 3085`, and `checkedAt: 2026-11-13T12:43:04.280Z`. The same supported service access is used by the linked tasks. No credentials are stored in this repository.

The daily tasks were saved enabled in `America/Sao_Paulo`:

| Task | Time | ID | First scheduled run |
|---|---|---|---|
| Official refresh and verification | 22:30 daily | `Automation_ee2a973b81a88191893f513c9316ed61` | 2026-11-13 22:30 -03:00 |
| Read-only health monitor | 08:00 daily | `Automation_7b26a3af1f448191827e59281c333d44` | 2026-11-14 08:00 -03:00 |

Both tasks report operational failures through their task results. Configuration and the authenticated writer/readback were verified immediately; the first actual scheduled invocation and notification delivery were **not observed during this release**. There is no separate email or external uptime integration. The Wrangler configuration has no competing cron.

## Evidence and validation

The [frozen benchmark report](../../apps/loteria-lab/benchmarks/collection-v1.report.md) covers three historical windows, two budgets, two objectives and five seeds. Every non-runtime value reproduced. The ensemble does not show a clear advantage over uniform selection with the same coverage optimizer; the historical data, unadjusted intervals and rare-prize sample do not support a predictive claim.

Local validation passed: 72 Node tests (including focused final checker validation), 5 Python importer tests, 5 isolated Playwright tests, benchmark reproduction, app typecheck/lint/build, and root portfolio lint/build. CI independently runs these release checks; its run is https://github.com/lipefxo/lipefxo-portfolio/actions/runs/43427396372.

The journal remains browser-local. Its timestamps do not independently establish pre-draw registration. See [operations and recovery](../../apps/loteria-lab/OPERATIONS.md) for monitoring and rollback instructions.
