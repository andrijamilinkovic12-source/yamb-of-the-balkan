from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "www" / "assets" / "green-soft-clay"
HIRES = ROOT / "source-assets" / "green-soft-clay-hires"
OUTPUT = ROOT / "docs" / "green-asset-standardization-rewarded-video-audit.png"

CANDIDATES = [
    ("V1  economy rewarded video", "economy/rewarded-video-v1.png", "CANONICAL CANDIDATE: green ticket / ivory play / terracotta sparkle"),
    ("V2  economy unavailable", "economy/ad-unavailable-v1.png", "MATCHING STATE: same ticket / terracotta unavailable slash"),
    ("V3  daily reward", "daily/reward-video-v2.png", "MISMATCH: raised square video mark + one canonical dukat"),
    ("V4  treasury reward", "treasury/reward-video-v2.png", "MISMATCH: ivory film frame + one canonical dukat"),
    ("V5  solo double reward", "solo/finish-reward-video-v2.png", "MISMATCH: free play triangle + two canonical dukats"),
    ("V6  solo claim", "solo/finish-claim-v1.png", "EXCLUDED: claim/check action, not rewarded video"),
    ("V7  daily already played", "daily/already-played-v1.png", "EXCLUDED: completed/locked state, not unavailable ad"),
]


def source_for(relative: str) -> Path:
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


def main() -> None:
    columns = 2
    cell_width = 560
    image_height = 420
    label_height = 82
    header_height = 118
    rows = (len(CANDIDATES) + columns - 1) // columns
    sheet = Image.new("RGBA", (columns * cell_width, header_height + rows * (image_height + label_height)), (23, 55, 34, 255))
    draw = ImageDraw.Draw(sheet)
    title_font = ImageFont.load_default(size=19)
    font = ImageFont.load_default(size=15)
    small_font = ImageFont.load_default(size=13)
    draw.text((30, 23), "GREEN ASSET STANDARDIZATION - REWARDED VIDEO AUDIT", fill=(229, 239, 204, 255), font=title_font)
    draw.text((30, 62), "Core video identity, unavailable state and reward composites - no runtime changes", fill=(171, 202, 158, 255), font=font)

    for index, (label, relative, assessment) in enumerate(CANDIDATES):
        column = index % columns
        row = index // columns
        x = column * cell_width
        y = header_height + row * (image_height + label_height)
        panel = checker((cell_width - 18, image_height - 12))
        source = source_for(relative)
        if source.exists():
            source_image = Image.open(source).convert("RGBA")
            preview = source_image.copy()
            preview.thumbnail((image_height - 44, image_height - 44), Image.Resampling.LANCZOS)
            panel.alpha_composite(preview, ((panel.width - preview.width) // 2, (panel.height - preview.height) // 2))
            meta = f"{relative}  |  {source_image.width}x{source_image.height}  |  {source.stat().st_size / 1024:.0f} KB"
        else:
            meta = f"{relative}  |  MISSING"
        sheet.alpha_composite(panel, (x + 9, y + 6))
        draw.rectangle((x + 9, y + 6, x + cell_width - 10, y + image_height - 7), outline=(130, 166, 118, 255), width=2)
        draw.text((x + 16, y + image_height + 4), label, fill=(237, 230, 193, 255), font=font)
        draw.text((x + 16, y + image_height + 28), assessment, fill=(190, 211, 174, 255), font=small_font)
        draw.text((x + 16, y + image_height + 50), meta, fill=(151, 183, 143, 255), font=small_font)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(OUTPUT, quality=94, subsampling=0)
    print(OUTPUT)


if __name__ == "__main__":
    main()
