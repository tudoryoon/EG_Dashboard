"""Publish valid market datasets even when another collector fails."""
import os

from update_ai_data_batch import run_task


TASKS = [
    ("VIX and credit spread", "update_market_vix.py", ["data/market-vix-data.js"], 600),
    ("Index prices", "update_market_prices.py", ["data/market-price-data.js"], 600),
    ("Valuation", "update_market_valuation.py", ["data/market-valuation-data.js"], 180),
]


def main():
    results = [run_task(*task) for task in TASKS]
    changed = [file for result in results for file in result["changed"]]
    failures = sum(result["status"] == "failed" for result in results)
    summary = "## Market data collection\n\n| Item | Result |\n| --- | --- |\n" + "".join(
        f"| {result['name']} | {result['status']} |\n" for result in results
    )
    print(summary)
    if os.getenv("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as out:
            out.write(summary + "\nSuccessful changes are published before failures are reported.\n")
    if os.getenv("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as out:
            out.write(f"changed_files={' '.join(changed)}\nfailed_count={failures}\n")


if __name__ == "__main__":
    main()
