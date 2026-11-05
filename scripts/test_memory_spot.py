import unittest
from datetime import date

from update_memory_spot import MODULE_KEY, MODULE_PRODUCT, TARGET_MAP, build_payload


def module_row(day):
    return dict(Date=day, Product=MODULE_PRODUCT, Canonical_Product="DDR5 RDIMM",
                Price_Average="2165", Price_High="2370", Price_Low="2100",
                Change_Pct="0", Price_Type="Weekly")


class MemorySpotTest(unittest.TestCase):
    def test_module_ranges_and_collection_dates(self):
        payload = build_payload([module_row("2026-11-02"), module_row("2026-11-04")], date(2026, 11, 5))
        item = payload["items"][MODULE_KEY]
        first, last = [payload["labels"].index(day) for day in ("2026-11-02", "2026-11-04")]
        self.assertEqual(item["latestValue"], 2165)
        self.assertEqual(item["latestHigh"], 2370)
        self.assertEqual(item["latestLow"], 2100)
        self.assertEqual(item["latestDate"], "2026-11-04")
        self.assertEqual(item["dateBasis"], "sheet_collection_date")
        self.assertEqual(item["history"][first], item["history"][last])
        self.assertIsNone(item["history"][first + 1])
        self.assertEqual(item["highHistory"][last], 2370)
        self.assertEqual(item["lowHistory"][last], 2100)
        self.assertEqual(payload["updatedAt"], "2026-11-04")

    def test_reject_other_modules_invalid_prices_and_future_dates(self):
        rows = [module_row("2026-11-01")]
        for field, value in [("Product", "DDR5 RDIMM 64GB 4800/5600"),
                             ("Product", "DDR5 RDIMM 32GB 6400"),
                             ("Price_Average", "NaN"), ("Price_Average", "bad"),
                             ("Price_Average", "0"), ("Price_High", "100"), ("Price_Low", "3000")]:
            row = module_row("2026-11-04")
            row[field] = value
            rows.append(row)
        rows.append(module_row("2026-11-06"))
        item = build_payload(rows, date(2026, 11, 5))["items"][MODULE_KEY]
        self.assertEqual(item["latestDate"], "2026-11-01")
        self.assertEqual(sum(value is not None for value in item["history"]), 1)

    def test_legacy_six_series_unchanged(self):
        rows = [dict(Date="2026-11-04", Canonical_Product=canonical,
                     Price_Average="12.3456", Change_Pct="-1.234")
                for key, canonical in TARGET_MAP.items() if key != MODULE_KEY]
        payload = build_payload(rows, date(2026, 11, 5))
        for key in TARGET_MAP:
            if key == MODULE_KEY:
                continue
            item = payload["items"][key]
            self.assertEqual(set(item), {"history", "latestValue", "latestChangePct", "latestDate"})
            self.assertEqual(item["latestValue"], 12.346)
            self.assertEqual(item["latestChangePct"], -1.23)
            self.assertIsNone(item["history"][-1])


if __name__ == "__main__":
    unittest.main()
