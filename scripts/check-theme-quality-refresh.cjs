const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const manifest=JSON.parse(read('source-assets/theme-quality-refresh-v2/manifest.json'));
const {resolve,replacements}=require('../www/theme-quality-assets.js');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const verified=manifest.assets.filter(a=>a.status==='verified');
if(process.argv.includes('--complete'))assert.equal(verified.length,manifest.assets.length,'Some PNGs still await generation or review');
const fingerprints=new Set();
for(const asset of verified){
 const png=fs.readFileSync(path.join(root,asset.productionPath)),old=fs.readFileSync(path.join(root,asset.previous));
 assert.equal(hash(png),asset.sha256);assert.equal(hash(old),asset.previousSha256,'Original source was overwritten');
 assert.equal(hash(fs.readFileSync(path.join(root,asset.master))),asset.masterSha256);
 assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],[old.readUInt32BE(16),old.readUInt32BE(20)],'PNG canvas dimension changed');
 assert.equal(png[25],6,'Production PNG must retain RGBA transparency');
 assert.equal(resolve(asset.previous),asset.productionPath);
 assert.equal(resolve(asset.previous.replace(/^www\//,'')+'?v=999'),asset.productionPath.replace(/^www\//,''));
 assert.equal(resolve(asset.previous+'?v=999&retry=again'),asset.productionPath+'?retry=again','Image retry token was discarded');
 assert(!fingerprints.has(asset.sha256),'Duplicated generated PNG');fingerprints.add(asset.sha256);
 assert(asset.review,'Missing manual visual review');
}
for(const redirect of manifest.redirects){
 assert(fs.existsSync(path.join(root,redirect.to)));
 assert.equal(resolve(redirect.from),redirect.to);
 assert(redirect.to.includes('/canonical/rewarded-video/'));
}
assert.equal(resolve('assets/not-in-this-pack.png?v=7'),'assets/not-in-this-pack.png?v=7');
for(const source of Object.keys(replacements))assert.equal(resolve(resolve(source)),resolve(source),'Mapping not idempotent');
let theme='dark';
const context={YAMB_THEME_IDS:['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna'],window:{location:{hostname:'localhost',protocol:'file:',origin:'null'}},
 document:{readyState:'loading',addEventListener(){},documentElement:{dataset:{splashTheme:'dark'}},body:{classList:{contains(value){return value===theme+'-theme';}}}},
 localStorage:{getItem(){return theme;}},URL,console:{log(){}},setTimeout(){},MutationObserver:class{observe(){}}};
vm.createContext(context);
for(const file of ['theme-quality-assets','config','theme-solo-results','theme-online-players-room'])vm.runInContext(read('www/'+file+'.js'),context);
const medal=vm.runInContext('getThemeMedalSource',context),shop=vm.runInContext('SHOP_DATA',context);
for(const current of ['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna']){
 theme=current;const prefix=current==='dark'?'assets/green-soft-clay':`assets/theme-packs/${current}`;
 for(const family of ['fire-streak','power-index'])for(const tier of ['gold','silver','bronze']){
  const value=medal(family==='fire-streak'?'fireStreak':'powerIndex',tier,current);
  assert.equal(value.split('?')[0],resolve(`${prefix}/canonical/competition-medals/${family}-${tier}-v1.png`).split('?')[0]);
 }
 for(const role of ['weekly','monthly','all_time','personal'])assert.equal(context.window.themeSoloResults.recordIconSource(current,role).split('?')[0],resolve(`${prefix}/canonical/solo-record-icons/${role}-v1.png`).split('?')[0]);
 assert.equal(context.window.themeOnlinePlayers.asset('state',current).split('?')[0],resolve(`assets/theme-packs/${current}/canonical/online-players-internal/state-v1.png`).split('?')[0]);
 const key=current==='dark'?'greenIcon':current+'Icon';
 for(const asset of verified.filter(a=>a.theme===current&&a.previous.includes('/achievement-trophies/'))){
  const trophy=shop.TROPHIES.find(t=>t.id===asset.role);assert.equal(trophy[key],asset.productionPath.replace(/^www\//,''));
 }
}
const manager=read('www/managers.js'),start=manager.indexOf('    getTreasuryEffectPreviewSource('),end=manager.indexOf('    getTreasuryRewardVideoIcon()',start);
const preview=vm.runInContext(`({${manager.slice(start,end)}}).getTreasuryEffectPreviewSource`,context);
for(const asset of verified.filter(a=>a.previous.includes('/treasury-effect-thumbnails/'))){
 theme=asset.theme;const role=asset.role.replace('preview-','');const id={'gold-rain':'gold_rain','cosmic-dust':'cosmic_dust'}[role]||role;
 assert.equal(preview.call({},id),asset.productionPath.replace(/^www\//,''));
}
const html=read('www/index.html');assert(html.indexOf('theme-quality-assets.js')<html.indexOf('<script src="config.js'));
for(const file of ['config','theme-solo-results','theme-online-players-room','theme-leaderboard-room','pravilaigre','kvartalnaliga','dnevniizazov','game','theme-rewarded-video-pack','theme-main-room-icons','managers'])assert(read('www/'+file+'.js').includes('resolveThemeQualityAsset'),file+' bypasses quality sources');
if(process.argv.includes('--complete')){
 const report=JSON.parse(read('docs/theme-visual-audit/report.json'));
 assert.equal(report.qualityRefresh.verified,manifest.assets.length,'Visual report is stale');
 for(const asset of verified){
  const entry=report.assets.find(row=>row.file===asset.productionPath);
  assert(entry&&entry.activation.startsWith('active-'),'New PNG missing from active audit: '+asset.productionPath);
  assert.equal(entry.visualStatus,'prihvatljiv');
  assert.equal(entry.qualityReview,asset.review,'Per-file review evidence missing');
 }
 assert(!report.assets.some(row=>row.activation.startsWith('active-')&&row.visualStatus!=='prihvatljiv'),'Unresolved active quality finding');
}
console.log(`PASS: ${verified.length}/${manifest.assets.length} individually reviewed PNGs, preserved dimensions/originals and unique hashes; ${manifest.redirects.length} canonical video redirects; ten-theme medals, records, states, trophy and effect consumers.`);
