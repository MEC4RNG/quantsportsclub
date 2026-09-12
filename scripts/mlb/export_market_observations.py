"""Send only current, allowlisted market observations to the private QSC dashboard."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import sys
from urllib.request import Request, build_opener
from export_qsc_results import NoRedirect, serialize, timestamp

ENDPOINT = 'https://quantsportsclub.vercel.app/api/integrations/mlb-gsim/markets'
FIELDS = ('game_id', 'event_id', 'bookmaker', 'home_team', 'away_team', 'scheduled_start_utc',
          'book_updated_at', 'home_decimal', 'away_decimal')


def export_market(report, now):
    if (report['schema_version'] != 'qsc.mlb_odds_matches.v1' or report['visibility'] != 'PRIVATE_QSC' or
        report['decision_use'] != 'RESEARCH_ONLY_SETTLEMENT_RULES_NOT_VERIFIED' or
        report['posting_enabled'] is not False or report['betting_enabled'] is not False):
        raise ValueError('Unexpected market review policy')
    reviewed = timestamp(report['reviewed_at_utc'])
    if not 0 <= (now - reviewed).total_seconds() <= 300:
        raise ValueError('Market review is not current')
    rows = []
    source_age = (now - timestamp(report['model_generated_at_utc'])).total_seconds()
    fetched_age = (now - timestamp(report['odds_fetched_at_utc'])).total_seconds()
    for quote in report['eligible_quotes']:
        if quote['market'] != 'h2h':
            raise ValueError('Unsupported market')
        if (timestamp(quote['scheduled_start_utc']) > now and 0 <= source_age <= 5400 and
            0 <= fetched_age <= 1800 and 0 <= (now - timestamp(quote['book_updated_at'])).total_seconds() <= 1800):
            rows.append({key: quote[key] for key in FIELDS})
    if len(rows) > 400:
        raise ValueError('Too many market observations')
    return {'schema_version': 'qsc.mlb_market_observations.v1', 'sport': 'MLB', 'slate_date': report['slate_date'],
        'generated_at_utc': report['reviewed_at_utc'], 'odds_fetched_at_utc': report['odds_fetched_at_utc'],
        'model_payload_sha256': report['model_payload_sha256'], 'odds_snapshot_sha256': report['odds_snapshot_sha256'],
        'publication': {'visibility': 'PRIVATE_QSC', 'decision_use': 'RESEARCH_ONLY_SETTLEMENT_RULES_NOT_VERIFIED'},
        'quotes': rows}


def deliver_market(body, secret):
    if not secret or any(c.isspace() for c in secret) or len(body) > 256 * 1024:
        raise ValueError('Invalid service configuration or payload size')
    digest = hashlib.sha256(body).hexdigest()
    request = Request(ENDPOINT, data=body, method='POST', headers={'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + secret, 'X-QSC-Content-SHA256': digest})
    with build_opener(NoRedirect()).open(request, timeout=30) as response:
        receipt = json.loads(response.read(4096))
    if receipt.get('accepted') is not True or receipt.get('payloadHash') != digest:
        raise ValueError('Market receipt does not match bytes')
    return {'accepted': True, 'payloadHash': digest}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', type=Path, required=True)
    parser.add_argument('--status', type=Path, required=True)
    parser.add_argument('--send', action='store_true')
    args = parser.parse_args()
    now = datetime.now(timezone.utc)
    try:
        raw = args.report.read_bytes()
        if len(raw) > 1024 * 1024:
            raise ValueError('Oversized review')
        payload = export_market(json.loads(raw), now)
        body = serialize(payload)
        receipt = deliver_market(body, os.environ.get('MLB_GSIM_INGESTION_SECRET', '')) if args.send else {'exported': True}
        result = {**receipt, 'status': 'SUCCESS' if args.send else 'EXPORT_ONLY', 'checked_at_utc': now.isoformat(),
                  'observations': len(payload['quotes']), 'slate_date': payload['slate_date']}
        code = 0
    except (ValueError, KeyError, TypeError, OSError):
        result = {'status': 'FAILED', 'checked_at_utc': now.isoformat(), 'detail': 'Market review, service access or receipt requires attention.'}
        code = 1
    args.status.parent.mkdir(parents=True, exist_ok=True)
    temp = args.status.with_suffix('.tmp')
    temp.write_text(json.dumps(result, indent=2), encoding='utf-8')
    temp.replace(args.status)
    print(json.dumps(result))
    return code


if __name__ == '__main__':
    sys.exit(main())
