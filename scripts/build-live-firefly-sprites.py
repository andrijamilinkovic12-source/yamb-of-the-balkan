"""Trim and resize the ten independently generated firefly masters."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source-assets" / "theme-live-fireflies-v1" / "masters"
THEMES = (
    "dark", "light", "medium", "winter", "neon",
    "amethyst", "easter", "desert", "moon", "severna",
)
BACKGROUNDS = {
    "dark": "#213b2b", "light": "#e6be83", "medium": "#431720",
    "winter": "#0e5a9b", "neon": "#080d18", "amethyst": "#3c284b",
    "easter": "#e5d4b9", "desert": "#d79269", "moon": "#08090c",
    "severna": "#0b1830",
}


def output_path(theme: str) -> Path:
    root = "green-soft-clay" if theme == "dark" else f"theme-packs/{theme}"
    return ROOT / "www" / "assets" / root / "canonical" / "effects" / "firefly-v1.png"


def treasury_paths(theme: str) -> tuple[Path, Path]:
    root = "green-soft-clay" if theme == "dark" else f"theme-packs/{theme}"
    base = ROOT / "www" / "assets" / root / "canonical"
    return (
        base / "treasury-effect-previews" / "preview-fireflies-v2.png",
        base / "treasury-effect-thumbnails" / "preview-fireflies-v2.png",
    )


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    sheet = Image.new("RGB", (1250, 420), "#101820")
    draw = ImageDraw.Draw(sheet)
    manifest = {"version": 1, "purpose": "Ten original theme firefly PNG sprites", "themes": {}}
    for index, theme in enumerate(THEMES):
        source = SOURCE / f"{theme}.png"
        image = Image.open(source).convert("RGBA")
        alpha = image.getchannel("A")
        bounds = alpha.point(lambda value: 255 if value > 12 else 0).getbbox()
        if not bounds:
            raise ValueError(f"No visible firefly in {source}")
        image = image.crop(bounds)
        scale = min(216 / image.width, 216 / image.height)
        resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
        sprite = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
        sprite.alpha_composite(resized, ((256 - resized.width) // 2, (256 - resized.height) // 2))
        target = output_path(theme)
        target.parent.mkdir(parents=True, exist_ok=True)
        sprite.save(target, optimize=True)

        preview = Image.new("RGBA", (384, 256), (0, 0, 0, 0))
        for px, py, size in ((40, 62, 102), (151, 23, 160), (274, 115, 76)):
            fly = sprite.resize((size, size), Image.Resampling.LANCZOS)
            glow = Image.new("RGBA", preview.size, (0, 0, 0, 0))
            glow.alpha_composite(fly, (px, py))
            glow.putalpha(glow.getchannel("A").filter(ImageFilter.GaussianBlur(10)).point(lambda value: round(value * .34)))
            preview.alpha_composite(glow)
            preview.alpha_composite(fly, (px, py))
        preview_path, thumbnail_path = treasury_paths(theme)
        preview_path.parent.mkdir(parents=True, exist_ok=True)
        thumbnail_path.parent.mkdir(parents=True, exist_ok=True)
        preview.save(preview_path, optimize=True)
        preview.resize((192, 128), Image.Resampling.LANCZOS).save(thumbnail_path, optimize=True)

        x = index % 5 * 250
        y = index // 5 * 210
        draw.rounded_rectangle((x + 5, y + 5, x + 245, y + 205), 14, fill=BACKGROUNDS[theme])
        large = sprite.resize((126, 126), Image.Resampling.LANCZOS)
        small = sprite.resize((38, 38), Image.Resampling.LANCZOS)
        sheet.paste(large, (x + 57, y + 22), large)
        sheet.paste(small, (x + 168, y + 112), small)
        draw.text((x + 18, y + 174), theme, fill="#ffffff", font=ImageFont.load_default())
        manifest["themes"][theme] = {
            "source": str(source.relative_to(ROOT)).replace("\\", "/"),
            "sourceSha256": digest(source),
            "sprite": str(target.relative_to(ROOT)).replace("\\", "/"),
            "spriteSha256": digest(target),
            "treasuryPreview": str(preview_path.relative_to(ROOT)).replace("\\", "/"),
            "treasuryThumbnail": str(thumbnail_path.relative_to(ROOT)).replace("\\", "/"),
            "size": [256, 256],
        }
    review = ROOT / "docs" / "theme-live-fireflies-sprites-review.png"
    sheet.save(review, optimize=True)
    (SOURCE.parent / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Built {len(THEMES)} transparent 256px sprites and {review.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
