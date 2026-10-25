const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
let theme='dark',requests=0;
const header={dataset:{statIcon:'fire-streak'},style:{},isConnected:true,src:'',getAttribute(name){return this[name]||null;}};
const overlay={style:{display:'none'},querySelectorAll(selector){return selector==='img[data-stat-icon]'?[header]:[];}};
const nodes={'streak-overlay':overlay,'streak-body':{innerHTML:'',addEventListener(){}},'streak-my-rank-dock':{classList:{remove(){}},replaceChildren(){}}};
class LoadedImage{
 set src(value){this._src=value;queueMicrotask(()=>this.onload?.());}
 get src(){return this._src;}
 decode(){return Promise.resolve();}
}
const context={window:{},document:{readyState:'loading',addEventListener(){},body:{classList:{contains(value){return value===theme+'-theme';}},insertAdjacentHTML(){}},getElementById:id=>nodes[id]||null},
 Image:LoadedImage,MutationObserver:class{},setInterval(){return 0;},clearInterval(){},localStorage:{getItem(){return null;}},console,
 getThemeMedalSource(){return '';}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'www/theme-statistics-room.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'www/vatreniniz.js'),'utf8'),context);
const manager=context.window.vatreniNiz;
manager.ensureSocketIdentity=()=>Promise.resolve();
manager.requestPage=()=>{requests++;};
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
(async()=>{
 // Reuse the same hidden modal and header through every theme, then reopen it.
 header.src=context.window.themeStatisticsRoom.asset('fire-streak','dark');
 for(theme of ['light','medium','winter','neon','amethyst','easter','desert','moon','severna','dark']){
  overlay.style.display='none';
  const oldSource=header.src;
  assert.notEqual(oldSource,context.window.themeStatisticsRoom.asset('fire-streak',theme));
  manager.openModal();await flush();
  assert.equal(overlay.style.display,'flex');
  assert.equal(header.src,context.window.themeStatisticsRoom.asset('fire-streak',theme),theme+' retained a previous theme header');
  assert.equal(header.style.visibility,'');
 }
 assert.equal(requests,10,'Reopening must keep the existing ranking request behavior');
 console.log('PASS: one persistent Fire Streak modal reopened in all ten themes; canonical header updates, visibility restored, one normal request per open.');
})().catch(error=>{console.error(error);process.exitCode=1;});
