"""Build production PNG variants from twelve separately generated theme masters."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "source-assets" / "theme-economy-critical-v2"
MASTERS = SOURCE / "masters"
PRODUCTION = ROOT / "www" / "assets" / "theme-packs"
THEMES = ("easter", "desert", "severna")
ROLES = ("ducat", "undo", "video-active", "video-unavailable")
THEME_COLORS = {"easter": "#E5D4B9", "desert": "#D79269", "severna": "#0B1830"}
THEME_DIRECTIONS = {
    "easter": "smooth_rubber_matte_plastic",
    "desert": "clay",
    "severna": "smooth_rubber_matte_plastic",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prepared(master: Path) -> Image.Image:
    source = Image.open(master).convert("RGBA")
    alpha = source.getchannel("A").point(lambda value: 0 if value < 20 else value)
    source.putalpha(alpha)
    bounds = alpha.getbbox()
    if not bounds:
        raise ValueError(f"Empty alpha channel: {master}")
    return source.crop(bounds)


def render(source: Image.Image, size: int, *, angle: int = 0) -> Image.Image:
    if angle:
        source = source.rotate(angle, Image.Resampling.BICUBIC, expand=True)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    limit = round(size * (0.87 if angle else 0.91))
    thumb = source.copy()
    thumb.thumbnail((limit, limit), Image.Resampling.LANCZOS)
    canvas.alpha_composite(thumb, ((size - thumb.width) // 2, (size - thumb.height) // 2))
    return canvas


def outputs(theme: str, role: str) -> list[tuple[Path, int, int]]:
    base = PRODUCTION / theme / "canonical"
    if role == "ducat":
        return [
            (base / "ducat" / "ducat-front-v2.png", 512, 0),
            (base / "ducat" / "ducat-angle-left-v2.png", 512, 12),
            (base / "ducat" / "ducat-angle-right-v2.png", 512, -12),
            (base / "ducat" / "ducat-inline-v2.png", 192, 0),
            (base / "ducat" / "ducat-particle-v2.png", 128, 0),
        ]
    if role == "undo":
        return [
            (base / "undo-token" / "undo-token-front-v2.png", 512, 0),
            (base / "undo-token" / "undo-token-inline-v2.png", 192, 0),
        ]
    state = "active" if role == "video-active" else "unavailable"
    return [
        (base / "rewarded-video" / f"rewarded-video-{state}-v2.png", 256, 0),
        (base / "rewarded-video" / f"rewarded-video-{state}-inline-v2.png", 128, 0),
    ]


def build() -> None:
    manifest = {
        "schemaVersion": 1,
        "style": "3D Soft Neomorphism",
        "generationMethod": "built-in imagegen, one original transparent master per theme and semantic role",
        "technicalDerivatives": "Pillow alpha crop, resize, and a small rotation for two ducat angle views; no cross-theme recoloring",
        "themes": [],
    }
    sheet = Image.new("RGB", (4 * 280, 3 * 320), "#f3f3f3")
    draw = ImageDraw.Draw(sheet)
    for row, theme in enumerate(THEMES):
        group = {"id": theme, "direction": THEME_DIRECTIONS[theme], "assets": []}
        for column, role in enumerate(ROLES):
            master = MASTERS / f"{theme}-{role}-master-v2.png"
            if not master.exists() or master.stat().st_size == 0:
                raise FileNotFoundError(master)
            source = prepared(master)
            variants = []
            for destination, size, angle in outputs(theme, role):
                destination.parent.mkdir(parents=True, exist_ok=True)
                icon = render(source, size, angle=angle)
                icon.save(destination, format="PNG", optimize=True)
                variants.append({
                    "path": str(destination.relative_to(ROOT)).replace("\\", "/"),
                    "sha256": sha256(destination),
                    "size": [size, size],
                })
            group["assets"].append({
                "role": role,
                "master": str(master.relative_to(ROOT)).replace("\\", "/"),
                "masterSha256": sha256(master),
                "variants": variants,
            })
            tile = Image.new("RGB", (280, 320), THEME_COLORS[theme])
            tile.paste(render(source, 240), (20, 25), render(source, 240))
            sheet.paste(tile, (column * 280, row * 320))
            draw.text((column * 280 + 12, row * 320 + 282), f"{theme} / {role}", fill="#ffffff" if theme == "severna" else "#332c26")
        manifest["themes"].append(group)
    SOURCE.mkdir(parents=True, exist_ok=True)
    (SOURCE / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    review = ROOT / "docs" / "theme-economy-critical-v2-review.png"
    sheet.save(review, format="PNG", optimize=True)
    print(f"Built {sum(len(asset['variants']) for theme in manifest['themes'] for asset in theme['assets'])} production PNG files")
    print(review)


if __name__ == "__main__":
    build()
