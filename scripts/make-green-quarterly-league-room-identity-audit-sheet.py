from pathlib import Path
import hashlib
import math
import textwrap

from PIL import Image, ImageChops, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "www/assets/green-soft-clay"
SOURCE = ROOT / "source-assets/green-soft-clay-hires/quarterly-league-yotb-ql-free-v2.png"
ROOM = RUNTIME / "canonical/quarterly-league-room-identity/quarterly-league-room-v1.png"
MENU = RUNTIME / "canonical/quarterly-league-room-identity/quarterly-league-room-menu-v1.png"
NAVIGATION = RUNTIME / "canonical/quarterly-navigation"
RANKS = RUNTIME / "canonical/quarterly-rank-badges"
MEDALS = RUNTIME / "canonical/competition-medals"
OUTPUT = ROOT / "docs/green-asset-standardization-quarterly-league-room-identity-audit.png"
PANELS = [
    ("A1  approved source", SOURCE, "KEEP: rounded rhombus is the logo itself"),
    ("A2  active room / intro", ROOM, "KEEP: same YotB / QL identity, 512 px"),
    ("A3  active menu watermark", MENU, "KEEP: same identity, 384 px delivery"),
    ("C1  CSS display-size samples", ROOM, "210 intro / 86 watermark / 42 header / 96 popup"),
    ("X1  League navigation", NAVIGATION / "tab-league-v1.png", "LOCKED: tab action, not the room logo"),
    ("X2  Champions navigation", NAVIGATION / "tab-champions-v1.png", "LOCKED: tab / champion marker, not an award"),
    ("X3  Majstor rank badge", RANKS / "rank-majstor-v1.png", "LOCKED: rank level, not the QL room identity"),
    ("X4  Quarterly podium gold", MEDALS / "quarterly-league-gold-v1.png", "LOCKED: award medal, not the main logo"),
]
ASSETS = [SOURCE, ROOM, MENU, *[source for _, source, _ in PANELS[4:]]]


def rgba(source: Path) -> Image.Image:
    with Image.open(source) as image:
        return image.convert("RGBA")


def identical(left: Image.Image, right: Image.Image) -> bool:
    return left.size == right.size and all(
        channel.getbbox() is None for channel in ImageChops.difference(left, right).split()
    )


def checker(size: tuple[int, int]) -> Image.Image:
    panel = Image.new("RGBA", size)
    draw = ImageDraw.Draw(panel)
    colors = ((66, 94, 69, 255), (50, 78, 57, 255))
    for y in range(0, size[1], 14):
        for x in range(0, size[0], 14):
            draw.rectangle((x, y, x + 13, y + 13), fill=colors[(x // 14 + y // 14) % 2])
    return panel


def main() -> None:
    cell_width, preview_height, label_height, header_height = 370, 300, 124, 126
    sheet = Image.new("RGBA", (1480, header_height + math.ceil(len(PANELS) / 4) * 424), (21, 51, 32, 255))
    draw = ImageDraw.Draw(sheet)
    title_font = ImageFont.load_default(size=21)
    font = ImageFont.load_default(size=15)
    small_font = ImageFont.load_default(size=12)
    draw.text((30, 24), "GREEN ASSET STANDARDIZATION - QUARTERLY LEAGUE ROOM IDENTITY", fill=(232, 240, 207, 255), font=title_font)
    draw.text((30, 65), "Inventory: one rhombus logo, two runtime deliveries; ranks, navigation and awards stay distinct", fill=(172, 204, 161, 255), font=font)
    draw.text((30, 91), "Static PNG audit, not an emulator screenshot; watermark sample uses 18% alpha, without CSS filters", fill=(143, 178, 137, 255), font=small_font)
    for index, (label, source, assessment) in enumerate(PANELS):
        x = (index % 4) * cell_width
        y = header_height + (index // 4) * (preview_height + label_height)
        panel = checker((352, 288))
        source_image = rgba(source)
        if label.startswith("C1"):
            for delivery, size, position, caption, caption_position, opacity in (
                (source_image, 210, (20, 40), "210 intro min", (20, 20), 1),
                (rgba(MENU), 86, (244, 28), "86 / 18%", (244, 8), 0.18),
                (source_image, 42, (266, 132), "42 header", (244, 115), 1),
                (source_image, 96, (241, 191), "96 popup", (244, 177), 1),
            ):
                preview = delivery.resize((size, size), Image.Resampling.LANCZOS)
                if opacity != 1:
                    preview.putalpha(preview.getchannel("A").point(lambda value: round(value * opacity)))
                panel.alpha_composite(preview, position)
                ImageDraw.Draw(panel).text(caption_position, caption, fill=(230, 237, 204, 255), font=small_font)
        else:
            preview = source_image.copy()
            preview.thumbnail((264, 264), Image.Resampling.LANCZOS)
            panel.alpha_composite(preview, ((352 - preview.width) // 2, (288 - preview.height) // 2))
        sheet.alpha_composite(panel, (x + 9, y + 6))
        draw.rectangle((x + 9, y + 6, x + 360, y + 293), outline=(128, 165, 116, 255), width=2)
        draw.text((x + 16, y + 304), label, fill=(239, 231, 194, 255), font=font)
        draw.text((x + 16, y + 331), assessment, fill=(185, 211, 172, 255), font=small_font)
        relative = source.relative_to(ROOT).as_posix().replace("source-assets/green-soft-clay-hires/", "hires/").replace("www/assets/green-soft-clay/", "green/")
        meta = f"{relative} | {source_image.width}x{source_image.height}"
        draw.multiline_text((x + 16, y + 355), "\n".join(textwrap.wrap(meta, width=49)), fill=(143, 178, 137, 255), font=small_font, spacing=2)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(OUTPUT, optimize=True)
    print(OUTPUT)

    for source in ASSETS:
        with Image.open(source) as image:
            assert image.mode == "RGBA", source
            assert image.getchannel("A").getextrema() == (0, 255), source
            assert all(image.getpixel(corner)[3] == 0 for corner in (
                (0, 0), (image.width - 1, 0), (0, image.height - 1),
                (image.width - 1, image.height - 1),
            )), source
            print(f"{source.relative_to(ROOT).as_posix()} | {image.width}x{image.height} {image.mode} | {source.stat().st_size} B | {hashlib.sha256(source.read_bytes()).hexdigest()}")
    room, menu = rgba(ROOM), rgba(MENU)
    for label, left, right in (
        ("source -> room", rgba(SOURCE).resize(room.size, Image.Resampling.LANCZOS), room),
        ("room -> menu", room.resize(menu.size, Image.Resampling.LANCZOS), menu),
        ("source -> menu", rgba(SOURCE).resize(menu.size, Image.Resampling.LANCZOS), menu),
    ):
        matches = identical(left, right)
        print(f"{label}: pixel-identical={matches}")
        if label != "source -> menu" and not matches:
            raise ValueError(f"Approved Quarterly League delivery changed: {label}")

    for label, assets in (
        ("main room identity only", [ROOM]),
        ("actual pack quarterlyLeague matcher", [ROOM, *sorted(MEDALS.glob("quarterly-league-*.png"))]),
        ("static complete QL scope incl. ranks and navigation", [ROOM, *sorted(MEDALS.glob("quarterly-league-*.png")), *sorted(RANKS.glob("*.png")), *sorted(NAVIGATION.glob("*.png"))]),
        ("all Green runtime PNGs", sorted(RUNTIME.rglob("*.png"))),
    ):
        decoded = sum(rgba(source).width * rgba(source).height * 4 for source in assets)
        print(f"{label}: {len(assets)} PNG | {sum(source.stat().st_size for source in assets)} B | {decoded} decoded B")


if __name__ == "__main__":
    main()
