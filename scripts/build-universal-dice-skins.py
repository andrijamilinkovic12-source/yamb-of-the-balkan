"""Prepare all pip-free catalog dice faces, including theme gift skins."""

from collections import deque
from hashlib import sha256
from pathlib import Path
from html import escape
from shutil import copyfile
import json
import re

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
CONFIG = (ROOT / "www/config.js").read_text(encoding="utf-8")
CATALOG = re.search(r"SKINS:\s*\[(.*?)\]\s*,\s*EFFECTS:", CONFIG, re.S)
assert CATALOG, "SHOP_DATA.SKINS catalog not found"
IDS = re.findall(r"\bid:\s*'([^']+)'", CATALOG.group(1))
assert len(IDS) == len(set(IDS)) == 48
THEME_NAMES = {theme["id"]: theme["nameSr"] for theme in json.loads((ROOT / "docs/theme-definitions.json").read_text(encoding="utf-8"))["themes"]}

THEME_GIFTS = {
    "theme_light_gold": "light", "theme_dark_cherry": "medium", "theme_blue_ocean": "winter",
    "theme_neon_cyber": "neon", "theme_royal_amethyst": "amethyst",
    "theme_easter": "easter", "theme_desert": "desert",
    "theme_moonlight": "moon", "theme_northern_nebula": "severna",
}
assert set(THEME_GIFTS).issubset(IDS)

CLAY = set("bronze_antique bronze_patina bronze_steampunk bronze_spartan bronze_forge silver_moonlight silver_knight gold_ancient wood obsidian leather green_clay magma theme_dark_cherry theme_royal_amethyst theme_desert theme_moonlight".split())
PILOTS = {
    "green_clay": ("source-assets/green-dice-pilot/green-clay-face-master-v1.png", "www/assets/green-dice-pilot/green-clay-face-v1.png"),
    "bronze_antique": ("source-assets/green-dice-pilot/bronze-antique-face-master-v1.png", "www/assets/green-dice-pilot/bronze-antique-face-v1.png"),
}
LIGHT_PIPS = set("classic_red classic_blue classic_black bronze_patina bronze_steampunk bronze_spartan bronze_forge silver_knight silver_titanium gold_ancient carbon obsidian leather neon_blue neon_pink neon_green stealth glass_ruby glass_emerald glass_sapphire green_clay magma galaxy".split())
PIP_COLORS = {skin: ("#f6f3e9" if skin in LIGHT_PIPS else "#20303a") for skin in IDS}
PIP_COLORS.update({"green_clay": "#edf3df", "bronze_antique": "#fff1d8", "magma": "#f6eadc", "retro": "#e9ead2", "neon_blue": "#b2f5ff", "neon_pink": "#ffd0e4", "neon_green": "#d1ffe0", "glass_clear": "#20303a"})
PIP_COLORS.update({"theme_light_gold": "#392817", "theme_dark_cherry": "#431720", "theme_blue_ocean": "#173D5B", "theme_neon_cyber": "#56E5D2", "theme_royal_amethyst": "#3C284B", "theme_easter": "#3D4434", "theme_desert": "#443027", "theme_moonlight": "#252934", "theme_northern_nebula": "#0B1830"})

OUTPUT = ROOT / "www/assets/dice-skins-v1"
OUTPUT.mkdir(parents=True, exist_ok=True)
MANIFEST = ROOT / "source-assets/dice-skins-v1/manifest.json"


def connected_face(image):
    """Keep the single die silhouette; remove detached generation speckles."""
    image = image.convert("RGBA").resize((384, 384), Image.Resampling.LANCZOS)
    alpha = np.asarray(image.getchannel("A"))
    visible = alpha >= 72
    seed = (192, 192)
    assert visible[seed], "Die has a transparent center"
    found = np.zeros((384, 384), dtype=bool)
    found[seed] = True
    queue = deque([seed])
    while queue:
        y, x = queue.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < 384 and 0 <= nx < 384 and visible[ny, nx] and not found[ny, nx]:
                found[ny, nx] = True
                queue.append((ny, nx))
    mask = Image.fromarray((found * 255).astype("uint8"), "L").filter(ImageFilter.MaxFilter(9))
    kept = np.asarray(mask) > 0
    pixels = np.array(image)
    pixels[..., 3] = np.where(kept & (pixels[..., 3] >= 26), pixels[..., 3], 0)
    image = Image.fromarray(pixels, "RGBA")
    bounds = image.getchannel("A").point(lambda a: 255 if a >= 128 else 0).getbbox()
    assert bounds, "Die face missing"
    crop = image.crop(bounds)
    size = tuple(round(n * 348 / max(crop.size)) for n in crop.size)
    crop = crop.resize(size, Image.Resampling.LANCZOS)
    face = Image.new("RGBA", (384, 384))
    face.alpha_composite(crop, ((384 - size[0]) // 2, (384 - size[1]) // 2))
    return face


def add_pips(canvas, x, y, color, count=5, size=64):
    positions = {1: [(1, 1)], 2: [(2, 0), (0, 2)], 3: [(2, 0), (1, 1), (0, 2)], 4: [(0, 0), (2, 0), (0, 2), (2, 2)], 5: [(0, 0), (2, 0), (1, 1), (0, 2), (2, 2)], 6: [(0, 0), (0, 1), (0, 2), (2, 0), (2, 1), (2, 2)]}
    draw = ImageDraw.Draw(canvas)
    radius = size * .058
    for col, row in positions[count]:
        cx = x + size * (.27 + col * .23)
        cy = y + size * (.27 + row * .23)
        draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=color)


records = []
for skin in IDS:
    if skin in PILOTS:
        master_rel, old_rel = PILOTS[skin]
        face = Image.open(ROOT / old_rel).convert("RGBA")
    else:
        master_rel = f"source-assets/{'theme-dice-skins-v1' if skin in THEME_GIFTS else 'dice-skins-v1'}/masters/{skin}-master-v1.png"
        assert (ROOT / master_rel).is_file(), f"Missing master: {skin}"
        face = connected_face(Image.open(ROOT / master_rel))
    assert face.size == (384, 384)
    assert face.getpixel((192, 192))[3] >= 225, f"Transparent center: {skin}"
    assert all(face.getpixel(point)[3] <= 16 for point in ((0, 0), (0, 383), (383, 0), (383, 383))), f"Opaque exterior: {skin}"
    runtime_rel = f"www/assets/dice-skins-v1/{skin}-face-v1.png"
    if skin in PILOTS:
        copyfile(ROOT / old_rel, ROOT / runtime_rel)
    else:
        face.save(ROOT / runtime_rel, optimize=True)
    record = {"id": skin, "style": "3D Soft Neomorphism", "direction": "Clay" if skin in CLAY else "Smooth Rubber / Matte Plastic", "master": master_rel, "runtime": runtime_rel, "pipColor": PIP_COLORS[skin], "sha256": sha256((ROOT / runtime_rel).read_bytes()).hexdigest()}
    if skin in THEME_GIFTS or skin == "green_clay":
        record["themeGift"] = THEME_GIFTS.get(skin, "dark")
    records.append(record)

MANIFEST.write_text(json.dumps({"schemaVersion": 3, "scope": "48 selectable skins usable across all ten themes once unlocked; nine new skins are free gifts of owned themes; one pip-free face per catalog skin; dynamic HTML/CSS pips 1–6", "renderSize": [384, 384], "skins": records}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
assert len({row["sha256"] for row in records}) == 48, "Two skins share the same PNG bytes"

css = ["/* Generated from 48 catalog dice PNGs. Dynamic CSS pips remain in style.css. */", "/* Every owned skin uses the same face in play and in the Treasury, in all themes. */"]
for row in records:
    skin = row["id"]
    url = f'assets/dice-skins-v1/{skin}-face-v1.png'
    css.append(f'body #game-scene #dice-container .dice.skin-{skin}, body .dice.skin-{skin}, body .dice-preview.preview-{skin} {{ background: transparent url("{url}") center / 110% 110% no-repeat !important; border-color: transparent !important; box-shadow: none !important; color: {row["pipColor"]} !important; opacity: 1 !important; text-shadow: none !important; }}')
css.append('body .dice-preview.preview-green_clay::before { content: none !important; }')
css.append('body #game-scene #dice-container .dice[class*="skin-"].held, body .dice[class*="skin-"].held { border-color: rgba(255, 241, 212, .85) !important; box-shadow: 0 0 0 3px rgba(255, 239, 202, .23), 0 0 12px rgba(255, 242, 214, .24) !important; filter: brightness(.92) !important; }')
css.append('body :is(.dice.skin-bronze_antique,.dice-preview.preview-bronze_antique) .dice-dot { background: radial-gradient(circle at 34% 28%, #fff5df, #e5cdab 78%) !important; box-shadow: inset 1px 2px 3px rgba(81,43,22,.31), 0 1px 1px rgba(31,14,7,.48) !important; }')
css.append('body #game-scene #dice-container .dice.skin-green_clay.held, body .dice.skin-green_clay.held { border-color: rgba(236,243,211,.78) !important; box-shadow: 0 0 0 3px rgba(205,223,171,.18), 0 0 18px rgba(210,229,178,.20), 5px 6px 12px rgba(7,28,15,.42) !important; filter: brightness(1.04) saturate(.94) !important; }')
css.append('body #game-scene #dice-container .dice.skin-bronze_antique.held, body .dice.skin-bronze_antique.held { border-color: rgba(255,225,178,.82) !important; box-shadow: 0 0 0 3px rgba(247,189,127,.18), 0 0 17px rgba(248,183,110,.18), 5px 6px 12px rgba(44,22,11,.43) !important; filter: brightness(1.04) saturate(.94) !important; }')
(ROOT / "www/dice-skin-png.css").write_text("\n".join(css) + "\n", encoding="utf-8")

sheet = Image.new("RGB", (1120, 20 + ((len(records) + 5) // 6) * 224), "#e8ebed")
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype("arial.ttf", 15)
for i, row in enumerate(records):
    col, line = i % 6, i // 6
    ox, oy = 16 + col * 184, 20 + line * 224
    draw.rounded_rectangle((ox, oy, ox + 168, oy + 212), radius=14, fill="#fbfcfc")
    face = Image.open(ROOT / row["runtime"]).convert("RGBA")
    tile = face.resize((124, 124), Image.Resampling.LANCZOS)
    sheet.paste(tile, (ox + 22, oy + 18), tile)
    add_pips(sheet, ox + 22, oy + 18, row["pipColor"], size=124)
    draw.text((ox + 9, oy + 148), row["id"], font=font, fill="#243039")
    draw.text((ox + 9, oy + 172), "Clay" if row["direction"] == "Clay" else "Matte Plastic", font=font, fill="#69737b")
sheet.save(ROOT / "docs/dice-skins-v1-review.png", optimize=True)

def card_markup(row, themed=False):
    label = THEME_NAMES[row["themeGift"]] if themed else row["id"]
    return f'<article class="skin-card"><div class="face" style="--face:url(../{escape(row["runtime"])});--pip:{row["pipColor"]}"><div class="pip-grid" aria-hidden="true"></div></div><strong>{escape(label)}</strong><small>{escape(row["direction"])}</small></article>'


cards = [card_markup(row) for row in records]
review = """<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Univerzalni PNG skinovi kockica — 48</title><style>
:root{font-family:system-ui,sans-serif;color:#1b2e32;background:#e8ebed}*{box-sizing:border-box}body{margin:0;padding:24px}header{max-width:1060px;margin:auto auto 22px}h1{font-size:25px;margin:0 0 8px}p{line-height:1.45;margin:0 0 16px}button{border:1px solid #899aa0;background:#fff;border-radius:8px;padding:7px 12px;cursor:pointer;margin:0 5px 5px 0}.grid{max-width:1060px;margin:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}.skin-card{background:#fbfcfc;border-radius:14px;padding:12px;display:flex;align-items:center;flex-direction:column;min-height:184px}.skin-card strong{font-size:13px;align-self:flex-start}.skin-card small{font-size:11px;color:#667780;align-self:flex-start}.face{position:relative;width:112px;height:112px;margin:0 auto 12px;background:var(--face) center/110% 110% no-repeat}.pip-grid{position:absolute;inset:0;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);padding:18%}.pip{width:85%;height:85%;border-radius:50%;margin:auto;background:var(--pip);box-shadow:inset 0 1px 2px #0005}.dark{background:#17212b;color:#e9f0f2}.dark .skin-card{background:#293542;color:#f1f5f5}.dark .skin-card small{color:#b9c9d1}
</style></head><body><header><h1>48 PNG skinova kockica</h1><p>Isto lice kockice koristi se u igri i Riznici u svih deset tema. Devet novih skinova se besplatno otključava uz odgovarajuću temu. PNG ne sadrži tačkice; broj 1–6 se postavlja pravilnim CSS rasporedom. Izaberite broj ili tamnu podlogu za pregled kontrasta.</p><div id="controls"></div><button id="toggle">Tamna/svetla podloga</button></header><main class="grid">""" + "".join(cards) + """</main><script>
const positions={1:[[1,1]],2:[[2,0],[0,2]],3:[[2,0],[1,1],[0,2]],4:[[0,0],[2,0],[0,2],[2,2]],5:[[0,0],[2,0],[1,1],[0,2],[2,2]],6:[[0,0],[0,1],[0,2],[2,0],[2,1],[2,2]]};
function setPips(n){document.querySelectorAll('.pip-grid').forEach(g=>{g.replaceChildren(...positions[n].map(([x,y])=>{const p=document.createElement('i');p.className='pip';p.style.gridColumn=x+1;p.style.gridRow=y+1;return p}))})}
for(let n=1;n<=6;n++){const b=document.createElement('button');b.textContent='Kockica '+n;b.onclick=()=>setPips(n);document.getElementById('controls').append(b)}
document.getElementById('toggle').onclick=()=>document.documentElement.classList.toggle('dark');setPips(5);
</script></body></html>"""
(ROOT / "docs/dice-skins-v1-review.html").write_text(review, encoding="utf-8")

theme_records = [row for row in records if row["id"] == "green_clay" or row["id"] in THEME_GIFTS]
assert len(theme_records) == 10
theme_sheet = Image.new("RGB", (1100, 508), "#e8ebed")
theme_draw = ImageDraw.Draw(theme_sheet)
for i, row in enumerate(theme_records):
    col, line = i % 5, i // 5
    ox, oy = 10 + col * 218, 10 + line * 244
    theme_draw.rounded_rectangle((ox, oy, ox + 202, oy + 228), radius=15, fill="#fbfcfc")
    face = Image.open(ROOT / row["runtime"]).convert("RGBA").resize((156, 156), Image.Resampling.LANCZOS)
    theme_sheet.paste(face, (ox + 23, oy + 12), face)
    add_pips(theme_sheet, ox + 23, oy + 12, row["pipColor"], size=156)
    theme_draw.text((ox + 9, oy + 177), THEME_NAMES[row["themeGift"]], font=font, fill="#243039")
    theme_draw.text((ox + 9, oy + 199), "Clay" if row["direction"] == "Clay" else "Matte Plastic", font=font, fill="#69737b")
theme_sheet.save(ROOT / "docs/theme-dice-skins-review.png", optimize=True)
mobile_sheet = Image.new("RGB", (1100, 336), "#e8ebed")
mobile_draw = ImageDraw.Draw(mobile_sheet)
for i, row in enumerate(theme_records):
    col, line = i % 5, i // 5
    ox, oy = 10 + col * 218, 10 + line * 163
    mobile_draw.rounded_rectangle((ox, oy, ox + 202, oy + 151), radius=13, fill="#fbfcfc")
    face = Image.open(ROOT / row["runtime"]).convert("RGBA").resize((66, 66), Image.Resampling.LANCZOS).crop((3, 3, 63, 63))
    for back, px in (("#e9edf0", ox + 28), ("#1b2838", ox + 114)):
        py = oy + 18
        mobile_draw.rounded_rectangle((px - 4, py - 4, px + 64, py + 64), radius=8, fill=back)
        mobile_sheet.paste(face, (px, py), face)
        add_pips(mobile_sheet, px, py, row["pipColor"], size=60)
    mobile_draw.text((ox + 9, oy + 103), THEME_NAMES[row["themeGift"]], font=font, fill="#243039")
    mobile_draw.text((ox + 9, oy + 124), "60 px · light / dark", font=font, fill="#69737b")
mobile_sheet.save(ROOT / "docs/theme-dice-skins-mobile-review.png", optimize=True)
theme_review = review.replace("".join(cards), "".join(card_markup(row, themed=True) for row in theme_records))
theme_review = theme_review.replace("48 PNG skinova kockica", "10 tematskih skinova kockica")
theme_review = theme_review.replace("<title>Univerzalni PNG skinovi kockica — 48</title>", "<title>Tematski skinovi kockica — 10</title>")
theme_review = theme_review.replace("Devet novih skinova je besplatni poklon uz odgovarajuću temu.", "Zelena ostaje prethodno odobrena; ostalih devet su novi besplatni pokloni uz svoje teme.")
(ROOT / "docs/theme-dice-skins-review.html").write_text(theme_review, encoding="utf-8")
print(f"Built {len(records)} catalog dice faces, including {len(theme_records)} theme gifts/reference; CSS, manifest, and review sheets")
