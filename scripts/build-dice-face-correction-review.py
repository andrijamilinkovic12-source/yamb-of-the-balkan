"""Build a compact review of the thirteen corrected dice-bearing assets."""

from pathlib import Path
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ASSETS = [
    ("Green / Sniper", "www/assets/green-soft-clay/canonical/achievement-trophies/sniper-v1.png"),
    ("Green / Potato", "www/assets/green-soft-clay/canonical/achievement-trophies/potato-v1.png"),
    ("Green / Rules", "www/assets/green-soft-clay/canonical/rules-page-illustrations/multiplayer-competitions-v1.png"),
    ("Light Gold / Close Call", "www/assets/theme-packs/light/canonical/achievement-trophies/close_call-v1.png"),
    ("Light Gold / First Play", "www/assets/theme-packs/light/canonical/achievement-trophies/first_play-v1.png"),
    ("Dark Cherry / Godlike", "www/assets/theme-packs/medium/canonical/achievement-trophies/godlike-v1.png"),
    ("Dark Cherry / Hazard", "www/assets/theme-packs/medium/canonical/achievement-trophies/hazard-v1.png"),
    ("Dark Cherry / Immortal", "www/assets/theme-packs/medium/canonical/achievement-trophies/immortal-v1.png"),
    ("Neon Cyber / First Play", "www/assets/theme-packs/neon/canonical/achievement-trophies/first_play-v1.png"),
    ("Desert Glass / First Play", "www/assets/theme-packs/desert/canonical/achievement-trophies/first_play-v1.png"),
    ("Moonlight / First Play", "www/assets/theme-packs/moon/canonical/achievement-trophies/first_play-v1.png"),
    ("Moonlight / Godlike", "www/assets/theme-packs/moon/canonical/achievement-trophies/godlike-v1.png"),
    ("Moonlight / Concrete", "www/assets/theme-packs/moon/canonical/achievement-trophies/concrete-v1.png"),
]


def main() -> None:
    sheet = Image.new("RGB", (1000, 4 * 260), "#202631")
    draw = ImageDraw.Draw(sheet)
    for index, (label, relative) in enumerate(ASSETS):
        x, y = (index % 4) * 250, (index // 4) * 260
        with Image.open(ROOT / relative) as source:
            icon = source.convert("RGBA").resize((206, 206), Image.Resampling.LANCZOS)
        sheet.paste(icon, (x + 22, y + 8), icon)
        draw.text((x + 12, y + 224), label, fill="#F3F5F7")
    target = ROOT / "docs/dice-face-corrections-review.png"
    sheet.save(target, optimize=True)
    print(target)


if __name__ == "__main__":
    main()
