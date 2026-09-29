from pathlib import Path
import hashlib
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source-assets" / "green-soft-clay-hires" / "daily-challenge-free-v2.png"
CANONICAL_SOURCE_ROOT = ROOT / "source-assets" / "green-soft-clay-canonical" / "daily-room-identity"
CANONICAL_RUNTIME_ROOT = ROOT / "www" / "assets" / "green-soft-clay" / "canonical" / "daily-room-identity"
MASTER = CANONICAL_SOURCE_ROOT / "green-daily-room-master-v1.png"
ROOM_RUNTIME = CANONICAL_RUNTIME_ROOT / "daily-room-v1.png"
MENU_RUNTIME = CANONICAL_RUNTIME_ROOT / "daily-room-menu-v1.png"
EXPECTED_HASHES = {
    "master": "b4aee4510505f2b60fc8a321ac0bbaa60cfeb170a2bf7675dbc01440abf4b163",
    "room": "1a0669083da288f1cb4bd673508acf0e6d4380b7fa1346c03004ebddd4343dcc",
    "menu": "ac6eae4d916598174fa9bb7a54f7ed326fa1f6dae7d5a4a68e1e4eb40b666c07",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require_rgba(path: Path, expected_size: tuple[int, int]) -> Image.Image:
    if not path.exists():
        raise FileNotFoundError(f"Missing approved Daily Room Identity asset: {path}")
    with Image.open(path) as image:
        if image.size != expected_size or image.mode != "RGBA":
            raise ValueError(
                f"Unexpected Daily Room Identity asset {path}: "
                f"{image.size} {image.mode}; expected {expected_size} RGBA"
            )
        if image.getchannel("A").getextrema() != (0, 255) or image.getpixel((0, 0))[3] != 0:
            raise ValueError(f"Daily Room Identity must preserve transparent corners and full alpha range: {path}")
        return image.copy()


def require_hash(path: Path, expected: str) -> None:
    actual = sha256(path)
    if actual != expected:
        raise ValueError(f"Unexpected hash for {path}: {actual}; expected {expected}")


def main() -> None:
    source_image = require_rgba(SOURCE, (1254, 1254))
    require_hash(SOURCE, EXPECTED_HASHES["master"])

    room_image = source_image.resize((512, 512), Image.Resampling.LANCZOS)
    # Preserve the approved two-stage 1254 -> 512 -> 384 menu delivery.
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
