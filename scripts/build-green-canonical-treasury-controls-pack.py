from pathlib import Path
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
HIRES = ROOT / "source-assets" / "green-soft-clay-hires" / "treasury"
CANONICAL = ROOT / "source-assets" / "green-soft-clay-canonical" / "treasury-controls"
RUNTIME = ROOT / "www" / "assets" / "green-soft-clay" / "canonical" / "treasury-controls"

SUBFAMILIES = {
    "navigation-tabs": (
        "tab-trophies",
        "tab-skins",
        "tab-effects",
        "tab-themes",
    ),
    "item-statuses": (
        "status-owned",
        "status-active",
        "status-locked",
        "status-insufficient",
    ),
}


def main() -> None:
    for subfamily, asset_ids in SUBFAMILIES.items():
        for asset_id in asset_ids:
            source = HIRES / f"{asset_id}-v1.png"
            master = CANONICAL / subfamily / f"green-{asset_id}-master-v1.png"
            runtime = RUNTIME / f"{asset_id}-v1.png"
            if not source.exists():
                raise FileNotFoundError(f"Missing approved Treasury control source: {source}")

            master.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, master)

            with Image.open(master) as source_image:
                image = source_image.convert("RGBA")
                image.thumbnail((256, 256), Image.Resampling.LANCZOS)
                if image.size != (256, 256):
                    raise ValueError(f"Unexpected non-square Treasury control master: {master} -> {image.size}")
                runtime.parent.mkdir(parents=True, exist_ok=True)
                image.save(runtime, format="PNG", optimize=True)
                print(f"{subfamily}/{asset_id}: master {source_image.width}x{source_image.height}, runtime {image.width}x{image.height}, {runtime.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
