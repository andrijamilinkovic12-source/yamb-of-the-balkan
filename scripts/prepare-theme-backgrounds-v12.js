// Keep the eight approved images locked and offer two new scenes for review.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-definitions.json'), 'utf8'));
const v11 = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-backgrounds-v11.json'), 'utf8'));
const png = relative => {
    const bytes = fs.readFileSync(path.join(root, relative));
    if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`Invalid PNG: ${relative}`);
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), sizeBytes: bytes.length,
        sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
};
if (v11.accepted.length !== 8 || v11.accepted.some(item => png(item.path).sha256 !== item.sha256)) {
    throw new Error('Eight approved backgrounds changed.');
}
const themes = [
    { themeId: 'winter', nameSr: 'Plavi Okean', previousPath: 'source-assets/theme-backgrounds-v11/winter-background-master-v11.png',
        path: 'source-assets/theme-backgrounds-v12/winter-background-master-v12.png',
        change: 'Potpuno nov pogled na more i luku nadahnut Atinom i Pirejem; V11 ostaje sačuvan za poređenje.',
        previousStatus: 'retained-for-comparison' },
    { themeId: 'moon', nameSr: 'Mesečev Sjaj', previousPath: 'source-assets/theme-backgrounds-v11/moon-background-master-v11.png',
        path: 'source-assets/theme-backgrounds-v12/moon-background-master-v12.png',
        change: 'Nova srebrnosiva glinena površina Meseca sa izraženim kraterom i nebom bez zvezda.',
        previousStatus: 'revision-requested' }
].map(item => {
    const definition = spec.themes.find(theme => theme.id === item.themeId);
    if (!definition) throw new Error(`Missing theme ${item.themeId}`);
    return { ...item, style: definition.style, direction: definition.direction, previous: png(item.previousPath),
        reviewStatus: 'pending-user-review', runtimeLinked: false, ...png(item.path) };
});
const manifest = { schemaVersion: 1, createdOn: '2026-10-06', sourceDefinitions: 'docs/theme-definitions.json',
    sourcePrompts: 'docs/theme-background-prompts-v12.md', reviewPage: 'docs/theme-backgrounds-v12-review.html',
    status: 'Eight approved backgrounds remain locked. Blue Ocean V11 is retained for comparison; Moonlight V11 needs revision. Two V12 images await user review; no runtime links.',
    accepted: v11.accepted, themes };
fs.writeFileSync(path.join(root, 'docs/theme-backgrounds-v12.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const esc = value => String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
const card = (item, imagePath, label) => `<article><a href="../${esc(imagePath)}" target="_blank"><img src="../${esc(imagePath)}" alt="${esc(item.nameSr)} ${esc(label)}"></a><div class="caption"><strong>${esc(item.nameSr)}</strong><span>${esc(label)}</span></div></article>`;
const sections = themes.map(item => `<section><h2>${esc(item.nameSr)}</h2><p>${esc(item.change)}</p><div class="grid">${card(item,item.previousPath,item.themeId === 'winter' ? 'V11 — sačuvana za poređenje' : 'V11 — nije prihvaćena')}${card(item,item.path,'V12 — novi predlog, čeka izbor')}</div></section>`).join('');
const html = `<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pozadine V12 — poređenje</title><style>*{box-sizing:border-box}body{margin:0;background:#101723;color:#f5f7fb;font:16px/1.4 Arial,sans-serif}main{max-width:1100px;margin:auto;padding:24px}h1{margin:0 0 8px}h2{margin:30px 0 8px}p{color:#cad5e3}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}article{min-width:0;background:#1d2a3a;border:1px solid #465870;border-radius:13px;overflow:hidden}img{display:block;width:100%;aspect-ratio:2/3;object-fit:cover}.caption{padding:9px 12px 12px}.caption strong,.caption span{display:block}.caption span{color:#bfd4e7;margin-top:3px;font-size:13px}a:focus-visible{outline:3px solid #ffe08a}@media(max-width:650px){.grid{grid-template-columns:1fr}}</style></head><body><main><h1>Dva nova V12 predloga</h1><p>Plavi Okean V11 ostaje za poređenje sa potpuno novim V12 kadrom. Mesec V11 nije prihvaćen; V12 je nova verzija bez zvezda. Osam drugih pozadina ostaje zaključano. Klik otvara punu veličinu.</p>${sections}</main></body></html>\n`;
fs.writeFileSync(path.join(root, manifest.reviewPage), html);
process.stdout.write('Recorded two V12 proposals and verified eight locked backgrounds.\n');
