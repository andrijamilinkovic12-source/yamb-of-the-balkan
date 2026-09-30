from pathlib import Path
import hashlib
import math
import textwrap

from PIL import Image, ImageChops, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
HIRES = ROOT / "source-assets/green-soft-clay-hires/leaderboard"
RUNTIME = ROOT / "www/assets/green-soft-clay"
OUTPUT = ROOT / "docs/green-asset-standardization-leaderboard-controls-audit.png"

ASSETS = {
    "global": {
        "source_hash": "23ff6206d71ee940dbbbcf4e86e5deba117639c9f3a78d6fa6accf8ed64e1222",
        "runtime_hash": "3a9aa67230a1d53d6e1e05dac1b8f8ca4a738f92cb3cf07d495bde165ac2519a",
        "source_bytes": 986476,
        "runtime_bytes": 47269,
        "runtime_size": 256,
        "displays": (21, 25),
    },
    "local": {
        "source_hash": "74ac656255517939ad032b8a72bcdc180fae36f490c97eb3d2149ad2a7b744f8",
        "runtime_hash": "44e60c1c9a9166f77294a9d3197bdb4cfd41c64d283753288635498de39d5630",
        "source_bytes": 863574,
        "runtime_bytes": 38952,
        "runtime_size": 256,
        "displays": (21, 25),
    },
    "empty-loading": {
        "source_hash": "dcc5dadc8889bb495d1496f25d145b2f043343701fc01a72192cbd60998d0afe",
        "runtime_hash": "7b0c89808cd5185fb53e16a52320f1e575fbeeb691efad255971f5ca9aee67ba",
        "source_bytes": 732830,
        "runtime_bytes": 68504,
        "runtime_size": 384,
        "displays": (86, 68, 58),
    },
}

ROOM = RUNTIME / "canonical/leaderboard-room-identity/leaderboard-room-v1.png"
MEDAL = RUNTIME / "canonical/competition-medals/general-podium-gold-v1.png"
PANELS = [
    ("A1  Global approved source", HIRES / "global-v1.png", "Globe podium: Global navigation", ()),
    ("A2  Global canonical runtime", RUNTIME / "canonical/leaderboard-controls/global-v1.png", "Tab 21 px; panel title 25 px", (21, 25)),
    ("B1  Local approved source", HIRES / "local-v1.png", "House podium: Local navigation", ()),
    ("B2  Local canonical runtime", RUNTIME / "canonical/leaderboard-controls/local-v1.png", "Tab 21 px; panel title 25 px", (21, 25)),
    ("C1  Empty/loading source", HIRES / "empty-loading-v1.png", "Hourglass podium: list state", ()),
    ("C2  Empty/loading runtime", RUNTIME / "canonical/leaderboard-controls/empty-loading-v1.png", "Empty 86; loading 68; waiting 58 px", (86, 68, 58)),
    ("X1  Leaderboard room identity", ROOM, "LOCKED: entry, intro, header", (32,)),
    ("X2  General Podium gold", MEDAL, "LOCKED: rank award, not a control", (42,)),
]


def rgba(path: Path) -> Image.Image:
    with Image.open(path) as image:
        if image.mode != "RGBA":
            raise ValueError(f"Expected RGBA: {path}")
        return image.copy()


def identical(left: Image.Image, right: Image.Image) -> bool:
    return left.size == right.size and all(
        channel.getbbox() is None for channel in ImageChops.difference(left, right).split()
    )


def check_png(path: Path, size: int, byte_count: int, digest: str) -> Image.Image:
    image = rgba(path)
    if image.size != (size, size) or path.stat().st_size != byte_count:
        raise ValueError(f"Unexpected dimensions or bytes: {path}")
    if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
        raise ValueError(f"Unexpected SHA-256: {path}")
    if image.getchannel("A").getextrema() != (0, 255):
        raise ValueError(f"Alpha range changed: {path}")
    if any(image.getpixel(point)[3] != 0 for point in ((0, 0), (size - 1, 0), (0, size - 1), (size - 1, size - 1))):
        raise ValueError(f"Nontransparent corner: {path}")
    return image


def checker(size: tuple[int, int]) -> Image.Image:
    panel = Image.new("RGBA", size)
    draw = ImageDraw.Draw(panel)
    colors = ((66, 94, 69, 255), (50, 78, 57, 255))
    for y in range(0, size[1], 14):
        for x in range(0, size[0], 14):
            draw.rectangle((x, y, x + 13, y + 13), fill=colors[(x // 14 + y // 14) % 2])
    return panel


def main() -> None:
    for asset_id, info in ASSETS.items():
        source_path = HIRES / f"{asset_id}-v1.png"
        runtime_path = RUNTIME / "canonical/leaderboard-controls" / f"{asset_id}-v1.png"
        source = check_png(source_path, 1254, info["source_bytes"], info["source_hash"])
        runtime = check_png(runtime_path, info["runtime_size"], info["runtime_bytes"], info["runtime_hash"])
        if not identical(source.resize(runtime.size, Image.Resampling.LANCZOS), runtime):
            raise ValueError(f"Source to runtime pixels differ: {asset_id}")
        print(f"{asset_id}: {source.size} -> {runtime.size}, {info['runtime_bytes']} B, pixel-identical")

    expected_exclusions = {
        ROOM: "8acfb917163a7cf02142c1d0c5613c850cd5e882b8a586caead1d282c0d7aa0e",
        MEDAL: "d28b456736188dfc50e929708ca3d77ad43acb11fb42af786ef68055a95b500a",
    }
    for path, digest in expected_exclusions.items():
        if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            raise ValueError(f"Protected family changed: {path}")

    cell_width, preview_height, label_height, header_height = 370, 300, 124, 126
    rows = math.ceil(len(PANELS) / 4)
    sheet = Image.new("RGBA", (1480, header_height + rows * (preview_height + label_height)), (21, 51, 32, 255))
    draw = ImageDraw.Draw(sheet)
    title_font = ImageFont.load_default(size=21)
    font = ImageFont.load_default(size=15)
    small_font = ImageFont.load_default(size=12)
    draw.text((30, 24), "GREEN ASSET STANDARDIZATION - LEADERBOARD CONTROLS", fill=(232, 240, 207, 255), font=title_font)
    draw.text((30, 65), "Global and Local navigation; shared empty/loading state", fill=(172, 204, 161, 255), font=font)
    draw.text((30, 91), "Static PNG audit; room identity, medals, rankings and filters remain separate", fill=(143, 178, 137, 255), font=small_font)

    for index, (label, source_path, assessment, display_sizes) in enumerate(PANELS):
        x = (index % 4) * cell_width
        y = header_height + (index // 4) * (preview_height + label_height)
        panel = checker((352, 288))
        source_image = rgba(source_path)
        preview = source_image.copy()
        preview.thumbnail((232, 232), Image.Resampling.LANCZOS)
        panel.alpha_composite(preview, ((352 - preview.width) // 2 - (30 if display_sizes else 0), (288 - preview.height) // 2))
        for size_index, size in enumerate(display_sizes):
            actual = source_image.resize((size, size), Image.Resampling.LANCZOS)
            inset_x = 352 - size - 16
            inset_y = 16 + size_index * 84
            panel.alpha_composite(actual, (inset_x, inset_y))
            ImageDraw.Draw(panel).text((inset_x - 5, inset_y + size + 2), f"{size}px", fill=(230, 237, 204, 255), font=small_font)
        sheet.alpha_composite(panel, (x + 9, y + 6))
        draw.rectangle((x + 9, y + 6, x + 360, y + 293), outline=(128, 165, 116, 255), width=2)
        draw.text((x + 16, y + 304), label, fill=(239, 231, 194, 255), font=font)
        draw.text((x + 16, y + 331), assessment, fill=(185, 211, 172, 255), font=small_font)
        relative = source_path.relative_to(ROOT).as_posix().replace("source-assets/green-soft-clay-hires/", "hires/").replace("www/assets/green-soft-clay/", "green/")
        meta = f"{relative} | {source_image.width}x{source_image.height}"
        draw.multiline_text((x + 16, y + 355), "\n".join(textwrap.wrap(meta, width=49)), fill=(143, 178, 137, 255), font=small_font, spacing=2)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(OUTPUT, optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
