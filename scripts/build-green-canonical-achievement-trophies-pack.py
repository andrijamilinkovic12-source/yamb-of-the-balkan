from pathlib import Path
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
HIRES = ROOT / "source-assets" / "green-soft-clay-hires" / "treasury" / "trophies"
CANONICAL = ROOT / "source-assets" / "green-soft-clay-canonical" / "achievement-trophies"
RUNTIME = ROOT / "www" / "assets" / "green-soft-clay" / "canonical" / "achievement-trophies"

TROPHY_IDS = (
    "first_play",
    "apprentice",
    "veteran",
    "kafana",
    "score_1000",
    "grandmaster",
    "legend",
    "mythic",
    "godlike",
    "surgeon",
    "prophet",
    "sniper",
    "math",
    "concrete",
    "perfectionist",
    "miner",
    "immortal",
    "sveti_ilija",
    "hazard",
    "firecracker",
    "potato",
    "minimal",
    "achilles",
    "close_call",
    "night_owl",
    "spite",
)


def main() -> None:
    for trophy_id in TROPHY_IDS:
        source = HIRES / f"{trophy_id}-v1.png"
        corrected = trophy_id in {"potato", "sniper"}
        master = CANONICAL / f"green-{trophy_id}-master-v{2 if corrected else 1}.png"
        runtime = RUNTIME / f"{trophy_id}-v1.png"
        if not corrected and not source.exists():
            raise FileNotFoundError(f"Missing approved achievement trophy source: {source}")

        master.parent.mkdir(parents=True, exist_ok=True)
        if corrected:
            if not master.is_file():
                raise FileNotFoundError(f"Missing corrected achievement trophy master: {master}")
        else:
            shutil.copy2(source, master)

        with Image.open(master) as source_image:
            image = source_image.convert("RGBA")
            image.thumbnail((256, 256), Image.Resampling.LANCZOS)
            if image.size != (256, 256):
                raise ValueError(f"Unexpected non-square achievement trophy master: {master} -> {image.size}")
            runtime.parent.mkdir(parents=True, exist_ok=True)
            image.save(runtime, format="PNG", optimize=True)
            print(f"{trophy_id}: master {source_image.width}x{source_image.height}, runtime {image.width}x{image.height}, {runtime.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
