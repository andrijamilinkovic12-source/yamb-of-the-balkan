from io import BytesIO
from pathlib import Path
import hashlib
import shutil

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source-assets/green-soft-clay-hires/mode-opponent-free-v2.png"
SOURCE_ROOT = ROOT / "source-assets/green-soft-clay-canonical/online-random-room-identity"
RUNTIME_ROOT = ROOT / "www/assets/green-soft-clay/canonical/online-random-room-identity"
MASTER = SOURCE_ROOT / "green-online-random-room-master-v1.png"
ROOM = RUNTIME_ROOT / "online-random-room-v1.png"
MENU = RUNTIME_ROOT / "online-random-room-menu-v1.png"
ACTIVE_ROOM = ROOT / "www/assets/green-soft-clay/mode-opponent-free-v2.png"
ACTIVE_MENU = ROOT / "www/assets/green-soft-clay/runtime/menu/mode-opponent-free-v2.png"
EXPECTED_HASHES = {
    "master": "a21b7126b79b31ae7bad4463d78f6e31c2788bded62065f91fc363d940c7541d",
    "room": "4a35ca20523d6ed8929f4179767841eee53dd1d15665078cf7e175a957a5820a",
    "menu": "a1593092e3f0634f2f07d824b9fc3173eb654f9f30690e3d20fbdf33a27aceb4",
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
            raise ValueError(
                f"Unexpected Online Random image {path}: {image.size} {image.mode}; expected {size} RGBA"
            )
        if image.getchannel("A").getextrema() != (0, 255) or any(
            image.getpixel(corner)[3] != 0
            for corner in ((0, 0), (size[0] - 1, 0), (0, size[1] - 1), (size[0] - 1, size[1] - 1))
        ):
            raise ValueError(f"Online Random image must preserve full alpha range and transparent corners: {path}")
        return image.copy()


def identical(left: Image.Image, right: Image.Image) -> bool:
    return left.size == right.size and all(
        channel.getbbox() is None for channel in ImageChops.difference(left, right).split()
    )


def require_encoded_hash(image: Image.Image, role: str) -> None:
    output = BytesIO()
    image.save(output, format="PNG", optimize=True)
    actual = hashlib.sha256(output.getvalue()).hexdigest()
    if actual != EXPECTED_HASHES[role]:
        raise ValueError(f"PNG encoding changed for {role}: {actual}; no assets have been written")


def main() -> None:
    source = require_rgba(SOURCE, (1254, 1254))
    require_hash(SOURCE, EXPECTED_HASHES["master"])
    room = source.resize((512, 512), Image.Resampling.LANCZOS)
    menu = room.resize((384, 384), Image.Resampling.LANCZOS)
    require_encoded_hash(room, "room")
    require_encoded_hash(menu, "menu")

    # The old deliveries are comparison controls while present; the build stays
    # reproducible after their planned retirement from the active www tree.
    for role, active, generated, size in (
        ("room", ACTIVE_ROOM, room, (512, 512)),
        ("menu", ACTIVE_MENU, menu, (384, 384)),
    ):
        if active.exists():
            approved = require_rgba(active, size)
            require_hash(active, EXPECTED_HASHES[role])
            if not identical(generated, approved):
                raise ValueError(f"Canonical {role} pixels differ from the approved delivery: {active}")

    for role, destination in (("master", MASTER), ("room", ROOM), ("menu", MENU)):
        if destination.exists():
            require_hash(destination, EXPECTED_HASHES[role])

    SOURCE_ROOT.mkdir(parents=True, exist_ok=True)
    RUNTIME_ROOT.mkdir(parents=True, exist_ok=True)
    if not MASTER.exists():
        shutil.copy2(SOURCE, MASTER)
    if not ROOM.exists():
        room.save(ROOM, format="PNG", optimize=True)
    if not MENU.exists():
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
