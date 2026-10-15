"""Prepare theme-specific leaderboard controls from 27 original PNG masters."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "source-assets" / "theme-leaderboard-controls-v2"
MASTERS = SOURCE / "masters"
THEMES = ("light", "medium", "winter", "neon", "amethyst", "easter", "desert", "moon", "severna")
ROLES = ("global", "local", "empty-loading")
SIZES = {"global": 256, "local": 256, "empty-loading": 384}
BACKGROUNDS = {
    "light": "#E6BE83", "medium": "#431720", "winter": "#0E5A9B",
    "neon": "#121B2B", "amethyst": "#3C284B", "easter": "#E5D4B9",
    "desert": "#D79269", "moon": "#252934", "severna": "#182C44",
}


def checksum(file: Path) -> str:
    return hashlib.sha256(file.read_bytes()).hexdigest()


def make_icon(master: Path, size: int) -> Image.Image:
    source = Image.open(master).convert("RGBA")
    alpha = source.getchannel("A")
    bounds = alpha.getbbox()
    if not bounds or alpha.getextrema() == (255, 255):
        raise ValueError(f"Master needs transparent cutout: {master}")
    source = source.crop(bounds)
    limit = round(size * 0.91)
    source.thumbnail((limit, limit), Image.Resampling.LANCZOS)
    output = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    output.alpha_composite(source, ((size - source.width) // 2, (size - source.height) // 2))
    return output


def build() -> None:
    manifest = {
        "schemaVersion": 1,
        "style": "3D Soft Neomorphism",
        "generationMethod": "27 separate built-in imagegen calls, one for each theme and semantic role",
        "technicalDerivatives": "alpha crop and resize only; no cross-theme recoloring",
        "themes": [],
    }
    sheet = Image.new("RGB", (3 * 330, 9 * 245), "#F6F6F6")
    draw = ImageDraw.Draw(sheet)
    for row, theme in enumerate(THEMES):
        group = {"id": theme, "assets": []}
        for col, role in enumerate(ROLES):
            master = MASTERS / f"{theme}-{role}-master-v2.png"
            if not master.exists():
                raise FileNotFoundError(master)
            destination = ROOT / "www" / "assets" / "theme-packs" / theme / "canonical" / "leaderboard-controls" / f"{role}-v2.png"
            destination.parent.mkdir(parents=True, exist_ok=True)
            size = SIZES[role]
            icon = make_icon(master, size)
            icon.save(destination, format="PNG", optimize=True)
            group["assets"].append({
                "role": role,
                "master": str(master.relative_to(ROOT)).replace("\\", "/"),
                "masterSha256": checksum(master),
                "production": str(destination.relative_to(ROOT)).replace("\\", "/"),
                "productionSha256": checksum(destination),
                "size": [size, size],
            })
            tile = Image.new("RGB", (330, 245), BACKGROUNDS[theme])
            large = icon.copy()
            large.thumbnail((182, 182), Image.Resampling.LANCZOS)
            tile.paste(large, (68, 17), large)
            small = icon.resize((32, 32), Image.Resampling.LANCZOS)
            tile.paste(small, (272, 155), small)
            sheet.paste(tile, (col * 330, row * 245))
            foreground = "#FFFFFF" if theme in ("medium", "neon", "amethyst", "moon", "severna") else "#302A26"
            draw.text((col * 330 + 12, row * 245 + 215), f"{theme} / {role}", fill=foreground)
        manifest["themes"].append(group)
    SOURCE.mkdir(parents=True, exist_ok=True)
    (SOURCE / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    sheet.save(ROOT / "docs" / "theme-leaderboard-controls-v2-review.png", format="PNG", optimize=True)
    print("Built 27 theme-specific leaderboard PNG controls")


if __name__ == "__main__":
    build()
