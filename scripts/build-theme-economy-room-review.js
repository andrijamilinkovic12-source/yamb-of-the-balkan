const fs = require('node:fs');
const path = require('node:path');

const themes = [
    ['dark','Zelena'],['light','Svetlo zlato'],['medium','Trula višnja'],
    ['winter','Plavi okean'],['neon','Neon Cyber'],['amethyst','Kraljevski ametist'],
    ['easter','Vaskršnja'],['desert','Pustinjsko staklo'],['moon','Mesečev sjaj'],
    ['severna','Severna maglina']
];
const cards = themes.map(([id, name]) => `<article id="${id}"><h2>${name}</h2><div class="pair">
<figure><a href="theme-economy-room-qa/${id}-ducats.png"><img src="theme-economy-room-qa/${id}-ducats.png" alt="${name}, Dukati"></a><figcaption>Dukati</figcaption></figure>
<figure><a href="theme-economy-room-qa/${id}-undo.png"><img src="theme-economy-room-qa/${id}-undo.png" alt="${name}, Ispravi zadnji upis"></a><figcaption>Ispravi zadnji upis</figcaption></figure>
</div><p class="small"><a href="theme-economy-room-qa-320x568-font130/${id}-ducats.png">Uzak ekran: Dukati</a> · <a href="theme-economy-room-qa-320x568-font130/${id}-undo.png">Uzak ekran: Upis</a> · <a href="theme-economy-room-qa-320x568-font130/${id}-undo-bottom.png">Skrol do nagrade</a></p></article>`).join('\n');
const html = `<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dukati i Ispravi zadnji upis · 10 tema</title><style>
*{box-sizing:border-box}body{margin:0;padding:24px;font:16px/1.45 system-ui,sans-serif;background:#edf1f3;color:#24323b}
main{max-width:1450px;margin:auto}h1{margin:0 0 7px}p{color:#52626b;margin:0 0 22px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:18px}
article{padding:16px;border-radius:16px;background:white;border:1px solid #d7e0e4}h2{font-size:20px;margin:0 0 12px}.pair{display:flex;gap:12px}
figure{margin:0;width:50%;text-align:center}img{display:block;width:100%;height:auto;border-radius:10px;border:1px solid #d7e0e4}figcaption{font-weight:700;margin-top:6px}
.small{font-size:13px;margin:12px 0 0}.small a{color:#235a82}
</style></head><body><main><h1>Dukati i Ispravi zadnji upis · 10 tema</h1>
<p>Prikaz iz Android aplikacije. Svaka tema koristi svoj kanonski dukat, token i stanje nagradnog videa; klik na sliku otvara punu veličinu.</p>
<div class="grid">${cards}</div></main></body></html>\n`;
const target = path.join(__dirname,'..','docs','theme-economy-room-review.html');
fs.writeFileSync(target,html);
console.log(target);
