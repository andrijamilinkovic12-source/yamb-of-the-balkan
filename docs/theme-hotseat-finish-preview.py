"""Illustrative Hotseat finish composition using the active per-theme PNGs."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "www" / "assets"
OUTPUT = ROOT / "docs" / "theme-hotseat-finish-preview.png"
FONT = Path("C:/Windows/Fonts/segoeui.ttf")
BOLD = Path("C:/Windows/Fonts/segoeuib.ttf")


def typeface(size, bold=False):
    return ImageFont.truetype(str(BOLD if bold else FONT), size)


def text(draw, xy, value, fill, size, bold=False, anchor="mm"):
    draw.text(xy, value, fill=fill, font=typeface(size, bold), anchor=anchor)


def wrapped_comment(draw, value, fill):
    font = typeface(11, True)
    words, lines, line = value.split(), [], ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if line and draw.textlength(candidate, font=font) > 287:
            lines.append(line)
            line = word
        else:
            line = candidate
    if line:
        lines.append(line)
    for index, part in enumerate(lines):
        draw.text((195, 580 + index * 15), part, fill=fill, font=font, anchor="mm")


def image_at(canvas, path, box, muted=False):
    icon = Image.open(path).convert("RGBA")
    icon.thumbnail((box[2], box[3]), Image.Resampling.LANCZOS)
    if muted:
        gray = ImageOps.grayscale(icon).convert("RGBA")
        gray.putalpha(icon.getchannel("A").point(lambda value: round(value * .48)))
        icon = gray
    canvas.alpha_composite(icon, (box[0] + (box[2] - icon.width) // 2,
                                  box[1] + (box[3] - icon.height) // 2))


def theme_asset(theme, family, name):
    base = ASSETS / ("green-soft-clay" if theme == "green" else f"theme-packs/{theme}")
    return base / family / name


def draw_phone(theme, x, y, board):
    width, height = 390, 844
    green = theme == "green"
    background = ASSETS / ("green-clay-balkan-diorama-v4.png" if green else "theme-backgrounds/neon-v4.png")
    phone = ImageOps.fit(Image.open(background).convert("RGB"), (width, height), method=Image.Resampling.LANCZOS).convert("RGBA")
    shade = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    ImageDraw.Draw(shade).rectangle((0, 0, width, height), fill=(0, 0, 0, 25 if green else 65))
    phone = Image.alpha_composite(phone, shade)
    draw = ImageDraw.Draw(phone)
    outer = (224, 239, 204, 249) if green else (21, 36, 56, 249)
    inner = (238, 246, 222, 249) if green else (25, 51, 78, 249)
    inset = (206, 225, 188, 255) if green else (21, 43, 68, 255)
    ink = (32, 62, 29) if green else (237, 254, 250)
    muted = (64, 94, 57) if green else (183, 237, 228)
    edge = (96, 139, 71) if green else (86, 229, 210)
    action = (157, 196, 129) if green else (37, 87, 106)
    claim = (209, 229, 190) if green else (24, 52, 74)
    panel = theme_asset(theme, "canonical/solo-results", "record-panel-v2.png")
    score_icon = theme_asset(theme, "canonical/solo-results", "finish-score-mark-v1.png")
    claim_icon = theme_asset(theme, "canonical/solo-results", "finish-claim-v1.png")
    reward_icon = theme_asset(theme, "solo", "finish-reward-video-v3.png")
    ducat_icon = theme_asset(theme, "canonical/ducat", "ducat-inline-v1.png")
    power_icon = theme_asset(theme, "canonical/statistics-overview", "power-index-v1.png")
    if green:
        account, guest, account_score, guest_score = "Andrija", "Miloš", "1.875", "1.650"
        outcome, category = "POBEDA!", "LEP NAPREDAK"
        message = "Vidi se pomak. Nastavi ovako — 1.875 poena."
        active = {"weekly", "personal"}
        reward, double_reward, power = "2.250", "4.500", "+15"
    else:
        account, guest, account_score, guest_score = "Andrija", "Miloš", "2.110", "2.670"
        outcome, category = "PORAZ", "DOBRA PARTIJA"
        message = "Stabilna i dobra igra. Osvojio si 2.110 poena."
        active = set()
        reward, double_reward, power = "2.110", "4.220", "+8"

    text(draw, (width // 2, 55), "KRAJ IGRE", (248, 251, 244), 23, True)
    draw.rounded_rectangle((19, 124, 371, 762), radius=24, fill=outer, outline=edge, width=2)
    text(draw, (width // 2, 158), outcome, ink, 26, True)
    text(draw, (width // 2, 187), category, ink, 13, True)
    text(draw, (width // 2, 211), message, muted, 13)
    draw.rounded_rectangle((35, 235, 355, 622), radius=23, fill=inner, outline=edge, width=1)

    for index, (name, score, won) in enumerate(((account, account_score, green), (guest, guest_score, not green))):
        left = 44 + index * 153
        draw.rounded_rectangle((left, 245, left + 148, 296), radius=10, fill=inset, outline=edge if won else muted, width=2 if won else 1)
        text(draw, (left + 9, 255), "NALOG" if index == 0 else "GOST", muted, 9, True, "lm")
        text(draw, (left + 9, 271), name, ink, 12, True, "lm")
        text(draw, (left + 140, 271), score, ink, 13, True, "rm")
        if won:
            text(draw, (left + 9, 287), "POBEDNIK", ink, 9, True, "lm")

    panel_image = Image.open(panel).convert("RGBA").resize((306, 106), Image.Resampling.LANCZOS)
    phone.alpha_composite(panel_image, (42, 306))
    draw = ImageDraw.Draw(phone)
    text(draw, (55, 322), "REKORDI PARTIJE", ink, 10, True, "lm")
    for index, role in enumerate(("weekly", "monthly", "all_time", "personal")):
        cell_x = 55 + (index % 2) * 140
        cell_y = 334 + (index // 2) * 28
        draw.rounded_rectangle((cell_x, cell_y, cell_x + 132, cell_y + 26), radius=6,
                               outline=edge if role in active else muted, width=1)
        image_at(phone, theme_asset(theme, "canonical/solo-record-icons", f"{role}-v1.png"),
                 (cell_x + 53, cell_y + 1, 25, 24), muted=role not in active)
    draw = ImageDraw.Draw(phone)
    text(draw, (55, 397), "POTVRĐENO" if active else "BEZ NOVOG REKORDA", ink, 9, True, "lm")
    image_at(phone, power_icon, (246, 389, 17, 17))
    draw = ImageDraw.Draw(phone)
    text(draw, (266, 397), "POWER INDEX", ink, 7, True, "lm")
    text(draw, (338, 397), power, ink, 10, True, "rm")

    text(draw, (width // 2, 429), "TVOJ REZULTAT", muted, 11, True)
    image_at(phone, score_icon, (104, 443, 42, 42))
    draw = ImageDraw.Draw(phone)
    text(draw, (211, 464), account_score, ink, 32, True)
    for index in range(6):
        left = 99 + index * 33
        draw.rounded_rectangle((left, 491, left + 27, 496), radius=3,
                               fill=edge if index == (2 if green else 3) else inset)
    for index, (label, value) in enumerate((("NAJJAČA KOLONA", "↓  420" if green else "↑  515"), ("BEZ NULE", "NE" if green else "DA"))):
        left = 44 + index * 153
        draw.rounded_rectangle((left, 509, left + 148, 560), radius=13, fill=inset, outline=edge, width=1)
        text(draw, (left + 9, 523), label, muted, 9, True, "lm")
        text(draw, (left + 9, 544), value, ink, 15, True, "lm")

    wrapped_comment(draw,
                    "Andrija je napravio jasnu razliku; Miloš može da uzvrati." if green
                    else "Miloš je postavio visoku lestvicu; Andrija ima novi cilj.", ink)

    draw.rounded_rectangle((42, 638, 348, 684), radius=23, fill=action, outline=edge, width=1)
    image_at(phone, reward_icon, (58, 647, 26, 26))
    draw = ImageDraw.Draw(phone)
    text(draw, (190, 661), f"DUPLIRAJ: {double_reward}", ink, 14, True)
    image_at(phone, ducat_icon, (295, 650, 21, 21))
    draw.rounded_rectangle((42, 693, 348, 739), radius=23, fill=claim, outline=edge, width=1)
    image_at(phone, claim_icon, (59, 701, 29, 29))
    draw = ImageDraw.Draw(phone)
    text(draw, (213, 716), f"Preuzmi {reward} i izađi", ink, 13, True)
    board.alpha_composite(phone, (x, y))
    draw = ImageDraw.Draw(board)
    text(draw, (x + width // 2, y + height + 24),
         "ZELENA · NALOG POBEĐUJE" if green else "NEON CYBER · GOST POBEĐUJE",
         (36, 48, 57), 16, True)


def main():
    board = Image.new("RGBA", (840, 1000), (247, 249, 250, 255))
    draw = ImageDraw.Draw(board)
    text(draw, (420, 34), "HOTSEAT · NOVI ZAVRŠNI EKRAN", (29, 42, 51), 22, True)
    text(draw, (420, 67), "Ilustrativni pregled rasporeda sa postojećim PNG assetima tema", (84, 96, 103), 15)
    draw_phone("green", 20, 92, board)
    draw_phone("neon", 430, 92, board)
    board.convert("RGB").save(OUTPUT, optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
