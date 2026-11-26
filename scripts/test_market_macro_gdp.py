import unittest
from unittest.mock import patch

import update_market_macro as macro


class GdpSeriesTests(unittest.TestCase):
    def test_fred_date_formats_and_start_filter(self):
        for header, dates in [
            ("observation_date", ["1980-10-01", "1981-01-01", "1981-04-01"]),
            ("DATE", ["1980-10-01", "1981-01-01", "1981-04-01"]),
            ("yyyymmdd", ["19801001", "19810101", "19810401"]),
        ]:
            with self.subTest(header=header):
                csv = f"{header},A191RO1Q156NBEA\n{dates[0]},4\n{dates[1]},2.1\n{dates[2]},.\n"
                with patch("curl_cffi.requests.get") as fetch:
                    fetch.return_value.text = csv
                    self.assertEqual(
                        macro.parse_fred_series("A191RO1Q156NBEA", macro.GDP_START_DATE),
                        (["1981-01-01"], [2.1]),
                    )
                    self.assertTrue(fetch.call_args.args[0].startswith(macro.FRED_GRAPH_BASE))

    def test_older_gdp_mirror_does_not_replace_saved_quarter(self):
        saved = (["2026-07-01"], [4.3])
        with patch.object(macro, "parse_fred_series", return_value=(["2026-04-01"], [2.2])), patch.object(
            macro, "existing_macro_series", return_value=saved
        ):
            self.assertEqual(macro.parse_real_gdp_annualized_series(), saved)

    def test_missing_response_preserves_saved_yoy(self):
        saved = (["2026-04-01"], [2.1])
        for response in [([], []), RuntimeError("network unavailable")]:
            kwargs = {"side_effect": response} if isinstance(response, Exception) else {"return_value": response}
            with patch.object(macro, "parse_fred_series", **kwargs), patch.object(
                macro, "existing_macro_series", return_value=saved
            ) as existing:
                self.assertEqual(
                    macro.parse_fred_series_or_existing("A191RO1Q156NBEA", macro.GDP_START_DATE, "gdp", "real_gdp_yoy"),
                    saved,
                )
                existing.assert_called_once_with("gdp", "real_gdp_yoy")

    def test_no_source_or_cache_fails_instead_of_publishing_empty(self):
        with patch.object(macro, "parse_fred_series", return_value=([], [])), patch.object(
            macro, "existing_macro_series", return_value=([], [])
        ):
            with self.assertRaises(ValueError):
                macro.parse_fred_series_or_existing("A191RO1Q156NBEA", macro.GDP_START_DATE, "gdp", "real_gdp_yoy")


if __name__ == "__main__":
    unittest.main()
