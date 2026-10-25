const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file));
const manifest=JSON.parse(read('source-assets/theme-effect-card-thumbnails-v1/manifest.json'));
assert.equal(manifest.assets.length,43);
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
for(const a of manifest.assets){
 const source=read(a.source),png=read(a.productionPath);
 assert.equal(hash(source),a.sourceSha256,'Canonical runtime art was overwritten');
 assert.equal(hash(png),a.sha256);assert.equal(png[25],6,'Thumbnail lost RGBA transparency');
 assert.equal(a.status,'verified');assert(a.review);
 assert(a.width<=384&&a.height<=256,'Card attempted to use an oversized image');
 assert(a.width<=a.sourceWidth&&a.height<=a.sourceHeight);
 assert(Math.abs(a.width*a.sourceHeight-a.height*a.sourceWidth)<=Math.max(a.sourceWidth,a.sourceHeight),'Canonical aspect ratio changed');
}
const manager=read('www/managers.js').toString(),start=manager.indexOf('    getTreasuryEffectPreviewSource('),end=manager.indexOf('    getTreasuryRewardVideoIcon()',start);
let theme='dark';const themes=['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna'];
const getter=vm.runInNewContext(`({${manager.slice(start,end)}}).getTreasuryEffectPreviewSource`,{localStorage:{getItem:()=>theme},YAMB_THEME_IDS:themes});
for(theme of themes)for(const role of ['ice_age','balkan','dragon_fire','ufo_abduction','royal_yamb','black_hole','supernova']){
 const a=manifest.assets.find(a=>a.effectId===role&&(a.theme===theme||a.theme==='universal'));
 assert(a);assert.equal(getter.call({},role),a.productionPath.replace(/^www\//,''));
}
const before=manifest.assets.reduce((n,a)=>n+a.sourceBytes,0),after=manifest.assets.reduce((n,a)=>n+a.bytes,0);
assert(after<before*.2,'Effect card pack is no longer substantially smaller than the runtime originals');
console.log(`PASS: 43 reviewed canonical RGBA derivatives; all ten-theme card resolvers; ${(100*(1-after/before)).toFixed(1)}% fewer PNG bytes; runtime originals preserved.`);
