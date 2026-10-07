// Inventory original V3 background candidates and build a side-by-side review page.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-definitions.json'), 'utf8'));
const sourceDir = path.join(root, 'source-assets/theme-backgrounds-v3');
const manifestPath = path.join(root, 'docs/theme-backgrounds-v3.json');
const reviewPath = path.join(root, 'docs/theme-backgrounds-v3-review.html');
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

const themes = spec.rebuildPolicy.workOrderThemeIds.map(themeId => {
    const theme = spec.themes.find(item => item.id === themeId);
    const relative = `source-assets/theme-backgrounds-v3/${themeId}-background-master-v3.png`;
    const bytes = fs.readFileSync(path.join(root, relative));
    if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`Invalid PNG: ${relative}`);
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    if (width !== 941 || height !== 1672) throw new Error(`Unexpected size ${width}x${height}: ${relative}`);
    return {
        themeId,
        nameSr: theme.nameSr,
        style: theme.style,
        directionId: theme.direction,
        direction: spec.directions[theme.direction].name,
        masterPath: relative,
        width,
        height,
        sizeBytes: bytes.length,
        sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
        reviewStatus: 'rejected-by-user',
        runtimeLinked: false
    };
});

const manifest = {
    schemaVersion: 1,
    createdOn: '2026-10-06',
    sourceDefinitions: 'docs/theme-definitions.json',
    sourcePrompts: 'docs/theme-background-prompts-v3.md',
    reviewPage: 'docs/theme-backgrounds-v3-review.html',
    status: 'All nine V3 candidates rejected after V4 review; images retained, no runtime links.',
    themes
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const cards = themes.map(item => `<article><a href="../${escape(item.masterPath)}" target="_blank"><img src="../${escape(item.masterPath)}" alt="${escape(item.nameSr)} — istorijska V3 pozadina"></a><h2>${escape(item.nameSr)}</h2><p>${escape(item.direction)} · odbačeno, sačuvano za istoriju</p></article>`).join('\n');
const html = `<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pozadine tema V3 — arhiva</title><style>*{box-sizing:border-box}body{margin:0;background:#101720;color:#f1f5f9;font:16px/1.45 Arial,sans-serif}main{max-width:1300px;margin:auto;padding:22px}h1{margin:0 0 8px}p{margin:0 0 18px;color:#cbd5e1}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}article{background:#1a2634;border:1px solid #3b4d60;border-radius:16px;padding:12px}article img{display:block;width:100%;aspect-ratio:941/1672;object-fit:cover;border-radius:10px}article h2{font-size:18px;margin:10px 0 2px}article p{font-size:14px;margin:0 0 5px}@media(max-width:750px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:470px){.grid{grid-template-columns:1fr}}</style></head><body><main><h1>V3 pozadine — arhiva odbačenih predloga</h1><p>Svi ovi prikazi su sačuvani kao istorija, ali su odbačeni. Aktuelni pregled je <a href="theme-backgrounds-v5-review.html" style="color:#8ae3e4">ovde</a>.</p><div class="grid">${cards}</div></main></body></html>\n`;
fs.writeFileSync(reviewPath, html);
process.stdout.write(`Prepared ${themes.length} V3 background candidates at 941x1672.\n`);
