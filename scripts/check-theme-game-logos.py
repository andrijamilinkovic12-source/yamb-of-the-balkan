"""Check all ten linked game logos and their splash/login routes."""

import hashlib
import json
from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
THEMES = ("green", "light", "medium", "winter", "neon", "amethyst", "easter", "desert", "moon", "severna")
index = (ROOT / "www" / "index.html").read_text(encoding="utf-8")
game = (ROOT / "www" / "game.js").read_text(encoding="utf-8")
css = (ROOT / "www" / "theme-game-logos.css").read_text(encoding="utf-8")
theme_css = (ROOT / "www" / "teme.css").read_text(encoding="utf-8")
managers = (ROOT / "www" / "managers.js").read_text(encoding="utf-8")
config = (ROOT / "www" / "config.js").read_text(encoding="utf-8")
definitions = json.loads((ROOT / "docs" / "theme-definitions.json").read_text(encoding="utf-8"))
registry = json.loads((ROOT / "docs" / "theme-asset-implementation-map.json").read_text(encoding="utf-8"))
progress = json.loads((ROOT / "docs" / "theme-progress.json").read_text(encoding="utf-8"))
slots = {theme["themeId"]: theme["slots"]["splash-title-soft-clay-v1"] for theme in registry["themes"]}
evidence = {theme["themeId"]: theme["visualEvidence"]["logoPng"] for theme in progress["themes"]}
digests = set()

for theme_id in THEMES:
    if theme_id == "green":
        route = "assets/green-soft-clay/splash-title-soft-clay-v2.png?v=1"
        production = "www/assets/green-soft-clay/splash-title-soft-clay-v2.png"
        master = "source-assets/theme-logo-masters/green/game-logo-master-v2.png"
        assert evidence["dark"] == production, "Green progress logo missing"
    else:
        route = f"assets/theme-packs/{theme_id}/splash-title-soft-clay-v1.png?v=1"
        production = f"www/assets/theme-packs/{theme_id}/splash-title-soft-clay-v1.png"
        master = f"source-assets/theme-logo-masters/{theme_id}/game-logo-master-v1.png"
        assert slots[theme_id]["stage"] == "linked", f"Slot not linked: {theme_id}"
        assert slots[theme_id]["productionPath"] == production, f"Wrong production path: {theme_id}"
        assert slots[theme_id]["masterPath"] == master, f"Wrong master path: {theme_id}"
        assert evidence[theme_id] == production, f"Progress logo missing: {theme_id}"
    assert route in index and route in game, f"Missing startup route: {theme_id}"
    assert (ROOT / master).is_file(), f"Master missing: {theme_id}"
    png = ROOT / production
    if theme_id != "green":
        assert png.stat().st_size == slots[theme_id]["sizeBytes"], f"Byte count mismatch: {theme_id}"
    with Image.open(png) as image:
        assert image.format == "PNG" and image.mode == "RGBA", f"PNG RGBA required: {theme_id}"
        assert image.size == (1672, 941), f"Wrong canvas: {theme_id}"
        alpha = image.getchannel("A")
        assert alpha.getbbox() and alpha.getpixel((0, 0)) == 0, f"Transparency missing: {theme_id}"
    digest = hashlib.sha256(png.read_bytes()).hexdigest()
    assert digest not in digests, f"Duplicated logo: {theme_id}"
    digests.add(digest)

assert 'id="theme-splash-clay-title"' in index
assert "screen.classList.toggle('has-login'" in index
assert "#splash-screen.has-login > .logo-anim .theme-splash-clay-title-png" in css
assert "width: min(90vw, 700px);" in css and "max-height: 32vh;" in css
assert "width: min(90vw, 700px);" in theme_css and "max-height: 32vh;" in theme_css
assert "width: min(88vw, 350px) !important;" in css
assert "max-height: min(24dvh, 190px) !important;" in css
assert not any(old in index for old in ("splash-logo-fallback", "splash-legacy-login-logo", "splash-welcome-brand", "Logo_green.png"))
assert "Logo_green.png" not in managers + config
assert "getActiveGameLogoSource()" in managers and "royal-yamb-title-active" in managers
green = next(theme for theme in definitions["themes"] if theme["id"] == "dark")
assert green["gameLogo"]["activeAsset"] == "www/assets/green-soft-clay/splash-title-soft-clay-v2.png"
print("PASS: 10 distinct RGBA game logos, 1672x941, active routes and one PNG on splash/login without old text logos.")
