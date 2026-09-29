from pathlib import Path
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source-assets" / "green-soft-clay-hires" / "hotseat" / "winner-v1.png"
ACTIVE = ROOT / "www" / "assets" / "green-soft-clay" / "hotseat" / "winner-v1.png"
CANONICAL = ROOT / "source-assets" / "green-soft-clay-canonical" / "hotseat-winner"
RUNTIME = ROOT / "www" / "assets" / "green-soft-clay" / "canonical" / "hotseat-winner"


def main() -> None:
    for required in (SOURCE, ACTIVE):
        if not required.exists():
            raise FileNotFoundError(f"Missing approved Green Hotseat Winner asset: {required}")

    master = CANONICAL / "green-hotseat-winner-master-v1.png"
    runtime = RUNTIME / "hotseat-winner-v1.png"
    master.parent.mkdir(parents=True, exist_ok=True)
    runtime.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SOURCE, master)

    with Image.open(master) as source_image, Image.open(ACTIVE) as active_image:
        if source_image.size != (512, 512) or source_image.mode != "RGBA":
            raise ValueError(
                f"Unexpected Hotseat Winner source: {source_image.size} {source_image.mode}"
            )
        if active_image.size != (384, 384) or active_image.mode != "RGBA":
            raise ValueError(
                f"Unexpected Hotseat Winner active runtime: {active_image.size} {active_image.mode}"
            )

        canonical_image = source_image.copy()
        canonical_image.thumbnail((256, 256), Image.Resampling.LANCZOS)
        if canonical_image.size != (256, 256):
            raise ValueError(
                f"Unexpected non-square Hotseat Winner source: {master} -> {canonical_image.size}"
            )
        canonical_image.save(runtime, format="PNG", optimize=True)

    print(
        f"hotseat-winner: master 512x512, active 384x384, canonical 256x256, "
        f"{runtime.stat().st_size // 1024} KB"
    )


if __name__ == "__main__":
    main()
