"""Render the eight canonical Treasury controls for each non-Green theme."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
DEFS = json.loads((ROOT / "docs/theme-definitions.json").read_text(encoding="utf-8"))
THEMES = [theme for theme in DEFS["themes"] if theme["id"] != "dark"]
ROLES = ("tab-trophies", "tab-skins", "tab-effects", "tab-themes",
         "status-owned", "status-active", "status-locked", "status-insufficient")
SIZE = 768


def color(value):
    return tuple(int(value[i:i + 2], 16) for i in (1, 3, 5))


def blend(a, b, ratio):
    return tuple(round(x * (1 - ratio) + y * ratio) for x, y in zip(a, b))


def status_plate(d, variant):
    if variant == 0:  # Light Gold: broad and calmly flattened.
        d.rounded_rectangle((110, 153, 658, 615), radius=145, fill=255)
    elif variant == 1:  # Dark Cherry: hand-shaped soft clay edge.
        points = []
        for step in range(121):
            angle = 2 * math.pi * step / 120
            radius = 1 + .095 * math.cos(5 * angle + .3)
            points.append((384 + 263 * math.cos(angle) * radius, 384 + 254 * math.sin(angle) * radius))
        d.polygon(points, fill=255)
    elif variant == 2:  # Ocean: one broad coastal curve.
        points = []
        for step in range(121):
            angle = 2 * math.pi * step / 120
            radius = 1 + .14 * math.sin(3 * angle + .4)
            points.append((384 + 258 * math.cos(angle) * radius, 384 + 264 * math.sin(angle) * radius))
        d.polygon(points, fill=255)
    elif variant == 3:  # Neon Cyber: clean clipped hexagon.
        d.polygon([(384, 105), (625, 244), (625, 524), (384, 663), (143, 524), (143, 244)], fill=255)
    elif variant == 4:  # Royal Amethyst: quiet six-facet form.
        d.polygon([(384, 93), (604, 196), (654, 384), (604, 572), (384, 675),
                   (164, 572), (114, 384), (164, 196)], fill=255)
    elif variant == 5:  # Easter: tall smooth oval.
        d.ellipse((164, 92, 604, 676), fill=255)
    elif variant == 6:  # Desert: two broad sandstone shoulders.
        d.polygon([(260, 123), (508, 123), (651, 270), (619, 559), (507, 652),
                   (261, 652), (149, 559), (117, 270)], fill=255)
    elif variant == 7:  # Moon: low uneven clay pebble.
        points = []
        for step in range(121):
            angle = 2 * math.pi * step / 120
            radius = 1 + .055 * math.cos(3 * angle + .8) + .035 * math.sin(5 * angle)
            points.append((384 + 264 * math.cos(angle) * radius, 384 + 260 * math.sin(angle) * radius))
        d.polygon(points, fill=255)
    else:  # Northern Nebula: soft shield taper.
        d.polygon([(384, 91), (618, 223), (609, 505), (384, 681), (159, 505), (150, 223)], fill=255)


def glyph_mask(role, variant):
    mask = Image.new("L", (SIZE, SIZE))
    d = ImageDraw.Draw(mask)
    spread = (variant % 3 - 1) * 15
    if role == "tab-trophies":
        cup_top = 183 if variant in (3, 4) else 206 if variant in (5, 6) else 194
        cup_width = 374 if variant in (3, 4) else 418 if variant in (2, 6) else 398
        left, right = 384 - cup_width // 2, 384 + cup_width // 2
        d.arc((left - 120, cup_top - 10, left + 93, 486), 82, 276, fill=255, width=49 if variant == 3 else 61)
        d.arc((right - 93, cup_top - 10, right + 120, 486), 264, 98, fill=255, width=49 if variant == 3 else 61)
        d.line((left - 51, cup_top + 104, left + 27, cup_top + 104), fill=255, width=45)
        d.line((right - 27, cup_top + 104, right + 51, cup_top + 104), fill=255, width=45)
        d.rounded_rectangle((left - 15, cup_top, right + 15, cup_top + 70), radius=17 if variant in (3, 6) else 35, fill=255)
        d.polygon([(left + 16, cup_top + 46), (right - 16, cup_top + 46),
                   (right - 44 + spread, 470), (432, 535), (336, 535), (left + 44 + spread, 470)], fill=255)
        d.rounded_rectangle((353, 493, 415, 610), radius=13 if variant == 3 else 25, fill=255)
        d.rounded_rectangle((247, 591, 521, 644), radius=12 if variant in (3, 6) else 26, fill=255)
    elif role == "tab-skins":
        tilt = spread // 2
        if variant in (3, 4, 6, 8):
            cut = {3: 73, 4: 113, 6: 91, 8: 62}[variant]
            d.polygon([(150 + cut, 141), (618 - cut, 141), (618, 141 + cut), (618, 630 - cut),
                       (618 - cut, 630), (150 + cut, 630), (150, 630 - cut), (150, 141 + cut)], fill=255)
        else:
            radius = {0: 72, 1: 115, 2: 92, 5: 137, 7: 83}.get(variant, 80)
            d.rounded_rectangle((150 + tilt, 141, 618 + tilt, 630), radius=radius, fill=255)
    elif role == "tab-effects":
        width = {0: 143, 1: 118, 2: 152, 3: 104, 4: 130, 5: 119, 6: 157, 7: 110, 8: 138}[variant]
        x_tip = 634 if variant in (3, 5, 7) else 673
        y_tip = 645 if variant in (0, 6) else 692
        d.polygon([(384, 768 - y_tip), (384 + width, 316), (x_tip, 384), (384 + width, 452),
                   (384, y_tip), (384 - width, 452), (768 - x_tip, 384), (384 - width, 316)], fill=255)
    elif role == "tab-themes":
        # Three overlapping surfaces represent switching an interface theme.
        if variant in (3, 4, 6):
            cut = 50 if variant == 3 else 74
            d.polygon([(124 + cut, 210), (483 - cut, 210), (483, 210 + cut), (483, 584 - cut),
                       (483 - cut, 584), (124 + cut, 584), (124, 584 - cut), (124, 210 + cut)], fill=255)
            d.polygon([(284 + cut, 131), (644 - cut, 131), (644, 131 + cut), (644, 543 - cut),
                       (644 - cut, 543), (284 + cut, 543), (284, 543 - cut), (284, 131 + cut)], fill=255)
        else:
            d.rounded_rectangle((124, 210, 483, 584), radius=84 if variant in (1, 5) else 42, fill=255)
            d.rounded_rectangle((284, 131, 644, 543), radius=84 if variant in (1, 5) else 42, fill=255)
    elif role == "status-owned":
        status_plate(d, variant)
    elif role == "status-active":
        status_plate(d, variant)
        d.ellipse((230, 230, 538, 538), fill=0)
    elif role == "status-locked":
        d.arc((220, 101, 548, 491), 180, 360, fill=255, width=97)
        d.arc((220, 101, 548, 491), 0, 180, fill=255, width=97)
        d.rounded_rectangle((144, 338, 624, 660), radius=65 if variant % 2 else 46, fill=255)
    else:
        status_plate(d, variant)
    return mask


def gradient(mask, upper, middle, lower):
    layer = Image.new("RGBA", (SIZE, SIZE))
    pixels = layer.load()
    alpha = mask.load()
    for y in range(SIZE):
        t = y / (SIZE - 1)
        c = blend(upper, middle, t * 2) if t < .5 else blend(middle, lower, (t - .5) * 2)
        for x in range(SIZE):
            a = alpha[x, y]
            if a:
                pixels[x, y] = (*c, a)
    return layer


def render(theme, role, variant):
    palette = theme["iconDna"]["colorsHex"]
    body, light, shade, accent = (color(palette[key]) for key in ("body", "light", "shade", "accent"))
    clay = theme["direction"] == "clay"
    mask = glyph_mask(role, variant)
    image = Image.new("RGBA", (SIZE, SIZE))
    shadow = Image.new("RGBA", (SIZE, SIZE), (*shade, 0))
    shadow.putalpha(mask.filter(ImageFilter.GaussianBlur(22 if clay else 13)).point(lambda a: round(a * .33)))
    image.alpha_composite(shadow, (9, 15))
    image.alpha_composite(gradient(mask, blend(light, body, .12 if clay else .25), body,
                                   blend(body, shade, .42 if clay else .31)))
    edge = ImageChops.subtract(mask, mask.filter(ImageFilter.MinFilter(25 if clay else 15)))
    edge_color = shade if theme["id"] == "light" else light
    edge_layer = Image.new("RGBA", (SIZE, SIZE), (*edge_color, 0))
    edge_layer.putalpha(edge.point(lambda a: round(a * (.57 if clay else .49))))
    image.alpha_composite(edge_layer)
    d = ImageDraw.Draw(image)
    ink = (*shade, 255)
    highlight = (*blend(light, accent, .28), 255)
    accent_ink = (*accent, 255)
    if role == "tab-trophies":
        d.rounded_rectangle((272, 594, 496, 620), radius=13, fill=highlight)
        d.arc((258, 200, 510, 484), 36, 142, fill=highlight, width=17)
    elif role == "tab-skins":
        # A true five face; no duplicate die values or decorative diamonds.
        centers = ((270, 270), (498, 270), (384, 384), (270, 498), (498, 498))
        for x, y in centers:
            d.ellipse((x - 37, y - 37, x + 37, y + 37), fill=ink)
            d.arc((x - 29, y - 29, x + 29, y + 29), 195, 310, fill=highlight, width=8)
    elif role == "tab-effects":
        d.polygon([(384, 255), (422, 350), (515, 384), (422, 418),
                   (384, 513), (346, 418), (253, 384), (346, 350)], fill=ink)
    elif role == "tab-themes":
        d.rounded_rectangle((316, 158, 615, 512), radius=53 if variant % 2 else 29, outline=highlight, width=18)
        d.arc((334, 263, 581, 507), 38, 156, fill=ink, width=43)
        d.ellipse((438, 233, 489, 284), fill=accent_ink)
    elif role == "status-owned":
        d.line([(252, 392), (345, 480), (522, 291)], fill=ink, width=74, joint="curve")
        d.line([(254, 377), (344, 462), (514, 277)], fill=highlight, width=36, joint="curve")
    elif role == "status-active":
        d.ellipse((306, 306, 462, 462), fill=highlight)
        d.ellipse((340, 340, 428, 428), fill=accent_ink)
    elif role == "status-locked":
        d.ellipse((343, 420, 425, 502), fill=ink)
        d.polygon([(370, 471), (398, 471), (416, 565), (352, 565)], fill=ink)
    else:
        d.rounded_rectangle((247, 348, 521, 420), radius=30, fill=ink)
        d.rounded_rectangle((268, 351, 500, 380), radius=14, fill=highlight)
    # One small material cue, with no decorative particles or extra badges.
    if theme["id"] == 'neon':  # Neon Cyber's restrained magenta signal.
        d.line((220, 565, 296, 565), fill=accent_ink, width=12)
    elif theme["id"] == 'desert':  # Desert's quiet horizontal stratum.
        d.line((250, 543, 311, 543), fill=accent_ink, width=13)
    elif theme["id"] == 'moon':  # A single lunar inset.
        d.arc((183, 172, 585, 576), 188, 240, fill=accent_ink, width=13)
    return image


def main():
    for variant, theme in enumerate(THEMES):
        theme_id = theme["id"]
        source_dir = ROOT / "source-assets/theme-icon-packs" / theme_id / "treasury-controls-v1"
        runtime_dir = ROOT / "www/assets/theme-packs" / theme_id / "canonical/treasury-controls"
        source_dir.mkdir(parents=True, exist_ok=True)
        runtime_dir.mkdir(parents=True, exist_ok=True)
        manifest = {"schemaVersion": 1, "themeId": theme_id, "slots": {}}
        for role in ROLES:
            master = source_dir / f"{role}-master-v1.png"
            production = runtime_dir / f"{role}-v1.png"
            icon = render(theme, role, variant)
            icon.save(master, optimize=True)
            icon.resize((256, 256), Image.Resampling.LANCZOS).save(production, optimize=True)
            with Image.open(production) as check:
                bounds = check.getchannel("A").point(lambda a: 255 if a >= 16 else 0).getbbox()
            manifest["slots"][f"canonical/treasury-controls/{role}-v1"] = {
                "masterPath": master.relative_to(ROOT).as_posix(),
                "productionPath": production.relative_to(ROOT).as_posix(),
                "opticalBoundsPx": list(bounds),
                "sizeBytes": production.stat().st_size,
                "sha256": hashlib.sha256(production.read_bytes()).hexdigest(),
            }
        (source_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        print(f"{theme_id}: {len(ROLES)} Treasury controls")


if __name__ == "__main__":
    raise SystemExit("Superseded by scripts/rebuild-theme-dna-medals-controls.py; the v1 builder would overwrite theme-DNA revisions.")
