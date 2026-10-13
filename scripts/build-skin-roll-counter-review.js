const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const counters = require(path.join(root, 'source-assets/skin-roll-counter-v1/manifest.json'));
const buttons = require(path.join(root, 'source-assets/skin-action-buttons-v1/manifest.json'));
const buttonBySkin = new Map(buttons.skins.map(item => [item.id, item]));
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

const cards = counters.skins.map(set => {
    const button = buttonBySkin.get(set.skinId);
    const announce = button.states.announce;
    const roll = button.states.roll;
    const states = [0, 1, 2, 3].map(count =>
        `<figure><img src="../${escape(set.states[count])}" alt="${escape(set.skinId)}: ${count}/3"><figcaption>${count}/3</figcaption></figure>`).join('');
    const gift = set.skinId.startsWith('theme_') || set.skinId === 'green_clay';
    return `<article class="card" data-skin="${escape(set.skinId)}"><header><img class="dice" src="../${escape(set.diceFace)}" alt="Lice kockice"><div><h2>${escape(set.skinId.replaceAll('_', ' '))}</h2><small>${escape(set.direction)}${gift ? ' · poklon teme' : ''}</small></div></header>
        <div class="states">${states}</div>
        <div class="mock"><img class="badge" src="../${escape(set.states[2])}" alt="2/3">
            <button class="announce" style="background-image:url('../${escape(announce.runtime)}');color:${escape(announce.ink)}">TRILING</button>
            <button class="roll" style="background-image:url('../${escape(roll.runtime)}');color:${escape(roll.ink)}">BACAJ</button>
        </div></article>`;
}).join('');

const html = `<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Brojač bacanja — 48 skinova</title><style>
*{box-sizing:border-box}body{background:#18232c;color:#f4f6f7;font:14px Arial,sans-serif;margin:0;padding:20px}main{max-width:1160px;margin:auto}
h1{margin:0 0 8px;font-size:26px}p{margin:0 0 16px;color:#bbccd2;line-height:1.5}h2{font-size:16px;margin:0 0 4px;text-transform:capitalize}small{color:#aebfc5;font-size:12px}
.toolbar{display:flex;gap:8px;margin-bottom:18px}.toolbar>*{border:1px solid #a7b7bb;background:#3d5662;color:#fff;padding:8px 12px;border-radius:8px}.toolbar input{flex:1;min-width:100px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:14px}.card{background:#293943;border:1px solid #526975;border-radius:16px;padding:14px}
header{display:flex;align-items:center;gap:10px;margin-bottom:8px}header .dice{width:46px;height:46px;object-fit:contain}
.states{display:flex;justify-content:space-between;gap:8px;margin-bottom:12px}figure{margin:0;text-align:center}figure img{width:64px;height:64px;object-fit:contain}figcaption{font-size:11px;color:#cad6d9;margin-top:2px}
.mock{box-sizing:border-box;width:320px;max-width:100%;display:flex;align-items:center;gap:6px;border-radius:12px;padding:6px 10px;background:#132029;margin:auto}
.mock .badge{width:42px;height:42px;flex:0 0 42px}.mock button{min-width:0;height:44px;padding:0 8px;border:0;background-color:transparent;background-size:100% 100%;background-position:center;background-repeat:no-repeat;font-size:11px;font-weight:800;white-space:nowrap;transform:none}.mock button:active{transform:none;filter:brightness(.96)}.mock .announce{flex:2 1 0;padding:0 6px;font-size:12px}.mock .roll{flex:3 1 0}
body.light{background:#eeeae2;color:#16212a}body.light p,body.light small{color:#52616a}body.light .card{background:#fffaf2;border-color:#b2b9b4}body.light figcaption{color:#4f6066}body.light .mock{background:#d9e0db}
</style></head><body><main><h1>Brojač bacanja — 48 skinova</h1><p>Svaki skin ima svoj PNG brojač i pravac. Obod se puni u tri bacanja. U donjem redu je simulacija širine 320 px: brojač, Najava 40%, Bacaj 60% (procenti od prostora za oba dugmeta).</p>
<div class="toolbar"><input id="search" type="search" placeholder="Pronađi skin" aria-label="Pronađi skin"><button onclick="document.body.classList.toggle('light')">Tamna / svetla podloga</button></div>
<div class="grid">${cards}</div></main><script>document.getElementById('search').addEventListener('input',e=>{const q=e.target.value.toLowerCase().trim();document.querySelectorAll('.card').forEach(card=>card.hidden=!card.dataset.skin.includes(q))})</script></body></html>`;
const output = path.join(root, 'docs/skin-roll-counter-review.html');
fs.writeFileSync(output, html);
console.log(output);
