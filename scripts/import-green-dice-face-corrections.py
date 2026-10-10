"""Publish corrected Green dice illustrations at their existing canonical slots."""

from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
GREEN = ROOT / "source-assets/green-soft-clay-canonical"
RUNTIME = ROOT / "www/assets/green-soft-clay/canonical"


def save_square(source: Path, target: Path, size: int) -> None:
    with Image.open(source) as image:
        image = image.convert("RGBA")
        image = image.resize((size, size), Image.Resampling.LANCZOS)
        image.save(target, format="PNG", optimize=True)


def main() -> None:
    for name in ("sniper", "potato"):
        master = GREEN / f"achievement-trophies/green-{name}-master-v2.png"
        save_square(master, master, 384)
        save_square(master, RUNTIME / f"achievement-trophies/{name}-v1.png", 256)
    master = GREEN / "rules-page-illustrations/green-rules-page-multiplayer-competitions-master-v2.png"
    save_square(master, master, 512)
    target = RUNTIME / "rules-page-illustrations/multiplayer-competitions-v1.png"
    target.write_bytes(master.read_bytes())
    print("Published two Green trophy PNGs (256 px) and one Rules page PNG (512 px).")


if __name__ == "__main__":
    main()
