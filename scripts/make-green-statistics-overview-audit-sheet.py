from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "www" / "assets" / "green-soft-clay"
HIRES = ROOT / "source-assets" / "green-soft-clay-hires"
OUTPUT = ROOT / "docs" / "green-asset-standardization-statistics-overview-audit.png"

CANDIDATES = [
    ("M1  power index", "statistics/power-index-bolt-v1.png", "IN: global Power Index metric"),
    ("M2  record", "statistics/record-v1.png", "IN: best Solo score aggregate"),
    ("M3  games", "statistics/games-v1.png", "IN: total completed games"),
    ("M4  wins", "statistics/wins-v1.png", "IN: aggregate wins"),
    ("M5  draws", "statistics/draws-v1.png", "IN: aggregate draws"),
    ("M6  losses", "statistics/losses-v1.png", "IN: aggregate losses"),
    ("M7  fire streak", "statistics/fire-streak-v1.png", "IN: best/current fire streak"),
    ("M8  average", "statistics/average-v1.png", "IN: average score"),
    ("M9  trophies", "statistics/trophies-v1.png", "IN: aggregate unlocked trophies"),
    ("M10 all-time points", "statistics/all-time-points-v1.png", "IN: lifetime score aggregate"),
    ("X1  canonical dukat", "canonical/ducat/ducat-inline-v1.png", "OUT: balance/currency identity"),
    ("X2  H2H identity", "statistics/h2h-v1.png", "OUT: H2H overview/navigation family"),
    ("X3  H2H empty", "statistics/h2h-empty-v1.png", "OUT: H2H empty-state family"),
    ("X4  Solo personal best", "canonical/solo-results/personal-best-v1.png", "OUT: one new Solo result status"),
    ("X5  Hotseat winner", "canonical/hotseat-winner/hotseat-winner-v1.png", "OUT: one decided Hotseat result"),
    ("X6  achievement", "canonical/achievement-trophies/veteran-v1.png", "OUT: one gameplay achievement"),
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
            draw.rectangle(
                (x, y, x + block - 1, y + block - 1),
                fill=colors[(x // block + y // block) % 2],
            )
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
    draw.text(
        (30, 24),
        "GREEN ASSET STANDARDIZATION - STATISTICS OVERVIEW AUDIT",
        fill=(232, 240, 207, 255),
        font=title_font,
    )
    draw.text(
        (30, 65),
        "Ten aggregate metrics and semantic exclusions - no runtime changes",
        fill=(172, 204, 161, 255),
        font=font,
    )

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
            panel.alpha_composite(
                preview,
                ((panel.width - preview.width) // 2, (panel.height - preview.height) // 2),
            )
            meta = f"{relative} | {source_image.width}x{source_image.height}"
        else:
            meta = f"{relative} | MISSING"
        sheet.alpha_composite(panel, (x + 9, y + 6))
        draw.rectangle(
            (x + 9, y + 6, x + cell_width - 10, y + preview_height - 7),
            outline=(128, 165, 116, 255),
            width=2,
        )
        draw.text((x + 16, y + preview_height + 4), label, fill=(239, 231, 194, 255), font=font)
        draw.text((x + 16, y + preview_height + 31), assessment, fill=(185, 211, 172, 255), font=small_font)
        draw.text((x + 16, y + preview_height + 55), meta, fill=(143, 178, 137, 255), font=small_font)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(OUTPUT, quality=94, subsampling=0)
    print(OUTPUT)


if __name__ == "__main__":
    main()
