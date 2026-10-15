"""Contact sheet for checking the nine Settings PNG packs at use size."""
from pathlib import Path
import json
from html import escape
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
themes = ('dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna')
roles = ('profile','display-theme','language','terms','privacy')
panel_w, row_h, col_w = 1060, 76, 178
sheet = Image.new('RGB', (panel_w, 76 * (len(themes) + 1)), '#e8e8e8')
d = ImageDraw.Draw(sheet)
font = ImageFont.truetype('arial.ttf', 17)
small = ImageFont.truetype('arial.ttf', 13)
for col, role in enumerate(roles):
    d.text((col_w + col * col_w + 7, 24), role, fill='#222222', font=font)
for row, theme in enumerate(themes):
    y = (row + 1) * row_h
    bg = '#19202a' if theme in ('medium','neon','amethyst','moon','severna') else '#f9f3e9'
    d.rectangle((0,y,panel_w,y+row_h), fill=bg)
    ink = '#ffffff' if bg == '#19202a' else '#252525'
    d.text((10,y+27), theme, fill=ink, font=font)
    for col, role in enumerate(roles):
        if theme == 'dark':
            p = root / 'www/assets/green-soft-clay/canonical/settings-controls' / f'{role}-v1.png'
        else:
            p = root / 'www/assets/theme-packs' / theme / 'canonical/settings-controls' / f'{role}-v2.png'
        with Image.open(p) as img:
            img = img.convert('RGBA').resize((50,50), Image.Resampling.LANCZOS)
            sheet.paste(img, (col_w + col*col_w + 8, y+13), img)
        d.text((col_w + col*col_w + 62,y+32), role, fill=ink, font=small)
out = root / 'docs/theme-settings-room-v2-review.png'
sheet.save(out)
print(out)

definitions = json.loads((root / 'docs/theme-definitions.json').read_text(encoding='utf-8'))
theme_data = [item for item in definitions['themes'] if item['id'] in themes]
cells = []
for item in theme_data:
    theme = item['id']
    palette = item.get('paletteHex') or {'surface':'#31523A','text':'#F4EEDC','border':'#A7C397'}
    chips = []
    for role in roles:
        src = (f'../www/assets/green-soft-clay/canonical/settings-controls/{role}-v1.png' if theme == 'dark'
               else f'../www/assets/theme-packs/{theme}/canonical/settings-controls/{role}-v2.png')
        chips.append(f'<div class="icon"><img src="{src}" alt=""><span>{escape(role)}</span></div>')
    for role in ('sound','music','vibration'):
        src = (f'../www/assets/green-soft-clay/canonical/game-header/{role}-v1.png' if theme == 'dark'
               else f'../www/assets/theme-packs/{theme}/canonical/game-header/{role}-v1.png')
        chips.append(f'<div class="icon shared"><img src="{src}" alt=""><span>{escape(role)} · igra</span></div>')
    cells.append(f'''<section style="--surface:{palette['surface']};--ink:{palette['text']};--line:{palette['border']}">
      <h2>{escape(item['nameSr'] if theme != 'dark' else 'Zelena · referenca')}</h2><p>{escape(item['direction'])} · 3D Soft Neomorphism</p>
      <div class="icons">{''.join(chips)}</div></section>''')
page = '''<!doctype html><html lang="sr"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Podešavanja — PNG pregled</title><style>
*{box-sizing:border-box}body{margin:0;background:#e8e7e3;color:#1d2326;font:15px system-ui,sans-serif;padding:22px}
main{max-width:1120px;margin:auto}h1{font-size:1.5rem}p{margin:3px 0 14px}section{margin:16px 0;padding:16px;border:1px solid var(--line);border-radius:18px;background:var(--surface);color:var(--ink)}
section h2{font-size:1.1rem;margin:0}.icons{display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:8px}.icon{min-height:72px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;border:1px solid var(--line);border-radius:10px}.icon img{width:32px;height:32px;object-fit:contain}.icon span{font-size:11px;text-align:center}.shared{outline:1px dashed var(--line);outline-offset:-5px}
</style><main><h1>Podešavanja — 10 tematskih kompleta</h1><p>Pet novih PNG ikona za svaku od devet tema, zelena kao referenca. Zvuk, muzika i vibracija su isti fajlovi kao u kontrolnom panelu partije.</p>''' + ''.join(cells) + '</main></html>'
html_out = root / 'docs/theme-settings-room-review.html'
html_out.write_text(page, encoding='utf-8')
print(html_out)
