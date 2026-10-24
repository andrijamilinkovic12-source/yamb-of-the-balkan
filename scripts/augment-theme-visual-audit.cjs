const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {sheet,root,output}=require('./build-theme-visual-audit.cjs');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const base=JSON.parse(read('docs/theme-visual-audit/inventory.json'));
const target=path.join(output,'supplement.json');
const previous=fs.existsSync(target)?JSON.parse(fs.readFileSync(target)):[];
const all=new Map(base.assets.concat(previous).map(a=>[a.file,a]));
const additions=[];
function add(file,theme,label,rooms,evidence,supersedes){
 file='www/'+file.replace(/^www\//,'').split('?')[0];
 if(all.has(file))return;
 const b=fs.readFileSync(path.join(root,file));
 const a={id:'S'+String(previous.length+additions.length+1).padStart(4,'0'),file,theme,family:file.match(/canonical\/([^/]+)/)?.[1]||'theme-preview',
  labels:[label],rooms,consumers:[{kind:'runtime-resolver',evidence}],width:b.readUInt32BE(16),height:b.readUInt32BE(20),bytes:b.length,
  sha256:crypto.createHash('sha256').update(b).digest('hex'),activation:'resolver-mapped',...(supersedes?{supersedes}:{}),visualStatus:'nije-pregledano'};
 all.set(file,a);additions.push(a);
}
const themes=['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna'];
const config=read('www/config.js');
const start=config.indexOf('const SHOP_DATA ='),end=config.indexOf('\n};',start)+3;
const shop=vm.runInNewContext(config.slice(start,end)+';SHOP_DATA');
const source=read('www/managers.js');
const from=source.indexOf('    getTreasuryEffectPreviewSource('),to=source.indexOf('    getTreasuryRewardVideoIcon()',from);
let theme='dark';
const resolver=new Function('localStorage','YAMB_THEME_IDS',`return ({${source.slice(from,to)}}).getTreasuryEffectPreviewSource;`)({getItem(){return theme;}},themes);
for(theme of themes){
 for(const e of shop.EFFECTS)add(resolver.call({},e.id),theme,'Riznica / '+e.id,['Riznica / Efekti'],'www/managers.js#getTreasuryEffectPreviewSource('+e.id+')');
 add('assets/treasury-theme-previews/'+theme+'-v1.png',theme,'Pregled teme',['Riznica / Teme','Podešavanja / Izbor teme'],'www/managers.js#getTreasuryThemePreviewSource + www/theme-settings-picker.js');
}
const game=read('www/game.js');
const videoStart=game.indexOf('    getRewardedVideoPackSources('),videoEnd=game.indexOf('    getThemeSplashSource(',videoStart);
const videos=vm.runInNewContext(`({${game.slice(videoStart,videoEnd)}}).getRewardedVideoPackSources`);
for(const t of themes)for(const room of ['daily','treasury','solo','economy','rules'])for(const file of videos(t,room))
 add(file,t,'Video nagrada / '+room,[room],'www/game.js#getRewardedVideoPackSources + www/theme-rewarded-video-pack.js#sync');
const stateStart=game.indexOf('    getOnlineRandomStateSource('),stateEnd=game.indexOf('    getOnlineRematchSource(',stateStart);
const states=vm.runInNewContext(`({${game.slice(stateStart,stateEnd)}}).getOnlineRandomStateSource`);
for(const role of ['scanning','found','vs','disconnected','reconnected'])add(states('dark',role),'dark','Online / '+role,['Online Random'],'www/game.js#getOnlineRandomStateSource');
const stars=JSON.parse(read('source-assets/theme-tournament-star-v2/manifest.json'));
for(const a of stars.assets)for(const p of a.production)add(p.productionPath,a.theme,a.role,
 a.role.startsWith('tournament-')?['Turnir / medalje','Završni ekran turnira']:['Turnir','Glavni meni','Intro','Pravila','Obaveštenja / nagrade'],
 'source-assets/theme-tournament-star-v2/manifest.json + runtime resolvers',p.supersedes);
(async()=>{
 const result=previous.concat(additions);fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n');
 const sheets=[];
 for(let offset=0;offset<result.length;offset+=48){const group=result.slice(offset,offset+48),file=`supplement-${String(offset/48+1).padStart(2,'0')}.png`;
  await sheet(file,group.map(a=>({file:a.file,theme:a.theme,label:a.labels[0],id:a.id})),8,158,174);sheets.push({file,ids:group.map(a=>a.id),theme:'supplement'});}
 fs.writeFileSync(path.join(output,'supplement-sheets.json'),JSON.stringify(sheets,null,2)+'\n');
 console.log(JSON.stringify({added:additions.length,supplement:result.length,sheets:sheets.length}));
})().catch(e=>{console.error(e);process.exitCode=1;});
