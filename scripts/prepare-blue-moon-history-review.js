// Build a complete visual inventory of retained Blue Ocean and Moonlight concepts.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const entries = {
    winter: {
        nameSr: 'Plavi Okean',
        versions: [
            ['V1 — prvi pokušaj', 'source-assets/theme-backgrounds-v1/winter-background-master-v1.png', 'odbijena'],
            ['V3', 'source-assets/theme-backgrounds-v3/winter-background-master-v3.png', 'odbijena'],
            ['V4', 'source-assets/theme-backgrounds-v4/winter-background-master-v4.png', 'odbijena'],
            ['V6', 'source-assets/theme-backgrounds-v6/winter-background-master-v6.png', 'odbijena'],
            ['V7 — grčko ostrvo', 'source-assets/theme-backgrounds-v7/winter-background-master-v7.png', 'odbijena: previše realistična'],
            ['V8 — Santorini', 'source-assets/theme-backgrounds-v8/winter-background-master-v8.png', 'odbijena'],
            ['V9 — bele kockaste kuće', 'source-assets/theme-backgrounds-v9/winter-background-master-v9.png', 'odbijena'],
            ['V10 — radna grčka luka', 'source-assets/theme-backgrounds-v10/winter-background-working-1-v10.png', 'radna skica, nije ponuđena za izbor'],
            ['V10 — grčka luka', 'source-assets/theme-backgrounds-v10/winter-background-master-v10.png', 'luka se dopada; planine za doradu'],
            ['V11 — dorađene planine', 'source-assets/theme-backgrounds-v11/winter-background-master-v11.png', 'sačuvana za poređenje'],
            ['V12 — Atina i Pirej', 'source-assets/theme-backgrounds-v12/winter-background-master-v12.png', 'dobar pravac; planine za doradu'],
            ['V13 — mat-plastične planine', 'source-assets/theme-backgrounds-v13/winter-background-master-v13.png', 'prihvaćena i zaključana']
        ]
    },
    moon: {
        nameSr: 'Mesečev Sjaj',
        versions: [
            ['V1 — prvi pokušaj', 'source-assets/theme-backgrounds-v1/moon-background-master-v1.png', 'odbijena'],
            ['V3', 'source-assets/theme-backgrounds-v3/moon-background-master-v3.png', 'odbijena'],
            ['V4', 'source-assets/theme-backgrounds-v4/moon-background-master-v4.png', 'odbijena'],
            ['V6 — raniji smer', 'source-assets/theme-backgrounds-v6/moon-background-master-v6.png', 'pravac se dopao, bez prihvatanja'],
            ['V8 — verzija 1', 'source-assets/theme-backgrounds-v8/moon-background-variant-1-v8.png', 'odbijena'],
            ['V8 — verzija 2', 'source-assets/theme-backgrounds-v8/moon-background-variant-2-v8.png', 'odbijena'],
            ['V9 — opservatorija i Zemlja', 'source-assets/theme-backgrounds-v9/moon-background-master-v9.png', 'odbijena'],
            ['V10 — radna skica 1', 'source-assets/theme-backgrounds-v10/moon-background-working-1-v10.png', 'radna skica, nije ponuđena za izbor'],
            ['V10 — radna skica 2', 'source-assets/theme-backgrounds-v10/moon-background-working-2-v10.png', 'izabrana kao pravac'],
            ['V10 — površina Meseca', 'source-assets/theme-backgrounds-v10/moon-background-master-v10.png', 'nije izabrana'],
            ['V11 — glinena skica 2', 'source-assets/theme-backgrounds-v11/moon-background-master-v11.png', 'nije prihvaćena; zvezde su odbačene'],
            ['V12 — površina bez zvezda', 'source-assets/theme-backgrounds-v12/moon-background-master-v12.png', 'prethodni kadar: krater levo'],
            ['V14 — krater desno', 'source-assets/theme-backgrounds-v14/moon-background-master-v14.png', 'prihvaćena i zaključana']
        ]
    }
};
const png = relative => {
    const bytes = fs.readFileSync(path.join(root, relative));
    if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`Invalid PNG: ${relative}`);
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), sizeBytes: bytes.length,
        sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
};
const themes = Object.entries(entries).map(([themeId, entry]) => ({ themeId, nameSr: entry.nameSr,
    versions: entry.versions.map(([label, imagePath, status]) => ({ label, path: imagePath, status, ...png(imagePath) })) }));
const manifest = { schemaVersion: 1, createdOn: '2026-10-06',
    purpose: 'Sve sačuvane različite slike Plavog Okeana i Mesečevog Sjaja dostupne za poređenje.',
    note: 'V1 standardized PNG je isti kadar u drugoj dimenziji. V5 PNG-ovi su ranije obrisani po odluci korisnika. Za V2 nema sačuvanih PNG-ova.',
    reviewPage: 'docs/theme-blue-moon-all-versions.html',
    contactSheets: { winter: 'docs/theme-blue-all-versions.png', moon: 'docs/theme-moon-all-versions.png' },
    themes };
fs.writeFileSync(path.join(root, 'docs/theme-blue-moon-all-versions.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const esc = value => String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
const sections = themes.map(theme => `<section id="${theme.themeId}"><h2>${esc(theme.nameSr)} — ${theme.versions.length} sačuvanih slika</h2><div class="grid">${theme.versions.map(item => `<article><a href="../${esc(item.path)}" target="_blank"><img src="../${esc(item.path)}" alt="${esc(theme.nameSr)} ${esc(item.label)}"></a><div class="caption"><strong>${esc(item.label)}</strong><span>${esc(item.status)}</span></div></article>`).join('')}</div></section>`).join('');
const html = `<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sve verzije — Plavi Okean i Mesečev Sjaj</title><style>*{box-sizing:border-box}body{margin:0;background:#101723;color:#f5f7fb;font:16px/1.4 Arial,sans-serif}main{max-width:1300px;margin:auto;padding:24px}h1{margin:0 0 8px}h2{margin:35px 0 12px}p{color:#cad5e3;max-width:950px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}article{min-width:0;background:#1d2a3a;border:1px solid #465870;border-radius:13px;overflow:hidden}img{display:block;width:100%;aspect-ratio:2/3;object-fit:cover}.caption{padding:9px 12px 12px}.caption strong,.caption span{display:block}.caption span{color:#bfd4e7;margin-top:3px;font-size:13px}a{color:#cde5ff}a:focus-visible{outline:3px solid #ffe08a}@media(max-width:800px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:480px){main{padding:10px}.grid{gap:7px}.caption{padding:6px;font-size:12px}.caption span{font-size:10px}}</style></head><body><main><h1>Sve sačuvane verzije</h1><p>Plavi Okean i Mesečev Sjaj su odvojeni po temama. Svaka slika ima broj verzije i status; klik otvara punu veličinu. Plavi Okean V13 i Mesec V14 su prihvaćeni i zaključani. V5 slike su uklonjene ranije, a V1 standardizovana kopija nije zasebna scena.</p><p><a href="#winter">Plavi Okean</a> · <a href="#moon">Mesečev Sjaj</a></p>${sections}</main></body></html>\n`;
fs.writeFileSync(path.join(root, manifest.reviewPage), html);
process.stdout.write(`Recorded ${themes[0].versions.length} Blue Ocean and ${themes[1].versions.length} Moonlight retained images.\n`);
