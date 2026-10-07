// Lock the approved Blue Ocean V13 background and record the new Moonlight proposal.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const v13 = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-backgrounds-v13.json'), 'utf8'));
const spec = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-definitions.json'), 'utf8'));
const png = relative => {
    const bytes = fs.readFileSync(path.join(root, relative));
    if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`Invalid PNG: ${relative}`);
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), sizeBytes: bytes.length,
        sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
};
if (v13.accepted.length !== 8 || v13.accepted.some(item => png(item.path).sha256 !== item.sha256)) {
    throw new Error('Eight previously approved backgrounds changed.');
}
const blueLock = spec.backgroundCandidatePolicy.approvedV13Backgrounds.winter;
if (!blueLock.locked || blueLock.path !== v13.winter.path || blueLock.sha256 !== png(blueLock.path).sha256) {
    throw new Error('Approved Blue Ocean V13 changed.');
}
const accepted = [...v13.accepted, {
    themeId: 'winter', nameSr: 'Plavi Okean', path: blueLock.path, status: 'accepted-locked', ...png(blueLock.path)
}];
const previousMoonPath = v13.moon.path;
const moonPath = 'source-assets/theme-backgrounds-v14/moon-background-master-v14.png';
const moonDefinition = spec.themes.find(theme => theme.id === 'moon');
const moon = { themeId: 'moon', nameSr: 'Mesečev Sjaj', style: moonDefinition.style, direction: moonDefinition.direction,
    previousPath: previousMoonPath, previousStatus: 'superseded-by-corrected-right-crater-direction', previous: png(previousMoonPath),
    path: moonPath, reviewStatus: 'pending-user-review', runtimeLinked: false,
    change: 'Glavni krater desno; znatno veća vidljiva površina Meseca i manje praznog crnog svemira, uz glineni izgled bez zvezda.',
    ...png(moonPath) };
const manifest = { schemaVersion: 1, createdOn: '2026-10-06', sourceDefinitions: 'docs/theme-definitions.json',
    sourcePrompts: 'docs/theme-background-prompts-v14.md', reviewPage: 'docs/theme-backgrounds-v14-review.html',
    status: 'Nine backgrounds accepted and locked, including Blue Ocean V13. Moonlight V14 awaits user review; no new runtime links.',
    accepted, moon };
fs.writeFileSync(path.join(root, 'docs/theme-backgrounds-v14.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const esc = value => String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
const card = (imagePath, label) => `<article><a href="../${esc(imagePath)}" target="_blank"><img src="../${esc(imagePath)}" alt="${esc(label)}"></a><div class="caption">${esc(label)}</div></article>`;
const html = `<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mesečev Sjaj V14</title><style>*{box-sizing:border-box}body{margin:0;background:#101723;color:#f5f7fb;font:16px/1.4 Arial,sans-serif}main{max-width:1100px;margin:auto;padding:24px}p{color:#cad5e3}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}article{background:#1d2a3a;border:1px solid #465870;border-radius:13px;overflow:hidden}img{display:block;width:100%;aspect-ratio:2/3;object-fit:cover}.caption{padding:10px 12px}a:focus-visible{outline:3px solid #ffe08a}@media(max-width:650px){.grid{grid-template-columns:1fr}}</style></head><body><main><h1>Mesečev Sjaj: ispravljen kadar</h1><p>V12 je imao glavni krater levo. Novi V14 ima krater desno i mnogo veću vidljivu površinu Meseca; čeka korisnički izbor. Plavi Okean V13 je prihvaćen i zaključan.</p><div class="grid">${card(previousMoonPath,'V12 — raniji kadar, krater levo')}${card(moonPath,'V14 — novi predlog, krater desno')}</div></main></body></html>\n`;
fs.writeFileSync(path.join(root, manifest.reviewPage), html);
process.stdout.write('Locked Blue Ocean V13 and recorded Moonlight V14 proposal.\n');
