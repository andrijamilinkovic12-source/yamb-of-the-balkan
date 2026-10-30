// Build evidence from inspected native screenshots and sanitized read-only QA snapshots.
// This script performs no network calls, device input or game actions.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const sharp = require(process.env.YAMB_SHARP_PATH || 'sharp');
const root = path.resolve(__dirname, '..');
const input = path.join(root, 'tmp/two-emulator-qa-2026-10-29');
const out = path.join(root, 'docs/theme-visual-audit/postdeploy-2026-10-30');
const read = name => JSON.parse(fs.readFileSync(path.join(input, name), 'utf8'));
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function main() {
  const versions = read('published-versions.json');
  const isolation = read('staging-readiness.json');
  const before = read('qa-deploy638-before.json');
  const after = read('qa-results-readonly.json');
  assert.equal(versions.localGameVersion, '6.38');
  assert.equal(versions.results.length, 2);
  assert(versions.results.every(x => x.status === 200 && x.gameVersion === '6.38' && x.matchesLocalNormalized));
  assert.equal(isolation.isolatedRuntimeConfirmed, true);
  assert.equal(before.database, 'yamb_reconnect_qa');
  assert.equal(after.database, before.database);
  assert.equal(before.productionReadOrWritten, false);
  assert.equal(after.productionReadOrWritten, false);
  assert.deepEqual(after.profiles, before.profiles, 'QA profiles changed during this verification');
  assert.deepEqual(after.results, before.results, 'QA results/claims changed during this verification');
  assert.deepEqual(after.networkTestDiagnostics, before.networkTestDiagnostics);
  const themes = [
    ['dark', 'Zelena'], ['neon', 'Neon Cyber'], ['easter', 'Vaskršnja'],
    ['desert', 'Pustinjsko Staklo'], ['severna', 'Severna Maglina'],
    ['light', 'Svetlo Zlato'], ['medium', 'Trula Višnja'], ['winter', 'Plavi Okean'],
    ['amethyst', 'Kraljevski Ametist'], ['moon', 'Mesečev Sjaj']
  ];
  const frames = [
    {stem:'qa-deploy638-menu-p1', label:'Otvoren nalaz: Android prijavljuje da QA aplikacija ne odgovara posle ponovnog pokretanja. Ovo nije uspešan kadar.'},
    {stem:'qa-deploy638-after-wait-p1', label:'Drugi emulator: glavni meni oporavljen posle opcije Sačekaj; uzrok zastoja nije utvrđen.'},
    {stem:'qa-deploy638-after-reload-p0', label:'Prvi emulator: glavni meni Mesečevog Sjaja posle ponovnog pokretanja QA aplikacije.'},
    ...themes.map(([id,name]) => ({stem:`qa-deploy638-${id}`, theme:id, label:`${name}: Podešavanja posle jednog izbora. Zelena je izabrana pri završnom vraćanju.`})),
    {stem:'qa-deploy638-final-menu-p1', label:'Završno stanje drugog emulatora: Zelena i glavni meni, Podešavanja zatvorena.'}
  ];
  fs.mkdirSync(out, {recursive:true});
  for (const frame of frames) {
    const file = frame.stem + '.jpg';
    const source = path.join(input, 'screens', frame.stem + '.png');
    const meta = await sharp(source).metadata();
    assert.equal(meta.width, 1440);
    assert.equal(meta.height, 3120);
    await sharp(source).resize({width:540}).jpeg({quality:88}).toFile(path.join(out,file));
    frame.file = file;
  }
  const report = {
    date:'2026-10-30', commit:versions.localCommit, gameVersion:'6.38',
    publicVerification:versions, qaIsolation:isolation,
    nativeEnvironment:'Zasebni APK com.yamb.balkan.staging; emulator-5554 i emulator-5556, originalnih 1440×3120/560dpi. Oba prijavljena QA naloga zadržana. Samo QA aplikacije ponovo pokrenute, bez brisanja podataka ili promene geometrije.',
    nativeThemeSelection:{
      status:'PASS za primenu svih deset izbora u ovoj sesiji',
      themes:themes.map(([id,name])=>({id,name,singleSelectionApplied:true})),
      scope:'Jedan korisnički izbor po temi u Podešavanjima, finalni prikaz vizuelno pregledan. Paleta, naziv i tematske PNG kontrole primenjeni. Zelena vraćena i glavni meni pregledan.',
      observationDelayMs:14000,
      limits:'Fiksno čekanje pre snimanja nije merenje brzine. Nije čišćen cache. Nema instrumentacije internog retry ogranka; uspešan pojedinačni izbor nije dokaz da se retry aktivirao. Ovo nije test svih skinova ili menjanja teme tokom igre, niti novo potpuno merenje svih dimenzija.'
    },
    fixes:{
      R34:'Objavljena v6.38: kompletna readiness i jedan ograničen automatski retry pri ručnom izboru iz Podešavanja. Native potvrda: 10/10 pojedinačnih izbora primenjeno. Interni ogranci imaju ranije lokalne testove, nisu praćeni u WebView-u.',
      R33:'Objavljeni game.js sadrži ispravku nulte kazne u dukatima. Ranijih 16 izolovanih handler slučajeva prolazi; novi native tehnički poraz sa nultom kaznom nije odigran.'
    },
    startupFinding:{status:'OPEN', observation:'Drugi emulator prikazao je Android app-not-responding dijalog. Opcija Sačekaj dovela je do oporavljenog glavnog menija. Prvi meni takođe pregledan posle reload-a.', limits:'Uzrok nije utvrđen; nema tvrdnje da je hladni start brz ili da je zastoj otklonjen. ADB snimanje je povremeno kasnilo/neuspevalo; takvi kadrovi nisu dokaz stanja aplikacije.'},
    dataBoundary:{
      beforeAt:before.at, afterAt:after.at, profilesUnchanged:true, resultsAndClaimsUnchanged:true,
      balances:after.profiles.map(p=>({player:p.playerName,balance:p.balance,games:p.games,lastDaily:p.lastDaily,lastDailyRewardClaimed:p.lastDailyRewardClaimed})),
      latestMatchFingerprint:after.results[0].matchFingerprint,
      latestMatchClaimedCount:after.results[0].rewardClaimedCount,
      note:'Nema nove partije, oglasa, poziva, revanša ili novog preuzimanja. Ranije automatsko preuzimanje 439/675 ostaje istorijski zasebno evidentirano; pre ovog pregleda claim count već je bio 2. Daily nagrada ostaje nepreuzeta. QA baza samo čitana, produkcija proverena samo javnim HTTP odgovorima.'
    },
    remaining:['Native tehnički poraz sa nultom kaznom R33','Android završni panel posle ranijeg resize pomeranja','Merenje hladnog starta/prvog učitavanja tema i skinova','Stvarni revanš/reconnect i poziv na dva uređaja; korisnik je odbio dodatno preuzimanje','Fizički S25, oglasi i nagrade'],
    images:frames
  };
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report,null,2)+'\n');
  fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><html lang="sr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Post-deploy QA v6.38</title><style>body{background:#17242e;color:#eff5fa;font:16px/1.5 system-ui;margin:0;padding:24px}main{max-width:1150px;margin:auto}a{color:#9edfff}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px}article{background:#233440;padding:12px;border-radius:12px}img{width:100%;height:auto}strong{color:#ffe0a3}</style><main><h1>Post-deploy QA v6.38 — 30.10.2026.</h1><p>Oba javna servisa odgovaraju v6.38 iz commita ${escape(report.commit)} (game.js identičan posle CRLF/LF normalizacije). Produkcija je proverena samo javnim HTTP odgovorima.</p><p>${escape(report.nativeEnvironment)}</p><p><strong>Svih deset tema primenjeno jednim izborom u Podešavanjima.</strong> Finalni kadrovi pregledani; Zelena vraćena. Fiksno čekanje od 14 sekundi pre snimanja ne predstavlja izmereno vreme učitavanja. Cache nije očišćen i unutrašnji retry nije instrumentovan.</p><p><strong>Otvoren zastoj pri pokretanju:</strong> drugi emulator oporavljen opcijom Sačekaj. Uzrok nije poznat; ovo nije potvrda brzog hladnog starta.</p><p>R33 je objavljen, ali novi native tehnički poraz sa nultom kaznom nije ponovljen. Pre/posle QA profili, salda, rezultati i broj preuzimanja identični; Daily nepreuzet. Nema nove partije, reklame ili poziva.</p><p><a href="report.json">Potpuna evidencija, javni hash i granice dokaza</a> · <a href="../remaining-work-plan-2026-10-29.md">Preostale provere</a></p><div class="grid">${frames.map(f=>`<article><p>${escape(f.label)}</p><img src="${escape(f.file)}" loading="lazy" alt="${escape(f.label)}"></article>`).join('')}</div></main></html>\n`);
  console.log('Post-deploy evidence: 14 inspected native frames; 10 theme choices; before/after QA profiles and results identical.');
}
main().catch(error => {console.error(error);process.exitCode=1;});
