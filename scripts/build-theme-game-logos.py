"""Normalize original logo masters to the shared transparent PNG canvas."""

from pathlib import Path
import sys
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
THEMES = ("green", "light", "medium", "winter", "neon", "amethyst", "easter", "desert", "moon", "severna")
CANVAS = (1672, 941)
MAX_ART = (1540, 710)


def main() -> None:
    selected = tuple(sys.argv[1:]) or THEMES
    for theme_id in selected:
        if theme_id not in THEMES:
            raise ValueError(f"Unknown theme: {theme_id}")
        version = "v2" if theme_id == "green" else "v1"
        master = ROOT / "source-assets" / "theme-logo-masters" / theme_id / f"game-logo-master-{version}.png"
        destination = (ROOT / "www" / "assets" / "green-soft-clay" / "splash-title-soft-clay-v2.png"
                       if theme_id == "green" else
                       ROOT / "www" / "assets" / "theme-packs" / theme_id / "splash-title-soft-clay-v1.png")
        if not master.is_file():
            raise FileNotFoundError(master)
        if destination.exists():
            raise FileExistsError(f"Refusing to overwrite: {destination}")

        image = Image.open(master).convert("RGBA")
        alpha = image.getchannel("A")
        bounds = alpha.point(lambda value: 255 if value >= 24 else 0).getbbox()
        if bounds is None:
            raise ValueError(f"Empty alpha: {master}")
        image = image.crop(bounds)
        scale = min(MAX_ART[0] / image.width, MAX_ART[1] / image.height)
        size = (round(image.width * scale), round(image.height * scale))
        image = image.resize(size, Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        canvas.alpha_composite(image, ((CANVAS[0] - size[0]) // 2, (CANVAS[1] - size[1]) // 2))
        destination.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(destination, format="PNG", optimize=True, compress_level=9)
        print(f"{theme_id}: source={bounds} art={size} bytes={destination.stat().st_size}")


if __name__ == "__main__":
    main()
