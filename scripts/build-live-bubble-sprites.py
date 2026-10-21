"""Create ten canonical bubble PNG sprites and Treasury previews from original masters."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source-assets" / "theme-live-bubbles-v1" / "masters"
THEMES = ("dark", "light", "medium", "winter", "neon", "amethyst", "easter", "desert", "moon", "severna")
BACKGROUNDS = {
    "dark": "#213b2b", "light": "#e6be83", "medium": "#431720",
    "winter": "#0e5a9b", "neon": "#080d18", "amethyst": "#3c284b",
    "easter": "#e5d4b9", "desert": "#d79269", "moon": "#08090c", "severna": "#0b1830",
}


def hash_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def web_root(theme: str) -> Path:
    pack = "green-soft-clay" if theme == "dark" else f"theme-packs/{theme}"
    return ROOT / "www" / "assets" / pack / "canonical"


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def main() -> None:
    manifest = {"version": 1, "purpose": "Ten independently generated theme bubble PNG sprites", "themes": {}}
    sheet = Image.new("RGB", (1250, 420), "#101820")
    draw = ImageDraw.Draw(sheet)
    for index, theme in enumerate(THEMES):
        master = SOURCE / f"{theme}.png"
        image = Image.open(master).convert("RGBA")
        alpha = image.getchannel("A")
        bounds = alpha.point(lambda value: 255 if value > 12 else 0).getbbox()
        if not bounds:
            raise ValueError(f"Invisible bubble: {master}")
        image = image.crop(bounds)
        scale = min(216 / image.width, 216 / image.height)
        resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
        sprite = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
        sprite.alpha_composite(resized, ((256 - resized.width) // 2, (256 - resized.height) // 2))
        root = web_root(theme)
        target = root / "effects" / "bubble-v1.png"
        target.parent.mkdir(parents=True, exist_ok=True)
        sprite.save(target, optimize=True)

        preview = Image.new("RGBA", (384, 256), (0, 0, 0, 0))
        for px, py, size in ((30, 121, 68), (99, 61, 110), (196, 35, 154), (302, 158, 51)):
            item = sprite.resize((size, size), Image.Resampling.LANCZOS)
            preview.alpha_composite(item, (px, py))
        preview_path = root / "treasury-effect-previews" / "preview-bubbles-v2.png"
        thumb_path = root / "treasury-effect-thumbnails" / "preview-bubbles-v2.png"
        preview_path.parent.mkdir(parents=True, exist_ok=True)
        thumb_path.parent.mkdir(parents=True, exist_ok=True)
        preview.save(preview_path, optimize=True)
        preview.resize((192, 128), Image.Resampling.LANCZOS).save(thumb_path, optimize=True)

        x, y = index % 5 * 250, index // 5 * 210
        draw.rounded_rectangle((x + 5, y + 5, x + 245, y + 205), 14, fill=BACKGROUNDS[theme])
        large = sprite.resize((132, 132), Image.Resampling.LANCZOS)
        small = sprite.resize((34, 34), Image.Resampling.LANCZOS)
        sheet.paste(large, (x + 52, y + 20), large)
        sheet.paste(small, (x + 177, y + 120), small)
        draw.text((x + 18, y + 174), theme, fill="#ffffff", font=ImageFont.load_default())
        manifest["themes"][theme] = {
            "source": relative(master), "sourceSha256": hash_file(master),
            "sprite": relative(target), "spriteSha256": hash_file(target),
            "treasuryPreview": relative(preview_path), "treasuryThumbnail": relative(thumb_path),
            "size": [256, 256],
        }
    review = ROOT / "docs" / "theme-live-bubbles-sprites-review.png"
    sheet.save(review, optimize=True)
    (SOURCE.parent / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Built {len(THEMES)} bubble sprites, previews and {relative(review)}")


if __name__ == "__main__":
    main()
