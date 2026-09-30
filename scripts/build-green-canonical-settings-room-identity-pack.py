from pathlib import Path
import hashlib
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source-assets" / "green-soft-clay-hires" / "settings-free-v2.png"
CANONICAL_SOURCE_ROOT = ROOT / "source-assets" / "green-soft-clay-canonical" / "settings-room-identity"
CANONICAL_RUNTIME_ROOT = ROOT / "www" / "assets" / "green-soft-clay" / "canonical" / "settings-room-identity"
MASTER = CANONICAL_SOURCE_ROOT / "green-settings-room-master-v1.png"
ROOM_RUNTIME = CANONICAL_RUNTIME_ROOT / "settings-room-v1.png"
MENU_RUNTIME = CANONICAL_RUNTIME_ROOT / "settings-room-menu-v1.png"
EXPECTED_HASHES = {
    "master": "e7c20cc7fc3fce6a93c3c69cff6c14e398f405cd80037180c53cc1d89aa8ee67",
    "room": "ab4a2390a61348440cd594ade5aef57c0c1a3a05c0b3f6007b5783630f5ab3c9",
    "menu": "9018529478652929f353e24edf8c02edb1193896791e39b3284b664862915201",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require_rgba(path: Path, expected_size: tuple[int, int]) -> Image.Image:
    if not path.exists():
        raise FileNotFoundError(f"Missing approved Settings Room Identity asset: {path}")
    with Image.open(path) as image:
        if image.size != expected_size or image.mode != "RGBA":
            raise ValueError(
                f"Unexpected Settings Room Identity asset {path}: "
                f"{image.size} {image.mode}; expected {expected_size} RGBA"
            )
        if image.getchannel("A").getextrema() != (0, 255) or image.getpixel((0, 0))[3] != 0:
            raise ValueError(f"Settings Room Identity must preserve transparent corners and full alpha range: {path}")
        return image.copy()


def require_hash(path: Path, expected: str) -> None:
    actual = sha256(path)
    if actual != expected:
        raise ValueError(f"Unexpected hash for {path}: {actual}; expected {expected}")


def main() -> None:
    source_image = require_rgba(SOURCE, (1254, 1254))
    require_hash(SOURCE, EXPECTED_HASHES["master"])

    room_image = source_image.resize((512, 512), Image.Resampling.LANCZOS)
    menu_image = room_image.resize((384, 384), Image.Resampling.LANCZOS)

    CANONICAL_SOURCE_ROOT.mkdir(parents=True, exist_ok=True)
    CANONICAL_RUNTIME_ROOT.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SOURCE, MASTER)
    room_image.save(ROOM_RUNTIME, format="PNG", optimize=True)
    menu_image.save(MENU_RUNTIME, format="PNG", optimize=True)

    for label, path, size in (
        ("master", MASTER, (1254, 1254)),
        ("room", ROOM_RUNTIME, (512, 512)),
        ("menu", MENU_RUNTIME, (384, 384)),
    ):
        require_rgba(path, size)
        require_hash(path, EXPECTED_HASHES[label])
        print(f"{label}: {size[0]}x{size[1]} RGBA, {path.stat().st_size} B, {sha256(path)}")


if __name__ == "__main__":
    main()
