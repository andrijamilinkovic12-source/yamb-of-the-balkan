"""Build six individual PNG controls from each theme's independently rendered material tile.

The glyphs are drawn as tactile relief on that theme's own shape. Shared semantic
roles (spectator eye, undo token, treasury theme/skin icons) keep their canonical PNGs.
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SIZE = 768
ROLES = ("exit", "timer", "menu", "sound", "vibration", "music")
THEMES = ("dark", "light", "medium", "winter", "neon", "amethyst", "easter", "desert", "moon", "severna")
DEFINITIONS = json.loads((ROOT / "docs/theme-definitions.json").read_text(encoding="utf-8"))
THEME_DATA = {theme["id"]: theme for theme in DEFINITIONS["themes"]}

spec = importlib.util.spec_from_file_location("close_builder", ROOT / "scripts/build-theme-room-close-controls.py")
close_builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(close_builder)


def rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[index:index + 2], 16) for index in (0, 2, 4))


def blend(first: tuple[int, int, int], second: tuple[int, int, int], amount: float) -> tuple[int, int, int]:
    return tuple(round(a * (1 - amount) + b * amount) for a, b in zip(first, second))


def glyph_palette(theme_id: str):
    if theme_id == "dark":
        return rgb("#F4EEDC"), rgb("#B8D4A4"), rgb("#243D2B")
    dna = THEME_DATA[theme_id]["iconDna"]["colorsHex"]
    dark_ink = theme_id in ("light", "easter", "desert")
    ink = rgb(dna["shade"] if dark_ink else dna["light"])
    accent = rgb(dna["accent"])
    shadow = rgb(dna["shade"])
    return ink, accent, shadow


def rounded_line(draw: ImageDraw.ImageDraw, points, width: int, fill=255):
    draw.line(points, fill=fill, width=width, joint="curve")
    radius = width // 2
    for x, y in (points[0], points[-1]):
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=fill)


def draw_role(role: str, theme_id: str) -> Image.Image:
    mask = Image.new("L", (SIZE, SIZE))
    draw = ImageDraw.Draw(mask)
    thick = 43 if theme_id in ("dark", "medium", "amethyst", "desert", "moon") else 39
    if theme_id == "neon":
        thick = 35
    if role == "exit":
        draw.rounded_rectangle((271, 236, 488, 555), radius=35, outline=255, width=thick)
        draw.line((389, 241, 389, 549), fill=255, width=thick // 2)
        draw.ellipse((423, 385, 452, 414), fill=255)
    elif role == "timer":
        draw.ellipse((235, 230, 533, 528), outline=255, width=thick)
        rounded_line(draw, [(384, 295), (384, 385), (453, 423)], thick, 255)
    elif role == "menu":
        radius = 46 if theme_id in ("dark", "medium", "easter") else 41
        for y in (285, 384, 483):
            draw.ellipse((384 - radius, y - radius, 384 + radius, y + radius), fill=255)
    elif role == "sound":
        draw.polygon([(234, 343), (303, 343), (394, 267), (394, 501), (303, 425), (234, 425)], fill=255)
        draw.arc((366, 288, 551, 480), -64, 64, fill=255, width=thick)
        draw.arc((385, 241, 617, 527), -63, 63, fill=255, width=thick - 8)
    elif role == "vibration":
        draw.rounded_rectangle((318, 245, 450, 523), radius=27, outline=255, width=thick - 2)
        draw.line((344, 471, 422, 471), fill=255, width=14)
        draw.arc((223, 290, 374, 478), 108, 252, fill=255, width=thick - 7)
        draw.arc((394, 290, 545, 478), -72, 72, fill=255, width=thick - 7)
    elif role == "music":
        draw.arc((242, 231, 526, 515), 184, 356, fill=255, width=thick + 3)
        draw.rounded_rectangle((239, 375, 295, 507), radius=21, fill=255)
        draw.rounded_rectangle((473, 375, 529, 507), radius=21, fill=255)
        draw.line((265, 509, 322, 533), fill=255, width=22)
    else:
        raise ValueError(role)
    return mask


def embossed(base: Image.Image, mask: Image.Image, theme_id: str) -> Image.Image:
    ink, accent, shade = glyph_palette(theme_id)
    # A recessed shadow and upper relief give the symbol depth without adding detail.
    under = Image.new("RGBA", base.size, shade + (0,))
    shadow_mask = ImageChops.offset(mask, 9, 13).filter(ImageFilter.GaussianBlur(8))
    under.putalpha(shadow_mask.point(lambda value: round(value * .56)))
    base = Image.alpha_composite(base, under)
    highlight = Image.new("RGBA", base.size, accent + (0,))
    highlight_mask = ImageChops.offset(mask, -5, -7).filter(ImageFilter.GaussianBlur(5))
    highlight.putalpha(highlight_mask.point(lambda value: round(value * .46)))
    base = Image.alpha_composite(base, highlight)
    glyph = Image.new("RGBA", base.size, ink + (0,))
    glyph.putalpha(mask)
    base = Image.alpha_composite(base, glyph)
    return base


def build():
    root = ROOT / "source-assets/theme-game-header-v1"
    review = Image.new("RGB", (10 * 192, 6 * 206), "#15202A")
    preview_draw = ImageDraw.Draw(review)
    manifest = {"schemaVersion": 1, "style": "3D Soft Neomorphism", "themes": []}
    digests = set()
    for column, theme_id in enumerate(THEMES):
        generated = root / "bases" / f"{theme_id}-generated.png"
        if not generated.is_file():
            raise FileNotFoundError(generated)
        with Image.open(generated) as source:
            base = close_builder.clean_and_fit(source)
        theme = THEME_DATA[theme_id]
        background = theme.get("paletteHex", {}).get("surface", "#31523A")
        entry = {"id": theme_id, "direction": theme["direction"], "generatedBase": generated.relative_to(ROOT).as_posix(), "roles": {}}
        for row, role in enumerate(ROLES):
            master = embossed(base.copy(), draw_role(role, theme_id), theme_id)
            master_path = root / "masters" / f"{theme_id}-{role}-master-v1.png"
            master_path.parent.mkdir(parents=True, exist_ok=True)
            master.save(master_path, optimize=True)
            production = ROOT / "www/assets" / ("green-soft-clay" if theme_id == "dark" else f"theme-packs/{theme_id}") / "canonical/game-header" / f"{role}-v1.png"
            production.parent.mkdir(parents=True, exist_ok=True)
            image = master.resize((256, 256), Image.Resampling.LANCZOS)
            image.save(production, optimize=True)
            digest = hashlib.sha256(production.read_bytes()).hexdigest()
            if digest in digests:
                raise ValueError(f"Repeated production PNG: {theme_id}/{role}")
            digests.add(digest)
            entry["roles"][role] = {
                "master": master_path.relative_to(ROOT).as_posix(),
                "production": production.relative_to(ROOT).as_posix(),
                "sha256": digest,
                "bytes": production.stat().st_size,
            }
            x, y = column * 192, row * 206
            preview_draw.rounded_rectangle((x + 7, y + 7, x + 185, y + 199), radius=16, fill=background)
            large = image.resize((132, 132), Image.Resampling.LANCZOS)
            review.paste(large, (x + 30, y + 25), large)
            small = image.resize((30, 30), Image.Resampling.LANCZOS)
            review.paste(small, (x + 81, y + 158), small)
            label_color = "#26313C" if theme_id in ("light", "winter", "easter", "desert") else "#F5F5F5"
            preview_draw.text((x + 12, y + 10), f"{theme_id} / {role}", fill=label_color)
        manifest["themes"].append(entry)
    (root / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    review.save(ROOT / "docs/theme-game-header-review.png", optimize=True)
    print(f"Built {len(THEMES)} independent theme bases and {len(digests)} distinct PNG control assets")


if __name__ == "__main__":
    build()
