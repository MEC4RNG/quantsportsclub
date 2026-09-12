# MLB market research integration

The authenticated `/dashboard/mlb/markets` page compares model probabilities with observed moneyline prices. It selects the first eligible **website receipt** per game and sportsbook over the last 30 Eastern slate dates. Existing local research is not backfilled as website-verified pregame evidence.

`POST /api/integrations/mlb-gsim/markets` uses the dedicated MLB service bearer credential, exact UTF-8 byte SHA-256, a 256 KiB streamed limit and a strict allowlisted contract. Every request references an existing immutable MLB model payload by hash. Game IDs, teams and starts must match; models and prices must be fresh at server receipt and games must remain pregame. Duplicate and ambiguous identities are rejected. The endpoint derives model probabilities from stored model output rather than accepting new probabilities from the market uploader.

Migration `20260912230000_mlb_market_observations` adds only the immutable `MlbMarketSnapshot` table, its indexes and its model-payload foreign key. No existing rows are rewritten. Apply migrations before making the new page available in production.

The local uploader is `scripts/mlb/export_market_observations.py`. It accepts only the current private matching report, drops non-allowlisted fields, checks a matching delivery receipt, and cannot send to arbitrary endpoints. Deployment uses the existing locally encrypted MLB service credential; the Odds API key is never sent to the website.

Market probabilities use proportional normalization of inverse decimal prices. Brier scores use explicit official MLB finals with matching identities and starts. Each sportsbook is summarized separately; game/sportsbook pairs are not independent games. The report describes historical observations, not current offers, ROI, CLV, wager settlement, or validated betting edge. Current API quotes do not supply all jurisdiction- and ticket-specific settlement conditions.

Verification: focused MLB web contracts, Python delivery/export tests, type checking, and production build. CI now runs both Python contracts and all `mlb*.test.ts[x]` web tests without production credentials. Live pregame receipt coverage depends on future eligible deliveries and cannot be manufactured after games start.
