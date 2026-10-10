"""Lock the visually reviewed production PNGs after a dice-face correction pass."""

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SLOTS = {
    "green": ["sniper", "potato"],
    "light": ["close_call", "first_play"],
    "medium": ["godlike", "hazard", "immortal"],
    "neon": ["first_play"],
    "desert": ["first_play"],
    "moon": ["first_play", "godlike", "concrete"],
}


def main() -> None:
    reviewed = []
    for theme, ids in SLOTS.items():
        for icon_id in ids:
            base = "green-soft-clay" if theme == "green" else f"theme-packs/{theme}"
            relative = f"www/assets/{base}/canonical/achievement-trophies/{icon_id}-v1.png"
            if theme == "green":
                relative = f"www/assets/green-soft-clay/canonical/achievement-trophies/{icon_id}-v1.png"
            file = ROOT / relative
            reviewed.append({
                "themeId": theme,
                "slot": icon_id,
                "productionPath": relative,
                "visibleFaces": "not a die" if theme == "moon" and icon_id == "concrete" else "top 1, front 2, right 3",
                "sha256": hashlib.sha256(file.read_bytes()).hexdigest(),
            })
    relative = "www/assets/green-soft-clay/canonical/rules-page-illustrations/multiplayer-competitions-v1.png"
    reviewed.append({
        "themeId": "green",
        "slot": "rules/multiplayer-competitions",
        "productionPath": relative,
        "visibleFaces": "top 1, front 2, right 3",
        "sha256": hashlib.sha256((ROOT / relative).read_bytes()).hexdigest(),
    })
    output = ROOT / "docs/dice-face-corrections.json"
    output.write_text(json.dumps({"schemaVersion": 1, "reviewedOn": "2026-10-09", "assets": reviewed}, indent=2) + "\n", encoding="utf-8")
    print(f"Locked {len(reviewed)} corrected production PNGs in {output.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
