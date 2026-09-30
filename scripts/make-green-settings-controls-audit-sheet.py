"""Verify and display the eight pending Green Settings control glyphs."""

from pathlib import Path
import hashlib

from PIL import Image, ImageChops, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / "source-assets/green-soft-clay-hires/settings"
RUNTIME = ROOT / "www/assets/green-soft-clay/canonical/settings-controls"
OUTPUT = ROOT / "docs/green-asset-standardization-settings-controls-audit.png"

# ID, screen role, actual CSS size, approved source bytes/hash, canonical bytes/hash.
ASSETS = (
    ("profile", "Profile & account", 20, 807043, "a6bf8e46a6ac89249aa0400dbec86a7efd4e01efa22f2657ca19a0fbb2772461", 40077, "4d9dbbce33cecc87901eabdb67719b9f8253526a8f5df7340fb9dfda50b901c4"),
    ("sound", "Sound effects", 25, 797913, "a53fdcd89e0ca31a949808d4fe1137f9529fb00fbbc973d811a136f3b29f1b9f", 41850, "0b5a470fb79fc8e8805a4a627a88d4639aafc68ee631ff1d9f9ab0c8561a7ce4"),
    ("music", "Music", 25, 608863, "9dd53e944a937547c883f406089f58c16e494272c9d8c17c4cce2056f9c76ad8", 31850, "8c81adfd83a6389ef5c5f55ab098e36610e1a11427731bbaad1edfb9468bd88f"),
    ("vibration", "Vibration", 25, 866300, "028339d0c92a881096026bfce9d607e982129d3206a60bae111be753e576268a", 42238, "893e80c00e4cf4432bd7fcd9cba2deeeee96807faf7ce95c7421c28ee6b871c0"),
    ("display-theme", "Display & theme", 20, 1190402, "10b61a698a5a7667f8253fe098ec3bd8ef1b7bd0ea5d943e3949af383504b00d", 57344, "9c9332adbc012cbd3211bf4c909437d09cc1a10ee960d683e00fdea81ea5669a"),
    ("language", "Language", 20, 923063, "ce9196112ef4a688e1f922b23230bc4d4f8ea3f24f3989f31dc9e8cc9380dcee", 47659, "ea983bc0e7b24162e7682897fdd6cbe4da45a5383664297eb76a29fb70f0b742"),
    ("terms", "Terms", 18, 1053642, "2fc6173c8fdefa0602f91b0017e57a79351e2d2ce885a0876ed9b7e57aa1d5d9", 50701, "07cebe403288e99f12c63e1f3afa2fb5de884cc6387514f82e28e7de71c2ebc5"),
    ("privacy", "Privacy", 18, 927823, "d10f9f8275165593c52c5d37908dbf35ec5407b87bfc70d45fb305155806f803", 46345, "4118758bdf0cc8798654c48f4d15a05e28124426d61f3d4f404d629dada3a48b"),
)


def verified_image(path: Path, size: int, byte_count: int, digest: str) -> Image.Image:
    if path.stat().st_size != byte_count or hashlib.sha256(path.read_bytes()).hexdigest() != digest:
        raise ValueError(f"Unapproved Green Settings bytes: {path}")
    with Image.open(path) as opened:
        if opened.size != (size, size) or opened.mode != "RGBA":
            raise ValueError(f"Wrong Green Settings image format: {path}")
        image = opened.copy()
    if image.getchannel("A").getextrema() != (0, 255):
        raise ValueError(f"Wrong alpha range: {path}")
    if any(image.getpixel(point)[3] != 0 for point in ((0, 0), (size - 1, 0), (0, size - 1), (size - 1, size - 1))):
        raise ValueError(f"Non-transparent corner: {path}")
    return image


def checker(size: tuple[int, int]) -> Image.Image:
    image = Image.new("RGBA", size)
    draw = ImageDraw.Draw(image)
    colors = ((63, 90, 67, 255), (49, 75, 56, 255))
    for y in range(0, size[1], 14):
        for x in range(0, size[0], 14):
            draw.rectangle((x, y, x + 13, y + 13), fill=colors[(x // 14 + y // 14) % 2])
    return image


def main() -> None:
    sheet = Image.new("RGBA", (1480, 974), (21, 51, 32, 255))
    draw = ImageDraw.Draw(sheet)
    title_font = ImageFont.load_default(size=21)
    font = ImageFont.load_default(size=15)
    small = ImageFont.load_default(size=12)
    draw.text((30, 24), "GREEN ASSET STANDARDIZATION - SETTINGS CONTROLS", fill=(232, 240, 207, 255), font=title_font)
    draw.text((30, 65), "Eight locked glyphs: approved 1254 px source / exact 256 px canonical delivery", fill=(172, 204, 161, 255), font=font)
    draw.text((30, 91), "Static controls; actual 20 / 25 / 18 px display probes. Main Settings gear is a separate locked identity.", fill=(143, 178, 137, 255), font=small)

    for index, (asset_id, role, actual_size, source_bytes, source_hash, runtime_bytes, runtime_hash) in enumerate(ASSETS):
        filename = f"{asset_id}-v1.png"
        source = verified_image(SOURCES / filename, 1254, source_bytes, source_hash)
        runtime = verified_image(RUNTIME / filename, 256, runtime_bytes, runtime_hash)
        if ImageChops.difference(source.resize((256, 256), Image.Resampling.LANCZOS), runtime).getbbox():
            raise ValueError(f"Runtime is not a direct LANCZOS reduction: {filename}")
        x, y = (index % 4) * 370, 126 + (index // 4) * 424
        panel = checker((352, 288))
        panel.alpha_composite(source.resize((130, 130), Image.Resampling.LANCZOS), (22, 57))
        panel.alpha_composite(runtime.resize((130, 130), Image.Resampling.LANCZOS), (175, 57))
        panel.alpha_composite(runtime.resize((actual_size, actual_size), Image.Resampling.LANCZOS), (310, 18))
        panel_draw = ImageDraw.Draw(panel)
        panel_draw.text((30, 206), "SOURCE 1254", fill=(230, 237, 204, 255), font=small)
        panel_draw.text((182, 206), "CANON 256", fill=(230, 237, 204, 255), font=small)
        panel_draw.text((306, 49), f"{actual_size}px", fill=(230, 237, 204, 255), font=small)
        sheet.alpha_composite(panel, (x + 9, y + 6))
        draw.rectangle((x + 9, y + 6, x + 360, y + 293), outline=(128, 165, 116, 255), width=2)
        draw.text((x + 16, y + 304), f"{index + 1}. {role}", fill=(239, 231, 194, 255), font=font)
        draw.text((x + 16, y + 333), f"settings-controls/{filename}", fill=(185, 211, 172, 255), font=small)
        draw.text((x + 16, y + 354), f"{runtime_bytes:,} B runtime | exact source resize", fill=(143, 178, 137, 255), font=small)
        print(f"{filename}: 1254 -> 256 RGBA LANCZOS identical, {runtime_bytes} B, {runtime_hash}")

    sheet.save(OUTPUT, optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
