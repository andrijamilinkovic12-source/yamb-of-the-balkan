const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.env.YAMB_SHARP_PATH || 'sharp');
const root = path.resolve(__dirname, '..');
const raw = path.join(root, 'tmp/emulator-global-chat-2026-10-27');
const out = path.join(root, 'docs/theme-visual-audit/emulator-global-chat-2026-10-27');
const themes = [
    ['dark', 'Zelena', 'Krem/zeleno mastilo i Clay površine.'],
    ['light', 'Svetlo zlato', 'Tamno mastilo na svetloj zlatnoj podlozi.'],
    ['medium', 'Trula višnja', 'Svetlo mastilo na bordo površinama.'],
    ['winter', 'Plavi okean', 'Tamno mastilo na svetlim plavim površinama.'],
    ['neon', 'Neon Cyber', 'Svetlo mastilo, taman panel i ograničeni cijan akcenti.'],
    ['amethyst', 'Kraljevski ametist', 'Ljubičasti panel, svetlo mastilo i zlatni fokus.'],
    ['easter', 'Vaskršnja', 'Krem/salvija površine i tamno mastilo; novi tematski PNG.'],
    ['desert', 'Pustinjsko staklo', 'Pesak/terakota površine i tamno mastilo; novi tematski PNG.'],
    ['moon', 'Mesečev sjaj', 'Tamnosive površine, srebrni PNG i svetlo mastilo.'],
    ['severna', 'Severna maglina', 'Tamna plava podloga, svetlo mastilo i plavi PNG.']
];
const entries = [];
const results = themes.map(([theme, name, note]) => {
    const empty = theme === 'dark' ? 'dark-chat-history' : `${theme}-chat`;
    const keyboard = theme === 'dark' ? 'dark-chat-keyboard-empty' : `${theme}-chat-keyboard`;
    entries.push({ file: empty, theme, title: `${name} — prazna istorija`, note });
    entries.push({ file: keyboard, theme, title: `${name} — tastatura`, note: 'Prazan unos 0/550, slanje i broj znakova ostaju iznad tastature. Bez preklapanja sa sistemskom navigacijom.' });
    const base = theme === 'dark' ? 'assets/green-soft-clay' : `assets/theme-packs/${theme}`;
    return {
        theme, name, status: 'prihvatljiv u pregledanim stanjima',
        observed: ['ulazak u sobu', 'prazna istorija', 'naslov i online oznaka', 'prazan unos bez tastature', 'prazan unos sa tastaturom', 'povratak u glavni meni'],
        visualResult: note + ' Geometrija i tipografija vizuelno odgovaraju Zelenoj; nema odsečenog teksta ili footera u sistemskoj zoni.',
        pngCount: 4,
        sources: {
            identity: `${base}/canonical/global-chat-room-identity/global-chat-room-v1.png`,
            empty: theme === 'dark' ? `${base}/global-chat-empty-v1.png` : `${base}/canonical/global-chat-internal/empty-state-v1.png`,
            send: theme === 'dark' ? `${base}/global-chat-send-v1.png` : `${base}/canonical/global-chat-internal/send-v1.png`,
            close: `${base}/canonical/room-controls/close-v1.png`
        },
        evidence: [empty + '.jpg', keyboard + '.jpg']
    };
});
entries.push({ file: 'dark-chat-open', theme: 'dark', title: 'Zelena — početna potvrda pravila', note: 'Stvarno prikazana i prihvaćena pri prvom ulasku. Potvrda pravila u ostalih devet tema nije ponavljana; njen kontrast je zasebna statička provera.' });
entries.push({ file: 'dark-menu-restored-original', theme: 'dark', title: 'Vraćeno početno okruženje', note: 'Zelena i originalnih 1440×3120 / 560dpi. Prijava očuvana, tastatura zatvorena, show_ime_with_hard_keyboard vraćen sa 1 na početnih 0.' });
const report = {
    date: '2026-10-27', room: 'Globalni chat',
    scope: 'Stvarni Android UI pregled svih deset tema: ulazak, prazna istorija, zaglavlje/online oznaka, kanonski PNG, unos sa zatvorenom i otvorenom tastaturom i izlazak.',
    device: { avd: 'Easter_QA_10GB', physicalPixelsDuringReview: [1080, 2340], density: 480, logicalViewport: [360, 780], restoredPixels: [1440, 3120], restoredDensity: 560, physicalS25Test: false },
    deployment: 'Pregledana je postojeća objavljena verzija. Ranije lokalne dorade R07/R12/R14/R15 nisu commitovane ni deployovane na zahtev korisnika; ovi snimci nisu potvrda tih dorada.',
    outcome: 'U pregledanim stanjima svih deset tema nisu nađeni novi vizuelni problemi. Nije menjana implementacija Globalnog chata niti kreiran dodatni PNG.',
    limits: [
        'Istorija je bila prazna u svim temama. Stvarne poruke, duge poruke, avatari, meni drugog igrača i potvrda prijave poruke nisu vizuelno potvrđeni ovim prolazom.',
        'Početna potvrda pravila stvarno je pregledana samo u Zelenoj. Ostale palete imaju statičke provere; ne tvrdi se novi Android dokaz za sve potvrde.',
        'Pregled nije fizički Samsung S25, merenje hladnog mrežnog cache-a niti merenje tačnog trajanja intra. Podešeno čekanje u alatu nije latencija aplikacije.',
        'Četiri putanje označavaju uloge unutar same sobe. PNG menija/intro izvedenice i avatari nisu sabrani kao dodatni novi identiteti.'
    ],
    staticChecks: {
        command: 'npm run check:theme-global-chat-final',
        activePngPerTheme: 4, uniqueHashesPerRole: 10,
        legacyReferences: 'Nema starih Easter/Desert/Severna Global Chat rezervnih PNG putanja ni SVG u aktivnom markup-u sobe.',
        savedLayoutViewports: ['411×891', '320×568', '768×1024', '320×568 sa font130%'],
        savedLayoutTextContrastMinimum: 4.59, paletteAndNoticeContrastMinimum: 4.54,
        evidenceNote: 'Sačuvani izračunati rasporedi i paletni parovi su zaseban statički dokaz, ne novi Android snimci tih viewporta.',
        intro: { openAtMs: 2400, durationMs: 3200, note: 'Proverena zajednička konfiguracija. Tačno trajanje nije mereno snimcima ovog prolaza.' }
    },
    safety: 'Nisu poslate poruke/pozivi/prijave, pokretane partije, kupovine, preuzimanja nagrada ili nagradne reklame. Automatski test interstitiali pri izlasku zatvoreni su Android back kontrolom. Jedan slučajno unet znak zbog promene položaja tastature odmah je obrisan bez slanja; taj kadar nije uključen u galeriju. Korišćene su vidljive Android kontrole i snimci, bez debugger pristupa ili izvlačenja sesije.',
    restoration: 'Vraćeni Zelena, fizička rezolucija/dpi i početna show_ime_with_hard_keyboard vrednost 0; emulator je otvoren i prijavljen.',
    results, entries
};
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
(async () => {
    fs.mkdirSync(out, { recursive: true });
    for (const entry of entries) {
        await sharp(path.join(raw, entry.file + '.png')).resize({ width: 540 }).jpeg({ quality: 88, chromaSubsampling: '4:4:4' }).toFile(path.join(out, entry.file + '.jpg'));
    }
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><html lang="sr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Globalni chat — emulator 27.10.2026.</title><style>*{box-sizing:border-box}body{background:#14232e;color:#edf5fc;font:16px/1.5 system-ui;margin:0;padding:24px}main{max-width:1400px;margin:auto}a{color:#afe4ff}article{background:#233847;border:1px solid #7997a9;border-radius:12px;padding:16px}nav{display:flex;gap:12px;flex-wrap:wrap;margin:20px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}img{width:100%;height:auto}h2{font-size:20px}table{border-collapse:collapse;width:100%}td,th{text-align:left;padding:10px;border-bottom:1px solid #7997a9}p{max-width:100ch}</style><main><h1>Globalni chat — svih deset tema</h1><p>Stvarni emulator, 27.10.2026, logički prikaz 360×780.</p><p>${escape(report.scope)}</p><p><b>${escape(report.outcome)}</b></p><p>${escape(report.deployment)}</p><nav><a href="report.json">Strukturisana evidencija i PNG putanje</a><a href="../emulator-checkpoint.md">Presek provere</a>${results.map(row => `<a href="#${row.theme}">${escape(row.name)}</a>`).join('')}</nav><table><tr><th>Tema</th><th>PNG u sobi</th><th>Rezultat pregledanih stanja</th></tr>${results.map(row => `<tr><td>${escape(row.name)}</td><td>${row.pngCount}</td><td>${escape(row.status)}</td></tr>`).join('')}</table><h2>Granice provere</h2><ul>${report.limits.map(limit => `<li>${escape(limit)}</li>`).join('')}</ul><p>Statička provera: četiri različita PNG po temi, jedinstveni binarni hash za svaku tematsku ulogu; najmanji kontrast ranijih izračunatih rasporeda 4,59:1, paletnih parova i obaveštenja 4,54:1.</p><p>${escape(report.safety)}</p>${results.map(row => `<section id="${row.theme}"><h2>${escape(row.name)}</h2><p>${escape(row.visualResult)}</p><div class="grid">${entries.filter(entry => entry.theme === row.theme && !['dark-chat-open','dark-menu-restored-original'].includes(entry.file)).map(card).join('')}</div></section>`).join('')}<h2>Dodatni dokazi</h2><div class="grid">${entries.slice(-2).map(card).join('')}</div></main></html>`);
    console.log(`Global Chat: ${results.length} themes, ${entries.length} scoped screenshots, 4 room PNG roles per theme.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
function card(entry) {
    return `<article><h2>${escape(entry.title)}</h2><p>${escape(entry.note)}</p><a href="${entry.file}.jpg"><img loading="lazy" src="${entry.file}.jpg" alt="${escape(entry.title)}"></a></article>`;
}
