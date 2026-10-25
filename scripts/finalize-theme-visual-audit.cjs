const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require(process.env.YAMB_SHARP_PATH||'sharp');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/theme-visual-audit');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const baseline=read('docs/theme-visual-audit/inventory.json'),supplement=read('docs/theme-visual-audit/supplement.json');
const notes=read('docs/theme-visual-audit/review-notes.json');
const sheets=read('docs/theme-visual-audit/sheets.json').concat(read('docs/theme-visual-audit/supplement-sheets.json'));
const stars=read('source-assets/theme-tournament-star-v2/manifest.json');
const definitions=read('docs/theme-definitions.json');
const names=Object.fromEntries(definitions.themes.map(t=>[t.id,t.nameSr]));names.universal='Univerzalni skinovi i materijali';
const oldToNew=new Map(stars.assets.flatMap(a=>a.production.map(p=>[p.supersedes,p.productionPath])));
const inspected=new Map(sheets.filter(s=>notes.reviewedSheets.includes(s.file)).flatMap(s=>s.ids.map(id=>[id,s.file])));
const contrastFile=path.join(out,'contrast-sheets.json');
const contrast=fs.existsSync(contrastFile)?new Map(JSON.parse(fs.readFileSync(contrastFile)).flatMap(s=>s.ids.map(id=>[id,s.file]))):new Map();
const all=baseline.assets.concat(supplement).map(a=>({...a,labels:[...a.labels],rooms:[...a.rooms],consumers:[...a.consumers]}));
const qualityFile=path.join(root,'source-assets/theme-quality-refresh-v2/manifest.json');
const quality=fs.existsSync(qualityFile)?JSON.parse(fs.readFileSync(qualityFile)):{assets:[],redirects:[]};
const qualityReplacements=new Map(quality.redirects.map(r=>[r.from,r.to]));
for(const [index,q] of quality.assets.entries())if(q.status==='verified'){
 qualityReplacements.set(q.previous,q.productionPath);
 const old=all.find(a=>a.file===q.previous);
 const id='Q'+String(index+1).padStart(4,'0'),reviewSheet=`quality-${q.theme}-v2.png`;
 if(!notes.reviewedSheets.includes(reviewSheet))throw Error('Quality PNG missing visual approval: '+reviewSheet);
 inspected.set(id,reviewSheet);contrast.set(id,reviewSheet);
 all.push({id,file:q.productionPath,theme:q.theme,family:old?.family||q.previous.split('/').at(-2),labels:old?.labels||[q.role],rooms:old?.rooms||['Odgovarajući runtime prikaz'],
  consumers:[...(old?.consumers||[]),{kind:'canonical-quality-refresh',evidence:'www/theme-quality-assets.js + source-assets/theme-quality-refresh-v2/manifest.json'}],
  width:q.width,height:q.height,bytes:q.bytes,sha256:q.sha256,activation:'resolver-mapped',replaces:q.previous,
  sourceMaster:q.master,qualityReview:q.review,correctedFinding:q.reason});
}
const effectCardFile=path.join(root,'source-assets/theme-effect-card-thumbnails-v1/manifest.json');
const effectCards=fs.existsSync(effectCardFile)?JSON.parse(fs.readFileSync(effectCardFile)):{assets:[]};
for(const [index,card] of effectCards.assets.entries()){
 if(card.status!=='verified')throw Error('Unreviewed effect derivative: '+card.productionPath);
 const reviewSheet='effect-card-derivatives-v1.png',id='D'+String(index+1).padStart(4,'0');
 if(!notes.reviewedSheets.includes(reviewSheet))throw Error('Missing derivative contact review');
 inspected.set(id,reviewSheet);contrast.set(id,reviewSheet);
 all.push({id,file:card.productionPath,theme:card.theme,family:'effect-card-derivative',labels:[card.effectId+' / kartica'],rooms:['Riznica / Efekti'],
  consumers:[{kind:'canonical-derivative',evidence:'www/managers.js#getTreasuryEffectPreviewSource'}],width:card.width,height:card.height,bytes:card.bytes,sha256:card.sha256,
  canonicalVariantOf:card.source,variantReview:card.review,exception:card.exception||null});
}
const byFile=new Map(all.map(a=>[a.file,a]));
for(const a of all){
 const themedFile=a.file.match(/\/effects\/(?:black-hole|supernova)\/(\w+)-/)||a.file.match(/\/stage-v1\/ufo-(\w+)\.png/)
  ||a.file.match(/\/theme-backgrounds\/(\w+)-/)||a.file.match(/\/treasury-theme-previews\/(\w+)-/);
 if(themedFile && names[themedFile[1]])a.theme=themedFile[1];
 if(a.file.includes('/green-clay-balkan-diorama-'))a.theme='dark';
 const flag=notes.flags[a.id];
 a.visualStatus=flag?.[0]||'prihvatljiv';
 a.reason=flag?.[1]||'U pregledanom PNG-u i malom prikazu motiv je prepoznatljiv, volumen i detalji primereni njegovoj ulozi; nema uočene preterane dekoracije.';
  a.evidence={sheet:inspected.get(a.id)||null,largeAnd28px:inspected.has(a.id),surfaceProbe:contrast.get(a.id)||null,inApplication:'Pojedinačni dinamički prikaz ovog fajla nije potvrđen ovim statičkim zapisom. Delimični pregled emulatora je zasebno evidentiran u emulator-2026-10-25/index.html.'};
 if(!a.evidence.sheet)throw Error('Unreviewed sheet: '+a.id);
 if(a.file.includes('/treasury-effect-previews/')){
  a.activation='inactive-css-art';a.activationReason='Kasniji #riznica-screen#riznica-screen#riznica-screen .effect-preview-box::before/::after u theme-treasury-room.css isključuje ove pozadine. Aktivni IMG rešava managers.js.';
 }
 else if(a.file.includes('/trial/game-board-png-v1/')){
  a.activation='inactive-trial';a.activationReason='theme-neon-board-png-trial.css nije učitan u www/index.html; korisnik je odabrao prethodnu tablu.';
 }
 else if(oldToNew.has(a.file)){
  a.activation='superseded';a.resolvedBy=oldToNew.get(a.file);a.visualStatus='potrebna dorada';
  a.reason='Istorijski pehar/kompozit bez petokrake zvezde. Ispravljeno aktivnom v2 izvedenicom; v1 ostaje samo izvor/istorija.';
 }
 else if(a.activation==='conditional-or-legacy-candidate'){
  a.activation='active-reference';a.activationReason='Putanja iz učitanog runtime-a ili Green prikaza; uslovnu vidljivost potvrditi u odgovarajućem stanju aplikacije.';
 }
 else a.activation='active-resolver';
 if(a.file.includes('/treasury-effect-thumbnails/')){
  const large=a.file.replace('/treasury-effect-thumbnails/','/treasury-effect-previews/');
  const parent=byFile.get(large),parentFlag=parent&&notes.flags[parent.id];
  if(parentFlag&&!flag){a.visualStatus=parentFlag[0];a.reason=parentFlag[1];}
  a.derivedFrom=parent?.file||null;a.rooms=['Riznica / Efekti'];
 }
 if(/\/(daily|treasury)\/reward-video-v3\.png$|\/solo\/finish-reward-video-v3\.png$/.test(a.file)){
  a.visualStatus='potrebna dorada';
  a.reason='Aktivna odvojena ilustracija video-nagrade sa ugrađenim dukatima, pored kanonske video-ikone. Uskladiti simbol video-radnje i ugrađeni dukat sa aktivnim masterima teme; ne stvarati novu ikonu.';
 }
 if(qualityReplacements.has(a.file)){
  a.activation='superseded-quality';a.resolvedBy=qualityReplacements.get(a.file);
  a.resolution='Zamenjeno pregledanim PNG-om ili postojećom kanonskom video-ikonom. Resolveri i preloader odmah koriste novu putanju; istorijski fajl nije aktivan prikaz.';
 }
 if(a.replaces)a.reason=a.qualityReview||'Nova zasebna PNG izvedenica, vizuelno pregledana u velikom i 28px prikazu na podlozi teme; uklonjen evidentirani problem. Dimenzije i optička veličina sačuvani.';
 if(a.canonicalVariantOf)a.reason=a.variantReview;
 if(a.file.includes('/skin-action-buttons-v1/')||a.file.includes('/skin-roll-counter-v1/')||a.file.includes('/dice-skins-v1/')||a.file.includes('/treasury-skin-previews/')){
  a.exception='Vlasništvo skina, nezavisno od izabrane teme. Isti skin i njegove komande rade u svih deset tema; ovo nije kopiranje tematskog icon packa.';
 }
 if(/\/stage-v1\/(flame|trumpet|frost-corner)\.png$/.test(a.file))a.exception='Nameran univerzalni fizički materijal/predmet: prirodni plamen, mesingana truba ili beli led. Ostali parametri animacije prate aktivnu temu.';
 if(a.file.includes('/treasury-controls/tab-trophies-'))a.exception='Zbirni simbol trofeja Riznice, nije kanonski pehar osvojenog Turnira; ne dodavati mu turnirsku zvezdu automatski.';
 if(a.file.includes('green-soft-clay/canonical/tournament-awards/finalist-silver'))a.exception='Usvojeni Green finalista je medalja sa zvezdom, ne srebrni model pehara; ne spajati siluete različitih semantičkih prikaza.';
 const canonicalDeps=[];
 if(a.file.includes('/competition-medals/tournament-'))canonicalDeps.push('tournament-trophy');
 if(a.file.includes('/competition-medals/quarterly-league-'))canonicalDeps.push('quarterly-league');
 if(a.file.includes('/competition-medals/fire-streak-'))canonicalDeps.push('fire-streak');
 if(a.file.includes('/competition-medals/power-index-'))canonicalDeps.push('power-index');
 if(/treasury-free|gold-rain|reward-video-v3|collection-medals/.test(a.file))canonicalDeps.push('ducat');
 if(a.file.includes('ducats-undo'))canonicalDeps.push('ducat','undo-token');
 a.canonicalDependencies=[...new Set(canonicalDeps)];
}
const active=a=>a.activation.startsWith('active-');
const htmlEscape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
(async()=>{
 let cursor=0;await Promise.all(Array.from({length:8},async()=>{while(cursor<all.length){
  const a=all[cursor++],file=path.join(root,a.file),bytes=fs.readFileSync(file);
  if(crypto.createHash('sha256').update(bytes).digest('hex')!==a.sha256)throw Error('Audit snapshot changed: '+a.file);
  const {data,info}=await sharp(file).ensureAlpha().resize(48,48,{fit:'fill'}).raw().toBuffer({resolveWithObject:true});
  const corners=[3,(info.width-1)*4+3,(info.height-1)*info.width*4+3,(info.width*info.height-1)*4+3].map(n=>data[n]);
  let minAlpha=255,maxAlpha=0;for(let n=3;n<data.length;n+=4){minAlpha=Math.min(minAlpha,data[n]);maxAlpha=Math.max(maxAlpha,data[n]);}
  a.alpha={sample48px:true,corners,minAlpha,maxAlpha};
 }}));
 const totals=Object.fromEntries(['prihvatljiv','potrebna dorada','potrebna zamena'].map(s=>[s,all.filter(a=>active(a)&&a.visualStatus===s).length]));
 const summary=Object.keys(names).map(id=>({id,name:names[id],active:all.filter(a=>a.theme===id&&active(a)).length,
  accepted:all.filter(a=>a.theme===id&&active(a)&&a.visualStatus==='prihvatljiv').length,
  refine:all.filter(a=>a.theme===id&&active(a)&&a.visualStatus==='potrebna dorada').length,
  replace:all.filter(a=>a.theme===id&&active(a)&&a.visualStatus==='potrebna zamena').length}));
 const report={schemaVersion:1,date:'2026-10-25',scope:definitions.visualAssetFamilyAuditRule,
  evidenceLevel:'Pregled statičkih PNG u većoj i 28px veličini na površini teme; resolveri, kanonski potrošači, dimenzije i alpha uzorci provereni. Delimični pregled na emulatoru je u zasebnoj evidenciji emulator-2026-10-25/index.html; nije potvrđen svaki dinamički prikaz niti fizički Samsung S25.',
  totalPathCandidates:all.length,activePathCount:all.filter(active).length,inactivePathCount:all.filter(a=>!active(a)).length,totals,summary,
  starCorrection:{themes:[...new Set(stars.assets.map(a=>a.theme))],masters:stars.assets.length,productionPngs:stars.assets.reduce((n,a)=>n+a.production.length,0),manifest:'source-assets/theme-tournament-star-v2/manifest.json',preservedThemes:['dark','light','medium'],routing:'menu, intro, room, rules, medals, finalist, ceremony and preload updated'},
  qualityRefresh:{manifest:'source-assets/theme-quality-refresh-v2/manifest.json',planned:quality.assets.length,verified:quality.assets.filter(a=>a.status==='verified').length,awaitingReview:quality.assets.filter(a=>a.status==='generated-awaiting-review').length,pending:quality.assets.filter(a=>a.status==='pending').length,canonicalVideoRedirects:quality.redirects.length,runtime:'www/theme-quality-assets.js'},
  symbolicTemplates:baseline.unresolvedTemplates.map(t=>({...t,review:/yamb-(h2h|turnir)-/.test(t.template)?'Izvoz generisane kartice, nije statički assets.':'Obuhvaćeno proširenjem tematskih resolvera i popisom porodica/uloga; zapis šablona nije zasebna PNG putanja.'})),
  missingReferences:baseline.missingReferences,assets:all};
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 const findings=all.filter(a=>active(a)&&a.visualStatus!=='prihvatljiv');
 fs.writeFileSync(path.join(out,'findings.md'),'# Vizuelni audit PNG assetsa\n\n'+report.evidenceLevel+'\n\n'+
  '| Tema | Aktivne putanje | Prihvatljivo | Dorada | Zamena |\n|---|---:|---:|---:|---:|\n'+summary.map(s=>`| ${s.name} | ${s.active} | ${s.accepted} | ${s.refine} | ${s.replace} |`).join('\n')+
  '\n\n## Primena dorada\n\n'+report.qualityRefresh.verified+'/'+report.qualityRefresh.planned+' novih PNG-ova je vizuelno provereno i povezano. '+report.qualityRefresh.canonicalVideoRedirects+' starih ilustracija video-nagrade vodi na postojeći kanonski video PNG odgovarajuće teme. '+(report.qualityRefresh.verified===report.qualityRefresh.planned?'Sve planirane PNG zamene ovog prolaza pregledane su i povezane.':'Preostali nalazi ostaju otvoreni dok konkretna zamena ne prođe pregled.')+'\n\n## Ispravljene zvezde\n\n35 zasebnih generisanih mastera i 42 produkciona PNG-a za sedam tema. Zelena, Svetlo zlato i Trula višnja zadržavaju postojeće zvezde. Sve prethodne canvas dimenzije su sačuvane.\n\n## Aktivni nalazi\n\n'+findings.map(a=>`- **${a.id} / ${names[a.theme]} / ${a.visualStatus}** — ${a.reason}\n  - Fajl: \`${a.file}\`\n  - Prikazi: ${a.rooms.join('; ')}\n  - Potrošači: ${a.consumers.map(c=>c.evidence).join('; ')}`).join('\n')+'\n');
 const qualityLinks=[...new Set(quality.assets.filter(a=>a.status==='verified').map(a=>a.theme))].map(theme=>`<a href="quality-${theme}-v2.png">${htmlEscape(names[theme])}</a>`).join(' · ');
 const data=JSON.stringify(report).replace(/</g,'\\u003c');
 const html=`<!doctype html><html lang="sr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PNG audit — svih deset tema</title><style>
 *{box-sizing:border-box}body{margin:0;background:#111c28;color:#edf3f8;font:15px/1.5 system-ui,sans-serif}main{max-width:1500px;margin:auto;padding:24px}h1{margin:0}p{max-width:95ch;color:#c6d3df}a{color:#9adcf8}header{padding-bottom:18px}nav{position:sticky;top:0;z-index:3;background:#111c28ed;padding:12px 0;display:flex;gap:8px;flex-wrap:wrap}select,input,button{background:#243449;color:white;border:1px solid #688399;border-radius:8px;padding:10px;font:inherit}input{flex:1;min-width:180px}.stats{display:flex;flex-wrap:wrap;gap:12px}.stats b{display:block;background:#243449;padding:10px 14px;border-radius:8px}#grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}article{border:1px solid #476078;border-radius:12px;overflow:hidden;background:#1b293a;padding:14px}article small{display:block;color:#bdcddd;overflow-wrap:anywhere}article h2{font-size:16px;margin:8px 0}.preview{display:flex;gap:12px;justify-content:center;align-items:center;height:150px;border-radius:8px;background:var(--surface)}.large{width:130px;height:130px;object-fit:contain}.tiny{width:28px;height:28px;object-fit:contain}.status{font-weight:700;color:#99e0b2}.status.refine{color:#ffdc8c}.status.replace{color:#ffaeaa}summary{cursor:pointer}code{word-break:break-all}#more{margin:20px 0}table{border-collapse:collapse}td,th{border:1px solid #476078;padding:6px 12px;text-align:left}.notice{border:1px solid #8da6bd;padding:14px;border-radius:8px;background:#243449}img{max-width:100%}</style><main><header><h1>PNG audit svih deset tema</h1><p class="notice">${htmlEscape(report.evidenceLevel)}</p><div class="stats"><b>${report.activePathCount} aktivnih PNG putanja</b><b>${totals['potrebna dorada']} za doradu</b><b>${totals['potrebna zamena']} za zamenu</b><b>${report.qualityRefresh.verified}/${report.qualityRefresh.planned} novih PNG-ova</b><b>${report.qualityRefresh.canonicalVideoRedirects} kanonskih video veza</b><b>42 ispravljena turnirska PNG-a</b></div><p>Brojevi predstavljaju zasebne fajlove i izvedenice, ne broj semantičkih identiteta. Univerzalni skinovi imaju vlasništvo po skinu i ne ulaze deset puta u ukupni zbir. Oznaka „prihvatljiv“ odnosi se na pregledani PNG; stanje aplikacije je zaseban dokaz.</p><details><summary>Rezultat po temama i nivo provere</summary><table><tr><th>Tema</th><th>Aktivno</th><th>Prihvatljivo</th><th>Dorada</th><th>Zamena</th></tr>${summary.map(s=>`<tr><td>${htmlEscape(s.name)}</td><td>${s.active}</td><td>${s.accepted}</td><td>${s.refine}</td><td>${s.replace}</td></tr>`).join('')}</table></details><p><strong>Pregled novih PNG-ova po temi:</strong> ${qualityLinks}</p><p><a href="../../source-assets/theme-quality-refresh-v2/prompts.md">Zadaci i dorade svakog PNG-a</a> · <a href="star-corrections-v2.png">Novi pehari i medalje sa zvezdom</a> · <a href="report.json">Pun registar</a> · <a href="findings.md">Lista nalaza</a></p></header><nav><select id="theme"><option value="">Sve teme</option>${Object.entries(names).map(([k,v])=>`<option value="${k}">${htmlEscape(v)}</option>`).join('')}</select><select id="status"><option value="">Svi statusi</option><option>potrebna dorada</option><option>potrebna zamena</option><option>prihvatljiv</option></select><select id="activity"><option value="active">Aktivni</option><option value="all">Svi, uključujući istoriju</option><option value="inactive">Neaktivni / zamenjeni</option></select><input id="search" placeholder="Soba, uloga, putanja ili ID" aria-label="Pretraga"></nav><p id="count"></p><div id="grid"></div><button id="more">Prikaži još</button><script>const report=${data};</script><script>
 const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));let limit=60;
 const surfaces={dark:'#dbe7ca',light:'#fff1d7',medium:'#431720',winter:'#fff3df',neon:'#101c2d',amethyst:'#3c2852',easter:'#fff9eb',desert:'#fff2dc',moon:'#252936',severna:'#172c43',universal:'#dce4e9'};
 function render(){const q=$('search').value.toLowerCase(),theme=$('theme').value,status=$('status').value,activity=$('activity').value;const selected=report.assets.filter(a=>(!theme||a.theme===theme)&&(!status||a.visualStatus===status)&&(activity==='all'||a.activation.startsWith('active-')===(activity==='active'))&&(!q||JSON.stringify([a.id,a.file,a.labels,a.rooms,a.reason]).toLowerCase().includes(q)));
 $('count').textContent=selected.length+' fajlova; prikazano '+Math.min(limit,selected.length);$('grid').innerHTML=selected.slice(0,limit).map(a=>'<article style="--surface:'+surfaces[a.theme]+'"><div class="preview"><img class="large" loading="lazy" src="../../'+a.file+'" alt="'+esc(a.labels[0])+'"><img class="tiny" loading="lazy" src="../../'+a.file+'" alt=""></div><h2>'+esc(a.id+' · '+a.theme+' · '+a.labels[0])+'</h2><div class="status '+(a.visualStatus==='potrebna dorada'?'refine':a.visualStatus==='potrebna zamena'?'replace':'')+'">'+a.visualStatus+'</div><p>'+esc(a.reason)+'</p><small>'+a.width+' × '+a.height+' px · '+a.activation+'</small><details><summary>Putanja i sva mesta upotrebe</summary><code>'+esc(a.file)+'</code><p>'+esc(a.rooms.join(' · '))+'</p><small>'+esc(a.consumers.map(c=>c.evidence).join(' | '))+'</small><p>'+esc(a.exception||'')+'</p><p>'+esc(a.evidence.inApplication)+'</p>'+(a.resolvedBy?'<p>Zamenjeno: <code>'+esc(a.resolvedBy)+'</code></p>':'')+'</details></article>').join('');$('more').hidden=limit>=selected.length;}
 for(const id of ['theme','status','activity','search'])$(id).addEventListener(id==='search'?'input':'change',()=>{limit=60;render()});$('more').onclick=()=>{limit+=60;render()};render();</script></main></html>`;
 fs.writeFileSync(path.join(out,'index.html'),html);
 console.log(JSON.stringify({paths:all.length,active:report.activePathCount,inactive:report.inactivePathCount,totals,stars:report.starCorrection.productionPngs}));
})().catch(e=>{console.error(e);process.exitCode=1;});
