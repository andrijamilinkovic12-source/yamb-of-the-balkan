"""Derive small Treasury card PNGs from the ten approved theme backgrounds."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1] / "www" / "assets"
SOURCES = {
    "dark": "green-clay-balkan-diorama-v4.png",
    "light": "theme-backgrounds/light-v9.png",
    "medium": "theme-backgrounds/medium-v9.png",
    "winter": "theme-backgrounds/winter-v13.png",
    "neon": "theme-backgrounds/neon-v4.png",
    "amethyst": "theme-backgrounds/amethyst-v6.png",
    "easter": "theme-backgrounds/easter-v6-1.png",
    "desert": "theme-backgrounds/desert-v8-2.png",
    "moon": "theme-backgrounds/moon-v14.png",
    "severna": "theme-backgrounds/severna-v4.png",
}
TARGET_SIZE = (188, 334)  # Twice the visible width with the original portrait ratio.


def main() -> None:
    output_dir = ROOT / "treasury-theme-previews"
    output_dir.mkdir(exist_ok=True)
    original_bytes = 0
    preview_bytes = 0
    for theme, source_name in SOURCES.items():
        source = ROOT / source_name
        target = output_dir / f"{theme}-v1.png"
        with Image.open(source) as image:
            image = image.convert("RGB")
            image.thumbnail(TARGET_SIZE, Image.Resampling.LANCZOS)
            image.save(target, format="PNG", optimize=True)
        original_bytes += source.stat().st_size
        preview_bytes += target.stat().st_size
    print(f"{len(SOURCES)} previews: {original_bytes:,} -> {preview_bytes:,} bytes")


if __name__ == "__main__":
    main()
