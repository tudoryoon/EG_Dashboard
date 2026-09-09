import copy
import unittest
from unittest.mock import patch

import msci_acwi_ntr as acwi


class AcwiTests(unittest.TestCase):
    def observation(self, day, close=101):
        return {"rowDateTimestamp": day + "T00:00:00Z", "last_openRaw": "100",
                "last_maxRaw": "102", "last_minRaw": "99", "last_closeRaw": str(close)}

    def test_exact_identity_and_no_synthetic_volume(self):
        result = acwi.parse_history({"data": [self.observation("2026-09-08")]}, "2026-09-08")
        self.assertEqual(result["symbol"], "MIWD00000NUS")
        self.assertEqual(result["returnType"], "Net Total Return")
        self.assertEqual(result["currency"], "USD")
        self.assertNotIn("volume", result)
        self.assertNotEqual(result["symbol"], "ACWI")

    def test_sorted_completed_weekdays_only(self):
        rows = [self.observation(d) for d in ["2026-09-09", "2026-09-08", "2026-09-06", "2026-09-07"]]
        self.assertEqual(acwi.parse_history({"data": rows}, "2026-09-08")["dates"], ["2026-09-07", "2026-09-08"])

    def test_reject_invalid_ohlc(self):
        for close in [float("nan"), 103, -1]:
            with self.assertRaises(ValueError):
                acwi.parse_history({"data": [self.observation("2026-09-08", close)]}, "2026-09-08")

    def test_outage_preserves_existing(self):
        old = {"dates": ["2026-09-08"], "values": [639.09]}
        with patch.object(acwi.requests, "get", side_effect=RuntimeError("offline")):
            self.assertIs(acwi.fetch_item(old), old)
            with self.assertRaises(RuntimeError):
                acwi.fetch_item()

    def test_append_does_not_rerank_stocks(self):
        import numpy as np
        import pandas as pd
        dates = pd.bdate_range("2025-01-01", periods=300).strftime("%Y-%m-%d").tolist()
        values = np.linspace(100, 150, len(dates)).tolist()
        item = {"dates": dates, **{key: values for key in ("opens", "highs", "lows", "closes")}}
        payload = {"updatedAt": dates[-1], "historyDates": dates,
                   "rows": [{"ticker": "ACWI", "rsRatingAll": 67}],
                   "histories": {"ACWI": {"price": values, "rsRatingAll": [67] * len(dates)}}}
        old = copy.deepcopy(payload)
        acwi.append_rs_index(payload, item)
        self.assertEqual(payload["rows"][0], old["rows"][0])
        self.assertEqual(payload["histories"]["ACWI"], old["histories"]["ACWI"])
        new = payload["rows"][-1]
        self.assertIsNone(new["marketCap"])
        self.assertIsNone(new["sharesOutstanding"])
        self.assertEqual(new["rsRatingAll"], 50)
        self.assertTrue(all(v is None for v in payload["histories"][acwi.TICKER]["volume"]))
        acwi.append_rs_index(payload, item)
        self.assertEqual(len(payload["rows"]), 2)


if __name__ == "__main__":
    unittest.main()
