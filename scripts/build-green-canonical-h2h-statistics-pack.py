from pathlib import Path
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "source-assets" / "green-soft-clay-hires" / "statistics"
CANONICAL_ROOT = ROOT / "source-assets" / "green-soft-clay-canonical" / "h2h-statistics"
RUNTIME_ROOT = ROOT / "www" / "assets" / "green-soft-clay" / "canonical" / "h2h-statistics"

ASSETS = (
    ("h2h-identity", "h2h-v1.png", (1254, 1254), (256, 256)),
    ("h2h-empty", "h2h-empty-v1.png", (1254, 1254), (384, 384)),
    ("highest-score", "h2h-detail/highest-score-v1.png", (1254, 1254), (256, 256)),
    ("max-win-margin", "h2h-detail/max-margin-v1.png", (1774, 887), (256, 128)),
    ("worst-loss-margin", "h2h-detail/worst-loss-v1.png", (1254, 1254), (256, 256)),
    ("versus", "h2h-detail/vs-v1.png", (1254, 1254), (256, 256)),
)


def build_asset(
    asset_id: str,
    filename: str,
    source_size: tuple[int, int],
    runtime_size: tuple[int, int],
) -> None:
    source = SOURCE_ROOT / filename
    master = CANONICAL_ROOT / f"green-{asset_id}-master-v1.png"
    runtime = RUNTIME_ROOT / f"{asset_id}-v1.png"

    if not source.exists():
        raise FileNotFoundError(f"Missing approved Green H2H source: {source}")
    master.parent.mkdir(parents=True, exist_ok=True)
    runtime.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(source) as source_image:
        if source_image.size != source_size or source_image.mode != "RGBA":
            raise ValueError(
                f"Unexpected H2H source for {asset_id}: "
                f"{source_image.size} {source_image.mode}"
            )
        canonical_image = source_image.resize(runtime_size, Image.Resampling.LANCZOS)

    shutil.copy2(source, master)
    canonical_image.save(runtime, format="PNG", optimize=True)

    with Image.open(runtime) as rendered_image:
        if rendered_image.size != runtime_size or rendered_image.mode != "RGBA":
            raise ValueError(f"Invalid canonical H2H runtime for {asset_id}")

    print(
        f"{asset_id}: master {source_size[0]}x{source_size[1]}, "
        f"canonical {runtime_size[0]}x{runtime_size[1]}, "
        f"{runtime.stat().st_size // 1024} KB"
    )


def main() -> None:
    for asset in ASSETS:
        build_asset(*asset)


if __name__ == "__main__":
    main()
