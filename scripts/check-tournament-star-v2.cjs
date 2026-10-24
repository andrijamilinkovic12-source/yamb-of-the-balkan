const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const manifest=JSON.parse(read('source-assets/theme-tournament-star-v2/manifest.json'));
const report=JSON.parse(read('docs/theme-visual-audit/report.json'));
const revised=['winter','neon','amethyst','easter','desert','moon','severna'];
const roles=['champion-trophy','tournament-gold','tournament-silver','tournament-bronze','finalist-silver'];
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(manifest.assets.length,35);
for(const theme of revised)for(const role of roles){
 const asset=manifest.assets.find(a=>a.theme===theme&&a.role===role);assert(asset,theme+'/'+role);
 assert.equal(hash(fs.readFileSync(path.join(root,asset.master))),asset.masterSha256);
 for(const output of asset.production){
  const bytes=fs.readFileSync(path.join(root,output.productionPath)),old=fs.readFileSync(path.join(root,output.supersedes));
  assert.equal(hash(bytes),output.sha256);
  assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[old.readUInt32BE(16),old.readUInt32BE(20)]);
  const audited=report.assets.find(a=>a.file===output.productionPath);
  assert(audited?.evidence.largeAnd28px,'Missing visual review: '+output.productionPath);
  assert.equal(audited.visualStatus,'prihvatljiv');assert(audited.activation.startsWith('active-'));
  assert(audited.alpha.corners.every(alpha=>alpha===0),'Opaque backdrop: '+output.productionPath);
  const previous=report.assets.find(a=>a.file===output.supersedes);assert.equal(previous?.activation,'superseded');
 }
}
const context={window:{location:{hostname:'localhost',protocol:'file:',origin:'null'}},URL,localStorage:{getItem(){return 'dark';}},console};
vm.createContext(context);vm.runInContext(read('www/config.js'),context);
const medal=vm.runInContext('getThemeMedalSource',context);
const roomCode=read('www/game.js');
const from=roomCode.indexOf('    getMainRoomPackSource('),to=roomCode.indexOf('    getOnlineRandomStateSource(',from);
const room=vm.runInNewContext(`({${roomCode.slice(from,to)}}).getMainRoomPackSource`);
const turnir=read('www/turnir.js'),begin=turnir.indexOf('const getTournamentFinalistSource ='),end=turnir.indexOf('\n};',begin)+3;
const finalist=vm.runInNewContext(turnir.slice(begin,end)+';getTournamentFinalistSource');
for(const theme of ['dark','light','medium',...revised]){
 const revision=revised.includes(theme)?2:1;
 for(const tier of ['gold','silver','bronze'])assert(medal('tournament',tier,theme).split('?')[0].endsWith(`tournament-${tier}-v${revision}.png`));
 assert(finalist(theme).endsWith(`finalist-silver-v${revision}.png`));
 if(theme!=='dark')for(const variant of ['menu','room'])assert(room(theme,'tournament',variant).endsWith(`champion-trophy${variant==='menu'?'':'-room'}-v${revision}.png`));
}
const ids=new Set();for(const a of report.assets){assert(!ids.has(a.file),'Duplicate inventory file');ids.add(a.file);assert(a.evidence.largeAnd28px);assert(['prihvatljiv','potrebna dorada','potrebna zamena'].includes(a.visualStatus));}
assert.equal(report.missingReferences.length,0);
assert.equal(report.starCorrection.productionPngs,42);
console.log('PASS: 35 reviewed star masters / 42 dimension-preserving transparent PNGs; ten-theme champion, medal and finalist routing; audited file coverage. Browser/device review remains explicitly pending.');
