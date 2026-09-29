from pathlib import Path
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "source-assets" / "green-soft-clay-hires" / "solo"
CANONICAL_ROOT = ROOT / "source-assets" / "green-soft-clay-canonical" / "solo-results"
RUNTIME_ROOT = ROOT / "www" / "assets" / "green-soft-clay" / "canonical" / "solo-results"

ASSETS = (
    ("personal-best", "personal-best-v1.png"),
    ("finish-score-mark", "finish-score-mark-v1.png"),
    ("finish-claim", "finish-claim-v1.png"),
)


def build_asset(asset_id: str, filename: str) -> None:
    source = SOURCE_ROOT / filename
    master = CANONICAL_ROOT / f"green-{asset_id}-master-v1.png"
    runtime = RUNTIME_ROOT / f"{asset_id}-v1.png"

    if not source.exists():
        raise FileNotFoundError(f"Missing approved Green Solo Result source: {source}")

    master.parent.mkdir(parents=True, exist_ok=True)
    runtime.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, master)

    with Image.open(master) as source_image:
        if source_image.size != (512, 512) or source_image.mode != "RGBA":
            raise ValueError(
                f"Unexpected Solo Result source for {asset_id}: "
                f"{source_image.size} {source_image.mode}"
            )
        canonical_image = source_image.copy()
        canonical_image.thumbnail((256, 256), Image.Resampling.LANCZOS)
        if canonical_image.size != (256, 256):
            raise ValueError(
                f"Unexpected non-square Solo Result source: {master} -> {canonical_image.size}"
            )
        canonical_image.save(runtime, format="PNG", optimize=True)

    print(
        f"{asset_id}: master 512x512, canonical 256x256, "
        f"{runtime.stat().st_size // 1024} KB"
    )


def main() -> None:
    for asset_id, filename in ASSETS:
        build_asset(asset_id, filename)


if __name__ == "__main__":
    main()
