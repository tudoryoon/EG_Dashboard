import csv
import gzip
import io
import json
import os
import tempfile
import unittest
from datetime import date, datetime, timezone
from pathlib import Path
from unittest.mock import patch

import update_study_crwv_bond as bond
import update_study_credit_batch as batch
from update_ai_data_batch import run_task


def fixture(as_of="Oct 20, 2026", **changes):
    values = {"Name": "COREWEAVE INC 144A", "CUSIP": "21873SAC2", "ISIN": "US21873SAC26",
              "Price": "80.61", "YTM (%)": "15.33", "Maturity": "Feb 01, 2031", "Coupon (%)": "9.00",
              "Market Currency": "USD", "Effective Date": "Jul 25, 2025", "Yield to Worst (%)": "15.33"}
    values.update(changes)
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(["iShares HYG"])
    writer.writerow(["Fund Holdings as of", as_of])
    writer.writerow([])
    writer.writerow(values)
    writer.writerow(values.values())
    return out.getvalue().encode("utf-8-sig")


def profile_fixture(ticker, as_of="Oct 20, 2026", ytm="7.50"):
    item = bond.PROFILES[ticker]["bond"]
    return fixture(as_of, **{
        "Name": item["issuer"].upper(), "CUSIP": item["cusip"], "ISIN": item["isin"],
        "Coupon (%)": str(item["couponPct"]), "YTM (%)": ytm,
        "Maturity": date.fromisoformat(item["maturityDate"]).strftime("%b %d, %Y"),
        "Effective Date": date.fromisoformat(item["issueDate"]).strftime("%b %d, %Y"),
    })


class BondTests(unittest.TestCase):
    def parse(self, content):
        return bond.parse_holdings(content, today=date(2026, 10, 22))

    def test_exact_bond_and_source_date_not_collection_date(self):
        item = self.parse(fixture())
        self.assertEqual(item["date"], "2026-10-20")
        self.assertEqual(item["ytmPct"], 15.33)
        self.assertEqual(item["pricePer100"], 80.61)
        self.assertEqual(item["yieldToWorstPct"], 15.33)
        self.assertEqual(len(item["sourceSha256"]), 64)

    def test_each_issuer_validates_its_exact_bond(self):
        for ticker in ["ORCL", "EQIX"]:
            profile = bond.PROFILES[ticker]
            content = profile_fixture(ticker)
            item = bond.parse_holdings(content, bond=profile["bond"])
            self.assertEqual(item["ytmPct"],7.5)
            result = bond.merge_observation({}, item, "2026-10-22", bond=profile["bond"], source=bond.profile_source(profile))
            self.assertEqual(result["bond"]["ticker"],ticker)
            self.assertEqual(result["source"]["fund"],"LQD")
            with self.assertRaises(ValueError):
                bond.parse_holdings(content)
            with self.assertRaises(ValueError):
                bond.merge_observation(result,item,"2026-10-22")

    def test_missing_secondary_metadata_is_flagged_not_fabricated(self):
        item=self.parse(fixture(**{"ISIN":"-","Effective Date":"-"}))
        self.assertEqual(item["identityMissingFields"],["ISIN","Effective Date"])
        self.assertEqual(item["ytmPct"],15.33)
        with self.assertRaises(ValueError):
            self.parse(fixture(**{"ISIN":"-","Effective Date":"-","Coupon (%)":"9.75"}))
        with self.assertRaises(ValueError):
            self.parse(fixture(**{"ISIN":"-","Effective Date":"-","CUSIP":"another bond"}))

    def test_two_lqd_bonds_share_only_date_verified_raw_disclosure(self):
        content = profile_fixture("EQIX",ytm="5.80") + profile_fixture("ORCL").splitlines()[-1] + b"\n"
        with tempfile.TemporaryDirectory() as folder, patch.object(bond,"fetch_holdings",return_value=content) as fetch:
            root = Path(folder)
            profiles = {ticker: {**bond.PROFILES[ticker], "cacheDir":root/ticker, "rawCacheDir":root/"raw"}
                        for ticker in ["ORCL","EQIX"]}
            eqix = bond.collect_dated("2026-10-20",bond.RequestPacer(0),profile=profiles["EQIX"])[1]
            orcl = bond.collect_dated("2026-10-20",bond.RequestPacer(0),profile=profiles["ORCL"])[1]
            self.assertEqual(eqix["ytmPct"],5.8)
            self.assertEqual(orcl["ytmPct"],7.5)
            fetch.assert_called_once()
            raw = root/"raw/2026-09-30.csv.gz"
            raw.write_bytes(gzip.compress(content))
            with self.assertRaisesRegex(ValueError,"rejecting date substitution"):
                bond.collect_dated("2026-09-30",bond.RequestPacer(0),profile=profiles["ORCL"])

    def test_each_archive_has_its_own_export(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/"bond.js"
            profile=bond.PROFILES["ORCL"]
            data=bond.merge_observation({},bond.parse_holdings(profile_fixture("ORCL"),bond=profile["bond"]),
                                        "2026-10-22",bond=profile["bond"],source=bond.profile_source(profile))
            bond.write_payload(data,path,profile["export"])
            self.assertEqual(bond.load_existing(path,profile["export"])["bond"]["ticker"],"ORCL")
            with self.assertRaises(ValueError):
                bond.load_existing(path)

    def test_html_200_rejected(self):
        with self.assertRaises(ValueError):
            self.parse(b"<!doctype html><html>Product page</html>")

    def test_requested_date_must_match_embedded_reference_date(self):
        with self.assertRaisesRegex(ValueError, "rejecting date substitution"):
            bond.parse_holdings(fixture(), today=date(2026, 10, 22), requested_date="2026-09-30")
        item = bond.parse_holdings(fixture("Sep 30, 2026"), today=date(2026, 10, 22), requested_date="2026-09-30")
        self.assertEqual(item["date"], "2026-09-30")

    def test_explicit_historical_import_extends_archive_without_regressing_latest(self):
        existing = bond.merge_observation({}, self.parse(fixture()), "2026-10-22T00:40:00+00:00")
        result = bond.merge_observation(existing, self.parse(fixture("Sep 30, 2026")), existing["checkedAt"], allow_historical=True)
        self.assertEqual(result["updatedAt"], "2026-10-20")
        self.assertEqual(len(result["observations"]), 2)
        self.assertEqual(result["observations"][0]["date"], "2026-09-30")

    def test_unavailable_disclosure_is_not_a_zero_yield(self):
        with self.assertRaises(bond.HoldingsUnavailableError):
            self.parse(fixture("-"))

    def test_weekdays_and_last_completed_new_york_session(self):
        self.assertEqual(bond.weekdays(date(2026,10,16),date(2026,10,20)), ["2026-10-16","2026-10-19","2026-10-20"])
        self.assertEqual(bond.latest_completed_session(datetime(2026,10,22,0,40,tzinfo=timezone.utc)),date(2026,10,21))
        self.assertEqual(bond.latest_completed_session(datetime(2026,10,19,0,40,tzinfo=timezone.utc)),date(2026,10,16))

    def test_dated_fetch_preserves_raw_provenance_and_caches_only_verified_date(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(bond, "CACHE_DIR", Path(folder)), patch.object(
            bond, "fetch_holdings", return_value=fixture("Sep 30, 2026")
        ) as fetch:
            status, item = bond.collect_dated("2026-09-30", bond.RequestPacer(0))
            self.assertEqual(status,"ok")
            self.assertIn("asOfDate=20260930", item["sourceUrl"])
            self.assertEqual(item["date"],"2026-09-30")
            self.assertEqual(bond.collect_dated("2026-09-30", bond.RequestPacer(0))[1],item)
            fetch.assert_called_once()
        with tempfile.TemporaryDirectory() as folder, patch.object(bond, "CACHE_DIR", Path(folder)), patch.object(
            bond, "fetch_holdings", return_value=fixture()
        ):
            with self.assertRaises(ValueError):
                bond.collect_dated("2026-09-30", bond.RequestPacer(0))
            self.assertEqual(list(Path(folder).iterdir()),[])

    def test_empty_or_missing_bond_is_recorded_without_observation(self):
        for content, expected in [(b"", "unpublished"), (fixture(**{"CUSIP":"different"}), "not-held")]:
            with tempfile.TemporaryDirectory() as folder, patch.object(bond, "CACHE_DIR", Path(folder)), patch.object(
                bond, "fetch_holdings", return_value=content
            ):
                self.assertEqual(bond.collect_dated("2026-10-20", bond.RequestPacer(0)),(expected,None))
                self.assertEqual(list(Path(folder).iterdir()),[])

    def test_different_tranche_and_terms_rejected(self):
        for changes in [{"CUSIP": "21873SAD0"}, {"ISIN": "USU2069EAB66"}, {"Coupon (%)": "9.75"},
                        {"Maturity": "Oct 01, 2031"}, {"Effective Date": "Apr 14, 2026"},
                        {"Market Currency": "EUR"}, {"Name": "OTHER ISSUER"}]:
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                self.parse(fixture(**changes))

    def test_invalid_values_rejected(self):
        for field, value in [("YTM (%)", "NaN"), ("YTM (%)", "inf"), ("YTM (%)", "--"),
                             ("Price", "0"), ("Price", "-1"), ("YTM (%)", "1001")]:
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                self.parse(fixture(**{field: value}))

    def test_missing_header_and_duplicate_cusip_rejected(self):
        with self.assertRaises(ValueError):
            self.parse(fixture().replace(b"YTM (%)", b"Unknown"))
        content = fixture()
        duplicate = content + content.splitlines()[-1] + b"\n"
        with self.assertRaises(ValueError):
            self.parse(duplicate)

    def test_future_and_pre_issue_dates_rejected(self):
        for day in ["Oct 23, 2026", "Jul 24, 2025"]:
            with self.subTest(day=day), self.assertRaises(ValueError):
                self.parse(fixture(day))

    def test_archive_preserves_history_and_missing_days(self):
        first = bond.merge_observation({}, self.parse(fixture("Oct 16, 2026")), "2026-10-17T00:40:00+00:00")
        result = bond.merge_observation(first, self.parse(fixture()), "2026-10-22T00:40:00+00:00")
        self.assertEqual([row["date"] for row in result["observations"]], ["2026-10-16", "2026-10-20"])
        self.assertEqual(first["updatedAt"], "2026-10-16")
        self.assertEqual(result["updatedAt"], "2026-10-20")
        self.assertNotIn("2026-10-22", [row["date"] for row in result["observations"]])

    def test_same_reference_date_never_creates_false_history(self):
        item = self.parse(fixture())
        first = bond.merge_observation({}, item, "2026-10-21T00:40:00+00:00")
        result = bond.merge_observation(first, item, "2026-10-22T00:40:00+00:00")
        self.assertEqual(len(result["observations"]), 1)
        self.assertEqual(result["observations"][0]["firstCollectedAt"], first["checkedAt"])
        self.assertEqual(result["observations"][0]["lastCollectedAt"], result["checkedAt"])
        revised = bond.merge_observation(result, self.parse(fixture(**{"YTM (%)": "15.34"})), result["checkedAt"])
        self.assertEqual(revised["observations"][0]["ytmPct"], 15.34)
        self.assertEqual(len(revised["observations"]), 1)

    def test_regressed_source_or_different_archive_rejected(self):
        existing = bond.merge_observation({}, self.parse(fixture()), "2026-10-22T00:40:00+00:00")
        with self.assertRaises(ValueError):
            bond.merge_observation(existing, self.parse(fixture("Oct 19, 2026")), existing["checkedAt"])
        with self.assertRaises(ValueError):
            bond.merge_observation({**existing, "bond": {}}, self.parse(fixture()), existing["checkedAt"])

    def test_load_roundtrip_and_corrupt_archive_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "bond.js"
            self.assertEqual(bond.load_existing(path), {})
            data = bond.merge_observation({}, self.parse(fixture()), "2026-10-22T00:40:00+00:00")
            path.write_text(bond.EXPORT + json.dumps(data) + ";\n")
            self.assertEqual(bond.load_existing(path), data)
            path.write_text("invalid")
            with self.assertRaises(ValueError):
                bond.load_existing(path)

    def test_one_failed_collector_still_publishes_other_output(self):
        for failed_index in range(4):
            files=["data/study-crwv-bond-data.js","data/study-orcl-bond-data.js","data/study-eqix-bond-data.js","data/study-cds-data.js"]
            results = [{"name": file, "status": "updated", "changed": [file]} for file in files]
            results[failed_index] = {"name": "Failed", "status": "failed", "changed": []}
            with tempfile.TemporaryDirectory() as folder:
                output = Path(folder) / "output"
                with patch.object(batch, "run_task", side_effect=results) as collect, patch.dict(
                    os.environ, {"GITHUB_OUTPUT": str(output), "GITHUB_STEP_SUMMARY": ""}
                ):
                    batch.main(backfill=True)
                text = output.read_text()
                self.assertIn("failed_count=1", text)
                for index,file in enumerate(files):
                    if index != failed_index:
                        self.assertIn(file,text)
                self.assertEqual(collect.call_args_list[3].kwargs["script_args"], ["--backfill"])
                self.assertEqual(collect.call_args_list[1].kwargs["script_args"], ["--ticker","ORCL"])
                self.assertEqual(collect.call_args_list[2].kwargs["script_args"], ["--ticker","EQIX"])
                self.assertNotIn("script_args", collect.call_args_list[0].kwargs)

    def test_failed_collector_partial_write_is_restored(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            path = root / "bond.js"
            path.write_text("previous")
            def fail(*args, **kwargs):
                path.write_text("partial")
                raise RuntimeError("failed")
            result = run_task("Bond", "unused.py", ["bond.js"], 10, root=root, execute=fail)
            self.assertEqual(result["status"], "failed")
            self.assertEqual(path.read_text(), "previous")


if __name__ == "__main__":
    unittest.main()
