// Record revisions based on the user's V10 feedback; preserve eight locked approvals.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-definitions.json'), 'utf8'));
const v10 = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-backgrounds-v10.json'), 'utf8'));
const png = relative => {
    const bytes = fs.readFileSync(path.join(root, relative));
    if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`Invalid PNG: ${relative}`);
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), sizeBytes: bytes.length,
        sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
};
if (v10.accepted.length !== 8 || v10.accepted.some(item => png(item.path).sha256 !== item.sha256)) throw new Error('Eight accepted images changed.');
const themes = [
    { themeId: 'winter', nameSr: 'Plavi Okean', sourcePath: 'source-assets/theme-backgrounds-v10/winter-background-master-v10.png',
        path: 'source-assets/theme-backgrounds-v11/winter-background-master-v11.png',
        change: 'Ista grčka luka; samo udaljene planine su pojednostavljene u mat-plastične oblike.' },
    { themeId: 'moon', nameSr: 'Mesečev Sjaj', sourcePath: 'source-assets/theme-backgrounds-v10/moon-background-working-2-v10.png',
        path: 'source-assets/theme-backgrounds-v11/moon-background-master-v11.png',
        change: 'Dva kratera i pogled iz V10 radne skice 2, uz glatkiju glinenu površinu.' }
].map(item => {
    const definition = spec.themes.find(theme => theme.id === item.themeId);
    if (!definition) throw new Error(`Missing theme ${item.themeId}`);
    return { ...item, style: definition.style, direction: definition.direction, source: png(item.sourcePath),
        reviewStatus: 'pending-user-review', runtimeLinked: false, ...png(item.path) };
});
const manifest = { schemaVersion: 1, createdOn: '2026-10-06', sourceDefinitions: 'docs/theme-definitions.json',
    sourcePrompts: 'docs/theme-background-prompts-v11.md', reviewPage: 'docs/theme-backgrounds-v11-review.html',
    status: 'Eight accepted backgrounds remain locked. Blue Ocean and Moonlight V11 revisions await user review; no runtime links.',
    accepted: v10.accepted, themes };
fs.writeFileSync(path.join(root, 'docs/theme-backgrounds-v11.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const esc = value => String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
const card = (item, imagePath, label) => `<article><a href="../${esc(imagePath)}" target="_blank"><img src="../${esc(imagePath)}" alt="${esc(item.nameSr)} ${esc(label)}"></a><div class="caption"><strong>${esc(item.nameSr)}</strong><span>${esc(label)}</span></div></article>`;
const sections = themes.map(item => `<section><h2>${esc(item.nameSr)}</h2><p>${esc(item.change)}</p><div class="grid">${card(item,item.sourcePath,item.themeId === 'winter' ? 'V10 — polazna luka' : 'V10 — radna skica 2, izabrani pravac')}${card(item,item.path,'V11 — novi predlog, čeka izbor')}</div></section>`).join('');
const html = `<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pozadine V11 — poređenje</title><style>*{box-sizing:border-box}body{margin:0;background:#101723;color:#f5f7fb;font:16px/1.4 Arial,sans-serif}main{max-width:1100px;margin:auto;padding:24px}h1{margin:0 0 8px}h2{margin:30px 0 8px}p{color:#cad5e3}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}article{min-width:0;background:#1d2a3a;border:1px solid #465870;border-radius:13px;overflow:hidden}img{display:block;width:100%;aspect-ratio:2/3;object-fit:cover}.caption{padding:9px 12px 12px}.caption strong,.caption span{display:block}.caption span{color:#bfd4e7;margin-top:3px;font-size:13px}a:focus-visible{outline:3px solid #ffe08a}@media(max-width:650px){.grid{grid-template-columns:1fr}}</style></head><body><main><h1>Dve nove V11 pozadine</h1><p>Svaka tema prikazuje polaznu V10 sliku i novi V11 predlog. Osam drugih pozadina ostaje zaključano. Klik na sliku otvara punu veličinu; V11 čekaju tvoju odluku.</p>${sections}</main></body></html>\n`;
fs.writeFileSync(path.join(root, manifest.reviewPage), html);
process.stdout.write('Recorded two V11 revisions and verified eight locked backgrounds.\n');
