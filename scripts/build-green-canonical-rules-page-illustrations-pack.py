from pathlib import Path
import hashlib
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ACTIVE_ROOT = ROOT / "www/assets/green-soft-clay/rules/pages"
MASTER_ROOT = ROOT / "source-assets/green-soft-clay-canonical/rules-page-illustrations"
RUNTIME_ROOT = ROOT / "www/assets/green-soft-clay/canonical/rules-page-illustrations"

ASSETS = (
    ("rules-scoring", 188200, "58d0c32e0cd9c8a92e97a95b6ccb4468df19adde7901ef2052e42a45a3ea00ca"),
    ("stats-leaderboards", 174369, "41b88e864d1933b43ba9081c5ebba6d6844e23afc3fba71f5cac45ecb6969b7a"),
    ("multiplayer-competitions", 193124, "efa52e4b24c8d78602efb812bba4cde8c36fdf4b345fb683337386cd44cbe50b"),
    ("account-server", 240872, "a1092f5af79c8a73982147c78713de0e0fe7b92cfe0bdf7557babb9ba6cfab7a"),
)


def verify(path: Path, byte_count: int, digest: str) -> None:
    if not path.is_file() or path.stat().st_size != byte_count:
        raise ValueError(f"Missing or changed Green Rules page PNG: {path}")
    if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
        raise ValueError(f"Green Rules page SHA-256 differs: {path}")
    with Image.open(path) as image:
        if image.size != (512, 512) or image.mode != "RGBA":
            raise ValueError(f"Green Rules page must be 512x512 RGBA: {path}")
        if image.getchannel("A").getextrema() != (0, 255):
            raise ValueError(f"Green Rules page alpha range differs: {path}")
        if any(image.getpixel(point)[3] != 0 for point in ((0, 0), (511, 0), (0, 511), (511, 511))):
            raise ValueError(f"Green Rules page corner is opaque: {path}")


def copy_verified(source: Path, target: Path, byte_count: int, digest: str) -> None:
    if target.exists():
        verify(target, byte_count, digest)
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        verify(target, byte_count, digest)


def main() -> None:
    for asset_id, byte_count, digest in ASSETS:
        active = ACTIVE_ROOT / f"{asset_id}-v1.png"
        master = MASTER_ROOT / f"green-rules-page-{asset_id}-master-v1.png"
        runtime = RUNTIME_ROOT / f"{asset_id}-v1.png"
        if active.exists():
            verify(active, byte_count, digest)
            copy_verified(active, master, byte_count, digest)
        else:
            verify(master, byte_count, digest)
        copy_verified(master, runtime, byte_count, digest)
        if (active.exists() and active.read_bytes() != master.read_bytes()) or master.read_bytes() != runtime.read_bytes():
            raise ValueError(f"Green Rules page copies differ: {asset_id}")
        print(f"{asset_id}: approved/master/canonical 512x512 RGBA, {byte_count} B, byte-identical")


if __name__ == "__main__":
    main()
