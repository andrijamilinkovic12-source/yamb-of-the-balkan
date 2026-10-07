// Register four more stylized backgrounds for user review.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-definitions.json'), 'utf8'));
const png = relative => {
    const bytes = fs.readFileSync(path.join(root, relative));
    if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`Invalid PNG: ${relative}`);
    const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
    if (![940, 941, 1024].includes(width) || ![1536, 1672].includes(height)) throw new Error(`Unexpected size: ${relative} ${width}x${height}`);
    return { width, height, sizeBytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
};
const accepted = [
    { themeId: 'dark', nameSr: 'Zelena', path: 'www/assets/green-clay-balkan-diorama-v4.png' },
    ...['neon', 'severna'].map(themeId => ({ themeId, nameSr: spec.themes.find(t => t.id === themeId).nameSr, path: spec.backgroundCandidatePolicy.approvedV4Backgrounds[themeId].path, locked: spec.backgroundCandidatePolicy.approvedV4Backgrounds[themeId] })),
    ...['easter', 'amethyst'].map(themeId => ({ themeId, nameSr: spec.themes.find(t => t.id === themeId).nameSr, path: spec.backgroundCandidatePolicy.approvedV6Backgrounds[themeId].path, locked: spec.backgroundCandidatePolicy.approvedV6Backgrounds[themeId] })),
    { themeId: 'desert', nameSr: 'Pustinjsko Staklo', path: spec.backgroundCandidatePolicy.approvedV8Backgrounds.desert.path, locked: spec.backgroundCandidatePolicy.approvedV8Backgrounds.desert },
    { themeId: 'light', nameSr: 'Svetlo Zlato', path: spec.backgroundCandidatePolicy.approvedV9Backgrounds.light.path, locked: spec.backgroundCandidatePolicy.approvedV9Backgrounds.light },
    { themeId: 'medium', nameSr: 'Trula Višnja', path: spec.backgroundCandidatePolicy.approvedV9Backgrounds.medium.path, locked: spec.backgroundCandidatePolicy.approvedV9Backgrounds.medium }
].map(item => {
    const measured = png(item.path);
    if (item.locked && (!item.locked.locked || item.locked.sha256 !== measured.sha256)) throw new Error(`Accepted background changed: ${item.themeId}`);
    return { themeId: item.themeId, nameSr: item.nameSr, path: item.path, status: 'accepted-locked', ...measured };
});
const descriptions = {
    light: 'Toplo kopneno dvorište sa velikim zaobljenim drvetom i kućama tamnih krovova; mat plastika.',
    medium: 'Enterijer od oblikovane gline, jednostavne kuće kroz prozor, sto i krčag.',
    winter: 'Grčka ostrva, bele plastične kuće sa plavim prozorima i more od širokih plavih slojeva.',
    moon: 'Lunarni glineni reljef sa dva kratera, malom opservatorijom i pojednostavljenom Zemljom.'
};
const themes = ['light', 'medium', 'winter', 'moon'].map(themeId => {
    const theme = spec.themes.find(item => item.id === themeId);
    const pathName = `source-assets/theme-backgrounds-v9/${themeId}-background-master-v9.png`;
    return { themeId, nameSr: theme.nameSr, style: theme.style, direction: theme.direction,
        description: descriptions[themeId], path: pathName,
        reviewStatus: ['light', 'medium'].includes(themeId) ? 'accepted-locked' : 'rejected-by-user',
        runtimeLinked: false, ...png(pathName) };
});
const manifest = { schemaVersion: 1, createdOn: '2026-10-06', sourceDefinitions: 'docs/theme-definitions.json',
    sourcePrompts: 'docs/theme-background-prompts-v9.md', reviewPage: 'docs/theme-backgrounds-v9-review.html',
    contactSheet: 'docs/theme-backgrounds-v9-contact-sheet.png',
    status: 'Eight backgrounds accepted and locked, including Light Gold V9 and Dark Cherry V9. Blue Ocean V9 and Moonlight V9 rejected and have no accepted background. No new runtime links.',
    accepted, themes };
fs.writeFileSync(path.join(root, 'docs/theme-backgrounds-v9.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const esc = value => String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
const cards = themes.map(item => `<article><a href="../${esc(item.path)}" target="_blank"><img src="../${esc(item.path)}" alt="${esc(item.nameSr)} V9"></a><div class="caption"><strong>${esc(item.nameSr)}</strong><span>${item.reviewStatus === 'accepted-locked' ? 'V9 prihvaćena i zaključana' : item.reviewStatus === 'rejected-by-user' ? 'V9 odbijena · nema novih verzija' : 'Nova V9 · čeka tvoj izbor'}</span><small>${esc(item.description)}</small></div></article>`).join('');
const html = `<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Četiri nove pozadine V9</title><style>*{box-sizing:border-box}body{margin:0;background:#111722;color:#f6f7fa;font:16px/1.4 Arial,sans-serif}main{max-width:1300px;margin:auto;padding:24px}h1{margin:0 0 7px}p{color:#c6d1de;max-width:850px}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}article{min-width:0;background:#202b3b;border:1px solid #4d5c70;border-radius:14px;overflow:hidden}article img{display:block;width:100%;aspect-ratio:941/1672;object-fit:cover}.caption{padding:10px 12px 13px}.caption strong,.caption span,.caption small{display:block}.caption span{margin-top:3px;color:#b9d4ee}.caption small{margin-top:6px;color:#c6d1de}a:focus-visible{outline:3px solid #ffe08a}@media(max-width:800px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:460px){main{padding:10px}.grid{gap:8px}.caption{padding:7px;font-size:12px}.caption small{font-size:11px}}</style></head><body><main><h1>Četiri nove pozadine V9</h1><p>Pustinjsko Staklo V8 verzija 2 je prihvaćeno i sačuvano. Ove četiri nove slike su izrazitije oblikovane kao Clay ili mat plastične makete. Klik na svaku sliku otvara punu veličinu. Čekaju tvoju odluku i još nisu povezane sa igrom.</p><div class="grid">${cards}</div></main></body></html>\n`;
const reviewedHtml = html
    .replace('Četiri nove pozadine V9', 'V9 pozadine — zabeležene odluke')
    .replace('Čekaju tvoju odluku i još nisu povezane sa igrom.', 'Svetlo Zlato V9 i Trula Višnja V9 su prihvaćeni. Plavi Okean V9 i Mesečev Sjaj V9 su odbijeni i još nemaju prihvaćenu pozadinu. Ništa novo nije povezano sa igrom.');
fs.writeFileSync(path.join(root, manifest.reviewPage), reviewedHtml);
process.stdout.write('Recorded V9 decisions and eight locked backgrounds.\n');
