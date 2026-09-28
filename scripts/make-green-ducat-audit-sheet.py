from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
HIRES = ROOT / "source-assets" / "green-soft-clay-hires"
RUNTIME = ROOT / "www" / "assets" / "green-soft-clay"
OUTPUT = ROOT / "docs" / "green-asset-standardization-ducat-audit.png"

CANDIDATES = [
    ("A1  economy/ducat-v1", "economy/ducat-v1.png"),
    ("A2  ducats-undo-free-v2", "ducats-undo-free-v2.png"),
    ("A3  ducats-undo-pro-v1", "ducats-undo-pro-v1.png"),
    ("A4  treasury-free-v2", "treasury-free-v2.png"),
    ("A5  daily/reward-video-v1", "daily/reward-video-v1.png"),
    ("A6  daily/complete-v1", "daily/complete-v1.png"),
    ("A7  economy/rewarded-video-v1", "economy/rewarded-video-v1.png"),
    ("A8  treasury/reward-video-v1", "treasury/reward-video-v1.png"),
    ("A9  treasury/status-insufficient-v1", "treasury/status-insufficient-v1.png"),
    ("A10 solo/finish-reward-video-v1", "solo/finish-reward-video-v1.png"),
    ("A11 solo/finish-claim-v1", "solo/finish-claim-v1.png"),
    ("A12 statistics/all-time-points-v1", "statistics/all-time-points-v1.png"),
    ("A13 rules/pages/economy-treasury-v1", "rules/pages/economy-treasury-v1.png"),
]


def find_source(relative: str) -> Path:
    high_resolution = HIRES / relative
    return high_resolution if high_resolution.exists() else RUNTIME / relative


def checker(size: tuple[int, int], block: int = 18) -> Image.Image:
    result = Image.new("RGBA", size, (42, 67, 48, 255))
    draw = ImageDraw.Draw(result)
    colors = ((72, 100, 73, 255), (55, 82, 60, 255))
    for y in range(0, size[1], block):
        for x in range(0, size[0], block):
            draw.rectangle((x, y, x + block - 1, y + block - 1), fill=colors[(x // block + y // block) % 2])
    return result


def contain(image: Image.Image, target: tuple[int, int]) -> Image.Image:
    copy = image.convert("RGBA")
    copy.thumbnail(target, Image.Resampling.LANCZOS)
    return copy


def main() -> None:
    columns = 3
    cell_width = 390
    image_height = 285
    label_height = 56
    header_height = 112
    rows = (len(CANDIDATES) + columns - 1) // columns
    sheet = Image.new("RGBA", (columns * cell_width, header_height + rows * (image_height + label_height)), (23, 55, 34, 255))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default(size=18)
    small_font = ImageFont.load_default(size=14)
    draw.text((30, 24), "GREEN ASSET STANDARDIZATION — DUKAT AUDIT", fill=(229, 239, 204, 255), font=font)
    draw.text((30, 61), "Postojeci master i kompozicije za vizuelnu proveru; bez izmena asseta", fill=(171, 202, 158, 255), font=small_font)

    for index, (label, relative) in enumerate(CANDIDATES):
        column = index % columns
        row = index // columns
        x = column * cell_width
        y = header_height + row * (image_height + label_height)
        panel = checker((cell_width - 18, image_height - 12))
        source = find_source(relative)
        if source.exists():
            source_image = Image.open(source).convert("RGBA")
            preview = contain(source_image, (image_height - 38, image_height - 38))
            panel.alpha_composite(preview, ((panel.width - preview.width) // 2, (panel.height - preview.height) // 2))
            meta = f"{source_image.width}x{source_image.height}  {source.stat().st_size / 1024:.0f} KB"
        else:
            meta = "NEDOSTAJE"
        sheet.alpha_composite(panel, (x + 9, y + 6))
        draw.rectangle((x + 9, y + 6, x + cell_width - 10, y + image_height - 7), outline=(130, 166, 118, 255), width=2)
        draw.text((x + 16, y + image_height + 3), label, fill=(237, 230, 193, 255), font=small_font)
        draw.text((x + 16, y + image_height + 27), meta, fill=(164, 195, 151, 255), font=small_font)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(OUTPUT, quality=94, subsampling=0)
    print(OUTPUT)


if __name__ == "__main__":
    main()
