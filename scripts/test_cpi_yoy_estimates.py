import copy
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

import update_macro_data as macro


class CpiYoyEstimateTests(unittest.TestCase):
    def setUp(self):
        self.levels = {"2025-09": 324.8, "2025-11": 324.122, "2026-10": 337.511}

    def test_headline_and_core_use_unadjusted_geometric_base(self):
        headline = macro.compute_bls_cpi_yoy(["2026-10"], self.levels, "CUUR0000SA0")
        self.assertEqual(headline["yoyValues"], [4.02])
        estimate = headline["yoyEstimates"]["2026-10"]
        self.assertEqual(estimate["releaseDate"], "2026-11-10")
        self.assertEqual(estimate["baseNeighbors"], {"2025-09": 324.8, "2025-11": 324.122})
        self.assertEqual(estimate["status"], "estimate")
        core = macro.compute_bls_cpi_yoy(["2026-10"], {
            "2025-09": 330.804, "2025-11": 330.425, "2026-10": 339.921,
        }, "CUUR0000SA0L1E")
        self.assertEqual(core["yoyValues"], [2.81])
        self.assertNotIn("2025-10", self.levels, "Do not invent a stored raw index")

    def test_missing_neighbors_current_or_other_months_are_not_estimated(self):
        for levels in [{}, {"2026-10": 337.511, "2025-09": 324.8}, {"2025-09": 324.8, "2025-11": 0}]:
            result = macro.compute_bls_cpi_yoy(["2026-10"], levels, "CUUR0000SA0")
            self.assertEqual(result, {"yoyValues": [None], "yoyEstimates": {}})
        result = macro.compute_bls_cpi_yoy(["2025-10", "2026-11"], self.levels, "CUUR0000SA0")
        self.assertEqual(result["yoyValues"], [None, None])
        self.assertEqual(result["yoyEstimates"], {})

    def test_published_base_replaces_estimate(self):
        levels = {**self.levels, "2025-10": 325.0}
        result = macro.compute_bls_cpi_yoy(["2026-10"], levels, "CUUR0000SA0")
        self.assertEqual(result["yoyValues"], [round((337.511 / 325.0 - 1) * 100, 2)])
        self.assertEqual(result["yoyEstimates"], {})

    def test_recent_request_does_not_silently_drop_current_year(self):
        parsed = {"dates": list(self.levels), "values": list(self.levels.values())}
        with patch.object(macro, "parse_bls_series", return_value=parsed) as fetch:
            result = macro.build_bls_cpi_yoy_data(["1957-01", "2026-10"], "CPIAUCSL")
        year = datetime.now(timezone.utc).year
        fetch.assert_called_once_with("CUUR0000SA0", year - 1, year)
        self.assertEqual(result["yoyValues"], [None, 4.02])

    def test_update_failure_preserves_values_and_estimate_provenance(self):
        estimate = macro.compute_bls_cpi_yoy(["2026-10"], self.levels, "CUUR0000SA0")["yoyEstimates"]
        config = copy.deepcopy(next(item for item in macro.INDICATORS if item["key"] == "cpi"))
        config["series"] = config["series"][:1]
        existing = {"series": [{"key": "headline_cpi", "dates": ["2026-10"], "values": [337.5],
                                "yoyValues": [4.02], "yoyPct": 4.02, "yoyEstimates": estimate}]}
        with patch.object(macro, "parse_series_data", side_effect=RuntimeError("offline")):
            result = macro.build_indicator_payload(config, existing)["series"][0]
        self.assertEqual(result["yoyValues"], [4.02])
        self.assertEqual(result["yoyEstimates"], estimate)
        self.assertEqual(result["fetchStatus"], "stale")

    def test_scoped_build_does_not_rebuild_other_indicators(self):
        existing = {"indicators": [{"key": config["key"], "sentinel": config["key"]} for config in macro.INDICATORS]}
        with patch.object(macro, "load_existing_payload", return_value=existing), \
             patch.object(macro, "build_indicator_payload", return_value={"key": "cpi", "updated": True}) as build:
            result = macro.build_payload({"cpi"})
        self.assertEqual(build.call_count, 1)
        self.assertEqual([item for item in result["indicators"] if item["key"] != "cpi"],
                         [item for item in existing["indicators"] if item["key"] != "cpi"])

    def test_recent_nsa_failure_keeps_estimate_but_official_base_supersedes_it(self):
        config = copy.deepcopy(next(item for item in macro.INDICATORS if item["key"] == "cpi"))
        config["series"] = config["series"][:1]
        parsed = {"dates": ["2025-09", "2025-11", "2026-09", "2026-10"],
                  "values": [324.245, 325.063, 336.298, 337.476]}
        estimate = macro.compute_bls_cpi_yoy(["2026-10"], self.levels, "CUUR0000SA0")["yoyEstimates"]
        existing = {"series": [{"key": "headline_cpi", **parsed, "yoyValues": [3.01, 2.74, 3.72, 4.02],
                                "yoyPct": 4.02, "yoyEstimates": estimate}]}
        published = macro.compute_bls_cpi_yoy(parsed["dates"], {**self.levels, "2025-10": 325}, "CUUR0000SA0")
        for response in [None, published]:
            with patch.object(macro, "parse_series_data", return_value=parsed), \
                 patch.object(macro, "merge_latest_bls_fallback", return_value=parsed), \
                 patch.object(macro, "parse_moneycontrol_release_history", return_value=[]), \
                 patch.object(macro, "build_bls_cpi_yoy_data", return_value=response):
                result = macro.build_indicator_payload(config, existing)["series"][0]
            self.assertEqual(result["yoyValues"][-2], 3.72)
            if response is None:
                self.assertEqual(result["yoyPct"], 4.02)
                self.assertEqual(result["yoyEstimates"], estimate)
            else:
                self.assertEqual(result["yoyPct"], published["yoyValues"][-1])
                self.assertNotIn("yoyEstimates", result)


if __name__ == "__main__":
    unittest.main()
