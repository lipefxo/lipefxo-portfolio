# Loteria Lab operations

Site: `appgprj_6add4123f81c81918da5f5018ea9aa9b` at https://loteria-lab-lipefxo.lipefxo.chatgpt.site. Preserve its owner-private audience. The portfolio repository and the Sites source repository are separate; deploy the app directory through the Sites source workflow, retaining this project ID.

## Daily refresh and monitoring

Use a linked Sites cloud task at **22:30 America/Sao_Paulo daily** for ingestion and a separate read-only health check at **08:00 America/Sao_Paulo daily**. Keep schedule IDs in the release record and reuse existing linked tasks. The Wrangler configuration intentionally has no cron, so these tasks are the single schedule owner. The `scheduled` Worker handler remains available for a future direct Cloudflare deployment, but is not an active schedule by itself.

Each task obtains this exact Site with `get_site`. The existing `siwc_bypass_bearer_token` is supported service access for this private Site; send it only to the returned Site origin as `OAI-Sites-Authorization: Bearer <token>`. Never print or persist the token, follow redirects carrying it, rotate it for a check, or change Site access. A fresh task can obtain the credential independently of the authoring conversation. If access is unavailable, report an alert instead of treating a login response as success.

The daily writer calls `GET /api/draws?refresh=1`. Require a successful HTTP response and `freshness.status === "current"`. Then call `GET /api/health` to independently read back D1. Require HTTP 200 and `status === "current"`. The morning monitor only calls `/api/health`. On failure, include the timestamp, HTTP status, health status and included/latest contest if available; inspect `/api/draws?diagnostics=1` for the latest attempt. Return an actionable failure report through the scheduled task. No email, Slack integration, or separate external uptime service is configured.

`/api/health` returns 503 when D1 is unavailable/corrupt/unseeded, the latest attempt failed, the known official contest differs, or the official check is older than **30 hours**. It checks the consultation time, not the last draw's age, so days without draws do not create false stale alarms. The daily refresh checks recent corrections and preserves the last complete valid dataset on errors. A correction requiring full reimport remains an alert for human review; do not overwrite it automatically.

For local execution against the hosted Site, use `node scripts/check-hosted-data.mjs`. Supply one newline-terminated JSON object on stdin with `url` equal to the Site origin, the service `token`, and `refresh: true` for ingestion or `false` for monitoring. Interactive input is hidden. It prints only the compact health result and exits nonzero on errors. Do not put credentials in shell arguments, environment files, source, reports or task prompts.

Creation of a schedule proves configuration only. The release check exercises the same authenticated HTTP writer and health readback immediately; the first actual cloud invocation must subsequently be observed in its task history.

## Release and recovery

1. Run `npm test`, `npm run benchmark:verify`, `npm run typecheck`, `npm run lint`, and `npm run build`. Run the isolated Playwright suite against this build after applying pending local D1 migrations. Root portfolio checks run independently.
2. Commit and push the GitHub branch; require both CI jobs. Open a PR against `master` without merging automatically.
3. Open the existing Site through its source helper, sync the reviewed app files, build and publish with Sites. Preserve the private access policy. Sites applies committed Drizzle migrations before uploading the Worker.
4. Exercise authenticated refresh and health readback. Record the Site version, source commit, included contest, check time, linked task IDs, and any verification limits.
5. A rollback republishes a known-good saved Site version. Database migrations are forward-only: do not delete revision history or undo an applied migration blindly. Data failures preserve the prior valid dataset. Inspect ingestion diagnostics before retrying; the API throttles refreshes per isolate for one minute.

## Benchmark reproduction

`npm run benchmark:verify` recomputes the frozen report and checks every non-runtime JSON value. The v1 protocol pins the bundled snapshot and core source hashes. Keep that historical fixture unchanged to reproduce v1; create a new protocol version for new datasets or strategy changes. Live D1 updates do not alter the fixture.

Read [the full report](benchmarks/collection-v1.report.md) before drawing conclusions. Three historical periods, two budgets, two objectives and five seeds measure exploratory performance; the data are not untouched holdouts. Unadjusted normal intervals and rare observed prizes do not establish predictive skill.
