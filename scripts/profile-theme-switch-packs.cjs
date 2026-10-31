// Read actual theme methods/paths without constructing the app or using accounts.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,'www',f),'utf8');
const html=read('index.html'),menu=html.split('<div id="main-menu"')[1].split('<div id="game-scene"')[0];
const greenSources=[...new Set([...menu.matchAll(/data-theme-src="([^"]+)"/g)].map(x=>x[1]))];
const context={console,window:{location:{hostname:'localhost',protocol:'http:',search:''}},localStorage:{getItem:()=>null},document:{readyState:'loading',addEventListener(){},body:{classList:{contains:()=>false}},getElementById:id=>id==='main-menu'?{querySelectorAll:()=>greenSources.map(src=>({dataset:{themeSrc:src}}))}:null},setTimeout,clearTimeout,URLSearchParams};
vm.createContext(context);
for(const file of ['config.js','theme-quality-assets.js','theme-game-header.js','theme-settings-room.js'])vm.runInContext(read(file),context);
vm.runInContext(read('game.js').replace('window.app = new YambApp();','globalThis.App=YambApp;'),context);
const app=Object.create(context.App.prototype),themes=['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna'];
const rows=themes.map(theme=>{
 const roles=[...app.getThemeStartupSources(theme).map(source=>({kind:'menu',source})),...context.window.themeSettingsRoom.sources(theme).map(source=>({kind:'settings',source})),{kind:'settings',source:context.window.themeGameHeader.asset('close',theme)}];
 const assets=roles.map(row=>{
  const resolved=context.resolveThemeQualityAsset?.(row.source)||row.source,file=path.join(root,'www',resolved.split('?')[0]),data=fs.readFileSync(file);
  if(data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Not PNG: '+file);
  return {...row,resolved,bytes:data.length,width:data.readUInt32BE(16),height:data.readUInt32BE(20)};
 });
 const sum=kind=>assets.filter(a=>a.kind===kind).reduce((s,a)=>s+a.bytes,0);
 return {theme,menuBytes:sum('menu'),settingsBytes:sum('settings'),totalBytes:sum('menu')+sum('settings'),totalPixels:assets.reduce((s,a)=>s+a.width*a.height,0),assets};
});
const report={at:new Date().toISOString(),scope:'Current local methods, canonical path resolver, original menu DOM sources and PNG metadata. Read-only, no constructor/account/network/device or timing proof.',rows};
fs.mkdirSync('tmp/theme-switch-profile-2026-10-30',{recursive:true});fs.writeFileSync('tmp/theme-switch-profile-2026-10-30/packs.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(rows.map(({assets,...row})=>row),null,2));
console.log(JSON.stringify(rows.find(r=>r.theme==='easter').assets.sort((a,b)=>b.bytes-a.bytes),null,2));
