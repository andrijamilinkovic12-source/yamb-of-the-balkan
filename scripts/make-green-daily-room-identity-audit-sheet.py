from pathlib import Path
import textwrap

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "www" / "assets" / "green-soft-clay"
SOURCE = ROOT / "source-assets" / "green-soft-clay-canonical" / "daily-room-identity"
HIRES = ROOT / "source-assets" / "green-soft-clay-hires"
ROOM = RUNTIME / "canonical" / "daily-room-identity" / "daily-room-v1.png"
MENU = RUNTIME / "canonical" / "daily-room-identity" / "daily-room-menu-v1.png"
OUTPUT = ROOT / "docs" / "green-asset-standardization-daily-room-identity-audit.png"

CANDIDATES = [
    ("A1  approved calendar master", SOURCE / "green-daily-room-master-v1.png", "KEEP: one Daily room identity"),
    ("A2  canonical room / intro", ROOM, "LOCK: 512 px room delivery"),
    ("A3  canonical main menu", MENU, "LOCK: 384 px startup delivery"),
    ("R1  framed alternate master", HIRES / "daily-challenge-pro-v1.png", "REJECT: framed, zero active consumers"),
    ("C1  actual CSS display sizes", ROOM, "CHECK: intro 210, menu 52/46, header 54, gate 45"),
    ("X1  Daily task", RUNTIME / "daily" / "task-v1.png", "OUT: task target, not room identity"),
    ("X2  Daily completed", RUNTIME / "daily" / "complete-v1.png", "OUT: confirmation, not room identity"),
    ("X3  already played", RUNTIME / "daily" / "already-played-v1.png", "OUT: calendar with clock status"),
    ("X4  rewarded video", RUNTIME / "daily" / "reward-video-v3.png", "OUT: ticket / ducat composition"),
]


def checker(size: tuple[int, int], block: int = 14) -> Image.Image:
    result = Image.new("RGBA", size, (39, 65, 47, 255))
    draw = ImageDraw.Draw(result)
    colors = ((66, 94, 69, 255), (50, 78, 57, 255))
    for y in range(0, size[1], block):
        for x in range(0, size[0], block):
            draw.rectangle((x, y, x + block - 1, y + block - 1), fill=colors[(x // block + y // block) % 2])
    return result


def display_path(path: Path) -> str:
    return path.relative_to(ROOT).as_posix().replace(
        "source-assets/green-soft-clay-hires/", "hires/"
    ).replace("www/assets/green-soft-clay/", "green/")


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
    draw.text((30, 24), "GREEN ASSET STANDARDIZATION - DAILY ROOM IDENTITY AUDIT", fill=(232, 240, 207, 255), font=title_font)
    draw.text((30, 65), "One free-standing calendar, two deliveries, one rejected frame, four semantic boundaries", fill=(172, 204, 161, 255), font=font)

    for index, (label, source, assessment) in enumerate(CANDIDATES):
        column = index % columns
        row = index // columns
        x = column * cell_width
        y = header_height + row * (preview_height + label_height)
        panel = checker((cell_width - 18, preview_height - 12))
        if source.exists():
            with Image.open(source) as source_file:
                source_image = source_file.convert("RGBA")
            if label.startswith("C1"):
                with Image.open(MENU) as menu_file:
                    menu_image = menu_file.convert("RGBA")
                for size, position in (
                    (210, (22, 37)),
                    (52, (270, 17)),
                    (46, (273, 77)),
                    (54, (269, 133)),
                    (45, (273, 196)),
                ):
                    delivery = menu_image if size in (52, 46) else source_image
                    panel.alpha_composite(delivery.resize((size, size), Image.Resampling.LANCZOS), position)
                for caption, position in (
                    ("intro", (99, 12)),
                    ("52", (327, 34)),
                    ("46", (327, 91)),
                    ("54", (327, 150)),
                    ("45", (327, 210)),
                ):
                    ImageDraw.Draw(panel).text(position, caption, fill=(230, 237, 204, 255), font=small_font)
            else:
                preview = source_image.copy()
                preview.thumbnail((264, 264), Image.Resampling.LANCZOS)
                panel.alpha_composite(preview, ((panel.width - preview.width) // 2, (panel.height - preview.height) // 2))
            meta = f"{display_path(source)} | {source_image.width}x{source_image.height}"
        else:
            meta = f"{display_path(source)} | MISSING"
        sheet.alpha_composite(panel, (x + 9, y + 6))
        draw.rectangle((x + 9, y + 6, x + cell_width - 10, y + preview_height - 7), outline=(128, 165, 116, 255), width=2)
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
