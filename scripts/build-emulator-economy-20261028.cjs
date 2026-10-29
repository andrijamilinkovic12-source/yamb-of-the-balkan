const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.env.YAMB_SHARP_PATH || 'sharp');
const { resolve: resolveQuality } = require('../www/theme-quality-assets.js');
const root = path.resolve(__dirname, '..');
const raw = path.join(root, 'tmp/emulator-economy-2026-10-28');
const out = path.join(root, 'docs/theme-visual-audit/emulator-economy-2026-10-28');
const themes = [['dark','Zelena'],['light','Svetlo zlato'],['medium','Trula višnja'],['winter','Plavi okean'],['neon','Neon Cyber'],['amethyst','Kraljevski ametist'],['easter','Vaskršnja'],['desert','Pustinjsko staklo'],['moon','Mesečev sjaj'],['severna','Severna maglina']];
const entries = [];
const results = themes.map(([theme,name]) => {
    const prefix = theme === 'dark' ? 'assets/green-soft-clay/' : `assets/theme-packs/${theme}/`;
    const critical = ['easter','desert','severna'].includes(theme);
    const variant = file => critical ? file.replace('-v1.png','-v2.png') : file;
    const canonical = {
        identity: `${prefix}ducats-undo-free-v${['winter','desert','moon','severna'].includes(theme) ? 4 : 3}.png`,
        ducatFront: prefix + variant('canonical/ducat/ducat-front-v1.png'),
        ducatInline: prefix + variant('canonical/ducat/ducat-inline-v1.png'),
        undoFront: prefix + variant('canonical/undo-token/undo-token-front-v1.png'),
        undoInline: prefix + variant('canonical/undo-token/undo-token-inline-v1.png'),
        videoActive: prefix + variant('canonical/rewarded-video/rewarded-video-active-v1.png'),
        videoUnavailable: prefix + variant('canonical/rewarded-video/rewarded-video-unavailable-v1.png'),
        close: prefix + 'canonical/room-controls/close-v1.png'
    };
    const sources = Object.fromEntries(Object.entries(canonical).map(([role,source]) => [role, { canonical: source, resolved: resolveQuality(source) }]));
    const files = [theme === 'dark' ? 'dark-ducats-ready' : `${theme}-ducats`, theme === 'dark' ? 'dark-undo-ready' : `${theme}-undo`];
    files.forEach((file,index) => entries.push({file,theme,title:`${name} — ${index ? 'Ispravi zadnji upis' : 'Dukati'}`,note:'Stvarni Android prikaz. Nagradno dugme nije pritiskano; snimak nije dokaz isplate ili nedostupnog oglasa.'}));
    return {theme,name,pngFiles:8,semanticRoles:6,sources,evidence:files.map(file=>file+'.jpg')};
});
entries.push(
    {file:'dark-undo-320-top',theme:'extra',title:'Zelena — kratak ekran320×568',note:'Opis se skroluje unutar panela; zaglavlje i tabovi ostaju fiksni. Native baner je učitan pre privremene promene rezolucije; njegov prelom nije dokaz stabilnog320px pokretanja.'},
    {file:'dark-undo-320-bottom',theme:'extra',title:'Zelena — dno panela320×568',note:'Posle unutrašnjeg skrola dostupni su stanje tokena i nagradna kartica; ne izlaze iz širine panela.'},
    {file:'dark-menu-restored-original',theme:'extra',title:'Vraćeno početno okruženje',note:'Zelena, originalnih1440×3120 /560dpi, prijava očuvana.'}
);
const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const card = entry => `<article><h3>${esc(entry.title)}</h3><p>${esc(entry.note)}</p><a href="${entry.file}.jpg"><img loading="lazy" src="${entry.file}.jpg" alt="${esc(entry.title)}"></a></article>`;
(async () => {
    const notesPath = path.join(raw,'review-notes.json');
    if (!fs.existsSync(notesPath)) throw Error('Final review notes must be completed before publishing evidence.');
    const notes = JSON.parse(fs.readFileSync(notesPath,'utf8'));
    if (notes.themes?.length !== 10) throw Error('Ten theme assessments required.');
    for (const row of results) {
        const assessment = notes.themes.find(item=>item.theme === row.theme);
        if (!assessment?.status || !assessment?.observed) throw Error(`Missing actual assessment ${row.theme}`);
        Object.assign(row, assessment);
    }
    const report = {
        date:'2026-10-28',room:'Dukati i ispravi zadnji upis',
        scope:'Stvarni Android pregled oba taba u svih deset tema na360×780. Dodatno Green unutrašnji skrol na320×568. Nije test isplate nagrade.',
        device:{avd:'Easter_QA_10GB',logicalViewport:[360,780],pixels:[1080,2340],density:480,extraViewport:[320,568],restoredPixels:[1440,3120],restoredDensity:560,physicalS25:false},
        deployment:'Pregledana postojeća objavljena aplikacija. Prethodne lokalne izmene nisu commitovane/deployovane; ovaj prolaz ih ne potvrđuje.',
        ...notes,
        checks:{command:'npm run check:theme-economy-final',result:'PASS: deset tema/dva taba, osam PNG fajlova u šest semantičkih uloga, uklonjene stare aktivne SVG/legacy putanje, prethodno sačuvana Green geometrija i tipografija na tri viewporta, statički kontrast i regresije nagradnog toka.',minimumCheckedNonGreenTextContrast:4.68,note:'Statičke provere i raniji izračunati rasporedi su zaseban dokaz; ne potvrđuju produkcionu reklamu/server isplatu.'},
        limits:['Nisu pritiskani nagradni video, kupovina/preuzimanje ili ispravka poteza. Stvarna isplata, uspešna/neuspešna nagrada i potvrde nisu testirani u emulatoru.','Nedostupan video i mrežne greške nisu namerno izazivani. Ne tvrdi se vizuelna potvrda svakog retkog stanja.','Tačno trajanje intra i fluidnost nisu mereni screenshotima. Soba nema poseban završni ekran.','Green320px provera koristi normalnu font skalu, ne130%. Ostale teme imaju novi360px dokaz; raniji320px/130% rasporedi ostaju zasebna statička evidencija.','Ovo nije fizički Samsung S25 test niti dokaz da je prvi hladni transfer teme trenutan.'],
        results,entries
    };
    fs.mkdirSync(out,{recursive:true});
    for(const entry of entries) await sharp(path.join(raw,entry.file+'.png')).resize({width:540}).jpeg({quality:88,chromaSubsampling:'4:4:4'}).toFile(path.join(out,entry.file+'.jpg'));
    fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
    fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="sr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dukati / Ispravi upis — emulator28.10.</title><style>*{box-sizing:border-box}body{background:#14232e;color:#edf5fc;font:16px/1.5 system-ui;margin:0;padding:24px}main{max-width:1400px;margin:auto}a{color:#afe4ff}article{background:#233847;border:1px solid #7997a9;border-radius:12px;padding:16px}nav{display:flex;gap:12px;flex-wrap:wrap;margin:20px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}img{width:100%;height:auto}h2{font-size:21px}h3{font-size:18px}p{max-width:100ch}</style><main><h1>Dukati i ispravi zadnji upis — svih deset tema</h1><p>Stvarni emulator28.10.2026.</p><p>${esc(report.scope)}</p><p><b>${esc(report.outcome)}</b></p><p>${esc(report.deployment)}</p><nav><a href="report.json">Puna evidencija i PNG putanje</a><a href="../emulator-checkpoint.md">Presek stanja</a>${results.map(row=>`<a href="#${row.theme}">${esc(row.name)}</a>`).join('')}</nav><h2>Granice provere</h2><ul>${report.limits.map(limit=>`<li>${esc(limit)}</li>`).join('')}</ul><p>${esc(report.checks.result)} Najmanji kontrast proverenih nezelenih paletnih parova4,68:1.</p>${results.map(row=>`<section id="${row.theme}"><h2>${esc(row.name)} — ${esc(row.status)}</h2><p>${esc(row.observed)}</p><div class="grid">${entries.filter(e=>e.theme===row.theme).map(card).join('')}</div></section>`).join('')}<h2>Dodatni dokazi</h2><div class="grid">${entries.filter(e=>e.theme==='extra').map(card).join('')}</div><p>${esc(report.safety)}</p><p>${esc(report.restoration)}</p></main></html>`);
    console.log(`Economy: ${results.length} themes, ${entries.length} scoped screenshots.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
