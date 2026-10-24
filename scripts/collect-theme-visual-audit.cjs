const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { sheet, output, root } = require('./build-theme-visual-audit.cjs');
if (fs.existsSync(path.join(output, 'inventory.json'))) {
    throw new Error('Reviewed snapshot already exists. Preserve its IDs and use augment-theme-visual-audit.cjs for new PNGs; a new audit needs a separate snapshot, not renumbering reviewed assets.');
}
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const use = JSON.parse(read('docs/theme-canonical-use-map.json'));
const definitions = JSON.parse(read('docs/theme-definitions.json'));
const themes = definitions.themes.map(t => t.id);
const files = new Map(), missing = [], unresolved = [];
const clean = source => path.posix.normalize(String(source).replaceAll('\\','/').replace(/^www\//,'').split('?')[0]);
const themeOf = file => file.includes('/green-soft-clay/') ? 'dark'
    : file.match(/\/theme-packs\/([^/]+)\//)?.[1] || 'universal';
const familyOf = file => file.match(/\/canonical\/([^/]+)\//)?.[1]
    || file.match(/\/effects\/([^/]+)\//)?.[1] || file.split('/')[2] || 'other';
function add(source, theme, label, rooms, evidence, kind='runtime-resolver') {
    if (!source || !/\.png(?:\?|$)/i.test(source)) return;
    const relative = clean(source), file = 'www/' + relative;
    if (!fs.existsSync(path.join(root, file))) { missing.push({file,theme,label,evidence}); return; }
    if (!files.has(file)) {
        const bytes = fs.readFileSync(path.join(root, file));
        files.set(file, { file, theme:theme || themeOf(file), family:familyOf(file), labels:[], rooms:[], consumers:[],
            width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),bytes:bytes.length,
            sha256:crypto.createHash('sha256').update(bytes).digest('hex'),
            visualStatus:'nije-pregledano',reason:'Ceka vizuelni pregled; tehnicka putanja nije potvrda izgleda.' });
    }
    const item = files.get(file);
    if (!item.labels.includes(label)) item.labels.push(label);
    rooms.forEach(room => { if(!item.rooms.includes(room)) item.rooms.push(room); });
    if (!item.consumers.some(c=>c.evidence===evidence && c.kind===kind)) item.consumers.push({evidence,kind});
}
for (const theme of use.themes) for (const c of theme.concepts) {
    for (const asset of [c.primary,...c.variants]) add(asset.file,theme.id,c.key,c.sites.map(s=>s.room),
        c.sites.map(s=>`${s.file}#${s.marker}`).join(' | '),'canonical-use-map');
}
const context = { window:{location:{hostname:'localhost',protocol:'file:',origin:'null'}},
    document:{readyState:'loading',addEventListener(){},documentElement:{dataset:{splashTheme:'dark'}},body:{classList:{contains(){return false;}}}},
    localStorage:{getItem(){return 'dark';}},URL,console,setTimeout(){},requestAnimationFrame(){},
    MutationObserver:class { observe(){} disconnect(){} } };
vm.createContext(context);
const modules=['config','languages','pravilaigre','theme-game-header','theme-settings-room','theme-online-players-room',
    'theme-invite-friend-room','theme-statistics-room','theme-solo-results','theme-leaderboard-room','theme-quarterly-league-room'];
for (const file of modules) vm.runInContext(read(`www/${file}.js`),context,{filename:file});
const shop=vm.runInContext('SHOP_DATA',context);
const rulesSource=vm.runInContext('rulesCanonicalSource',context);
const rulesRoles=[...read('www/pravilaigre.js').split('    const roles = {')[1].split('    };')[0].matchAll(/^\s+([a-zA-Z]+):/gm)].map(m=>m[1]);
const sources={
    header:['themeGameHeader',['exit','timer','menu','sound','vibration','music','undo','theme','skin','lock','close'],['Svi modovi / kontrolni panel','Podesavanja']],
    settings:['themeSettingsRoom',['room','profile','sound','music','vibration','display-theme','language','terms','privacy'],['Podesavanja']],
    online:['themeOnlinePlayers',['state','search','friend','spectate','duel','avatar'],['Online igraci']],
    invite:['themeInviteFriend',['send','empty','friend','search','power'],['Pozovi prijatelja']],
    stats:['themeStatisticsRoom',['identity','power-index','avatar','record','games','wins','draws','losses','fire-streak','average','trophies','ducat','all-time-points','h2h','h2h-empty','highest-score','max-win-margin','worst-loss-margin','versus'],['Statistika / obe strane i rang liste']],
    leaderboard:['themeLeaderboard',['identity','global','local','empty-loading'],['Top lista']]
};
function family(theme, group, room, version) {
    const dir=`www/assets/${theme==='dark'?'green-soft-clay':`theme-packs/${theme}`}/canonical/${group}`;
    if(!fs.existsSync(path.join(root,dir)))return;
    for(const file of fs.readdirSync(path.join(root,dir))) {
        if(!file.endsWith('.png') || version && !file.endsWith(`-v${version}.png`))continue;
        add(`${dir}/${file}`,theme,`${group}/${file}`,[room],`www/${room==='Kvartalna liga'?'kvartalnaliga':'game'}.js#${group}`,'family-runtime-template');
    }
}
for(const theme of themes) {
    for(const [group,[api,roles,rooms]] of Object.entries(sources)) for(const role of roles) {
        add(context.window[api].asset(role,theme),theme,`${group}/${role}`,rooms,`www/${modules.find(f=>f.toLowerCase().replaceAll('-','').includes(api.replace(/^theme/,'').toLowerCase()))||api}.js#asset`);
    }
    rulesRoles.forEach(role=>add(rulesSource(role,theme),theme,`rules/${role}`,['Pravila'],`www/pravilaigre.js#rulesCanonicalSource(${role})`));
    for(const group of ['tournament-navigation','tournament-states','tournament-awards'])family(theme,group,'Turnir',1);
    for(const group of ['quarterly-navigation','quarterly-rank-badges'])family(theme,group,'Kvartalna liga',2);
    for(const group of ['daily-states','treasury-controls','solo-record-icons','menu-resume-buttons','online-random-rematch','online-random-states','effects','confetti-particles'])family(theme,group,({ 'daily-states':'Dnevni izazov','treasury-controls':'Riznica','solo-record-icons':'Zavrsni ekrani','menu-resume-buttons':'Glavni meni / nastavak igre','online-random-rematch':'Online zavrsni ekran','online-random-states':'Online Random','effects':'Efekti','confetti-particles':'Efekti' })[group],1);
    const base=`www/assets/${theme==='dark'?'green-soft-clay':`theme-packs/${theme}`}`;
    for(const role of ['finish-claim','finish-score-mark','record-panel']) add(`${base}/canonical/solo-results/${role}-v${role==='record-panel'?2:1}.png`,theme,`solo/${role}`,['Solo / Hotseat / Online / Turnir zavrsni ekrani'],'www/theme-solo-results.js + www/theme-solo-results.css');
    for(const role of ['weekly','monthly','all_time','personal'])add(context.window.themeSoloResults.recordIconSource(theme,role),theme,`record/${role}`,['Zavrsni ekrani'],'www/theme-solo-results.js#recordIconSource');
    for(const kind of ['menu','room'])add(context.window.ThemeQuarterlyLeagueRoom.source(theme,kind),theme,`quarterly/${kind}`,['Glavni meni','Kvartalna liga / intro'],'www/theme-quarterly-league-room.js#source');
    const pack=`www/assets/theme-packs/${theme}/canonical`;
    for(const role of ['send','empty'])add(`${pack}/invite-friend-internal/${role}-v1.png`,theme,`invite/${role}`,['Pozovi prijatelja'],'www/theme-invite-friend-room.js#asset');
    for(const role of ['state','search','friend','spectate','duel','avatar'])add(`${pack}/online-players-internal/${role}-v1.png`,theme,`online/${role}`,['Online igraci','Pozovi prijatelja'],'www/theme-online-players-room.js#asset');
    if(theme!=='dark')for(const role of ['send','empty-state'])add(`${pack}/global-chat-internal/${role}-v1.png`,theme,`chat/${role}`,['Globalni chat'],'www/theme-main-room-icons.js#chatInternal');
    for(const role of ['room','menu']) if(theme!=='dark')add(`${base}/canonical/tournament-awards/champion-trophy${role==='room'?'-room':''}-v1.png`,theme,`tournament/${role}`,['Turnir','Glavni meni','Intro'],'www/theme-main-room-icons.js#sourceFor');
    add(theme==='dark'?'www/assets/green-soft-clay/splash-title-soft-clay-v2.png':`${base}/splash-title-soft-clay-v1.png`,theme,'game-logo',['Prijava','Glavni meni','Efekti'],'www/game.js#getThemeSplashSource');
}
// Literal sources include conditional and legacy fallbacks. Keep that evidence separate from resolver evidence.
for(const file of fs.readdirSync(path.join(root,'www')).filter(f=>/\.(?:js|css|html)$/.test(f))) {
    const text=read('www/'+file).replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
    for(const match of text.matchAll(/(?:www\/)?assets\/[A-Za-z0-9_./-]+\.png(?:\?[^\s'"`<>)]*)?/g)) {
        const source=match[0];
        const preload=file==='game.js' && match.index<text.indexOf('    getMainRoomPackSource(');
        add(source,themeOf('/'+source),path.posix.basename(clean(source)),['Potencijalni prikaz: '+file],`www/${file}:${text.slice(0,match.index).split('\n').length}`,preload?'preload-or-fallback':'literal-runtime-reference');
    }
    for(const match of text.matchAll(/`([^`\n]*\$\{[^`\n]*\.png[^`\n]*)`/g)) unresolved.push({file:'www/'+file,template:match[1]});
}
for(const dir of ['dice-skins-v1','treasury-skin-previews','skin-action-buttons-v1','skin-roll-counter-v1']) {
    for(const file of fs.readdirSync(path.join(root,'www/assets',dir)).filter(f=>f.endsWith('.png'))) add(`www/assets/${dir}/${file}`,'universal',`${dir}/${file}`,['Riznica','Svi modovi / skinovi'],`www/${dir.startsWith('skin-roll')?'skin-roll-counter-data':dir.startsWith('skin-action')?'skin-action-buttons-data':'features'}.js`,'skin-owned-universal');
}
const stage=JSON.parse(read('source-assets/theme-live-stage-v1/manifest.json'));
for(const asset of stage.assets)add(asset.productionPath,asset.theme,asset.canonicalRole,['Efekti','Riznica'],'www/live-effects-stage.js#sources','live-effect-component');
const all=[...files.values()].sort((a,b)=>a.theme.localeCompare(b.theme)||a.family.localeCompare(b.family)||a.file.localeCompare(b.file));
all.forEach((item,i)=>{item.id='A'+String(i+1).padStart(4,'0');item.activation=item.consumers.some(c=>!['preload-or-fallback','literal-runtime-reference'].includes(c.kind))?'resolver-mapped':'conditional-or-legacy-candidate';});
fs.mkdirSync(output,{recursive:true});
const inventory={schemaVersion:1,date:'2026-10-24',scope:'15 soba, svi podprikazi, deset tema, zajednicki skinovi i efekti; dokaz resolvera odvojen od literalnih fallback/preload kandidata',assets:all,missingReferences:missing,unresolvedTemplates:unresolved};
fs.writeFileSync(path.join(output,'inventory.json'),JSON.stringify(inventory,null,2)+'\n');
(async()=>{
    const pages=[];
    for(const theme of [...themes,'universal']) {
        const entries=all.filter(a=>a.theme===theme);
        for(let offset=0;offset<entries.length;offset+=48){
            const name=`${theme}-${String(offset/48+1).padStart(2,'0')}.png`;
            const rows=entries.slice(offset,offset+48).map(a=>({file:a.file,theme:a.theme,label:a.labels[0].slice(0,23),id:a.id}));
            await sheet(name,rows,8,158,174);
            pages.push({file:name,ids:entries.slice(offset,offset+48).map(a=>a.id),theme});
        }
    }
    fs.writeFileSync(path.join(output,'sheets.json'),JSON.stringify(pages,null,2)+'\n');
    console.log(JSON.stringify({assets:all.length,byTheme:Object.fromEntries([...themes,'universal'].map(t=>[t,all.filter(a=>a.theme===t).length])),missing:missing.length,sheets:pages.length}));
})().catch(e=>{console.error(e);process.exitCode=1;});
