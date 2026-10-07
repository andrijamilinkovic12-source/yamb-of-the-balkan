// Record the new proposals without linking them to the game runtime.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-definitions.json'), 'utf8'));
const v6 = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-backgrounds-v6.json'), 'utf8'));
const png = relative => {
    const bytes = fs.readFileSync(path.join(root, relative));
    if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`Invalid PNG: ${relative}`);
    const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
    if (![940, 941, 1024].includes(width) || ![1536, 1672].includes(height)) throw new Error(`Unexpected size: ${relative} ${width}x${height}`);
    return { width, height, sizeBytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
};
const entries = [
    { themeId: 'light', nameSr: 'Svetlo Zlato', variants: [
        { label: 'V6 — prethodni smer', path: 'source-assets/theme-backgrounds-v6/light-background-master-v6.png', status: 'revision-requested' },
        { label: 'V8 — novo dvorište', path: 'source-assets/theme-backgrounds-v8/light-background-master-v8.png', status: 'not-selected' }
    ] },
    { themeId: 'medium', nameSr: 'Trula Višnja', variants: [
        { label: 'V6 — prethodni smer', path: 'source-assets/theme-backgrounds-v6/medium-background-master-v6.png', status: 'revision-requested' },
        { label: 'V8 — novi pogled iz sobe', path: 'source-assets/theme-backgrounds-v8/medium-background-master-v8.png', status: 'not-selected' }
    ] },
    { themeId: 'winter', nameSr: 'Plavi Okean', variants: [
        { label: 'V8 — novo grčko ostrvo', path: 'source-assets/theme-backgrounds-v8/winter-background-master-v8.png', status: 'rejected-too-realistic' }
    ] },
    { themeId: 'desert', nameSr: 'Pustinjsko Staklo', variants: [
        { label: 'V6 — sačuvani smer', path: 'source-assets/theme-backgrounds-v6/desert-background-master-v6.png', status: 'direction-liked' },
        { label: 'V8 — nova verzija 1, stena desno', path: 'source-assets/theme-backgrounds-v8/desert-background-variant-1-v8.png', status: 'not-selected' },
        { label: 'V8 — nova verzija 2, široki kanjon', path: 'source-assets/theme-backgrounds-v8/desert-background-variant-2-v8.png', status: 'accepted-locked' }
    ] },
    { themeId: 'moon', nameSr: 'Mesečev Sjaj', variants: [
        { label: 'V6 — sačuvani smer', path: 'source-assets/theme-backgrounds-v6/moon-background-master-v6.png', status: 'direction-liked' },
        { label: 'V8 — nova verzija 1, opservatorija levo', path: 'source-assets/theme-backgrounds-v8/moon-background-variant-1-v8.png', status: 'rejected-too-realistic' },
        { label: 'V8 — nova verzija 2, lunarni plato', path: 'source-assets/theme-backgrounds-v8/moon-background-variant-2-v8.png', status: 'rejected-too-realistic' }
    ] }
];
for (const theme of entries) {
    const definition = spec.themes.find(item => item.id === theme.themeId);
    if (!definition) throw new Error(`Missing theme ${theme.themeId}`);
    theme.style = definition.style;
    theme.direction = definition.direction;
    theme.runtimeLinked = false;
    theme.variants = theme.variants.map(variant => ({ ...variant, ...png(variant.path) }));
}
const royal = spec.backgroundCandidatePolicy.approvedV6Backgrounds.amethyst;
if (!royal.locked || png(royal.path).sha256 !== royal.sha256 || !v6.accepted.some(item => item.themeId === 'amethyst' && item.path === royal.path)) throw new Error('Royal Amethyst V6 lock is inconsistent.');
const desert = spec.backgroundCandidatePolicy.approvedV8Backgrounds.desert;
if (!desert.locked || desert.version !== 2 || png(desert.path).sha256 !== desert.sha256) throw new Error('Accepted Desert Glass V8 variant 2 changed.');
const manifest = {
    schemaVersion: 1,
    createdOn: '2026-10-06',
    sourceDefinitions: 'docs/theme-definitions.json',
    reviewPage: 'docs/theme-backgrounds-v8-review.html',
    status: 'Royal Amethyst V6 and Desert Glass V8 variant 2 accepted and locked. The other V8 proposals are preserved history; four new V9 proposals await review. No new runtime links.',
    acceptedRoyal: { themeId: 'amethyst', nameSr: 'Kraljevski Ametist', path: royal.path, status: 'accepted-locked', ...png(royal.path) },
    acceptedDesert: { themeId: 'desert', nameSr: 'Pustinjsko Staklo', path: desert.path, status: 'accepted-locked', ...png(desert.path) },
    themes: entries
};
fs.writeFileSync(path.join(root, 'docs/theme-backgrounds-v8.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const esc = value => String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
const card = (theme, variant) => `<article><a href="../${esc(variant.path)}" target="_blank"><img src="../${esc(variant.path)}" alt="${esc(theme.nameSr)} — ${esc(variant.label)}"></a><div class="caption"><strong>${esc(theme.nameSr)}</strong><span>${esc(variant.label)}</span><small>${variant.status === 'accepted-locked' ? 'Prihvaćena i zaključana' : variant.status === 'reconsideration-requested' ? 'Ponovo ponuđena za izbor' : variant.status === 'rejected-too-realistic' ? 'Odbačena: previše realistična' : variant.status === 'not-selected' ? 'Nije izabrana' : variant.status === 'direction-liked' ? 'Sačuvana V6 · dopada se pravac' : 'Prethodna V6 · tražena dorada'}</small></div></article>`;
const sections = entries.map(theme => `<section><h2>${esc(theme.nameSr)}</h2><div class="grid">${theme.variants.map(variant => card(theme, variant)).join('')}</div></section>`).join('');
const html = `<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pozadine V8 — prethodni pregled</title><style>*{box-sizing:border-box}body{margin:0;background:#111722;color:#f6f7fa;font:16px/1.4 Arial,sans-serif}main{max-width:1300px;margin:auto;padding:24px}h1{margin:0 0 7px}h2{margin:28px 0 10px}p{color:#c6d1de;max-width:900px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}article{min-width:0;background:#202b3b;border:1px solid #4d5c70;border-radius:14px;overflow:hidden}article img{display:block;width:100%;aspect-ratio:941/1672;object-fit:cover}.caption{padding:10px 12px 13px}.caption strong,.caption span,.caption small{display:block}.caption span{margin-top:3px}.caption small{color:#b9d4ee;margin-top:4px}a:focus-visible{outline:3px solid #ffe08a}@media(max-width:720px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:480px){main{padding:12px}.grid{gap:7px}.caption{padding:7px;font-size:12px}.caption small{font-size:10px}}</style></head><body><main><h1>Prethodni V8 pregled</h1><p>Kraljevski Ametist V6 i Pustinjsko Staklo V8 verzija 2 su prihvaćeni i zaključani. Ostale V8 slike su sačuvane kao prethodni predlozi; za četiri teme pripremljene su nove V9 verzije. Klik na sliku otvara punu veličinu.</p>${sections}<section><h2>Prihvaćeno i zaključano</h2><div class="grid">${card({nameSr:'Kraljevski Ametist'}, {...manifest.acceptedRoyal,label:'V6 — prihvaćena'})}${card({nameSr:'Pustinjsko Staklo'}, {...manifest.acceptedDesert,label:'V8 verzija 2 — prihvaćena'})}</div></section></main></body></html>\n`;
fs.writeFileSync(path.join(root, manifest.reviewPage), html);
process.stdout.write('Recorded V8 decisions, including locked Desert Glass variant 2.\n');
