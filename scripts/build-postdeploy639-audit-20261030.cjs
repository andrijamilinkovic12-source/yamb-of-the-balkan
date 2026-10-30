// Existing, visually inspected native QA screenshots and sanitized read-only data.
// No network calls, device input, auth/session inspection, or game actions.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sharp=require(process.env.YAMB_SHARP_PATH||'sharp');
const root=path.resolve(__dirname,'..'),input=path.join(root,'tmp/two-emulator-qa-2026-10-29');
const out=path.join(root,'docs/theme-visual-audit/postdeploy639-2026-10-30');
const read=name=>JSON.parse(fs.readFileSync(path.join(input,name),'utf8'));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function main(){
 const published=read('published639-controls.json'),before=read('qa-deploy639-before.json'),after=read('qa-deploy639-after.json');
 assert.equal(published.commit,'7985cb3928fa9ecd3719d941cf4c692be181dfa1');
 assert.equal(published.rows.length,2);
 assert(published.rows.every(row=>row.status===200&&row.resources.every(r=>r.status===200&&r.matchesLocalNormalized)));
 for(const row of published.rows)assert.deepEqual(row.resources.map(r=>r.version),['6.39','6','4']);
 assert.equal(before.database,'yamb_reconnect_qa');assert.equal(after.database,before.database);
 assert.equal(before.productionReadOrWritten,false);assert.equal(after.productionReadOrWritten,false);
 assert.deepEqual(after.profiles,before.profiles);assert.deepEqual(after.results,before.results);
 const frames=[
  ['before-p0','Prvi emulator pre pregleda: Mesečev Sjaj, glavni meni.'],
  ['before-p1','Drugi emulator pre ponovnog pokretanja: Green meni.'],
  ['after-restart-p1','Posle pokretanja: samo početna zelena podloga. Ovo nije spreman meni.'],
  ['startup-followup-p1','Meni se oporavio bez novog pritiska. Kadar ima nepotpuno iscrtanu donju pozadinu; nije dokaz brzog ili potpuno stabilnog prvog kadra.'],
  ['settings-followup','Prvi ulazak u Green Podešavanja: kompletne tematske kontrole. Raniji prvi kadar još je prikazivao meni; nije bilo ponovljenog pritiska.'],
  ['neon-first','Prvi izbor Neona: vidljiv ekran pripreme, nije trenutna promena.'],
  ['neon-ready','Neon Podešavanja: naziv, PNG i paleta primenjeni jednim izborom.'],
  ['easter-ready','Vaskršnja Podešavanja: naziv, PNG i paleta primenjeni jednim izborom.'],
  ['menu-before-hotseat','Zelena vraćena i Podešavanja zatvorena pre odobrene lokalne partije.'],
  ['game-green','Odobrena prazna Hotseat partija Sara/Gost_QA: Green panel, table i skin, svi zbirovi0, bez bacanja.'],
  ['game-menu-green','Green meni igre: tematske kontrole i aktivni skin.'],
  ['game-light-ready','Jedan izbor u meniju igre primenio Svetlo Zlato, gornji/donji panel i odgovarajući skin. Rezultat ostao0.'],
  ['game-menu-light-ready','Svetlo Zlato: kompletan meni i osvežen naziv skina nakon otvaranja.'],
  ['skin-picker-light','Izbor dostupnih skinova: Standard Bela, Žadna Glina i devet drugih tematskih skinova; nije dokaz kupovine.'],
  ['game-light-jade-skin','U Svetlom Zlatu izabrana Žadna Glina: kockice, BACAJ/NAJAVA i brojač koriste taj univerzalni skin, tema table ostala Light.'],
  ['after-exit-attempt','Povratak u Light glavni meni posle potvrde izlaska, bez završetka ili isplate.'],
  ['settings-light-ready','Svetlo Zlato Podešavanja: kompletne tematske PNG kontrole.'],
  ['final-menu-p1','Završno stanje drugog emulatora: Zelena, glavni meni; test partija više nije na ekranu.']
 ].map(([suffix,label])=>({stem:'qa-deploy639-'+suffix,label}));
 fs.mkdirSync(out,{recursive:true});
 for(const frame of frames){
  const file=path.join(input,'screens',frame.stem+'.png');const meta=await sharp(file).metadata();
  assert.equal(meta.width,1440);assert.equal(meta.height,3120);
  frame.file=frame.stem+'.jpg';await sharp(file).resize({width:540}).jpeg({quality:88}).toFile(path.join(out,frame.file));
 }
 const report={
  date:'2026-10-30',version:'6.39',commit:published.commit,published,
  qaEnvironment:'Zasebni APK com.yamb.balkan.staging, staging/reconnect-qa-01; QA baza yamb_reconnect_qa. Original1440×3120/560dpi, geometrija nije menjana. Produkcija samo javni HTML/JS read-only HTTP.',
  startup:{
   status:'Oporavljen meni; brzina i uzrok zastoja ostaju otvoreni',
   observation:'Ponovo pokrenuta samo druga QA aplikacija. am start -W je istekao u pomoćnom procesu (25s budžet komande), pa nema validne Activity launch mere. Naredni kadar je početna podloga, kasniji kadar meni. Nije pritiskano Sačekaj ili ponovljen restart.',
   anr:'Pre i odmah posle pokretanja lastanr pokazuje isti prethodni događaj: Oct30,2026 12:06:28PM, FocusEvent(hasFocus=false), čekanje5009ms. Završno čitanje kaže no ANR has occurred since boot. Nema novog potvrđenog ANR događaja u snimljenim stanjima; ne tvrdi se neprekidno praćenje, poznat uzrok ili popravljena brzina.',
   limits:'Cache nije brisan. Zakasneli/animacioni/native framebuffer kadrovi i ukupno trajanje ADB komandi nisu precizna vremena spremnosti aplikacije. Nema tvrdnje o trenutnoj promeni tema/skinova ili otklonjenom hladnom startu.'
  },
  nativeSettings:{themes:['dark','neon','easter','light'],status:'Kompletne kontrole vizuelno pregledane; Neon/Easter i vraćanjaGreen jednim izborom',limits:'Ovo su4teme na v6.39, ne novi native10/10prolaz. Prethodna v6.38 ima zaseban10/10dokaz, lokalni v6.39 kontroleri takođe10/10.'},
  nativeGame:{
   authorization:'Korisnik izričito dozvolio novu praznu Hotseat QA partiju sa Gost_QA, bez bacanja/upisa/završetka/reklame/nagrade.',
   status:'Otvorena jedna lokalna partija; Green i Light paneli/meni provereni. Jedna promena teme i jedan izbor skina primenjeni. Table ostale bez upisa, rezultat0.',
   skin:'U Light temi izabran dostupan Žadna Glina skin; kockice, dugmad i brojač pratili isti set. Nema kupovine ili provere plaćenog otključavanja.',
   exit:'Potvrđen izlazak u meni. Nema završnog panela, regular/technical rezultata ili ručne izmene igre.',
   limits:'0bacanja i0upisa. Ne proverava izgled različitih vrednosti kockica, online eye-live, hitni timer, mrežne tokove ili završnu nagradu. Native potvrda dva tematska panela ne zamenjuje ranije lokalne provere deset tema.'
  },
  emulatorIsolation:{
   observation:'Prvi emulator privremeno pauziran preko emulator console dok je stajao u meniju; posle testa resume/status potvrdio running. Nema gašenja/brisanja podataka ili promene geometrije.',
   host:'2,63GB slobodno/15,23GB ukupno RAM-a. Kratak2,03suzorak sa prvim pauziranim: qemu7248 oko0,04CPU-jezgra i1,66GB working set; qemu17952 oko0,62CPU-jezgra i2,42GB. Jedan uzorak nije dokaz uzroka sporog starta.',
   restoration:'Oba emulatora ponovo running; prvi je ostao u svom Moon meniju, drugi vraćen na Green meni. Prvi nije ponovo pokretao aplikaciju u ovom prolazu.'
  },
  dataBoundary:{beforeAt:before.at,afterAt:after.at,profilesUnchanged:true,resultsAndClaimsUnchanged:true,balances:after.profiles.map(p=>({player:p.playerName,balance:p.balance,games:p.games})),latestRegularClaimCount:after.results[0].rewardClaimedCount,dailyClaimed:false,scope:'Poređenje pre/posle pokriva reload, Settings, odobrenu lokalnu partiju/izlazak i završno vraćanje vizuelne teme. Prethodno automatsko preuzimanje439/675 već je bilo evidentirano pre ovog testa.'},
  conclusion:'Objavljeni R35 ima ciljanu Android potvrdu prvog ulaska u Settings i panel igre; nema novih runtime izmena u ovom prolazu. Precizno merenje hladnog učitavanja, ponovljen ANR uzrok, fizičkiS25 i druge finansijske/mrežne provere ostaju otvoreni.',
  images:frames
 };
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="sr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QA posle deploya v6.39</title><style>body{margin:0;padding:24px;background:#17242e;color:#eff5fa;font:16px/1.5 system-ui}main{max-width:1150px;margin:auto}a{color:#a5dfff}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px}article{background:#263844;border-radius:12px;padding:12px}img{width:100%;height:auto}strong{color:#ffe0a3}</style><main><h1>QA posle deploya v6.39</h1><p>Commit ${esc(report.commit)}. Oba servisa javno potvrđena: game.js6.39, header6, Settings4, sadržaj odgovara lokalnom nakon CRLF/LF normalizacije. Produkcija nije korišćena za naloge/igru.</p><p><strong>Potvrđena primena:</strong> Settings4teme; prazna odobrena Hotseat partija, Green→Light i univerzalni ŽadnaGlina skin. Bez bacanja, upisa, završetka, reklame ili isplate. QA profili, rezultati i preuzimanja ostali identični.</p><p><strong>Brzina ostaje otvorena:</strong> početno samo podloga, kasniji oporavak menija, am-start timeout i zakašnjeli kadrovi. Nema novog uočenog ANR-a, ali nema dokaza da je njegov uzrok popravljen. Cache nije brisan; ovo nije novo native10/10ili precizno merenje trajanja.</p><p>Prvi emulator privremeno pauziran, zatim vraćen u rad. Drugi vraćen na Green meni. Nema runtime izmena u ovom prolazu.</p><p><a href="report.json">Detalji, hash-evi i granice dokaza</a> · <a href="../remaining-work-plan-2026-10-29.md">Preostale provere</a></p><div class="grid">${frames.map(f=>`<article><p>${esc(f.label)}</p><img src="${esc(f.file)}" loading="lazy" alt="${esc(f.label)}"></article>`).join('')}</div></main></html>\n`);
 console.log('WROTE v6.39 postdeploy:18inspected frames, Settings4themes, Hotseat2themes+skin, unchanged QA profiles/results. Startup latency remains open.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
