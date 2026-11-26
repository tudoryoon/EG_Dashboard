import unittest

from update_macro_data import FRED_GRAPH_BASE, build_core_capex_release_history, fred_csv_urls


class CurrentMacroReleasesTest(unittest.TestCase):
    def test_primary_source_for_revised_series(self):
        for series_id in ("PCEPI", "PCEPILFE", "DGORDER", "NEWORDER"):
            self.assertEqual(fred_csv_urls(series_id, "1992-02")[0], FRED_GRAPH_BASE + series_id)

    def test_core_capex_release_uses_nondefense_ex_aircraft_levels(self):
        releases = build_core_capex_release_history(
            ["2026-08", "2026-09", "2026-10"], [87616, 88343, 89383],
            [{"releaseDate": "2026-11-25", "reference": "Durable Goods Orders Ex Transp MoM Oct", "actualValue": 0.5}],
            {"releaseDate": "2026-11-25", "reference": "Oct"},
        )
        self.assertEqual(len(releases), 1)
        self.assertEqual(releases[0]["actualValue"], 1.2)
        self.assertEqual(releases[0]["previous"], "0.80%")
        self.assertIsNone(releases[0]["consensus"])

    def test_does_not_use_release_date_for_different_reference_month(self):
        self.assertEqual(build_core_capex_release_history(
            ["2026-08", "2026-09"], [87616, 88343], [],
            {"releaseDate": "2026-11-25", "reference": "Oct"},
        ), [])


if __name__ == "__main__":
    unittest.main()
