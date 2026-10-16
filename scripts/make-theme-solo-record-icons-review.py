"""Create a compact contact sheet for visual inspection of Solo record PNGs."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "source-assets/theme-solo-record-icons-v1/manifest.json"
OUTPUT = ROOT / "docs/theme-solo-record-icons-contact.png"
THEMES = ("dark", "light", "medium", "winter", "neon", "amethyst", "easter", "desert", "moon", "severna")
ROLES = ("weekly", "monthly", "all_time", "personal")
NAMES = {"dark": "Zelena", "light": "Svetlo zlato", "medium": "Trula visnja", "winter": "Plavi okean", "neon": "Neon cyber", "amethyst": "Kraljevski ametist", "easter": "Vaskrsnja", "desert": "Pustinjsko staklo", "moon": "Mesecev sjaj", "severna": "Severna maglina"}
LABELS = {"weekly": "Nedeljni", "monthly": "Mesecni", "all_time": "Sva vremena", "personal": "Licni"}


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    entries = {(item["theme"], item["role"]): item for item in manifest["assets"]}
    width, row_height, header = 900, 96, 42
    sheet = Image.new("RGB", (width, header + row_height * len(THEMES)), "#182128")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for column, role in enumerate(ROLES):
        draw.text((188 + column * 172, 15), LABELS[role], fill="#dfece9", font=font)
    for row, theme in enumerate(THEMES):
        y = header + row * row_height
        draw.rounded_rectangle((8, y + 3, width - 8, y + row_height - 3), radius=14, fill="#26333b")
        draw.text((22, y + 38), NAMES[theme], fill="#eef5f1", font=font)
        for column, role in enumerate(ROLES):
            item = entries[(theme, role)]
            image = Image.open(ROOT / item["runtime"]).convert("RGBA")
            # A neutral tile reveals transparent edges and gives each theme equal review space.
            x = 188 + column * 172
            draw.rounded_rectangle((x - 3, y + 8, x + 77, y + 88), radius=12, fill="#aeb8af" if theme in {"dark", "light", "easter", "desert"} else "#101820")
            image.thumbnail((72, 72), Image.Resampling.LANCZOS)
            sheet.paste(image, (x + (72 - image.width) // 2, y + 12 + (72 - image.height) // 2), image)
    sheet.save(OUTPUT, "PNG", optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
