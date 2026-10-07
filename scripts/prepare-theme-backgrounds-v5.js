// Historical V5 generator. The user rejected all seven V5 candidates.
throw new Error('V5 candidates were rejected. Use docs/theme-definitions.json backgroundSceneRule for a new, distinct composition.');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-definitions.json'), 'utf8'));
const previous = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-backgrounds-v4.json'), 'utf8'));
const acceptedIds = ['neon', 'severna'];
const targetIds = spec.rebuildPolicy.workOrderThemeIds.filter(id => !acceptedIds.includes(id));
const manifestPath = path.join(root, 'docs/theme-backgrounds-v5.json');
const reviewPath = path.join(root, 'docs/theme-backgrounds-v5-review.html');
const comparisonPath = path.join(root, 'docs/theme-backgrounds-v4-v5-compare.html');
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function png(relative) {
    const bytes = fs.readFileSync(path.join(root, relative));
    if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`Invalid PNG: ${relative}`);
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    if (width !== 941 || height !== 1672) throw new Error(`Unexpected size ${width}x${height}: ${relative}`);
    return { width, height, sizeBytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
}

const accepted = acceptedIds.map(themeId => {
    const selected = spec.backgroundCandidatePolicy.approvedV4Backgrounds[themeId];
    const old = previous.themes.find(item => item.themeId === themeId);
    if (!selected || !selected.locked || !old || old.reviewStatus !== 'accepted-locked' || selected.path !== old.masterPath) throw new Error(`Accepted reference mismatch: ${themeId}`);
    const measured = png(selected.path);
    if (measured.sha256 !== selected.sha256 || measured.sha256 !== old.sha256) throw new Error(`Accepted reference changed: ${themeId}`);
    return { themeId, nameSr: old.nameSr, directionId: old.directionId, path: selected.path, sha256: measured.sha256, status: 'accepted-locked' };
});

const themes = targetIds.map(themeId => {
    const theme = spec.themes.find(item => item.id === themeId);
    const old = previous.themes.find(item => item.themeId === themeId);
    if (!theme || !old || old.reviewStatus !== 'rejected-by-user') throw new Error(`Rejected V4 reference mismatch: ${themeId}`);
    const relative = `source-assets/theme-backgrounds-v5/${themeId}-background-master-v5.png`;
    return {
        themeId,
        nameSr: theme.nameSr,
        style: theme.style,
        directionId: theme.direction,
        direction: spec.directions[theme.direction].name,
        masterPath: relative,
        previousRejectedPath: old.masterPath,
        ...png(relative),
        reviewStatus: 'pending-user-review',
        runtimeLinked: false
    };
});

const manifest = {
    schemaVersion: 1,
    createdOn: '2026-10-06',
    sourceDefinitions: 'docs/theme-definitions.json',
    sourcePrompts: 'docs/theme-background-prompts-v5.md',
    reviewPage: 'docs/theme-backgrounds-v5-review.html',
    comparisonPage: 'docs/theme-backgrounds-v4-v5-compare.html',
    contactSheet: 'docs/theme-backgrounds-v5-contact-sheet.png',
    status: 'Two V4 backgrounds accepted and locked; seven new V5 backgrounds await user review. No V5 runtime links.',
    accepted,
    themes
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const card = (name, direction, imagePath, label, status) => `<article><a href="../${escape(imagePath)}" target="_blank"><img src="../${escape(imagePath)}" alt="${escape(name)} — ${escape(label)}"></a><h3>${escape(name)}</h3><p>${escape(direction)} · ${escape(status)}</p></article>`;
const acceptedCards = accepted.map(item => card(item.nameSr, spec.directions[item.directionId].name, item.path, 'izabrana V4', 'prihvaćena, ne menjati')).join('');
const candidateCards = themes.map(item => card(item.nameSr, item.direction, item.masterPath, 'nova V5', 'novi kandidat')).join('');
const style = `*{box-sizing:border-box}body{margin:0;background:#101720;color:#f1f5f9;font:16px/1.45 Arial,sans-serif}main{max-width:1260px;margin:auto;padding:24px}h1{margin:0 0 8px}h2{margin:24px 0 10px}p{color:#c6d2df}.intro{max-width:900px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.accepted{grid-template-columns:repeat(2,minmax(0,1fr));max-width:830px}article{background:#1b2938;border:1px solid #3d5369;border-radius:14px;padding:9px}article img{display:block;width:100%;aspect-ratio:941/1672;object-fit:cover;border-radius:9px}article h3{margin:9px 4px 0;font-size:17px}article p{margin:2px 4px 6px;font-size:13px}@media(max-width:760px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:460px){main{padding:11px}.grid,.accepted{gap:7px}article{padding:5px}article h3{font-size:13px}article p{font-size:11px}}`;
const review = `<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pozadine — dve prihvaćene i sedam novih</title><style>${style}</style></head><body><main><h1>Pozadine: mera detalja i novi kandidati</h1><p class="intro">Neon Cyber i Severna Maglina su definitivno izabrane V4 pozadine. Njihove slike su neizmenjene. Ostalih sedam slika su novi V5 kandidati. Klikni na sliku za punu veličinu; nijedan V5 kandidat još nije povezan sa igrom.</p><h2>Prihvaćene pozadine</h2><div class="grid accepted">${acceptedCards}</div><h2>Sedam novih kandidata</h2><div class="grid">${candidateCards}</div></main></body></html>\n`;
fs.writeFileSync(reviewPath, review);

const pairs = themes.map(item => `<section><h2>${escape(item.nameSr)}</h2><p>${escape(item.direction)} · levo odbačeni V4, desno novi V5</p><div class="pair"><a href="../${escape(item.previousRejectedPath)}" target="_blank"><img src="../${escape(item.previousRejectedPath)}" alt="${escape(item.nameSr)} odbačeni V4"></a><a href="../${escape(item.masterPath)}" target="_blank"><img src="../${escape(item.masterPath)}" alt="${escape(item.nameSr)} novi V5"></a></div></section>`).join('');
const comparison = `<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>V4 i V5 — sedam otvorenih tema</title><style>body{margin:0;background:#101720;color:#f1f5f9;font:16px/1.45 Arial,sans-serif}main{max-width:1100px;margin:auto;padding:22px}section{background:#1b2938;border:1px solid #405469;border-radius:14px;padding:14px;margin:0 0 18px}h1{margin:0 0 8px}h2{margin:0}p{color:#c5d2df}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}.pair img{display:block;width:100%;border-radius:9px;aspect-ratio:941/1672;object-fit:cover}@media(max-width:480px){main{padding:10px}.pair{gap:6px}}</style></head><body><main><h1>Odbačeni V4 i novi V5</h1><p>Ovo je istorijsko poređenje sedam ponovljenih tema. Neon Cyber i Severna Maglina su već prihvaćene i nisu ovde menjane. <a href="theme-backgrounds-v5-review.html" style="color:#8ae3e4">Pregled svih aktuelnih pozadina</a>.</p>${pairs}</main></body></html>\n`;
fs.writeFileSync(comparisonPath, comparison);
process.stdout.write(`Prepared seven V5 candidates; preserved two accepted V4 masters.\n`);
