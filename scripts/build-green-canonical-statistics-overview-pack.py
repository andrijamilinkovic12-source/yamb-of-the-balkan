from pathlib import Path
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "source-assets" / "green-soft-clay-hires" / "statistics"
CANONICAL_ROOT = ROOT / "source-assets" / "green-soft-clay-canonical" / "statistics-overview"
RUNTIME_ROOT = ROOT / "www" / "assets" / "green-soft-clay" / "canonical" / "statistics-overview"

ASSETS = (
    ("power-index", "power-index-bolt-v1.png"),
    ("record", "record-v1.png"),
    ("games", "games-v1.png"),
    ("wins", "wins-v1.png"),
    ("draws", "draws-v1.png"),
    ("losses", "losses-v1.png"),
    ("fire-streak", "fire-streak-v1.png"),
    ("average", "average-v1.png"),
    ("trophies", "trophies-v1.png"),
    ("all-time-points", "all-time-points-v1.png"),
)


def build_asset(asset_id: str, filename: str) -> None:
    source = SOURCE_ROOT / filename
    master = CANONICAL_ROOT / f"green-{asset_id}-master-v1.png"
    runtime = RUNTIME_ROOT / f"{asset_id}-v1.png"

    if not source.exists():
        raise FileNotFoundError(f"Missing approved Green Statistics source: {source}")
    master.parent.mkdir(parents=True, exist_ok=True)
    runtime.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, master)

    with Image.open(master) as source_image:
        if source_image.size != (1254, 1254) or source_image.mode != "RGBA":
            raise ValueError(
                f"Unexpected Statistics source for {asset_id}: "
                f"{source_image.size} {source_image.mode}"
            )
        canonical_image = source_image.resize((256, 256), Image.Resampling.LANCZOS)
        canonical_image.save(runtime, format="PNG", optimize=True)

    print(
        f"{asset_id}: master 1254x1254, canonical 256x256, "
        f"{runtime.stat().st_size // 1024} KB"
    )


def main() -> None:
    for asset_id, filename in ASSETS:
        build_asset(asset_id, filename)


if __name__ == "__main__":
    main()
