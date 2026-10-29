const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.env.YAMB_SHARP_PATH || 'sharp');
const { resolve: resolveQuality } = require('../www/theme-quality-assets.js');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'docs/theme-visual-audit/emulator-online-players-2026-10-28');
const themes = [
    ['dark', 'Zelena'], ['light', 'Svetlo zlato'], ['medium', 'Trula višnja'],
    ['winter', 'Plavi okean'], ['neon', 'Neon Cyber'], ['amethyst', 'Kraljevski ametist'],
    ['easter', 'Vaskršnja'], ['desert', 'Pustinjsko staklo'], ['moon', 'Mesečev sjaj'], ['severna', 'Severna maglina']
];
const entries = [];
const results = themes.map(([theme, name], index) => {
    const date = index < 3 ? '2026-10-27' : '2026-10-28';
    const cards = [
        ['online-list', 'Lista igrača', theme === 'moon' ? 'U ovom trenutku prisutan je samo prijavljeni nalog; nema dokaza za akcije uz drugog igrača.' : 'Stvarna lista sa prijavljenim nalogom i drugim igračem; vidljive tematske akcije i njihova dostupnost.'],
        ['online-keyboard', 'Pretraga sa tastaturom', 'Polje pretrage ostaje dostupno. Telo liste se prilagođava prostoru iznad tastature.'],
        ['online-filter-empty', 'Nema rezultata — tastatura', 'Lokalni upit zzqa987 pravilno prikazuje tematski PNG i poruku da nema poklapanja.'],
        ['online-filter-empty-no-keyboard', 'Nema rezultata — puna soba', 'Prazno stanje bez preklapanja sa sistemskom navigacijom.']
    ].map(([suffix, title, note]) => {
        const file = theme === 'winter' && suffix === 'online-keyboard' ? 'winter-online-keyboard-ready' : `${theme}-${suffix}`;
        const entry = { file, date, theme, title: `${name} — ${title}`, note };
        entries.push(entry);
        return entry;
    });
    const pack = `assets/theme-packs/${theme}`;
    const source = {
        identity: theme === 'dark' ? 'assets/green-soft-clay/canonical/online-players-room-identity/online-players-room-v1.png' : `${pack}/canonical/online-players-room-identity/online-players-room-v1.png`,
        ...Object.fromEntries(['state', 'search', 'friend', 'spectate', 'duel', 'avatar'].map(role => [role, `${pack}/canonical/online-players-internal/${role}-v1.png`])),
        close: `assets/${theme === 'dark' ? 'green-soft-clay' : `theme-packs/${theme}`}/canonical/room-controls/close-v1.png`
    };
    const sources = Object.fromEntries(Object.entries(source).map(([role, canonical]) => [role, { canonical, resolved: resolveQuality(canonical) }]));
    return {
        theme, name, date, pngRoles: 8, sources,
        status: theme === 'easter' ? 'potrebna dorada — lokalno ispravljeno, Android potvrda čeka deploy' : 'pregledani raspored i tekst prihvatljivi; tematski search X lokalno dorađen',
        layout: 'Naslov, pretraga, kartice, imena i prazno stanje vizuelno odgovaraju Green rasporedu na 360×780; bez odsečenog teksta i izlaska okvira u sistemsku zonu.',
        actionIconsObserved: theme !== 'moon',
        assetAssessment: 'Aktuelni PNG identiteti prihvatljivi u snimljenim veličinama. Nije bilo potrebe za novim ilustracijama.',
        caveat: theme === 'easter' ? 'Objavljeni CSS daje avatarima stari ljubičasti rub i svim slikama pravougaonu senku. Uklonjeno lokalno iz teme.css; ovi snimci prikazuju problem pre popravke.' : theme === 'moon' ? 'Akcije nad drugim igračem nisu stvarno prikazane, jer je lista sadržala samo sopstveni nalog.' : '',
        evidence: cards.map(card => card.file + '.jpg')
    };
});
entries.push(
    { file: 'neon-settings', date: '2026-10-28', theme: 'incident', title: 'Neon — prvi pokušaj', note: 'Gate ostaje na prvom snimku; sledeći snimak pokazuje vraćanje na Winter. Ovo je nalaz prelaska teme, ne dokaz greške rasporeda Online sobe.' },
    { file: 'neon-settings-ready', date: '2026-10-28', theme: 'incident', title: 'Neon — neuspešan prvi izbor', note: 'Posle gate-a ostao je Plavi okean. Ne proglašavati hladni transfer pouzdano trenutnim.' },
    { file: 'neon-settings-retry', date: '2026-10-28', theme: 'incident', title: 'Neon — ponovljeni izbor uspeva', note: 'Nakon ponavljanja aktivan Neon; pregled njegove sobe potom završen.' },
    { file: 'desert-online-search-cleared', date: '2026-10-28', theme: 'extra', title: 'Brisanje pretrage', note: 'Pritiskom na native X upit je obrisan i vraćena lista igrača; ništa nije poslato drugim igračima.' },
    { file: 'dark-menu-restored-original', date: '2026-10-28', theme: 'extra', title: 'Vraćeno početno okruženje', note: 'Zelena, originalnih 1440×3120 / 560dpi; tastatura zatvorena i show_ime_with_hard_keyboard vraćen na 0. Nalog ostaje prijavljen.' }
);
const report = {
    date: '2026-10-28', room: 'Online igrači / Online number',
    scope: 'Nastavljen prekinuti pregled u stvarnom emulatoru. Green/Light/Medium snimci od27.10. sačuvani kao prethodni dokaz; Winter ponovo otvoren28.10. i dovršen zajedno sa ostalih šest tema.',
    device: { avd: 'Easter_QA_10GB', logicalViewport: [360, 780], pixels: [1080, 2340], density: 480, restoredPixels: [1440, 3120], restoredDensity: 560, physicalS25: false },
    outcome: 'Svih deset tema ima pregled liste, fokus pretrage, otvorenu tastaturu i filtriranu praznu listu sa/bez tastature. Nađene dve CSS dorade; sprovedene lokalno. Novi PNG crteži i funkcije sobe nisu menjani.',
    deployment: 'Snimci prikazuju postojeću objavljenu aplikaciju, pre novih lokalnih CSS ispravki. Ni prethodne dorade R07/R12/R14/R15 ni ovaj korak nisu commitovani ili deployovani.',
    findings: [
        { id: 'R16', status: 'lokalno ispravljeno; Android potvrda čeka deploy', reason: 'Native X u pretrazi većine tema ostaje standardno plav umesto identiteta teme.', fix: 'Pseudo-element search-cancel-button koristi postojeći --theme-room-close-image, koji je već mapiran za svih deset tema. Ostaje native akcija brisanja, bez novog asseta ili menjanja dimenzija kartica i polja.' },
        { id: 'R17', status: 'lokalno ispravljeno; Android potvrda čeka deploy', reason: 'Easter legacy blanket pravilo za #online-players-body img dodaje ljubičasti rub avatarima i pravougaonu svetlu senku praznom PNG i drugim slikama.', fix: 'Uklonjen samo Online Players img selektor iz starog pravila. Postojeći op-available/op-busy/op-playing rubovi zadržavaju status i paletu. Ne menjaju se slike prijatelja ili Settings van ove sobe.' },
        { id: 'R01-followup', status: 'otvorena provera stabilnosti/učitavanja', reason: 'Prvi Neon izbor28.10. pokazao gate pa vratio Winter; drugi uspeva. Bez merenja hladnog cache-a ili zaključka o tačnom uzroku.' },
        { id: 'startup-observation', status: 'jednokratno zabeleženo; uzrok nepotvrđen', reason: 'Posle pokretanja emulatora aplikacija se jednom vratila na Android Home. Ponovno pokretanje aplikacije uspelo; crash buffer nije dao zapis. Nije pripisano Online Players funkciji bez dokaza.' }
    ],
    limits: [
        'Nisu slati zahtevi prijateljstva, dueli ili poruke; potvrde tih akcija i ulazak u posmatranje nisu testirani.',
        'Moon je prikazao samo sopstveni nalog. Drugi igrač i akcione ikone u toj temi nisu potvrđeni novim Android snimkom.',
        'Duga lista, mrežni kvarovi, generički avatar-fallback, uvećan sistemski font i drugi viewporti nisu novo testirani u emulatoru. Raniji sačuvani rasporedi su zaseban dokaz.',
        'Intro je korišćen pri ulasku, ali njegovo tačno trajanje i animacija nisu mereni screenshotima. Nema posebnog završnog ekrana ove sobe.',
        'Ovo nije pregled svih soba aplikacije niti dokaz fizičkog Samsung S25 prikaza. Nove lokalne dorade još zahtevaju naknadnu Android potvrdu.'
    ],
    checks: { command: 'npm run check:theme-online-players-final', result: 'PASS: deset tema, osam aktivnih PNG uloga po temi, originalni i quality-resolved fajlovi, Green geometrija/fontovi u četiri prethodno sačuvana viewporta.', minimumPaletteContrast: 4.59, canonical: 'npm run check:theme-canonical-assets — PASS', note: 'Hash razlikuje fajlove, ali sam nije dokaz vizuelne jedinstvenosti; stvarni snimci su zaseban vizuelni dokaz.' },
    safety: 'Bez kupovina, nagrada, novih partija, slanja poziva/prijateljstava ili poruka. Upit zzqa987 filtrira već učitanu listu lokalno. Automatski test interstitiali zatvoreni Android back kontrolom. Vidljiv UI i ADB snimci; bez debug porta ili izvlačenja sesije.',
    restoration: 'Vraćeni Zelena, originalnih1440×3120 /560dpi i show_ime_with_hard_keyboard=0. Emulator otvoren i prijavljen.',
    results, entries
};
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const card = entry => `<article><h3>${esc(entry.title)}</h3><p>${esc(entry.date)}. ${esc(entry.note)}</p><a href="${entry.file}.jpg"><img loading="lazy" src="${entry.file}.jpg" alt="${esc(entry.title)}"></a></article>`;
(async () => {
    fs.mkdirSync(out, { recursive: true });
    for (const entry of entries) {
        const source = path.join(root, `tmp/emulator-online-players-${entry.date}`, entry.file + '.png');
        await sharp(source).resize({ width: 540 }).jpeg({ quality: 88, chromaSubsampling: '4:4:4' }).toFile(path.join(out, entry.file + '.jpg'));
    }
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><html lang="sr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Online igrači — emulator 27–28.10.</title><style>*{box-sizing:border-box}body{background:#14232e;color:#edf5fc;font:16px/1.5 system-ui;margin:0;padding:24px}main{max-width:1400px;margin:auto}a{color:#afe4ff}article{background:#233847;border:1px solid #7997a9;border-radius:12px;padding:16px}nav{display:flex;gap:12px;flex-wrap:wrap;margin:20px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}img{width:100%;height:auto}h2{font-size:21px}h3{font-size:18px}td,th{text-align:left;padding:10px;border-bottom:1px solid #7997a9}table{border-collapse:collapse;width:100%}p{max-width:100ch}</style><main><h1>Online igrači — stvarni emulator</h1><p>Pregled svih deset tema, 27–28.10.2026, logički prikaz360×780.</p><p>${esc(report.scope)}</p><p><b>${esc(report.outcome)}</b></p><p>${esc(report.deployment)}</p><nav><a href="report.json">Puna evidencija i resolved PNG putanje</a><a href="../emulator-checkpoint.md">Presek stanja</a>${results.map(row => `<a href="#${row.theme}">${esc(row.name)}</a>`).join('')}</nav><h2>Nalazi</h2>${report.findings.map(f => `<article><h3>${esc(f.id)} — ${esc(f.status)}</h3><p>${esc(f.reason)}</p>${f.fix ? `<p>${esc(f.fix)}</p>` : ''}</article>`).join('')}<h2>Granice</h2><ul>${report.limits.map(value => `<li>${esc(value)}</li>`).join('')}</ul><p>${esc(report.checks.result)} Najmanji kontrast proverenih paletnih parova4,59:1.</p>${results.map(row => `<section id="${row.theme}"><h2>${esc(row.name)} — ${esc(row.status)}</h2><p>${esc(row.layout)}</p><p>${esc(row.caveat)}</p><div class="grid">${entries.filter(e => e.theme === row.theme).map(card).join('')}</div></section>`).join('')}<h2>Dodatni dokazi</h2><div class="grid">${entries.filter(e => ['incident','extra'].includes(e.theme)).map(card).join('')}</div><p>${esc(report.safety)}</p><p>${esc(report.restoration)}</p></main></html>`);
    console.log(`Online Players: ${results.length} themes, ${entries.length} screenshots, scoped findings R16/R17.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
