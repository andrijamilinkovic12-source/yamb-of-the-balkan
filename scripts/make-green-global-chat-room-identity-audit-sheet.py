from pathlib import Path
import hashlib
import textwrap

from PIL import Image, ImageChops, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "www/assets/green-soft-clay"
HIRES = ROOT / "source-assets/green-soft-clay-hires"
MASTER = ROOT / "source-assets/green-soft-clay-canonical/global-chat-room-identity/green-global-chat-room-master-v1.png"
ROOM = RUNTIME / "canonical/global-chat-room-identity/global-chat-room-v1.png"
MENU = RUNTIME / "canonical/global-chat-room-identity/global-chat-room-menu-v1.png"
OUTPUT = ROOT / "docs/green-asset-standardization-global-chat-room-identity-audit.png"
PANELS = [
    ("A1  approved canonical master", MASTER, "LOCK: room identity, no square backing tile"),
    ("A2  canonical room / intro", ROOM, "LOCK: 512 px room delivery"),
    ("A3  canonical main menu", MENU, "LOCK: 384 px startup delivery"),
    ("R1  framed alternate source", HIRES / "global-chat-pro-v1.png", "REJECT: framed, zero active UI references"),
    ("C1  actual CSS display sizes", ROOM, "CHECK: intro 210, menu 52, header 32"),
    ("X1  empty / loading state", RUNTIME / "global-chat-empty-v1.png", "SEPARATE: history state, 76 px display"),
    ("X2  send action", RUNTIME / "global-chat-send-v1.png", "SEPARATE: paper plane, 32 px display"),
    ("X3  Rules communication page", RUNTIME / "rules/pages/communication-v1.png", "SEPARATE: page-level communication scene"),
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


def main() -> None:
    cell_width, preview_height, label_height, header_height = 370, 300, 124, 126
    sheet = Image.new("RGBA", (1480, 974), (21, 51, 32, 255))
    draw = ImageDraw.Draw(sheet)
    title_font = ImageFont.load_default(size=21)
    font = ImageFont.load_default(size=15)
    small_font = ImageFont.load_default(size=12)
    draw.text((30, 24), "GREEN ASSET STANDARDIZATION - GLOBAL CHAT ROOM IDENTITY AUDIT", fill=(232, 240, 207, 255), font=title_font)
    draw.text((30, 65), "One room glyph, two canonical deliveries, distinct state and send action", fill=(172, 204, 161, 255), font=font)
    for index, (label, source, assessment) in enumerate(PANELS):
        x = (index % 4) * cell_width
        y = header_height + (index // 4) * (preview_height + label_height)
        panel = checker((352, 288))
        source_image = rgba(source)
        if label.startswith("C1"):
            for delivery, size, position, caption in (
                (source_image, 210, (22, 37), "intro"),
                (rgba(MENU), 52, (273, 50), "52"),
                (source_image, 32, (282, 145), "32"),
            ):
                panel.alpha_composite(delivery.resize((size, size), Image.Resampling.LANCZOS), position)
                ImageDraw.Draw(panel).text((position[0], position[1] - 20), caption, fill=(230, 237, 204, 255), font=small_font)
        else:
            preview = source_image.copy()
            preview.thumbnail((264, 264), Image.Resampling.LANCZOS)
            panel.alpha_composite(preview, ((352 - preview.width) // 2, (288 - preview.height) // 2))
            if label.startswith("X1") or label.startswith("X2"):
                size = 76 if label.startswith("X1") else 32
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

    for source in [
        HIRES / "global-chat-free-v2.png", MASTER, ROOM, MENU,
        HIRES / "global-chat-pro-v1.png",
        HIRES / "global-chat-empty-v1.png", RUNTIME / "global-chat-empty-v1.png",
        HIRES / "global-chat-send-v1.png", RUNTIME / "global-chat-send-v1.png",
    ]:
        with Image.open(source) as image:
            assert image.mode == "RGBA", source
            assert image.getchannel("A").getextrema() == (0, 255), source
            assert image.getpixel((0, 0))[3] == 0, source
            print(f"{source.relative_to(ROOT).as_posix()} | {image.width}x{image.height} {image.mode} | {source.stat().st_size} B | {hashlib.sha256(source.read_bytes()).hexdigest()}")
    room = rgba(ROOM)
    approved_room = rgba(HIRES / "global-chat-free-v2.png").resize((512, 512), Image.Resampling.LANCZOS)
    for label, left, right in (
        ("source 1254->512 room", approved_room, room),
        ("room 512->384 menu", room.resize((384, 384), Image.Resampling.LANCZOS), rgba(MENU)),
        ("source 1254->384 menu", rgba(HIRES / "global-chat-free-v2.png").resize((384, 384), Image.Resampling.LANCZOS), rgba(MENU)),
    ):
        delta = ImageChops.difference(left, right)
        identical = all(channel.getbbox() is None for channel in delta.split())
        print(f"{label}: pixel-identical={identical}")
        if label != "source 1254->384 menu" and not identical:
            raise ValueError(f"Approved Global Chat delivery changed: {label}")


if __name__ == "__main__":
    main()
