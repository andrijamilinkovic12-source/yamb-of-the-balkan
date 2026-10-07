// Inventory five historical V6 proposals and preserve five accepted backgrounds.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-definitions.json'), 'utf8'));
const v4 = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-backgrounds-v4.json'), 'utf8'));
const ids = ['light', 'medium', 'winter', 'desert', 'moon'];
const decisions = {
    light: { reviewStatus: 'revision-requested', reviewFeedback: 'Dopadljiva kompozicija i svetlo; smanjiti mediteranski stil kuca.' },
    medium: { reviewStatus: 'revision-requested', reviewFeedback: 'Dopadljiv enterijer; zameniti mediteranske krovove i kuce iza prozora.' },
    winter: { reviewStatus: 'rejected-by-user', reviewFeedback: 'Zameniti grckim ostrvskim kadrom sa belim kucama, plavim prozorima i otvorenim morem.' },
    desert: { reviewStatus: 'direction-liked-more-variants-requested', reviewFeedback: 'Pravac se dopada; korisnik zeli dodatne verzije pre konacnog izbora.' },
    moon: { reviewStatus: 'direction-liked-more-variants-requested', reviewFeedback: 'Pravac se dopada; korisnik zeli dodatne verzije pre konacnog izbora.' }
};
const sceneTypes = {
    light: 'Gradsko dvorište iz povišenog ugla',
    medium: 'Enterijer stare sobe',
    winter: 'Otvoreni pogled na more',
    desert: 'Blizak geološki kadar',
    moon: 'Lunarna osmatračnica spolja'
};
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function png(relative) {
    const bytes = fs.readFileSync(path.join(root, relative));
    if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`Invalid PNG: ${relative}`);
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    if (![940, 941].includes(width) || height !== 1672) throw new Error(`Unexpected PNG size ${width}x${height}: ${relative}`);
    return { width, height, sizeBytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
}

const accepted = [
    { themeId: 'dark', nameSr: 'Zelena', path: 'www/assets/green-clay-balkan-diorama-v4.png', status: 'accepted-locked' },
    ...['neon', 'severna'].map(themeId => {
        const locked = spec.backgroundCandidatePolicy.approvedV4Backgrounds[themeId];
        const old = v4.themes.find(item => item.themeId === themeId);
        if (!locked?.locked || !old || old.reviewStatus !== 'accepted-locked') throw new Error(`Missing approved V4 background: ${themeId}`);
        const measured = png(locked.path);
        if (measured.sha256 !== locked.sha256 || measured.sha256 !== old.sha256) throw new Error(`Approved image changed: ${themeId}`);
        return { themeId, nameSr: old.nameSr, path: locked.path, status: 'accepted-locked', sha256: measured.sha256 };
    }),
    (() => {
        const locked = spec.backgroundCandidatePolicy.approvedV6Backgrounds.easter;
        const measured = png(locked.path);
        if (!locked.locked || locked.version !== 1 || measured.sha256 !== locked.sha256) throw new Error('Accepted Easter V6 version 1 changed.');
        return { themeId: 'easter', nameSr: 'Vaskršnja — verzija 1', path: locked.path, status: 'accepted-locked', sha256: measured.sha256 };
    })(),
    (() => {
        const locked = spec.backgroundCandidatePolicy.approvedV6Backgrounds.amethyst;
        const measured = png(locked.path);
        if (!locked.locked || measured.sha256 !== locked.sha256) throw new Error('Accepted Royal Amethyst V6 changed.');
        return { themeId: 'amethyst', nameSr: 'Kraljevski Ametist — V6', path: locked.path, status: 'accepted-locked', sha256: measured.sha256 };
    })()
];

const themes = ids.map(themeId => {
    const theme = spec.themes.find(item => item.id === themeId);
    if (!theme) throw new Error(`Missing theme: ${themeId}`);
    const masterPath = `source-assets/theme-backgrounds-v6/${themeId}-background-master-v6.png`;
    return {
        themeId,
        nameSr: theme.nameSr,
        style: theme.style,
        directionId: theme.direction,
        direction: spec.directions[theme.direction].name,
        sceneType: sceneTypes[themeId],
        masterPath,
        ...png(masterPath),
        ...(decisions[themeId] || { reviewStatus: 'pending-user-review' }),
        runtimeLinked: false
    };
});

const manifest = {
    schemaVersion: 1,
    createdOn: '2026-10-06',
    sourceDefinitions: 'docs/theme-definitions.json',
    sourcePrompts: 'docs/theme-background-prompts-v6.md',
    reviewPage: 'docs/theme-backgrounds-v6-review.html',
    contactSheet: 'docs/theme-backgrounds-v6-contact-sheet.png',
    status: 'Five accepted backgrounds. Light Gold and Dark Cherry V6 need less Mediterranean architecture; Blue Ocean V6 and V7 are rejected. Desert Glass and Moonlight V6 remain as comparison references for V8. No new runtime links.',
    easterVariants: [
        { version: 1, path: 'source-assets/theme-backgrounds-v6/easter-background-variant-1-v6.png', label: 'Prva verzija: prolećna soba, više predmeta', status: 'accepted-locked', ...png('source-assets/theme-backgrounds-v6/easter-background-variant-1-v6.png') },
        { version: 2, path: 'source-assets/theme-backgrounds-v6/easter-background-master-v6.png', label: 'Druga verzija: pročišćena soba i dva jajeta', status: 'rejected-after-comparison', ...png('source-assets/theme-backgrounds-v6/easter-background-master-v6.png') }
    ],
    accepted,
    themes
};
fs.writeFileSync(path.join(root, 'docs/theme-backgrounds-v6.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const card = (item, label, extra) => `<article><a href="../${escape(item.path || item.masterPath)}" target="_blank"><img src="../${escape(item.path || item.masterPath)}" alt="${escape(item.nameSr)} pozadina"></a><h3>${escape(item.nameSr)}</h3><p>${escape(label)}${extra ? ` · ${escape(extra)}` : ''}</p></article>`;
const acceptedCards = accepted.map(item => card(item, 'Prihvaćena i zaključana', '')).join('');
const candidateCards = themes.map(item => card(item, item.reviewStatus === 'revision-requested' ? 'Dopada se; traži doradu' : item.reviewStatus === 'rejected-by-user' ? 'Odbijena V6 verzija' : 'Dopada se pravac; traži se izbor između više verzija', item.reviewFeedback || item.sceneType)).join('');
const easterCards = manifest.easterVariants.map(item => card({ nameSr: `Vaskršnja — verzija ${item.version}`, path: item.path }, item.version === 1 ? 'Definitivno prihvaćena' : 'Prethodna alternativa', item.label)).join('');
const blueV7Card = card({ nameSr: 'Plavi Okean — V7', path: 'source-assets/theme-backgrounds-v7/winter-background-master-v7.png' }, 'Odbijen: previše realističan', 'Grčki ostrvski smer ostaje za kasniju izradu');
const html = `<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pozadine tema — V6 pregled</title><style>*{box-sizing:border-box}body{margin:0;background:#101720;color:#f1f5f9;font:16px/1.45 Arial,sans-serif}main{max-width:1240px;margin:auto;padding:24px}h1{margin:0 0 8px}h2{margin:28px 0 10px}p{color:#c6d2df}.intro{max-width:900px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}article{background:#1b2938;border:1px solid #3d5369;border-radius:14px;padding:9px}article img{display:block;width:100%;aspect-ratio:941/1672;object-fit:cover;border-radius:9px}article h3{margin:9px 4px 0;font-size:17px}article p{margin:2px 4px 6px;font-size:13px}@media(max-width:740px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:460px){main{padding:10px}.grid{gap:7px}article{padding:5px}article h3{font-size:13px}article p{font-size:11px}}</style></head><body><main><h1>Pet prihvaćenih, ostale u pregledu</h1><p class="intro">Zelena, Neon Cyber, Severna Maglina, Vaskršnja verzija 1 i Kraljevski Ametist V6 su prihvaćene pozadine. Svetlo Zlato i Trula Višnja V6 traže doradu. Plavi Okean V6 i V7 su odbijeni. Pustinjsko Staklo i Mesečev Sjaj V6 ostaju kao reference za izbor novih V8 verzija. Klik na sliku otvara punu veličinu. Novi predlozi još nisu povezani sa igrom.</p><h2>V6 slike i njihovi statusi</h2><div class="grid">${candidateCards}</div><h2>Vaskršnja — dve verzije u ovoj seriji</h2><p>Verzija 1 je definitivno prihvaćena. Verzija 2 ostaje samo prethodna alternativa.</p><div class="grid">${easterCards}</div><h2>Prihvaćene pozadine</h2><div class="grid">${acceptedCards}</div></main></body></html>\n`;
const review = html.replace('<h2>V6 slike i njihovi statusi</h2>', `<h2>Plavi Okean — odbijeni V7</h2><div class="grid">${blueV7Card}</div><h2>V6 slike i njihovi statusi</h2>`);
fs.writeFileSync(path.join(root, manifest.reviewPage), review);
process.stdout.write('Recorded V6 decisions; Blue Ocean V7 is rejected.\n');
