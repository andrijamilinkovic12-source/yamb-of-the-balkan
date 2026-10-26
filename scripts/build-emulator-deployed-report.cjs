/* Visible Android evidence after the user's deployment. No game assets are redrawn. */
const fs=require('node:fs'),path=require('node:path');
const sharp=require(process.env.YAMB_SHARP_PATH||'sharp');
const root=path.resolve(__dirname,'..'),raw=path.join(root,'tmp/emulator-deployed-2026-10-25');
const out=path.join(root,'docs/theme-visual-audit/emulator-deployed-2026-10-25');
const themes=['medium','winter','neon','amethyst','easter','desert','moon','severna'];
const names={dark:'Zelena',light:'Svetlo zlato',medium:'Trula visnja',winter:'Plavi okean',neon:'Neon Cyber',amethyst:'Kraljevski ametist',easter:'Vaskrsnja',desert:'Pustinjsko staklo',moon:'Mesecev sjaj',severna:'Severna maglina'};
const entries=[];
const add=(file,theme,title,note='')=>entries.push({file,theme,title,note});
for(const t of themes){
    add(t+(t==='medium'?'-main-deployed':t==='amethyst'?'-main-after-treasury':'-main'),t,'Glavni meni');
    add(t+(t==='desert'||t==='moon'||t==='severna'?'-settings-retry':t==='winter'?'-settings-switch':'-settings-ready'),t,'Podesavanja posle promene teme');
    add(t+'-top-global',t,'Top lista — globalna',t==='easter'?'R11: mesta 4+ imaju nevidljive redne brojeve.':'');
    add(t+'-top-local',t,'Top lista — prazna lokalna');
    const overview={medium:'medium-statistics-ready',winter:'winter-statistics-overview',amethyst:'amethyst-statistics-overview',desert:'desert-statistics-overview',moon:'moon-statistics-ready',severna:'severna-statistics-overview'};
    add(overview[t]||t+'-statistics',t,'Statistika — pregled');
    const h2h={winter:'winter-statistics',amethyst:'amethyst-statistics',desert:'desert-statistics',moon:'moon-h2h-ready',severna:'severna-statistics'};
    add(h2h[t]||t+'-h2h',t,'Statistika — H2H','R09: tvrdokodirane W/L boje; lokalna korekcija koristi statusno mastilo teme.');
    add(t+(t==='desert'?'-power-rank-ready':'-power-rank'),t,'Rang-lista Indeksa moci');
    add(t+'-fire-rank',t,'Rang-lista Vatrenog niza',t==='easter'?'R10: stari lavanda gradijent na obicnim redovima.':'R05: zaglavlje sada pripada istoj temi kao redovi.');
    add(t+'-rules',t,'Pravila — prva strana');
}
add('dark-statistics-fixed','dark','Statistika — potvrda R04','Tamno mastilo sada je citljivo na svetloj power kartici.');
add('dark-main-411','dark','Glavni meni — 411px','R07: stari ?v=2 CSS je ostao u cache-u. Lokalni ?v=3 osvezava kompaktnu tipografiju do 480px.');
for(const suffix of ['top','middle','cosmos'])add('amethyst-effects-'+suffix,'amethyst','Riznica — efekti: '+suffix,'R03: manje tehnicke PNG kopije; BH/Supernova kartice vidljive. Efekti nisu aktivirani.');
for(const t of ['easter','moon','severna'])add(t+'-settings-switch',t,'Prvo ucitavanje / gate','R12: prvi transfer moze da istekne; gate nasledjuje neke boje/pozadinu prethodne teme. Lokalni CSS popravlja izgled gate-a, ne brzinu transfera.');
const pending='Lokalno ispravljeno; vizuelna potvrda ceka naredni korisnikov deploy.';
const findings=[
 {id:'R01',status:'Delimicno potvrdjeno; hladno ucitavanje ostaje otvoreno.',scope:'Promena teme / Podesavanja',detail:'Kada se odabrana tema uspesno primeni, pregledani Settings PNG i X pripadaju njoj. Desert, Moon i Severna prvi put nisu stigli u 6s; prethodna tema ostaje, ponovni izbor uspeva. Nije potvrda trenutne promene iz praznog cache-a.'},
 {id:'R02',status:'Potvrdjeno u prikazanim menijima; R10 je preostala Easter paleta.',scope:'Tekst glavnog menija',detail:'Cherry caption i svetli natpisi modova u Ocean/Severna vidljivi; Online/Dukati tekst koristi tematsko mastilo.'},
 {id:'R03',status:'Potvrdjeno na prethodno problematicnom primeru.',scope:'Ametist / kartice efekata Riznice',detail:'BH i Supernova slike se vide odmah pri dolasku do kosmickih kartica. Ovo nije merenje svakog efekta i svih tema niti aktivacija animacija.'},
 {id:'R04',status:'Potvrdjeno na objavljenoj verziji.',scope:'Zelena / power kartica',detail:'Naslov, opis ranga i broj koriste tamnozeleno mastilo, sa ocuvanom geometrijom.'},
 {id:'R05',status:'Potvrdjeno kroz osam dodatnih tema.',scope:'Vatreni niz / zaglavlje',detail:'Isti persistentni modal prati odabranu temu i kanonski plamen; ne ostaje prethodna ikona.'},
 {id:'R06',status:'Spoljne margine potvrdjene; unutrasnja geometrija dopunjena u R08.',scope:'Statistika i dve rang-liste',detail:'Devet tema koristi zajednicke Green bezbedne margine; sve prikazane kontrole staju na 360x780.'},
 {id:'R07',status:pending,scope:'Glavni meni / Liga na 411px',detail:'CSS je vec bio prosiren do 480px, ali je URL ostao ?v=2. Nova verzija ?v=3 uklanja stari cache; 411px ponovo proveriti posle objave.'},
 {id:'R08',status:pending,scope:'Statistika / unutrasnji razmaci i navigacija',detail:'Devet tema imalo je samo 10px navigacione elemente i drugaciju visinu podnozja. Kao Green: 44px polje dodira sa malom pseudo-tackom, bez skaliranja celog dugmeta; mali ekran zadrzava 12px body razmak.'},
 {id:'R09',status:pending,scope:'H2H / statusno mastilo',detail:'Globalna jarka W/L boja zamenjena je postojecim tematskim statusima. Cetiri draw nijanse korigovane radi 4.5:1 na obe krajnje podloge; sve evidentirano u theme-definitions.json.'},
 {id:'R10',status:pending,scope:'Vaskrsnja / zaostale povrsine',detail:'Krem/zalfija boje i postojece senke na tri glavne kartice i progresu lige; jacina selektora redova obe rang-liste uklanja lavanda gradient; skrol koristi paletu teme.'},
 {id:'R11',status:pending,scope:'Vaskrsnja / Top lista',detail:'Staro pravilo je sakrilo brojeve svih mesta. Samo za mesta bez medalje eksplicitno vracen redni broj; prve tri medalje ostaju nepromenjene.'},
 {id:'R12',status:pending+' Brzina prvog ucitavanja NIJE resena ovom CSS izmenom.',scope:'Gate pri izboru teme',detail:'Novi theme-loading-material.css vezuje mastilo/povrsinu i odobrenu pozadinu za odredisnu temu, ne prethodnu body klasu. Test svih deset paleta i 4.5:1 prolazi.'},
 {id:'R13',status:'Potrebna posebna dijagnostika; uzrok nije potvrdjen.',scope:'Ponovni ulazak u Podesavanja',detail:'Posle Moon/Severna pri kasnijem otvaranju Podesavanja primecen povratak Desert izbora. Moguca sinhronizacija profila ili drugi klijent; nije dokazano samo CSS problemom. Nisu menjana pravila servera ili citana privatna sesija.'}
];
const report={date:'2026-10-25',scope:'Nastavak stvarnog vizuelnog pregleda nakon korisnikovog commit/deploya.',
 validation:['check:js','check:theme-statistics-room sa H2H kontrastom i ponovnim otvaranjem Fire modala kroz deset tema','check:theme-leaderboard-room','check:theme-rules-room','test-game-theme-switch-preload.js','check-theme-loading-material.cjs','check:theme-canonical-assets','check:theme-visual-audit','check:theme-quality-refresh','git diff --check'],
 deployment:'Javni HTTP200 izvori Settings, vatreniniz, Statistics CSS i menu typography normalizovano su jednaki lokalnim verzijama na pocetku prolaza. Lokalni R07–R12 popravci nastali tokom ovog prolaza jos nisu objavljeni.',
 method:'Vidljivi Android UI, pojedinacni ADB unosi i snimci; logicki360x780 (1080x2340 /480dpi). Bez WebView debug porta, session ekstrakcije ili file:// zaobilaska.',
 boundaries:'Nije zavrsena provera svih soba/stanja. Ne potvrduje retke podprikaze, sve stranice Pravila, nove zavrsne ekrane ili fluidnost svih efekata. Green i Light detaljniji pregled sacuvan je u prethodnoj galeriji.',
 safety:'Nisu pokretane nove partije, kupovine, preuzimanja nagrada ili rewarded reklame. Automatski interstitiali zatvarani Android back kontrolom. Ponavljani blokirajuci poziv od Lidije odbijen po izricitom korisnikovom odobrenju. Na kraju vracena Zelena, originalni ekran i ocuvana prijava.',
 findings,entries,
 matrix:['dark','light',...themes].map(theme=>({theme,name:names[theme],actual:themes.includes(theme)?['Glavni meni','Podesavanja','Top lista globalna i prazna lokalna','Statistika pregled i H2H','Obe rang-liste','Pravila prva strana']:theme==='dark'?['Power kartica posle deploya','Glavni meni 360/411px','Ostali prikazi: prethodna galerija']:['Prethodna galerija: Top lista, Statistika/H2H/dve rang-liste, Pravila'],scopeLimit:'Ne oznacava sve sobe/retka stanja kao proverena.'})),
 next:['Objaviti konkretne lokalne ispravke R07–R12 kad korisnik odluci, pa proveriti njihove iste snimke.','Posebno analizirati prvi hladni transfer PNG i sinhronizaciju izbora teme (R01/R13); ne povecavati rok samo radi skrivanja sporosti.','Nastaviti stvarne podprikaze i ostale sobe iz glavnog registra; ne ponavljati zavrsene staticke PNG provere umesto Android pregleda.']};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 for(const e of entries){const p=path.join(raw,e.file+'.png');if(!fs.existsSync(p))throw Error('Missing screenshot '+p);await sharp(p).resize({width:540}).jpeg({quality:88,chromaSubsampling:'4:4:4'}).toFile(path.join(out,e.file+'.jpg'));}
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="sr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Emulator — pregled posle deploya</title><style>body{font:16px/1.5 system-ui;background:#15232e;color:#edf5fc;margin:24px}main{max-width:1400px;margin:auto}a{color:#a8dff5}article,.notice{padding:16px;background:#243746;border:1px solid #7891a5;border-radius:12px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}img{width:100%;height:auto}h2{font-size:20px}</style><main><h1>Emulator — pregled nakon deploya</h1><p class="notice">${esc(report.boundaries)}</p><p>${esc(report.deployment)}</p><p>${esc(report.safety)}</p><p><a href="report.json">Puna evidencija</a> · <a href="../emulator-followup-2026-10-25/index.html">Prethodni Green/Light pregled</a></p><h2>Nalazi i status</h2>${findings.map(f=>`<article><b>${f.id} — ${esc(f.scope)}</b><p>${esc(f.detail)}</p><em>${esc(f.status)}</em></article>`).join('')}<h2>Stvarni snimci — objavljena verzija pre novih lokalnih ispravki</h2><div class="grid">${entries.map(e=>`<article><h2>${esc(names[e.theme]+' — '+e.title)}</h2><p>${esc(e.note)}</p><a href="${e.file}.jpg"><img loading="lazy" src="${e.file}.jpg" alt="${esc(e.title)}"></a></article>`).join('')}</div><h2>Dalje</h2><ol>${report.next.map(n=>`<li>${esc(n)}</li>`).join('')}</ol></main></html>`);
 console.log(`Saved ${entries.length} Android screenshots; explicit findings R01–R13 with deployment boundaries.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
