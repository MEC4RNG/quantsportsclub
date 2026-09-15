import copy
from datetime import datetime, timezone
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from export_qsc_results import export_slate
from test_export_qsc_results import source
from generate_content_drafts import build_package, write_package, main


class ContentTests(unittest.TestCase):
    def package(self, payload=None, hour=16):
        return build_package(payload or export_slate(source()), datetime(2026, 9, 11, hour, 30, tzinfo=timezone.utc), 'a' * 64)

    def test_fresh_output_stays_private_and_uses_only_model_values(self):
        package = self.package()
        self.assertEqual(len(package['posts']), 2)
        self.assertIn('60.0%', package['posts'][1]['text'])
        self.assertFalse(package['posting_enabled'])
        self.assertFalse(package['public_release_authorized'])
        self.assertNotIn('SECRET', json.dumps(package))
        self.assertNotIn('PLAY //', json.dumps(package))

    def test_stale_source_withholds_copy(self):
        package = self.package(hour=18)
        self.assertIn('SOURCE_STALE', package['blockers'])
        self.assertEqual(package['posts'], [])

    def test_future_source_withholds_copy(self):
        self.assertIn('SOURCE_TIMESTAMP_IN_FUTURE', self.package(hour=15)['blockers'])

    def test_started_game_is_reference_even_if_payload_was_pregame(self):
        payload = export_slate(source())
        payload['games'][0]['scheduled_start_utc'] = '2026-09-11T16:15:00Z'
        package = self.package(payload)
        self.assertEqual(package['games'][0]['status_at_review'], 'PREGAME_REFERENCE')
        self.assertEqual(package['posts'], [])

    def test_blocked_game_is_not_watch_or_play(self):
        data = source()
        data['games'][0]['state'] = 'BLOCKED'
        package = self.package(export_slate(data))
        self.assertEqual(package['games'][0]['status_at_review'], 'UNAVAILABLE')
        self.assertEqual(package['posts'], [])

    def test_unexpected_publication_policy_fails_closed(self):
        payload = export_slate(source())
        payload['publication']['visibility'] = 'PUBLIC'
        with self.assertRaises(ValueError): self.package(payload)

    def test_oversized_copy_is_blocked_not_truncated(self):
        payload = export_slate(source())
        payload['games'][0]['away_team'] = '界' * 80
        payload['games'][0]['home_team'] = '界' * 80
        post = self.package(payload)['posts'][1]
        self.assertEqual(post['copy_status'], 'BLOCKED_LENGTH')
        self.assertIn('界' * 80, post['text'])

    def test_mismatched_acknowledgement_cannot_create_drafts(self):
        with tempfile.TemporaryDirectory() as directory:
            source_file = Path(directory) / 'payload.json'
            source_file.write_text(json.dumps(export_slate(source())))
            output = Path(directory) / 'drafts'
            with patch('sys.argv', ['draft', '--payload', str(source_file), '--acknowledged-hash', 'wrong', '--output', str(output)]):
                self.assertEqual(main(), 1)
            self.assertFalse(output.exists())

    def test_archive_and_latest_are_written_without_publication(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            first = self.package()
            write_package(first, output)
            blocked = self.package(hour=18)
            write_package(blocked, output)
            self.assertEqual(len(list((output / 'archive').glob('*.json'))), 2)
            self.assertEqual(json.loads((output / 'latest.json').read_text())['posts'], [])
            self.assertIn('Drafts withheld', (output / 'latest.md').read_text())


if __name__ == '__main__':
    unittest.main()
