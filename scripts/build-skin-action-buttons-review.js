const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'source-assets/skin-action-buttons-v1/manifest.json'), 'utf8'));
const esc = text => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const labels = { roll: 'BACAJ', announce: 'NAJAVA', cancel: 'OTKAŽI' };
const cards = manifest.skins.map(skin => `
  <article class="skin-card">
    <header><strong>${esc(skin.id)}</strong><small>${esc(skin.direction)}</small></header>
    <div class="actions">${Object.entries(skin.states).map(([state, asset]) => `
      <div class="asset"><span>${esc(state)}</span><div class="button" style="background-image:url('../${esc(asset.runtime)}');color:${esc(asset.ink)}">${labels[state]}</div></div>`).join('')}
    </div>
  </article>`).join('');

const html = `<!doctype html>
<html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PNG dugmad po skinu kockica</title>
<style>
:root{font-family:Arial,sans-serif;color:#f4f5f6;background:#172029}
body{margin:0;padding:20px;max-width:1200px;margin:auto}
h1{font-size:1.5rem;margin:0 0 6px}p{margin:0 0 20px;color:#becbd0}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:12px}
.skin-card{padding:14px;border:1px solid #50616b;border-radius:15px;background:#26333b}
header{display:flex;justify-content:space-between;gap:10px;margin-bottom:10px}small{color:#b8c8cb;text-align:right}
.actions{display:flex;gap:8px}.asset{flex:1;min-width:0}.asset span{display:block;font-size:11px;color:#b5c4c7;margin-bottom:4px}
.button{height:44px;width:100%;display:flex;align-items:center;justify-content:center;box-sizing:border-box;background-size:100% 100%;background-repeat:no-repeat;background-position:center;font-size:12px;font-weight:800;text-shadow:0 1px 1px #0003}
body.light{background:#e8e4da;color:#172029}body.light p{color:#45525a}body.light .skin-card{background:#faf7f0;border-color:#a7a9a5}body.light small,body.light .asset span{color:#4b5b64}
button{padding:8px 12px;border:1px solid #84969c;border-radius:8px;background:#34444e;color:white;cursor:pointer;margin-bottom:18px}
</style></head><body>
<h1>PNG dugmad za skinove kockica</h1><p>${manifest.skins.length} skinova, po tri posebna PNG prikaza. Prikazana veličina je 44 px po visini; igra zadržava sopstvene postojeće dimenzije dugmadi.</p>
<button onclick="document.body.classList.toggle('light')">Tamna / svetla podloga</button>
<main class="grid">${cards}</main></body></html>`;
const output = path.join(root, 'docs/skin-action-buttons-review.html');
fs.writeFileSync(output, html);
console.log(output);
