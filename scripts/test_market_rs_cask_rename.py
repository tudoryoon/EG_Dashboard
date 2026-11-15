import unittest
from concurrent.futures import ThreadPoolExecutor
from threading import Lock
from time import sleep
from unittest.mock import Mock, patch

import pandas as pd

import update_market_rs as rs


class CaskRenameHistoryTests(unittest.TestCase):
    def frames(self):
        dates = pd.date_range("2026-11-09", "2026-11-12")
        frames = [pd.DataFrame({"CASK": [float("nan")] * len(dates)}, index=dates) for _ in range(6)]
        frames[0].at[dates[0], "CASK"] = 17.76  # Yahoo carried Nov 6 into Nov 9.
        frames[0].at[dates[-1], "CASK"] = 17.0
        return dates, frames

    def responses(self, *, official_close=18.29, yahoo_currency="USD"):
        dates = pd.date_range("2026-11-09", "2026-11-12")
        opens = [17.82, 18.23, 18.15, 17.70]
        highs = [18.795, 18.46, 18.16, 17.75]
        lows = [17.63, 18.06, 17.33, 16.96]
        closes = [18.55, 18.29, 17.66, 17.0]
        volumes = [250391, 185171, 129612, 117347]
        official = Mock()
        official.json.return_value = {"status": {"rCode": 200}, "data": {"tradesTable": {"rows": [
            {"date": day.strftime("%m/%d/%Y"), "open": f"${opens[i]:.2f}",
             "high": f"${highs[i]}", "low": f"${lows[i]:.2f}",
             "close": f"${official_close if i == 1 else closes[i]:.2f}",
             "volume": f"{volumes[i]:,}"}
            for i, day in enumerate(dates)
        ]}}}
        yahoo = Mock()
        yahoo.json.return_value = {"chart": {"result": [{
            "meta": {"symbol": "MGPI", "instrumentType": "EQUITY", "currency": yahoo_currency,
                     "exchangeTimezoneName": "America/New_York"},
            "timestamp": [int(pd.Timestamp(day, tz="America/New_York").timestamp())
                          for day in dates.strftime("%Y-%m-%d")],
            "indicators": {"quote": [{"open": opens, "high": highs, "low": lows,
                                       "close": closes, "volume": volumes}],
                           "adjclose": [{"adjclose": [18.42, 18.16, 17.54, 16.88]}]},
        }]}}
        return official, yahoo

    @patch.object(rs.yf, "download")
    def test_parallel_batches_serialize_yfinance_shared_results(self, download):
        gate = Lock()
        active = 0
        peak = 0

        def fake_download(**_kwargs):
            nonlocal active, peak
            with gate:
                active += 1
                peak = max(peak, active)
            sleep(0.01)
            with gate:
                active -= 1
            return pd.DataFrame()

        download.side_effect = fake_download
        with ThreadPoolExecutor(max_workers=4) as workers:
            list(workers.map(lambda _: rs.serialized_yfinance_download(tickers="CASK"), range(8)))
        self.assertEqual(peak, 1)
        self.assertEqual(download.call_count, 8)

    @patch.object(rs.requests, "get")
    def test_restores_real_prior_symbol_sessions(self, get):
        dates, frames = self.frames()
        get.side_effect = self.responses()
        rs.repair_cask_rename_history(*frames)
        self.assertEqual([frames[0].at[d, "CASK"] for d in dates], [18.55, 18.29, 17.66, 17.0])
        self.assertEqual(frames[1].at[dates[1], "CASK"], 18.16)
        self.assertEqual(frames[5].at[dates[1], "CASK"], 185171)
        self.assertEqual(get.call_count, 2)

    @patch.object(rs.requests, "get")
    def test_rejects_official_alias_disagreement_without_partial_write(self, get):
        dates, frames = self.frames()
        get.side_effect = self.responses(official_close=18.40)
        with self.assertRaisesRegex(RuntimeError, "OHLC disagreement"):
            rs.repair_cask_rename_history(*frames)
        self.assertEqual(frames[0].at[dates[0], "CASK"], 17.76)
        self.assertTrue(pd.isna(frames[0].at[dates[1], "CASK"]))

    @patch.object(rs.requests, "get")
    def test_rejects_wrong_prior_symbol_identity(self, get):
        _, frames = self.frames()
        get.side_effect = self.responses(yahoo_currency="CAD")
        with self.assertRaisesRegex(RuntimeError, "identity mismatch"):
            rs.repair_cask_rename_history(*frames)


if __name__ == "__main__":
    unittest.main()
