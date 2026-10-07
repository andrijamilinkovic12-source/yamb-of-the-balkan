// Register V4 PNG candidates and compare each with its untouched V3 counterpart.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-definitions.json'), 'utf8'));
const previous = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-backgrounds-v3.json'), 'utf8'));
const manifestPath = path.join(root, 'docs/theme-backgrounds-v4.json');
const reviewPath = path.join(root, 'docs/theme-backgrounds-v3-v4-compare.html');
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

const themes = spec.rebuildPolicy.workOrderThemeIds.map(themeId => {
    const theme = spec.themes.find(item => item.id === themeId);
    const old = previous.themes.find(item => item.themeId === themeId);
    if (!old || !fs.existsSync(path.join(root, old.masterPath))) throw new Error(`V3 reference missing: ${themeId}`);
    const relative = `source-assets/theme-backgrounds-v4/${themeId}-background-master-v4.png`;
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
        compareWith: old.masterPath,
        width,
        height,
        sizeBytes: bytes.length,
        sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
        reviewStatus: ['neon', 'severna'].includes(themeId) ? 'accepted-locked' : 'rejected-by-user',
        runtimeLinked: false
    };
});

const manifest = {
    schemaVersion: 1,
    createdOn: '2026-10-06',
    sourceDefinitions: 'docs/theme-definitions.json',
    sourcePrompts: 'docs/theme-background-prompts-v4.md',
    comparisonPage: 'docs/theme-backgrounds-v3-v4-compare.html',
    status: 'Neon Cyber and Northern Nebula V4 accepted and locked; seven other V4 backgrounds rejected. Runtime links unchanged.',
    themes
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const pairs = themes.map(item => `<section class="theme" id="${escape(item.themeId)}"><header><h2>${escape(item.nameSr)}</h2><span>${escape(item.direction)}</span></header><div class="pair"><figure><a href="../${escape(item.compareWith)}" target="_blank"><img src="../${escape(item.compareWith)}" alt="${escape(item.nameSr)} V3 pozadina"></a><figcaption><strong>V3 — odbačena</strong><small>Sačuvana za istoriju</small></figcaption></figure><figure><a href="../${escape(item.masterPath)}" target="_blank"><img src="../${escape(item.masterPath)}" alt="${escape(item.nameSr)} V4 pozadina"></a><figcaption><strong>V4 — ${item.reviewStatus === 'accepted-locked' ? 'prihvaćena' : 'odbačena'}</strong><small>${item.reviewStatus === 'accepted-locked' ? 'Zaključana, ne menjati' : 'Sačuvana za istoriju'}</small></figcaption></figure></div></section>`).join('\n');
const html = `<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Poređenje V3 i V4 pozadina</title><style>*{box-sizing:border-box}body{margin:0;background:#0f1722;color:#f4f7fb;font:16px/1.45 Arial,sans-serif}main{max-width:1120px;margin:auto;padding:20px}h1{margin:0 0 8px}p{margin:0 0 22px;color:#ccd7e3}.theme{background:#1b2939;border:1px solid #3b5065;border-radius:17px;padding:18px;margin:0 0 20px}.theme header{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:12px}.theme h2{margin:0;font-size:21px}.theme header span{color:#b9cadc;font-size:14px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:14px}figure{margin:0;background:#111c2a;border:1px solid #34465a;border-radius:12px;padding:8px}img{display:block;width:100%;aspect-ratio:941/1672;object-fit:cover;border-radius:8px}figcaption{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:8px 3px 2px}small{color:#aec1d5}@media(max-width:650px){.theme header{display:block}.pair{gap:7px}.theme{padding:10px}figcaption{display:block;font-size:13px}small{display:block;font-size:11px}}</style></head><body><main><h1>Poređenje pozadina: V3 i V4</h1><p>Levo je prethodno sačuvan V3, desno nova V4 scena sa selektivnom balkanskom inspiracijom. Klikni na sliku za punu veličinu. Ovo je istorijsko poređenje: V4 Neon Cyber i Severna Maglina su prihvaćene, ostale slike su odbačene. Aktuelni pregled je na theme-backgrounds-v5-review.html.</p>${pairs}</main></body></html>\n`;
fs.writeFileSync(reviewPath, html);
process.stdout.write(`Prepared nine V3/V4 comparison pairs at 941x1672.\n`);
