// Register the two redesigned backgrounds without linking them to the game.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-definitions.json'), 'utf8'));
const v9 = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-backgrounds-v9.json'), 'utf8'));
const png = relative => {
    const bytes = fs.readFileSync(path.join(root, relative));
    if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`Invalid PNG: ${relative}`);
    const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
    if (![940, 941, 1024].includes(width) || ![1535, 1536, 1672].includes(height)) throw new Error(`Unexpected PNG size: ${relative} ${width}x${height}`);
    return { width, height, sizeBytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
};
if (v9.accepted.length !== 8 || v9.accepted.some(item => png(item.path).sha256 !== item.sha256)) throw new Error('Eight accepted backgrounds are incomplete or changed.');

const themes = [
    { themeId: 'winter', nameSr: 'Plavi Okean', path: 'source-assets/theme-backgrounds-v10/winter-background-master-v10.png',
        scene: 'Grčka kopnena luka sa kosim crepnim krovovima, skromnim kejom i jednim čamcem; bez Santorinija.' },
    { themeId: 'moon', nameSr: 'Mesečev Sjaj', path: 'source-assets/theme-backgrounds-v10/moon-background-master-v10.png',
        scene: 'Samo glinena površina Meseca sa dva kratera i otvoreni svemir; bez Zemlje, teleskopa i građevina.' }
].map(item => {
    const definition = spec.themes.find(theme => theme.id === item.themeId);
    if (!definition) throw new Error(`Missing theme ${item.themeId}`);
    return { ...item, style: definition.style, direction: definition.direction,
        reviewStatus: item.themeId === 'winter' ? 'revision-requested-mountains' : 'not-selected-working-sketch-2-is-direction',
        runtimeLinked: false, ...png(item.path) };
});
const manifest = { schemaVersion: 1, createdOn: '2026-10-06', sourceDefinitions: 'docs/theme-definitions.json',
    sourcePrompts: 'docs/theme-background-prompts-v10.md', reviewPage: 'docs/theme-backgrounds-v10-review.html',
    status: 'Eight accepted backgrounds remain locked. Blue Ocean V10 harbor direction liked but distant mountains need revision. Moonlight V10 working sketch 2 chosen as direction instead of the V10 master. V11 revisions await review; no runtime links.',
    accepted: v9.accepted, themes };
fs.writeFileSync(path.join(root, 'docs/theme-backgrounds-v10.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const esc = value => String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
const cards = themes.map(item => `<article><a href="../${esc(item.path)}" target="_blank"><img src="../${esc(item.path)}" alt="${esc(item.nameSr)} V10"></a><div class="caption"><strong>${esc(item.nameSr)}</strong><span>${item.themeId === 'winter' ? 'V10 · dopada se luka, dorada planina' : 'V10 · nije izabrana; radna skica 2 je pravac'}</span><p>${esc(item.scene)}</p></div></article>`).join('');
const html = `<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Plavi Okean i Mesečev Sjaj V10</title><style>*{box-sizing:border-box}body{margin:0;background:#111722;color:#f6f7fa;font:16px/1.4 Arial,sans-serif}main{max-width:1100px;margin:auto;padding:24px}h1{margin:0 0 7px}p{color:#c6d1de}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}article{min-width:0;background:#202b3b;border:1px solid #4d5c70;border-radius:14px;overflow:hidden}article img{display:block;width:100%;aspect-ratio:2/3;object-fit:cover}.caption{padding:10px 14px 14px}.caption strong,.caption span{display:block}.caption span{color:#b9d4ee;margin-top:3px}.caption p{margin:7px 0 0;font-size:14px}a:focus-visible{outline:3px solid #ffe08a}@media(max-width:650px){.grid{grid-template-columns:1fr}}</style></head><body><main><h1>Dve nove pozadine V10</h1><p>Osam već prihvaćenih pozadina ostaje zaključano. Ova dva nova kandidata čekaju tvoju odluku i još nisu povezana sa igrom. Klik na sliku otvara punu veličinu.</p><div class="grid">${cards}</div></main></body></html>\n`;
const reviewedHtml = html.replace('Ova dva nova kandidata čekaju tvoju odluku i još nisu povezana sa igrom.', 'Grčka luka je prihvaćena kao pravac, uz doradu planina. Za Mesec je izabrana V10 radna skica 2 kao pravac. Novi V11 predlozi čekaju izbor; ništa novo nije povezano sa igrom.');
fs.writeFileSync(path.join(root, manifest.reviewPage), reviewedHtml);
process.stdout.write('Recorded V10 feedback and verified eight locked backgrounds.\n');
