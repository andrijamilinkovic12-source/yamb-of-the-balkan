"""Illustrative two-phone Online Random finish using the canonical Neon PNGs."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ASSET = ROOT / "www" / "assets" / "theme-packs" / "neon"
OUTPUT = ROOT / "docs" / "theme-online-random-finish-preview.png"
FONT = Path("C:/Windows/Fonts/segoeui.ttf")
BOLD = Path("C:/Windows/Fonts/segoeuib.ttf")


def font(size, bold=False):
    return ImageFont.truetype(str(BOLD if bold else FONT), size)


def label(draw, position, value, color, size, bold=False, anchor="mm"):
    draw.text(position, value, fill=color, font=font(size, bold), anchor=anchor)


def png(canvas, path, box, muted=False):
    image = Image.open(path).convert("RGBA")
    image.thumbnail((box[2], box[3]), Image.Resampling.LANCZOS)
    if muted:
        alpha = image.getchannel("A").point(lambda value: round(value * .5))
        image = ImageOps.grayscale(image).convert("RGBA")
        image.putalpha(alpha)
    canvas.alpha_composite(image, (box[0] + (box[2] - image.width) // 2,
                                   box[1] + (box[3] - image.height) // 2))


def draw_result(board, x, y, winner):
    width, height = 390, 844
    background = ROOT / "www" / "assets" / "theme-backgrounds" / "neon-v4.png"
    phone = ImageOps.fit(Image.open(background).convert("RGB"), (width, height),
                         method=Image.Resampling.LANCZOS).convert("RGBA")
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    ImageDraw.Draw(overlay).rectangle((0, 0, width, height), fill=(0, 0, 0, 65))
    phone = Image.alpha_composite(phone, overlay)
    draw = ImageDraw.Draw(phone)
    outer, inner, inset = (21, 36, 56, 249), (25, 51, 78, 249), (21, 43, 68, 255)
    ink, muted, edge = (237, 254, 250), (183, 237, 228), (86, 229, 210)
    owner = "Andrija" if winner else "Miloš"
    opponent = "Miloš" if winner else "Andrija"
    owner_score = "1.875" if winner else "1.650"
    opponent_score = "1.650" if winner else "1.875"
    base, doubled, power = ("2.250", "4.500", "+15") if winner else ("1.650", "3.300", "-8")
    achieved = {"personal", "weekly"} if winner else set()

    label(draw, (195, 42), "KRAJ IGRE", ink, 22, True)
    draw.rounded_rectangle((19, 95, 371, 802), radius=24, fill=outer, outline=edge, width=2)
    label(draw, (195, 126), "POBEDA!" if winner else "PORAZ", ink, 25, True)
    label(draw, (195, 153), "LEP NAPREDAK" if winner else "SOLIDNA PARTIJA", ink, 12, True)
    label(draw, (195, 178), "Vidi se pomak. Nastavi ovako — 1.875 poena." if winner
          else "Dobra borba. Osvojio si 1.650 poena.", muted, 11)
    draw.rounded_rectangle((35, 198, 355, 604), radius=23, fill=inner, outline=edge, width=1)

    for index, (name, score, won) in enumerate(((owner, owner_score, winner), (opponent, opponent_score, not winner))):
        left = 44 + index * 153
        draw.rounded_rectangle((left, 210, left + 148, 261), radius=10,
                               fill=inset, outline=edge if won else muted, width=2 if won else 1)
        label(draw, (left + 9, 221), "TI" if index == 0 else "PROTIVNIK", muted, 9, True, "lm")
        label(draw, (left + 9, 237), name, ink, 12, True, "lm")
        label(draw, (left + 140, 237), score, ink, 13, True, "rm")
        if won:
            label(draw, (left + 9, 253), "POBEDNIK", ink, 9, True, "lm")

    panel = Image.open(ASSET / "canonical" / "solo-results" / "record-panel-v2.png").convert("RGBA")
    phone.alpha_composite(panel.resize((306, 108), Image.Resampling.LANCZOS), (42, 272))
    draw = ImageDraw.Draw(phone)
    label(draw, (55, 287), "REKORDI PARTIJE", ink, 10, True, "lm")
    for index, role in enumerate(("weekly", "monthly", "all_time", "personal")):
        cell_x = 55 + index % 2 * 140
        cell_y = 299 + index // 2 * 28
        draw.rounded_rectangle((cell_x, cell_y, cell_x + 132, cell_y + 26), radius=6,
                               outline=edge if role in achieved else muted, width=1)
        png(phone, ASSET / "canonical" / "solo-record-icons" / f"{role}-v1.png",
            (cell_x + 53, cell_y + 1, 25, 24), muted=role not in achieved)
    draw = ImageDraw.Draw(phone)
    label(draw, (55, 367), "POTVRĐENO" if achieved else "BEZ NOVOG REKORDA", ink, 9, True, "lm")
    png(phone, ASSET / "canonical" / "statistics-overview" / "power-index-v1.png", (246, 358, 17, 17))
    draw = ImageDraw.Draw(phone)
    label(draw, (266, 367), "POWER INDEX", ink, 7, True, "lm")
    label(draw, (338, 367), power, ink, 10, True, "rm")

    label(draw, (195, 396), "TVOJ REZULTAT", muted, 11, True)
    png(phone, ASSET / "canonical" / "solo-results" / "finish-score-mark-v1.png", (104, 407, 42, 42))
    draw = ImageDraw.Draw(phone)
    label(draw, (211, 428), owner_score, ink, 31, True)
    for index in range(6):
        left = 99 + index * 33
        draw.rounded_rectangle((left, 457, left + 27, 462), radius=3,
                               fill=edge if index == 2 else inset)
    for index, (name, value) in enumerate((("NAJJAČA KOLONA", "↓ 420" if winner else "↑ 380"),
                                          ("BEZ NULE", "NE" if winner else "DA"))):
        left = 44 + index * 153
        draw.rounded_rectangle((left, 473, left + 148, 524), radius=13, fill=inset, outline=edge, width=1)
        label(draw, (left + 9, 487), name, muted, 9, True, "lm")
        label(draw, (left + 9, 508), value, ink, 15, True, "lm")
    label(draw, (195, 549), "Andrija je napravio razliku; Miloš može da uzvrati.", ink, 10, True)

    draw.rounded_rectangle((42, 614, 348, 660), radius=23, fill=(37, 87, 106), outline=edge, width=1)
    png(phone, ASSET / "solo" / "finish-reward-video-v3.png", (58, 624, 26, 26))
    draw = ImageDraw.Draw(phone)
    label(draw, (190, 637), f"DUPLIRAJ: {doubled}", ink, 13, True)
    png(phone, ASSET / "canonical" / "ducat" / "ducat-inline-v1.png", (292, 625, 21, 21))
    draw = ImageDraw.Draw(phone)
    draw.rounded_rectangle((42, 669, 348, 715), radius=23, fill=(24, 52, 74), outline=edge, width=1)
    png(phone, ASSET / "canonical" / "solo-results" / "finish-claim-v1.png", (59, 677, 29, 29))
    draw = ImageDraw.Draw(phone)
    label(draw, (213, 692), f"Preuzmi {base} i izađi", ink, 13, True)

    button = Image.open(ASSET / "canonical" / "online-random-rematch" / "rematch-button-v1.png").convert("RGBA")
    phone.alpha_composite(button.resize((306, 46), Image.Resampling.LANCZOS), (42, 724))
    png(phone, ASSET / "canonical" / "online-random-rematch" / "rematch-icon-v1.png", (143, 732, 29, 29))
    draw = ImageDraw.Draw(phone)
    label(draw, (212, 747), "REVANŠ", ink, 14, True)

    board.alpha_composite(phone, (x, y))
    label(ImageDraw.Draw(board), (x + 195, y + 866),
          "ANDRIJIN TELEFON · POBEDA" if winner else "MILOŠEV TELEFON · PORAZ",
          (36, 48, 57), 15, True)


def main():
    board = Image.new("RGBA", (840, 1010), (247, 249, 250, 255))
    draw = ImageDraw.Draw(board)
    label(draw, (420, 32), "ONLINE RANDOM · ZAVRŠNI EKRAN", (29, 42, 51), 22, True)
    label(draw, (420, 66), "Ilustrativni primer jednog meča u Neon Cyber temi", (84, 96, 103), 15)
    draw_result(board, 20, 92, True)
    draw_result(board, 430, 92, False)
    board.convert("RGB").save(OUTPUT, optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
