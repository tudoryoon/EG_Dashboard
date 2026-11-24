import json
import unittest
from unittest.mock import patch

import update_token_price_index as token_price


def point(day, price):
    return {"date": day, "value": price, "quality": "official-public"}


class TokenPriceIndexTests(unittest.TestCase):
    def test_product_reads_dates_and_precision_from_split_public_chart(self):
        charts = {
            "llm-token": {"key": "expenditure", "points": [{"date": "2026-11-22", "price": 0.632}]},
            "open-llm": {
                "key": "open_expenditure",
                "points": [
                    {"date": "2026-11-22", "price": 0.3399},
                    {"date": "2026-11-23", "price": True},
                    {"date": "2026-11-24", "price": "NaN"},
                    {"date": "2026-11-31", "price": 0.5},
                ],
            },
            "proprietary-llm": {"key": "closed_expenditure", "points": [{"date": "2026-11-22", "price": 2.0918}]},
        }
        payload = "14:" + json.dumps({"charts": charts}) + "\n"
        html = "".join(
            f"<script>self.__next_f.push({json.dumps([1, chunk])})</script>"
            for chunk in (payload[:150], payload[150:])
        )
        self.assertEqual(token_price.parse_public_product_points(html), {
            "overall": [point("2026-11-22", 0.632)],
            "closed": [point("2026-11-22", 2.0918)],
            "open": [point("2026-11-22", 0.3399)],
        })
        with self.assertRaises(RuntimeError):
            token_price.parse_public_product_points(html.replace("expenditure", "different"))

    def test_comparison_uses_shared_day_and_preserves_earlier_observations(self):
        previous = {"series": {
            "overall": [point("2026-11-21", 0.6472), point("2026-11-22", 0.64)],
            "closed": [point("2026-11-22", 2.0918)],
            "open": [{"date": "2026-08-03", "value": 0.66, "quality": "public-chart-reference"}],
        }}
        fresh = {
            "overall": [point("2026-11-22", 0.632), point("2026-11-23", 0.6)],
            "open": [point("2026-11-22", 0.3399), point("2026-11-23", 0.3)],
        }
        payload = token_price.build_payload(previous, fresh)
        self.assertEqual(payload["updatedAt"], "2026-11-23")
        self.assertEqual(payload["series"]["overall"][0], point("2026-11-21", 0.6472))
        self.assertEqual(len(payload["series"]["open"]), 2)
        self.assertEqual(payload["comparison"]["date"], "2026-11-22")
        self.assertEqual([p["value"] for p in payload["comparison"]["values"]], [0.632, 2.0918, 0.3399])
        self.assertEqual(payload["latest"]["closedOpenPremium"], 6.15)
        self.assertEqual(payload["latest"]["open"]["date"], "2026-11-23")

    def test_no_common_day_has_no_comparison_or_premium(self):
        payload = token_price.build_payload({}, {
            "overall": [point("2026-11-22", 0.632)],
            "closed": [point("2026-11-21", 2.0454)],
            "open": [point("2026-11-22", 0.3399)],
        })
        self.assertEqual(payload["comparison"], {"date": None, "values": []})
        self.assertIsNone(payload["latest"]["closedOpenPremium"])

    @patch.object(token_price, "fetch_html", side_effect=["portal", TimeoutError("unreachable")])
    @patch.object(token_price, "parse_public_portal_points", return_value=[point("2026-11-23", 0.6)])
    def test_product_outage_can_still_publish_overall(self, portal, fetch):
        self.assertEqual(token_price.collect_public_points(), {"overall": [point("2026-11-23", 0.6)]})
        portal.assert_called_once_with("portal")
        self.assertEqual([call.args[0] for call in fetch.call_args_list], [token_price.PORTAL_URL, token_price.PRODUCT_URL])


if __name__ == "__main__":
    unittest.main()
