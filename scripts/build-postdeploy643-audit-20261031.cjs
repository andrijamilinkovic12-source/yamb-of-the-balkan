// Evidence only: public files, dedicated/redacted PNG timing and reviewed Android frames.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sharp=require(process.env.YAMB_SHARP_PATH||'sharp');
const out='docs/theme-visual-audit/postdeploy643-2026-10-31';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
(async()=>{
 const published=read(out+'/published.json');
 assert.equal(published.commit,'829a45b11c9b2865756e0a57b8cfd7992249e459');
 assert(published.rows.every(row=>row.resources.length===7&&row.resources.every(file=>file.status===200&&file.matchesLocalNormalized)));
 const timing=read('tmp/qa-theme-loading/emulator-5556-1793465577058.json');
 const easter=timing.events.filter(e=>e.asset.includes('easter')),ready=easter.filter(e=>e.event==='ready'),timeouts=easter.filter(e=>e.event==='timeout');
 assert.equal(ready.length,28);assert.equal(timeouts.length,41);assert.equal(Math.max(...ready.map(e=>e.elapsedMs)),37158);
 fs.writeFileSync(out+'/png-timing.json',JSON.stringify(timing,null,2)+'\n');
 const frames=[
  ['after-open','Početni gradijent posle otvaranja QA aplikacije; nije precizno mereno vreme spremnog menija.'],
  ['menu-ready','Kasnije kompletan Green meni, saldo12168.'],
  ['settings-ready','Kompletna Green Podešavanja pre promene teme.'],
  ['picker-green','Izbor tema sa delom još neučitanih preview slika.'],
  ['easter-first','Prvi i jedini Easter izbor: prikaz pripreme, konačan uspeh nije potvrđen.'],
  ['easter-first-result','Prvi izbor nije uspeo; zadržana Zelena tema.'],
  ['first-emulator-state','Prvi emulator na Android početnom ekranu pre privremene pauze.'],
  ['easter-warm-retry','Ponovljen izbor po završetku PNG-ova: prelazni kadar samo sa Easter pozadinom.'],
  ['easter-warm-ready','Konačna Easter Podešavanja posle ponovljenog izbora.'],
  ['return-green','Povratak na Zelenu temu jednim izborom.'],
  ['final-menu','Završni Green meni; oba emulatora ponovo u radu.']
 ].map(([suffix,label])=>({file:`qa-deploy643-${suffix}.jpg`,source:`qa-deploy643-${suffix}.png`,label}));
 for(const frame of frames){const source=path.join('tmp/two-emulator-qa-2026-10-29/screens',frame.source),meta=await sharp(source).metadata();assert.equal(meta.width,1440);assert.equal(meta.height,3120);await sharp(source).resize({width:420}).jpeg({quality:86}).toFile(path.join(out,frame.file));}
 const report={date:'2026-10-31',version:'6.43',published,
  result:'NOT FIXED: published longer retry is active but first Easter selection still fails when valid PNGs complete after the final deadline. Do not close R39/native loading failure.',
  scope:'Separate QA app emulator-5556; native screenshots and taps, dedicated PNG prefix from current QA PID, public static HTTP only. Preserved cache/data/1440x3120 geometry. No CDP/private WebView storage/auth/account API/DB. Not a cold-cache or all-ten-theme native benchmark.',
  startup:'QA force-stopped/reopened without am-start-W timing. Initial gradient then complete menu.19initialPNGready,0initialtimeouts,max4733ms relative to each PNG start; not total app-ready time. Later Settings/room preloading adds its own events. No new ANR dialog in inspected frames; not continuous monitoring.',
  firstEaster:{userSelections:1,result:'failed, retained Green',readyPngs:28,maxReadyMs:37158,timeoutEvents:41,
   timeoutByBudget:timeouts.reduce((a,e)=>(a[e.budgetMs]=(a[e.budgetMs]||0)+1,a),{}),timeoutByPhase:timeouts.reduce((a,e)=>(a[e.phase]=(a[e.phase]||0)+1,a),{}),
   pngErrors:easter.filter(e=>e.event==='error').length,pendingAfterLastCapture:timeouts.filter(t=>!ready.some(r=>r.id===t.id)).length,
   slowest:ready.sort((a,b)=>b.elapsedMs-a.elapsedMs).slice(0,5),
   conclusion:'24000ms retry events prove longer published path executed. Final ready37158ms exceeds6+24s allowance. Local18s case remains valid but did not cover this slower native run. Waiting-load dominates late assets, including callback scheduling; not proof of server latency alone.'},
  warmRetry:{result:'complete Easter Settings after one repeated selection',diagnosticEventCountBefore:104,diagnosticEventCountAfter:104,firstEmulator:'temporarily paused during warm retry only',boundary:'Warm retry changes both cache and host contention. It is not a controlled causal comparison or proof that pausing fixes first selection.'},
  host:{freeMemoryGB:1.31,totalMemoryGB:15.23,cpuLoadPercent:54,emulatorWorkingSetGB:4.99,boundary:'Single host snapshot, not proven cause.'},
  emulatorNetwork:{reportedDownloadBitsPerSecond:0,reportedUploadBitsPerSecond:0,minimumLatencyMs:0,maximumLatencyMs:0,changed:false,boundary:'Raw emulator console status; not interpreted as a broken link. Built-in speed help lists full/5g as no-limit. No networking setting was changed.'},
  publicPngProbe:read(out+'/public-png-probe.json'),
  restoration:'First emulator observed Android home, paused with avd stop for warm retry, then avd start/status confirmed running. Second returned to Green and main menu. No new game, roll/score entry, ad/reward/rematch button, purchase, invitation or DB access. Displayed balance12168unchanged, not full accounting audit.',
  codeChanges:'None. Only evidence, audit scripts and registry/definition metadata in this turn. No new version, PNG, CSS, dimension, palette, game rule or economic change.',
  next:'Investigate actual WebView resource queue/transfer/event-loop/rendering and host contention with controlled measurements. Do not keep increasing timeout or report speed/ANR fixed. Active-game skins and other remaining functional checks are separate.',images:frames};
 fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(out+'/index.html',`<!doctype html><html lang="sr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Objavljena v6.43 — provera</title><style>body{background:#17242e;color:#eef5f9;font:16px/1.5 system-ui;padding:24px}main{max-width:1100px;margin:auto}a{color:#a7ddff}strong{color:#ffe0a3}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}article{background:#263844;padding:12px;border-radius:12px}img{width:100%;height:auto}</style><main><h1>v6.43 — prvi Easter izbor i dalje neuspešan</h1><p>Oba servisa829a45b1, sedam javnih JS fajlova potvrđeno. Duži24s retry zaista je izvršen, ali poslednjiod28PNGspreman tek37.158ms. Prvi izbor zadržaoGreen; ponovljen iz keša uspešan.</p><p><strong>R39 nije zatvoren native dokazom.</strong> Lokalni18s test ostaje potvrda samo tog slučaja. Ovaj sporiji Android prolaz prekoračuje6+24s; rok nije ponovo produžavan.</p><p>Četiri javna PNG-a sa QA servisa vratila200/istiSHAza1,326–1,452sna računaru. To nije WebView mera niti dokazuje da je cela serverska putanja brza. Host1,31/15,23GBslobodno,CPU54%; nije dokazan uzrok. Sačuvan keš, nema10/10native/cold-cache/S25provere.</p><p>Prvi emulator sa Android home privremeno pauziran tokom ponovljenog toplog izbora, zatim vraćenrunning. Green vraćen na drugom. Bez nove igre/oglasa/nagrade/DB; bez novih runtime izmena.</p><p><a href="report.json">Nalazi i granice</a> · <a href="png-timing.json">Filtrirani PNG timing</a> · <a href="published.json">Objavljeni fajlovi</a> · <a href="public-png-probe.json">Javni PNG odgovori</a></p><div class="grid">${frames.map(f=>`<article><p>${esc(f.label)}</p><img src="${esc(f.file)}" alt="${esc(f.label)}" loading="lazy"></article>`).join('')}</div></main></html>\n`);
 console.log('WROTE: published6.43 confirmed, firstEaster still fails,28PNGfinish37158ms; warm retry/Green restoration; no runtime changes.');
})().catch(e=>{console.error(e);process.exitCode=1;});
