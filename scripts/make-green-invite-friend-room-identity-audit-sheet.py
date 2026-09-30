from pathlib import Path
import hashlib
import math
import textwrap

from PIL import Image, ImageChops, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "www/assets/green-soft-clay"
HIRES = ROOT / "source-assets/green-soft-clay-hires"
SOURCE = HIRES / "mode-invite-free-v2.png"
ROOM = RUNTIME / "canonical/invite-friend-room-identity/invite-friend-room-v1.png"
MENU = RUNTIME / "canonical/invite-friend-room-identity/invite-friend-room-menu-v1.png"
ADD_FRIEND = RUNTIME / "online-add-friend-v1.png"
H2H_EMPTY = RUNTIME / "canonical/h2h-statistics/h2h-empty-v1.png"
OUTPUT = ROOT / "docs/green-asset-standardization-invite-friend-room-identity-audit.png"
PANELS = [
    ("A1  approved Invite Friend source", SOURCE, "KEEP: linked-clay room identity"),
    ("A2  active room / intro / header", ROOM, "KEEP: same identity, 512 px delivery"),
    ("A3  active Invite Friend menu", MENU, "KEEP: same identity, 384 px delivery"),
    ("C1  actual display sizes", ROOM, "210 intro / 68 menu / 60 mobile / 34 header"),
    ("X1  add-friend action", ADD_FRIEND, "SHARED: add/search friend action"),
    ("X2  send invitation", RUNTIME / "invite/send-v1.png", "SEPARATE: send action on friend card"),
    ("X3  empty friend list", RUNTIME / "invite/empty-v1.png", "SEPARATE: no available friends state"),
    ("X4  invitation sent", RUNTIME / "invite/sent-v1.png", "SEPARATE: sent confirmation toast"),
    ("X5  invitation accepted", RUNTIME / "invite/accepted-v1.png", "SEPARATE: accepted confirmation toast"),
    ("X6  no H2H rival", H2H_EMPTY, "LOCKED: shared H2H empty identity"),
]
ASSETS = list(dict.fromkeys(source for _, source, _ in PANELS))
EXPECTED_HASHES = {
    SOURCE: "5a59eccad3f26779dbe2e8388f51916681e285cffd31b7f904231ffb3872a183",
    ROOM: "30894f35a73c1ae1e1ca27267c2342e7c2aac46753c3d8ccffcc5bfaaa0dd356",
    MENU: "ae634e3928fef02d57d8dc13f5415ff5de76e1451575a92a155319fd1c5b77e4",
    ADD_FRIEND: "61dc2f1a57f475a2279f48337590784f527edcf2044e53c52df43f1814ef0dda",
    RUNTIME / "invite/send-v1.png": "232862a11b63bf8e637980184c56289c584fd1cd45f71ed6298e08e0053e1628",
    RUNTIME / "invite/empty-v1.png": "be936013867a9a3946bac39846ec254c2bc77ee9241901c55625648a74aff6b9",
    RUNTIME / "invite/sent-v1.png": "809b913c55e33e080f238c0a71b5b3ff002bb3237f49d584be434d171f286994",
    RUNTIME / "invite/accepted-v1.png": "dc90636ed9aabdacf4f61a70d49c1056dbdaeee46bedb3b1e838b29aaa22925a",
    H2H_EMPTY: "43bc21b1893ae56d609d69ad429cdfc502e343fcd08c1df7956bbfb74f358c70",
}


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
    draw.text((30, 24), "GREEN ASSET STANDARDIZATION - INVITE FRIEND ROOM IDENTITY AUDIT", fill=(232, 240, 207, 255), font=title_font)
    draw.text((30, 65), "One room identity; friend actions, invite states and H2H data stay distinct", fill=(172, 204, 161, 255), font=font)
    draw.text((30, 91), "Static PNG audit, not an emulator screenshot; profiles, Power and POB/NER/POR stay live UI", fill=(143, 178, 137, 255), font=small_font)
    for index, (label, source, assessment) in enumerate(PANELS):
        x = (index % 4) * cell_width
        y = header_height + (index // 4) * (preview_height + label_height)
        panel = checker((352, 288))
        source_image = rgba(source)
        if label.startswith("C1"):
            for delivery, size, position, caption, caption_position in (
                (source_image, 210, (19, 38), "210 intro", (19, 19)),
                (rgba(MENU), 68, (270, 38), "68 menu", (265, 19)),
                (rgba(MENU), 60, (273, 156), "60 mobile", (263, 140)),
                (source_image, 34, (286, 235), "34 header", (265, 218)),
            ):
                panel.alpha_composite(delivery.resize((size, size), Image.Resampling.LANCZOS), position)
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
            digest = hashlib.sha256(source.read_bytes()).hexdigest()
            assert digest == EXPECTED_HASHES[source], source
            print(f"{source.relative_to(ROOT).as_posix()} | {image.width}x{image.height} {image.mode} | {source.stat().st_size} B | {digest}")

    room, menu = rgba(ROOM), rgba(MENU)
    for label, left, right in (
        ("source -> room", rgba(SOURCE).resize(room.size, Image.Resampling.LANCZOS), room),
        ("room -> menu", room.resize(menu.size, Image.Resampling.LANCZOS), menu),
        ("source -> menu", rgba(SOURCE).resize(menu.size, Image.Resampling.LANCZOS), menu),
    ):
        print(f"{label}: pixel-identical={identical(left, right)}")

    for name in ("send", "empty", "sent", "accepted"):
        source = rgba(HIRES / f"invite/{name}-v1.png")
        runtime = rgba(RUNTIME / f"invite/{name}-v1.png")
        print(f"{name} source -> runtime: pixel-identical={identical(source.resize(runtime.size, Image.Resampling.LANCZOS), runtime)}")
    add_source = rgba(HIRES / "online-add-friend-v1.png")
    add_runtime = rgba(ADD_FRIEND)
    print(f"add-friend source -> runtime: pixel-identical={identical(add_source.resize(add_runtime.size, Image.Resampling.LANCZOS), add_runtime)}")

    room_package = [ROOM, *[RUNTIME / f"invite/{name}-v1.png" for name in ("send", "empty", "sent", "accepted")]]
    for label, assets in (
        ("catalog Invite Friend room package", room_package),
        ("all Green runtime PNGs", sorted(RUNTIME.rglob("*.png"))),
    ):
        decoded = sum(rgba(source).width * rgba(source).height * 4 for source in assets)
        print(f"{label}: {len(assets)} PNG | {sum(source.stat().st_size for source in assets)} B | {decoded} decoded B")


if __name__ == "__main__":
    main()
