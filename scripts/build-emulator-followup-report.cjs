// Evidence packaging for the second visible-UI pass. Does not change game art.
const fs=require('node:fs'),path=require('node:path');
const sharp=require(process.env.YAMB_SHARP_PATH||'sharp');
const root=path.resolve(__dirname,'..'),raw=path.join(root,'tmp/emulator-followup-2026-10-25');
const out=path.join(root,'docs/theme-visual-audit/emulator-followup-2026-10-25');
const entries=[
 ['reopened-loading','dark','Glavni meni na originalnom ekranu','411 × 891: naslov lige prelazi u dva reda, poeni su skraćeni.'],
 ['dark-leaderboard-global','dark','Top lista — globalna','Tri medalje i ispunjena lista; 360 × 780.'],
 ['dark-leaderboard-local','dark','Top lista — prazna lokalna','PNG praznog stanja i njegov tekst.'],
 ['dark-statistics-overview','dark','Statistika — pregled','R04: beo tekst na svetloj kartici Indeksa moći.'],
 ['dark-statistics-power-rank','dark','Rang-lista Indeksa moći','Kanonske medalje, broj, identitet i avatar.'],
 ['dark-statistics-fire-rank','dark','Rang-lista Vatrenog niza','Kanonske medalje, aktuelni i prekinut niz.'],
 ['dark-statistics-h2h','dark','Statistika — H2H','Lista rivala i otvoreni drugi prikaz.'],
 ['dark-statistics-h2h-detail','dark','Statistika — detalji rivala','Otvorena kartica, bez deljenja ili pozivanja na duel.'],
 ['dark-rules-page1','dark','Pravila — prva strana','Tekst, oznake kolona i kanonske ilustracije.'],
 ['dark-rules-page6','dark','Pravila — šesta strana','Dugačak naslov i tekstualni sadržaj; bez promene podešavanja.'],
 ['light-leaderboard-local','light','Top lista — globalna','Naziv izvornog snimka je istorijski; ovo je globalna lista.'],
 ['light-leaderboard-empty-local','light','Top lista — prazna lokalna','Isti slot praznog stanja, PNG Svetlog zlata.'],
 ['light-statistics-summary','light','Statistika — pregled','R06: različite spoljne margine od Zelene.'],
 ['light-statistics-overview','light','Statistika — H2H','Naziv izvornog snimka je istorijski; ovo je druga H2H strana.'],
 ['light-statistics-power-rank','light','Rang-lista Indeksa moći','Zasebne zlatne, srebrne i bronzane medalje.'],
 ['light-statistics-fire-rank','light','Rang-lista Vatrenog niza','R05: prethodni zeleni plamen u zaglavlju, odgovarajući zlatni plamen u redovima.'],
 ['light-rules-page1','light','Pravila — prva strana','Tematska paleta i nove ilustracije.']
].map(([file,theme,title,note])=>({file,theme,title,note}));
const findings=[
 {id:'R04',scope:'Zelena / Statistika',status:'lokalno ispravljeno; vizuelna potvrda čeka deploy',problem:'Beli naslov, opis i broj na svetloj kartici Indeksa moći.',fix:'Tamnozeleno mastilo #254c32, bez senke i promene dimenzija. Kontrast proveren prema oba kraja postojećeg svetlog gradijenta.'},
 {id:'R05',scope:'Svih deset tema / persistentna rang-lista Vatrenog niza',status:'lokalno ispravljeno; vizuelna potvrda čeka deploy',problem:'Zaglavlje skrivenog modala ostaje u prethodnoj temi, dok redovi koriste novu.',fix:'Pri svakom otvaranju primenjuje se postojeći kanonski PNG aktivne teme; nema novih crteža. Regresioni test ponovo otvara isti modal u svih deset tema.'},
 {id:'R06',scope:'Devet nezelenih tema / Statistika i obe rang-liste',status:'lokalno ispravljeno; vizuelna potvrda čeka deploy',problem:'Posebna CSS pravila zaobilaze Green bezbedne margine i menjaju raspoloživu visinu.',fix:'Iste formule top/bottom/side sa --safe-top i --safe-bottom kroz --theme-room-*; mali razmak pregleda usklađen sa Green 6px standardom. Boje i materijali sačuvani.'},
 {id:'R07',scope:'Svih deset tema / glavna kartica Kvartalne lige',status:'lokalno ispravljeno; vizuelna potvrda čeka deploy',problem:'Na 411px tekst prelazi u dva reda i iznos poena se skraćuje, iako 360px prikaz staje.',fix:'Pravilo za kompaktnu tipografiju lige važi do 480px; geometrija kartice, logo i funkcije nisu menjani. Veličina ekonomskog broja ostaje u svom ranijem 360px pravilu.'}
];
const matrix=['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna'].map(theme=>({theme,
 actualUiThisPass:['dark','light'].includes(theme)?['Top lista: globalna i prazna lokalna','Statistika: pregled, H2H i obe rang-liste','Pravila: prva strana']:[],
 additionalUi:theme==='dark'?['Detalj H2H rivala','Pravila: šesta strana','Glavni meni: 411px i 360px']:[],
 automated:'PNG resolveri/identiteti i ponovno otvaranje Vatrenog niza provereni programatski.',
 pending:'Novi deploy i vizuelna potvrda lokalnih ispravki. Ostale teme/prikazi koji nisu gore navedeni nemaju potvrdu ovog emulator prolaza.'}));
const report={date:'2026-10-25',scope:'Nastavak vidljivog pregleda; dva pregledana tematska paketa, četiri nova runtime nalaza.',
 deployment:'Javni theme-settings-room.js vraća HTTP 200, ali ne sadrži lokalni decoded-prepare popravak. Snimci su sa objavljene verzije pre lokalnih popravki.',
 method:'Vidljivi Android ekrani i ADB ulaz/snimci; prozor emulatora potvrđen i prikazan kroz Computer Use. Bez WebView debug porta ili čitanja sesije.',
 limits:'Nije puna konačna vizuelna provera svih deset tema i soba. Nisu odigravane partije, preuzimane nagrade, aktivirani efekti, menjani profili niti slati pozivi. Jedan automatski test interstitial pri izlasku iz Top liste je zatvoren; nije pokretan rewarded ad.',
 findings,matrix,entries,validation:['check:theme-statistics-room, uključujući ponovno otvaranje istog Vatrenog niza kroz svih deset tema','Kontrast Green power kartice prema oba gradijentna kraja','check:theme-leaderboard-room','check:theme-rules-room','check:js','git diff --check'],
 next:['Korisnik objavljuje pripremljene lokalne ispravke (uključujući R01–R03 prethodnog prolaza).','Ponoviti R04–R07 na objavljenoj verziji, zatim nastaviti ovim prikazima u preostalih osam tema.','Nastaviti ostale sobe i retka stanja iz prethodne evidencije; ne označavati ih kao proverene bez snimka.']};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 for(const e of entries)await sharp(path.join(raw,e.file+'.png')).resize({width:810,withoutEnlargement:true}).jpeg({quality:90,chromaSubsampling:'4:4:4'}).toFile(path.join(out,e.file+'.jpg'));
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="sr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Emulator — nastavak pregleda</title><style>body{font:16px/1.5 system-ui;background:#15232e;color:#edf5fc;margin:24px}main{max-width:1300px;margin:auto}a{color:#a8dff5}.notice,article{padding:16px;background:#243746;border:1px solid #7891a5;border-radius:12px}h2{font-size:19px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}img{width:100%;height:auto}table{border-collapse:collapse}td,th{border:1px solid #7891a5;padding:8px;text-align:left}</style><main><h1>Emulator — nastavak pregleda</h1><p class="notice">${esc(report.limits)}</p><p>${esc(report.deployment)}</p><p>${esc(report.method)}</p><p><a href="report.json">Puna evidencija</a> · <a href="../emulator-2026-10-25/index.html">Prethodni prolaz</a></p><h2>Četiri nova nalaza</h2>${findings.map(f=>`<p><b>${f.id} — ${esc(f.scope)}</b><br>${esc(f.problem)}<br>${esc(f.fix)}<br><em>${esc(f.status)}</em></p>`).join('')}<h2>Stvarno pregledano</h2><table><tr><th>Tema</th><th>Vidljivi prikazi ovog prolaza</th></tr>${matrix.map(m=>`<tr><td>${m.theme}</td><td>${esc(m.actualUiThisPass.concat(m.additionalUi).join('; ')||'Preostalo za pregled u emulatoru')}</td></tr>`).join('')}</table><h2>Dokazi sa objavljenog koda pre popravki</h2><div class="grid">${entries.map(e=>`<article><h2>${esc(e.theme+' — '+e.title)}</h2><p>${esc(e.note)}</p><a href="${e.file}.jpg"><img loading="lazy" src="${e.file}.jpg" alt="${esc(e.title)}"></a></article>`).join('')}</div><h2>Sledeće</h2><ol>${report.next.map(n=>`<li>${esc(n)}</li>`).join('')}</ol><p>Originalni PNG snimci ostaju lokalno u tmp/emulator-followup-2026-10-25. Ove JPEG kopije su dokazi pregleda, nisu novi assets aplikacije.</p></main></html>`);
 console.log(`Wrote ${entries.length} review screenshots and four explicitly pending visual fixes.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
