from pathlib import Path
import textwrap

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "www" / "assets" / "green-soft-clay"
HIRES = ROOT / "source-assets" / "green-soft-clay-hires"
OUTPUT = ROOT / "docs" / "green-asset-standardization-statistics-room-identity-audit.png"

CANDIDATES = [
    (
        "A1  approved identity master",
        HIRES / "statistics-free-v2.png",
        "KEEP: one Statistics room identity",
    ),
    (
        "A2  canonical room / intro",
        RUNTIME / "canonical" / "statistics-room-identity" / "statistics-room-v1.png",
        "LOCK: 512 px room delivery",
    ),
    (
        "A3  canonical main menu",
        RUNTIME / "canonical" / "statistics-room-identity" / "statistics-room-menu-v1.png",
        "LOCK: 384 px startup delivery",
    ),
    (
        "R1  framed alternate master",
        HIRES / "statistics-pro-v1.png",
        "REJECT: tile/frame, zero consumers",
    ),
    (
        "C1  actual CSS display sizes",
        RUNTIME / "canonical" / "statistics-room-identity" / "statistics-room-v1.png",
        "CHECK: intro 210x1.06, menu 52/46, header 34",
    ),
    (
        "X1  Overview metric",
        RUNTIME / "canonical" / "statistics-overview" / "average-v1.png",
        "OUT: value glyph, not room identity",
    ),
    (
        "X2  H2H identity",
        RUNTIME / "canonical" / "h2h-statistics" / "h2h-identity-v1.png",
        "OUT: H2H subsection identity",
    ),
    (
        "X3  Rules page illustration",
        RUNTIME / "rules" / "pages" / "stats-leaderboards-v1.png",
        "OUT: narrative scene, not icon",
    ),
]


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


def display_path(path: Path) -> str:
    relative = path.relative_to(ROOT).as_posix()
    return relative.replace(
        "source-assets/green-soft-clay-hires/", "hires/"
    ).replace(
        "www/assets/green-soft-clay/", "green/"
    )


def main() -> None:
    columns = 4
    cell_width = 370
    preview_height = 300
    label_height = 124
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
        "GREEN ASSET STANDARDIZATION - STATISTICS ROOM IDENTITY AUDIT",
        fill=(232, 240, 207, 255),
        font=title_font,
    )
    draw.text(
        (30, 65),
        "One approved free-standing identity, two delivery sizes, one rejected framed alternate",
        fill=(172, 204, 161, 255),
        font=font,
    )

    for index, (label, source, assessment) in enumerate(CANDIDATES):
        column = index % columns
        row = index // columns
        x = column * cell_width
        y = header_height + row * (preview_height + label_height)
        panel = checker((cell_width - 18, preview_height - 12))
        if source.exists():
            source_image = Image.open(source).convert("RGBA")
            if label.startswith("C1"):
                menu_image = Image.open(
                    RUNTIME / "canonical" / "statistics-room-identity" / "statistics-room-menu-v1.png"
                ).convert("RGBA")
                for size, position in (
                    (223, (15, 28)),
                    (52, (265, 27)),
                    (46, (268, 115)),
                    (34, (274, 202)),
                ):
                    delivery = menu_image if size in (52, 46) else source_image
                    preview = delivery.resize((size, size), Image.Resampling.LANCZOS)
                    panel.alpha_composite(preview, position)
                for caption, position in (
                    ("intro", (103, 8)),
                    ("52", (281, 80)),
                    ("46", (281, 166)),
                    ("34", (281, 241)),
                ):
                    ImageDraw.Draw(panel).text(
                        position,
                        caption,
                        fill=(230, 237, 204, 255),
                        font=small_font,
                    )
            else:
                preview = source_image.copy()
                preview.thumbnail((264, 264), Image.Resampling.LANCZOS)
                panel.alpha_composite(
                    preview,
                    ((panel.width - preview.width) // 2, (panel.height - preview.height) // 2),
                )
            meta = f"{display_path(source)} | {source_image.width}x{source_image.height}"
        else:
            meta = f"{display_path(source)} | MISSING"
        sheet.alpha_composite(panel, (x + 9, y + 6))
        draw.rectangle(
            (x + 9, y + 6, x + cell_width - 10, y + preview_height - 7),
            outline=(128, 165, 116, 255),
            width=2,
        )
        draw.text((x + 16, y + preview_height + 4), label, fill=(239, 231, 194, 255), font=font)
        draw.text((x + 16, y + preview_height + 31), assessment, fill=(185, 211, 172, 255), font=small_font)
        draw.multiline_text(
            (x + 16, y + preview_height + 55),
            "\n".join(textwrap.wrap(meta, width=49)),
            fill=(143, 178, 137, 255),
            font=small_font,
            spacing=2,
        )

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(OUTPUT, optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
