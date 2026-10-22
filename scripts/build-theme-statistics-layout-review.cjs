const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'www/index.html'), 'utf8');
const head = source.slice(0, source.indexOf('</head>'));
const links = [...head.matchAll(/<link rel="stylesheet" href="[^"]+">/g)].map(match => match[0]).join('\n');
const styles = [...head.matchAll(/<style(?:\s[^>]*)?>[\s\S]*?<\/style>/g)].map(match => match[0]).join('\n');
const start = source.indexOf('<div id="stats-screen"');
const end = source.indexOf('<div id="riznica-screen"', start);
if (start < 0 || end < 0) throw new Error('Statistics markup not found');
const room = source.slice(start, end).replace('id="stats-screen" class="screen"', 'id="stats-screen" class="screen active"');

const frame = `<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><base href="../www/"><title>Statistika — stvarni raspored</title>${links}${styles}<style>html,body{width:100%;height:100%;margin:0;overflow:hidden}#stats-screen{display:flex!important}</style></head><body><script>
const statsReviewTheme=new URLSearchParams(location.search).get('theme')||'dark';
if(statsReviewTheme!=='dark') document.body.classList.add(statsReviewTheme+'-theme');
document.documentElement.dataset.splashTheme=statsReviewTheme;
try{localStorage.setItem('yamb_theme',statsReviewTheme)}catch(e){}
const reviewAvatar='assets/theme-packs/'+statsReviewTheme+'/canonical/online-players-internal/avatar-v1.png';
const reviewPlayers=['Ana','Milan','Jelena','Marko','Iva','Andrija'].map((name,index)=>({uid:'review-'+index,playerName:name,name,rank:index+1,powerIndex:980-index*83,maxWinStreak:18-index*2,currentWinStreak:index%2?0:5-index}));
window.app={showMainMenu(){},socket:{connected:true,on(){},emit(event,payload){
    const isPower=event==='get_power_index_leaderboard_page';
    const isStreak=event==='get_streak_leaderboard_page';
    if(!isPower&&!isStreak)return;
    const instance=isPower?window.powerIndexLeaderboard:window.vatreniNiz;
    setTimeout(()=>instance.handlePageData({players:reviewPlayers,offset:payload.offset,total:reviewPlayers.length,hasMore:false,myRank:12,myPlayer:{uid:'review-me',playerName:'Takmičar',name:'Takmičar',rank:12,powerIndex:418,maxWinStreak:4,currentWinStreak:2}}),0);
}}};
window.getThemeMedalSource=(context,tier)=>{
    const root=statsReviewTheme==='dark'?'assets/green-soft-clay/canonical':'assets/theme-packs/'+statsReviewTheme+'/canonical';
    const version=statsReviewTheme==='light'?3:2;
    return root+'/competition-medals/'+(context==='powerIndex'?'power-index':'fire-streak')+'-'+tier+'-v1.png?v='+version;
};
window.riznicaManager={open(){}};
</script>${room}<script src="theme-statistics-room.js?v=2"></script><script src="powerindex.js?v=1.11"></script><script src="vatreniniz.js?v=1010"></script><script>
window.addEventListener('DOMContentLoaded',()=>{
    window.themeStatisticsRoom?.apply(document.getElementById('stats-screen'));
    window.powerIndexLeaderboard.getAvatarUrl=()=>reviewAvatar;
    window.vatreniNiz.getAvatarUrl=()=>reviewAvatar;
    const values={'stat-power-index':'780','stat-high':'777','stat-games':'128','stat-wins':'57','stat-draws':'9','stat-losses':'23','stat-rate':'64%','stat-streak':'7','stat-avg':'521','stat-trophies':'9 / 26','stat-balance':'2 450','stat-alltime':'66 688','stat-fav-opp-name':'Milan','stat-fav-opp-games':'12 mečeva'};
    for(const [id,value] of Object.entries(values)){const el=document.getElementById(id);if(el)el.textContent=value;}
    for(const [id,width] of [['stat-bar-win','64%'],['stat-bar-draw','10%'],['stat-bar-loss','26%']])document.getElementById(id).style.width=width;
    const assetRoot=statsReviewTheme==='dark'?'assets/theme-packs/dark': 'assets/theme-packs/'+statsReviewTheme;
    const avatar=assetRoot+'/canonical/online-players-internal/avatar-v1.png';
    const names=['Milan','Ana','Marko','Jelena'];
    document.getElementById('h2h-list-container').innerHTML=names.map((name,index)=>'<button type="button" class="h2h-rival-tile"><span class="h2h-rival-avatar-wrap"><img class="h2h-rival-avatar" src="'+avatar+'" alt=""><span class="h2h-rival-count">'+(12-index*2)+'</span></span><span class="h2h-rival-name">'+name+'</span><span class="h2h-rival-record">7 W / 1 D / 4 L</span><span class="h2h-rival-matches">12 mečeva</span></button>').join('');
    document.querySelectorAll('.h2h-rival-tile').forEach(button=>button.addEventListener('click',showDetail));
    if(new URLSearchParams(location.search).get('page')==='h2h')requestAnimationFrame(()=>goToStatsPage(1));
    const ranking=new URLSearchParams(location.search).get('ranking');
    if(ranking==='power')requestAnimationFrame(()=>window.powerIndexLeaderboard.openModal());
    if(ranking==='streak')requestAnimationFrame(()=>window.vatreniNiz.openModal());
    function showDetail(){
        let modal=document.getElementById('h2h-detail-modal');
        if(!modal){modal=document.createElement('div');modal.id='h2h-detail-modal';modal.className='h2h-detail-modal';document.body.appendChild(modal);}
        const icon=role=>'<img class="h2h-detail-stat-icon" data-stat-icon="'+role+'" src="'+window.themeStatisticsRoom.asset(role)+'" alt="">';
        modal.innerHTML='<button class="h2h-detail-backdrop" aria-label="Zatvori"></button><div class="h2h-detail-card" role="dialog" aria-modal="true"><button class="h2h-detail-close" aria-label="Zatvori">×</button><div class="h2h-detail-title">MEĐUSOBNI DUELI</div><div class="h2h-detail-players"><div class="h2h-detail-player"><img class="h2h-detail-avatar" src="'+avatar+'" alt=""><div class="h2h-detail-name">Takmičar</div><div class="h2h-detail-score">7 W</div></div><div class="h2h-detail-vs"><img class="h2h-detail-vs-icon" src="'+window.themeStatisticsRoom.asset('versus')+'" alt=""></div><div class="h2h-detail-player"><img class="h2h-detail-avatar h2h-detail-avatar-opp" src="'+avatar+'" alt=""><div class="h2h-detail-name">Milan</div><div class="h2h-detail-score">4 L</div></div></div><div class="h2h-detail-total">12 mečeva</div><div class="h2h-stats-area h2h-detail-stats">'+[['highest-score','Najviše poena','777'],['max-win-margin','Najveća razlika','+130'],['worst-loss-margin','Najteži poraz','-82'],['fire-streak','Vatreni niz','3'],['draws','Nerešeno','1'],['average','Tvoj prosek','521']].map(item=>'<div class="h2h-stat-row"><span class="lbl h2h-detail-stat-label">'+icon(item[0])+'<span>'+item[1]+'</span></span><span class="val">'+item[2]+'</span></div>').join('')+'</div><div class="h2h-bar-wrapper h2h-detail-bar"><div class="h2h-bar-bg"><div class="h2h-bar-win" style="width:58%"></div><div class="h2h-bar-draw" style="width:8%"></div></div><div class="h2h-bar-text">58% POBEDA</div></div><button class="h2h-share-btn">↗ PODELI KARTICU</button></div>';
        modal.classList.add('active');
        modal.querySelectorAll('.h2h-detail-backdrop,.h2h-detail-close').forEach(el=>el.addEventListener('click',()=>modal.classList.remove('active')));
    }
});
</script></body></html>`;

const themes = [
    ['light','Svetlo Zlato'],['medium','Trula Višnja'],['winter','Plavi Okean'],
    ['neon','Neon Cyber'],['amethyst','Kraljevski Ametist'],['easter','Vaskršnja'],
    ['desert','Pustinjsko Staklo'],['moon','Mesečev Sjaj'],['severna','Severna Maglina']
];
const review = `<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Statistika — poređenje rasporeda</title><style>
*{box-sizing:border-box}body{margin:0;background:#171d28;color:#f5f6f8;font:14px system-ui,Arial,sans-serif}header{max-width:1000px;margin:auto;padding:24px 18px 14px}h1{font-size:25px;margin:0 0 7px}p{color:#cbd6e2;margin:0 0 15px}nav{display:flex;flex-wrap:wrap;gap:7px}nav button{border:1px solid #53657a;border-radius:9px;padding:8px 10px;background:#2a394b;color:#f5f8fc;cursor:pointer}nav button[aria-current=true]{background:#7da9bb;color:#0e2532}main{max-width:1000px;margin:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px;padding:0 18px 25px}.column{min-width:0}.column h2{font-size:17px;margin:8px 0}.phone{width:403px;max-width:100%;margin:auto;height:862px;border:5px solid #3c4a59;border-radius:24px;overflow:hidden;background:#141923}.phone iframe{border:0;width:100%;height:100%;display:block}.help{max-width:1000px;margin:auto;padding:0 18px 20px}#page-switch{margin-bottom:12px}@media(max-width:810px){main{grid-template-columns:1fr}.phone{height:780px}} 
</style></head><body><header><h1>Statistika — stvarni raspored kartica</h1><p>Levo je Zelena referenca, desno odabrana tema. Prikaz koristi HTML i CSS aplikacije pri širini telefona od 393 px; brojevi su probni.</p><nav>${themes.map(([id,name])=>`<button data-theme="${id}">${name}</button>`).join('')}</nav></header><main><div class="column"><h2>Zelena — referenca</h2><div class="phone"><iframe id="green" title="Zelena tema" src="theme-statistics-app-frame.html?theme=dark"></iframe></div></div><div class="column"><h2 id="target-name">Svetlo Zlato</h2><div class="phone"><iframe id="target" title="Izabrana tema" src="theme-statistics-app-frame.html?theme=light"></iframe></div></div></main><div class="help"><button id="page-switch">Prikaži H2H kartice</button> <button data-ranking="power">Prikaži Power Index listu</button> <button data-ranking="streak">Prikaži Vatreni niz listu</button><p>Rang liste koriste stvarni prikaz aplikacije sa probnim rezultatima. Samo unutrašnja lista može da se pomera uspravno.</p></div><script>
const themes=${JSON.stringify(themes)};const params=new URLSearchParams(location.search);let current=themes.find(t=>t[0]===params.get('theme'))||themes[0];let page='overview',ranking='';function update(){document.getElementById('target-name').textContent=current[1];const suffix=(page==='h2h'?'&page=h2h':'')+(ranking?'&ranking='+ranking:'');document.getElementById('green').src='theme-statistics-app-frame.html?theme=dark'+suffix;document.getElementById('target').src='theme-statistics-app-frame.html?theme='+current[0]+suffix;document.querySelectorAll('nav button').forEach(b=>b.setAttribute('aria-current',String(b.dataset.theme===current[0])));document.getElementById('page-switch').textContent=page==='h2h'?'Prikaži pregled':'Prikaži H2H kartice';history.replaceState(null,'','?theme='+current[0]);}document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>{current=themes.find(t=>t[0]===b.dataset.theme);update()}));document.getElementById('page-switch').addEventListener('click',()=>{page=page==='h2h'?'overview':'h2h';ranking='';update()});document.querySelectorAll('[data-ranking]').forEach(b=>b.addEventListener('click',()=>{page='overview';ranking=b.dataset.ranking;update()}));update();
</script></body></html>`;

fs.writeFileSync(path.join(root,'docs/theme-statistics-app-frame.html'),frame);
fs.writeFileSync(path.join(root,'docs/theme-statistics-layout-review.html'),review);
console.log('Built actual Statistics layout comparison for Green and nine themes.');
