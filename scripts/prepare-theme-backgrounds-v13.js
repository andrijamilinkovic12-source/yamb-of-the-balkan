// Record a local Blue Ocean mountain edit and the Moonlight V12 direction choice.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const v12 = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-backgrounds-v12.json'), 'utf8'));
const png = relative => {
    const bytes = fs.readFileSync(path.join(root, relative));
    if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`Invalid PNG: ${relative}`);
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), sizeBytes: bytes.length,
        sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
};
if (v12.accepted.length !== 8 || v12.accepted.some(item => png(item.path).sha256 !== item.sha256)) {
    throw new Error('Eight approved backgrounds changed.');
}
const blueV12 = v12.themes.find(item => item.themeId === 'winter');
const moonV12 = v12.themes.find(item => item.themeId === 'moon');
if (!blueV12 || !moonV12 || png(blueV12.path).sha256 !== blueV12.sha256 || png(moonV12.path).sha256 !== moonV12.sha256) {
    throw new Error('V12 source images changed.');
}
const bluePath = 'source-assets/theme-backgrounds-v13/winter-background-master-v13.png';
const manifest = {
    schemaVersion: 1,
    createdOn: '2026-10-06',
    sourceDefinitions: 'docs/theme-definitions.json',
    sourcePrompts: 'docs/theme-background-prompts-v13.md',
    reviewPage: 'docs/theme-backgrounds-v13-review.html',
    status: 'Eight accepted backgrounds remain locked. Blue Ocean V12 foreground is the approved direction; V13 revises distant mountains only. Moonlight V12 crater-left and black-sky composition is the approved direction. Neither full image is finalized or runtime-linked.',
    accepted: v12.accepted,
    winter: {
        nameSr: 'Plavi Okean',
        sourcePath: blueV12.path,
        source: png(blueV12.path),
        path: bluePath,
        ...png(bluePath),
        directionStatus: 'approved-direction',
        reviewStatus: 'pending-user-review',
        change: 'Samo udaljene planine pojednostavljene u glatke mat-plastične oblike; luka, grad i more ostaju osnova kadra.',
        runtimeLinked: false
    },
    moon: {
        nameSr: 'Mesečev Sjaj',
        path: moonV12.path,
        ...png(moonV12.path),
        directionStatus: 'approved-direction',
        finalImageStatus: 'not-yet-finalized',
        description: 'Veliki krater levo, srebrnosiva glinena površina i crno nebo bez zvezda.',
        runtimeLinked: false
    }
};
fs.writeFileSync(path.join(root, 'docs/theme-backgrounds-v13.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const esc = value => String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
const card = (src, label) => `<article><a href="../${esc(src)}" target="_blank"><img src="../${esc(src)}" alt="${esc(label)}"></a><div class="caption">${esc(label)}</div></article>`;
const html = `<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Plavi Okean V12/V13</title><style>*{box-sizing:border-box}body{margin:0;background:#101723;color:#f5f7fb;font:16px/1.4 Arial,sans-serif}main{max-width:1100px;margin:auto;padding:24px}p{color:#cad5e3}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}article{background:#1d2a3a;border:1px solid #465870;border-radius:13px;overflow:hidden}img{display:block;width:100%;aspect-ratio:2/3;object-fit:cover}.caption{padding:10px 12px}a:focus-visible{outline:3px solid #ffe08a}@media(max-width:650px){.grid{grid-template-columns:1fr}}</style></head><body><main><h1>Plavi Okean: udaljene planine</h1><p>Prvi plan, luka i more ostaju osnova. V13 je lokalna dorada udaljenih planina. Obe slike su sačuvane; ceo kadar još čeka izbor.</p><div class="grid">${card(blueV12.path,'V12 — polazni kadar')}${card(bluePath,'V13 — stilizovane udaljene planine')}</div><h2>Mesečev Sjaj</h2><p>V12 sa velikim kraterom levo i crnim nebom zabeležen je kao dobar pravac, bez potvrde konačne slike.</p>${card(moonV12.path,'V12 — potvrđen pravac')}</main></body></html>\n`;
fs.writeFileSync(path.join(root, manifest.reviewPage), html);
process.stdout.write('Recorded Blue Ocean V13 and Moonlight V12 directions; eight accepted backgrounds unchanged.\n');
