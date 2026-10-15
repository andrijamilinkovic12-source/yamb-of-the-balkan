"""Standalone interactive view of the production Settings markup and CSS."""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
html = (root / 'www/index.html').read_text(encoding='utf-8')
start = html.index('    <div id="settings-screen"')
end = html.index('    <div id="game-over-screen"', start)
settings = html[start:end].replace('id="settings-screen" class="screen"', 'id="settings-screen" class="screen active"', 1)

page = '''<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<base href="../www/"><title>Podešavanja — prikaz sobe</title>
<link rel="stylesheet" href="style.css"><link rel="stylesheet" href="teme.css"><link rel="stylesheet" href="theme-card-surfaces.css">
<link rel="stylesheet" href="theme-game-header.css"><link rel="stylesheet" href="theme-room-close-controls.css"><link rel="stylesheet" href="theme-settings-room.css?v=3">
<style>body{margin:0;min-height:100dvh}#settings-screen{position:fixed;transform:none!important;opacity:1!important;visibility:visible!important}
#settings-screen .settings-shell{max-width:760px}.settings-review-note{position:fixed;z-index:100020;bottom:5px;right:8px;padding:3px 6px;border-radius:6px;background:#222a;color:white;font:10px system-ui}</style></head>
<body><script>const qaThemes=['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna'];
const qaTheme=new URLSearchParams(location.search).get('theme');
if(qaThemes.includes(qaTheme)&&qaTheme!=='dark')document.body.classList.add(qaTheme+'-theme');
window.app={showMainMenu(){},saveSettingAuto(type,value){if(type==='theme'){document.body.className=value==='dark'?'':value+'-theme';
document.getElementById('setting-theme').value=value;}},getUnlockedThemeIds(){return qaThemes},
syncThemeSelectOptions(select){for(const option of select.options)option.disabled=false;
select.value=qaThemes.find(id=>id!=='dark'&&document.body.classList.contains(id+'-theme'))||'dark';}};
window.setLanguage=lang=>{document.documentElement.lang=lang;window.dispatchEvent(new Event('yamb:languageChanged'))};</script>
''' + settings + '''<span class="settings-review-note">Pregled izgleda · sve teme dostupne samo u pregledu</span>
<script src="theme-game-header.js"></script><script src="theme-settings-room.js"></script><script src="theme-settings-picker.js?v=2"></script>
<script>document.addEventListener('DOMContentLoaded',()=>{window.app.syncThemeSelectOptions(document.getElementById('setting-theme'));
window.themeSettingsPicker.refresh();if(new URLSearchParams(location.search).get('open')==='1')requestAnimationFrame(()=>window.themeSettingsPicker.open());});</script>
</body></html>'''
out = root / 'docs/theme-settings-layout-review.html'
out.write_text(page, encoding='utf-8')
print(out)
