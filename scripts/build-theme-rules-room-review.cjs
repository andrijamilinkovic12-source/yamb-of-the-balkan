const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'www/pravilaigre.js'), 'utf8');
const sandbox = {
    document: { documentElement: { dataset: { splashTheme: 'dark' } }, addEventListener() {} },
    localStorage: { getItem(key) { return key === 'yamb_lang' ? 'sr' : 'dark'; } },
    window: {},
    getThemeMedalSource: () => 'assets/green-soft-clay/canonical/competition-medals/quarterly-league-gold-v2.png',
    setTimeout() {}
};
vm.createContext(sandbox);
vm.runInContext(`${source}\n;globalThis.rulesAudit = { RulesData, rulesCanonicalSource };`, sandbox);
const { RulesData, rulesCanonicalSource } = sandbox.rulesAudit;
const themes = {
    dark: ['Zelena', '#214c37', '#f6f2d9', '#f1c96b'],
    light: ['Svetlo zlato', '#fff1d7', '#392817', '#875024'],
    medium: ['Trula višnja', '#431720', '#fff6f2', '#f1c3b2'],
    winter: ['Plavi okean', '#fff4e5', '#18384b', '#0b5c8c'],
    neon: ['Neon Cyber', '#121b2b', '#f4faff', '#56e5d2'],
    amethyst: ['Kraljevski ametist', '#3c284b', '#fbf6ff', '#f2c879'],
    easter: ['Vaskršnja', '#fff8ea', '#3d4434', '#4d6b45'],
    desert: ['Pustinjsko staklo', '#fff0da', '#443027', '#7d4d38'],
    moon: ['Mesečev sjaj', '#252934', '#f5f5f7', '#e1e2e7'],
    severna: ['Severna maglina', '#182c44', '#f5fbff', '#8ae3e4']
};
function themeHtml(html, theme) {
    const folder = theme === 'dark' ? 'green-soft-clay' : `theme-packs/${theme}`;
    return html
        .replace(/(<img\b[^>]*data-rules-role="([^"]+)"[^>]*\bsrc=")[^"]*"/g,
            (_, head, role) => `${head}../www/${rulesCanonicalSource(role, theme)}"`)
        .replace(/(<img\b[^>]*data-medal-tier="([^"]+)"[^>]*\bsrc=")[^"]*"/g,
            (_, head, tier) => `${head}../www/assets/${folder}/canonical/competition-medals/quarterly-league-${tier}-v2.png"`);
}
const pages = {};
for (const theme of Object.keys(themes)) {
    pages[theme] = RulesData.sr.map(page => ({ title: themeHtml(page.title, theme), content: themeHtml(page.content, theme) }));
}
const safeJson = value => JSON.stringify(value).replace(/</g, '\\u003c');
const html = `<!doctype html>
<html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<title>Pravila — pregled deset tema</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#161b23;color:#f5f8fc;font:15px/1.45 system-ui,sans-serif}header{padding:18px max(18px,calc((100vw - 1100px)/2));border-bottom:1px solid #425062}h1{font-size:1.35rem;margin:0 0 4px}header p{margin:0;color:#c0cad4}main{max-width:1100px;margin:auto;padding:18px;display:grid;grid-template-columns:240px minmax(0,1fr);gap:18px}.controls{display:flex;flex-direction:column;gap:6px}.controls button{width:100%;padding:9px 11px;background:#253143;color:#eff8ff;border:1px solid #4b6178;border-radius:9px;text-align:left;cursor:pointer;font:inherit}.controls button[aria-selected=true]{background:#386d75;border-color:#8ae3e4}.page-buttons{display:flex;flex-wrap:wrap;gap:5px;margin:12px 0}.page-buttons button{width:auto;padding:6px 9px}.preview{--surface:#214c37;--ink:#f6f2d9;--accent:#f1c96b;background:var(--surface);color:var(--ink);border:1px solid var(--accent);border-radius:20px;min-height:70vh;overflow:hidden}.preview-head{padding:13px 16px;border-bottom:1px solid color-mix(in srgb,var(--accent) 40%,transparent);display:flex;align-items:center;gap:9px;font-weight:800}.preview-head img{width:34px;height:34px;object-fit:contain}.preview-body{padding:14px 18px 26px;max-height:75vh;overflow:auto}.preview h2{text-align:center;color:var(--accent);text-transform:uppercase;font-size:1.05rem;line-height:1.25;margin:3px 0 12px}.preview h3{font-size:1rem;color:var(--accent);border-bottom:1px solid color-mix(in srgb,var(--accent) 35%,transparent);padding-bottom:6px;margin:16px 0 9px}.preview h4{font-size:.86rem;color:var(--accent);margin:14px 0 6px}.preview p{margin:0 0 10px}.preview ul{padding:0;list-style:none}.preview li{padding:8px 2px;border-bottom:1px solid color-mix(in srgb,var(--ink) 15%,transparent);font-size:.86rem}.preview li strong{color:var(--accent)}.rules-inline-icon{display:inline-block;width:1.28em;height:1.28em;object-fit:contain;vertical-align:-.31em;margin-right:.24em}.preview h2 .rules-page-icon-canonical{width:38px;height:38px;vertical-align:-12px;margin-right:7px}.rules-podium-pack{display:inline-flex;vertical-align:-8px}.rules-podium-pack img{width:25px;height:25px;object-fit:contain}em{color:var(--ink)}@media(max-width:700px){main{display:block}.controls{flex-direction:row;overflow:auto}.controls button{min-width:130px}.preview{min-height:60vh}.preview-body{max-height:65vh}}
body,.controls button{font-family:'Montserrat',Arial,sans-serif}.preview-head{font-size:clamp(1.05rem,4.2vw,1.22rem);font-weight:800;line-height:1.2}.preview h2{font-size:clamp(.98rem,3.6vw,1.08rem);font-weight:800;letter-spacing:0}.preview p,.preview li{font-size:.9rem;line-height:1.4}.preview strong{color:var(--accent)}
</style></head><body><header><h1>Pravila igre — pregled asseta i teksta</h1><p>Šest stranica, deset tema. Naslovi, naglasci i oznake u tekstu koriste tematske boje i kanonske PNG-ove. Tipografska skala prati sobu u aplikaciji; ovo je pregled sadržaja, ne snimak mobilnog rasporeda.</p></header>
<main><nav><div class="controls" id="themes"></div><div class="page-buttons controls" id="page-buttons"></div></nav><section class="preview" id="preview"><div class="preview-head" id="preview-head"></div><div class="preview-body" id="preview-body"></div></section></main>
<script>const themes=${safeJson(themes)};const pages=${safeJson(pages)};let activeTheme='dark',activePage=0;function show(){const meta=themes[activeTheme],page=pages[activeTheme][activePage],root=document.getElementById('preview');root.style.setProperty('--surface',meta[1]);root.style.setProperty('--ink',meta[2]);root.style.setProperty('--accent',meta[3]);document.getElementById('preview-head').innerHTML='<img src="../www/'+(activeTheme==='dark'?'assets/green-soft-clay':'assets/theme-packs/'+activeTheme)+'/canonical/rules-room-identity/rules-room-v1.png" alt="">'+meta[0]+' · Pravila igre';document.getElementById('preview-body').innerHTML='<h2>'+page.title+'</h2>'+page.content;document.querySelectorAll('[data-theme]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.theme===activeTheme)));document.querySelectorAll('[data-page]').forEach(b=>b.setAttribute('aria-selected',String(Number(b.dataset.page)===activePage)))};document.getElementById('themes').innerHTML=Object.entries(themes).map(([id,m])=>'<button data-theme="'+id+'">'+m[0]+'</button>').join('');document.getElementById('page-buttons').innerHTML=Array.from({length:6},(_,i)=>'<button data-page="'+i+'">'+(i+1)+'</button>').join('');document.getElementById('themes').onclick=e=>{const b=e.target.closest('[data-theme]');if(b){activeTheme=b.dataset.theme;show()}};document.getElementById('page-buttons').onclick=e=>{const b=e.target.closest('[data-page]');if(b){activePage=Number(b.dataset.page);show()}};show();</script></body></html>`;
const output = path.join(root, 'docs/theme-rules-room-review.html');
fs.writeFileSync(output, html);
console.log(`WROTE ${output}`);
