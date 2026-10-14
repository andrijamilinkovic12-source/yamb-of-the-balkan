"""Normalize individually authored Daily Challenge PNGs to the Green slot geometry."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source-assets" / "theme-daily-states-v1"
THEMES = ("light", "medium", "winter", "neon", "amethyst", "easter", "desert", "moon", "severna")
ROLES = ("task", "complete", "already-played")
SIZE = 384
CONTENT = 348


def normalize(source: Path, destination: Path) -> dict:
    original = Image.open(source).convert("RGBA")
    alpha = original.getchannel("A")
    # Generated edge dust is not part of the sculpted silhouette.
    alpha = alpha.point(lambda value: 0 if value < 28 else value)
    original.putalpha(alpha)
    bounds = alpha.getbbox()
    if not bounds:
        raise ValueError(f"Empty icon: {source}")
    subject = original.crop(bounds)
    subject.thumbnail((CONTENT, CONTENT), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    canvas.alpha_composite(subject, ((SIZE - subject.width) // 2, (SIZE - subject.height) // 2))
    destination.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(destination, optimize=True)
    return {
        "source": source.relative_to(ROOT).as_posix(),
        "production": destination.relative_to(ROOT).as_posix(),
        "sha256": hashlib.sha256(destination.read_bytes()).hexdigest(),
        "size": [SIZE, SIZE],
    }


def main() -> None:
    definitions = json.loads((ROOT / "docs" / "theme-definitions.json").read_text(encoding="utf-8"))
    theme_defs = {item["id"]: item for item in definitions["themes"]}
    manifest = {"version": 1, "roles": list(ROLES), "themes": []}
    review = Image.new("RGB", (3 * 232 + 150, 9 * 232 + 52), "#1e222a")
    draw = ImageDraw.Draw(review)
    font = ImageFont.load_default()

    for row, theme in enumerate(THEMES):
        entry = {"id": theme, "name": theme_defs[theme]["nameSr"],
                 "direction": theme_defs[theme]["direction"], "palette": theme_defs[theme]["paletteHex"],
                 "assets": {}}
        draw.text((10, 52 + row * 232 + 8), theme, fill="#f4f4f4", font=font)
        for column, role in enumerate(ROLES):
            source = SOURCE / "masters" / f"{theme}-{role}-master-v1.png"
            if not source.exists():
                raise FileNotFoundError(source)
            destination = ROOT / "www" / "assets" / "theme-packs" / theme / "canonical" / "daily-states" / f"{role}-v1.png"
            entry["assets"][role] = normalize(source, destination)
            icon = Image.open(destination).convert("RGBA")
            icon.thumbnail((190, 190), Image.Resampling.LANCZOS)
            tile = Image.new("RGB", (204, 204), "#eef0ec" if theme in ("light", "winter", "easter", "desert") else "#253044")
            tile.paste(icon, ((204 - icon.width) // 2, (204 - icon.height) // 2), icon)
            x, y = 150 + column * 232, 52 + row * 232
            review.paste(tile, (x, y))
            draw.text((x + 5, y + 207), role, fill="#f4f4f4", font=font)
        manifest["themes"].append(entry)

    for column, role in enumerate(ROLES):
        draw.text((150 + column * 232, 18), role, fill="#f4f4f4", font=font)
    SOURCE.mkdir(parents=True, exist_ok=True)
    (SOURCE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    review.save(ROOT / "docs" / "theme-daily-states-v1-review.png", optimize=True)
    print(f"Built {len(THEMES) * len(ROLES)} distinct Daily Challenge PNGs.")


if __name__ == "__main__":
    main()
