import copy
import unittest
from export_qsc_results import export_slate, serialize, deliver


def source():
    return {"date": "2026-09-11", "generated_at_utc": "2026-09-11T12:00:00-04:00", "private_path": "SECRET",
        "games": [{"game_id": "123", "away_team": "Away", "home_team": "Home",
            "scheduled_start_utc": "2026-09-11T23:00:00Z", "state": "REGISTERED", "mlb_state": "Scheduled",
            "run_id": "production_1", "home_win_probability": .6, "away_win_probability": .4,
            "game_total_mean": 8.2, "note": "SECRET", "model_parameters": {"SECRET": True}}]}


class ExportTests(unittest.TestCase):
    def test_allowlist_and_timezone(self):
        result = export_slate(source())
        self.assertNotIn(b"SECRET", serialize(result))
        self.assertEqual(result["generated_at_utc"], "2026-09-11T16:00:00+00:00")
        self.assertEqual(result["games"][0]["context"], "PREGAME_MODEL")

    def test_blocked_does_not_reuse_probabilities(self):
        data = source()
        data["games"][0]["state"] = "BLOCKED"
        self.assertIsNone(export_slate(data)["games"][0]["projection"])

    def test_retained_and_started_are_references(self):
        for changes in ({"pregame_reference": True, "state": "SKIPPED", "run_id": None}, {"mlb_state": "Final"},
                        {"scheduled_start_utc": "2026-09-11T14:00:00Z"}):
            data = source()
            data["games"][0].update(changes)
            self.assertEqual(export_slate(data)["games"][0]["context"], "PREGAME_REFERENCE")

    def test_invalid_values_rejected(self):
        for value in (float("nan"), float("inf"), True, -.1, 1.1):
            data = source()
            data["games"][0]["home_win_probability"] = value
            with self.assertRaises(ValueError): export_slate(data)

    def test_duplicate_id_rejected(self):
        data = source()
        data["games"].append(copy.deepcopy(data["games"][0]))
        with self.assertRaises(ValueError): export_slate(data)

    def test_unsafe_endpoint_rejected_without_network(self):
        for url in ("http://example.com/api/integrations/mlb-gsim/results", "https://user:secret@example.com/api/integrations/mlb-gsim/results",
                    "https://example.com/other", "https://example.com/api/integrations/mlb-gsim/results?secret=x"):
            with self.assertRaises(ValueError): deliver(b"{}", url, "secret")


if __name__ == "__main__": unittest.main()
