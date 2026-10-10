"""Verify all 126 linked Treasury effect previews and their consumer mapping."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
THEMES = ("light", "medium", "winter", "neon", "amethyst", "easter", "desert", "moon", "severna")
ROLES = ("wedding", "thunder", "fireworks", "bubbles", "cosmic-dust", "dragon-fire", "royal-yamb",
         "fireflies", "ice-age", "black-hole", "supernova", "neon-pulse", "drones", "ufo-abduction")
CLASSES = ("balkan", "thunder", "fireworks", "bubbles", "cosmic-dust", "dragon-fire", "royal-yamb",
           "fireflies", "glass", "black-hole", "supernova", "neon", "drones", "ufo-abduction")


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    mapping = json.loads((ROOT / "docs/theme-asset-implementation-map.json").read_text(encoding="utf-8"))
    css = (ROOT / "www/theme-effect-previews.css").read_text(encoding="utf-8")
    manager = (ROOT / "www/managers.js").read_text(encoding="utf-8")
    game = (ROOT / "www/game.js").read_text(encoding="utf-8")
    page = (ROOT / "www/index.html").read_text(encoding="utf-8")
    assert 'theme-effect-previews.css?v=1' in page
    assert 'canonicalEffectPreview ?' in manager
    assert 'treasuryEffectPreviews' in game
    by_role = {role: set() for role in ROLES}
    for theme in THEMES:
        manifest = json.loads((ROOT / f"source-assets/theme-icon-packs/{theme}/treasury-effect-previews-v1/manifest.json").read_text(encoding="utf-8"))
        assert [item["id"] for item in manifest["catalog"]] == list(ROLES)
        slots = next(item["slots"] for item in mapping["themes"] if item["themeId"] == theme)
        own = set()
        for role, css_class, item in zip(ROLES, CLASSES, manifest["catalog"]):
            path = ROOT / item["runtime"]
            master = ROOT / item["master"]
            assert path.is_file() and master.is_file()
            assert item["runtimeSha256"] == digest(path) and item["masterSha256"] == digest(master)
            with Image.open(master) as source:
                assert source.size == (768, 512) and source.mode == "RGBA"
            with Image.open(path) as image:
                assert image.size == (384, 256) and image.mode == "RGBA"
                alpha = image.getchannel("A")
                assert alpha.getextrema()[0] == 0 and alpha.getextrema()[1] >= 240
                bounds = alpha.point(lambda a: 255 if a >= 16 else 0).getbbox()
                assert bounds and list(bounds) == item["opticalBoundsPx"]
            assert path.stat().st_size == item["sizeBytes"]
            entry = slots[f"canonical/treasury-effect-previews/preview-{role}-v1"]
            assert entry["stage"] == "linked" and entry["productionPath"] == item["runtime"]
            assert entry["masterPath"] == item["master"] and entry["opticalBoundsPx"] == list(bounds)
            assert f"body.{theme}-theme #riznica-screen .effect-preview-box.prev-{css_class}::before" in css
            assert f'url("assets/theme-packs/{theme}/canonical/treasury-effect-previews/preview-{role}-v1.png?v=1")' in css
            own.add(item["runtimeSha256"])
            by_role[role].add(item["runtimeSha256"])
        assert len(own) == 14, theme
    assert all(len(hashes) == 9 for hashes in by_role.values())
    print("PASS: 126 transparent 384x256 PNG previews, unique hashes, linked map and CSS/room consumers")


if __name__ == "__main__":
    main()
