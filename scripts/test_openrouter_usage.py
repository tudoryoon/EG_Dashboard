import unittest
from unittest.mock import patch

import update_openrouter_rankings as usage


def raw_row(model, tokens, variant="standard", suffix="", reasoning=0):
    return {"model_permaslug": model, "variant_permaslug": model + suffix,
            "variant": variant, "date": "2026-10-27 00:00:00",
            "total_prompt_tokens": tokens - 10, "total_completion_tokens": 10,
            "total_native_tokens_reasoning": reasoning, "count": 2}


class WeeklyUsageTests(unittest.TestCase):
    def test_batch_metadata_does_not_overwrite_standard_canonical_name(self):
        catalog = {"data": [
            {"id": "openai/test:batch", "canonical_slug": "openai/test-20260101", "name": "GPT Test (batch)"},
            {"id": "openai/test", "canonical_slug": "openai/test-20260101", "name": "GPT Test"},
        ]}
        with patch.object(usage, "fetch_json", return_value=catalog):
            names = usage.build_model_name_map()
        self.assertEqual(names["openai/test-20260101"], "GPT Test")
        self.assertEqual(names["openai/test:batch"], "GPT Test (batch)")

    def test_uses_prompt_plus_completion_without_double_counting_reasoning(self):
        row = usage.normalize_leaderboard_row(raw_row("openai/test", 100, reasoning=10), 1, {})
        self.assertEqual(row["tokens"], 100)
        self.assertEqual(row["reasoningTokens"], 10)

    def test_all_models_including_below_rank_100_and_variants_are_summed(self):
        raw = [raw_row(f"openai/test-{i}", 100) for i in range(105)]
        raw += [raw_row("openai/test-0", 50, "free", ":free"), raw_row("anthropic/test", 200)]
        rows = [usage.normalize_leaderboard_row(r, i + 1, {}) for i, r in enumerate(raw)]
        data = usage.build_weekly_usage(rows, {}, {}, {})
        company = next(c for c in data["companies"] if c["key"] == "openai")
        self.assertEqual(company["tokens"], 10550)
        self.assertEqual(company["modelCount"], 106)
        self.assertEqual(sum(m["tokens"] for m in company["models"]), company["tokens"])
        self.assertEqual(data["totalTokens"], 10750)
        self.assertEqual(data["windowStart"], "2026-10-21")
        self.assertEqual(data["asOf"], "2026-10-27")
        self.assertTrue(any(m["key"].endswith(":free") for m in company["models"]))

    def test_historical_union_not_only_latest_top_models_and_missing_not_zero(self):
        raw = {"data": {"data": [
            {"x": "2026-10-19", "ys": {"openai/old": 100, "Others": 20}},
            {"x": "2026-10-26", "ys": {"openai/new": 200, "Others": 30}},
        ], "cachedAt": 123}}
        data = usage.weekly_history(raw)
        self.assertEqual(data["series"]["openai/old"], [100, None])
        self.assertEqual(data["series"]["openai/new"], [None, 200])
        self.assertNotIn("Others", data["series"])
        self.assertEqual(data["cachedAt"], 123)

    def test_empty_source_does_not_create_zero_company(self):
        with self.assertRaises(ValueError):
            usage.build_weekly_usage([], {}, {}, {})

    def test_collection_passes_full_weekly_rows_before_leaderboard_truncation(self):
        raw = [raw_row(f"openai/test-{i}", 100) for i in range(105)]
        chart = {"data": {"data": [{"x": "2026-10-26", "ys": {"openai/test-0": 100}}]}}

        def fetch(path, params=None, **kwargs):
            if path == usage.DAILY_USAGE_ENDPOINT:
                raise RuntimeError("No API key")
            if path.endswith("/models"):
                return {"data": raw}
            return chart

        with patch.object(usage, "load_existing_payload", return_value={}), \
             patch.object(usage, "build_model_name_map", return_value={}), \
             patch.object(usage, "fetch_json", side_effect=fetch):
            data = usage.build_payload()
        self.assertEqual(len(data["leaderboards"]["week"]), 100)
        self.assertEqual(data["weeklyUsage"]["companies"][0]["tokens"], 10500)

    def test_weekly_endpoint_failure_preserves_last_good_usage(self):
        previous = {"asOf": "2026-10-26", "companies": [{"key": "openai", "tokens": 123}]}
        chart = {"data": {"data": []}}

        def fetch(path, params=None, **kwargs):
            if path.endswith("/author-market-share"):
                raise RuntimeError("offline")
            if path == usage.DAILY_USAGE_ENDPOINT:
                raise RuntimeError("No API key")
            if path.endswith("/models"):
                return {"data": [raw_row("openai/test", 100)]}
            return chart

        with patch.object(usage, "load_existing_payload", return_value={"weeklyUsage": previous}), \
             patch.object(usage, "build_model_name_map", return_value={}), \
             patch.object(usage, "fetch_json", side_effect=fetch):
            data = usage.build_payload()
        self.assertEqual(data["weeklyUsage"]["asOf"], "2026-10-26")
        self.assertEqual(data["weeklyUsage"]["companies"][0]["tokens"], 123)
        self.assertTrue(data["weeklyUsage"]["stale"])


if __name__ == "__main__":
    unittest.main()
