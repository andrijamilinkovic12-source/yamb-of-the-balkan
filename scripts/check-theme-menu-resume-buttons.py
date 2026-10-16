"""Check the 20 main-menu action PNGs and their active menu wiring."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / "source-assets/theme-menu-resume-buttons-v1/manifest.json").read_text(encoding="utf-8"))
assert len(manifest["items"]) == 20
assert len({(item["theme"], item["role"]) for item in manifest["items"]}) == 20
assert len({item["productionSha256"] for item in manifest["items"]}) == 20


def hex_rgb(code: str) -> tuple[int, int, int]:
    return tuple(int(code[i:i + 2], 16) for i in (1, 3, 5))


def luminance(rgb: tuple[int, int, int]) -> float:
    linear = [component / 255 for component in rgb]
    linear = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in linear]
    return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2]


ink = {
    "dark": ("#fff8eb", "#fff8eb"), "light": ("#392817", "#392817"),
    "medium": ("#fff6f2", "#3a1424"), "winter": ("#173d5b", "#173d5b"),
    "neon": ("#eefefa", "#eefefa"), "amethyst": ("#fff5ef", "#2c183a"),
    "easter": ("#fff8ea", "#3f4a35"), "desert": ("#26170e", "#443027"),
    "moon": ("#f5f5f7", "#242630"), "severna": ("#f5fbff", "#0a2934"),
}


def contrast(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    hi, lo = sorted((luminance(a), luminance(b)), reverse=True)
    return (hi + .05) / (lo + .05)


contrast_failures = []
for item in manifest["items"]:
    source = ROOT / item["source"]
    target = ROOT / item["production"]
    assert source.is_file() and target.is_file(), item
    assert hashlib.sha256(source.read_bytes()).hexdigest() == item["sourceSha256"], source
    assert hashlib.sha256(target.read_bytes()).hexdigest() == item["productionSha256"], target
    with Image.open(target) as image:
        assert image.size == (512, 160) and image.mode == "RGBA", target
        assert image.getpixel((0, 0))[3] == 0, target
        assert image.getpixel((256, 80))[3] >= 245, target
        role_index = 0 if item["role"] == "resume" else 1
        text_color = hex_rgb(ink[item["theme"]][role_index])
        samples = [contrast(text_color, image.getpixel((x, y))[:3])
                   for x in range(230, 283, 13) for y in range(70, 91, 10)]
        if min(samples) < 4.5:
            contrast_failures.append((item["theme"], item["role"], round(min(samples), 2)))

assert not contrast_failures, contrast_failures

html = (ROOT / "www/index.html").read_text(encoding="utf-8")
languages = (ROOT / "www/languages.js").read_text(encoding="utf-8")
css = (ROOT / "www/theme-menu-resume-buttons.css").read_text(encoding="utf-8")
base_css = (ROOT / "www/style.css").read_text(encoding="utf-8")
theme_css = (ROOT / "www/teme.css").read_text(encoding="utf-8")
type_css = (ROOT / "www/theme-main-menu-typography.css").read_text(encoding="utf-8")
game = (ROOT / "www/game.js").read_text(encoding="utf-8")
assert html.count('class="mini-btn btn-resume-inline"') == 2
assert html.count('class="mini-btn btn-new-inline"') == 2
assert 'theme-menu-resume-buttons.css?v=2' in html
assert '🆕' not in html and '▶ NASTAVI' not in html
assert '"menu_new_game": "🆕' not in languages
assert '"menu_resume_inline": "▶' not in languages
assert "...menuButtons" in game and "menu-resume-buttons/" in game
assert ".mini-btn" not in theme_css
assert ".btn-resume-inline {" not in base_css and ".btn-new-inline {" not in base_css
assert ".mini-btn::after" not in base_css
assert "height: 40px;" in base_css and "min-height: 40px;" in base_css
assert "font-family: 'Montserrat'" in type_css and "font-size: .75rem !important;" in type_css
assert "font-weight: 900 !important;" in type_css
assert "Montserrat:wght@200;400;600;700;800;900" in html
for item in manifest["items"]:
    assert item["production"].removeprefix("www/") + "?v=1" in css
assert len(re.findall(r'--menu-resume-button-png:', css)) == 10
assert len(re.findall(r'--menu-new-button-png:', css)) == 10
print("20 unique PNGs, dimensions, alpha, center contrast, labels and startup wiring OK")
