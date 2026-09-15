from datetime import datetime, timezone
import json
import unittest
from unittest.mock import patch, MagicMock
from export_market_observations import export_market, deliver_market


class MarketExportTests(unittest.TestCase):
    def report(self):
        return {'schema_version': 'qsc.mlb_odds_matches.v1', 'visibility': 'PRIVATE_QSC',
            'decision_use': 'RESEARCH_ONLY_SETTLEMENT_RULES_NOT_VERIFIED', 'posting_enabled': False, 'betting_enabled': False,
            'reviewed_at_utc': '2026-09-12T16:14:00Z', 'model_generated_at_utc': '2026-09-12T16:00:00Z',
            'odds_fetched_at_utc': '2026-09-12T16:10:00Z', 'slate_date': '2026-09-12',
            'model_payload_sha256': 'a'*64, 'odds_snapshot_sha256': 'b'*64,
            'eligible_quotes': [{'game_id': '1', 'event_id': 'event', 'bookmaker': 'book', 'home_team': 'Home', 'away_team': 'Away',
                'scheduled_start_utc': '2026-09-12T17:00:00Z', 'book_updated_at': '2026-09-12T16:09:00Z',
                'home_decimal': 1.8, 'away_decimal': 2.1, 'market': 'h2h', 'model_home_probability': .6,
                'run_id': 'production_1', 'private_path': 'must-not-export'}]}

    def test_allowlist_does_not_export_private_or_duplicate_model_fields(self):
        payload = export_market(self.report(), datetime(2026,9,12,16,15,tzinfo=timezone.utc))
        self.assertEqual(len(payload['quotes']), 1)
        for field in ('private_path', 'model_home_probability', 'run_id'):
            self.assertNotIn(field, payload['quotes'][0])

    def test_stale_review_fails_and_started_prices_are_withheld(self):
        report = self.report()
        with self.assertRaises(ValueError):
            export_market(report, datetime(2026,9,12,17,tzinfo=timezone.utc))
        report['eligible_quotes'][0]['scheduled_start_utc'] = '2026-09-12T16:15:00Z'
        self.assertEqual(export_market(report, datetime(2026,9,12,16,15,tzinfo=timezone.utc))['quotes'], [])

    def test_expired_source_and_wrong_policy(self):
        report = self.report(); report['model_generated_at_utc'] = '2026-09-12T12:00:00Z'
        self.assertEqual(export_market(report, datetime(2026,9,12,16,15,tzinfo=timezone.utc))['quotes'], [])
        report['posting_enabled'] = True
        with self.assertRaises(ValueError):
            export_market(report, datetime(2026,9,12,16,15,tzinfo=timezone.utc))

    def test_mismatched_acknowledgement_fails(self):
        response = MagicMock(); response.__enter__.return_value = response
        response.read.return_value = json.dumps({'accepted': True, 'payloadHash': 'wrong'}).encode()
        with patch('export_market_observations.build_opener') as opener:
            opener.return_value.open.return_value = response
            with self.assertRaises(ValueError):
                deliver_market(b'{}', 'fixture-secret')


if __name__ == '__main__':
    unittest.main()
