// Build a review index from the design registry and progress evidence.
// Palette miniatures are schematic; only linked PNGs/captures are actual visuals.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-definitions.json'), 'utf8'));
const progress = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-progress.json'), 'utf8'));
const output = path.join(root, 'docs/theme-review-board.html');
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const image = (relative, label) => relative
    ? `<img src="../${escape(relative)}" alt="${escape(label)}" loading="lazy">`
    : `<div class="empty">Čeka finalni PNG / snimak</div>`;
const capture = (relative, title) => `<div class="capture"><b>${escape(title)}</b>${image(relative, title)}</div>`;

const sections = spec.themes.map(theme => {
    const record = progress.themes.find(item => item.themeId === theme.id);
    if (!record) throw new Error(`Missing progress record: ${theme.id}`);
    const palette = theme.paletteHex;
    const colors = palette
        ? `<div class="swatches">${['background', 'surface', 'raised', 'text', 'primary', 'accent'].map(key => `<div class="swatch"><span style="background:${palette[key]}"></span><small>${key}<br>${palette[key]}</small></div>`).join('')}</div>`
        : '<p>Paleta Zelene ostaje u aktivnom CSS-u i manifestu; ovde nije redefinisana.</p>';
    const miniature = palette
        ? `<div class="schematic" style="--bg:${palette.background};--surface:${palette.surface};--text:${palette.text};--primary:${palette.primary};--on-primary:${palette.onPrimary};--border:${palette.border}"><div class="mini-card"><strong>Kartica menija</strong><button>Akcija</button></div><div class="mini-board"><strong>Tabla — skica boja</strong><div class="mini-grid">${Array.from({ length: 15 }, (_, index) => `<i>${index % 5 === 0 ? 'Y' : ''}</i>`).join('')}</div></div></div>`
        : '<div class="empty">Za Zelenu proveriti stvarne kartice i tablu u aplikaciji.</div>';
    const iconDna = theme.iconDna;
    const iconPlan = iconDna.colorsHex
        ? `<div class="icon-plan"><h3>Plan boja Icon Pack-a</h3><div class="swatches">${['body', 'light', 'shade', 'accent'].map(key => `<div class="swatch"><span style="background:${iconDna.colorsHex[key]}"></span><small>${key}<br>${iconDna.colorsHex[key]}</small></div>`).join('')}</div><p>${escape(iconDna.silhouette)}</p><small>Dukat: ${escape(iconDna.coinFace)} Akcenat zauzima najviše približno 10% ikone. Ovo je pravilo za izradu, ne završeni PNG.</small></div>`
        : '<div class="icon-plan"><h3>Green Icon Pack</h3><p>Zaključana referenca; nema nove palete niti preuzimanja motiva u druge teme.</p></div>';
    const visuals = record.visualEvidence;
    const icons = visuals.representativeIconPngs.length
        ? visuals.representativeIconPngs.map((asset, index) => image(asset, `${theme.nameSr} ikonica ${index + 1}`)).join('')
        : '<div class="empty">Čeka najmanje šest originalnih PNG ikonica, uključujući dukat.</div>';
    return `<section class="theme" id="${escape(theme.id)}"><header><div><h2>${escape(theme.nameSr)}</h2><p>${escape(theme.mainPack)} · ${escape(spec.sharedStyle)} · ${escape(spec.directions[theme.direction].name)}</p></div><span class="stage">${escape(record.themeStage)}</span></header><div class="two"><div><h3>Paleta i geometrijska skica</h3>${colors}${miniature}<small>Skica prikazuje samo definisane boje i zajedničku geometriju. Ne predstavlja finalni materijal niti QA.</small>${iconPlan}</div><div><h3>Stvarna pozadina i logo</h3><div class="visual-pair"><div>${image(visuals.backgroundPng, `${theme.nameSr} pozadina`)}</div><div>${image(visuals.logoPng, `${theme.nameSr} logo`)}</div></div></div></div><h3>Originalne ikonice</h3><div class="icons">${icons}</div><h3>Dokazi iz aplikacije</h3><div class="captures">${capture(visuals.menuCardCapture, 'Kartica: normalno / pritisnuto / onemogućeno')}${capture(visuals.gameBoardCapture, 'Tabla, kockice i kolone')}${capture(visuals.roomIntroCapture, 'Jedan kadar ulaza u sobu')}${capture(visuals.srNarrowCapture, 'SR na uskom ekranu')}${capture(visuals.enNarrowCapture, 'EN na uskom ekranu')}</div></section>`;
}).join('\n');

const html = `<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pregled izgleda svih tema</title><style>
*{box-sizing:border-box}body{margin:0;background:#101720;color:#edf2f7;font:15px/1.5 Arial,sans-serif}main{max-width:1280px;margin:auto;padding:24px}h1{margin:0 0 6px}h2,h3{margin:0 0 10px}h3{font-size:17px}p{margin:0 0 12px}.intro{max-width:850px;color:#cbd5df;margin-bottom:28px}.theme{background:#1c2733;border:1px solid #405061;border-radius:20px;padding:22px;margin-bottom:24px}.theme header{display:flex;justify-content:space-between;gap:16px;align-items:start;margin-bottom:16px}.theme header p{color:#b9c7d5}.stage{border:1px solid #688197;border-radius:999px;padding:4px 10px;white-space:nowrap}.two{display:grid;grid-template-columns:1fr 1fr;gap:22px}.swatches{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}.swatch{display:flex;gap:7px;align-items:center}.swatch span{display:block;width:32px;height:32px;flex:none;border-radius:8px;border:1px solid #708090}.swatch small{font-size:11px}.schematic{display:flex;gap:10px;align-items:stretch;background:var(--bg);padding:14px;border-radius:14px;min-height:145px}.mini-card,.mini-board{background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:20px;padding:12px;flex:1;display:flex;flex-direction:column;gap:10px}.mini-card button{background:var(--primary);color:var(--on-primary);border:0;border-radius:12px;padding:8px}.mini-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:3px}.mini-grid i{height:14px;border:1px solid var(--border);border-radius:3px;text-align:center;font:10px Arial}.visual-pair{display:grid;grid-template-columns:1fr 1fr;gap:10px;min-height:160px}.visual-pair>div,.capture{background:#111b25;border:1px dashed #526578;border-radius:12px;overflow:hidden;display:flex;justify-content:center;align-items:center;min-height:150px}.visual-pair img{display:block;width:100%;max-height:260px;object-fit:contain}.empty{color:#a9baca;text-align:center;padding:18px;font-size:13px}.icons{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:20px}.icons img{width:100%;height:112px;object-fit:contain;background:#101923;border-radius:10px}.captures{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.capture{min-height:160px;flex-direction:column;justify-content:flex-start;padding:8px}.capture b{font-size:12px;min-height:36px}.capture img{max-width:100%;max-height:260px;object-fit:contain}small{color:#b9c7d5}@media(max-width:800px){.two{grid-template-columns:1fr}.captures{grid-template-columns:repeat(2,1fr)}.icons{grid-template-columns:repeat(3,1fr)}}@media(max-width:480px){main{padding:12px}.theme{padding:14px}.swatches{grid-template-columns:repeat(2,1fr)}.captures{grid-template-columns:1fr}.schematic{flex-direction:column}}
.icon-plan{margin-top:18px;padding:14px;border:1px solid #526578;border-radius:14px;background:#15212e}.icon-plan .swatches{grid-template-columns:repeat(4,minmax(0,1fr))}.icon-plan p{font-size:13px;color:#e0e8f1}.icon-plan small{display:block;font-size:12px}
</style></head><body><main><h1>Pregled izgleda svih tema</h1><p class="intro">Deset tema deli 3D Soft Neomorphism. Devet tema ima ciljnu paletu i skicu rasporeda; finalni izgled se potvrđuje tek stvarnim PNG-ovima i snimcima iz aplikacije. Zelena je zaključana referenca. Prazna polja označavaju dokaze koji tek treba da nastanu.</p>${sections}</main></body></html>\n`;
if (process.argv.includes('--write')) {
    fs.writeFileSync(output, html);
    process.stdout.write(`Wrote review board for ${spec.themes.length} themes.\n`);
} else {
    if (fs.readFileSync(output, 'utf8') !== html) throw new Error('Review board is stale; run with --write.');
    process.stdout.write(`Verified review board for ${spec.themes.length} themes.\n`);
}
