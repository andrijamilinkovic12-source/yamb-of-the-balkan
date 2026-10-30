// Actual cache methods with controllable image load/decode; no DOM, account or network.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const baseline=process.argv.includes('--baseline'),ref='7985cb3928fa9ecd3719d941cf4c692be181dfa1';
const root=path.resolve(__dirname,'..');
const source=baseline?execFileSync('git',['show',ref+':www/game.js'],{cwd:root,encoding:'utf8',windowsHide:true}):fs.readFileSync(path.join(root,'www/game.js'),'utf8');
const images=[];
class PendingImage{
 set src(url){this.url=url;images.push(this);}
 decode(){return Promise.resolve();}
 async loaded(){this.naturalWidth=256;this.naturalHeight=256;await this.onload();}
}
const context={window:{},Image:PendingImage,console,setTimeout,clearTimeout};
vm.runInNewContext(source.replace('window.app = new YambApp();','globalThis.App=YambApp;'),context);
const app=()=>{const instance=Object.create(context.App.prototype);instance.themeWarmups=new Map();instance.getThemeLoadingPack=()=>({});return instance;};
async function main(){
 const packApp=app();let packSources=['menu.png'];packApp.getThemeStartupSources=()=>packSources;
 const first=packApp.warmThemePack('dark');
 assert.equal(packApp.warmThemePack('dark'),first,'In-flight warmup must remain coalesced');
 await images.at(-1).loaded();assert.equal(await first.critical,true);
 const retained=packApp.warmThemePack('dark');assert.equal(retained,first,'Retained decoded pack must stay fast');
 // Evict through the actual LRU rather than editing cache internals.
 for(let i=0;i<70;i++){const ready=packApp.preloadThemeImage(`other-${i}.png`,1000);await images.at(-1).loaded();await ready;}
 assert(!packApp.themePreloadImages.has('menu.png'));
 const countBeforeRevisit=images.filter(x=>x.url==='menu.png').length;
 const revisit=packApp.warmThemePack('dark');
 const revisitsReloaded=images.filter(x=>x.url==='menu.png').length-countBeforeRevisit;
 if(revisitsReloaded)await images.at(-1).loaded();
 assert.equal(await revisit.critical,true);
 const packRevalidatedAfterEviction=revisit!==first&&revisitsReloaded===1;
 let changedSourcePrepared=null;
 if(!baseline){
  packSources=['menu.png','newly-visible.png'];
  const changed=packApp.warmThemePack('dark');
  const added=images.at(-1);assert.equal(added.url,'newly-visible.png');await added.loaded();
  changedSourcePrepared=await changed.critical;assert.equal(changedSourcePrepared,true);
 }
 const pendingApp=app();
 const pending=[];
 for(let i=0;i<70;i++)pending.push(pendingApp.preloadThemeImage(`pending-${i}.png`,10000));
 const pressure=pendingApp.preloadThemeImage('settled.png',1000);await images.at(-1).loaded();await pressure;
 const pendingFirst=images.find(x=>x.url==='pending-0.png');
 const retry=pendingApp.preloadThemeImage('pending-0.png',10000,'high');
 const downloadsForPending=images.filter(x=>x.url==='pending-0.png').length;
 // Resolve both old and accidental duplicate requests to leave no pending timers.
 for(const image of images.filter(x=>x.url.startsWith('pending-')))await image.loaded();
 assert((await Promise.all([...pending,retry])).every(Boolean));
 assert(pendingFirst.fetchPriority==='high'||baseline,'A retry should promote the original shared download');
 if(!baseline){
  assert(packRevalidatedAfterEviction,'A cached resolved warmup cannot substitute for evicted decoded images');
  assert.equal(downloadsForPending,1,'LRU pressure must never evict an in-flight image and start a duplicate');
  assert(pendingApp.themePreloadImages.size<=64,'The cache returns to its bound after loads settle');
  const overlapApp=app();let overlapSources=['shared-pending.png'];overlapApp.getThemeStartupSources=()=>overlapSources;
  const oldOverlap=overlapApp.warmThemePack('dark');
  overlapSources=['shared-pending.png','added-pending.png'];
  const newOverlap=overlapApp.warmThemePack('dark');
  assert.notEqual(newOverlap,oldOverlap,'New required sources join the barrier even during an older warmup');
  assert.equal(images.filter(x=>x.url==='shared-pending.png').length,1,'Overlapping warmups share unfinished images');
  for(const image of images.filter(x=>['shared-pending.png','added-pending.png'].includes(x.url)))await image.loaded();
  assert((await Promise.all([oldOverlap.critical,newOverlap.critical])).every(Boolean));
  const staleApp=app();let staleSources=['obsolete.png'];staleApp.getThemeStartupSources=()=>staleSources;
  const obsolete=staleApp.warmThemePack('dark');staleSources=['replacement.png'];
  const replacement=staleApp.warmThemePack('dark');
  images.find(x=>x.url==='obsolete.png').onerror();assert.equal(await obsolete.critical,false);
  assert.equal(staleApp.themeWarmups.get('dark'),replacement,'A failed old warmup cannot delete its newer replacement');
  await images.find(x=>x.url==='replacement.png').loaded();assert.equal(await replacement.critical,true);
 }
 const report={date:'2026-10-30',mode:baseline?'before':'after',baselineCommit:ref,scope:'Actual YambApp prototype methods with controlled Image callbacks; synthetic LRU/load pressure, not measured network/decode latency or Android ANR proof.',packRevalidatedAfterEviction,menuRevisitNewImageCount:revisitsReloaded,changedSourcePrepared,downloadsForPendingUrl:downloadsForPending,cacheEntriesAfterSettled:pendingApp.themePreloadImages.size,overlappingSourcesAndOldFailureGuard:baseline?'not tested':'PASS'};
 const out=path.join(root,'tmp/startup-profile-2026-10-30');fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,`preload-retention-${report.mode}.json`),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
