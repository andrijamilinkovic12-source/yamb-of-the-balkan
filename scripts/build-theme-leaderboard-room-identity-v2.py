"""Derive the Top lista room and menu PNGs from nine individual themed masters."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "source-assets" / "theme-leaderboard-room-identity-v2"
THEMES = ("light", "medium", "winter", "neon", "amethyst", "easter", "desert", "moon", "severna")
BACKGROUNDS = {
    "light": "#E6BE83", "medium": "#431720", "winter": "#0E5A9B",
    "neon": "#121B2B", "amethyst": "#3C284B", "easter": "#E5D4B9",
    "desert": "#D79269", "moon": "#252934", "severna": "#182C44",
}


def checksum(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def clean_master(path: Path) -> Image.Image:
    source = Image.open(path).convert("RGBA")
    alpha = source.getchannel("A")
    if alpha.getextrema() == (255, 255):
        raise ValueError(f"Expected a transparent master: {path}")
    # Remove isolated alpha specks left by the renderer, while preserving the
    # separately drawn theme's volume and color.
    alpha = alpha.point(lambda value: 0 if value < 48 else value).filter(ImageFilter.MedianFilter(3))
    bounds = alpha.getbbox()
    if not bounds:
        raise ValueError(f"Empty master: {path}")
    source.putalpha(alpha)
    return source.crop(bounds)


def derivative(source: Image.Image, size: int) -> Image.Image:
    icon = source.copy()
    icon.thumbnail((round(size * .91), round(size * .91)), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", (size, size))
    out.alpha_composite(icon, ((size - icon.width) // 2, (size - icon.height) // 2))
    return out


def build() -> None:
    manifest = {
        "schemaVersion": 1,
        "style": "3D Soft Neomorphism; individual theme Clay or Smooth Rubber / Matte Plastic direction",
        "generationMethod": "Nine separate imagegen edits, each referencing only its own theme's canonical Global podium PNG",
        "technicalDerivatives": "alpha-speck cleanup, alpha crop and resize from each theme's original master; no cross-theme recoloring",
        "themes": [],
    }
    sheet = Image.new("RGB", (900, 9 * 200), "#F6F6F6")
    draw = ImageDraw.Draw(sheet)
    for row, theme in enumerate(THEMES):
        master = SOURCE / "masters" / f"{theme}-master-v2.png"
        cleaned = clean_master(master)
        entry = {"id": theme, "master": str(master.relative_to(ROOT)).replace("\\", "/"),
                 "masterSha256": checksum(master), "assets": []}
        runtime = ROOT / "www" / "assets" / "theme-packs" / theme / "canonical" / "leaderboard-room-identity"
        runtime.mkdir(parents=True, exist_ok=True)
        for role, size, filename in (("room", 512, "leaderboard-room-v2.png"),
                                     ("menu", 384, "leaderboard-room-menu-v2.png")):
            out = runtime / filename
            derivative(cleaned, size).save(out, format="PNG", optimize=True)
            entry["assets"].append({"role": role, "production": str(out.relative_to(ROOT)).replace("\\", "/"),
                                    "productionSha256": checksum(out), "size": [size, size]})
        manifest["themes"].append(entry)
        y = row * 200
        draw.rectangle((0, y, 900, y + 199), fill=BACKGROUNDS[theme])
        room = Image.open(runtime / "leaderboard-room-v2.png").convert("RGBA")
        room.thumbnail((160, 160), Image.Resampling.LANCZOS)
        sheet.paste(room, (42, y + 12), room)
        global_icon = Image.open(ROOT / "www" / "assets" / "theme-packs" / theme /
                                 "canonical" / "leaderboard-controls" / "global-v2.png").convert("RGBA")
        global_icon.thumbnail((160, 160), Image.Resampling.LANCZOS)
        sheet.paste(global_icon, (320, y + 12), global_icon)
        menu = Image.open(runtime / "leaderboard-room-menu-v2.png").convert("RGBA")
        menu.thumbnail((68, 68), Image.Resampling.LANCZOS)
        sheet.paste(menu, (575, y + 54), menu)
        color = "#FFFFFF" if theme in ("medium", "neon", "amethyst", "moon", "severna") else "#302A26"
        draw.text((680, y + 85), theme, fill=color)
    (SOURCE / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    sheet.save(ROOT / "docs" / "theme-leaderboard-room-identity-v2-review.png", format="PNG", optimize=True)
    print("Built 18 PNG derivatives from nine individual themed Top lista masters")


if __name__ == "__main__":
    build()
