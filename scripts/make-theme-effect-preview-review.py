"""Build contact sheets and a local visual review page for Treasury effect previews."""

from __future__ import annotations

import json
from html import escape
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
THEMES = [t for t in json.loads((ROOT / "docs/theme-definitions.json").read_text(encoding="utf-8"))["themes"] if t["id"] != "dark"]
ROLES = ("wedding", "thunder", "fireworks", "bubbles", "cosmic-dust", "dragon-fire",
         "royal-yamb", "fireflies", "ice-age", "black-hole", "supernova", "neon-pulse",
         "drones", "ufo-abduction")
LABELS = {"wedding": "Svadba", "thunder": "Grom", "fireworks": "Vatromet", "bubbles": "Mehurići",
          "cosmic-dust": "Kosmička prašina", "dragon-fire": "Zmajeva vatra", "royal-yamb": "Kraljevski Yamb",
          "fireflies": "Svitci", "ice-age": "Ledeno doba", "black-hole": "Crna rupa",
          "supernova": "Supernova", "neon-pulse": "Neon puls", "drones": "Dronovi", "ufo-abduction": "NLO"}
FONT_PATH = Path("C:/Windows/Fonts/arial.ttf")
FONT = ImageFont.truetype(str(FONT_PATH), 15) if FONT_PATH.exists() else ImageFont.load_default()


def main():
    cells = []
    for theme in THEMES:
        tid = theme["id"]
        sheet = Image.new("RGB", (4 * 285 + 30, 4 * 220 + 54), "#10151b")
        draw = ImageDraw.Draw(sheet)
        draw.text((24, 17), f"{theme['nameSr']} · 14 pregleda efekata Riznice", font=FONT, fill="#f5f1e8")
        for i, role in enumerate(ROLES):
            x, y = 15 + (i % 4) * 285, 50 + (i // 4) * 220
            draw.rounded_rectangle((x, y, x+270, y+197), radius=16, fill="#26323c")
            path = ROOT / f"www/assets/theme-packs/{tid}/canonical/treasury-effect-previews/preview-{role}-v1.png"
            icon = Image.open(path).convert("RGBA")
            icon.thumbnail((255, 166), Image.Resampling.LANCZOS)
            sheet.paste(icon, (x+(270-icon.width)//2, y+5), icon)
            draw.text((x+12, y+174), LABELS[role], font=FONT, fill="#f2f3f5")
            cells.append(f'<article><div class="image"><img loading="lazy" src="../www/assets/theme-packs/{tid}/canonical/treasury-effect-previews/preview-{role}-v1.png" alt=""></div><strong>{escape(LABELS[role])}</strong><small>{role}</small></article>')
        sheet.save(ROOT / f"docs/theme-effect-previews-{tid}-review.png", optimize=True)
    sections = []
    for i, theme in enumerate(THEMES):
        sections.append(f'<section id="{theme["id"]}"><h2>{escape(theme["nameSr"])}</h2><p>{escape(theme["style"])} · {escape(theme["direction"])}</p><div class="grid">{"".join(cells[i*14:(i+1)*14])}</div></section>')
    html = f'''<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pregledi efekata · 9 tema</title><style>
    *{{box-sizing:border-box}}body{{margin:0;background:#111822;color:#eef2f4;font:16px system-ui,Arial,sans-serif}}header{{padding:28px max(24px,calc((100vw - 1300px)/2));background:#1c2833}}h1{{margin:0 0 8px}}p{{color:#adbac5}}nav{{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px}}nav a{{color:#e6efef;text-decoration:none;background:#334451;padding:7px 11px;border-radius:999px}}main{{max-width:1300px;margin:auto;padding:20px}}section{{margin:14px 0 44px;scroll-margin-top:20px}}h2{{margin-bottom:0}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(235px,1fr));gap:15px}}article{{background:#25333e;border:1px solid #40515d;border-radius:18px;padding:10px;display:flex;flex-direction:column;gap:3px}}.image{{height:170px;display:flex;align-items:center;justify-content:center;background:#17232c;border-radius:11px}}img{{width:100%;height:100%;object-fit:contain}}small{{color:#9aabb6}}
    </style></head><body><header><h1>Pregledi efekata u Riznici</h1><p>14 zasebnih PNG ilustracija za svaku od devet tema · 384 × 256 · providna podloga</p><nav>{''.join(f'<a href="#{t["id"]}">{escape(t["nameSr"])}</a>' for t in THEMES)}<a href="theme-effect-previews-runtime-review.html">Prikaz u kartici</a></nav></header><main>{''.join(sections)}</main></body></html>'''
    (ROOT / "docs/theme-effect-previews-review.html").write_text(html, encoding="utf-8")
    print("Review page and 9 sheets generated")


if __name__ == "__main__":
    main()
