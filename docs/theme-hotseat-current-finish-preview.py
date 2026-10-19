"""Generate a code-based visual inventory of the current Hotseat finish screen."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "theme-hotseat-current-finish-preview.png"
FONT = Path("C:/Windows/Fonts/segoeui.ttf")
BOLD = Path("C:/Windows/Fonts/segoeuib.ttf")


def font(size, bold=False):
    return ImageFont.truetype(str(BOLD if bold else FONT), size)


def centered(draw, xy, value, fill, size, bold=False):
    draw.text(xy, value, font=font(size, bold), fill=fill, anchor="mm")


def preview(theme, x, y, canvas):
    w, h = 390, 844
    asset = ROOT / "www" / "assets"
    if theme == "green":
        background = asset / "green-clay-balkan-diorama-v4.png"
        surface, edge, ink, muted = (225, 241, 203, 240), (103, 143, 74, 255), (23, 51, 21), (61, 89, 51)
        button, button_ink = (116, 170, 75), (15, 39, 14)
        tag = "ZELENA · POBEDA"
    else:
        background = asset / "theme-backgrounds" / "neon-v4.png"
        surface, edge, ink, muted = (12, 19, 31, 244), (0, 215, 190, 255), (228, 250, 250), (164, 217, 224)
        button, button_ink = (13, 41, 50), (220, 255, 251)
        tag = "NEON CYBER · POBEDA"
    phone = ImageOps.fit(Image.open(background).convert("RGB"), (w, h), method=Image.Resampling.LANCZOS)
    shade = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shade)
    sd.rounded_rectangle((0, 0, w - 1, h - 1), radius=30, outline=(60, 65, 72, 255), width=3)
    sd.rectangle((0, 0, w, h), fill=(0, 0, 0, 70 if theme == "neon" else 25))
    phone = Image.alpha_composite(phone.convert("RGBA"), shade)
    d = ImageDraw.Draw(phone)
    centered(d, (w // 2, 51), "KRAJ IGRE", (245, 251, 239), 27, True)
    d.rounded_rectangle((17, 177, w - 17, 663), radius=24, fill=surface, outline=edge, width=2)
    centered(d, (w // 2, 219), "POBEDA!", ink, 30, True)
    centered(d, (w // 2, 259), "Pobedio si sa 497 poena.", muted, 17)
    d.rounded_rectangle((35, 291, w - 35, 460), radius=18, fill=(237, 248, 220, 235) if theme == "green" else (7, 26, 39, 242), outline=edge, width=2)
    if theme == "green":
        mark = Image.open(asset / "green-soft-clay" / "canonical" / "hotseat-winner" / "hotseat-winner-v1.png").convert("RGBA")
        mark.thumbnail((64, 64), Image.Resampling.LANCZOS)
        phone.alpha_composite(mark, ((w - mark.width) // 2, 302))
    centered(d, (w // 2, 390), "TVOJ REZULTAT", muted, 15, True)
    centered(d, (w // 2, 429), "497", ink, 38, True)
    d.rounded_rectangle((37, 487, w - 37, 544), radius=23, fill=button, outline=edge, width=2)
    centered(d, (w // 2, 515), "DUPLIRAJ NAGRADU", button_ink, 16, True)
    d.rounded_rectangle((37, 559, w - 37, 618), radius=23, fill=(192, 217, 175, 255) if theme == "green" else (18, 57, 67, 255), outline=edge, width=2)
    centered(d, (w // 2, 588), "Preuzmi i Izađi", ink, 17, True)
    canvas.alpha_composite(phone, (x, y))
    cd = ImageDraw.Draw(canvas)
    centered(cd, (x + w // 2, y + h + 25), tag, (36, 48, 57), 17, True)


def main():
    canvas = Image.new("RGBA", (840, 1000), (247, 249, 250, 255))
    d = ImageDraw.Draw(canvas)
    centered(d, (420, 34), "POSTOJEĆI HOTSEAT ZAVRŠNI EKRAN", (29, 42, 51), 24, True)
    centered(d, (420, 67), "Rekonstrukcija iz koda · primer pobede sa 497 poena", (84, 96, 103), 16)
    preview("green", 20, 92, canvas)
    preview("neon", 430, 92, canvas)
    centered(d, (420, 987), "Neon sada nema posebnu Hotseat oznaku pobednika.", (110, 59, 59), 15)
    canvas.convert("RGB").save(OUT, optimize=True)
    print(OUT)


if __name__ == "__main__":
    main()
