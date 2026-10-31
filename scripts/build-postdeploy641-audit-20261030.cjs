// Publish already observed Android screenshots/public static verification only.
// No device input, auth, account API, database, ad or reward operations.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sharp=require(process.env.YAMB_SHARP_PATH||'sharp');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/theme-visual-audit/postdeploy641-2026-10-30');
const published=JSON.parse(fs.readFileSync(path.join(out,'published.json'),'utf8'));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function main(){
 assert.equal(published.commit,'429cec221fae3d415581dbff2148a6f0c4ce1a43');
 assert.equal(published.rows.length,2);assert(published.rows.every(r=>r.resources.length===6&&r.resources.every(x=>x.status===200&&x.matchesLocalNormalized&&x.version===x.expectedVersion)));
 const frames=[
  ['before','Drugi QA emulator pre ponovnog otvaranja: Green meni, saldo12168.'],
  ['start','Prvi sačuvani kadar posle Android Activity otvaranja; Activity mera nije vreme do spremnog menija.'],
  ['menu','Naknadni meni ima nepotpuno iscrtan donji deo pozadine. Ne označava se kao potpuno stabilan prvi kadar.'],
  ['green-leaderboard-ready','Green Top lista: globalni tab, zaglavlje, kontrole i medalje.'],
  ['green-leaderboard-local','Green Top lista: lokalni tab i njegova ikona.'],
  ['green-online-ready','Green Online igrači: ikona sobe, pretraga i sopstveni red. Nema drugog reda/aktivnog oka u ovoj listi.'],
  ['green-invite-ready','Green Pozovi prijatelja: dinamičke kartice, friend/search/send i Indeks moći; bez slanja poziva.'],
  ['neon-first','Prvi Neon izbor: još je vidljiv ekran pripreme.'],
  ['neon-result','Bez ponovljenog izbora: kompletna Neon Podešavanja.'],
  ['easter-first','Prvi Vaskršnji izbor: priprema, konačan uspeh još nije potvrđen.'],
  ['easter-result','Ishod prvog Vaskršnjeg izbora: ostao Neon. Nalaz prvog učitavanja ostaje otvoren.'],
  ['easter-retry','Ponovljeni izbor: kompletna Vaskršnja Podešavanja.'],
  ['moon-first','Prvi Mesečev izbor: ekran pripreme.'],
  ['moon-result','Bez ponovljenog izbora: kompletna Podešavanja Mesečevog Sjaja.'],
  ['neon-return','Jedan povratni izbor posle Easter/Moon: ponovo kompletan Neon.'],
  ['neon-leaderboard','Neon Top lista: globalni tab sa njegovim kanonskim PNG.'],
  ['neon-leaderboard-local','Neon Top lista: lokalni tab; nema zelenih kontrolnih ikona.'],
  ['neon-online','Neon Online igrači: zaglavlje i search PNG; samo sopstveni red.'],
  ['neon-invite','Neon Pozovi prijatelja: sopstveni friend/search/send/PowerIndex PNG u dinamičkim karticama.'],
  ['hotseat-choice-ready','Hotseat nije ponudio nastavak; otvorio je unos za novu partiju. Ime nije uneseno niti potvrđeno.'],
  ['hotseat-cancel','Unos je otkazan preko X, vraćen Neon meni. Nema nove partije ili skin testa u igri.'],
  ['green-return-result','Jednim povratnim izborom ponovo kompletna Green Podešavanja.'],
  ['final-menu','Završni kompletan Green meni; prikazani saldo i dalje12168.']
 ].map(([suffix,label])=>({file:'qa-deploy641-'+suffix+'.jpg',source:'qa-deploy641-'+suffix+'.png',label}));
 for(const f of frames){
  const file=path.join(root,'tmp/two-emulator-qa-2026-10-29/screens',f.source),meta=await sharp(file).metadata();
  assert.equal(meta.width,1440);assert.equal(meta.height,3120);
  await sharp(file).resize({width:420}).jpeg({quality:86}).toFile(path.join(out,f.file));
 }
 const report={date:'2026-10-30',version:'6.41',commit:published.commit,published,
  nativeScope:'Separate com.yamb.balkan.staging on emulator-5556; ordinary visible native screenshots and taps only. No private WebView/CDP/session inspection. Public files verified and QA app force-stopped/reopened, not an Android byte-hash proof. Original1440x3120 geometry unchanged; image/HTTP cache and app data not cleared.',
  startup:{activityStatus:'ok',launchState:'COLD',activityTotalMs:13476,activityWaitMs:13523,scope:'Android Activity launch only; not time to ready menu or cold network/image cache. One uncontrolled sample cannot establish improvement over v6.40. First emulator was paused for this run; earlier runs had different contention. Partial/transitional frames remained. ANR cause still unproven; no new ANR dialog in inspected frames, no continuous monitoring.'},
  themeChoices:[{from:'dark',to:'neon',attempts:1,result:'complete Settings'},{from:'neon',to:'easter',attempts:1,result:'failed; retained Neon'},{from:'neon',to:'easter',attempts:2,result:'complete Settings after repeated choice'},{from:'easter',to:'moon',attempts:1,result:'complete Settings'},{from:'moon',to:'neon',attempts:1,result:'complete Settings on return'},{from:'neon',to:'dark',attempts:1,result:'complete Settings and final main menu'}],
  R37:{status:'Targeted native visible-room confirmation; not all ten Android themes or proof of zero hidden network requests on Android',themes:['dark','neon'],rooms:['Top lista','Online igrači','Pozovi prijatelja'],
   leaderboard:'Global/local tab controls and headers loaded with the selected theme; canonical podium medals visible. No score changes.',
   onlinePlayers:'Selected theme room/search icons and self row loaded. Only the signed-in player was listed while first emulator paused; friend/duel/eye controls beside another player and live-eye activation were not tested.',
   invite:'Selected theme header/friend/search/send/PowerIndex PNG visible in dynamically rendered host/rival/friend cards. Other test profile offline. No friend request, invitation, match or share-link action.',
   localEvidence:'Earlier isolated comparison:14PNG/719184B->0startup,126->0during hidden-theme changes,40visible cases across10themes. Those counts are local evidence, not native traffic measurements.'},
  skinBoundary:'Hotseat mode click offered new-player-name input, not a saved-game continuation. Input canceled through X without entering/confirming a name. No new game, dice roll or score entry. Active-game theme/skin speed, dice/buttons/counter readiness remain unverified in this run.',
  financialBoundary:'No ad, reward/rematch button, purchase, game completion, invitation or DB read/write. Displayed Sara balance12168before/after; not a complete profile/server accounting audit.',
  restoration:'First emulator observed at Moon main menu before pause; adb emu avd resume/status confirmed running at end. Second left on complete Green main menu. No geometry/data clearing or account switching.',
  runtimeChanges:'None in this run. Only verification scripts, definitions, registry metadata and evidence updated; no new PNG/CSS/JS app behavior or version bump.',
  open:['First Vaskršnja theme selection still required a second user choice','Precise startup/first download and cause of previous ANR','Active-game skin/theme readiness: no saved Hotseat continuation offered','Shared eye/live timer under actual online gameplay','Prior Android finish-panel geometry case, two-device invite/reconnect/rematch and physical S25 ads/rewards remain separate'],images:frames};
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="sr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Posle objave v6.41</title><style>body{background:#17242e;color:#eef5f9;font:16px/1.5 system-ui;padding:24px}main{max-width:1150px;margin:auto}a{color:#a7ddff}strong{color:#ffe0a3}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}article{background:#263844;padding:12px;border-radius:12px}img{width:100%;height:auto}</style><main><h1>Posle objave v6.41 — ciljana Android provera</h1><p>Commit ${esc(published.commit)}; oba javna servisa imaju odgovarajućih šest fajlova. Izdvojena QA aplikacija ponovo otvorena, sačuvan keš/podaci i geometrija.</p><p><strong>R37: tri sobe u Green/Neon temama imaju ciljanu potvrdu prikazanih PNG.</strong> Top lista oba taba; Online igrači zaglavlje/pretraga/sopstveni red; Pozovi prijatelja dinamičke kartice i shared PowerIndex/friend/search/send. Ovo nije svih deset native tema ili merenje skrivenih mrežnih zahteva. Oko uz drugog igrača nije bilo prikazano u ovom stanju.</p><p><strong>Vaskršnja i dalje traži ponovljeni izbor.</strong> Prvi ostavioNeon; drugi uspeo. Neon iMoon prvi izbor uspešni; povratakNeon i završniGreen uspeli jednim izborom. Ne tvrdi se trenutno ili potpuno rešeno učitavanje.</p><p>Activity COLD13476ms nije app-ready vreme ili pouzdano poređenje sa prethodnim prolazom. Prvi emulator pauziran tokom pregleda, pa vraćenrunning. Viđeni prelazni/nepotpuni kadrovi. Uzrok ranijegANR-a ostaje otvoren.</p><p>Hotseat ponudio unos za novu partiju, ne nastavak. Otkazano bez unosa imena/početka igre; skinovi u aktivnoj partiji nisu ovim potvrđeni. Nema reklame/nagrade, nove igre ili DB pristupa. ZavršniGreen meni i saldo12168isti. Nema novih runtime izmena.</p><p><a href="report.json">Rezultati i granice</a> · <a href="published.json">Objavljeni fajlovi i hash-evi</a> · <a href="../remaining-work-plan-2026-10-29.md">Preostalo</a></p><div class="grid">${frames.map(f=>`<article><p>${esc(f.label)}</p><img src="${esc(f.file)}" alt="${esc(f.label)}" loading="lazy"></article>`).join('')}</div></main></html>\n`);
 const tiles=await Promise.all(frames.map((f,i)=>sharp(path.join(out,f.file)).resize({width:180}).extend({top:22,bottom:0,left:0,right:0,background:'#17242e'}).composite([{input:Buffer.from(`<svg width="180" height="22"><text x="3" y="16" fill="white" font-size="11">${i+1}. ${esc(f.source.replace('qa-deploy641-','').replace('.png',''))}</text></svg>`),left:0,top:0}]).png().toBuffer()));
 await sharp({create:{width:720,height:412*6,channels:3,background:'#17242e'}}).composite(tiles.map((input,i)=>({input,left:(i%4)*180,top:Math.floor(i/4)*412}))).png().toFile(path.join(out,'review-sheet.png'));
 console.log('WROTE:23 reviewed native frames, public6.41, R37three rooms/two themes, Easter first-choice failure and active-game skin test remain OPEN. No runtime changes.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
