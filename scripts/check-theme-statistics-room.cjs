const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const themes = ['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna'];
const roles = ['identity','power-index','avatar','record','games','wins','draws','losses','fire-streak','average','trophies','ducat','all-time-points','h2h','h2h-empty','highest-score','max-win-margin','worst-loss-margin','versus'];
const generated = new Set(['games','wins','draws','losses','average','all-time-points','fire-streak','h2h','h2h-empty','highest-score','max-win-margin','worst-loss-margin']);
const context = {document:{readyState:'loading',addEventListener(){},body:{classList:{contains(){return false}}}},window:{},Image:class{},MutationObserver:class{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'www/theme-statistics-room.js'),'utf8'),context);
const asset = context.window.themeStatisticsRoom.asset;
const seen = new Map();
const avatars = new Set();
for (const theme of themes) for (const role of roles) {
  const relative = asset(role,theme).split('?')[0];
  const file = path.join(root,'www',relative);
  if (!fs.existsSync(file)) throw Error(`Missing ${theme}/${role}: ${relative}`);
  const data = fs.readFileSync(file);
  if (data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a') throw Error(`Bad PNG: ${relative}`);
  if (role==='avatar') {
    const hash=crypto.createHash('sha256').update(data).digest('hex');
    if (avatars.has(hash)) throw Error(`Duplicated ranking avatar: ${relative}`);
    avatars.add(hash);
  }
  if (theme!=='dark' && generated.has(role)) {
    if (data.readUInt32BE(16)!==256 || data.readUInt32BE(20)!==256 || data[25]!==6) throw Error(`Bad generated dimensions or alpha: ${relative}`);
    if (data.length>400000) throw Error(`Generated PNG too large: ${relative}`);
    const hash=crypto.createHash('sha256').update(data).digest('hex');
    if (seen.has(hash)) throw Error(`Duplicated image: ${relative} and ${seen.get(hash)}`);
    seen.set(hash,relative);
  }
}
for (const theme of themes) for (const context of ['power-index','fire-streak']) for (const tier of ['gold','silver','bronze']) {
  const base=theme==='dark'?'assets/green-soft-clay/canonical':'assets/theme-packs/'+theme+'/canonical';
  const relative=`${base}/competition-medals/${context}-${tier}-v1.png`;
  const file=path.join(root,'www',relative);
  if (!fs.existsSync(file) || fs.readFileSync(file).subarray(0,8).toString('hex')!=='89504e470d0a1a0a') throw Error(`Missing ranking medal: ${relative}`);
}
const byRole=new Map();
for (const theme of themes) {
  const base=theme==='dark'?'assets/green-soft-clay':'assets/theme-packs/'+theme;
  const mapped=roles.map(role=>[role,asset(role,theme).split('?')[0]]);
  mapped.push(['menu',`${base}/canonical/statistics-room-identity/statistics-room-menu-v1.png`]);
  mapped.push(['close',`${base}/canonical/room-controls/close-v1.png`]);
  for (const competition of ['power-index','fire-streak']) for (const tier of ['gold','silver','bronze'])
    mapped.push([`${competition}-${tier}`,`${base}/canonical/competition-medals/${competition}-${tier}-v1.png`]);
  const active=new Set(mapped.map(([,relative])=>relative));
  if (active.size!==27) throw Error(`${theme}: expected 27 distinct Statistics PNG roles, found ${active.size}`);
  for (const [role,relative] of mapped) {
    const data=fs.readFileSync(path.join(root,'www',relative));
    if (data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a') throw Error(`Bad Statistics PNG: ${relative}`);
    const hash=crypto.createHash('sha256').update(data).digest('hex');
    if (!byRole.has(role)) byRole.set(role,new Map());
    if (byRole.get(role).has(hash)) throw Error(`Recolored or duplicated Statistics role ${role}: ${theme} and ${byRole.get(role).get(hash)}`);
    byRole.get(role).set(hash,theme);
  }
}
const html=fs.readFileSync(path.join(root,'www/index.html'),'utf8');
const stats=html.slice(html.indexOf('<div id="stats-screen"'),html.indexOf('<div class="stats-pagination"'));
for (const old of ['stats-icon.svg','stats-category-soft-clay-icon','stats-grid-soft-clay-icon','stats-result-soft-clay-icon','stats-h2h-title-soft-clay-icon','stats-category-legacy']) if(stats.includes(old)) throw Error(`Legacy icon: ${old}`);
for (const role of ['identity','record','games','wins','draws','losses','fire-streak','average','trophies','ducat','all-time-points','h2h']) if(!stats.includes(`data-stat-icon="${role}"`)) throw Error(`Unbound role: ${role}`);
for (const file of ['powerindex.js','vatreniniz.js']) {
  const code=fs.readFileSync(path.join(root,'www',file),'utf8');
  for (const old of ['.svg','ui-avatars.com','assets/green-soft-clay/canonical/statistics-overview']) if (code.includes(old)) throw Error(`Legacy ranking asset in ${file}: ${old}`);
  for (const marker of ['data-stat-icon="avatar"','data-stat-medal-context=']) if (!code.includes(marker)) throw Error(`Unbound ranking asset in ${file}: ${marker}`);
}
for (const stylesheet of ['theme-statistics-room.css','theme-statistics-layout.css','theme-statistics-leaderboards.css','theme-medals.css','theme-room-close-controls.css']) if (!html.includes(`href="${stylesheet}?`)) throw Error(`Missing statistics stylesheet: ${stylesheet}`);
if (!html.includes('theme-statistics-room.css?v=5') || !html.includes('theme-statistics-leaderboards.css?v=4')) throw Error('Statistics CSS cache version is stale');
const config=fs.readFileSync(path.join(root,'www/config.js'),'utf8');
const game=fs.readFileSync(path.join(root,'www/game.js'),'utf8');
if (!config.includes('ROOM_INTRO_TIMING = Object.freeze({ openAtMs: 2400, durationMs: 3200 })') || !game.includes("this.playEasterRoomIntro('statistics'")) throw Error('Statistics intro does not use the common room timing');
const greenCss=fs.readFileSync(path.join(root,'www/teme.css'),'utf8');
const roomCss=fs.readFileSync(path.join(root,'www/theme-statistics-room.css'),'utf8');
const rankCss=fs.readFileSync(path.join(root,'www/theme-statistics-leaderboards.css'),'utf8');
const layoutCss=fs.readFileSync(path.join(root,'www/theme-statistics-layout.css'),'utf8');
if (!roomCss.includes('background:var(--green-clay-surface-soft) !important;') || !rankCss.includes('background:var(--green-clay-surface-soft) !important;')) throw Error('Green Statistics contrast layers are missing');
const lightInk=[242,246,232];
const luminance=rgb=>rgb.map(value=>{const v=value/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
// The actual Green power card is pale, unlike the other dark Statistics layers.
// Its previous white title/rank/value passed no useful contrast threshold.
if (!roomCss.includes('color:#254c32 !important;')) throw Error('Green power-card ink is missing');
for (const endpoint of [[207,221,163],[241,245,230]]) {
  if (contrast([37,76,50],endpoint)<4.5) throw Error('Green power-card text contrast below 4.5:1');
}
const greenSurface=greenCss.match(/--green-clay-surface-soft: linear-gradient\(145deg, rgba\(([^)]+)\), rgba\(([^)]+)\)\)/);
if (!greenSurface) throw Error('Green Clay surface is missing');
for (const endpoint of greenSurface.slice(1).map(value=>value.split(',').map(Number))) for (const backdrop of [0,255]) {
  const composed=endpoint.slice(0,3).map(channel=>channel*endpoint[3]+backdrop*(1-endpoint[3]));
  if (contrast(lightInk,composed)<4.5) throw Error('Green Statistics surface text contrast is below 4.5:1');
}
for (const rgb of [[52,89,55],[59,96,58],[62,99,60]]) if (contrast(lightInk,rgb)<4.5) throw Error('Green Statistics subcard text contrast is below 4.5:1');
for (const hex of ['#b5e5b6','#e2dfab','#ffd0b8']) for (const backdrop of [0,255]) {
  const text=[1,3,5].map(index=>parseInt(hex.slice(index,index+2),16));
  const surface=[59,96,58].map(channel=>channel*.98+backdrop*.02);
  if (contrast(text,surface)<4.5) throw Error('Green H2H status text contrast below 4.5:1');
}
for (const theme of themes.filter(value=>value!=='dark')) {
  const palette=roomCss.match(new RegExp(`body\\.${theme}-theme \\{ ([^}]+) \\}`));
  if (!palette) throw Error(`${theme}: missing Statistics palette`);
  const vars=Object.fromEntries([...palette[1].matchAll(/--([\w-]+):([^;]+);/g)].map(match=>[match[1],match[2]]));
  const ink=[1,3,5].map(index=>parseInt(vars['stats-ink'].slice(index,index+2),16));
  const muted=[1,3,5].map(index=>parseInt(vars['stats-muted'].slice(index,index+2),16));
  const accent=[1,3,5].map(index=>parseInt(vars['stats-accent'].slice(index,index+2),16));
  const statusPalette=layoutCss.match(new RegExp(`body\\.${theme}-theme \\{ ([^}]+) \\}`))[1];
  for (const layer of ['surface','card','subcard']) {
    const rgba=vars[`stats-${layer}`].match(/rgba\(([^)]+)\)/)[1].split(',').map(Number);
    for (const backdrop of [0,255]) {
      const composed=rgba.slice(0,3).map(channel=>channel*rgba[3]+backdrop*(1-rgba[3]));
      for (const text of [ink,muted,accent]) if (contrast(text,composed)<4.5) throw Error(`${theme} ${layer}: Statistics contrast below 4.5:1`);
      if (layer==='subcard') for (const status of ['win','draw','loss']) {
        const hex=statusPalette.match(new RegExp(`--stats-${status}:(#[a-f0-9]+)`))[1];
        const text=[1,3,5].map(index=>parseInt(hex.slice(index,index+2),16));
        if (contrast(text,composed)<4.5) throw Error(`${theme} H2H ${status}: text contrast below 4.5:1`);
      }
    }
  }
}
const rankingNodes=Object.fromEntries(['pi-list-container','streak-body'].map(id=>[id,{innerHTML:'',addEventListener(){}}]));
for (const id of ['pi-my-rank-dock','streak-my-rank-dock']) rankingNodes[id]={classList:{remove(){}},replaceChildren(){}};
let currentTheme='dark';
const rankingContext={
  document:{body:{insertAdjacentHTML(){}},getElementById:id=>rankingNodes[id]||null},
  window:{themeStatisticsRoom:{asset:role=>asset(role,currentTheme),activeTheme:()=>currentTheme}},
  localStorage:{getItem:()=>null},setInterval:()=>0,clearInterval(){},console,
  getThemeMedalSource:(competition,tier)=>`${currentTheme==='dark'?'assets/green-soft-clay':'assets/theme-packs/'+currentTheme}/canonical/competition-medals/${competition==='powerIndex'?'power-index':'fire-streak'}-${tier}-v1.png`
};
vm.runInNewContext(fs.readFileSync(path.join(root,'www/powerindex.js'),'utf8'),rankingContext);
vm.runInNewContext(fs.readFileSync(path.join(root,'www/vatreniniz.js'),'utf8'),rankingContext);
for (const theme of themes) {
  currentTheme=theme;
  for (const [manager,nodeId,player,medal] of [
    [rankingContext.window.powerIndexLeaderboard,'pi-list-container',{rank:1,playerName:'Igrač',powerIndex:100},'power-index-gold-v1.png'],
    [rankingContext.window.vatreniNiz,'streak-body',{rank:1,name:'Igrač',maxWinStreak:5,currentWinStreak:2},'fire-streak-gold-v1.png']
  ]) {
    manager.resetState(); manager.loading=true; manager.renderList();
    if (!rankingNodes[nodeId].innerHTML.includes('list-message')) throw Error(`${theme} ${nodeId}: missing loading message`);
    manager.loading=false; manager.renderList();
    if (!rankingNodes[nodeId].innerHTML.includes('list-message')) throw Error(`${theme} ${nodeId}: missing empty message`);
    manager.requestPage(0);
    if (!rankingNodes[nodeId].innerHTML.includes('list-message--error')) throw Error(`${theme} ${nodeId}: missing offline message`);
    manager.data=[player]; manager.renderList();
    if (!rankingNodes[nodeId].innerHTML.includes(medal) || !rankingNodes[nodeId].innerHTML.includes(asset('avatar',theme)))
      throw Error(`${theme} ${nodeId}: missing canonical medal or avatar`);
  }
}
console.log(`Statistics: 27 active PNG roles per theme, ${seen.size} original 256px RGBA PNGs, ten themed avatars and sixty canonical ranking medals; no old overview/ranking icons. Intro and static contrast pass.`);
