import csv
import io
import unittest
from unittest.mock import patch

import update_yield_decomposition as dkw


def fixture(rows):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Notes: "daily observations, monthly updates"'])
    writer.writerow(["date", *dkw.FIELDS.values(), "tips.liq.prem.10"])
    writer.writerows(rows)
    return output.getvalue()


class DecompositionTests(unittest.TestCase):
    def test_preamble_mapping_negative_values_and_residual(self):
        data = dkw.parse_dkw_csv(fixture([
            ["2026-08-31", 1.1527, 2.8007, .7812, .1085, 4.8261, 4.8431, .4116],
            ["2026-08-28", -.5, 2, -.2, .1, 1.45, 1.4, .9],
        ]))
        self.assertEqual(data["dates"], ["2026-08-28", "2026-08-31"])
        series = data["series"]
        self.assertEqual(series["expectedReal"][0], -.5)
        self.assertAlmostEqual(series["realTermPremium"][-1] + series["inflationRiskPremium"][-1], .8897)
        self.assertAlmostEqual((series["marketYield"][-1] - series["modelYield"][-1]) * 100, -1.7)
        self.assertEqual(len(series), 6, "TIPS liquidity must not become another nominal-yield component")

    def test_missing_values_are_not_zero_or_carried(self):
        data = dkw.parse_dkw_csv(fixture([
            ["2026-08-27", 1, 2, .2, .1, 3.4, 3.3, 0],
            ["2026-08-28", "NA", 2, .2, .1, 3.4, 3.3, 0],
        ]))
        self.assertEqual(data["updatedAt"], "2026-08-27")
        self.assertEqual(len(data["dates"]), 1)

    def test_invalid_data_rejected(self):
        valid = ["2026-08-31", 1, 2, .2, .1, 3.4, 3.3, 0]
        cases = ["<html>error</html>", fixture([]), fixture([valid, valid]),
                 fixture([["2026-08-31", 1, 2, .2, .1, 3.4, 4, 0]]),
                 fixture([["2026-08-31", "nan", 2, .2, .1, 3.4, 3.3, 0]])]
        for text in cases:
            with self.subTest(text=text[:30]), self.assertRaises(ValueError):
                dkw.parse_dkw_csv(text)

    def test_network_failure_preserves_cache_without_redating(self):
        cached = {"dates": ["2026-08-31"], "updatedAt": "2026-08-31"}
        with patch.object(dkw, "urlopen", side_effect=OSError("offline")):
            self.assertIs(dkw.fetch_yield_decomposition(cached), cached)
            with self.assertRaises(OSError):
                dkw.fetch_yield_decomposition()

    def test_truncated_download_preserves_cache(self):
        cached = {"dates": ["2026-08-31"], "updatedAt": "2026-08-31"}
        short = fixture([["2026-08-31", 1, 2, .2, .1, 3.4, 3.3, 0]])
        with patch.object(dkw, "urlopen", return_value=io.BytesIO(short.encode())):
            self.assertIs(dkw.fetch_yield_decomposition(cached), cached)


if __name__ == "__main__":
    unittest.main()
