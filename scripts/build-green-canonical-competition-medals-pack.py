from pathlib import Path
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
HIRES = ROOT / "source-assets" / "green-soft-clay-hires"
CANONICAL = ROOT / "source-assets" / "green-soft-clay-canonical" / "competition-medals"
RUNTIME = ROOT / "www" / "assets" / "green-soft-clay" / "canonical" / "competition-medals"

COPIED_MASTERS = {
    HIRES / "leaderboard" / "medal-silver-v1.png": CANONICAL / "general-podium" / "green-general-podium-silver-master-v1.png",
    HIRES / "leaderboard" / "medal-bronze-v1.png": CANONICAL / "general-podium" / "green-general-podium-bronze-master-v1.png",
    HIRES / "ql" / "medal-gold-v1.png": CANONICAL / "quarterly-league" / "green-quarterly-league-podium-gold-master-v1.png",
    HIRES / "ql" / "medal-silver-v1.png": CANONICAL / "quarterly-league" / "green-quarterly-league-podium-silver-master-v1.png",
    HIRES / "ql" / "medal-bronze-v1.png": CANONICAL / "quarterly-league" / "green-quarterly-league-podium-bronze-master-v1.png",
}

RUNTIME_ASSETS = {
    CANONICAL / "general-podium" / "green-general-podium-gold-master-v1.png": RUNTIME / "general-podium-gold-v1.png",
    CANONICAL / "general-podium" / "green-general-podium-silver-master-v1.png": RUNTIME / "general-podium-silver-v1.png",
    CANONICAL / "general-podium" / "green-general-podium-bronze-master-v1.png": RUNTIME / "general-podium-bronze-v1.png",
    CANONICAL / "quarterly-league" / "green-quarterly-league-podium-gold-master-v1.png": RUNTIME / "quarterly-league-gold-v1.png",
    CANONICAL / "quarterly-league" / "green-quarterly-league-podium-silver-master-v1.png": RUNTIME / "quarterly-league-silver-v1.png",
    CANONICAL / "quarterly-league" / "green-quarterly-league-podium-bronze-master-v1.png": RUNTIME / "quarterly-league-bronze-v1.png",
}


def main() -> None:
    generated_gold = CANONICAL / "general-podium" / "green-general-podium-gold-master-v1.png"
    if not generated_gold.exists():
        raise FileNotFoundError(f"Missing approved generated gold master: {generated_gold}")

    for source, destination in COPIED_MASTERS.items():
        if not source.exists():
            raise FileNotFoundError(f"Missing approved source master: {source}")
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)

    for master, destination in RUNTIME_ASSETS.items():
        with Image.open(master) as source_image:
            image = source_image.convert("RGBA")
            image.thumbnail((256, 256), Image.Resampling.LANCZOS)
            if image.size != (256, 256):
                raise ValueError(f"Unexpected non-square medal master: {master} -> {image.size}")
            destination.parent.mkdir(parents=True, exist_ok=True)
            image.save(destination, format="PNG", optimize=True)
            print(f"{destination.relative_to(ROOT)}: {image.width}x{image.height}, {destination.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
