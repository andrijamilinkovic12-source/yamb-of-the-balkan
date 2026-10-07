"""Package the archived first-pass ImageGen backgrounds for reference only.

Technical resize only: generated 940/941x1672 masters become 941x1672 RGB PNGs,
matching the Green background slot. These files are outside shipped www assets.
Requires Pillow. Run with --write, or without it to verify saved outputs.
"""

import hashlib
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source-assets/theme-backgrounds-v1"
ARCHIVE = ROOT / "source-assets/theme-backgrounds-v1/standardized"
MANIFEST = ROOT / "docs/theme-backgrounds-v1.json"
CONTACT = ROOT / "docs/theme-backgrounds-v1-contact-sheet.png"
SPEC = json.loads((ROOT / "docs/theme-definitions.json").read_text(encoding="utf-8"))
IDS = SPEC["rebuildPolicy"]["workOrderThemeIds"]
WRITE = "--write" in sys.argv


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


if WRITE:
    ARCHIVE.mkdir(parents=True, exist_ok=True)

records = []
for theme_id in IDS:
    theme = next(item for item in SPEC["themes"] if item["id"] == theme_id)
    master = SOURCE / f"{theme_id}-background-master-v1.png"
    candidate = ARCHIVE / f"{theme_id}-background-v1.png"
    if not master.exists():
        raise SystemExit(f"Missing ImageGen master: {master}")
    with Image.open(master) as original:
        master_size = original.size
        if master_size not in ((940, 1672), (941, 1672)) or original.mode != "RGB":
            raise SystemExit(f"Unexpected master dimensions or mode: {theme_id} {original.size} {original.mode}")
        if WRITE:
            resized = original if original.size == (941, 1672) else original.resize((941, 1672), Image.Resampling.LANCZOS)
            resized.save(candidate, format="PNG", optimize=True, compress_level=9)
    if not candidate.exists():
        raise SystemExit(f"Missing standardized candidate: {candidate}")
    with Image.open(candidate) as packed:
        if packed.size != (941, 1672) or packed.mode != "RGB":
            raise SystemExit(f"Invalid candidate dimensions or mode: {theme_id} {packed.size} {packed.mode}")
    records.append({
        "themeId": theme_id,
        "nameSr": theme["nameSr"],
        "direction": SPEC["directions"][theme["direction"]]["name"],
        "masterPath": master.relative_to(ROOT).as_posix(),
        "candidatePath": candidate.relative_to(ROOT).as_posix(),
        "masterDimensionsPx": list(master_size),
        "candidateDimensionsPx": [941, 1672],
        "candidateColorMode": "RGB",
        "candidateBytes": candidate.stat().st_size,
        "masterSha256": digest(master),
        "candidateSha256": digest(candidate),
        "reviewStatus": "rejected-do-not-use",
        "runtimeLinked": False,
    })

manifest = {
    "schemaVersion": 1,
    "createdOn": "2026-10-06",
    "useCase": "stylized-concept",
    "generationMode": "built-in image_gen, one original prompt per theme",
    "promptDocument": "docs/theme-background-prompts-v1.md",
    "reviewContactSheet": "docs/theme-backgrounds-v1-contact-sheet.png",
    "scope": "Archived first-pass backgrounds, all rejected by user; none is linked or shipped as an active theme background.",
    "themes": records,
}

if WRITE:
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
else:
    if json.loads(MANIFEST.read_text(encoding="utf-8")) != manifest:
        raise SystemExit("Background manifest differs from saved candidate PNGs.")

tile_width, tile_height = 235, 418
margin, label_height = 18, 42
sheet_width = margin + 3 * (tile_width + margin)
sheet_height = margin + 3 * (tile_height + label_height + margin)
sheet = Image.new("RGB", (sheet_width, sheet_height), "#14202d")
draw = ImageDraw.Draw(sheet)
font_file = Path("C:/Windows/Fonts/arial.ttf")
font = ImageFont.truetype(str(font_file), 20) if font_file.exists() else ImageFont.load_default()
for index, record in enumerate(records):
    column, row = index % 3, index // 3
    left = margin + column * (tile_width + margin)
    top = margin + row * (tile_height + label_height + margin)
    with Image.open(ROOT / record["candidatePath"]) as candidate:
        sheet.paste(candidate.resize((tile_width, tile_height), Image.Resampling.LANCZOS), (left, top))
    label = record["nameSr"]
    draw.text((left + 2, top + tile_height + 8), label, font=font, fill="#F6FAFF")

if WRITE:
    sheet.save(CONTACT, format="PNG", optimize=True)
    print(f"Saved {len(records)} standardized candidates and contact sheet.")
else:
    if not CONTACT.exists():
        raise SystemExit("Contact sheet is missing.")
    print(f"Verified {len(records)} standardized background candidates.")
