from pathlib import Path
import hashlib
import shutil

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "source-assets/green-soft-clay-hires/leaderboard"
CANONICAL_ROOT = ROOT / "source-assets/green-soft-clay-canonical/leaderboard-controls"
RUNTIME_ROOT = ROOT / "www/assets/green-soft-clay/canonical/leaderboard-controls"
ACTIVE_ROOT = ROOT / "www/assets/green-soft-clay/leaderboard"

ASSETS = (
    {
        "id": "global",
        "source_bytes": 986476,
        "source_sha256": "23ff6206d71ee940dbbbcf4e86e5deba117639c9f3a78d6fa6accf8ed64e1222",
        "runtime_size": 256,
        "runtime_bytes": 47269,
        "runtime_sha256": "3a9aa67230a1d53d6e1e05dac1b8f8ca4a738f92cb3cf07d495bde165ac2519a",
    },
    {
        "id": "local",
        "source_bytes": 863574,
        "source_sha256": "74ac656255517939ad032b8a72bcdc180fae36f490c97eb3d2149ad2a7b744f8",
        "runtime_size": 256,
        "runtime_bytes": 38952,
        "runtime_sha256": "44e60c1c9a9166f77294a9d3197bdb4cfd41c64d283753288635498de39d5630",
    },
    {
        "id": "empty-loading",
        "source_bytes": 732830,
        "source_sha256": "dcc5dadc8889bb495d1496f25d145b2f043343701fc01a72192cbd60998d0afe",
        "runtime_size": 384,
        "runtime_bytes": 68504,
        "runtime_sha256": "7b0c89808cd5185fb53e16a52320f1e575fbeeb691efad255971f5ca9aee67ba",
    },
)


def sha256(file_path: Path) -> str:
    return hashlib.sha256(file_path.read_bytes()).hexdigest()


def require_file(file_path: Path, expected_bytes: int, expected_sha256: str) -> None:
    if not file_path.exists():
        raise FileNotFoundError(f"Missing Green Leaderboard Controls asset: {file_path}")
    if file_path.stat().st_size != expected_bytes or sha256(file_path) != expected_sha256:
        raise ValueError(f"Green Leaderboard Controls bytes or SHA-256 differ: {file_path}")


def require_rgba(file_path: Path, size: int) -> None:
    with Image.open(file_path) as image:
        if image.size != (size, size) or image.mode != "RGBA":
            raise ValueError(f"Unexpected dimensions or color mode: {file_path}")
        if image.getchannel("A").getextrema() != (0, 255):
            raise ValueError(f"Alpha range differs: {file_path}")
        if any(image.getpixel(corner)[3] != 0 for corner in (
            (0, 0), (size - 1, 0), (0, size - 1), (size - 1, size - 1),
        )):
            raise ValueError(f"Nontransparent corner: {file_path}")


def identical(left: Image.Image, right: Image.Image) -> bool:
    return left.size == right.size and all(
        channel.getbbox() is None for channel in ImageChops.difference(left, right).split()
    )


def build_asset(asset: dict[str, object]) -> None:
    asset_id = str(asset["id"])
    size = int(asset["runtime_size"])
    source = SOURCE_ROOT / f"{asset_id}-v1.png"
    active = ACTIVE_ROOT / f"{asset_id}-v1.png"
    master = CANONICAL_ROOT / f"green-leaderboard-{asset_id}-master-v1.png"
    runtime = RUNTIME_ROOT / f"{asset_id}-v1.png"

    require_file(source, int(asset["source_bytes"]), str(asset["source_sha256"]))
    require_rgba(source, 1254)
    if active.exists():
        require_file(active, int(asset["runtime_bytes"]), str(asset["runtime_sha256"]))
        require_rgba(active, size)

    master.parent.mkdir(parents=True, exist_ok=True)
    runtime.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, master)
    require_file(master, int(asset["source_bytes"]), str(asset["source_sha256"]))

    with Image.open(master) as source_image:
        canonical = source_image.resize((size, size), Image.Resampling.LANCZOS)
        canonical.save(runtime, format="PNG", optimize=True)

    require_file(runtime, int(asset["runtime_bytes"]), str(asset["runtime_sha256"]))
    require_rgba(runtime, size)
    if active.exists():
        with Image.open(runtime) as canonical, Image.open(active) as current:
            if not identical(canonical, current):
                raise ValueError(f"Canonical pixels differ from active runtime: {asset_id}")

    print(f"{asset_id}: approved/master 1254x1254, canonical {size}x{size}, {runtime.stat().st_size} B, verified")


def main() -> None:
    for asset in ASSETS:
        build_asset(asset)


if __name__ == "__main__":
    main()
