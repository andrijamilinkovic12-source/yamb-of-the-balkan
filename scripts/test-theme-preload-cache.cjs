const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const images=[];
class PendingImage {
 set src(source){this.source=source;images.push(this);}
 decode(){this.decodes=(this.decodes||0)+1;return Promise.resolve();}
 loaded(width=256,height=256){this.naturalWidth=width;this.naturalHeight=height;return this.onload();}
}
const context={window:{},Image:PendingImage,console,setTimeout,clearTimeout};
vm.runInNewContext(fs.readFileSync('www/game.js','utf8').replace('window.app = new YambApp();','globalThis.App=YambApp;'),context);
const app=Object.create(context.App.prototype);
(async()=>{
 const first=app.preloadThemeImage('one.png',1000,'low');
 const second=app.preloadThemeImage('one.png',1000,'high');
 assert.equal(images.length,1,'Concurrent requests must share the image');
 assert.equal(images[0].fetchPriority,'high');await images[0].loaded();
 assert.deepEqual(await Promise.all([first,second]),[true,true]);assert.equal(images[0].decodes,1);
 assert.equal(await app.preloadThemeImage('one.png'),true);assert.equal(images.length,1,'Decoded cache must avoid repeat Image creation');
 const timedOut=app.preloadThemeImage('slow.png',5);assert.equal(await timedOut,false);
 const retry=app.preloadThemeImage('slow.png',1000);assert.equal(images.length,2,'A retry reuses the unfinished download');
 await images[1].loaded();assert.equal(await retry,true);
 const failed=app.preloadThemeImage('bad.png',1000);images[2].onerror();assert.equal(await failed,false);
 const recovered=app.preloadThemeImage('bad.png',1000);assert.equal(images.length,4);await images[3].loaded();assert.equal(await recovered,true);
 for(let i=0;i<70;i++){const ready=app.preloadThemeImage(`extra-${i}.png`,1000);await images.at(-1).loaded();await ready;}
 assert.ok(app.themePreloadImages.size<=64,'Image retention must be bounded');
 for(let i=0;i<4;i++){const ready=app.preloadThemeImage(`large-${i}.png`,1000);await images.at(-1).loaded(2000,2000);await ready;}
 assert.ok([...app.themePreloadImages.values()].reduce((n,e)=>n+e.pixels,0)<=12_000_000,'Decoded pixel memory must be bounded');
 console.log('PASS: one download/decode per URL, priority promotion, warm retry after timeout, error retry and bounded decoded cache.');
})().catch(error=>{console.error(error);process.exitCode=1;});
