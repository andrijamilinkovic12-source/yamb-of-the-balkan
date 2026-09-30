from pathlib import Path
import hashlib
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source-assets/green-soft-clay-hires/global-chat-free-v2.png"
SOURCE_ROOT = ROOT / "source-assets/green-soft-clay-canonical/global-chat-room-identity"
RUNTIME_ROOT = ROOT / "www/assets/green-soft-clay/canonical/global-chat-room-identity"
MASTER = SOURCE_ROOT / "green-global-chat-room-master-v1.png"
ROOM = RUNTIME_ROOT / "global-chat-room-v1.png"
MENU = RUNTIME_ROOT / "global-chat-room-menu-v1.png"
EXPECTED_HASHES = {
    "master": "e4b6c9fa9474614af58846a5df24cf196297b22f0673ead64a478c2b5b4bebbf",
    "room": "ea96cb6a2f1a83768074adb6d2d9be44cbf4e9a21819619dbc18bfe7a1237e7e",
    "menu": "57e55c8e9fef67d9576e112cc78bbcc3ba5f1ac006e1d5bd5405e8260517d070",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require_hash(path: Path, expected: str) -> None:
    actual = sha256(path)
    if actual != expected:
        raise ValueError(f"Unexpected hash for {path}: {actual}; expected {expected}")


def require_rgba(path: Path, size: tuple[int, int]) -> Image.Image:
    with Image.open(path) as image:
        if image.size != size or image.mode != "RGBA":
            raise ValueError(f"Unexpected Global Chat asset {path}: {image.size} {image.mode}; expected {size} RGBA")
        if image.getchannel("A").getextrema() != (0, 255) or image.getpixel((0, 0))[3] != 0:
            raise ValueError(f"Global Chat identity must preserve full alpha range and transparent corners: {path}")
        return image.copy()


def main() -> None:
    source = require_rgba(SOURCE, (1254, 1254))
    require_hash(SOURCE, EXPECTED_HASHES["master"])

    room = source.resize((512, 512), Image.Resampling.LANCZOS)
    menu = room.resize((384, 384), Image.Resampling.LANCZOS)

    SOURCE_ROOT.mkdir(parents=True, exist_ok=True)
    RUNTIME_ROOT.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SOURCE, MASTER)
    room.save(ROOM, format="PNG", optimize=True)
    menu.save(MENU, format="PNG", optimize=True)
    for role, path, size in (
        ("master", MASTER, (1254, 1254)),
        ("room", ROOM, (512, 512)),
        ("menu", MENU, (384, 384)),
    ):
        require_rgba(path, size)
        require_hash(path, EXPECTED_HASHES[role])
        print(f"{role}: {size[0]}x{size[1]} RGBA, {path.stat().st_size} B, {sha256(path)}")


if __name__ == "__main__":
    main()
