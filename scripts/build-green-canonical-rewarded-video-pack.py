from hashlib import sha256
from pathlib import Path
from shutil import copy2

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
LEGACY_SOURCE = ROOT / "source-assets" / "green-soft-clay-hires" / "economy"
SOURCE = ROOT / "source-assets" / "green-soft-clay-canonical" / "rewarded-video"
RUNTIME = ROOT / "www" / "assets" / "green-soft-clay" / "canonical" / "rewarded-video"
PREVIEW = ROOT / "docs" / "green-canonical-rewarded-video-pack-v1.png"

MASTERS = {
    "green-rewarded-video-active-master-v1.png": "rewarded-video-v1.png",
    "green-rewarded-video-unavailable-master-v1.png": "ad-unavailable-v1.png",
}

VARIANTS = {
    "rewarded-video-active-v1.png": ("green-rewarded-video-active-master-v1.png", 256),
    "rewarded-video-active-inline-v1.png": ("green-rewarded-video-active-master-v1.png", 128),
    "rewarded-video-unavailable-v1.png": ("green-rewarded-video-unavailable-master-v1.png", 256),
    "rewarded-video-unavailable-inline-v1.png": ("green-rewarded-video-unavailable-master-v1.png", 128),
}


def digest(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


def ensure_masters() -> None:
    SOURCE.mkdir(parents=True, exist_ok=True)
    for master_name, legacy_name in MASTERS.items():
        original = LEGACY_SOURCE / legacy_name
        master = SOURCE / master_name
        if master.exists():
            if digest(master) != digest(original):
                raise ValueError(f"Canonical Rewarded Video master differs from approved source: {master}")
            continue
        copy2(original, master)


def load_master(name: str) -> Image.Image:
    path = SOURCE / name
    image = Image.open(path).convert("RGBA")
    if image.size != (512, 512):
        raise ValueError(f"Canonical Rewarded Video master must be 512x512: {path}")
    if image.getchannel("A").getextrema() == (255, 255):
        raise ValueError(f"Canonical Rewarded Video master must preserve transparency: {path}")
    return image


def build_runtime() -> None:
    RUNTIME.mkdir(parents=True, exist_ok=True)
    for output_name, (master_name, size) in VARIANTS.items():
        runtime = load_master(master_name).resize((size, size), Image.Resampling.LANCZOS)
        runtime.save(RUNTIME / output_name, format="PNG", optimize=True, compress_level=9)


def make_preview() -> None:
    cards = [
        ("ACTIVE 256", "rewarded-video-active-v1.png"),
        ("ACTIVE INLINE 128", "rewarded-video-active-inline-v1.png"),
        ("UNAVAILABLE 256", "rewarded-video-unavailable-v1.png"),
        ("UNAVAILABLE INLINE 128", "rewarded-video-unavailable-inline-v1.png"),
    ]
    sheet = Image.new("RGBA", (1120, 1160), (21, 55, 34, 255))
    draw = ImageDraw.Draw(sheet)
    title_font = ImageFont.load_default(size=22)
    label_font = ImageFont.load_default(size=17)
    draw.text((34, 24), "GREEN ROOM PACK - CANONICAL REWARDED VIDEO V1", fill=(235, 238, 207, 255), font=title_font)
    draw.text((34, 59), "One video-ticket identity with active and unavailable states", fill=(171, 202, 158, 255), font=label_font)

    for index, (label, filename) in enumerate(cards):
        column = index % 2
        row = index // 2
        x = 25 + column * 545
        y = 112 + row * 520
        draw.rounded_rectangle((x, y, x + 520, y + 490), radius=28, fill=(47, 83, 53, 255), outline=(144, 176, 126, 255), width=2)
        image = Image.open(RUNTIME / filename).convert("RGBA")
        display = image.copy()
        display.thumbnail((390, 390), Image.Resampling.NEAREST if image.width <= 128 else Image.Resampling.LANCZOS)
        sheet.alpha_composite(display, (x + (520 - display.width) // 2, y + 22))
        draw.text((x + 24, y + 428), label, fill=(240, 224, 185, 255), font=label_font)
        draw.text((x + 24, y + 457), f"{image.width}x{image.height} RGBA runtime", fill=(169, 199, 153, 255), font=label_font)

    PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(PREVIEW, quality=95, subsampling=0)


def main() -> None:
    ensure_masters()
    build_runtime()
    make_preview()
    for filename in VARIANTS:
        path = RUNTIME / filename
        with Image.open(path) as image:
            print(f"{path.relative_to(ROOT)} | {image.width}x{image.height} | {path.stat().st_size / 1024:.0f} KB | {image.mode}")
    print(PREVIEW.relative_to(ROOT))


if __name__ == "__main__":
    main()
