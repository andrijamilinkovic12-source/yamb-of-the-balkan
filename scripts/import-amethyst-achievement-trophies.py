"""Normalize generated Kraljevski Ametist trophy masters to the 256 px catalog slots."""

import json
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
MASTER_DIR = ROOT / "source-assets/theme-icon-packs/amethyst/achievement-trophies-v1"
PRODUCTION_DIR = ROOT / "www/assets/theme-packs/amethyst/canonical/achievement-trophies"
REVIEW_PATH = ROOT / "docs/theme-achievement-trophies-amethyst-review.png"
EXPECTED = {
    "achilles", "apprentice", "close_call", "concrete", "firecracker",
    "first_play", "godlike", "grandmaster", "hazard", "immortal",
    "kafana", "legend", "math", "miner", "minimal", "mythic",
    "night_owl", "perfectionist", "potato", "prophet", "score_1000",
    "sniper", "spite", "surgeon", "sveti_ilija", "veteran",
}


def normalize(source: Image.Image) -> tuple[Image.Image, tuple[int, int, int, int]]:
    source = source.convert("RGBA")
    alpha = source.getchannel("A")
    # Ignore faint antialiasing noise in the generated transparent margin.
    strong = alpha.point(lambda value: 255 if value >= 18 else 0)
    box = strong.getbbox()
    if not box:
        raise ValueError("Generated image has no visible subject")
    subject = source.crop(box)
    scale = min(212 / subject.width, 212 / subject.height)
    width = max(1, round(subject.width * scale))
    height = max(1, round(subject.height * scale))
    subject = subject.resize((width, height), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (256, 256))
    canvas.alpha_composite(subject, ((256 - width) // 2, (256 - height) // 2))
    visible = canvas.getchannel("A").point(lambda value: 255 if value >= 18 else 0).getbbox()
    return canvas, visible


def main() -> None:
    MASTER_DIR.mkdir(parents=True, exist_ok=True)
    PRODUCTION_DIR.mkdir(parents=True, exist_ok=True)
    review = Image.new("RGB", (1000, 6 * 178), "#3C284B")
    draw = ImageDraw.Draw(review)
    metadata = {}
    for index, icon_id in enumerate(sorted(EXPECTED)):
        master_version = 2 if icon_id == "kafana" else 1
        master = MASTER_DIR / f"{icon_id}-master-v{master_version}.png"
        if not master.is_file():
            raise FileNotFoundError(master)
        target = PRODUCTION_DIR / f"{icon_id}-v1.png"
        with Image.open(master) as image:
            production, bounds = normalize(image)
        production.save(target, format="PNG", optimize=True)
        x, y = (index % 5) * 200, (index // 5) * 178
        large = production.resize((112, 112), Image.Resampling.LANCZOS)
        small = production.resize((44, 44), Image.Resampling.LANCZOS)
        review.paste(large, (x + 8, y + 4), large)
        review.paste(small, (x + 139, y + 66), small)
        draw.text((x + 14, y + 124), icon_id, fill="#FBF6FF")
        draw.text((x + 142, y + 114), "44 px", fill="#E0CDE5")
        metadata[icon_id] = {
            "masterPath": master.relative_to(ROOT).as_posix(),
            "productionPath": target.relative_to(ROOT).as_posix(),
            "sizeBytes": target.stat().st_size,
            "opticalBoundsPx": list(bounds),
        }
    review.save(REVIEW_PATH)
    (MASTER_DIR / "manifest.json").write_text(
        json.dumps({"schemaVersion": 1, "themeId": "amethyst", "slots": metadata},
                   ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Normalized {len(metadata)} Kraljevski Ametist trophy PNGs; review: {REVIEW_PATH}")


if __name__ == "__main__":
    main()



