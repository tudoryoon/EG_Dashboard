from __future__ import annotations

import importlib.util
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_FILES = [
    "data/market-briefing-data.js",
    "data/market-price-data.js",
]
COMMIT_FILES = DATA_FILES + ["index.html"]
PIP_PACKAGES = [
    "pandas",
    "yfinance",
    "requests",
    "lxml",
    "html5lib",
    "openpyxl",
    "xlrd",
]
IMPORT_CHECKS = {
    "pandas": "pandas",
    "yfinance": "yfinance",
    "requests": "requests",
    "lxml": "lxml",
    "html5lib": "html5lib",
    "openpyxl": "openpyxl",
    "xlrd": "xlrd",
}


def run(command: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    print("+ " + " ".join(command), flush=True)
    return subprocess.run(command, cwd=REPO_ROOT, text=True, check=check)


def ensure_dependencies() -> None:
    missing = [
        package
        for package, import_name in IMPORT_CHECKS.items()
        if importlib.util.find_spec(import_name) is None
    ]
    if missing:
        print(f"Installing missing Python packages: {', '.join(missing)}", flush=True)
        run([sys.executable, "-m", "pip", "install", *PIP_PACKAGES])
    else:
        print("Python dependencies already available.", flush=True)


def has_changes(paths: list[str]) -> bool:
    result = run(["git", "diff", "--quiet", "--", *paths], check=False)
    return result.returncode != 0


def main() -> int:
    ensure_dependencies()
    run(["git", "pull", "--ff-only", "origin", "main"])
    run([sys.executable, "scripts/update_market_prices.py"])
    run([sys.executable, "scripts/update_market_briefing.py"])

    if not has_changes(DATA_FILES):
        print("No market briefing or market price changes detected.")
        return 0

    run([sys.executable, "scripts/bump_data_cache_versions.py", *DATA_FILES])
    run(["git", "config", "user.name", "github-actions[bot]"])
    run(["git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"])
    run(["git", "add", *COMMIT_FILES])
    commit = run(["git", "commit", "-m", "Update market briefing and market prices"], check=False)
    if commit.returncode != 0:
        print("No commit created after staging; exiting.")
        return 0
    run(["git", "pull", "--rebase", "origin", "main"])
    run(["git", "push", "origin", "main"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
