import copy
import math
import unittest
from datetime import date
from unittest.mock import patch

import update_study_credit_spreads as spreads
import update_study_crwv_bond as bonds


def archive():
    return {"bond": {"maturityDate": "2031-01-01"}, "source": {}, "updatedAt": "2026-01-02",
            "observations": [{"date": "2026-01-01", "ytmPct": 6, "pricePer100": 95},
                             {"date": "2026-01-02", "ytmPct": 6.2, "pricePer100": 94}]}


class SpreadTests(unittest.TestCase):
    def test_official_xml_percent_units_and_missing_nodes(self):
        xml = b'''<feed xmlns="http://www.w3.org/2005/Atom"
          xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata"
          xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices">
          <entry><content><m:properties><d:NEW_DATE>2026-01-02T00:00:00</d:NEW_DATE>
          <d:BC_3YEAR>4.00</d:BC_3YEAR><d:BC_5YEAR>4.50</d:BC_5YEAR>
          <d:BC_7YEAR m:null="true"/></m:properties></content></entry></feed>'''
        curves = spreads.parse_curve_xml(xml, 2026)
        self.assertEqual(curves, {"2026-01-02": {3: 4, 5: 4.5}})
        with self.assertRaises(ValueError):
            spreads.parse_curve_xml(xml, 2025)

    def test_remaining_maturity_linear_interpolation(self):
        day, maturity = "2026-01-02", "2030-01-02"
        result = spreads.treasury_benchmark(day, maturity, {day: {3: 4, 5: 4.5}})
        years = (date.fromisoformat(maturity) - date.fromisoformat(day)).days / 365.25
        expected = 4 + (years - 3) / 2 * .5
        self.assertAlmostEqual(result["benchmarkPct"], expected, places=7)
        self.assertEqual(result["treasuryDate"], day)
        self.assertEqual((result["lowerTenorYears"], result["upperTenorYears"]), (3, 5))

    def test_four_year_midpoint(self):
        result = spreads.treasury_benchmark("2025-01-01", "2029-01-01", {"2025-01-01": {3: 4, 5: 5}})
        self.assertEqual(result["remainingYears"], 4)
        self.assertEqual(result["benchmarkPct"], 4.5)

    def test_exact_twenty_year_node(self):
        result = spreads.treasury_benchmark("2020-01-01", "2040-01-01", {"2020-01-01": {20: 5}})
        self.assertEqual(result["benchmarkPct"], 5)
        self.assertEqual(result["lowerTenorYears"], 20)
        self.assertEqual(result["upperTenorYears"], 20)

    def test_no_stale_date_substitution_no_extrapolation(self):
        curve = {"2026-01-02": {3: 4, 5: 4.5}}
        self.assertIsNone(spreads.treasury_benchmark("2026-01-03", "2030-01-01", curve)["benchmarkPct"])
        self.assertIsNone(spreads.treasury_benchmark("2026-01-02", "2060-01-01", curve)["benchmarkPct"])
        self.assertIsNone(spreads.treasury_benchmark("2026-01-02", "2025-01-01", curve)["benchmarkPct"])
        missing = spreads.treasury_benchmark("2026-01-02", "2030-01-01", {"2026-01-02": {2: 3.9, 5: 4.5}})
        self.assertEqual(missing["benchmarkStatus"], "missing-bracketing-tenor")

    def test_ytm_preserved_holidays_null_and_negative_spreads_allowed(self):
        original = archive()
        before = copy.deepcopy(original)
        payload = spreads.build_payload({"TEST": original}, {"2026-01-02": {3: 4, 5: 4.5, 7: 5}}, [], "checked")
        observations = payload["items"]["TEST"]["observations"]
        self.assertIsNone(observations[0]["spreadBps"])
        self.assertEqual(observations[1]["ytmPct"], 6.2)
        years = (date(2031, 1, 1) - date(2026, 1, 2)).days / 365.25
        expected = (6.2 - (4 + (years - 3) / 2 * .5)) * 100
        self.assertAlmostEqual(observations[1]["spreadBps"], expected, places=3)
        self.assertEqual(original, before)
        original["observations"][1]["ytmPct"] = 3
        negative = spreads.build_payload({"TEST": original}, {"2026-01-02": {3: 4, 5: 4.5, 7: 5}}, [], "checked")
        self.assertLess(negative["items"]["TEST"]["observations"][1]["spreadBps"], 0)

    def test_longer_msft_maturity_uses_seven_to_ten_year_curve(self):
        result = spreads.treasury_benchmark("2026-10-23", "2035-02-12", {"2026-10-23": {3: 4, 5: 4.5, 7: 4.8, 10: 5.1}})
        self.assertEqual((result["lowerTenorYears"], result["upperTenorYears"]), (7, 10))
        self.assertGreater(result["benchmarkPct"], 4.8)
        self.assertLess(result["benchmarkPct"], 5.1)

    def test_regressed_treasury_source_never_overwrites_spreads(self):
        profile = {"bond": archive()["bond"], "dataPath": "bond.js", "export": "bond"}
        def load(path, export):
            return archive() if path == "bond.js" else {"treasury": {"latestDate": "2026-10-23"}}
        with patch.dict(bonds.PROFILES, {"TEST": profile}, clear=True), \
             patch.object(bonds, "load_existing", side_effect=load), \
             patch.object(bonds, "fetch_holdings", return_value=b"fixture"), \
             patch.object(spreads, "parse_curve_xml", return_value={"2026-01-02": {3: 4, 5: 4.5}}), \
             patch.object(bonds, "write_payload") as write:
            with self.assertRaisesRegex(ValueError, "regressed"):
                spreads.main()
        write.assert_not_called()

    def test_published_data_reconciles_and_all_cds_issuers_included(self):
        payload = bonds.load_existing(spreads.DATA_PATH, spreads.EXPORT)
        self.assertEqual(set(payload["items"]), set(bonds.PROFILES))
        for ticker, item in payload["items"].items():
            self.assertEqual(item["bond"], bonds.PROFILES[ticker]["bond"])
            original = bonds.load_existing(bonds.PROFILES[ticker]["dataPath"], bonds.PROFILES[ticker]["export"])
            by_date = {row["date"]: row for row in original["observations"]}
            self.assertGreater(item["coverage"]["matchedDays"], 50)
            for row in item["observations"]:
                self.assertEqual(row["ytmPct"], by_date[row["date"]]["ytmPct"])
                if row["spreadBps"] is None:
                    self.assertIsNone(row["benchmarkPct"])
                    continue
                self.assertEqual(row["date"], row["treasuryDate"])
                self.assertAlmostEqual(row["spreadBps"], (row["ytmPct"] - row["benchmarkPct"]) * 100, places=3)
                self.assertGreaterEqual(row["upperWeight"], 0)
                self.assertLessEqual(row["upperWeight"], 1)
                self.assertTrue(math.isfinite(row["spreadBps"]))


if __name__ == "__main__":
    unittest.main()
