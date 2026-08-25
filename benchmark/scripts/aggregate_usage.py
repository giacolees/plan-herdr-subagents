#!/usr/bin/env python3
"""Aggregate Pi assistant usage and tool results from one or more session JSONL files."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any

USAGE_FIELDS = (
    "input",
    "output",
    "cacheRead",
    "cacheWrite",
    "reasoning",
    "totalTokens",
)


def parse_timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def read_session(path: Path) -> list[dict[str, Any]]:
    try:
        lines = path.read_text().splitlines()
    except OSError as error:
        raise ValueError(f"Cannot read {path}: {error}") from error

    entries: list[dict[str, Any]] = []
    for line_number, line in enumerate(lines, start=1):
        if not line.strip():
            continue
        try:
            entries.append(json.loads(line))
        except json.JSONDecodeError as error:
            raise ValueError(
                f"Invalid JSON in {path}:{line_number}: {error.msg}"
            ) from error
    return entries


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sessions", nargs="+", type=Path, help="Pi session JSONL files")
    args = parser.parse_args()

    totals: Counter[str] = Counter()
    tool_names: Counter[str] = Counter()
    assistant_turns = 0
    timestamps: list[datetime] = []

    for path in args.sessions:
        try:
            entries = read_session(path)
        except ValueError as error:
            parser.error(str(error))

        for entry in entries:
            timestamp = entry.get("timestamp")
            if isinstance(timestamp, str):
                timestamps.append(parse_timestamp(timestamp))

            message = entry.get("message", {})
            if message.get("role") == "assistant":
                assistant_turns += 1
                usage = message.get("usage", {})
                for field in USAGE_FIELDS:
                    totals[field] += usage.get(field, 0) or 0
                totals["cost"] += usage.get("cost", {}).get("total", 0) or 0
            elif message.get("role") == "toolResult":
                tool_names[message.get("toolName", "unknown")] += 1

    result = {
        "assistantTurns": assistant_turns,
        "toolResults": sum(tool_names.values()),
        "toolNames": dict(tool_names),
        "elapsedSeconds": (
            (max(timestamps) - min(timestamps)).total_seconds() if timestamps else 0
        ),
        **{field: totals[field] for field in USAGE_FIELDS},
        "cost": totals["cost"],
    }
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
