"""Generate the local visual comparison for Online Players room PNGs."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
THEMES = [
    ("dark", "Zelena"), ("light", "Svetlo zlato"), ("medium", "Trula višnja"),
    ("winter", "Plavi okean"), ("neon", "Neon Cyber"), ("amethyst", "Kraljevski ametist"),
    ("easter", "Vaskršnja"), ("desert", "Pustinjsko staklo"),
    ("moon", "Mesečev sjaj"), ("severna", "Severna maglina"),
]
ROLES = [("state", "Prazno stanje"), ("search", "Pretraga"), ("friend", "Prijatelj"),
         ("spectate", "Posmatraj"), ("duel", "Duel"), ("avatar", "Avatar")]
cards = []
for theme, name in THEMES:
    base = f"../www/assets/theme-packs/{theme}/canonical/online-players-internal"
    roles = "".join(
        f'<figure><span class="icon"><img src="{base}/{role}-v1.png?v=2" alt="{label}, {name}"></span>'
        f'<figcaption>{label}</figcaption></figure>' for role, label in ROLES
    )
    cards.append(
        f'<article id="{theme}"><h2>{name}</h2><div class="roles">{roles}</div>'
        f'<a class="capture" href="theme-online-players-qa-320x568/{theme}.png">'
        f'<img src="theme-online-players-qa-320x568/{theme}.png" alt="Online igrači, {name}, Android prikaz"></a>'
        f'<p class="variants"><a href="theme-online-players-qa-320x568-font130/{theme}.png">Uvećan tekst</a>'
        f'<a href="theme-online-players-qa-768x1024/{theme}.png">Širi ekran</a></p></article>'
    )
html = """<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Online igrači · novi PNG asseti i sobe</title><style>
*{box-sizing:border-box}body{margin:0;padding:24px;font:16px/1.4 system-ui,sans-serif;background:#edf1f3;color:#24323b}
main{max-width:1440px;margin:auto}h1{margin:0 0 5px}.lead{margin:0 0 24px;color:#52626b}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:18px}
article{padding:16px;background:white;border:1px solid #d7e0e4;border-radius:16px}
h2{margin:0 0 12px;font-size:19px}.roles{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}
figure{margin:0;display:flex;align-items:center;flex-direction:column;gap:5px;padding:8px;background:#f1f4f6;border-radius:11px}
.icon{width:88px;height:88px;display:grid;place-items:center}.icon img{width:100%;height:100%;object-fit:contain}
figcaption{font-size:12px;color:#4a5b64}.capture{display:block;margin:15px auto 0;max-width:240px}
.capture img{display:block;width:100%;height:auto;border-radius:8px;border:1px solid #d7e0e4}
.variants{display:flex;justify-content:center;gap:16px;margin:10px 0 0;font-size:14px}
</style></head><body><main><h1>Online igrači · 10 tema</h1>
<p class="lead">Šest novih PNG uloga po temi; ispod je Android prikaz iste sobe. Zelena je mera za raspored i dimenzije. Pretraga po imenu radi u svih deset tema. <a href="theme-online-players-rooms-review.png">Uporedi svih 10 soba odjednom</a>.</p>
<div class="grid">""" + "\n".join(cards) + "</div></main></body></html>\n"
output = ROOT / "docs/theme-online-players-room-review.html"
output.write_text(html, encoding="utf-8")
print(output)

sheet = Image.new("RGB", (1050, 1520), "#e6e9eb")
draw = ImageDraw.Draw(sheet)
font = ImageFont.load_default()
for row, (theme, name) in enumerate(THEMES):
    top = 34 + row * 148
    draw.text((12, top + 50), name, fill="#24323b", font=font)
    for column, (role, label) in enumerate(ROLES):
        x = 125 + column * 150
        png = Image.open(ROOT / f"www/assets/theme-packs/{theme}/canonical/online-players-internal/{role}-v1.png").convert("RGBA")
        preview = png.resize((106, 106), Image.Resampling.LANCZOS)
        sheet.paste(preview, (x + 20, top), preview)
        draw.text((x + 28, top + 111), label, fill="#34434b", font=font)
sheet.save(ROOT / "docs/theme-online-players-assets-review.png", optimize=True)

room_sheet = Image.new("RGB", (1300, 1172), "#e6e9eb")
room_draw = ImageDraw.Draw(room_sheet)
for index, (theme, name) in enumerate(THEMES):
    source = Image.open(ROOT / f"docs/theme-online-players-qa-320x568/{theme}.png").convert("RGB")
    capture = source.resize((260, 563), Image.Resampling.LANCZOS)
    x, y = (index % 5) * 260, (index // 5) * 586
    room_sheet.paste(capture, (x, y))
    room_draw.text((x + 8, y + 566), name, fill="#24323b", font=font)
room_sheet.save(ROOT / "docs/theme-online-players-rooms-review.png", optimize=True)
