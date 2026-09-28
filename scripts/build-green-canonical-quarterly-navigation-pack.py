from pathlib import Path
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
HIRES = ROOT / "source-assets" / "green-soft-clay-hires" / "ql"
CANONICAL = ROOT / "source-assets" / "green-soft-clay-canonical" / "quarterly-navigation"
RUNTIME = ROOT / "www" / "assets" / "green-soft-clay" / "canonical" / "quarterly-navigation"

NAVIGATION_IDS = (
    "tab-league",
    "tab-hall-of-fame",
    "tab-medals",
    "tab-champions",
)


def main() -> None:
    for navigation_id in NAVIGATION_IDS:
        source = HIRES / f"{navigation_id}-v1.png"
        master = CANONICAL / f"green-{navigation_id}-master-v1.png"
        runtime = RUNTIME / f"{navigation_id}-v1.png"
        if not source.exists():
            raise FileNotFoundError(f"Missing approved Quarterly League navigation source: {source}")

        master.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, master)

        with Image.open(master) as source_image:
            if source_image.size != (512, 512):
                raise ValueError(f"Unexpected Quarterly League navigation master geometry: {master} -> {source_image.size}")
            image = source_image.convert("RGBA")
            image.thumbnail((256, 256), Image.Resampling.LANCZOS)
            if image.size != (256, 256):
                raise ValueError(f"Unexpected Quarterly League navigation runtime geometry: {runtime} -> {image.size}")
            runtime.parent.mkdir(parents=True, exist_ok=True)
            image.save(runtime, format="PNG", optimize=True)
            print(f"{navigation_id}: master {source_image.width}x{source_image.height}, runtime {image.width}x{image.height}, {runtime.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
