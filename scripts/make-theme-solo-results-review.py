"""Create a compact visual review of the Solo result PNG family."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
THEMES = (
    ("dark", "Zelena", "#36533a"),
    ("light", "Svetlo zlato", "#e4c99f"),
    ("medium", "Trula visnja", "#502731"),
    ("winter", "Plavi okean", "#173e64"),
    ("neon", "Neon cyber", "#13243e"),
    ("amethyst", "Kraljevski ametist", "#473356"),
    ("easter", "Vaskrsnja", "#e1e4d2"),
    ("desert", "Pustinjsko staklo", "#e4bb99"),
    ("moon", "Mesecev sjaj", "#343945"),
    ("severna", "Severna maglina", "#1e3b53"),
)
ROLES = (("personal-best", "Licni rekord", 30), ("finish-score-mark", "Konacni rezultat", 42), ("finish-claim", "Preuzmi nagradu", 29))
FONT = ImageFont.load_default()


def asset(theme: str, role: str) -> Path:
    if theme == "dark":
        return ROOT / "www/assets/green-soft-clay/canonical/solo-results" / f"{role}-v1.png"
    return ROOT / "www/assets/theme-packs" / theme / "canonical/solo-results" / f"{role}-v1.png"


def main() -> None:
    cell_w, cell_h = 225, 180
    left, top = 195, 68
    page = Image.new("RGB", (left + cell_w * 3 + 20, top + cell_h * len(THEMES) + 20), "#111722")
    draw = ImageDraw.Draw(page)
    draw.text((18, 16), "SOLO RESULTS / 10 THEMES / 3 ROLES", fill="white", font=FONT)
    for column, (_, label, native) in enumerate(ROLES):
        draw.text((left + column * cell_w + 12, 48), f"{label} / {native}px", fill="#e1e8ef", font=FONT)
    for row, (theme, name, background) in enumerate(THEMES):
        y = top + row * cell_h
        draw.text((18, y + 16), name, fill="white", font=FONT)
        for column, (role, _, native) in enumerate(ROLES):
            x = left + column * cell_w
            draw.rounded_rectangle((x + 3, y + 3, x + cell_w - 7, y + cell_h - 7), 15, fill=background, outline="#667788", width=1)
            with Image.open(asset(theme, role)) as opened:
                icon = opened.convert("RGBA")
                large = icon.resize((112, 112), Image.Resampling.LANCZOS)
                small = icon.resize((native, native), Image.Resampling.LANCZOS)
                page.paste(large, (x + 52, y + 14), large)
                page.paste(small, (x + (cell_w - native) // 2, y + 132), small)
    output = ROOT / "docs/theme-solo-results-review.png"
    page.save(output, optimize=True)
    print(output)


if __name__ == "__main__":
    main()
