from pathlib import Path
import hashlib
import math
import textwrap

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "www/assets/green-soft-clay"
OUTPUT = ROOT / "docs/green-asset-standardization-rules-page-illustrations-audit.png"

PANELS = (
    ("A  Rules & scoring", "canonical/rules-page-illustrations/rules-scoring-v1.png", 188200, "58d0c32e0cd9c8a92e97a95b6ccb4468df19adde7901ef2052e42a45a3ea00ca", "Yamb sheet + checks; SR/EN page 1", "canonical"),
    ("B  Stats & leaderboards", "canonical/rules-page-illustrations/stats-leaderboards-v1.png", 174369, "41b88e864d1933b43ba9081c5ebba6d6844e23afc3fba71f5cac45ecb6969b7a", "rising bars + crown; SR/EN page 2", "canonical"),
    ("C  Multiplayer & competitions", "canonical/rules-page-illustrations/multiplayer-competitions-v1.png", 200700, "f81a8d9d50d51650db7f0d0b8ce6212c351d7c0b8e7e7157015699a569931d33", "two players, die + trophy; SR/EN page 3", "canonical"),
    ("D  Account, privacy & server", "canonical/rules-page-illustrations/account-server-v1.png", 240872, "a1092f5af79c8a73982147c78713de0e0fe7b92cfe0bdf7557babb9ba6cfab7a", "account, shield + server; SR/EN page 6", "canonical"),
    ("X1  Communication", "rules/pages/communication-v1.png", 175405, "50ed1ec25dbf9c1de01059ad2d4c15cf5ec230b69c29c370a2ba7e0c901ae05d", "PROTECTED: shared chat page scene", "protected"),
    ("X2  Ducats & Treasury", "rules/pages/economy-treasury-v3.png", 303396, "495fe82e49141fb40dcb195c6f1f2c7d0000511d9ea38a6753e61d3db85eb330", "LOCKED: canonical ducats + Undo", "protected"),
    ("X3  Rules room entry", "canonical/rules-room-identity/rules-room-v1.png", 175314, "48527b7eb726778604fc25ba437d0d350a3ab97708c7c4d3dd8ad19c537a8ae4", "LOCKED: room identity, not a page", "room"),
)


def checker(size: tuple[int, int]) -> Image.Image:
    result = Image.new("RGBA", size)
    draw = ImageDraw.Draw(result)
    colors = ((63, 90, 67, 255), (49, 75, 56, 255))
    for y in range(0, size[1], 14):
        for x in range(0, size[0], 14):
            draw.rectangle((x, y, x + 13, y + 13), fill=colors[(x // 14 + y // 14) % 2])
    return result


def verified_image(relative: str, byte_count: int, digest: str) -> Image.Image:
    path = RUNTIME / relative
    if path.stat().st_size != byte_count or hashlib.sha256(path.read_bytes()).hexdigest() != digest:
        raise ValueError(f"Green Rules page bytes or SHA-256 differ: {path}")
    with Image.open(path) as opened:
        if opened.size != (512, 512) or opened.mode != "RGBA":
            raise ValueError(f"Green Rules page dimensions or color mode differ: {path}")
        image = opened.copy()
    if image.getchannel("A").getextrema() != (0, 255):
        raise ValueError(f"Green Rules page alpha range differs: {path}")
    if any(image.getpixel(point)[3] != 0 for point in ((0, 0), (511, 0), (0, 511), (511, 511))):
        raise ValueError(f"Green Rules page corner is not transparent: {path}")
    return image


def main() -> None:
    width, panel_height, header_height = 1480, 424, 126
    rows = math.ceil(len(PANELS) / 4)
    sheet = Image.new("RGBA", (width, header_height + rows * panel_height), (21, 51, 32, 255))
    draw = ImageDraw.Draw(sheet)
    title_font = ImageFont.load_default(size=21)
    font = ImageFont.load_default(size=15)
    small_font = ImageFont.load_default(size=12)
    draw.text((30, 24), "GREEN ASSET STANDARDIZATION - RULES PAGE ILLUSTRATIONS", fill=(232, 240, 207, 255), font=title_font)
    draw.text((30, 65), "Four canonical page scenes; two protected scenes; separate room identity", fill=(172, 204, 161, 255), font=font)
    draw.text((30, 91), "Static 512 px PNG audit with actual 38 px title-icon probes", fill=(143, 178, 137, 255), font=small_font)

    for index, (label, relative, byte_count, digest, description, role) in enumerate(PANELS):
        image = verified_image(relative, byte_count, digest)
        x = (index % 4) * 370
        y = header_height + (index // 4) * panel_height
        panel = checker((352, 288))
        preview = image.copy()
        preview.thumbnail((250, 250), Image.Resampling.LANCZOS)
        panel.alpha_composite(preview, ((352 - preview.width) // 2 - 16, (288 - preview.height) // 2))
        actual = image.resize((38, 38), Image.Resampling.LANCZOS)
        panel.alpha_composite(actual, (298, 30))
        ImageDraw.Draw(panel).text((299, 71), "38px", fill=(230, 237, 204, 255), font=small_font)
        sheet.alpha_composite(panel, (x + 9, y + 6))
        color = (128, 165, 116, 255) if role == "canonical" else (201, 147, 90, 255)
        draw.rectangle((x + 9, y + 6, x + 360, y + 293), outline=color, width=2)
        draw.text((x + 16, y + 304), label, fill=(239, 231, 194, 255), font=font)
        draw.text((x + 16, y + 331), description, fill=(185, 211, 172, 255), font=small_font)
        meta = f"{relative} | 512x512 | {byte_count} B | {role}"
        draw.multiline_text((x + 16, y + 355), "\n".join(textwrap.wrap(meta, width=46)), fill=(143, 178, 137, 255), font=small_font, spacing=2)
        print(f"{relative}: 512x512 RGBA, {byte_count} B, {digest}, {role}")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(OUTPUT, optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
