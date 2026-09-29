from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "www" / "assets" / "green-soft-clay"
HIRES = ROOT / "source-assets" / "green-soft-clay-hires"
OUTPUT = ROOT / "docs" / "green-asset-standardization-h2h-statistics-audit.png"

CANDIDATES = [
    ("H1  H2H identity", "canonical/h2h-statistics/h2h-identity-v1.png", "OWN: overview, title and rival identity"),
    ("H2  H2H empty", "canonical/h2h-statistics/h2h-empty-v1.png", "OWN: no-duels and empty invite rival"),
    ("H3  highest score", "canonical/h2h-statistics/highest-score-v1.png", "OWN: my best score vs one rival"),
    ("H4  max margin", "canonical/h2h-statistics/max-win-margin-v1.png", "OWN: largest win margin vs one rival"),
    ("H5  worst loss", "canonical/h2h-statistics/worst-loss-margin-v1.png", "OWN: largest loss margin vs one rival"),
    ("H6  win streak", "canonical/statistics-overview/fire-streak-v1.png", "SHARED: current/max streak vs one rival"),
    ("H7  draw", "canonical/statistics-overview/draws-v1.png", "SHARED: draw count vs one rival"),
    ("H8  average", "canonical/statistics-overview/average-v1.png", "SHARED: my average score vs one rival"),
    ("H9  VS", "canonical/h2h-statistics/versus-v1.png", "OWN: two-player opposition separator"),
    ("X1  overview record", "canonical/statistics-overview/record-v1.png", "OUT: best stored Solo score aggregate"),
    ("X2  overview losses", "canonical/statistics-overview/losses-v1.png", "OUT: aggregate loss count"),
    ("X3  Hotseat winner", "canonical/hotseat-winner/hotseat-winner-v1.png", "OUT: result of one decided local match"),
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
    columns = 3
    cell_width = 440
    preview_height = 320
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
        "GREEN ASSET STANDARDIZATION - H2H STATISTICS AUDIT",
        fill=(232, 240, 207, 255),
        font=title_font,
    )
    draw.text(
        (30, 65),
        "Six owned identities, three locked shared concepts and semantic exclusions",
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
            preview.thumbnail((282, 282), Image.Resampling.LANCZOS)
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
