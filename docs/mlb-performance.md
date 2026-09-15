# MLB performance, selection rule v1

The authenticated `/dashboard/mlb/performance` page scores one forecast per game from immutable QSC ingestion receipts over the last 30 Eastern slate dates. It does not import the private simulator's historical aggregate metrics.

The first eligible receipt wins, ordered by database receipt time and ID. It must contain a valid PREGAME_MODEL projection, be received before the stated start, and be no more than 90 minutes after source generation. Later revisions and retained references cannot replace it. This produces a website-delivery cohort rather than a claim about every simulator run. Invalid snapshots and observed games with no eligible receipt are reported separately. Games absent from all snapshots are not counted as observed exclusions.

Finals come from the official MLB schedule API. Exact game identity, team names, start-time eligibility and explicit Final status are checked. Missing results, incomplete scores and tied finals remain ungraded. A changed start before receipt excludes the forecast. Brier, mean absolute total-runs error and signed total-runs bias are recomputed across all graded games; empty aggregates are null, not zero. Official corrections are reflected on subsequent refreshes.

The existing database receipts are the persistent forecast audit trail. No schema migration, credentials or new ingestion contract is required. Final scores are fetched server-side on page access, cached for 15 minutes, and the visible page refreshes each minute. This is automatic on-access reporting, not a background settlement ledger or alert service. The private simulator's scheduled closeout remains separate and unchanged.

There are no ROI, unit-profit, CLV or betting-edge claims. Those require a separate wager/price ledger. The small initial QSC cohort must not be combined with retrospective runs or described as validated predictive skill.

Validation: focused selection, grading, source-failure and authenticated-page tests, plus existing MLB integration tests and the production build.
