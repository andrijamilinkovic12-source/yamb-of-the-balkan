const fs=require('node:fs'),path=require('node:path');
const sharp=require(process.env.YAMB_SHARP_PATH||'sharp');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/theme-visual-audit/emulator-verified-2026-10-27');
const raw=path.join(root,'tmp/emulator-verified-2026-10-27');
const entries=[
 ['start-ready-original','Zelena: originalni ekran','R07 ostaje: dva reda naslova i skraceni poeni lige na oko411px.'],
 ['desert-first-at-1s','Prvi izbor Desert u ovom prolazu','Tematski gate, ali delovi nedekodiranih slicica. Nije merenje praznog HTTP cache-a.'],
 ['desert-first-settled','Desert: kompletna Podesavanja','Izbor uspeva bez ponavljanja.'],
 ['desert-reopened-settings','Desert: ponovni ulazak','Tema se nije vratila na prethodnu.'],
 ['moon-first-at-1s','Prvi izbor Moon u ovom prolazu','Pozadina, naslov i paleta pripadaju Moon. Slicice jos nepotpune.'],
 ['moon-first-settled','Moon: kompletna Podesavanja','Izbor uspeva bez ponavljanja.'],
 ['moon-reopened-settings','Moon: ponovni ulazak','Tema ostaje izabrana.'],
 ['severna-first-at-1s','Prvi izbor Severna u ovom prolazu','Odgovarajuca pozadina i mastilo.'],
 ['severna-first-settled','Severna: kompletna Podesavanja','Izbor uspeva bez ponavljanja.'],
 ['severna-reopened-settings','Severna: ponovni ulazak','Nema ranijeg povratka na Desert.'],
 ['moon-warm-at-250ms','Ponovni izbor Moon','Na prvom snimku nakon kratkog cekanja nova tema je kompletna; naziv fajla oznacava podeseni wait250ms, ne ukupno trajanje promene.'],
 ['moon-restart-ready','Moon: ponovno pokretanje aplikacije','Prijava i tema su ocuvane.'],
 ['moon-statistics-fixed','Moon: pregled statistike','R08: vece podnozje sa44px dodirima i uskladjeni razmaci.'],
 ['moon-h2h-fixed','Moon: H2H','R09: tematsko citljivo statusno mastilo.'],
 ['easter-gate-first','Easter: ucitavanje','Mastilo i panel su tematski; preostali stari ljubicasti veo i delovi nedekodiranih slika.'],
 ['easter-main-fixed','Easter: glavni meni','R10 glavne kartice koriste krem/zalfija povrsine.'],
 ['easter-top-ranks-fixed','Easter: Top lista','R11: brojevi4+ sada vidljivi. Prva tri mesta ostaju medalje.'],
 ['easter-statistics-fixed','Easter: H2H','Tematsko statusno mastilo i zajednicka navigacija.'],
 ['easter-statistics-overview-fixed','Easter: pregled statistike','Zajednicka geometrija, tematske povrsine.'],
 ['easter-fire-rows-fixed','Easter: Vatreni niz','R10: redovi i skrol vise nisu lavanda.'],
 ['easter-treasury-theme-catalog','Easter: teme u Riznici','R15: aktivni tab jos ima ljubicasti akcenat.'],
 ['light-equipped-from-treasury','Izbor posedovanog Svetlog zlata','R14: izgled se primenjuje pre kompletnih slika. Nema kupovine.'],
 ['light-treasury-settled','Svetlo zlato: dovrsen transfer','R14 slike stizu naknadno; R15 slabo citljiv naslov na starom tamnom zaglavlju.'],
 ['light-settings-after-treasury','Svetlo zlato: Podesavanja posle Riznice','R13: izbor ostaje sacuvan.'],
 ['green-original-final','Kraj pregleda','Zelena, prijavljen nalog, originalni1440x3120 /560dpi.']
].map(([file,title,note])=>({file,title,note}));
const report={date:'2026-10-27',deployment:'Javni game.js, managers.js, theme-settings-room.js i tri nova CSS fajla vracajuHTTP200 i normalizovano odgovaraju lokalnom HEAD-u na pocetku prolaza. Radni direktorijum je bio cist.',
 scope:'Ponovna provera R01/R07–R13: izbor Desert/Moon/Severna, ponovni ulazak u Podesavanja, restart Moon, ponovni topli izbor, Moon/Easter statistika, Easter Top lista i Vatreni niz. Dodatno aktiviranje vec posedovanog Svetlog zlata iz Riznice.',
 limits:'Nije pregled svih soba i svih deset tema u ovom prolazu. Nije fizicki S25 test, benchmark praznog HTTP cache-a niti simulacija slabe mreze. Nije pocinjana nova partija radi game panela; njegov put ima regresione testove, ne novi Android snimak.',
 safety:'Nisu pokretane nove partije, nagrade, kupovine, nagradne reklame, dueli ili poruke. Automatski test interstitial pri izlasku iz Top liste zatvoren Android back dugmetom. Bez WebView debugger pristupa ili ekstrakcije sesije.',
 findings:[
 {id:'R01',status:'Delimicno potvrdjeno.',result:'Desert/Moon/Severna uspevaju iz prvog izbora u ovom prolazu. Prvi izbori pokazuju loader; ponovni Moon prikaz brzo kompletan. Cache nije brisan; ne tvrdi se trenutna hladna promena.'},
 {id:'R13',status:'Potvrdjeno u pregledanim stvarnim scenarijima.',result:'Tri teme ostaju posle meni/Podesavanja povratka; Moon posle restarta, Light posle izbora iz Riznice. Nema ranijeg vracanja na Desert.'},
 {id:'R08',status:'Potvrdjeno na Moon i Easter primerima.',result:'Uskladjeno podnozje i navigacioni prostori. Ostale teme imaju isti CSS i regresione provere, bez novog pojedinacnog snimka u ovom prolazu.'},
 {id:'R09',status:'Potvrdjeno na Moon i Easter H2H.',result:'Tematsko mastilo umesto opste jarke zelene/crvene; staticki kontrast svih deset paleta ostaje zaseban dokaz.'},
 {id:'R10',status:'Potvrdjena prethodna dorada; dodatni tab Riznice je R15.',result:'Easter glavne tri kartice, redovi Vatrenog niza i skrol sada prate paletu.'},
 {id:'R11',status:'Potvrdjeno.',result:'Easter Top lista pokazuje brojeve4+, prve tri kanonske medalje ostaju.'},
 {id:'R07',status:'Dodatno lokalno ispravljeno; nova vizuelna potvrda ceka deploy.',result:'Kasniji theme-quarterly-league-room.css imao je font shorthand koji je nadjacavao raniju kompaktnu tipografiju. Odgovarajuce pravilo361–480px sada je u kasnijem fajlu; dimenzije i logo ostaju.'},
 {id:'R12',status:'Tematska pozadina i mastilo potvrdjeni; dodatna lokalna dorada ceka deploy.',result:'Nepotpuni PNG delovi u gate-u skrivaju se do decode. Kasno ucitani PNG ne otkriva zastareli gate. Neutralni veo uklanja stari Easter ljubicasti sloj; Green gate koristi postojece meni identitete i nema hue-rotate prebojavanja.'},
 {id:'R14',status:'Lokalno ispravljeno; Android potvrda ceka deploy.',result:'ShopManager.equip je direktno menjao temu pre pripreme PNG. Sada ceka menu i treasury kontrole, close, dukat i video. Poslednji izbor pobedjuje; neuspeh ili promenjeno vlasnistvo cuvaju prethodni kompletan izgled. Regresioni test prolazi.'},
 {id:'R15',status:'Lokalno ispravljeno; Android potvrda ceka deploy.',result:'Easter tabovi koriste postojece tematske povrsine/senke umesto starog ljubicastog. Light naslov i zaglavlje koriste tematske povrsine i ink za citljivost.'}
 ],
 validation:['check:theme-settings-room sa testom dekodiranja gate-a','check:theme-treasury-final sa testom odlozene primene teme','check:theme-quarterly-league-final','check:theme-game-header','check:js','check:theme-canonical-assets','git diff --check'],entries};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
(async()=>{fs.mkdirSync(out,{recursive:true});for(const e of entries)await sharp(path.join(raw,e.file+'.png')).resize({width:540}).jpeg({quality:88,chromaSubsampling:'4:4:4'}).toFile(path.join(out,e.file+'.jpg'));
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="sr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Emulator — potvrda27.10.</title><style>body{background:#15232e;color:#edf5fc;font:16px/1.5 system-ui;margin:24px}main{max-width:1400px;margin:auto}a{color:#a8dff5}article{background:#243746;border:1px solid #7891a5;border-radius:12px;padding:16px;margin-bottom:12px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}img{width:100%;height:auto}h2{font-size:20px}</style><main><h1>Emulator — potvrda27.10.2026.</h1><p>${esc(report.deployment)}</p><p>${esc(report.scope)}</p><p><b>${esc(report.limits)}</b></p><p>${esc(report.safety)}</p><p><a href="report.json">Puna evidencija</a> · <a href="../emulator-deployed-2026-10-25/index.html">Prethodni prolaz</a></p>${report.findings.map(f=>`<article><h2>${f.id} — ${esc(f.status)}</h2><p>${esc(f.result)}</p></article>`).join('')}<h2>Snimci objavljene verzije, pre novih lokalnih dorada</h2><div class="grid">${entries.map(e=>`<article><h2>${esc(e.title)}</h2><p>${esc(e.note)}</p><a href="${e.file}.jpg"><img loading="lazy" src="${e.file}.jpg" alt="${esc(e.title)}"></a></article>`).join('')}</div></main></html>`);
 console.log(`Saved ${entries.length} screenshots and scoped verification results.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
