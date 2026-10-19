"""Package ten independently generated rematch glyphs and their button surfaces."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source-assets" / "theme-online-rematch-v1"
DEFINITIONS = json.loads((ROOT / "docs" / "theme-definitions.json").read_text(encoding="utf-8"))
THEMES = ["dark", "light", "medium", "winter", "neon", "amethyst", "easter", "desert", "moon", "severna"]
GREEN = {"surface": "#3e603b", "raised": "#557949", "inset": "#29482c", "border": "#cfe1b5", "primary": "#f2f6e8"}
PALETTES = {theme["id"]: theme["paletteHex"] for theme in DEFINITIONS["themes"] if theme["id"] != "dark"}
PALETTES["dark"] = GREEN


def rgba(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    return tuple(int(hex_color[i:i + 2], 16) for i in (1, 3, 5)) + (alpha,)


def blend(a: tuple[int, ...], b: tuple[int, ...], t: float) -> tuple[int, int, int, int]:
    return tuple(round(a[i] * (1 - t) + b[i] * t) for i in range(4))


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def button_surface(theme: str) -> Image.Image:
    palette = PALETTES[theme]
    if theme == "winter":
        # The room's pale card surface would hide its ivory button label.
        palette = {**palette, "surface": "#153e64", "raised": "#2874a8", "inset": "#0f2d4b"}
    direction = "clay" if theme in {"dark", "medium", "amethyst", "desert", "moon"} else "smooth_rubber_matte_plastic"
    scale = 2
    width, height = 768 * scale, 128 * scale
    image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    raised = rgba(palette["raised"])
    surface = rgba(palette["surface"])
    inset = rgba(palette["inset"])
    border = rgba(palette["border"])
    shadow = blend(inset, (0, 0, 0, 255), .26 if direction == "clay" else .16)
    draw.rounded_rectangle((8, 13, width - 8, height - 8), radius=height // 2, fill=shadow)
    draw.rounded_rectangle((8, 5, width - 8, height - 17), radius=height // 2, fill=border)
    gradient = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    gradient_draw = ImageDraw.Draw(gradient)
    for y in range(9, height - 21):
        t = (y - 9) / (height - 30)
        fill = blend(raised, surface, t * (.72 if direction == "clay" else .9))
        gradient_draw.line((13, y, width - 13, y), fill=fill, width=1)
    mask = Image.new("L", (width, height), 0)
    ImageDraw.Draw(mask).rounded_rectangle((13, 9, width - 13, height - 21), radius=(height - 30) // 2, fill=255)
    image.paste(gradient, (0, 0), mask)
    draw.rounded_rectangle((13, 9, width - 13, height - 21), radius=(height - 30) // 2,
                           outline=blend(border, raised, .28), width=4)
    if direction == "clay":
        draw.arc((20, 12, width - 20, height - 24), 190, 350,
                 fill=blend(raised, (255, 255, 255, 255), .20), width=5)
    else:
        draw.arc((20, 12, width - 20, height - 24), 205, 330,
                 fill=blend(raised, (255, 255, 255, 255), .13), width=3)
    return image.resize((768, 128), Image.Resampling.LANCZOS)


def main() -> None:
    manifest = {"family": "online-random-rematch", "version": 1, "assets": []}
    review = Image.new("RGB", (900, 10 * 160 + 55), "#f3f1ec")
    painter = ImageDraw.Draw(review)
    font = ImageFont.load_default()
    for index, theme in enumerate(THEMES):
        master = SOURCE / f"{theme}-master-v1.png"
        assert master.exists(), master
        output_dir = ROOT / "www" / "assets" / ("green-soft-clay" if theme == "dark" else f"theme-packs/{theme}") / "canonical" / "online-random-rematch"
        output_dir.mkdir(parents=True, exist_ok=True)
        with Image.open(master) as loaded:
            source_image = loaded.convert("RGBA")
        box = source_image.getbbox()
        assert box is not None, theme
        glyph = source_image.crop(box)
        square = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
        glyph.thumbnail((232, 232), Image.Resampling.LANCZOS)
        square.alpha_composite(glyph, ((256 - glyph.width) // 2, (256 - glyph.height) // 2))
        icon_path = output_dir / "rematch-icon-v1.png"
        square.save(icon_path, optimize=True)
        surface = button_surface(theme)
        surface_path = output_dir / "rematch-button-v1.png"
        surface.save(surface_path, optimize=True)
        row_y = 30 + index * 160
        painter.text((15, row_y + 46), theme.upper(), fill="#24343c", font=font)
        sample = surface.copy()
        icon_sample = square.resize((75, 75), Image.Resampling.LANCZOS)
        sample.alpha_composite(icon_sample, (18, 27))
        review.paste(sample.convert("RGB"), (115, row_y))
        manifest["assets"].append({
            "theme": theme,
            "direction": "clay" if theme in {"dark", "medium", "amethyst", "desert", "moon"} else "smooth_rubber_matte_plastic",
            "style": "3D Soft Neomorphism",
            "master": master.relative_to(ROOT).as_posix(),
            "icon": icon_path.relative_to(ROOT).as_posix(),
            "button": surface_path.relative_to(ROOT).as_posix(),
            "masterSha256": digest(master),
            "iconSha256": digest(icon_path),
            "buttonSha256": digest(surface_path),
        })
    (SOURCE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    review.save(ROOT / "docs" / "theme-online-rematch-review.png", optimize=True)


if __name__ == "__main__":
    main()
