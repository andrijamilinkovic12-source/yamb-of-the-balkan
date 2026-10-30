// Existing QA screenshots, kept separate from the isolated renderer evidence.
const fs=require('node:fs'),path=require('node:path');
const sharp=require(process.env.YAMB_SHARP_PATH||'sharp');
const root=path.resolve(__dirname,'..'),screens=path.join(root,'tmp/two-emulator-qa-2026-10-29/screens');
const out=path.join(root,'docs/theme-visual-audit/theme-switch-2026-10-30');
async function main(){
 fs.mkdirSync(out,{recursive:true});
 const images=[
  ['qa-theme-switch-oct30-settings-initial','Početni izbor: Zelena aktivna, Neon dostupan.'],
  ['qa-theme-switch-oct30-neon-settled','Posle prvog izbora Neona ostala je Zelena.'],
  ['qa-theme-switch-oct30-neon-retry-settled','Posle ponovljenog izbora primenjen Neon i njegovi PNG kontrolni elementi.'],
  ['qa-theme-switch-oct30-green-restore-settled','Vraćena Zelena tema i sačuvan srpski jezik.']
 ];
 for(const [stem]of images)await sharp(path.join(screens,stem+'.png')).resize({width:540}).jpeg({quality:88}).toFile(path.join(out,stem+'.jpg'));
 const report={date:'2026-10-30',environment:'Zasebni QA APK com.yamb.balkan.staging, emulator-5556,1440×3120/560dpi, objavljeni klijent v6.36/910b816c.',observed:'Prvi izbor Green→Neon nije primenjen; ponovljeni jeste. Zelena vraćena. Nema nove igre, poziva, oglasa ili pritiska na nagradu.',limits:'Ovo nisu precizna merenja trajanja učitavanja. ADB/native framebuffer je povremeno kasnio ili nije mogao da snimi kadar; neuspešne snimke ne tumačiti kao stanje aplikacije. Tačan spor PNG/HTTP zahtev nije identifikovan. Nije proveren prvi izbor svih deset tema, fizički telefon ili skin u aktivnoj igri.',localFix:'R34/game.jsv6.38: pri ručnom izboru iz Podešavanja jedan automatski ponovni pokušaj koristi postojeći image/decode cache. Gate čeka oba vidljiva paketa i retry; konačan neuspeh čuva prethodnu kompletnu temu. Noviji izbor, offline stanje i promena naloga zaštićeni. Nije deployovano niti ovim Android snimcima potvrđeno. Vreme prvog preuzimanja nije ovim dokazano smanjeno.',tests:['test-game-theme-switch-preload.js: spor paket, jedan retry, trajni neuspeh, offline, noviji izbor i promena naloga','test-theme-loading-decode.cjs: gate čeka kompletnu readiness, ne skriva se prerano i zatvara se pri konačnom neuspehu','test-theme-preload-cache.cjs i test-theme-selection-sync.cjs','Settings room/switch/picker i game quick skins/header states/action lock','check-js.js'],images:images.map(([stem,label])=>({file:stem+'.jpg',label}))};
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="sr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Izbor teme — QA30.10.</title><style>body{background:#17242e;color:#eff5fa;font:16px/1.5 system-ui;padding:24px}main{max-width:1100px;margin:auto}a{color:#9edfff}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}img{width:100%;height:auto}</style><main><h1>Izbor teme — stvarni QA snimci</h1><p>${report.environment}</p><p>${report.observed}</p><p>${report.limits}</p><p>${report.localFix}</p><p><a href="report.json">Evidencija i lokalne provere</a></p><div class="grid">${report.images.map(x=>`<article><p>${x.label}</p><img src="${x.file}" loading="lazy" alt="${x.label}"></article>`).join('')}</div></main></html>`);
 console.log('WROTE native theme-switch audit: first failure, successful retry and restored Green; R34 remains local.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
