from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "www" / "assets" / "green-soft-clay"
HIRES = ROOT / "source-assets" / "green-soft-clay-hires"
OUTPUT = ROOT / "docs" / "green-asset-standardization-tournament-navigation-audit.png"

CANDIDATES = [
    ("N1  info", "tournament/tab-info-v1.png", "IN: Tournament information navigation"),
    ("N2  bracket", "tournament/tab-bracket-v1.png", "IN: Tournament bracket navigation"),
    ("N3  hall of fame", "tournament/tab-hall-of-fame-v1.png", "IN: Tournament history navigation"),
    ("X1  QL league", "canonical/quarterly-navigation/tab-league-v1.png", "OUT: Quarterly League navigation"),
    ("X2  QL hall", "canonical/quarterly-navigation/tab-hall-of-fame-v1.png", "OUT: Quarterly League history navigation"),
    ("X3  Treasury trophies", "canonical/treasury-controls/tab-trophies-v1.png", "OUT: Treasury navigation"),
    ("X4  registration", "tournament/state-register-v1.png", "OUT: Tournament registration action"),
    ("X5  active match", "tournament/state-match-active-v1.png", "OUT: Tournament match state"),
    ("X6  complete match", "tournament/state-match-complete-v1.png", "OUT: Tournament completed state"),
    ("X7  finalist", "tournament/finalist-silver-v1.png", "OUT: Tournament finalist award"),
    ("X8  QL podium", "canonical/competition-medals/quarterly-league-gold-v1.png", "OUT: competitive placement medal"),
    ("X9  winner", "hotseat/winner-v1.png", "OUT: decisive game winner mark"),
]


def source_for(relative: str) -> Path:
    high_resolution = HIRES / relative
    return high_resolution if high_resolution.exists() else RUNTIME / relative


def checker(size: tuple[int, int], block: int = 14) -> Image.Image:
    result = Image.new("RGBA", size, (39, 65, 47, 255))
    draw = ImageDraw.Draw(result)
    colors = ((66, 94, 69, 255), (50, 78, 57, 255))
    for y in range(0, size[1], block):
        for x in range(0, size[0], block):
            draw.rectangle((x, y, x + block - 1, y + block - 1), fill=colors[(x // block + y // block) % 2])
    return result


def main() -> None:
    columns = 4
    cell_width = 390
    preview_height = 292
    label_height = 92
    header_height = 126
    rows = (len(CANDIDATES) + columns - 1) // columns
    sheet = Image.new(
        "RGBA",
        (columns * cell_width, header_height + rows * (preview_height + label_height)),
        (21, 51, 32, 255),
    )
    draw = ImageDraw.Draw(sheet)
    title_font = ImageFont.load_default(size=21)
    font = ImageFont.load_default(size=15)
    small_font = ImageFont.load_default(size=12)
    draw.text((30, 24), "GREEN ASSET STANDARDIZATION - TOURNAMENT NAVIGATION AUDIT", fill=(232, 240, 207, 255), font=title_font)
    draw.text((30, 65), "Three Tournament navigation identities and semantic exclusions - no runtime changes", fill=(172, 204, 161, 255), font=font)

    for index, (label, relative, assessment) in enumerate(CANDIDATES):
        column = index % columns
        row = index // columns
        x = column * cell_width
        y = header_height + row * (preview_height + label_height)
        panel = checker((cell_width - 18, preview_height - 12))
        source = source_for(relative)
        if source.exists():
            source_image = Image.open(source).convert("RGBA")
            preview = source_image.copy()
            preview.thumbnail((250, 250), Image.Resampling.LANCZOS)
            panel.alpha_composite(preview, ((panel.width - preview.width) // 2, (panel.height - preview.height) // 2))
            meta = f"{relative} | {source_image.width}x{source_image.height}"
        else:
            meta = f"{relative} | MISSING"
        sheet.alpha_composite(panel, (x + 9, y + 6))
        draw.rectangle((x + 9, y + 6, x + cell_width - 10, y + preview_height - 7), outline=(128, 165, 116, 255), width=2)
        draw.text((x + 16, y + preview_height + 4), label, fill=(239, 231, 194, 255), font=font)
        draw.text((x + 16, y + preview_height + 31), assessment, fill=(185, 211, 172, 255), font=small_font)
        draw.text((x + 16, y + preview_height + 55), meta, fill=(143, 178, 137, 255), font=small_font)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(OUTPUT, quality=94, subsampling=0)
    print(OUTPUT)


if __name__ == "__main__":
    main()
