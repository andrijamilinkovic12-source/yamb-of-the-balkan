"""Build the 20 individually rendered main-menu resume/new-game PNG plates."""

from __future__ import annotations

import hashlib
import html
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source-assets" / "theme-menu-resume-buttons-v1"
THEMES = ("dark", "light", "medium", "winter", "neon", "amethyst", "easter", "desert", "moon", "severna")
ROLES = ("resume", "new")
CANVAS = (512, 160)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def crop_plate(image: Image.Image) -> Image.Image:
    """Ignore isolated antialias flecks outside the generated button."""
    image = image.convert("RGBA")
    alpha = image.getchannel("A")
    width, height = image.size
    samples = alpha.load()
    rows = [sum(samples[x, y] >= 70 for x in range(0, width, 3)) for y in range(0, height, 2)]
    cols = [sum(samples[x, y] >= 70 for y in range(0, height, 3)) for x in range(0, width, 2)]
    row_min = max(4, int(width / 3 * .055))
    col_min = max(3, int(height / 3 * .08))
    valid_rows = [y * 2 for y, count in enumerate(rows) if count >= row_min]
    valid_cols = [x * 2 for x, count in enumerate(cols) if count >= col_min]
    if not valid_rows or not valid_cols:
        raise ValueError("No opaque button body found")
    left, right = max(0, min(valid_cols) - 10), min(width, max(valid_cols) + 12)
    top, bottom = max(0, min(valid_rows) - 10), min(height, max(valid_rows) + 12)
    return image.crop((left, top, right, bottom))


def build_plate(master: Path, output: Path) -> None:
    plate = crop_plate(Image.open(master))
    plate.thumbnail((CANVAS[0] - 8, CANVAS[1] - 8), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", CANVAS)
    canvas.alpha_composite(plate, ((CANVAS[0] - plate.width) // 2, (CANVAS[1] - plate.height) // 2))
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, optimize=True)


def review(entries: list[dict]) -> None:
    tile_w, tile_h = 550, 210
    board = Image.new("RGB", (tile_w * 2, tile_h * len(THEMES)), "#ece9e1")
    draw = ImageDraw.Draw(board)
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 20)
    except OSError:
        font = ImageFont.load_default()
    for i, item in enumerate(entries):
        col = i % 2
        row = i // 2
        x, y = col * tile_w, row * tile_h
        dark = item["theme"] in {"medium", "neon", "amethyst", "moon", "severna"}
        bg = "#26313b" if dark else "#d1c9b8"
        draw.rounded_rectangle((x + 12, y + 8, x + tile_w - 12, y + tile_h - 8), radius=18, fill=bg)
        path = ROOT / item["production"]
        plate = Image.open(path).convert("RGBA")
        board.paste(plate, (x + 19, y + 19), plate)
        color = "#f5f6f7" if dark else "#2b2927"
        draw.text((x + 18, y + 175), f'{item["theme"]} / {item["role"]}', fill=color, font=font)
    out = ROOT / "docs" / "theme-menu-resume-buttons-review.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    board.save(out, optimize=True)

    ink = {
        "dark": ("#fff8eb", "#fff8eb"), "light": ("#392817", "#392817"),
        "medium": ("#fff6f2", "#3a1424"), "winter": ("#173d5b", "#173d5b"),
        "neon": ("#eefefa", "#eefefa"), "amethyst": ("#fff5ef", "#2c183a"),
        "easter": ("#fff8ea", "#3f4a35"), "desert": ("#26170e", "#443027"),
        "moon": ("#f5f5f7", "#242630"), "severna": ("#f5fbff", "#0a2934"),
    }
    rows = []
    for theme in THEMES:
        files = {item["role"]: "../" + item["production"].replace("www/", "www/", 1) for item in entries if item["theme"] == theme}
        buttons = "".join(
            f'<div class="button" style="background-image:url(\'{html.escape(files[role])}\');color:{ink[theme][index]}">{label}</div>'
            for index, (role, label) in enumerate((("resume", "NASTAVI"), ("new", "NOVA IGRA")))
        )
        rows.append(f'<section><h2>{html.escape(theme)}</h2><div class="sample">{buttons}</div><div class="large">{buttons}</div></section>')
    page = """<!doctype html><html lang="sr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nastavi i Nova igra · 10 tema</title><style>
*{box-sizing:border-box}body{margin:0;padding:24px;background:#1c2630;color:#f3f5f7;font:14px Arial,sans-serif}
h1{margin:0 0 8px}p{color:#c7d5dc}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
section{border-radius:16px;padding:15px;background:#43505a}h2{font-size:16px;margin:0 0 12px;text-transform:capitalize}
.sample,.large{display:flex;align-items:center;gap:8px;margin-bottom:12px}.sample .button{width:144px;height:40px;font-size:12px}
.large .button{width:220px;height:68px;font-size:17px}.button{display:flex;align-items:center;justify-content:center;flex:none;
font-family:Montserrat,Arial,sans-serif;font-weight:900;letter-spacing:.7px;background-size:100% 100%;background-repeat:no-repeat}
@media(max-width:480px){.sample,.large{flex-wrap:wrap}}</style>
<h1>Nastavi / Nova igra</h1><p>Svih 10 tema · 20 zasebnih PNG podloga · gornji red prikazuje približnu veličinu u meniju.</p>
<main>""" + "\n".join(rows) + "</main></html>"
    (ROOT / "docs" / "theme-menu-resume-buttons-review.html").write_text(page, encoding="utf-8")


def main() -> None:
    items = []
    for theme in THEMES:
        for role in ROLES:
            master = SOURCE / "masters" / f"{theme}-{role}.png"
            base = ROOT / "www" / "assets" / ("green-soft-clay" if theme == "dark" else f"theme-packs/{theme}")
            target = base / "canonical" / "menu-resume-buttons" / f"{role}-v1.png"
            build_plate(master, target)
            items.append({
                "theme": theme,
                "role": role,
                "source": master.relative_to(ROOT).as_posix(),
                "sourceSha256": sha256(master),
                "production": target.relative_to(ROOT).as_posix(),
                "productionSha256": sha256(target),
                "size": list(CANVAS),
                "method": "individual built-in image generation, alpha trim and resize",
            })
    manifest = {"version": 1, "roles": list(ROLES), "themes": list(THEMES), "items": items}
    (SOURCE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    review(items)
    print(f"Built {len(items)} PNGs and docs/theme-menu-resume-buttons-review.html")


if __name__ == "__main__":
    main()
