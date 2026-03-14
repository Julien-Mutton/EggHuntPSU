#!/usr/bin/env python3
"""
Sets extra_points to 5 for every reward link in an exported egg JSON file.
Usage: python fix_link_points.py <input.json> [output.json]
If output is omitted, overwrites the input file.
"""

import json
import sys


def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <input.json> [output.json]")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else input_path

    with open(input_path, "r") as f:
        eggs = json.load(f)

    changed = 0
    for egg in eggs:
        for link in egg.get("reward_links", []):
            if link.get("extra_points") != 5:
                link["extra_points"] = 5
                changed += 1

    with open(output_path, "w") as f:
        json.dump(eggs, f, indent=2)

    print(f"Done. {len(eggs)} eggs processed, {changed} link(s) updated.")
    print(f"Written to {output_path}")


if __name__ == "__main__":
    main()
