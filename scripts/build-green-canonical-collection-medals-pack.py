from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
CANONICAL = ROOT / "source-assets" / "green-soft-clay-canonical" / "collection-medals"
RUNTIME = ROOT / "www" / "assets" / "green-soft-clay" / "canonical" / "collection-medals"

ASSETS = {
    "gold": CANONICAL / "green-collection-gold-master-v1.png",
    "silver": CANONICAL / "green-collection-silver-master-v1.png",
    "bronze": CANONICAL / "green-collection-bronze-master-v1.png",
}


def main() -> None:
    for tier, master in ASSETS.items():
        if not master.exists():
            raise FileNotFoundError(f"Missing approved Collection medal master: {master}")
        with Image.open(master) as source_image:
            image = source_image.convert("RGBA")
            image.thumbnail((256, 256), Image.Resampling.LANCZOS)
            if image.size != (256, 256):
                raise ValueError(f"Unexpected non-square Collection medal master: {master} -> {image.size}")
            destination = RUNTIME / f"collection-{tier}-v1.png"
            destination.parent.mkdir(parents=True, exist_ok=True)
            image.save(destination, format="PNG", optimize=True)
            print(f"{destination.relative_to(ROOT)}: {image.width}x{image.height}, {destination.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
