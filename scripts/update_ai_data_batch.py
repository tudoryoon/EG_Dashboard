"""Run AI collectors independently and roll back only a failed collector's outputs."""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TASKS = [
    ("OpenRouter", "update_openrouter_rankings.py", ["data/openrouter-rankings-data.js"], 180),
    ("Token price", "update_token_price_index.py", ["data/token-price-index-data.js"], 180),
    ("Calendar", "update_study_calendar.py", ["data/study-calendar-data.js"], 300),
    ("Public ARR", "update_llm_arr.py", ["data/llm-data.js", "data/llm-arr-public-history.json"], 120),
]


def validate(path: Path) -> None:
    if path.suffix == ".json":
        json.loads(path.read_text(encoding="utf-8"))
    else:
        code = "const fs=require('fs'),vm=require('vm'),w={};vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),{window:w});if(!Object.keys(w).length)throw Error('No data export');"
        subprocess.run(["node", "-e", code, str(path)], check=True, timeout=20)


def run_task(name, script, files, timeout, root=ROOT, execute=subprocess.run, validator=validate):
    before = {file: (root / file).read_bytes() if (root / file).exists() else None for file in files}
    try:
        execute([sys.executable, "-u", str(root / "scripts" / script)], cwd=root, check=True, timeout=timeout)
        changed = []
        for file in files:
            path = root / file
            if path.exists():
                validator(path)
                if path.read_bytes() != before[file]:
                    changed.append(file)
            elif before[file] is not None:
                raise ValueError(f"Collector removed {file}")
        return {"name": name, "status": "updated" if changed else "unchanged", "changed": changed}
    except Exception as error:
        # A collector may fail after writing. Never publish its partial output.
        for file, content in before.items():
            path = root / file
            if content is None:
                path.unlink(missing_ok=True)
            else:
                path.write_bytes(content)
        print(f"::warning::{name} failed; previous data preserved: {error}", flush=True)
        return {"name": name, "status": "failed", "changed": []}


def main():
    results = [run_task(*task) for task in TASKS]
    changed = [file for result in results for file in result["changed"]]
    failures = sum(result["status"] == "failed" for result in results)
    summary = "## AI data collection\n\n| Item | Result |\n| --- | --- |\n" + "".join(f"| {r['name']} | {r['status']} |\n" for r in results)
    print(summary)
    if os.getenv("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as out:
            out.write(summary + "\nSuccessful changes are published before failures are reported.\n")
    if os.getenv("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as out:
            out.write(f"changed_files={' '.join(changed)}\nfailed_count={failures}\n")


if __name__ == "__main__":
    main()
