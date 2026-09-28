from pathlib import Path
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
HIRES = ROOT / "source-assets" / "green-soft-clay-hires"
ACTIVE = ROOT / "www" / "assets" / "green-soft-clay"
CANONICAL = ROOT / "source-assets" / "green-soft-clay-canonical" / "tournament-awards"
RUNTIME = ROOT / "www" / "assets" / "green-soft-clay" / "canonical" / "tournament-awards"


def build_champion() -> None:
    source = HIRES / "tournament-free-v2.png"
    approved_room = ACTIVE / "tournament-free-v2.png"
    approved_startup = ACTIVE / "runtime" / "menu" / "tournament-free-v2.png"
    master = CANONICAL / "green-champion-trophy-master-v1.png"
    runtime = RUNTIME / "champion-trophy-v1.png"
    for required in (source, approved_room, approved_startup):
        if not required.exists():
            raise FileNotFoundError(f"Missing approved Tournament champion asset: {required}")

    master.parent.mkdir(parents=True, exist_ok=True)
    runtime.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, master)

    with Image.open(master) as source_image, Image.open(approved_room) as room_image, Image.open(approved_startup) as startup_image:
        if source_image.size != (1254, 1254):
            raise ValueError(f"Unexpected Tournament champion master size: {source_image.size}")
        if room_image.size != (512, 512):
            raise ValueError(f"Unexpected Tournament champion room runtime size: {room_image.size}")
        if startup_image.size != (384, 384):
            raise ValueError(f"Unexpected Tournament champion startup runtime size: {startup_image.size}")
        shutil.copy2(approved_startup, runtime)
        print(
            f"champion-trophy: master {source_image.width}x{source_image.height}, "
            f"room {room_image.width}x{room_image.height}, canonical {startup_image.width}x{startup_image.height}, "
            f"{runtime.stat().st_size // 1024} KB"
        )


def build_finalist() -> None:
    source = HIRES / "tournament" / "finalist-silver-v1.png"
    approved_runtime = ACTIVE / "tournament" / "finalist-silver-v1.png"
    master = CANONICAL / "green-finalist-silver-master-v1.png"
    runtime = RUNTIME / "finalist-silver-v1.png"
    for required in (source, approved_runtime):
        if not required.exists():
            raise FileNotFoundError(f"Missing approved Tournament finalist asset: {required}")

    master.parent.mkdir(parents=True, exist_ok=True)
    runtime.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, master)

    with Image.open(master) as source_image, Image.open(approved_runtime) as active_image:
        image = source_image.convert("RGBA")
        image.thumbnail((256, 256), Image.Resampling.LANCZOS)
        if image.size != (256, 256):
            raise ValueError(f"Unexpected non-square Tournament finalist master: {master} -> {image.size}")
        image.save(runtime, format="PNG", optimize=True)
        print(
            f"finalist-silver: master {source_image.width}x{source_image.height}, "
            f"active {active_image.width}x{active_image.height}, runtime {image.width}x{image.height}, "
            f"{runtime.stat().st_size // 1024} KB"
        )


def main() -> None:
    build_champion()
    build_finalist()


if __name__ == "__main__":
    main()
