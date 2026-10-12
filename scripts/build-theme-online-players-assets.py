"""Prepare individually illustrated Online Players masters for runtime delivery.

The script never draws or overwrites masters. Each of the 60 masters was
generated as its own transparent raster illustration. Here we only normalize
transparent padding and produce size-matched PNGs for the established UI.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
THEMES = {
    "dark": "clay", "light": "rubber", "medium": "clay", "winter": "rubber",
    "neon": "rubber", "amethyst": "clay", "easter": "rubber",
    "desert": "clay", "moon": "clay", "severna": "rubber",
}
ROLES = ("state", "search", "friend", "spectate", "duel", "avatar")


def prepare(master_path: Path, size: int, fraction: float) -> Image.Image:
    image = Image.open(master_path).convert("RGBA")
    alpha = image.getchannel("A")
    bbox = alpha.point(lambda a: 255 if a >= 12 else 0).getbbox()
    if bbox is None:
        raise ValueError(f"No visible subject: {master_path}")
    image = image.crop(bbox)
    content_size = round(size * fraction)
    image.thumbnail((content_size, content_size), Image.Resampling.LANCZOS)
    result = Image.new("RGBA", (size, size))
    result.alpha_composite(image, ((size - image.width) // 2, (size - image.height) // 2))
    return result


def main() -> None:
    seen = set()
    for theme, direction in THEMES.items():
        masters = ROOT / "source-assets" / "theme-icon-packs" / theme / "online-players-internal-v1"
        output = ROOT / "www" / "assets" / "theme-packs" / theme / "canonical" / "online-players-internal"
        output.mkdir(parents=True, exist_ok=True)
        manifest = {
            "theme": theme,
            "style": "3D Soft Neomorphism",
            "direction": direction,
            "source": "Six separately prompted and generated transparent ImageGen illustrations; no procedural icon drawing or cross-theme recoloring",
            "roles": {},
        }
        for role in ROLES:
            size = 256 if role == "state" else 144
            master = masters / f"{role}-master.png"
            production = output / f"{role}-v1.png"
            image = prepare(master, size, .88 if role == "state" else .91)
            image.save(production, optimize=True)
            digest = hashlib.sha256(production.read_bytes()).hexdigest()
            if digest in seen:
                raise ValueError(f"Duplicate production art: {theme}/{role}")
            seen.add(digest)
            manifest["roles"][role] = {
                "master": master.relative_to(ROOT).as_posix(),
                "production": production.relative_to(ROOT).as_posix(),
                "size": [size, size],
                "sha256": digest,
            }
        (masters / "manifest.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(theme, "6 separately illustrated PNGs")


if __name__ == "__main__":
    main()
