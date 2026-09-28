from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
MASTERS = ROOT / "source-assets" / "green-soft-clay-hires"
RUNTIME = ROOT / "www" / "assets" / "green-soft-clay"


OUTPUTS = {
    "ducats-undo-free-v3.png": [
        ("ducats-undo-free-v3.png", 512),
        ("runtime/menu/ducats-undo-free-v3.png", 384),
    ],
    "treasury-free-v3.png": [
        ("treasury-free-v3.png", 512),
        ("runtime/menu/treasury-free-v3.png", 384),
    ],
    "daily/reward-video-v3.png": [("daily/reward-video-v3.png", 384)],
    "treasury/reward-video-v3.png": [("treasury/reward-video-v3.png", 256)],
    "solo/finish-reward-video-v3.png": [("solo/finish-reward-video-v3.png", 384)],
    "rules/pages/economy-treasury-v3.png": [("rules/pages/economy-treasury-v3.png", 512)],
}


def export_runtime(master_relative: str, output_relative: str, size: int) -> None:
    source_path = MASTERS / master_relative
    output_path = RUNTIME / output_relative
    if not source_path.exists():
        raise FileNotFoundError(source_path)

    image = Image.open(source_path).convert("RGBA")
    image = image.resize((size, size), Image.Resampling.LANCZOS)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(output_path, format="PNG", optimize=True, compress_level=9)
    print(f"{output_relative}: {size}x{size}, {output_path.stat().st_size / 1024:.0f} KB")


def main() -> None:
    for master_relative, outputs in OUTPUTS.items():
        for output_relative, size in outputs:
            export_runtime(master_relative, output_relative, size)


if __name__ == "__main__":
    main()
