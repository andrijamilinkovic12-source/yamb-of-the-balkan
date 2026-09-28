from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "www" / "assets" / "green-soft-clay" / "treasury" / "trophies"
HIRES = ROOT / "source-assets" / "green-soft-clay-hires" / "treasury" / "trophies"
OUTPUT = ROOT / "docs" / "green-asset-standardization-achievement-trophies-audit.png"

TROPHIES = [
    ("01", "first_play", "Prvo bacanje / First Roll", "first completed game"),
    ("02", "apprentice", "Segrt / Apprentice", "10 completed games"),
    ("03", "veteran", "Veteran", "50 completed games"),
    ("04", "kafana", "Kafanski sto / Pub Table", "one Hotseat game"),
    ("05", "score_1000", "Vojvoda / Duke", "score over 1000"),
    ("06", "grandmaster", "Velemajstor / Grandmaster", "score over 1250"),
    ("07", "legend", "Legenda / Legend", "score over 2000"),
    ("08", "mythic", "Mitski igrac / Mythic", "score over 2500"),
    ("09", "godlike", "Bozanstvo / Godlike", "score 3000+"),
    ("10", "surgeon", "Hirurg / Surgeon", "Manual column without zero"),
    ("11", "prophet", "Prorok / Prophet", "three announcements in a row"),
    ("12", "sniper", "Snajper / Sniper", "Yamb in Announcement"),
    ("13", "math", "Matematicar / Mathematician", "exactly 63 in Sum 1"),
    ("14", "concrete", "Armirani beton / Concrete", "all Kentas filled"),
    ("15", "perfectionist", "Perfekcionista", "Sum 1 bonus in every column"),
    ("16", "miner", "Rudar / Miner", "Sum 2 greater than 60"),
    ("17", "immortal", "Neunistiv / Immortal", "full game without zero"),
    ("18", "sveti_ilija", "Sveti Ilija / Saint Elijah", "Yamb on first roll"),
    ("19", "hazard", "Hazarder / Daredevil", "Yamb in Manual column"),
    ("20", "firecracker", "Petarda / Firecracker", "all five Yambs"),
    ("21", "potato", "Krompirusa / Potato", "crossed-out Yamb"),
    ("22", "minimal", "Minimalac / Minimalist", "Min below seven"),
    ("23", "achilles", "Ahilova peta / Achilles Heel", "only Yamb is zero"),
    ("24", "close_call", "Za dlaku / Close Call", "win/loss gap below five"),
    ("25", "night_owl", "Nocna ptica / Night Owl", "game finished at 03-05h"),
    ("26", "spite", "Inat / Spite", "finish while losing by 200+"),
]


def checker(size: tuple[int, int], block: int = 14) -> Image.Image:
    result = Image.new("RGBA", size, (39, 65, 47, 255))
    draw = ImageDraw.Draw(result)
    colors = ((66, 94, 69, 255), (50, 78, 57, 255))
    for y in range(0, size[1], block):
        for x in range(0, size[0], block):
            draw.rectangle((x, y, x + block - 1, y + block - 1), fill=colors[(x // block + y // block) % 2])
    return result


def main() -> None:
    columns = 5
    cell_width = 350
    preview_height = 255
    label_height = 108
    header_height = 126
    rows = (len(TROPHIES) + columns - 1) // columns
    sheet = Image.new(
        "RGBA",
        (columns * cell_width, header_height + rows * (preview_height + label_height)),
        (21, 51, 32, 255),
    )
    draw = ImageDraw.Draw(sheet)
    title_font = ImageFont.load_default(size=21)
    font = ImageFont.load_default(size=15)
    small_font = ImageFont.load_default(size=12)
    draw.text((30, 24), "GREEN ASSET STANDARDIZATION - TREASURY ACHIEVEMENT TROPHIES", fill=(232, 240, 207, 255), font=title_font)
    draw.text((30, 65), "26 semantic achievement glyphs - inventory and visual consistency audit", fill=(172, 204, 161, 255), font=font)

    for index, (number, trophy_id, title, meaning) in enumerate(TROPHIES):
        column = index % columns
        row = index // columns
        x = column * cell_width
        y = header_height + row * (preview_height + label_height)
        panel = checker((cell_width - 18, preview_height - 12))
        source = HIRES / f"{trophy_id}-v1.png"
        runtime = RUNTIME / f"{trophy_id}-v1.png"
        if source.exists():
            source_image = Image.open(source).convert("RGBA")
            preview = source_image.copy()
            preview.thumbnail((225, 225), Image.Resampling.LANCZOS)
            panel.alpha_composite(preview, ((panel.width - preview.width) // 2, (panel.height - preview.height) // 2))
            runtime_meta = "missing runtime"
            if runtime.exists():
                runtime_image = Image.open(runtime)
                runtime_meta = f"runtime {runtime_image.width}x{runtime_image.height}"
            meta = f"master {source_image.width}x{source_image.height} | {runtime_meta}"
        else:
            meta = "MISSING MASTER"
        sheet.alpha_composite(panel, (x + 9, y + 6))
        draw.rectangle((x + 9, y + 6, x + cell_width - 10, y + preview_height - 7), outline=(128, 165, 116, 255), width=2)
        draw.text((x + 16, y + preview_height + 4), f"{number}  {trophy_id}", fill=(239, 231, 194, 255), font=font)
        draw.text((x + 16, y + preview_height + 30), title, fill=(202, 220, 184, 255), font=small_font)
        draw.text((x + 16, y + preview_height + 52), meaning, fill=(174, 202, 163, 255), font=small_font)
        draw.text((x + 16, y + preview_height + 75), meta, fill=(143, 178, 137, 255), font=small_font)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(OUTPUT, quality=94, subsampling=0)
    print(OUTPUT)


if __name__ == "__main__":
    main()
