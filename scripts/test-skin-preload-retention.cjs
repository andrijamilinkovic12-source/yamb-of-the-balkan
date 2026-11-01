// Actual skin controller/catalog under controlled concurrent preparation and LRU pressure.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const baseline=process.argv.includes('--baseline'),ref='829a45b11c9b2865756e0a57b8cfd7992249e459';
const source=baseline?execFileSync('git',['show',ref+':www/skin-action-buttons.js'],{encoding:'utf8',windowsHide:true}):fs.readFileSync('www/skin-action-buttons.js','utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function flush(){await settle();await new Promise(resolve=>setTimeout(resolve,5));await settle();}
function fixture(){
 const images=[],maps=[],storage=new Map([['yamb_active_skin','default']]);
 const scene={dataset:{},style:{setProperty(){}},removeAttribute(){}};
 class Image {
  set src(value){this.source=value;images.push(this);}
  decode(){return Promise.resolve();}
  load(){this.naturalWidth=384;this.naturalHeight=384;return this.onload();}
 }
 class WatchedMap extends Map{constructor(...args){super(...args);maps.push(this);}}
 const context=vm.createContext({window:{app:{isThemeUnlocked:()=>true},addEventListener(){}},document:{getElementById:id=>id==='game-scene'?scene:null},localStorage:{getItem:key=>storage.get(key)||null},Image,Map:WatchedMap,setTimeout,clearTimeout,console});
 vm.runInContext('const SHOP_DATA='+JSON.stringify({SKINS:JSON.parse(fs.readFileSync('source-assets/dice-skins-v1/manifest.json','utf8')).skins}),context);
 for(const file of ['skin-action-buttons-data.js','skin-roll-counter-data.js'])vm.runInContext(fs.readFileSync('www/'+file,'utf8'),context);
 vm.runInContext(source,context);
 return{images,maps,scene,storage,api:context.window.skinActionButtons,ids:Object.keys(context.window.SKIN_ACTION_BUTTONS)};
}
(async()=>{
 const f=fixture();await Promise.all(f.images.map(image=>image.load()));await flush();assert.equal(f.scene.dataset.actionSkinReady,'default');
 const chosen=f.ids[1],warmIds=f.ids.slice(1,15),pending=warmIds.map(id=>f.api.prepare(id));
 assert.equal(f.images.length,120,'Default8 plus14complete skins×8PNG in this pressure case');
 assert.equal(f.api.prepare(chosen),pending[0],'A selected in-flight skin must reuse its current pack promise');
 const chosenImages=f.images.filter(image=>image.source.includes('/'+chosen+'-'));
 assert.equal(chosenImages.length,8);await Promise.all(chosenImages.map(image=>image.load()));await pending[0];
 f.storage.set('yamb_active_skin',chosen);
 const activated=f.api.activatePrepared(chosen);
 if(baseline){
  assert.equal(activated,false);assert.equal(f.scene.dataset.actionSkinReady,'default');
  console.log('REPRODUCED: pending skin evicted under120Image pressure; prepare resolves but activatePrepared=false, previous buttons remain.');
 }else{
  assert.equal(activated,true,'Completed selected skin must be activatable after concurrent cache pressure');assert.equal(f.scene.dataset.actionSkinReady,chosen);
 }
 await Promise.all(f.images.filter(image=>!chosenImages.includes(image)).map(image=>image.load()));await Promise.all(pending);await flush();
 const cache=f.maps.find(map=>[...map.keys()].some(key=>String(key).endsWith('.png')));
 assert(cache);assert(cache.size<=96,'Settled PNG retention must return to96entries');
 const before=f.images.length;
 if(!baseline){await f.api.prepare(chosen);assert.equal(f.images.length,before,'Active skin remains retained during background warmups');assert.equal(f.api.activatePrepared(chosen),true);}
 const report={date:'2026-10-31',mode:baseline?'before':'after',baseline:ref,scope:'Actual controller and48skin catalog with synthetic Image load/decode completion and120Image cache pressure, no app/account/network/device latency proof.',skins:f.ids.length,concurrentWarmSkins:warmIds.length,imagesBeforeRetry:before,firstActivation:activated,settledCacheEntries:cache.size};
 const dir='tmp/skin-preload-retention-2026-10-31';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/'+report.mode+'.json',JSON.stringify(report,null,2)+'\n');
 if(baseline)return;
 const failed=fixture();await Promise.all(failed.images.map(image=>image.load()));await flush();
 const rejected=failed.api.prepare('classic_red');const newImages=failed.images.slice(8);newImages[0].onerror(new Error('Controlled fixture failure'));
 await Promise.all(newImages.slice(1).map(image=>image.load()));await assert.rejects(rejected);await flush();
 const retryStart=failed.images.length,retry=failed.api.prepare('classic_red');assert.equal(failed.images.length,retryStart+1,'Retry only missing/failed PNG, reuse7decoded PNGs');
 await failed.images.at(-1).load();await retry;failed.storage.set('yamb_active_skin','classic_red');assert.equal(failed.api.activatePrepared('classic_red'),true);
 console.log('PASS: selected8PNG survive concurrent preparation; active skin retained, settled cache≤96, missing-PNG retry reuses7ready images.');
})().catch(error=>{console.error(error);process.exitCode=1;});
