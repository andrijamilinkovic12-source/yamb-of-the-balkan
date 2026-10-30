// Publish native screenshots plus isolated loading evidence; no device/network actions.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sharp=require(process.env.YAMB_SHARP_PATH||'sharp');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/theme-visual-audit/postdeploy640-2026-10-30');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const published=read('docs/theme-visual-audit/postdeploy640-2026-10-30/published.json');
const pngHead=read('docs/theme-visual-audit/postdeploy640-2026-10-30/public-png-head.json');
const before=read('tmp/hidden-room-loading-2026-10-30/before.json'),after=read('tmp/hidden-room-loading-2026-10-30/after.json');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function main(){
 assert(published.rows.every(r=>r.resources.every(a=>a.matchesLocalNormalized&&a.status===200)));
 assert.equal(published.commit,'d38aa6aa35c794e06b98d79fdc4520766c1ddfb4');
 assert.equal(before.startupPngRequests,14);assert.equal(after.startupPngRequests,0);
 assert.equal(after.hiddenThemeChangePngRequests,0);assert.equal(after.rows.length,40);assert.deepEqual(after.errors,[]);
 const frames=[
  ['start','Snimak posle am-start: aktivnost je otvorena, meni nije potvrđen spremnim.'],
  ['menu-ready','Prvi meni ima nepotpuno iscrtanu pozadinu. Kasniji kadar je potpun; ovo nije brz/stabilan prvi kadar.'],
  ['settings','Green Podešavanja pre promene.'],
  ['neon','Prvi Neon izbor: priprema teme, bez potvrde primene.'],
  ['neon-ready','Posle prvog Neon izbora ostala je Green. Naziv fajla nije dokaz uspeha.'],
  ['isolated-state','Neon konačno primenjen posle ponovljenih pokušaja; prvi emulator tada privremeno pauziran.'],
  ['easter','Prvi Vaskršnji izbor: ekran pripreme. Naredni kadar ostao Neon.'],
  ['easter-followup','Naknadni kadar i dalje Neon; prvi pokušaj nije prihvaćen kao uspešan.'],
  ['easter-retry','Ponovljeni izbor: Vaskršnja Podešavanja sa njenim PNG.'],
  ['light','Priprema Svetlog Zlata. Kasniji Windows pregled potvrdio je kompletna Light Podešavanja jednim izborom; taj kasniji kadar nije ovaj PNG.'],
  ['moon','Prvi Mesečev izbor: ekran pripreme. Kasniji Windows pregled pokazao je da je ostalo Svetlo Zlato.'],
  ['moon-retry','Ponovljeni izbor: Mesečev Sjaj sa njegovim PNG.'],
  ['green-return','Priprema povratka na Green posle četiri druge teme. Kasniji Windows pregled potvrdio Green Podešavanja; sledeći PNG potvrđuje konačni meni.'],
  ['final-menu','Završni Green meni: sve glavne ikone i pozadina ponovo vidljivi.']
 ].map(([suffix,label])=>({stem:'qa-deploy640-'+suffix,file:'qa-deploy640-'+suffix+'.jpg',label}));
 for(const f of frames){
  const input=path.join(root,'tmp/two-emulator-qa-2026-10-29/screens',f.stem+'.png'),meta=await sharp(input).metadata();
  assert.equal(meta.width,1440);assert.equal(meta.height,3120);
  await sharp(input).resize({width:420}).jpeg({quality:86}).toFile(path.join(out,f.file));
 }
 fs.copyFileSync(path.join(root,'tmp/hidden-room-loading-2026-10-30/before.json'),path.join(out,'hidden-rooms-before.json'));
 fs.copyFileSync(path.join(root,'tmp/hidden-room-loading-2026-10-30/after.json'),path.join(out,'hidden-rooms-after.json'));
 const report={date:'2026-10-30',published,
  native:{app:'com.yamb.balkan.staging',device:'Duel_QA_Player2/emulator-5556',geometry:'1440x3120, unchanged',
   loadedVersionBoundary:'Public HTML/JS confirm v6.40; QA app force-stopped/reopened. No private WebView instrumentation to prove loaded byte hash.',
   start:{activityStatus:'ok',launchState:'COLD',activityTotalMs:19194,activityWaitMs:19222,limit:'Android activity metrics only, not time to ready menu or cold HTTP/image cache. Visible logo, white, Green backing and later menu; partial background frames occurred. No cache/data clearing.'},
   themes:['dark','neon','easter','light','moon'],
   selections:'Neon initially returned to Green, later repeated attempts applied Neon; one intervening repeated-tap outcome was ambiguous amid delayed native input/frame response. Easter and Moon each remained on the previous theme after the first choice and applied after repeating. Light applied on the first observed choice. Green return applied on one choice after the four other themes.',
   return:'Green Settings controls and final complete Green menu visually confirmed. This is targeted five-theme output/revisit evidence, not ten first-choice successes or proof of LRU internals on Android.',
   performance:'Slow start and first-choice failures remain OPEN. Native helper/screenshot delays are not app-ready latency. No new ANR dialog observed in inspected frames; no continuous ANR monitoring or established cause.',
   restoration:'First emulator temporarily paused to reduce contention, then adb emu avd resume/status confirmed running. Second left in Green main menu. No geometry/data clearing or account switch.',
   financialBoundary:'No new game, dice roll, score entry, ad, reward/rematch button, purchase, invitation or database read/write performed for this check. Displayed Sara balance12168 before/after; not a database audit of all profile fields.'},
  publicPng:{count:pngHead.rows.length,all200:pngHead.rows.every(r=>r.status===200),boundary:pngHead.scope},
  R37:{localVersion:'6.41',status:'LOCAL, not deployed or Android verified',
   finding:'Leaderboard, Online Players and Invite Friend controllers automatically loaded/prepared hidden room art at startup and theme changes.',
   change:'Automatic apply only targets rendered images; remove unconditional hidden-room preload. Observe room class/style/content changes so opening rooms and dynamically inserted cards still update. Explicit preload APIs retained; shared eye/empty-state instances in game covered.',
   before:{startupPngRequests:before.startupPngRequests,startupPngBytes:before.startupPngBytes,hiddenThemeChangePngRequests:before.hiddenThemeChangePngRequests},
   after:{startupPngRequests:after.startupPngRequests,startupPngBytes:after.startupPngBytes,hiddenThemeChangePngRequests:after.hiddenThemeChangePngRequests,visibleCases:after.rows.length},
   tests:'Actual three controllers/production PNG, ten themes x four visible containers=40, dynamic invite insertion, inline display opening, explicit ahead-of-entry preparation and no browser errors. Existing late-theme, canonical room and cache tests pass. Syntax sweep passes.',
   boundary:after.scope+' This is not all app traffic or proof that these fourteen requests caused the Android ANR/timeout. No PNG, palette, dimensions, typography, economy or game-rule changes.'},
  next:'User commit/deploy v6.41, then targeted first/repeated Settings choices and room-entry/shared-eye checks on Android. Initial download timeout/root cause, physical S25, reward and network-flow boundaries remain open.',images:frames};
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="sr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Posle v6.40 / lokalna R37</title><style>body{background:#17242e;color:#edf4f7;font:16px/1.5 system-ui;padding:24px}main{max-width:1150px;margin:auto}a{color:#a7dcff}strong{color:#ffe0a3}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}article{background:#263844;padding:12px;border-radius:12px}img{width:100%;height:auto}td,th{padding:10px;border:1px solid #71808b}table{border-collapse:collapse}</style><main><h1>Posle deploya v6.40; lokalna dorada R37/v6.41</h1><p>Oba javna servisa potvrđena na ${esc(published.commit)}. QA aplikacija ponovo otvorena. <strong>Prvi izbori Neona, Vaskršnje i Mesečevog Sjaja nisu bili pouzdani.</strong> Posle ponavljanja svih pet testiranih tema prikazuje svoje PNG. Povratak na Green i završni meni kompletni. Ovo nije deset uspešnih prvih izbora.</p><p>Android Activity COLD:19194ms; to nije vreme do spremnog menija. Zabeleženi beli/podložni i nepotpuni kadrovi. Nema tvrdnje da je spor start ili ANR rešen. Nema nove igre, reklame, nagrade ili DB pristupa; prvi emulator vraćen iz pauze, drugi na Green meni.</p><h2>Lokalna R37 — tri skrivena kontrolera</h2><table><tr><th>Izolovana provera</th><th>Pre</th><th>Posle</th></tr><tr><td>PNG zahtevi pri startu</td><td>14 /719184B</td><td>0</td></tr><tr><td>PNG zahtevi kroz deset skrivenih tema</td><td>126</td><td>0</td></tr><tr><td>Prikazi deset tema × četiri kontejnera</td><td>—</td><td>40 prolazi</td></tr></table><p>Kontroleri Top liste, Online igrača i Pozovi prijatelja. Otvaranje sobe, dinamičke kartice, deljeno oko i prazna lista u igri provereni lokalno. <strong>v6.41 nije objavljena niti potvrđena na Androidu.</strong> Ovo nisu ukupni zahtevi cele aplikacije ili dokaz uzroka ANR-a; PNG i izgled nisu menjani.</p><p><a href="report.json">Rezultati i granice</a> · <a href="published.json">Objavljene verzije</a> · <a href="public-png-head.json">56 javnih PNG HEAD odgovora</a> · <a href="hidden-rooms-before.json">Lokalno pre</a> · <a href="hidden-rooms-after.json">Lokalno posle</a></p><div class="grid">${frames.map(f=>`<article><p>${esc(f.label)}</p><img src="${esc(f.file)}" alt="${esc(f.label)}" loading="lazy"></article>`).join('')}</div></main></html>\n`);
 // A review sheet uses only resized native evidence, never generated game art.
 const tiles=await Promise.all(frames.map((f,i)=>sharp(path.join(out,f.file)).resize({width:180}).extend({top:22,bottom:0,left:0,right:0,background:'#17242e'}).composite([{input:Buffer.from(`<svg width="180" height="22"><text x="3" y="16" fill="white" font-size="12">${i+1}. ${esc(f.stem.replace('qa-deploy640-',''))}</text></svg>`),left:0,top:0}]).png().toBuffer()));
 const height=412;await sharp({create:{width:720,height:height*4,channels:3,background:'#17242e'}}).composite(tiles.map((input,i)=>({input,left:(i%4)*180,top:Math.floor(i/4)*height}))).png().toFile(path.join(out,'review-sheet.png'));
 console.log('WROTE:14native frames, public v6.40 proof, first-choice failures open; local R37:14/719184B->0 and40visible cases.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
