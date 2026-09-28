from pathlib import Path
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
HIRES = ROOT / "source-assets" / "green-soft-clay-hires" / "tournament"
ACTIVE = ROOT / "www" / "assets" / "green-soft-clay" / "tournament"
CANONICAL = ROOT / "source-assets" / "green-soft-clay-canonical" / "tournament-states"
RUNTIME = ROOT / "www" / "assets" / "green-soft-clay" / "canonical" / "tournament-states"

SUBFAMILIES = {
    "registration-actions": (
        "state-register",
        "state-unregister",
        "state-registration-locked",
    ),
    "flow-states": (
        "state-start",
        "state-match-active",
        "state-match-complete",
    ),
}


def main() -> None:
    for subfamily, asset_ids in SUBFAMILIES.items():
        for asset_id in asset_ids:
            source = HIRES / f"{asset_id}-v1.png"
            approved_runtime = ACTIVE / f"{asset_id}-v1.png"
            master = CANONICAL / subfamily / f"green-{asset_id}-master-v1.png"
            runtime = RUNTIME / f"{asset_id}-v1.png"
            if not source.exists():
                raise FileNotFoundError(f"Missing approved Tournament state source: {source}")
            if not approved_runtime.exists():
                raise FileNotFoundError(f"Missing approved Tournament state runtime: {approved_runtime}")

            master.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, master)

            with Image.open(master) as source_image, Image.open(approved_runtime) as active_image:
                image = source_image.convert("RGBA")
                image.thumbnail((256, 256), Image.Resampling.LANCZOS)
                canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
                offset = ((canvas.width - image.width) // 2, (canvas.height - image.height) // 2)
                canvas.alpha_composite(image, offset)
                runtime.parent.mkdir(parents=True, exist_ok=True)
                canvas.save(runtime, format="PNG", optimize=True)
                print(
                    f"{subfamily}/{asset_id}: master {source_image.width}x{source_image.height}, "
                    f"active {active_image.width}x{active_image.height}, content {image.width}x{image.height}, "
                    f"runtime {canvas.width}x{canvas.height}, offset {offset[0]},{offset[1]}, "
                    f"{runtime.stat().st_size // 1024} KB"
                )


if __name__ == "__main__":
    main()
