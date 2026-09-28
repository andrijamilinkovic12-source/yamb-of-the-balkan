from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source-assets" / "green-soft-clay-canonical" / "ducat"
RUNTIME = ROOT / "www" / "assets" / "green-soft-clay" / "canonical" / "ducat"
PREVIEW = ROOT / "docs" / "green-canonical-ducat-pack-v1.png"

VARIANTS = {
    "ducat-front-v1.png": ("green-ducat-front-master-v1.png", 512),
    "ducat-inline-v1.png": ("green-ducat-front-master-v1.png", 192),
    "ducat-particle-v1.png": ("green-ducat-front-master-v1.png", 128),
    "ducat-angle-left-v1.png": ("green-ducat-angle-left-master-v1.png", 512),
    "ducat-angle-right-v1.png": ("green-ducat-angle-right-master-v1.png", 512),
}


def load_rgba(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    if image.width != image.height:
        raise ValueError(f"Canonical dukat master must be square: {path}")
    if image.getchannel("A").getextrema() == (255, 255):
        raise ValueError(f"Canonical dukat master must preserve transparency: {path}")
    return image


def save_runtime(source_name: str, output_name: str, size: int) -> None:
    image = load_rgba(SOURCE / source_name)
    runtime = image.resize((size, size), Image.Resampling.LANCZOS)
    runtime.save(RUNTIME / output_name, format="PNG", optimize=True, compress_level=9)


def make_preview() -> None:
    cards = [
        ("FRONT MASTER", "green-ducat-front-master-v1.png"),
        ("ANGLE - THICKNESS LEFT", "green-ducat-angle-left-master-v1.png"),
        ("ANGLE - THICKNESS RIGHT", "green-ducat-angle-right-master-v1.png"),
    ]
    width, height = 1500, 650
    sheet = Image.new("RGBA", (width, height), (21, 55, 34, 255))
    draw = ImageDraw.Draw(sheet)
    title_font = ImageFont.load_default(size=22)
    label_font = ImageFont.load_default(size=17)
    draw.text((34, 24), "GREEN ROOM PACK - CANONICAL DUKAT V1", fill=(235, 238, 207, 255), font=title_font)
    draw.text((34, 59), "Jedan identitet: ivory obod, terracotta lice, pet forest-green clay tacaka", fill=(171, 202, 158, 255), font=label_font)

    card_width = 470
    card_height = 510
    for index, (label, filename) in enumerate(cards):
        x = 20 + index * 490
        y = 112
        draw.rounded_rectangle((x, y, x + card_width, y + card_height), radius=28, fill=(47, 83, 53, 255), outline=(144, 176, 126, 255), width=2)
        image = load_rgba(SOURCE / filename)
        image.thumbnail((410, 410), Image.Resampling.LANCZOS)
        sheet.alpha_composite(image, (x + (card_width - image.width) // 2, y + 24))
        draw.text((x + 22, y + 447), label, fill=(240, 224, 185, 255), font=label_font)
        draw.text((x + 22, y + 476), "1254x1254 RGBA master", fill=(169, 199, 153, 255), font=label_font)

    PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(PREVIEW, quality=95, subsampling=0)


def main() -> None:
    RUNTIME.mkdir(parents=True, exist_ok=True)
    for output_name, (source_name, size) in VARIANTS.items():
        save_runtime(source_name, output_name, size)
    make_preview()
    for output_name in VARIANTS:
        path = RUNTIME / output_name
        with Image.open(path) as image:
            print(f"{path.relative_to(ROOT)} | {image.width}x{image.height} | {path.stat().st_size / 1024:.0f} KB | {image.mode}")
    print(PREVIEW.relative_to(ROOT))


if __name__ == "__main__":
    main()
