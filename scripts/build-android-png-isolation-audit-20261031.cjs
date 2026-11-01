// Only public PNG timing, reviewed native frames and local fixture reports.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sharp=require(process.env.YAMB_SHARP_PATH||'sharp');
const out='docs/theme-visual-audit/android-png-isolation-2026-10-31',input='tmp/android-png-isolation-2026-10-31';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
(async()=>{
 fs.mkdirSync(out+'/results',{recursive:true});
 const cases=[
  ['desktop-local-1793466901892.json','Desktop lokalni — validacija fixture-a'],
  ['android-local-1793467416130.json','Android lokalni, dva AVD-a, prvo Chrome pokretanje/ANR'],
  ['android-local-1793467732808.json','Android lokalni, jedan AVD, pre hladnog starta'],
  ['android-local-1793467948064.json','Android lokalni, jedan AVD, posle hladnog starta/foreground'],
  ['android-qa-1793468025435.json','Android QA, prvi izmereni prolaz posle hladnog starta'],
  ['desktop-qa-1793468194158.json','Desktop QA, svež browser kontekst'],
  ['android-qa-1793468251842.json','Android QA, ponovljeni prolaz, već pripremljene slike']
 ].map(([file,label])=>{
  const report=read(input+'/'+file);assert.equal(report.rows.length,28);
  fs.writeFileSync(out+'/results/'+file,JSON.stringify(report,null,2)+'\n');
  return{file,label,android:report.android,mode:report.mode,totalMs:report.totalMs,ready:report.rows.filter(r=>r.status==='ready').length,
   maxLoadMs:Math.max(...report.rows.map(r=>r.loadMs||0)),maxDecodeMs:Math.max(...report.rows.map(r=>r.decodeMs||0)),maxLagMs:report.maxLagMs,maxTaskMs:report.maxTaskMs,
   resourceTransferBytes:report.rows.reduce((s,r)=>s+r.resourceTransferBytes,0),failures:report.rows.filter(r=>r.status!=='ready').map(r=>({source:r.source,status:r.status}))};
 });
 const timing=read('tmp/qa-theme-loading/emulator-5556-1793468706608.json');
 fs.writeFileSync(out+'/app-png-timing.json',JSON.stringify(timing,null,2)+'\n');
 const easter=timing.events.filter(r=>r.asset.includes('easter')),ready=easter.filter(r=>r.event==='ready');
 assert.equal(ready.length,28);assert.equal(Math.max(...ready.map(r=>r.elapsedMs)),1967);assert.equal(easter.filter(r=>r.event==='timeout').length,0);
 const frames=[
  ['qa-png-isolation-after-handoff','Odvojeni Chrome lokalni test:27/28iANR. Bez koda igre i bezQAserverPNGputanje.'],
  ['qa-png-isolation-local-one-vm','Jedan emulator pre hladnog starta:28/28,40,076s.'],
  ['qa-png-isolation-local-cold','Posle hladnog starta istogAVD-a i foreground prozora:28/28,3,076s.'],
  ['qa-png-isolation-qa-cold','Prvi izmereni javniQA prolaz posle hladnogstarta:28/28,24,815s.'],
  ['qa-png-isolation-qa-warm','Ponovljeni javniQA prolaz:28/28,0,364s.'],
  ['qa-png-isolation-app-return','Povratak postojećeQAaplikacije,Greenmeni,saldo12168.'],
  ['qa-png-isolation-app-easter-first','JedanEasterizbor uQAaplikaciji uspešan;28PNGreadydo1967ms,0timeout. SačuvanWebViewkeš.'],
  ['qa-png-isolation-final-menu','Po završetku vraćenGreenmeni;saldo12168isti.']
 ].map(([stem,label])=>({file:stem+'.jpg',source:stem+'.png',label}));
 for(const frame of frames){const file=path.join('tmp/two-emulator-qa-2026-10-29/screens',frame.source);const meta=await sharp(file).metadata();assert.equal(meta.width,1440);assert.equal(meta.height,3120);await sharp(file).resize({width:420}).jpeg({quality:86}).toFile(out+'/'+frame.file);}
 const report={date:'2026-10-31',appVersion:'6.43-unchanged',scope:'Same28EasterPNG,4,604,051B,18menu+10Settings. Isolated Chrome page, anonymous cross-origin public QA images, generated metrics sent only to local loopback fixture. No account/game/socket/private API or CDP. One sample per condition, not controlled causal benchmark.',cases,
  findings:[
   'An independent local Chrome test with no game code or Render image route also ANRed and took60s with27/28ready. Therefore the earlier slowdown cannot be attributed solely to game code or Render.',
   'OneAVD before cold boot still took40s. Same local PNG test after cold boot and foreground activation took3.076s with28/28ready. This supports an environment contribution but does not isolate RAM, GPU, process age or foreground as the sole cause.',
   'First measured QA image run after recovery took24.815s with maxload24.706s/maxdecode0.189s/maxlag19.1ms/0longtask. The remaining wait was mainly before onload in this fixture. This is not proof of server-side delay alone.',
   'Fresh desktop QA fixture0.569s; repeated Android QA fixture0.364s. Cache partition/context/process differ. transferSize0for remote images may reflect TAO restrictions; it is not proof of a network-free cache hit.',
   'After recovery, actualQAapp firstEaster choice succeeded with28PNGreadyby1967ms/0timeout. Existing WebView cache remained intact. It does not supersede earlier37s failure or prove cold loading/S25 speed repaired.'
  ],
  environment:[
   {stage:'After initial independentChromeANR',freeHostGB:0.76,totalHostGB:15.23,cpuLoadPercent:22,emulatorWorkingSetGB:4.1,avdCount:2},
   {stage:'After stopping unused firstAVD',freeHostGB:1.92,totalHostGB:15.23,avdCount:1},
   {stage:'Recovery',avd:'Duel_QA_Player2',port:5556,flags:['-no-snapshot-load','-no-boot-anim'],foregroundActivated:true,dataCleared:false,gpuOrGeometryChanged:false}
  ],
  appCheck:{from:'dark',to:'easter',userSelections:1,result:'completeEasterSettings',readyPngs:28,maxPngReadyMs:1967,timeouts:0,scope:'Per-PNGreadiness,notend-to-endtransitiontiming. Cache preserved,onecoldbootedAVDforeground;notcoldnetwork.'},
  fixtureSafety:'Only28allowlistedPNG paths and schema-filtered local results. ForeignOrigin/invalidschema/arbitraryfiles/extra-field tests PASS. First server automatically expired; intermediateQA retry hadANR/no completed result and is not counted as measuredQA latency. Second server automatically exited too. No server remains from this run.',
  restoration:'Chrome force-stopped, QAapp reopened without new game/ad/reward/rematch input. First unusedAVD restarted with original name/port/default settings. Second returnedGreenmenu. Displayedbalance12168unchanged;notcompleteDBaccountingaudit. No DB/session/auth/private-storage reads or writes. Login handoff completed by user, no authentication automation.',
  changes:'Only local diagnostic scripts and evidence. No appJS/CSS/PNGversion/style/palette/dimension/economic changes or deployment. No claim of fully resolvedANR/coldloading.',
  next:['Use stable/coldbooted singleAVD foreground for performance checks; two devices only for actualduel scenarios','Measure first vs repeated ownedtheme/skin transfer on physicalS25, with cache conditions recorded','Separate visibleSettings requirements from hiddenmenu/room work in a measured fixture before a new runtime optimization; do not increase timeout again blindly','Other pending functional checks retain their prior limits'],images:frames};
 fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');
 const table=cases.map(r=>`<tr><td>${esc(r.label)}</td><td>${r.ready}/28</td><td>${(r.totalMs/1000).toFixed(3)}</td><td>${r.maxLagMs}</td><td>${r.maxTaskMs}</td></tr>`).join('');
 fs.writeFileSync(out+'/index.html',`<!doctype html><html lang="sr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Izolovani Android PNG rezultati</title><style>body{background:#17242e;color:#eef5f9;font:16px/1.5 system-ui;margin:24px}main{max-width:1120px;margin:auto}a{color:#a7ddff}table{border-collapse:collapse;width:100%}td,th{padding:9px;border-bottom:1px solid #627887;text-align:left}.table{overflow:auto}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px}article{background:#263844;padding:12px;border-radius:12px}img{width:100%;height:auto}</style><main><h1>Isti28PNG: izolovano Android merenje</h1><p>4.604.051B. Kod igre nije menjan. Ovo su pojedinačna merenja u različitim uslovima, bez dokazane uzročnosti jednog faktora.</p><div class="table"><table><thead><tr><th>Uslov</th><th>Spremno</th><th>Ukupno(s)</th><th>Maxlag(ms)</th><th>Maxtask(ms)</th></tr></thead><tbody>${table}</tbody></table></div><p>Chrome je prijavioANR i u lokalnoj fixturestranici bez igre/Rendera. Posle hladnog starta/foreground-a isti lokalniPNGpaket3,076s;inicijalniQA24,815s,ponovljeni0,364s. Ovo razdvaja deo uticaja okruženja i prvog učitavanja, ali ne dokazuje da je app/S25sporost potpuno rešena.</p><p><strong>StvarnaQAaplikacija posle oporavka: jedanEasterizbor uspešan,28PNGreadydo1,967s,0timeout.</strong> SačuvanWebViewkeš; nije meren hladni transfer ili ukupna animacija.</p><p><a href="report.json">Rezultati i granice</a> · <a href="app-png-timing.json">Namenski appPNGtiming</a> · <a href="../postdeploy643-2026-10-31/index.html">Raniji neuspeh37s ostaje istorijski dokaz</a></p><div class="grid">${frames.map(f=>`<article><p>${esc(f.label)}</p><img src="${f.file}" alt="${esc(f.label)}" loading="lazy"></article>`).join('')}</div></main></html>\n`);
 console.log('WROTE7isolatedcases,independentChromeANR,recoveryandoneappEasterchoice1967ms;cachedscopeonly,noappchanges.');
})().catch(e=>{console.error(e);process.exitCode=1;});
