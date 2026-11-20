#!/usr/bin/env python3
"""Inventory authored wave 2 items. Never imports or publishes to the LMS."""
import argparse
import csv
import io
from pathlib import Path
import re
import sys

PACKS = {
    "school.md": ("SCH", 12),
    "acca.md": ("ACC", 12),
    "vocational.md": ("VOC", 12),
    "languages.md": ("LAN", 12),
    "labs.md": ("LAB", 10),
}
HEADING = re.compile(r"^## (W2-[A-Z]{3}-[0-9]{2}) · (\S.*?)\s*$", re.M)


def render_index(root):
    output = io.StringIO()
    writer = csv.writer(output, lineterminator="\n")
    writer.writerow(("id", "title", "source", "review_status", "release_status"))
    seen = set()
    for name, (prefix, count) in PACKS.items():
        body = (root / name).read_text(encoding="utf-8")
        matches = list(HEADING.finditer(body))
        if len(matches) != count:
            raise ValueError(f"{name}: expected {count} item headings, found {len(matches)}")
        for sequence, match in enumerate(matches, start=1):
            item_id, title = match.groups()
            expected = f"W2-{prefix}-{sequence:02d}"
            if item_id in seen or item_id != expected:
                raise ValueError(f"{name}: expected unique ID {expected}, found {item_id}")
            if title.lstrip().startswith(("=", "+", "-", "@")):
                raise ValueError(f"{name}: unsafe spreadsheet title for {item_id}")
            end = matches[sequence].start() if sequence < len(matches) else len(body)
            if not body[match.end():end].strip():
                raise ValueError(f"{name}: empty lesson body for {item_id}")
            seen.add(item_id)
            writer.writerow((item_id, title, name, "drafted", "not_published"))
    return output.getvalue().encode("utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true", help="Validate checked-in CSV.")
    mode.add_argument("--write", action="store_true", help="Regenerate read-only inventory.")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    output = root / "review-index.csv"
    try:
        expected = render_index(root)
        if args.write:
            output.write_bytes(expected)
        elif output.read_bytes() != expected:
            raise ValueError("review-index.csv differs from authored inventory; regenerate it.")
    except (OSError, ValueError) as exc:
        print(f"Curriculum inventory error: {exc}", file=sys.stderr)
        return 1
    print(f"Validated {sum(count for _, count in PACKS.values())} draft teaching items.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
