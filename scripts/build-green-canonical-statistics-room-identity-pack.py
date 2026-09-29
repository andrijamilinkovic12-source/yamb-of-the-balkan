from pathlib import Path
import hashlib
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source-assets" / "green-soft-clay-hires" / "statistics-free-v2.png"
CANONICAL_SOURCE_ROOT = ROOT / "source-assets" / "green-soft-clay-canonical" / "statistics-room-identity"
CANONICAL_RUNTIME_ROOT = ROOT / "www" / "assets" / "green-soft-clay" / "canonical" / "statistics-room-identity"
MASTER = CANONICAL_SOURCE_ROOT / "green-statistics-room-master-v1.png"
ROOM_RUNTIME = CANONICAL_RUNTIME_ROOT / "statistics-room-v1.png"
MENU_RUNTIME = CANONICAL_RUNTIME_ROOT / "statistics-room-menu-v1.png"
EXPECTED_HASHES = {
    "master": "a6b66b766925133dd68cce4c290087770d602b633960d082cc42b90ac1a498ea",
    "room": "1b410b9c5af60dfa552122a9eb2ba70abb05bb4f3fdfc4acd7ed0868679611f0",
    "menu": "e4ab3a61aecdb9e14e84159a11b4e5ca1608e87996d663114eedf903ab0654fa",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require_rgba(path: Path, expected_size: tuple[int, int]) -> Image.Image:
    if not path.exists():
        raise FileNotFoundError(f"Missing approved Statistics Room Identity asset: {path}")
    with Image.open(path) as image:
        if image.size != expected_size or image.mode != "RGBA":
            raise ValueError(
                f"Unexpected Statistics Room Identity asset {path}: "
                f"{image.size} {image.mode}; expected {expected_size} RGBA"
            )
        if image.getchannel("A").getextrema() != (0, 255) or image.getpixel((0, 0))[3] != 0:
            raise ValueError(f"Statistics Room Identity must preserve transparent corners and full alpha range: {path}")
        return image.copy()


def main() -> None:
    source_image = require_rgba(SOURCE, (1254, 1254))

    room_image = source_image.resize((512, 512), Image.Resampling.LANCZOS)
    # The approved menu asset intentionally preserves the existing two-stage
    # delivery pipeline, rather than introducing a visually different direct resize.
    menu_image = room_image.resize((384, 384), Image.Resampling.LANCZOS)

    CANONICAL_SOURCE_ROOT.mkdir(parents=True, exist_ok=True)
    CANONICAL_RUNTIME_ROOT.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SOURCE, MASTER)
    room_image.save(ROOM_RUNTIME, format="PNG", optimize=True)
    menu_image.save(MENU_RUNTIME, format="PNG", optimize=True)

    require_rgba(ROOM_RUNTIME, (512, 512))
    require_rgba(MENU_RUNTIME, (384, 384))

    for label, path in (
        ("master", MASTER),
        ("room", ROOM_RUNTIME),
        ("menu", MENU_RUNTIME),
    ):
        with Image.open(path) as image:
            actual_hash = sha256(path)
            if actual_hash != EXPECTED_HASHES[label]:
                raise ValueError(
                    f"Unexpected canonical {label} hash: {actual_hash}; "
                    f"expected {EXPECTED_HASHES[label]}"
                )
            print(
                f"{label}: {image.width}x{image.height} RGBA, "
                f"{path.stat().st_size} B, {actual_hash}"
            )


if __name__ == "__main__":
    main()
