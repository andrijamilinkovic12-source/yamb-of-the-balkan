const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const themes = require(path.join(root, 'docs/theme-definitions.json')).themes
  .filter(theme => theme.id !== 'dark');
const roles = [
  ['Aktivno', 'canonical/rewarded-video/rewarded-video-active-v1.png'],
  ['Aktivno · malo', 'canonical/rewarded-video/rewarded-video-active-inline-v1.png'],
  ['Nedostupno', 'canonical/rewarded-video/rewarded-video-unavailable-v1.png'],
  ['Nedostupno · malo', 'canonical/rewarded-video/rewarded-video-unavailable-inline-v1.png'],
  ['Dnevni · 1 dukat', 'daily/reward-video-v3.png'],
  ['Riznica · 1 dukat', 'treasury/reward-video-v3.png'],
  ['Solo · 2 dukata', 'solo/finish-reward-video-v3.png']
];
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const cards = themes.map(theme => {
  const cells = roles.map(([label, file]) => `<figure><div class="tile"><img src="../www/assets/theme-packs/${theme.id}/${file}" alt="${esc(theme.nameSr)} — ${esc(label)}"></div><figcaption>${esc(label)}</figcaption></figure>`).join('');
  const direction = theme.direction === 'clay' ? 'Clay' : 'Smooth Rubber / Matte Plastic';
  return `<section class="theme" id="${theme.id}"><h2>${esc(theme.nameSr)} <small>${direction}</small></h2><div class="assets">${cells}</div></section>`;
}).join('');
const html = `<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rewarded Video · 9 tema</title><style>
:root{color-scheme:dark;font-family:system-ui,sans-serif}*{box-sizing:border-box}body{margin:0;background:#14151c;color:#f2f0ed}header{padding:26px clamp(16px,4vw,48px);position:sticky;top:0;background:#14151ce8;backdrop-filter:blur(14px);z-index:2;border-bottom:1px solid #ffffff22}h1{font-size:clamp(23px,3vw,34px);margin:0 0 7px}p{margin:0;color:#bebfc6;line-height:1.5}main{padding:20px clamp(16px,4vw,48px) 60px;display:grid;gap:20px}.theme{border:1px solid #ffffff22;border-radius:18px;background:#20222b;padding:18px}h2{font-size:21px;margin:0 0 15px}small{font-weight:400;font-size:13px;color:#aeb1bd;margin-left:9px}.assets{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:11px}figure{min-width:0;margin:0}.tile{aspect-ratio:1;border-radius:12px;background:linear-gradient(145deg,#ddd9d4,#bdb8b0);display:grid;place-items:center;overflow:hidden}.tile img{width:90%;height:90%;object-fit:contain}figcaption{font-size:12px;color:#d9d9df;text-align:center;margin-top:8px}@media(max-width:1000px){.assets{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(max-width:600px){.assets{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style></head><body><header><h1>Gledaj reklamu za nagradu · devet tema</h1><p>Četiri kanonska stanja i tri nagradne kompozicije. Svaki dukat ima pet tačaka. Zelena ostaje zaključana referenca. Povezano u aplikaciji; vizuelni QA u stvarnom toku predstoji.</p></header><main>${cards}</main></body></html>`;
fs.writeFileSync(path.join(root, 'docs/theme-rewarded-video-review.html'), html);
console.log('Built docs/theme-rewarded-video-review.html');
