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
console.log(`Statistics: ${themes.length*roles.length} active bindings; ${seen.size} original 256px RGBA PNGs; ten themed avatars and sixty canonical ranking medals; no old overview/ranking icons.`);
