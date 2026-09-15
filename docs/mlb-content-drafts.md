# Private MLB content drafts

`scripts/mlb/generate_content_drafts.py` creates review copy from the exact bytes acknowledged by QSC ingestion. Pass the payload path, acknowledged SHA-256 and output directory. A mismatched acknowledgement produces no drafts.

The package contains a daily coverage anchor and chronological game projections. Stale or future source snapshots and games already underway are withheld. Unavailable projections do not become betting picks. Every package remains private, includes its source hash and original generation time, and disables posting. Copy exceeding the conservative length limit is blocked rather than silently truncated.

The installed delivery workflow generates this package only after successful ingestion. This repository contains the generator and its tests; credentials, generated packages and local scheduler state do not belong in source control. Public release of private model data and posting require separate authorization.

Run the standard-library tests with `python -m unittest discover -s scripts/mlb -p 'test_*.py' -v`. CI runs these checks independently of the web build, with no production credentials or provider API requests.
