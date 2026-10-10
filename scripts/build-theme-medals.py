"""Render original, deterministic soft 3D medal families for each theme.

Every competition has its own silhouette and embossing. Gold/silver/bronze
share that competition's shape within one theme, while each theme changes the
underlying form and material. Masters and runtime PNGs remain separate.
"""

from __future__ import annotations

import colorsys
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
THEMES = {
    "dark": ("clay", "#234b39", "#41644d", "#d7a877", 0),
    "light": ("smooth", "#b8956c", "#e7d1a9", "#f6e4c6", 1),
    "medium": ("clay", "#643645", "#ad7287", "#edb8bf", 2),
    "winter": ("smooth", "#174f70", "#57a8bb", "#bbeced", 3),
    "neon": ("smooth", "#193343", "#286f75", "#86e6df", 4),
    "amethyst": ("clay", "#4f3d70", "#8972a8", "#d7c3ec", 5),
    "easter": ("smooth", "#737e6a", "#b8c5a0", "#f0dfcc", 6),
    "desert": ("clay", "#705241", "#bb8a69", "#f1d0aa", 7),
    "moon": ("clay", "#303440", "#686d7c", "#dedfe4", 8),
    "severna": ("smooth", "#162f48", "#42677d", "#a5e5e8", 9),
}
CONTEXTS = ("collection", "leaderboard", "tournament", "quarterly-league", "power-index", "fire-streak")
TIERS = ("gold", "silver", "bronze")
TIER_COLORS = {
    "gold": ("#9a642a", "#d6a451", "#ffe4a8"),
    "silver": ("#60727f", "#a9b8c0", "#f0f6f3"),
    "bronze": ("#76492f", "#af7554", "#edbc91"),
}
SIZE = 768
C = SIZE // 2


def rgb(value: str) -> tuple[int, int, int]:
    return tuple(int(value[i:i + 2], 16) for i in (1, 3, 5))


def mix(a, b, t):
    return tuple(int(round(x * (1 - t) + y * t)) for x, y in zip(a, b))


def masked_gradient(mask: Image.Image, top, middle, bottom, tilt=0.0) -> Image.Image:
    yy, xx = np.mgrid[:SIZE, :SIZE].astype(np.float32)
    v = np.clip((yy / SIZE) * .82 + (xx / SIZE) * tilt, 0, 1)
    stops = [np.array(top), np.array(middle), np.array(bottom)]
    rgb_out = np.empty((SIZE, SIZE, 3), dtype=np.uint8)
    for channel in range(3):
        rgb_out[:, :, channel] = np.where(
            v < .48,
            stops[0][channel] + (stops[1][channel] - stops[0][channel]) * (v / .48),
            stops[1][channel] + (stops[2][channel] - stops[1][channel]) * ((v - .48) / .52),
        ).clip(0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack((rgb_out, np.asarray(mask))), "RGBA")


def radial_mask(theme_index: int, scale=1.0, shift_y=0) -> Image.Image:
    mask = Image.new("L", (SIZE, SIZE))
    draw = ImageDraw.Draw(mask)
    pts = []
    for i in range(361):
        angle = 2 * math.pi * i / 360
        cs, sn = math.cos(angle), math.sin(angle)
        if theme_index == 0:  # Green: low, wide clay rosette.
            radius = 1 + .018 * math.cos(6 * angle)
            x, y = 280 * cs * radius, 253 * sn * radius
        elif theme_index == 1:  # Light Gold: small sun scallops.
            radius = 1 + .090 * math.cos(10 * angle)
            x, y = 268 * cs * radius, 268 * sn * radius
        elif theme_index == 2:  # Cherry: soft rotated square.
            n = 5.0
            x = 266 * math.copysign(abs(cs) ** (2 / n), cs)
            y = 266 * math.copysign(abs(sn) ** (2 / n), sn)
            x, y = (x - y) * .72, (x + y) * .72
        elif theme_index == 3:  # Ocean: flowing drop.
            radius = 1 + .155 * math.sin(3 * angle + .4)
            x, y = 262 * cs * radius, 270 * sn * radius
        elif theme_index == 4:  # Neon: rounded hex.
            corner = math.cos(math.pi / 6) / math.cos((angle + math.pi / 6) % (math.pi / 3) - math.pi / 6)
            radius = .18 + .82 * corner
            x, y = 280 * cs * radius, 280 * sn * radius
        elif theme_index == 5:  # Amethyst: six broad crystal petals.
            radius = 1 + .145 * math.cos(6 * angle + .4)
            x, y = 268 * cs * radius, 270 * sn * radius
        elif theme_index == 6:  # Easter: tall smooth egg.
            x, y = 222 * cs * (1 + .18 * sn), 293 * sn
        elif theme_index == 7:  # Desert: low arch with four shoulders.
            radius = 1 + .135 * math.cos(4 * angle)
            x, y = 278 * cs * radius, 245 * sn * radius
        elif theme_index == 8:  # Moon: slightly irregular clay pebble.
            radius = 1 + .075 * math.cos(3 * angle + .8) + .038 * math.sin(5 * angle)
            x, y = 265 * cs * radius, 262 * sn * radius
        else:  # Northern Nebula: soft pointed shield.
            x = 255 * cs * (1 - .12 * sn)
            y = 248 * sn + 52 * max(sn, 0) ** 4
        pts.append((round(C + x * scale), round(C - 42 + shift_y + y * scale)))
    draw.polygon(pts, fill=255)
    return mask


def add_shadow(canvas: Image.Image, mask: Image.Image, blur: int, offset: tuple[int, int], opacity: int) -> None:
    shifted = Image.new("L", (SIZE, SIZE))
    shifted.paste(mask, offset)
    shifted = shifted.filter(ImageFilter.GaussianBlur(blur)).point(lambda a: round(a * opacity / 255))
    canvas.alpha_composite(Image.new("RGBA", (SIZE, SIZE), (2, 8, 17, 0)))
    layer = Image.new("RGBA", (SIZE, SIZE), (5, 10, 18, 0))
    layer.putalpha(shifted)
    canvas.alpha_composite(layer)


def draw_ribbon(canvas, context, theme_index, tone, clay):
    draw = ImageDraw.Draw(canvas)
    dark = mix(tone, (18, 24, 30), .50)
    pale = mix(tone, (255, 255, 255), .26)
    theme_shift = (theme_index % 3 - 1) * 9
    if context == "collection":
        tails = [[(244, 545), (328, 556), (301, 696), (259, 660), (216, 677)],
                 [(440, 556), (524, 545), (551, 677), (508, 660), (467, 696)]]
    elif context == "leaderboard":
        tails = [[(218, 534), (307, 560), (262, 675), (214, 624)],
                 [(461, 560), (550, 534), (554, 624), (506, 675)]]
    elif context == "tournament":
        tails = [[(260, 536), (508, 536), (542, 663), (385, 627), (226, 663)]]
    elif context == "quarterly-league":
        tails = [[(226, 541), (305, 566), (232, 664), (193, 627)],
                 [(463, 566), (542, 541), (575, 627), (536, 664)]]
    elif context == "power-index":
        tails = [[(226, 538), (306, 557), (270, 640), (226, 620), (237, 694), (183, 637)],
                 [(462, 557), (542, 538), (585, 637), (531, 694), (542, 620), (498, 640)]]
    else:
        tails = [[(225, 538), (311, 562), (267, 683), (220, 642), (204, 675)],
                 [(457, 562), (543, 538), (564, 675), (548, 642), (501, 683)]]
    for points in tails:
        shifted = [(x + theme_shift, y) for x, y in points]
        draw.polygon([(x + 4, y + 8) for x, y in shifted], fill=(*dark, 105))
        draw.polygon(shifted, fill=(*mix(tone, dark, .32), 255))
        draw.line(shifted[:2], fill=(*pale, 230), width=12 if clay else 8, joint="curve")


def motif_layer(context, theme_index, ink, accent, clay):
    layer = Image.new("RGBA", (SIZE, SIZE))
    d = ImageDraw.Draw(layer)
    cx, cy = C, C - 42
    line = 27 if clay else 22
    hi = (*ink, 255)
    accent = (*accent, 250)
    if context == "collection":
        # Three ordered tokens: identity of the Treasury collection.
        for x, y, r in ((cx - 68, cy + 35, 42), (cx + 68, cy + 35, 42), (cx, cy - 47, 54)):
            d.ellipse((x-r, y-r, x+r, y+r), fill=hi)
            d.arc((x-r+11, y-r+11, x+r-11, y+r-11), 200, 318, fill=accent, width=11)
    elif context == "leaderboard":
        # Ranked steps, independent of the Tournament cup.
        for x, top, width in ((cx-102, cy+22, 65), (cx-35, cy-75, 70), (cx+37, cy+48, 65)):
            d.rounded_rectangle((x, top, x+width, cy+105), radius=13, fill=hi)
        d.rounded_rectangle((cx-116, cy+102, cx+116, cy+124), radius=10, fill=accent)
    elif context == "tournament":
        # Single open chalice silhouette.
        d.arc((cx-103, cy-111, cx+103, cy+78), 8, 172, fill=hi, width=35)
        d.line((cx-62, cy-73, cx-43, cy+44, cx, cy+73, cx+43, cy+44, cx+62, cy-73), fill=hi, width=line, joint="curve")
        d.rounded_rectangle((cx-14, cy+62, cx+14, cy+113), radius=11, fill=hi)
        d.rounded_rectangle((cx-74, cy+107, cx+74, cy+131), radius=12, fill=accent)
    elif context == "quarterly-league":
        # Four quarters around one quiet center, not a reused podium.
        for a in range(4):
            angle = a * math.pi / 2 + math.pi / 4
            x = cx + math.cos(angle) * 78
            y = cy + math.sin(angle) * 78
            d.rounded_rectangle((x-27, y-27, x+27, y+27), radius=17, fill=hi)
        d.ellipse((cx-36, cy-36, cx+36, cy+36), fill=accent)
    elif context == "power-index":
        points = [(cx+12, cy-132), (cx-66, cy+6), (cx-8, cy+1), (cx-38, cy+131), (cx+78, cy-21), (cx+20, cy-20)]
        d.polygon(points, fill=hi)
        d.line(points[:3], fill=accent, width=12, joint="curve")
    else:
        # Fire Streak flame, round and compact.
        points = [(cx,cy-128),(cx+65,cy-48),(cx+74,cy+31),(cx+35,cy+105),(cx,cy+125),
                  (cx-57,cy+86),(cx-75,cy+24),(cx-48,cy-41),(cx-33,cy+3)]
        d.polygon(points, fill=hi)
        d.ellipse((cx-24, cy+32, cx+31, cy+106), fill=accent)
    # Each theme's own small signature cut / inset; it never changes rank meaning.
    if theme_index == 1:
        d.arc((cx-132,cy-131,cx+132,cy+133), 204, 326, fill=accent, width=9)
    elif theme_index == 2:
        d.ellipse((cx-113,cy-116,cx-87,cy-90), fill=accent)
        d.ellipse((cx+87,cy-116,cx+113,cy-90), fill=accent)
    elif theme_index == 3:
        d.arc((cx-119,cy-95,cx+119,cy+151), 28, 148, fill=accent, width=11)
    elif theme_index == 4:
        d.line((cx-125,cy+121,cx-91,cy+121), fill=accent, width=11)
        d.line((cx+91,cy+121,cx+125,cy+121), fill=accent, width=11)
    elif theme_index == 5:
        d.polygon([(cx-124,cy-102),(cx-107,cy-121),(cx-90,cy-102),(cx-107,cy-83)], fill=accent)
    elif theme_index == 6:
        d.arc((cx-131,cy-119,cx+131,cy+141), 196, 344, fill=accent, width=10)
    elif theme_index == 7:
        d.arc((cx-116,cy-107,cx+116,cy+125), 42, 140, fill=accent, width=12)
    elif theme_index == 8:
        d.ellipse((cx+88,cy-116,cx+119,cy-85), fill=accent)
    elif theme_index == 9:
        d.arc((cx-133,cy-127,cx+133,cy+139), 194, 320, fill=accent, width=9)
    else:
        d.arc((cx-125,cy-121,cx+125,cy+129), 36, 140, fill=accent, width=10)
    return layer


def render(theme_id, context, tier):
    direction, body_hex, raised_hex, accent_hex, theme_index = THEMES[theme_id]
    clay = direction == "clay"
    body, raised, accent = map(rgb, (body_hex, raised_hex, accent_hex))
    dark, mid, light = map(rgb, TIER_COLORS[tier])
    # Tier colors belong to rank; a measured amount of theme color makes the
    # medal part of its own pack without muddying gold/silver/bronze semantics.
    dark = mix(dark, body, .20)
    mid = mix(mid, raised, .12)
    light = mix(light, accent, .14)
    canvas = Image.new("RGBA", (SIZE, SIZE))
    draw_ribbon(canvas, context, theme_index, mix(body, mid, .45), clay)
    outer = radial_mask(theme_index)
    add_shadow(canvas, outer, 19 if clay else 13, (8, 13), 112)
    canvas.alpha_composite(masked_gradient(outer, light, mid, dark, tilt=.11))
    inset = radial_mask(theme_index, .86, 1)
    inner_shadow = inset.filter(ImageFilter.GaussianBlur(17))
    shadow_layer = Image.new("RGBA", (SIZE, SIZE), (*mix(dark, body, .36), 0))
    shadow_layer.putalpha(inner_shadow.point(lambda x: int(x * .40)))
    canvas.alpha_composite(shadow_layer)
    face = radial_mask(theme_index, .77, -2)
    # The inset face is the theme's own material; the rim and rank mark carry
    # gold/silver/bronze. This prevents a recolored medal template across packs.
    face_top = mix(raised, accent, .33 if clay else .21)
    face_middle = mix(raised, body, .12)
    face_bottom = mix(raised, body, .42)
    canvas.alpha_composite(masked_gradient(face, face_top, face_middle, face_bottom, tilt=.07))
    # The inset edge follows this theme's silhouette, not a shared circle.
    rim = Image.new("RGBA", (SIZE, SIZE), (*mix(light, accent, .14), 0))
    rim_alpha = ImageChops.subtract(face, face.filter(ImageFilter.MinFilter(17 if clay else 13)))
    rim_alpha = rim_alpha.point(lambda value: round(value * (.61 if clay else .49)))
    rim.putalpha(rim_alpha)
    canvas.alpha_composite(rim)
    motif_color = mix(body, dark, .42) if theme_index in (1, 6) else mix(light, accent, .12)
    accent_color = mix(light, accent, .48) if theme_index in (1, 6) else mix(accent, light, .32)
    if theme_index == 4:
        # Neon Cyber's pink is a restrained secondary signal on the inset,
        # while turquoise remains the primary face color.
        accent_color = rgb("#F08CE3")
    motif = motif_layer(context, theme_index, motif_color, accent_color, clay)
    motif_shadow = Image.new("RGBA", (SIZE, SIZE), (12, 18, 22, 0))
    motif_shadow.putalpha(motif.getchannel("A").filter(ImageFilter.GaussianBlur(8)).point(lambda x: round(x * .35)))
    shifted = Image.new("RGBA", (SIZE, SIZE))
    shifted.alpha_composite(motif_shadow, (5, 8))
    canvas.alpha_composite(shifted)
    canvas.alpha_composite(motif)
    # Keep alpha at zero outside the medal: no pad, plaque, or background.
    return canvas


def paths(theme, context, tier):
    if context == "collection":
        slot = f"collection-medals/collection-{tier}-v1.png"
    elif context == "leaderboard":
        slot = f"competition-medals/general-podium-{tier}-v1.png"
    else:
        slot = f"competition-medals/{context}-{tier}-v1.png"
    master = ROOT / f"source-assets/theme-icon-packs/{theme}/medals-v1/{context}-{tier}-master-v1.png"
    runtime = (ROOT / "www/assets/green-soft-clay/canonical" / slot) if theme == "dark" else (ROOT / f"www/assets/theme-packs/{theme}/canonical" / slot)
    return master, runtime, slot


def main():
    metadata = {}
    for theme in THEMES:
        entries = {}
        for context in CONTEXTS:
            for tier in TIERS:
                master, runtime, slot = paths(theme, context, tier)
                # Green's approved collection, leaderboard and quarterly medals
                # are the locked reference. Create only its missing competitions.
                if theme == "dark" and context in ("collection", "leaderboard", "quarterly-league"):
                    continue
                image = render(theme, context, tier)
                master.parent.mkdir(parents=True, exist_ok=True)
                runtime.parent.mkdir(parents=True, exist_ok=True)
                image.save(master, optimize=True)
                image.resize((256, 256), Image.Resampling.LANCZOS).save(runtime, optimize=True)
                with Image.open(runtime) as check:
                    bounds = check.getchannel("A").point(lambda a: 255 if a >= 16 else 0).getbbox()
                entries[slot] = {
                    "masterPath": master.relative_to(ROOT).as_posix(),
                    "productionPath": runtime.relative_to(ROOT).as_posix(),
                    "sizeBytes": runtime.stat().st_size,
                    "opticalBoundsPx": list(bounds),
                    "sha256": hashlib.sha256(runtime.read_bytes()).hexdigest(),
                }
        manifest = ROOT / f"source-assets/theme-icon-packs/{theme}/medals-v1/manifest.json"
        manifest.parent.mkdir(parents=True, exist_ok=True)
        manifest.write_text(json.dumps({"schemaVersion": 1, "themeId": theme, "slots": entries}, indent=2) + "\n", encoding="utf-8")
        metadata[theme] = len(entries)
    print("Rendered theme medal PNGs:", metadata)


if __name__ == "__main__":
    raise SystemExit("Superseded by scripts/rebuild-theme-dna-medals-controls.py; the v1 builder would overwrite theme-DNA revisions.")
