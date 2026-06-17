from __future__ import annotations

import importlib.util
import os
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_FILES = [
    "data/market-briefing-data.js",
    "data/market-price-data.js",
]
COMMIT_FILES = DATA_FILES + ["index.html"]
MAX_UPDATE_ATTEMPTS = 2
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
PROXY_ENV_KEYS = [
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "ALL_PROXY",
    "http_proxy",
    "https_proxy",
    "all_proxy",
    "GIT_PROXY_COMMAND",
]


def run(command: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    if command and command[0] == "git":
        command = [
            "git",
            "-c",
            "http.sslBackend=openssl",
            "-c",
            "http.proxy=",
            "-c",
            "https.proxy=",
            "-c",
            "user.name=github-actions[bot]",
            "-c",
            "user.email=41898282+github-actions[bot]@users.noreply.github.com",
            *command[1:],
        ]
    print("+ " + " ".join(command), flush=True)
    env = os.environ.copy()
    env["GIT_TERMINAL_PROMPT"] = "0"
    env["GCM_INTERACTIVE"] = "Never"
    return subprocess.run(command, cwd=REPO_ROOT, text=True, check=check, env=env)


def scrub_proxy_environment() -> None:
    removed = [key for key in PROXY_ENV_KEYS if os.environ.pop(key, None)]
    if removed:
        print(f"Removed proxy environment variables: {', '.join(removed)}", flush=True)


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


def ensure_clean_worktree() -> None:
    result = subprocess.run(
        [
            "git",
            "-c",
            "http.sslBackend=openssl",
            "-c",
            "http.proxy=",
            "-c",
            "https.proxy=",
            "-c",
            "user.name=github-actions[bot]",
            "-c",
            "user.email=41898282+github-actions[bot]@users.noreply.github.com",
            "status",
            "--porcelain",
        ],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.stdout.strip():
        raise RuntimeError("Worktree is not clean before Daily Briefing update; refusing to overwrite local changes.")


def reset_to_origin_main() -> None:
    run(["git", "rebase", "--abort"], check=False)
    run(["git", "fetch", "origin", "main"])
    run(["git", "reset", "--hard", "origin/main"])


def refresh_and_commit() -> bool:
    run(["git", "pull", "--ff-only", "origin", "main"])
    run([sys.executable, "scripts/update_market_prices.py"])
    run([sys.executable, "scripts/update_market_briefing.py"])

    if not has_changes(DATA_FILES):
        print("No market briefing or market price changes detected.")
        return False

    run([sys.executable, "scripts/bump_data_cache_versions.py", *DATA_FILES])
    run(["git", "add", *COMMIT_FILES])
    commit = run([
        "git",
        "-c",
        "user.name=github-actions[bot]",
        "-c",
        "user.email=41898282+github-actions[bot]@users.noreply.github.com",
        "commit",
        "-m",
        "Update market briefing and market prices",
    ], check=False)
    if commit.returncode != 0:
        print("No commit created after staging; exiting.")
        return False
    return True


def main() -> int:
    scrub_proxy_environment()
    ensure_dependencies()
    ensure_clean_worktree()

    for attempt in range(1, MAX_UPDATE_ATTEMPTS + 1):
        if attempt > 1:
            print(f"Retrying Daily Briefing update from fresh origin/main state, attempt {attempt}.", flush=True)
            reset_to_origin_main()

        has_commit = refresh_and_commit()
        if not has_commit:
            return 0

        rebase = run(["git", "pull", "--rebase", "origin", "main"], check=False)
        if rebase.returncode != 0:
            print("Rebase failed after commit; will retry from fresh origin/main if attempts remain.", flush=True)
            continue

        push = run(["git", "push", "origin", "main"], check=False)
        if push.returncode == 0:
            return 0
        print("Push failed after rebase; will retry from fresh origin/main if attempts remain.", flush=True)

    print("Daily Briefing update failed after retry attempts.", flush=True)
    reset_to_origin_main()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
