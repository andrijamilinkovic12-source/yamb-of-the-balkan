"""Build the reversible Neon Cyber board PNG trial from its original renders."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / "source-assets/theme-icon-packs/neon/game-board-png-trial"
OUTPUT = ROOT / "www/assets/theme-packs/neon/trial/game-board-png-v1"
OUTPUT.mkdir(parents=True, exist_ok=True)
RESAMPLE = Image.Resampling.LANCZOS


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def crop_render(name: str) -> Image.Image:
    image = Image.open(SOURCES / name).convert("RGBA")
    alpha = image.getchannel("A")
    bounds = alpha.point(lambda value: 255 if value >= 8 else 0).getbbox()
    if not bounds:
        raise ValueError(f"No visible material in {name}")
    return image.crop(bounds)


def set_opacity(image: Image.Image, opacity: float) -> Image.Image:
    image = image.copy()
    image.putalpha(image.getchannel("A").point(lambda value: round(value * opacity)))
    return image


def build_cell(source: str, target: str, opacity: float) -> None:
    image = crop_render(source).resize((512, 256), RESAMPLE)
    set_opacity(image, opacity).save(OUTPUT / target, optimize=True)


def build_frame() -> None:
    """Compress the rendered frame into a thin nine-slice rim around clear cells."""
    source = crop_render("frame-master-v1.png")
    width, height = source.size
    sx, sy = 130, 130
    target = Image.new("RGBA", (768, 1024))
    tx, ty = 20, 12
    x_spans = [(0, sx, 0, tx), (sx, width - sx, tx, 768 - tx),
               (width - sx, width, 768 - tx, 768)]
    y_spans = [(0, sy, 0, ty), (sy, height - sy, ty, 1024 - ty),
               (height - sy, height, 1024 - ty, 1024)]
    for row, (y0, y1, dy0, dy1) in enumerate(y_spans):
        for col, (x0, x1, dx0, dx1) in enumerate(x_spans):
            if row == 1 and col == 1:
                continue
            piece = source.crop((x0, y0, x1, y1)).resize((dx1 - dx0, dy1 - dy0), RESAMPLE)
            target.paste(piece, (dx0, dy0))
    set_opacity(target, 0.82).save(OUTPUT / "board-frame-v1.png", optimize=True)


build_frame()
build_cell("score-cell-master-v1.png", "score-cell-v1.png", 0.62)
build_cell("header-cell-master-v1.png", "header-cell-v1.png", 0.75)

roles = (
    ("board-frame", "frame-master-v1.png", "board-frame-v1.png", [768, 1024]),
    ("score-cell", "score-cell-master-v1.png", "score-cell-v1.png", [512, 256]),
    ("header-cell", "header-cell-master-v1.png", "header-cell-v1.png", [512, 256]),
)
manifest = {
    "themeId": "neon",
    "status": "applied-trial-awaiting-user-review",
    "style": "3D Soft Neomorphism",
    "direction": "smooth_rubber_matte_plastic",
    "canonicalFallback": "theme-game-board.css?v=7",
    "geometry": "unchanged shared game board DOM and CSS dimensions",
    "assets": [
        {
            "role": role,
            "master": master,
            "masterSha256": sha256(SOURCES / master),
            "runtime": str((OUTPUT / runtime).relative_to(ROOT)).replace("\\", "/"),
            "runtimeSha256": sha256(OUTPUT / runtime),
            "runtimeSize": size,
            "format": "RGBA PNG",
        }
        for role, master, runtime, size in roles
    ],
}
(SOURCES / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("Built 3 Neon Cyber board PNG trial assets")
