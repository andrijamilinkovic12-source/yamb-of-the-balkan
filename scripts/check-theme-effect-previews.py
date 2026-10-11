"""Verify all 144 individually illustrated Treasury effect previews."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
THEMES = ("light", "medium", "winter", "neon", "amethyst", "easter", "desert", "moon", "severna")
ROLES = ("confetti", "gold-rain", "wedding", "thunder", "fireworks", "bubbles", "cosmic-dust", "dragon-fire", "royal-yamb",
         "fireflies", "ice-age", "black-hole", "supernova", "neon-pulse", "drones", "ufo-abduction")
CLASSES = ("confetti", "gold_rain", "balkan", "thunder", "fireworks", "bubbles", "cosmic-dust", "dragon-fire", "royal-yamb",
           "fireflies", "glass", "black-hole", "supernova", "neon", "drones", "ufo-abduction")


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    mapping = json.loads((ROOT / "docs/theme-asset-implementation-map.json").read_text(encoding="utf-8"))
    css = (ROOT / "www/theme-effect-previews.css").read_text(encoding="utf-8")
    manager = (ROOT / "www/managers.js").read_text(encoding="utf-8")
    page = (ROOT / "www/index.html").read_text(encoding="utf-8")
    catalog = json.loads((ROOT / "docs/theme-asset-role-catalog.json").read_text(encoding="utf-8"))
    green_manifest = json.loads((ROOT / "source-assets/green-soft-clay-canonical/treasury-effect-previews/manifest.json").read_text(encoding="utf-8"))
    dice_audit = json.loads((ROOT / "docs/theme-effect-dice-visual-audit.json").read_text(encoding="utf-8"))
    audited_ufo = {item["themeId"]: item for item in dice_audit["ufoAbduction"]}
    assert set(audited_ufo) == set(THEMES)
    assert 'theme-effect-previews.css?v=6' in page
    assert 'canonicalEffectPreview ?' in manager
    assert catalog["requiredPngCountPerTheme"] == 188
    assert len(green_manifest["catalog"]) == 16
    for role in ("confetti", "gold-rain"):
        item = next(entry for entry in green_manifest["catalog"] if entry["id"] == role)
        assert digest(ROOT / item["runtime"]) == item["runtimeSha256"]
        assert digest(ROOT / item["master"]) == item["masterSha256"]
        assert f'url("assets/green-soft-clay/canonical/treasury-effect-previews/preview-{role}-v1.png?v=2")' in css
    by_role = {role: set() for role in ROLES}
    all_hashes = set()
    for theme in THEMES:
        manifest = json.loads((ROOT / f"source-assets/theme-icon-packs/{theme}/treasury-effect-previews-v1/manifest.json").read_text(encoding="utf-8"))
        assert manifest["version"] == 2
        assert [item["id"] for item in manifest["catalog"]] == list(ROLES)
        slots = next(item["slots"] for item in mapping["themes"] if item["themeId"] == theme)
        own = set()
        for role, css_class, item in zip(ROLES, CLASSES, manifest["catalog"]):
            path = ROOT / item["runtime"]
            master = ROOT / item["master"]
            generated = ROOT / item["generatedSource"]
            assert path.is_file() and master.is_file() and generated.is_file()
            assert item["generatedSource"].startswith(f"source-assets/theme-icon-packs/{theme}/treasury-effect-previews-v2/")
            assert item["master"].endswith("-master-v2.png")
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
            assert f"body.{theme}-theme #riznica-screen#riznica-screen .effect-preview-box.prev-{css_class}::before" in css
            cache_version = 5 if role == "ufo-abduction" else (3 if role == "wedding" else 2)
            assert f'url("assets/theme-packs/{theme}/canonical/treasury-effect-previews/preview-{role}-v1.png?v={cache_version}")' in css
            if role == "ufo-abduction":
                visual_audit = audited_ufo[theme]
                assert visual_audit["generatedSourceSha256"] == digest(generated), theme
                assert visual_audit["runtimeSha256"] == digest(path), theme
                assert visual_audit["visibleFaces"] == [1, 2, 3], theme
                assert visual_audit["onePipLayout"] == "single-center", theme
                assert visual_audit["twoPipLayout"] == "opposite-diagonal-corners", theme
                assert visual_audit["threePipLayout"] == "diagonal-corners-and-center", theme
            own.add(item["runtimeSha256"])
            by_role[role].add(item["runtimeSha256"])
            assert item["runtimeSha256"] not in all_hashes, f"Reused image: {theme}/{role}"
            all_hashes.add(item["runtimeSha256"])
        assert len(own) == 16, theme
    assert all(len(hashes) == 9 for hashes in by_role.values())
    print("PASS: 144 separate transparent 384x256 PNG previews, unique hashes, linked map and CSS/room consumers")


if __name__ == "__main__":
    main()
