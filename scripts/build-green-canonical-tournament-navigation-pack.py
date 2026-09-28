from pathlib import Path
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
HIRES = ROOT / "source-assets" / "green-soft-clay-hires" / "tournament"
ACTIVE = ROOT / "www" / "assets" / "green-soft-clay" / "tournament"
CANONICAL = ROOT / "source-assets" / "green-soft-clay-canonical" / "tournament-navigation"
RUNTIME = ROOT / "www" / "assets" / "green-soft-clay" / "canonical" / "tournament-navigation"

NAVIGATION_IDS = (
    "tab-info",
    "tab-bracket",
    "tab-hall-of-fame",
)


def main() -> None:
    for navigation_id in NAVIGATION_IDS:
        source = HIRES / f"{navigation_id}-v1.png"
        approved_runtime = ACTIVE / f"{navigation_id}-v1.png"
        master = CANONICAL / f"green-{navigation_id}-master-v1.png"
        runtime = RUNTIME / f"{navigation_id}-v1.png"
        if not source.exists():
            raise FileNotFoundError(f"Missing approved Tournament navigation source: {source}")
        if not approved_runtime.exists():
            raise FileNotFoundError(f"Missing approved Tournament navigation runtime: {approved_runtime}")

        master.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, master)

        with Image.open(master) as source_image, Image.open(approved_runtime) as approved_image:
            image = approved_image.convert("RGBA")
            if image.width > 256 or image.height > 256:
                raise ValueError(f"Approved Tournament navigation runtime exceeds 256 pixels: {approved_runtime} -> {image.size}")
            canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
            offset = ((canvas.width - image.width) // 2, (canvas.height - image.height) // 2)
            canvas.alpha_composite(image, offset)
            runtime.parent.mkdir(parents=True, exist_ok=True)
            if image.size == canvas.size:
                shutil.copy2(approved_runtime, runtime)
            else:
                canvas.save(runtime, format="PNG", optimize=True)
            print(
                f"{navigation_id}: master {source_image.width}x{source_image.height}, "
                f"content {image.width}x{image.height}, runtime {canvas.width}x{canvas.height}, "
                f"offset {offset[0]},{offset[1]}, {runtime.stat().st_size // 1024} KB"
            )


if __name__ == "__main__":
    main()
