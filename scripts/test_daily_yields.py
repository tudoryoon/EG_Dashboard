import io
import unittest
from unittest.mock import Mock, patch

import pandas as pd
import update_daily_yields as yields

HEADER = "observation_date,DGS10,DFII10,T10YIE\n"


def workbook(records):
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        pd.DataFrame([{"DATE": "2026-08-31", "ACMTP10": 9}]).to_excel(writer, sheet_name="ACM Monthly", index=False)
        pd.DataFrame(records).to_excel(writer, sheet_name="ACM Daily", index=False)
    return output.getvalue()


class DailyYieldTests(unittest.TestCase):
    def test_intersection_not_forward_filled_and_individual_dates_retained(self):
        item = yields.parse_fred_daily(HEADER + "2026-09-29,5.26,2.91,2.35\n2026-09-30,,,2.36\n")
        self.assertEqual(item["dates"], ["2026-09-29"])
        self.assertEqual(item["sourceDates"]["bei"], "2026-09-30")
        self.assertEqual(item["sourceDates"]["real"], "2026-09-29")
        self.assertEqual(item["series"]["nominal"], [5.26])

    def test_negative_real_rates_sort_and_rounding(self):
        item = yields.parse_fred_daily(HEADER + "2026-09-29,1.61,-0.4,2\n2026-09-28,1.5,-0.5,2\n")
        self.assertEqual(item["series"]["real"], [-0.5, -0.4])

    def test_bad_csv_identity_duplicate_nan(self):
        for text in ["bad", HEADER, HEADER + "2026-09-29,4,2,3\n", HEADER + "2026-09-29,nan,2,2\n",
                     HEADER + "2026-09-29,4,2,2\n2026-09-29,4,2,2\n"]:
            with self.subTest(text=text), self.assertRaises(ValueError):
                yields.parse_fred_daily(text)

    def test_acm_daily_sheet_and_identity(self):
        item = yields.parse_acm_workbook(workbook([
            {"DATE": "30-Sep-2026", "ACMTP10": -.2, "ACMRNY10": 4, "ACMY10": 3.8},
            {"DATE": "29-Sep-2026", "ACMTP10": .3, "ACMRNY10": 4, "ACMY10": 4.3},
        ]))
        self.assertEqual(item["dates"], ["2026-09-29", "2026-09-30"])
        self.assertEqual(item["series"]["termPremium"], [.3, -.2])
        with self.assertRaises(ValueError):
            yields.parse_acm_workbook(workbook([{"DATE": "2026-09-30", "ACMTP10": 1, "ACMRNY10": 4, "ACMY10": 3}]))

    def test_provider_failures_are_independent(self):
        old = {"updatedAt": "2026-08-31", "dates": ["2026-08-31"]}
        fresh = {"updatedAt": "2026-09-30", "dates": ["2026-09-30"]}
        with patch.object(yields.requests, "get", side_effect=[OSError("FRED offline"), OSError("FRED offline"), Mock(content=b"ACM")]), \
             patch.object(yields, "parse_acm_workbook", return_value=fresh), \
             patch.object(yields, "validate_history"):
            result = yields.fetch_daily_yields({"dailyYieldDecomposition": old})
        self.assertIs(result["dailyYieldDecomposition"], old)
        self.assertIs(result["acmTermPremium"], fresh)

    def test_history_guard(self):
        with self.assertRaises(ValueError):
            yields.validate_history({"dates": ["2026-09-30"], "updatedAt": "2026-09-30"}, None)
        dates = [f"1983-{i}" for i in range(1000)]
        with self.assertRaises(ValueError):
            yields.validate_history({"dates": dates, "updatedAt": "9999-01-01"}, None)
        with self.assertRaises(ValueError):
            yields.validate_history({"dates": dates, "updatedAt": "2026-09-29"}, {"updatedAt": "2026-09-30", "dates": dates})


if __name__ == "__main__":
    unittest.main()
