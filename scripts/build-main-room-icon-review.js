const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const definitions = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-definitions.json'), 'utf8'));
const backgrounds = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-backgrounds-final.json'), 'utf8'));
const map = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-asset-implementation-map.json'), 'utf8'));
const roles = [
  ['solo', 'Solo igra'], ['hotseat', 'Dva igrača'], ['online-random', 'Random igrač'],
  ['invite-friend', 'Pozovi prijatelja'], ['daily', 'Dnevni izazov'],
  ['global-chat', 'Globalni čet'], ['leaderboard', 'Top lista'],
  ['online-players', 'Igrači na mreži'], ['quarterly-league', 'Kvartalna liga'],
  ['rules', 'Pravila'], ['settings', 'Podešavanja'], ['statistics', 'Statistika']
];
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

const ready = definitions.themes.filter((theme) => theme.id !== 'dark' && roles.every(([role]) => {
  const entry = map.themes.find((item) => item.themeId === theme.id);
  return entry?.slots[`canonical/${role}-room-identity/${role}-room-menu-v1`]?.stage === 'created';
}));

const tabs = ready.map((theme, index) => `<button type="button" class="tab${index === 0 ? ' active' : ''}" data-target="${escape(theme.id)}">${escape(theme.nameSr)}</button>`).join('');
const panels = ready.map((theme, index) => {
  const background = backgrounds.entries.find((entry) => entry.themeId === theme.id)?.runtimePath;
  const palette = theme.paletteHex;
  const icons = roles.map(([role, label]) => {
    const file = `../www/assets/theme-packs/${theme.id}/canonical/${role}-room-identity/${role}-room-menu-v1.png`;
    return `<div class="icon-card"><img src="${escape(file)}" alt="" loading="lazy"><span>${escape(label)}</span></div>`;
  }).join('');
  return `<section class="theme-panel${index === 0 ? ' active' : ''}" id="${escape(theme.id)}" style="--surface:${escape(palette.surface)};--raised:${escape(palette.raised)};--ink:${escape(palette.text)};--background:${escape(palette.background)};--image:url('${escape('../' + background)}')">
    <header><h2>${escape(theme.nameSr)}</h2><p>3D Soft Neomorphism · ${theme.direction === 'clay' ? 'Clay' : 'Smooth Rubber / Matte Plastic'} · 12 originala · 24 PNG izvedenice</p></header>
    <div class="phone"><div class="phone-title">YAMB <small>of the Balkan</small></div><div class="icons">${icons}</div></div>
    <p class="caption">Pregled ikon paketa na prihvaćenoj pozadini i boji kartica. Ovo nije snimak povezane aplikacije.</p>
  </section>`;
}).join('');

const html = `<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Icon pack glavnih soba — pregled</title><style>
*{box-sizing:border-box}body{margin:0;background:#171923;color:#f7f4ef;font-family:system-ui,-apple-system,Segoe UI,sans-serif}main{max-width:1050px;margin:auto;padding:24px}h1{font-size:clamp(1.5rem,4vw,2.2rem);margin:0 0 8px}p{line-height:1.4}.intro{color:#c6c6ce;margin:0 0 22px}.tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px}.tab{border:1px solid #667080;border-radius:999px;background:#272d3a;color:#fff;padding:9px 15px;font:inherit;cursor:pointer}.tab.active{background:#f0e9da;color:#242532}.theme-panel{display:none}.theme-panel.active{display:block}.theme-panel header{text-align:center;margin-bottom:12px}.theme-panel h2{margin:0;font-size:1.6rem}.theme-panel header p{margin:4px 0;color:#c6c6ce}.phone{width:min(100%,430px);min-height:720px;margin:auto;border:8px solid #343744;border-radius:32px;overflow:hidden;padding:26px 16px 40px;background-image:linear-gradient(#0005,#0005),var(--image);background-position:center;background-size:cover;box-shadow:0 22px 50px #0008}.phone-title{text-align:center;color:var(--surface);font-size:1.8rem;font-weight:900;letter-spacing:.08em;text-shadow:0 2px 8px #0009;margin-bottom:20px}.phone-title small{display:block;font-size:.55em;letter-spacing:.1em}.icons{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.icon-card{background:var(--surface);color:var(--ink);border:2px solid var(--raised);border-radius:15px;display:flex;align-items:center;justify-content:center;flex-direction:column;min-height:117px;padding:7px 3px;text-align:center;box-shadow:0 6px 14px #0003}.icon-card img{width:76px;height:76px;object-fit:contain}.icon-card span{font-size:.66rem;line-height:1.08;font-weight:750}.caption{text-align:center;color:#c6c6ce;font-size:.85rem}
</style></head><body><main><h1>Icon pack glavnih soba</h1><p class="intro">Tema po tema. Svaka ima 12 posebnih simbola, sa PNG veličinama 384 × 384 za meni i 512 × 512 za sobu.</p><nav class="tabs" aria-label="Teme">${tabs}</nav>${panels}</main><script>for(const button of document.querySelectorAll('.tab'))button.addEventListener('click',()=>{for(const tab of document.querySelectorAll('.tab'))tab.classList.toggle('active',tab===button);for(const panel of document.querySelectorAll('.theme-panel'))panel.classList.toggle('active',panel.id===button.dataset.target)});</script></body></html>\n`;

const output = path.join(root, 'docs/theme-main-room-icon-review.html');
fs.writeFileSync(output, html);
console.log(`Wrote ${output} with ${ready.length} themes`);
