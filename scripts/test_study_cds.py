import csv
import io
import unittest
import zipfile
from datetime import date
from unittest.mock import patch

import update_study_cds as cds


def trade(**changes):
    row = {
        "Underlying Asset Name": "SPACE EXPLORATION TECHNOLOGIES CORP.",
        "Action Type": "NEWT", "Event Type": "TRAD", "UPI FISN": "NA/CDS Corp SN Sr",
        "Notional Currency-Leg 1": "USD", "Execution Timestamp": "2026-10-23T12:20:28Z",
        "Expiration Date": "2031-12-20", "Spread-Leg 1": "0.0265",
        "Spread Notation-Leg 1": "3", "Notional Amount-Leg 1": "5,000,000+",
    }
    return {**row, **changes}


def archive(rows):
    text = io.StringIO()
    writer = csv.DictWriter(text, fieldnames=list(trade()))
    writer.writeheader()
    writer.writerows(rows)
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as zipped:
        zipped.writestr("credits.csv", text.getvalue())
    return output.getvalue()


class CdsTests(unittest.TestCase):
    def test_spcx_legal_name_and_aliases(self):
        for name in ["SPACE EXPLORATION TECHNOLOGIES CORP.", "SpaceX", "SPACE-X"]:
            self.assertEqual(cds.identify_issuer(name), "spcx")
        self.assertIsNone(cds.identify_issuer("SPACE SYSTEMS INC"))
        self.assertIsNone(cds.identify_issuer("SPCX ETF TRUST"))
        self.assertEqual(cds.identify_issuer("ORACLE CORP"), "orcl")

    def test_identical_five_year_filters_and_notional(self):
        rows = [trade(), trade(**{"Spread-Leg 1": "0.0275"}),
                trade(**{"Spread-Leg 1": ""}),
                trade(**{"Action Type": "CORR"}), trade(**{"Event Type": "NOVA"}),
                trade(**{"Notional Currency-Leg 1": "EUR"}),
                trade(**{"Expiration Date": "2029-12-20"}),
                trade(**{"UPI FISN": "NA/CDS Corp SN Sub"})]
        with patch.object(cds, "fetch_bytes", return_value=archive(rows)):
            day, result = cds.parse_dtcc_zip({
                "fileName": "SEC_CUMULATIVE_CREDITS_2026_10_23.zip", "fullFilePath": "fixture",
            })
        self.assertEqual(day, "2026-10-23")
        item = result["spcx"]
        self.assertEqual(item["observedBps"], 270)
        self.assertEqual((item["lowBps"], item["highBps"]), (265, 275))
        self.assertEqual(item["allTradeCount"], 3)
        self.assertEqual(item["directTradeCount"], 2)
        self.assertEqual(item["trades"][0]["notionalUsd"], 5_000_000)
        self.assertTrue(item["trades"][0]["isCapped"])
        self.assertEqual(result["orcl"]["directTradeCount"], 0)

    def test_no_backfill_before_first_trade_and_common_carry(self):
        payload = cds.build_payload({
            "2026-10-22": {"spcx": {"observedBps": 250, "directTradeCount": 1, "allTradeCount": 1}},
        }, date(2026, 10, 23))
        item = payload["items"]["spcx"]
        self.assertTrue(all(value is None for value in item["values"][:-2]))
        self.assertEqual(item["values"][-2:], [250, 250])
        self.assertEqual(item["observedBps"][-2:], [250, None])
        self.assertEqual(item["latest"]["observedDate"], "2026-10-22")
        self.assertEqual(item["latest"]["staleDays"], 1)
        self.assertIsNone(payload["items"]["orcl"]["latest"]["bps"])
        restored = cds.existing_daily_map(payload)
        self.assertEqual(restored["2026-10-22"]["spcx"]["observedBps"], 250)

    def test_new_issuer_triggers_history_not_only_recent_days(self):
        previous = cds.build_payload({}, date(2026, 10, 23))
        previous["items"].pop("spcx")
        entries = [{"fileName": f"SEC_CUMULATIVE_CREDITS_{day.replace('-', '_')}.zip"}
                   for day in ["2026-01-15", "2026-10-23"]]
        def parse(entry):
            day = cds.parse_file_date(entry["fileName"]).isoformat()
            return day, {"spcx": {"observedBps": 200, "directTradeCount": 1}}
        with patch("sys.argv", ["update_study_cds.py"]), \
             patch.object(cds, "fetch_file_list", return_value=entries), \
             patch.object(cds, "load_existing", return_value=previous), \
             patch.object(cds, "parse_dtcc_zip", side_effect=parse) as collect, \
             patch.object(cds, "write_payload") as write:
            cds.main()
        self.assertEqual(collect.call_count, 2)
        result = write.call_args.args[0]
        index = result["dates"].index("2026-01-15")
        self.assertEqual(result["items"]["spcx"]["observedBps"][index], 200)


if __name__ == "__main__":
    unittest.main()
