# MLB GSIM → QSC

The first integration publishes complete daily game snapshots to the private MLB dashboard at `/dashboard/mlb`. It preserves blocked games, retained pregame references, source timestamps, and registered run identifiers. The current production report explicitly says winner discrimination and player prop distributions are not validated. This release therefore presents descriptive game probabilities and mean totals, without player props, betting recommendations, odds, or automatic selections.

## Data boundary

`scripts/mlb/export_qsc_results.py` reads only `daily_slate_report.json` from the private MLB runtime and constructs a strict allowlist. It does not read or copy model code, fitted assets, training data, raw trials, notes, source paths, or credentials. Never place source reports inside the website repository. The full snapshot replaces the displayed slate atomically: newer blocked games cannot inherit old projections.

The authoritative scheduled tasks were inspected on September 11, 2026. Prepare/poll use the private runtime's `scripts/windows/run_mlb_gsim_task.ps1`, dispatching to `daily_automation_guarded_v1_0_4`. This adapter is independent of that runtime; it does not change simulation or production registration.

## Contract and delivery

The contract is `src/schemas/mlbGsimResults.ts`. POST JSON to `/api/integrations/mlb-gsim/results` with `Authorization: Bearer <MLB_GSIM_INGESTION_SECRET>` and `X-QSC-Content-SHA256` containing the lowercase SHA-256 of the exact UTF-8 request body. Hash the bytes, not a reserialized object. The same bytes map to the same immutable database record. Future timestamps beyond five minutes are rejected. Old snapshots may be archived but never outrank newer generated timestamps for the same slate date.

The endpoint fails closed when its dedicated secret is absent. NFL and MLB credentials are independent. Payloads are capped at 256 KiB, including streamed requests without a content-length header. Unknown fields are rejected recursively. The dashboard verifies the server session even if optional middleware authentication is disabled.

## Export and activation

1. Run the standard-library exporter with `--slate <private daily_slate_report.json> --output <private output.json>` for a dry run.
2. Apply the additive migration `20260911230000_add_mlb_gsim_results` to the verified QSC database with the existing deployment process.
3. Set `MLB_GSIM_INGESTION_SECRET` in the website environment and the private delivery environment. Set `MLB_GSIM_QSC_ENDPOINT` only in the delivery environment, to the trusted production HTTPS endpoint. Do not put secrets in command arguments, source control, or reports.
4. Run the exporter with `--slate <path> --send`. Verify the same payload twice gives one stored record and an authenticated dashboard view.
5. Schedule `scripts/mlb/publish_latest.ps1` on the machine hosting the MLB runtime, using its existing Python executable. The script finds today's report using Eastern time and retries delivery safely. Configure the two environment variables for the scheduled-task identity. A 15-minute schedule is recommended; it is independent of the simulation task and does not start additional simulations.
6. Verify a later snapshot arrives, blocked/started games retain correct labels, and a delivery failure is observable in the task exit status. The next scheduled attempt retries the latest complete report. No new scheduled task is installed automatically by checking out this code.

Dashboard freshness is an explicit 90-minute display policy, not a model validation criterion. The visible dashboard refreshes every minute and when the tab becomes visible. History is selected by Eastern slate date. A missing date shows an empty state rather than falling back silently to yesterday.

## Checks

Run `python -m unittest discover -s scripts/mlb -p test_*.py`, `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`. The installed Next.js 15 supports the repository lint command; it emits a deprecation notice for Next.js 16.

Live deployment and scheduled delivery must be verified separately from local unit checks. Local tests mock storage; they do not establish that a production database migration has been applied.
