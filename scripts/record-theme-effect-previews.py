"""Connect the nine themed Treasury preview packs and record their evidence."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DEFS = json.loads((ROOT / "docs/theme-definitions.json").read_text(encoding="utf-8"))
MAP_PATH = ROOT / "docs/theme-asset-implementation-map.json"
PROGRESS_PATH = ROOT / "docs/theme-progress.json"
MAPPING = {
    "wedding": "balkan", "thunder": "thunder", "fireworks": "fireworks",
    "bubbles": "bubbles", "cosmic-dust": "cosmic-dust", "dragon-fire": "dragon-fire",
    "royal-yamb": "royal-yamb", "fireflies": "fireflies", "ice-age": "glass",
    "black-hole": "black-hole", "supernova": "supernova", "neon-pulse": "neon",
    "drones": "drones", "ufo-abduction": "ufo-abduction",
}


def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def rgb(hex_value):
    return tuple(int(hex_value[i:i+2], 16) for i in (1, 3, 5))


def mix(a, b, t):
    return "#" + "".join(f"{round(x*(1-t)+y*t):02x}" for x, y in zip(rgb(a), rgb(b)))


def main():
    implementation = json.loads(MAP_PATH.read_text(encoding="utf-8"))
    progress = json.loads(PROGRESS_PATH.read_text(encoding="utf-8"))
    css = ["/* Nine unique Treasury effect preview packs; the Green pack remains unchanged. */"]
    selectors = ",\n".join(f"body.{t['id']}-theme #riznica-screen .effect-preview-box:is({', '.join('.prev-'+v for v in MAPPING.values())})" for t in DEFS["themes"] if t["id"] != "dark")
    before_selectors = ",\n".join(f"body.{t['id']}-theme #riznica-screen .effect-preview-box:is({', '.join('.prev-'+v for v in MAPPING.values())})::before" for t in DEFS["themes"] if t["id"] != "dark")
    after_selectors = ",\n".join(f"body.{t['id']}-theme #riznica-screen .effect-preview-box:is({', '.join('.prev-'+v for v in MAPPING.values())})::after" for t in DEFS["themes"] if t["id"] != "dark")
    css.append(selectors + " { isolation: isolate; border: 0; overflow: hidden; }")
    css.append(before_selectors + " { content: ''; display: block; position: absolute; inset: 2px; width: auto; height: auto; background-color: transparent; background-position: center; background-repeat: no-repeat; background-size: contain; border: 0; box-shadow: none; text-shadow: none; color: transparent; opacity: 1; transform: none; animation: none; z-index: 2; }")
    css.append(after_selectors + " { content: none; display: none; animation: none; }")
    for theme in (t for t in DEFS["themes"] if t["id"] != "dark"):
        tid = theme["id"]
        manifest_path = ROOT / f"source-assets/theme-icon-packs/{tid}/treasury-effect-previews-v1/manifest.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        slots = implementation["themes"][[item["themeId"] for item in implementation["themes"]].index(tid)]["slots"]
        palette = theme["iconDna"]["colorsHex"]
        surface = mix(palette["shade"], palette["body"], .18 if tid in ("light", "easter") else .32)
        css.append(f"body.{tid}-theme #riznica-screen .effect-preview-box:is({', '.join('.prev-'+v for v in MAPPING.values())}) {{ background: {surface}; box-shadow: inset 0 2px 8px {palette['shade']}66; }}")
        for item in manifest["catalog"]:
            role = item["id"]
            path = ROOT / item["runtime"]
            with Image.open(path) as im:
                assert im.size == (384, 256) and im.mode == "RGBA", path
                bounds = im.getchannel("A").point(lambda a: 255 if a >= 16 else 0).getbbox()
            assert bounds, path
            item["opticalBoundsPx"] = list(bounds)
            item["sizeBytes"] = path.stat().st_size
            slot = f"canonical/treasury-effect-previews/preview-{role}-v1"
            slots[slot] = {"stage": "linked", "productionPath": item["runtime"],
                           "masterPath": item["master"],
                           "consumerRefs": ["www/managers.js:Treasury effect card", "www/theme-effect-previews.css:themed preview", "www/index.html:stylesheet"],
                           "opticalBoundsPx": list(bounds), "sizeBytes": path.stat().st_size}
            css.append(f'body.{tid}-theme #riznica-screen .effect-preview-box.prev-{MAPPING[role]}::before {{ background-image: url("assets/theme-packs/{tid}/canonical/treasury-effect-previews/preview-{role}-v1.png?v=1"); }}')
        write(manifest_path, manifest)
        slots.update(sorted(slots.items()))
        state = next(item for item in progress["themes"] if item["themeId"] == tid)
        state["assetUsageAudit"]["measuredThemeBoundsCount"] = sum(bool(item["opticalBoundsPx"]) for item in slots.values())
    (ROOT / "www/theme-effect-previews.css").write_text("\n".join(css) + "\n", encoding="utf-8")
    progress["updatedOn"] = "2026-10-10"
    progress["workState"] = "theme-effect-previews-linked-static-checked"
    progress["activeWorkPackage"] = "Devet tema imaju po 14 zasebnih PNG pregleda efekata u Riznici, ukupno 126. Povezani su u CSS i zabelezeni u mapi; korisnicki vizuelni izbor i Android WebView provera ostaju otvoreni."
    progress["effectPreviewEvidence"] = {"review": "docs/theme-effect-previews-review.html",
                                         "generator": "scripts/build-theme-effect-previews.py",
                                         "recorder": "scripts/record-theme-effect-previews.py",
                                         "runtimeVisualStatus": "pending Android QA and user review"}
    write(MAP_PATH, implementation)
    write(PROGRESS_PATH, progress)
    print("Recorded 126 linked effect previews")


if __name__ == "__main__":
    main()
