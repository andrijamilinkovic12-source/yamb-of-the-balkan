from pathlib import Path
import hashlib
import math
import textwrap

from PIL import Image, ImageChops, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "www/assets/green-soft-clay"
HIRES = ROOT / "source-assets/green-soft-clay-hires"
APPROVED = HIRES / "online-players-free-v2.png"
MASTER = ROOT / "source-assets/green-soft-clay-canonical/online-players-room-identity/green-online-players-room-master-v1.png"
ROOM = RUNTIME / "canonical/online-players-room-identity/online-players-room-v1.png"
MENU = RUNTIME / "canonical/online-players-room-identity/online-players-room-menu-v1.png"
OUTPUT = ROOT / "docs/green-asset-standardization-online-players-room-identity-audit.png"
PANELS = [
    ("A1  approved canonical master", MASTER, "LOCK: room identity, no square backing tile"),
    ("A2  canonical room / intro", ROOM, "LOCK: 512 px room delivery"),
    ("A3  canonical main menu", MENU, "LOCK: 384 px startup delivery"),
    ("R1  framed alternate source", HIRES / "online-players-pro-v1.png", "REJECT: framed, zero active UI references"),
    ("C1  actual CSS display sizes", ROOM, "CHECK: intro 210, menu 44, header 32"),
    ("X1  empty / loading state", RUNTIME / "online-players-state-v1.png", "SEPARATE: list state, 88 px display"),
    ("X2  add friend action", RUNTIME / "online-add-friend-v1.png", "SHARED ACTION: 36 px in 38 px button"),
    ("X3  spectate action", RUNTIME / "online-spectate-v1.png", "SHARED ACTION: 27 px in 38 px button"),
    ("X4  challenge / duel action", RUNTIME / "online-duel-v1.png", "SHARED ACTION: 36 px in 38 px button"),
]
ASSETS = [
    APPROVED, MASTER, ROOM, MENU,
    HIRES / "online-players-pro-v1.png",
    *[directory / name for name in (
        "online-players-state-v1.png", "online-add-friend-v1.png",
        "online-spectate-v1.png", "online-duel-v1.png",
    ) for directory in (HIRES, RUNTIME)],
]


def checker(size: tuple[int, int]) -> Image.Image:
    panel = Image.new("RGBA", size)
    draw = ImageDraw.Draw(panel)
    colors = ((66, 94, 69, 255), (50, 78, 57, 255))
    for y in range(0, size[1], 14):
        for x in range(0, size[0], 14):
            draw.rectangle((x, y, x + 13, y + 13), fill=colors[(x // 14 + y // 14) % 2])
    return panel


def rgba(source: Path) -> Image.Image:
    with Image.open(source) as image:
        return image.convert("RGBA")


def identical(left: Image.Image, right: Image.Image) -> bool:
    return left.size == right.size and all(
        channel.getbbox() is None for channel in ImageChops.difference(left, right).split()
    )


def main() -> None:
    cell_width, preview_height, label_height, header_height = 370, 300, 124, 126
    sheet = Image.new("RGBA", (1480, header_height + math.ceil(len(PANELS) / 4) * 424), (21, 51, 32, 255))
    draw = ImageDraw.Draw(sheet)
    title_font = ImageFont.load_default(size=21)
    font = ImageFont.load_default(size=15)
    small_font = ImageFont.load_default(size=12)
    draw.text((30, 24), "GREEN ASSET STANDARDIZATION - ONLINE PLAYERS ROOM IDENTITY AUDIT", fill=(232, 240, 207, 255), font=title_font)
    draw.text((30, 65), "One locked room glyph, two canonical deliveries, distinct state and shared actions", fill=(172, 204, 161, 255), font=font)
    draw.text((30, 91), "Static PNG preview, not an emulator screenshot; live online presence remains separate UI", fill=(143, 178, 137, 255), font=small_font)
    for index, (label, source, assessment) in enumerate(PANELS):
        x = (index % 4) * cell_width
        y = header_height + (index // 4) * (preview_height + label_height)
        panel = checker((352, 288))
        source_image = rgba(source)
        if label.startswith("C1"):
            for delivery, size, position, caption in (
                (source_image, 210, (22, 37), "intro"),
                (rgba(MENU), 44, (277, 50), "44"),
                (source_image, 32, (282, 145), "32"),
            ):
                panel.alpha_composite(delivery.resize((size, size), Image.Resampling.LANCZOS), position)
                ImageDraw.Draw(panel).text((position[0], position[1] - 20), caption, fill=(230, 237, 204, 255), font=small_font)
        else:
            preview = source_image.copy()
            preview.thumbnail((264, 264), Image.Resampling.LANCZOS)
            panel.alpha_composite(preview, ((352 - preview.width) // 2, (288 - preview.height) // 2))
            actual_sizes = {"X1": 88, "X2": 36, "X3": 27, "X4": 36}
            if label[:2] in actual_sizes:
                size = actual_sizes[label[:2]]
                panel.alpha_composite(source_image.resize((size, size), Image.Resampling.LANCZOS), (10, 10))
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
    room = rgba(ROOM)
    for label, left, right in (
        ("source -> room", rgba(APPROVED).resize(room.size, Image.Resampling.LANCZOS), room),
        ("room -> menu", room.resize(rgba(MENU).size, Image.Resampling.LANCZOS), rgba(MENU)),
        ("source -> menu", rgba(APPROVED).resize(rgba(MENU).size, Image.Resampling.LANCZOS), rgba(MENU)),
    ):
        matches = identical(left, right)
        print(f"{label}: pixel-identical={matches}")
        if label != "source -> menu" and not matches:
            raise ValueError(f"Approved Online Players delivery changed: {label}")

    active = [ROOM, *[RUNTIME / name for name in (
        "online-players-state-v1.png", "online-add-friend-v1.png",
        "online-spectate-v1.png", "online-duel-v1.png",
    )]]
    for label, assets in (
        ("active room package", active),
        ("all Green runtime PNGs", sorted(RUNTIME.rglob("*.png"))),
    ):
        decoded = sum(rgba(source).width * rgba(source).height * 4 for source in assets)
        print(f"{label}: {len(assets)} PNG | {sum(source.stat().st_size for source in assets)} B | {decoded} decoded B")


if __name__ == "__main__":
    main()
