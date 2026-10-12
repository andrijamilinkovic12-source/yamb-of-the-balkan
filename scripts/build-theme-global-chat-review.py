"""Build a current Global Chat PNG review without reusing stale Android captures."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
DEFINITIONS = json.loads((DOCS / "theme-definitions.json").read_text(encoding="utf-8"))
BY_ID = {theme["id"]: theme for theme in DEFINITIONS["themes"]}
THEMES = [
    ("dark", "Zelena · referenca"),
    ("light", "Svetlo zlato"),
    ("medium", "Trula višnja"),
    ("winter", "Plavi okean"),
    ("neon", "Neon Cyber"),
    ("amethyst", "Kraljevski ametist"),
    ("easter", "Vaskršnja"),
    ("desert", "Pustinjsko staklo"),
    ("moon", "Mesečev sjaj"),
    ("severna", "Severna maglina"),
]


def font(size: int) -> ImageFont.FreeTypeFont:
    path = Path("C:/Windows/Fonts/segoeui.ttf")
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def asset_paths(theme_id: str) -> tuple[str, str]:
    if theme_id == "dark":
        return ("www/assets/green-soft-clay/global-chat-empty-v1.png",
                "www/assets/green-soft-clay/global-chat-send-v1.png")
    prefix = f"www/assets/theme-packs/{theme_id}/canonical/global-chat-internal"
    return (f"{prefix}/empty-state-v1.png", f"{prefix}/send-v1.png")


def color(theme_id: str, role: str) -> str:
    if theme_id == "dark":
        return {"surface": "#355B3D", "raised": "#62805B", "heading": "#F5F8EC"}[role]
    return BY_ID[theme_id]["paletteHex"][role]


def centered_icon(canvas: Image.Image, file: Path, box: tuple[int, int, int, int]) -> None:
    icon = Image.open(file).convert("RGBA")
    left, top, right, bottom = box
    size = min(right - left, bottom - top)
    icon = icon.resize((size, size), Image.Resampling.LANCZOS)
    canvas.alpha_composite(icon, (left + (right - left - size) // 2, top + (bottom - top - size) // 2))


scale = 3
tile_w, tile_h = 260 * scale, 206 * scale
gap, pad, top = 14 * scale, 20 * scale, 72 * scale
sheet = Image.new("RGBA", (pad * 2 + tile_w * 5 + gap * 4, top + tile_h * 2 + gap + pad), "#EFF1F2")
draw = ImageDraw.Draw(sheet)
draw.text((pad, 13 * scale), "GLOBAL CHAT · ORIGINALNI PNG ZA 9 TEMA", font=font(24 * scale), fill="#243343")
draw.text((pad, 43 * scale), "Levo: prazno / učitavanje 76 px   ·   Desno: slanje 32 px   ·   Zelena je referenca", font=font(13 * scale), fill="#546575")

cards = []
for index, (theme_id, title) in enumerate(THEMES):
    column, row = index % 5, index // 5
    x, y = pad + column * (tile_w + gap), top + row * (tile_h + gap)
    draw.rounded_rectangle((x, y, x + tile_w, y + tile_h), radius=13 * scale, fill="#FFFFFF", outline="#D0D8DC", width=scale)
    draw.text((x + 12 * scale, y + 9 * scale), title, font=font(16 * scale), fill="#273A4A")
    panel = (x + 12 * scale, y + 40 * scale, x + tile_w - 12 * scale, y + tile_h - 12 * scale)
    draw.rounded_rectangle(panel, radius=10 * scale, fill=color(theme_id, "surface"))
    empty_file, send_file = asset_paths(theme_id)
    empty_center = (x + 75 * scale, y + 112 * scale)
    send_center = (x + 193 * scale, y + 113 * scale)
    draw.rounded_rectangle((empty_center[0] - 52 * scale, empty_center[1] - 50 * scale,
                            empty_center[0] + 52 * scale, empty_center[1] + 52 * scale),
                           radius=14 * scale, fill=color(theme_id, "raised"))
    draw.ellipse((send_center[0] - 24 * scale, send_center[1] - 24 * scale,
                  send_center[0] + 24 * scale, send_center[1] + 24 * scale), fill=color(theme_id, "raised"))
    centered_icon(sheet, ROOT / empty_file,
                  (empty_center[0] - 38 * scale, empty_center[1] - 38 * scale,
                   empty_center[0] + 38 * scale, empty_center[1] + 38 * scale))
    centered_icon(sheet, ROOT / send_file,
                  (send_center[0] - 16 * scale, send_center[1] - 16 * scale,
                   send_center[0] + 16 * scale, send_center[1] + 16 * scale))
    label_fill = color(theme_id, "heading")
    draw.text((empty_center[0] - 38 * scale, y + 169 * scale), "76 px", font=font(11 * scale), fill=label_fill)
    draw.text((send_center[0] - 18 * scale, y + 169 * scale), "32 px", font=font(11 * scale), fill=label_fill)
    empty_url = "../" + empty_file + "?v=2"
    send_url = "../" + send_file + "?v=2"
    cards.append(f'''<article id="{theme_id}" style="--surface:{color(theme_id, 'surface')};--raised:{color(theme_id, 'raised')}">
      <h2>{title}</h2><div class="samples"><figure><div class="empty"><img src="{empty_url}" alt="Prazno stanje"></div><figcaption>Prazno / učitavanje · 76 px</figcaption></figure>
      <figure><div class="send"><img src="{send_url}" alt="Slanje"></div><figcaption>Slanje · 32 px</figcaption></figure></div>
      <details><summary>Android · prazno stanje</summary><a href="theme-global-chat-qa/{theme_id}.png"><img class="capture" src="theme-global-chat-qa/{theme_id}.png" alt="Global Chat, {title}, prazno stanje"></a></details>
      <details><summary>Android · poruke</summary><a href="theme-global-chat-layout-qa/{theme_id}-messages.png"><img class="capture" src="theme-global-chat-layout-qa/{theme_id}-messages.png" alt="Global Chat, {title}, poruke"></a></details>
      </article>''')

sheet.convert("RGB").save(DOCS / "theme-global-chat-room-review.png", optimize=True)

phone_w, phone_h = 260, 612
phone_gap, phone_pad, phone_top = 18, 24, 78
phone_sheet = Image.new("RGB", (phone_pad * 2 + phone_w * 5 + phone_gap * 4,
                                phone_top + phone_h * 2 + phone_gap + phone_pad), "#F2F1ED")
phone_draw = ImageDraw.Draw(phone_sheet)
phone_draw.text((phone_pad, 20), "GLOBAL CHAT · ANDROID QA, 10 TEMA", font=font(27), fill="#263444")
phone_draw.text((phone_pad, 52), "Svi tematski PNG su osveženi · Green geometrija · stvarni qaLocal prikaz", font=font(13), fill="#596879")
for index, (theme_id, title) in enumerate(THEMES):
    column, row = index % 5, index // 5
    x = phone_pad + column * (phone_w + phone_gap)
    y = phone_top + row * (phone_h + phone_gap)
    phone_draw.rounded_rectangle((x, y, x + phone_w, y + phone_h), radius=12, fill="#FFFFFF", outline="#D6D9DC")
    phone_draw.text((x + 10, y + 9), title, font=font(16), fill="#243343")
    screenshot = Image.open(DOCS / "theme-global-chat-qa" / f"{theme_id}.png").convert("RGB")
    screenshot.thumbnail((phone_w - 14, phone_h - 46), Image.Resampling.LANCZOS)
    phone_sheet.paste(screenshot, (x + (phone_w - screenshot.width) // 2, y + 38))
phone_sheet.save(DOCS / "theme-global-chat-android-review.png", optimize=True)

message_sheet = Image.new("RGB", phone_sheet.size, "#F2F1ED")
message_draw = ImageDraw.Draw(message_sheet)
message_draw.text((phone_pad, 20), "GLOBAL CHAT · PORUKE, 10 TEMA", font=font(27), fill="#263444")
message_draw.text((phone_pad, 52), "Isti raspored kao Green · kontrast teksta najmanje 4,5:1", font=font(13), fill="#596879")
for index, (theme_id, title) in enumerate(THEMES):
    column, row = index % 5, index // 5
    x = phone_pad + column * (phone_w + phone_gap)
    y = phone_top + row * (phone_h + phone_gap)
    message_draw.rounded_rectangle((x, y, x + phone_w, y + phone_h), radius=12, fill="#FFFFFF", outline="#D6D9DC")
    message_draw.text((x + 10, y + 9), title, font=font(16), fill="#243343")
    screenshot = Image.open(DOCS / "theme-global-chat-layout-qa" / f"{theme_id}-messages.png").convert("RGB")
    screenshot.thumbnail((phone_w - 14, phone_h - 46), Image.Resampling.LANCZOS)
    message_sheet.paste(screenshot, (x + (phone_w - screenshot.width) // 2, y + 38))
message_sheet.save(DOCS / "theme-global-chat-messages-review.png", optimize=True)

html = '''<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Global Chat · novi PNG asseti</title><style>
*{box-sizing:border-box}body{margin:0;padding:24px;font:16px/1.4 system-ui,sans-serif;color:#203040;background:#eef1f2}
main{max-width:1240px;margin:auto}h1{margin:0 0 4px}.note{margin:0 0 24px;color:#526474}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px}
article{background:#fff;border:1px solid #d4dde2;border-radius:16px;padding:16px}h2{font-size:18px;margin:0 0 12px}
.samples{display:flex;align-items:stretch;gap:14px;background:var(--surface);border-radius:12px;padding:14px}
figure{margin:0;flex:1;display:flex;align-items:center;flex-direction:column;justify-content:center;min-height:138px}
.empty,.send{display:grid;place-items:center;background:var(--raised);overflow:hidden}.empty{width:104px;height:104px;border-radius:14px}.send{width:48px;height:48px;border-radius:50%}
.empty img{width:76px;height:76px;object-fit:contain}.send img{width:32px;height:32px;object-fit:contain}
figcaption{margin-top:9px;color:#273a4a;background:#ffffffd9;border-radius:5px;padding:2px 5px;text-align:center;font-size:12px}
details{margin-top:12px}summary{cursor:pointer;color:#415465}.capture{display:block;width:220px;max-width:100%;height:auto;margin:12px auto 0;border-radius:7px}
</style></head><body><main><h1>Global Chat · tematski PNG</h1>
<p class="note">Svih 18 unutrašnjih ikonica za devet tema sada su posebno izrađene ilustracije. Zelena je referenca. Asseti su prikazani u stvarnoj CSS veličini. Za svaku temu dostupni su Android snimci prazne sobe i razgovora. <a href="theme-global-chat-messages-review.png">Uporedi svih deset razgovora</a>.</p>
<div class="grid">''' + "\n".join(cards) + '''</div></main></body></html>'''
(DOCS / "theme-global-chat-room-review.html").write_text(html, encoding="utf-8")
print(DOCS / "theme-global-chat-room-review.png")
