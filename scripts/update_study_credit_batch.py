"""Refresh CDS and each selected unsecured bond independently."""
import argparse
import os

from update_ai_data_batch import run_task


def main(backfill=False):
    results = [
        run_task("CRWV bond valuation", "update_study_crwv_bond.py", ["data/study-crwv-bond-data.js"], 180),
        run_task("ORCL bond valuation", "update_study_crwv_bond.py", ["data/study-orcl-bond-data.js"], 180,
                 script_args=["--ticker", "ORCL"]),
        run_task("EQIX bond valuation", "update_study_crwv_bond.py", ["data/study-eqix-bond-data.js"], 180,
                 script_args=["--ticker", "EQIX"]),
        run_task("DTCC CDS", "update_study_cds.py", ["data/study-cds-data.js"], 1080,
                 script_args=["--backfill"] if backfill else []),
    ]
    changed = [file for result in results for file in result["changed"]]
    failures = sum(result["status"] == "failed" for result in results)
    summary = "## CDS and bond collection\n\n| Item | Result |\n| --- | --- |\n" + "".join(
        f"| {result['name']} | {result['status']} |\n" for result in results)
    print(summary)
    if os.getenv("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as out:
            out.write(summary + "\nSuccessful outputs are published before failures are reported.\n")
    if os.getenv("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as out:
            out.write(f"changed_files={' '.join(changed)}\nfailed_count={failures}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--backfill", action="store_true")
    main(backfill=parser.parse_args().backfill)
