from pathlib import Path
import hashlib
import shutil

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "source-assets" / "green-soft-clay-hires" / "daily"
CANONICAL_ROOT = ROOT / "source-assets" / "green-soft-clay-canonical" / "daily-states"
RUNTIME_ROOT = ROOT / "www" / "assets" / "green-soft-clay" / "canonical" / "daily-states"
ACTIVE_ROOT = ROOT / "www" / "assets" / "green-soft-clay" / "daily"

ASSETS = (
    {
        "id": "task",
        "source_sha256": "660c7737a83fbb49dccefa5648fcc999b5fb2669bdf79dae992482fd39a13372",
        "source_bytes": 1136336,
        "runtime_sha256": "750f23bcf3458d5017f838f9717560041279702a0c35a4f4dc4031504cc8ffe9",
        "runtime_bytes": 106757,
    },
    {
        "id": "complete",
        "source_sha256": "d348d061b4764f93e243249d570b43b3c3a3ec46ee785875741d4ab222ad9f75",
        "source_bytes": 1399019,
        "runtime_sha256": "bc340dc50f576c011e6073eb929a914a4538ab39a38a95b4423fbe3e863ba97d",
        "runtime_bytes": 117989,
    },
    {
        "id": "already-played",
        "source_sha256": "ce45193a5ac23d30d757c7e0928016f70b667e06f7daf4903ce87a2a676c69a4",
        "source_bytes": 1239755,
        "runtime_sha256": "3a5b3b09c98487465d463c855e343134a12e33fd15ab02ffe49d4ed0f58eca3e",
        "runtime_bytes": 118655,
    },
)


def sha256(file_path: Path) -> str:
    return hashlib.sha256(file_path.read_bytes()).hexdigest()


def require_file(file_path: Path, expected_bytes: int, expected_sha256: str) -> None:
    if not file_path.exists():
        raise FileNotFoundError(f"Missing Green Daily States input: {file_path}")
    if file_path.stat().st_size != expected_bytes:
        raise ValueError(
            f"Unexpected byte size for {file_path}: "
            f"{file_path.stat().st_size} != {expected_bytes}"
        )
    actual_sha256 = sha256(file_path)
    if actual_sha256 != expected_sha256:
        raise ValueError(
            f"Unexpected SHA-256 for {file_path}: {actual_sha256} != {expected_sha256}"
        )


def require_rgba(file_path: Path, expected_size: tuple[int, int]) -> None:
    with Image.open(file_path) as image:
        if image.size != expected_size or image.mode != "RGBA":
            raise ValueError(
                f"Unexpected Green Daily States PNG: {file_path} -> "
                f"{image.size} {image.mode}"
            )
        alpha_min, alpha_max = image.getchannel("A").getextrema()
        if (alpha_min, alpha_max) != (0, 255):
            raise ValueError(f"Daily state must retain full alpha range: {file_path}")
        if any(image.getpixel(corner)[3] != 0 for corner in ((0, 0), (expected_size[0] - 1, 0), (0, expected_size[1] - 1), (expected_size[0] - 1, expected_size[1] - 1))):
            raise ValueError(f"Daily state corners must stay transparent: {file_path}")


def build_asset(asset: dict[str, object]) -> None:
    asset_id = str(asset["id"])
    source = SOURCE_ROOT / f"{asset_id}-v1.png"
    active = ACTIVE_ROOT / f"{asset_id}-v1.png"
    master = CANONICAL_ROOT / f"green-daily-{asset_id}-master-v1.png"
    runtime = RUNTIME_ROOT / f"{asset_id}-v1.png"

    require_file(source, int(asset["source_bytes"]), str(asset["source_sha256"]))
    require_rgba(source, (1254, 1254))
    if active.exists():
        require_file(active, int(asset["runtime_bytes"]), str(asset["runtime_sha256"]))
        require_rgba(active, (384, 384))

    master.parent.mkdir(parents=True, exist_ok=True)
    runtime.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, master)
    require_file(master, int(asset["source_bytes"]), str(asset["source_sha256"]))

    with Image.open(master) as source_image:
        canonical_image = source_image.resize((384, 384), Image.Resampling.LANCZOS)
        canonical_image.save(runtime, format="PNG", optimize=True)

    require_file(runtime, int(asset["runtime_bytes"]), str(asset["runtime_sha256"]))
    require_rgba(runtime, (384, 384))
    if active.exists():
        with Image.open(runtime) as canonical_image, Image.open(active) as active_image:
            if ImageChops.difference(canonical_image, active_image).getbbox() is not None:
                raise ValueError(f"Canonical and active pixels differ for Daily state: {asset_id}")

    print(
        f"{asset_id}: approved/master 1254x1254, canonical/active 384x384, "
        f"{runtime.stat().st_size} B, approved canonical output"
    )


def main() -> None:
    for asset in ASSETS:
        build_asset(asset)


if __name__ == "__main__":
    main()
