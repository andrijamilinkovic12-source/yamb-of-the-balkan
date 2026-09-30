from pathlib import Path
from io import BytesIO
import hashlib
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source-assets/green-soft-clay-hires/online-players-free-v2.png"
SOURCE_ROOT = ROOT / "source-assets/green-soft-clay-canonical/online-players-room-identity"
RUNTIME_ROOT = ROOT / "www/assets/green-soft-clay/canonical/online-players-room-identity"
MASTER = SOURCE_ROOT / "green-online-players-room-master-v1.png"
ROOM = RUNTIME_ROOT / "online-players-room-v1.png"
MENU = RUNTIME_ROOT / "online-players-room-menu-v1.png"
EXPECTED_HASHES = {
    "master": "d72cf7d27bfbd93662b68ef819bb6376e99018e0b56e61f1666104c4dc5ee65d",
    "room": "319f2407117c1ec539af88248b48ee2c2daaf544342dbf36c13ed2697f2bd189",
    "menu": "330662c03ccc96c84ddd920834bb16a73ee5cc8ff4143cd9fcbaf0089ea6623f",
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
            raise ValueError(f"Unexpected Online Players asset {path}: {image.size} {image.mode}; expected {size} RGBA")
        if image.getchannel("A").getextrema() != (0, 255) or any(
            image.getpixel(corner)[3] != 0
            for corner in ((0, 0), (size[0] - 1, 0), (0, size[1] - 1), (size[0] - 1, size[1] - 1))
        ):
            raise ValueError(f"Online Players identity must preserve full alpha range and transparent corners: {path}")
        return image.copy()


def require_encoded_hash(image: Image.Image, role: str) -> None:
    output = BytesIO()
    image.save(output, format="PNG", optimize=True)
    actual = hashlib.sha256(output.getvalue()).hexdigest()
    if actual != EXPECTED_HASHES[role]:
        raise ValueError(f"PNG encoding changed for {role}: {actual}; no assets have been written")


def main() -> None:
    source = require_rgba(SOURCE, (1254, 1254))
    require_hash(SOURCE, EXPECTED_HASHES["master"])
    # Fixed byte hashes preserve the approved deliveries without depending on
    # retired runtime copies. Validate encoded outputs before any writes.
    room = source.resize((512, 512), Image.Resampling.LANCZOS)
    menu = room.resize((384, 384), Image.Resampling.LANCZOS)
    require_encoded_hash(room, "room")
    require_encoded_hash(menu, "menu")
    for role, destination in (("master", MASTER), ("room", ROOM), ("menu", MENU)):
        if destination.exists():
            require_hash(destination, EXPECTED_HASHES[role])

    SOURCE_ROOT.mkdir(parents=True, exist_ok=True)
    RUNTIME_ROOT.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SOURCE, MASTER)
    room.save(ROOM, format="PNG", optimize=True)
    menu.save(MENU, format="PNG", optimize=True)
    for role, destination, size in (
        ("master", MASTER, (1254, 1254)),
        ("room", ROOM, (512, 512)),
        ("menu", MENU, (384, 384)),
    ):
        require_rgba(destination, size)
        require_hash(destination, EXPECTED_HASHES[role])
        print(f"{role}: {size[0]}x{size[1]} RGBA, {destination.stat().st_size} B, {sha256(destination)}")


if __name__ == "__main__":
    main()
