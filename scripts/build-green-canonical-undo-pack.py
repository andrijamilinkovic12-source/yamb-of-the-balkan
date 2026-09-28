from hashlib import sha256
from pathlib import Path
from shutil import copy2

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ORIGINAL = ROOT / "source-assets" / "green-soft-clay-hires" / "economy" / "undo-token-v1.png"
SOURCE = ROOT / "source-assets" / "green-soft-clay-canonical" / "undo-token"
MASTER = SOURCE / "green-undo-token-front-master-v1.png"
RUNTIME = ROOT / "www" / "assets" / "green-soft-clay" / "canonical" / "undo-token"
PREVIEW = ROOT / "docs" / "green-canonical-undo-token-pack-v1.png"

VARIANTS = {
    "undo-token-front-v1.png": 512,
    "undo-token-inline-v1.png": 192,
}


def digest(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


def ensure_master() -> None:
    SOURCE.mkdir(parents=True, exist_ok=True)
    if MASTER.exists():
        if digest(MASTER) != digest(ORIGINAL):
            raise ValueError("Canonical Undo master differs from the approved U1 source.")
        return
    copy2(ORIGINAL, MASTER)


def load_master() -> Image.Image:
    image = Image.open(MASTER).convert("RGBA")
    if image.size != (512, 512):
        raise ValueError(f"Canonical Undo master must be 512x512: {MASTER}")
    if image.getchannel("A").getextrema() == (255, 255):
        raise ValueError(f"Canonical Undo master must preserve transparency: {MASTER}")
    return image


def build_runtime() -> None:
    RUNTIME.mkdir(parents=True, exist_ok=True)
    master = load_master()
    for filename, size in VARIANTS.items():
        runtime = master if size == 512 else master.resize((size, size), Image.Resampling.LANCZOS)
        runtime.save(RUNTIME / filename, format="PNG", optimize=True, compress_level=9)


def make_preview() -> None:
    sheet = Image.new("RGBA", (1120, 650), (21, 55, 34, 255))
    draw = ImageDraw.Draw(sheet)
    title_font = ImageFont.load_default(size=22)
    label_font = ImageFont.load_default(size=17)
    draw.text((34, 24), "GREEN ROOM PACK - CANONICAL UNDO TOKEN V1", fill=(235, 238, 207, 255), font=title_font)
    draw.text((34, 59), "Ivory rim / forest-green face / one terracotta counter-clockwise arrow", fill=(171, 202, 158, 255), font=label_font)

    for index, (label, filename) in enumerate((
        ("FRONT 512", "undo-token-front-v1.png"),
        ("INLINE 192", "undo-token-inline-v1.png"),
    )):
        x = 25 + index * 545
        y = 112
        draw.rounded_rectangle((x, y, x + 520, y + 510), radius=28, fill=(47, 83, 53, 255), outline=(144, 176, 126, 255), width=2)
        image = Image.open(RUNTIME / filename).convert("RGBA")
        display = image.copy()
        display.thumbnail((420, 420), Image.Resampling.NEAREST if image.width <= 192 else Image.Resampling.LANCZOS)
        sheet.alpha_composite(display, (x + (520 - display.width) // 2, y + 26))
        draw.text((x + 24, y + 454), label, fill=(240, 224, 185, 255), font=label_font)
        draw.text((x + 24, y + 483), f"{image.width}x{image.height} RGBA runtime", fill=(169, 199, 153, 255), font=label_font)

    PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(PREVIEW, quality=95, subsampling=0)


def main() -> None:
    ensure_master()
    build_runtime()
    make_preview()
    for filename in VARIANTS:
        path = RUNTIME / filename
        with Image.open(path) as image:
            print(f"{path.relative_to(ROOT)} | {image.width}x{image.height} | {path.stat().st_size / 1024:.0f} KB | {image.mode}")
    print(PREVIEW.relative_to(ROOT))


if __name__ == "__main__":
    main()
