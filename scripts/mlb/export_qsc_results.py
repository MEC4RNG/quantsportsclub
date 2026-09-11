"""Export only the approved daily-slate fields; never read model/trial files.

Standard library only. Source reports remain in the private MLB checkout.
QSC consumes a whole-slate snapshot, including blocked and retained games.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
import sys
import time
from datetime import date, datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener

CONTRACT = "qsc.mlb_gsim.results.v1"


def timestamp(value):
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Timestamp must include timezone")
    return parsed.astimezone(timezone.utc)


def export_slate(source: dict) -> dict:
    slate_date = date.fromisoformat(source["date"]).isoformat()
    generated = timestamp(source["generated_at_utc"])
    rows = source["games"]
    if not isinstance(rows, list) or len(rows) > 40:
        raise ValueError("Invalid game count")
    games = []
    ids = set()
    for row in rows:
        gid = str(row["game_id"])
        if not re.fullmatch(r"\d{1,12}", gid) or gid in ids:
            raise ValueError("Invalid or duplicate game ID")
        ids.add(gid)
        start = timestamp(row["scheduled_start_utc"])
        state = row["state"]
        if not isinstance(state, str) or not re.fullmatch(r"[A-Z_]{1,40}", state):
            raise ValueError("Invalid source state")
        run_id = row.get("run_id")
        if run_id is not None and not re.fullmatch(r"production_\d+", str(run_id)):
            raise ValueError("Invalid run identifier")
        pregame = row["mlb_state"] in {"Scheduled", "Pre-Game", "Warmup"} and start > generated
        retained = row.get("pregame_reference") is True
        eligible = state in {"READY", "REGISTERED"} and run_id is not None
        projection = None
        context = "UNAVAILABLE"
        if eligible or retained:
            keys = ("home_win_probability", "away_win_probability", "game_total_mean")
            if all(row.get(key) is not None for key in keys):
                values = [row[key] for key in keys]
                if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in values):
                    raise ValueError("Invalid projection")
                home, away, total = values
                if not 0 <= home <= 1 or not 0 <= away <= 1 or abs(home + away - 1) >= 0.00001 or not 0 <= total <= 100:
                    raise ValueError("Projection outside contract bounds")
                projection = dict(zip(keys, values))
                context = "PREGAME_MODEL" if pregame and eligible and not retained else "PREGAME_REFERENCE"
        game = {
            "game_id": gid, "away_team": row["away_team"], "home_team": row["home_team"],
            "scheduled_start_utc": start.isoformat(), "source_state": state,
            "mlb_state": row["mlb_state"], "context": context,
            "run_id": run_id, "projection": projection,
        }
        for key in ("away_team", "home_team", "mlb_state"):
            if not isinstance(game[key], str) or not 1 <= len(game[key]) <= 80:
                raise ValueError("Invalid game label")
        games.append(game)
    return {
        "schema_version": CONTRACT, "sport": "MLB", "slate_date": slate_date,
        "generated_at_utc": generated.isoformat(),
        "publication": {"visibility": "PRIVATE_QSC",
            "decision_use": "DESCRIPTIVE_MODEL_OUTPUT_NOT_VALIDATED_EDGE",
            "model_parameters_included": False},
        "games": sorted(games, key=lambda g: (g["scheduled_start_utc"], g["game_id"])),
    }


def serialize(payload):
    return json.dumps(payload, ensure_ascii=True, allow_nan=False, separators=(",", ":")).encode("utf-8")


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def deliver(body: bytes, endpoint: str, secret: str):
    url = urlparse(endpoint)
    if (url.scheme != "https" or not url.hostname or url.username or url.password or
        url.query or url.fragment or url.path != "/api/integrations/mlb-gsim/results"):
        raise ValueError("A trusted HTTPS MLB ingestion endpoint is required")
    if not secret or any(c.isspace() for c in secret):
        raise ValueError("Missing or invalid ingestion secret")
    digest = hashlib.sha256(body).hexdigest()
    opener = build_opener(NoRedirect())
    for attempt in range(3):
        req = Request(endpoint, data=body, method="POST", headers={
            "Authorization": f"Bearer {secret}", "Content-Type": "application/json",
            "X-QSC-Content-SHA256": digest})
        try:
            with opener.open(req, timeout=30) as response:
                receipt = json.loads(response.read(4096))
                if receipt.get("accepted") is not True or receipt.get("payloadHash") != digest:
                    raise ValueError("Delivery receipt did not match payload")
                return {"accepted": True, "payloadHash": digest}
        except HTTPError as exc:
            if exc.code not in {429, 500, 502, 503, 504} or attempt == 2:
                raise ValueError(f"Delivery rejected (HTTP {exc.code})") from None
        except (URLError, TimeoutError):
            if attempt == 2:
                raise ValueError("Delivery unavailable after retries") from None
        time.sleep(2 ** attempt)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--slate", required=True, type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--send", action="store_true")
    args = parser.parse_args()
    try:
        # A producer can be writing concurrently. Retry reads; never publish partial JSON.
        for attempt in range(3):
            try:
                raw = args.slate.read_bytes()
                if len(raw) > 4 * 1024 * 1024:
                    raise ValueError("Source report too large")
                source = json.loads(raw)
                break
            except (json.JSONDecodeError, OSError):
                if attempt == 2:
                    raise ValueError("Source report could not be read consistently") from None
                time.sleep(1)
        payload = export_slate(source)
        body = serialize(payload)
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_bytes(body)
        if args.send:
            result = deliver(body, os.environ.get("MLB_GSIM_QSC_ENDPOINT", ""),
                os.environ.get("MLB_GSIM_INGESTION_SECRET", ""))
        else:
            result = {"exported": True, "games": len(payload["games"]), "payloadHash": hashlib.sha256(body).hexdigest()}
        print(json.dumps(result))
    except (ValueError, KeyError, TypeError, OSError):
        # Never echo source records, endpoint credentials, or response bodies.
        print("MLB export/delivery failed; check source contract and service configuration.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
