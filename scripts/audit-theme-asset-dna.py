"""Flag cross-theme PNGs with suspiciously similar visible silhouettes.

This is a review aid, not proof of originality. It reads only production paths
already recorded in the theme implementation map and writes a JSON report.
"""

from __future__ import annotations

import json
from itertools import combinations
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MAP = json.loads((ROOT / "docs/theme-asset-implementation-map.json").read_text(encoding="utf-8"))
THEMES = MAP["themes"]


def silhouette(path):
    with Image.open(path) as image:
        alpha = image.convert("RGBA").getchannel("A")
        alpha.thumbnail((96, 96), Image.Resampling.LANCZOS)
        alpha = alpha.resize((96, 96), Image.Resampling.LANCZOS)
        return np.asarray(alpha) >= 32


def iou(a, b):
    return round(float(np.logical_and(a, b).sum() / max(1, np.logical_or(a, b).sum())), 4)


def main():
    grouped = {}
    for theme in THEMES:
        for slot_id, record in theme["slots"].items():
            path = record.get("productionPath")
            if record.get("stage") == "defined" or not path:
                continue
            full = ROOT / path
            if full.exists() and full.suffix.lower() == ".png":
                grouped.setdefault(slot_id, []).append((theme["themeId"], path, silhouette(full)))
    findings = []
    for slot_id, records in grouped.items():
        for left, right in combinations(records, 2):
            similarity = iou(left[2], right[2])
            if similarity >= .86:
                findings.append({
                    "slotId": slot_id, "leftTheme": left[0], "rightTheme": right[0],
                    "alphaIoU": similarity, "leftPath": left[1], "rightPath": right[1]
                })
    findings.sort(key=lambda item: (-item["alphaIoU"], item["slotId"], item["leftTheme"]))
    report = {
        "method": "96px alpha mask IoU for same semantic slot across the nine target themes; threshold 0.86",
        "limitation": "High IoU means similar silhouette, not necessarily copying; low IoU does not prove original design. Inspect both images and source history.",
        "auditedSlots": len(grouped),
        "pairsFlagged": len(findings),
        "findings": findings,
    }
    path = ROOT / "docs/theme-asset-dna-silhouette-audit.json"
    path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Audited {len(grouped)} populated slots; {len(findings)} similar silhouette pairs")
    for item in findings[:35]:
        print(item["alphaIoU"], item["slotId"], item["leftTheme"], item["rightTheme"])


if __name__ == "__main__":
    main()
