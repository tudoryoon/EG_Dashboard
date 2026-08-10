from __future__ import annotations

import json
import re
from pathlib import Path

from fedwatch_data import build_fedwatch_snapshot


OUTPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "market-briefing-data.js"


def parse_market_briefing_payload() -> dict[str, object]:
    text = OUTPUT_PATH.read_text(encoding="utf-8")
    match = re.search(r"window\.marketBriefingData\s*=\s*(\{.*\});\s*$", text, re.S)
    if not match:
        raise RuntimeError(f"Could not parse {OUTPUT_PATH}")
    return json.loads(match.group(1))


def write_market_briefing_payload(payload: dict[str, object]) -> None:
    OUTPUT_PATH.write_text(
        "window.marketBriefingData = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
        newline="\n",
    )


def main() -> None:
    payload = parse_market_briefing_payload()
    previous_fedwatch = payload.get("fedWatch") if isinstance(payload.get("fedWatch"), dict) else {}
    fedwatch = build_fedwatch_snapshot()
    payload["fedWatch"] = fedwatch
    write_market_briefing_payload(payload)
    print(f"Wrote FedWatch snapshot to {OUTPUT_PATH}")
    print(f"FedWatch asOf: {fedwatch.get('asOf')}")
    print(f"Rows: {len(fedwatch.get('rows') or [])}")
    if previous_fedwatch:
        print(f"Previous asOf: {previous_fedwatch.get('asOf')}")


if __name__ == "__main__":
    main()
