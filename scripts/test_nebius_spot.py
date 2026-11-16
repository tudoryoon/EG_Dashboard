import copy
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import update_nebius_spot as spot


NOW = datetime(2026, 11, 16, 3, 30, tzinfo=timezone.utc)


def fixture(day="2026-11-15", value=2):
    start = datetime.fromisoformat(day).replace(tzinfo=timezone.utc)
    return {"snapshotTime": spot.iso_time(NOW), "items": [
        {"skuId": config["key"] + region, "region": region,
         "computeInstance": {"platform": config["platforms"][-1]},
         "currency": "usd", "unitTitle": "GPU hour",
         "points": [{"timestamp": spot.iso_time(start + timedelta(hours=hour + 1)), "value": str(value)}
                    for hour in range(24)]}
        for config in spot.GPU_ITEMS for region in config["regions"]]}


class NebiusSpotTests(unittest.TestCase):
    def test_midnight_is_the_previous_days_final_hour(self):
        data = spot.build_payload(fixture(), {}, NOW)
        self.assertEqual(data["labels"], ["2026-11-15"])
        self.assertEqual(data["updatedAt"], "2026-11-15")
        self.assertEqual(data["series"]["h100"]["values"], [2])

    def test_24_hour_region_means_then_equal_weight_regions(self):
        raw = fixture()
        b300 = [row for row in raw["items"] if row["computeInstance"]["platform"] == "gpu-b300-sxm"]
        for index, row in enumerate(b300):
            for point in row["points"]:
                point["value"] = str((index + 1) * 2)
        data = spot.build_payload(raw, {}, NOW)
        self.assertEqual(data["series"]["b300"]["values"], [4])
        self.assertEqual(data["series"]["b300"]["regionValues"]["eu-west2"], [2])
        self.assertEqual(len(data["series"]["b300"]["regions"]), 3)

    def test_missing_region_does_not_change_the_basket(self):
        raw = fixture()
        raw["items"] = [row for row in raw["items"] if row["region"] != "eu-west2"]
        data = spot.build_payload(raw, {}, NOW)
        self.assertEqual(data["series"]["b300"]["values"], [None])
        self.assertEqual(data["series"]["b200"]["values"], [2])

    def test_missing_hour_and_duplicate_hour_do_not_fake_full_day(self):
        raw = fixture()
        row = next(row for row in raw["items"] if row["computeInstance"]["platform"] == "gpu-h100-sxm")
        row["points"] = row["points"][:-1] + [row["points"][0]]
        data = spot.build_payload(raw, {}, NOW)
        self.assertEqual(data["series"]["h100"]["values"], [None])

    def test_current_partial_day_is_excluded(self):
        raw = fixture()
        for row in raw["items"]:
            row["points"].append({"timestamp": "2026-11-16T01:00:00Z", "value": "100"})
        data = spot.build_payload(raw, {}, NOW)
        self.assertEqual(data["labels"], ["2026-11-15"])
        self.assertEqual(data["series"]["b300"]["values"], [2])

    def test_two_platform_ids_for_rtx_do_not_duplicate_region_weights(self):
        raw = fixture()
        for row in raw["items"]:
            if row["computeInstance"]["platform"] == "gpu-rtx6000-a" and row["region"] == "us-central1":
                row["computeInstance"]["platform"] = "gpu-rtx6000"
        data = spot.build_payload(raw, {}, NOW)
        self.assertEqual(data["series"]["rtx6000"]["values"], [2])
        raw["items"].append(copy.deepcopy(raw["items"][0]))
        with self.assertRaisesRegex(ValueError, "Multiple SKUs"):
            spot.build_payload(raw, {}, NOW)

    def test_new_regions_are_not_automatically_added_to_fixed_basket(self):
        raw = fixture()
        extra = copy.deepcopy(raw["items"][0])
        extra["region"] = "unverified-region"
        raw["items"].append(extra)
        self.assertEqual(spot.build_payload(raw, {}, NOW)["series"]["b300"]["values"], [2])

    def test_units_nonfinite_negative_and_conflicting_hours_are_rejected(self):
        for field, value in [("currency", "eur"), ("unitTitle", "instance hour")]:
            raw = fixture()
            raw["items"][0][field] = value
            with self.assertRaises(ValueError):
                spot.build_payload(raw, {}, NOW)
        for value in ["NaN", "Infinity", "-1"]:
            raw = fixture()
            raw["items"][0]["points"][0]["value"] = value
            with self.assertRaises(ValueError):
                spot.build_payload(raw, {}, NOW)
        raw = fixture()
        raw["items"][0]["points"].append({**raw["items"][0]["points"][0], "value": "5"})
        with self.assertRaisesRegex(ValueError, "Conflicting"):
            spot.build_payload(raw, {}, NOW)

    def test_retention_does_not_delete_previously_saved_history(self):
        existing = spot.build_payload(fixture("2026-10-01", 1), {}, NOW)
        data = spot.build_payload(fixture(), existing, NOW)
        self.assertEqual(data["labels"][0], "2026-10-01")
        self.assertEqual(data["series"]["h100"]["values"][0], 1)
        self.assertEqual(data["series"]["h100"]["values"][-1], 2)
        self.assertIsNone(data["series"]["h100"]["values"][1])

    def test_partial_refresh_preserves_previous_complete_prices(self):
        existing = spot.build_payload(fixture(), {}, NOW)
        raw = fixture(value=3)
        raw["items"][0]["points"].pop()
        data = spot.build_payload(raw, existing, NOW)
        region = raw["items"][0]["region"]
        self.assertEqual(data["series"]["b300"]["regionValues"][region], [2])

    def test_empty_response_and_basket_changes_are_rejected(self):
        existing = spot.build_payload(fixture(), {}, NOW)
        with self.assertRaisesRegex(ValueError, "No complete"):
            spot.build_payload({"items": []}, existing, NOW)
        existing["series"]["h100"]["regions"] = ["different-region"]
        with self.assertRaisesRegex(ValueError, "basket changed"):
            spot.build_payload(fixture(), existing, NOW)

    def test_pagination_and_30_day_window(self):
        calls = []
        def fetch(params):
            calls.append(dict(params))
            return {"items": [], "snapshotTime": spot.iso_time(NOW),
                    "nextPageToken": "next" if len(calls) == 1 else ""}
        with patch.object(spot, "fetch_json", side_effect=fetch):
            spot.fetch_history(NOW)
        self.assertEqual(len(calls), 2)
        self.assertEqual(calls[1]["pageToken"], "next")
        self.assertGreater(spot.parse_time(calls[0]["filters.startTime"]), NOW - timedelta(days=30))
        self.assertEqual(calls[0]["filters.endTime"], "2026-11-16T00:00:00Z")
        self.assertEqual(calls[0]["aggregation.method"], "METHOD_AVG_PRICE")


if __name__ == "__main__":
    unittest.main()
