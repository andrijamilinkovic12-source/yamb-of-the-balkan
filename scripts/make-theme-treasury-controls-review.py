"""Create comparable Treasury control contact sheets at 112 and 44 px."""

import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
DEFS = json.loads((ROOT / "docs/theme-definitions.json").read_text(encoding="utf-8"))
ROLES = ("tab-trophies", "tab-skins", "tab-effects", "tab-themes",
         "status-owned", "status-active", "status-locked", "status-insufficient")
OUT = ROOT / "docs/theme-treasury-controls-review"
OUT.mkdir(exist_ok=True)

for theme in DEFS["themes"]:
    theme_id = theme["id"]
    palette = theme.get("paletteHex", {"background": "#193a2b", "text": "#fff4d9"})
    sheet = Image.new("RGB", (4 * 210, 2 * 218), palette["background"])
    draw = ImageDraw.Draw(sheet)
    for index, role in enumerate(ROLES):
        path = (ROOT / "www/assets/green-soft-clay/canonical/treasury-controls" / f"{role}-v1.png"
                if theme_id == "dark" else
                ROOT / f"www/assets/theme-packs/{theme_id}/canonical/treasury-controls/{role}-v1.png")
        with Image.open(path) as source:
            large = source.convert("RGBA").resize((112, 112), Image.Resampling.LANCZOS)
            small = source.convert("RGBA").resize((44, 44), Image.Resampling.LANCZOS)
        x, y = index % 4 * 210, index // 4 * 218
        sheet.paste(large, (x + 30, y + 8), large)
        sheet.paste(small, (x + 145, y + 77), small)
        draw.text((x + 16, y + 162), role, fill=palette["text"])
    sheet.save(OUT / f"{theme_id}-treasury-controls-v1.png", optimize=True)
print(f"Created {len(DEFS['themes'])} Treasury control review sheets")
