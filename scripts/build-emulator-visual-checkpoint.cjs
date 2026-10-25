// Technical screenshot packaging; no game artwork is changed.
const fs=require('node:fs'),path=require('node:path');
const sharp=require(process.env.YAMB_SHARP_PATH||'sharp');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/theme-visual-audit/emulator-2026-10-25'),raw=path.join(root,'tmp/emulator-visual-2026-10-25');
for(const target of [out,raw]){
 if(!path.resolve(target).startsWith(root+path.sep))throw Error('Evidence path outside workspace');
 fs.mkdirSync(target,{recursive:true});
}
const themes={dark:'Zelena',light:'Svetlo zlato',medium:'Trula višnja',winter:'Plavi okean',neon:'Neon Cyber',amethyst:'Kraljevski ametist',easter:'Vaskršnja',desert:'Pustinjsko staklo',moon:'Mesečev sjaj',severna:'Severna maglina'};
const entries=[];
for(const [theme,name] of Object.entries(themes)){
 entries.push({file:`${theme}-menu-small`,theme,title:`${name} — glavni meni`,state:'360 × 780; deploy pre lokalnih ispravki kontrasta.'});
 const settings=theme==='dark'?'dark-settings-small':theme==='light'?'light-settings-small-return':theme==='medium'?'medium-settings-small':`${theme}-settings-small-settled`;
 entries.push({file:settings,theme,title:`${name} — Podešavanja`,state:'360 × 780; konačno učitani prikaz, ne potvrda brzine prve promene teme.'});
}
for(const [file,theme,title,state] of [
 ['neon-settings-small','neon','Nalaz: prethodne ikone pri promeni teme','Neon površina i prethodne Ocean ikone.'],
 ['desert-settings-small','desert','Nalaz: nedostaje X i ostaju prethodne ikone','Prvi prikaz nakon promene.'],
 ['dark-daily','dark','Dnevni izazov — otvoreni pokušaj','Izvorni ekran 1440 × 3120, 560 dpi.'],
 ['dark-daily-result','dark','Dnevni izazov — rezultat 96','Izričito odobren jedan test; bez reklame i preuzimanja nagrade.'],
 ['amethyst-treasury-godlike','amethyst','Riznica — novi trofej sa kockom','Pregled malog prikaza nove ilustracije; bez kupovine ili aktivacije.'],
 ['amethyst-treasury-effects-top','amethyst','Nalaz: nepotpuno učitani efekti','Veliki PNG originali učitavaju se postepeno u malim karticama.'],
 ['amethyst-treasury-effects-settled','amethyst','Riznica — isti efekti učitani','Nisu trajno odsečeni; manji PNG prikazi su lokalna ispravka koja čeka deploy.']
])entries.push({file,theme,title,state});
const findings=[
 {id:'R01',status:'lokalno ispravljeno; čeka deploy',problem:'Prethodne PNG kontrole posle promene teme.',fix:'Čekanje privatnog keša dekodiranih Podešavanja i kanonskog X; zajedničke audio kontrole menjaju se istom operacijom.'},
 {id:'R02',status:'lokalno ispravljeno; čeka deploy',problem:'Slab kontrast delova menija.',fix:'Tematske površine i mastilo za Svetlo zlato, Trulu višnju i natpise; diskretna kontura pojedinih naziva modova. Dimenzije sačuvane.'},
 {id:'R03',status:'lokalno ispravljeno; čeka deploy',problem:'Veliki PNG originali u malim karticama efekata.',fix:'43 proporcionalne RGBA izvedenice sedam vrsta efekata, bez promene animacionih originala; 90,7% manje podataka u paketu.'}
];
const report={date:'2026-10-25',method:'Vidljive Android kontrole i ADB snimci; bez WebView debug pristupa.',deployment:'Javni theme-quality-assets.js: HTTP 200, normalizovani SHA odgovara lokalnom fajlu, 26.334 bajta.',coverage:{mainMenu:'10/10 tema, 360 × 780',settings:'10/10 tema, konačno učitani prikaz, 360 × 780',daily:'Zelena: otvoreni pokušaj i završni panel',treasury:'Ametist: deo trofeja i efekata'},limits:'Ovo nije potpuna provera svih soba, stanja i završnih ekrana, niti fizički Samsung S25 test. Lokalne ispravke još nisu na snimljenom deployu.',remaining:['Vizuelna potvrda R01–R03 posle sledećeg deploya.','Ostale sobe i podprikazi; druge teme Dnevnog izazova i Riznice.','Završni ekrani modova i retka stanja; partije, reklame i nagrade samo uz odgovarajuće odobrenje.'],findings,entries};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
(async()=>{
 for(const e of entries){
  const original=path.join(out,e.file+'.png'),archived=path.join(raw,e.file+'.png'),source=fs.existsSync(original)?original:archived;
  if(!fs.existsSync(source))throw Error('Missing screenshot '+source);
  await sharp(source).resize({width:810,withoutEnlargement:true}).jpeg({quality:90,chromaSubsampling:'4:4:4'}).toFile(path.join(out,e.file+'.jpg'));
 }
 for(const name of fs.readdirSync(out))if(name.endsWith('.png')){
  const source=path.resolve(out,name),target=path.resolve(raw,name);
  if(path.dirname(source)!==out||path.dirname(target)!==raw)throw Error('Invalid archive path');
  if(fs.existsSync(target))throw Error('Refusing to overwrite '+target);
  fs.renameSync(source,target);
 }
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="sr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Emulator — delimični pregled</title><style>body{margin:24px;background:#14202d;color:#edf2f7;font:16px/1.5 system-ui}main{max-width:1300px;margin:auto}a{color:#a9def7}.notice,article{padding:16px;border:1px solid #687e91;border-radius:12px;background:#203244}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}img{width:100%;height:auto}h2{font-size:19px}small{display:block}select{font:inherit;padding:8px;margin:12px 0}</style><main><h1>Emulator: delimični pregled svih deset tema</h1><p class="notice">${esc(report.limits)}</p><p>${esc(report.method)} ${esc(report.deployment)}</p><p>Glavni meni i Podešavanja: 10/10 tema na 360 × 780. Dnevni izazov: Zelena. Riznica: deo Ametista. Vraćeni su originalni ekran emulatora i Zelena tema; prijava je očuvana.</p><h2>Nalazi</h2>${findings.map(f=>`<p><b>${f.id}: ${esc(f.problem)}</b><br>${esc(f.fix)}<br><small>${esc(f.status)}</small></p>`).join('')}<p><a href="../effect-card-derivatives-v1.png">Svih 43 kanonskih izvedenica</a> · <a href="report.json">Evidencija</a> · <a href="../index.html">Statički PNG audit</a></p><label>Tema <select id="theme"><option value="">Sve teme</option>${Object.entries(themes).map(([id,n])=>`<option value="${id}">${esc(n)}</option>`).join('')}</select></label><div class="grid">${entries.map(e=>`<article data-theme="${e.theme}"><h2>${esc(e.title)}</h2><p>${esc(e.state)}</p><a href="${e.file}.jpg"><img loading="lazy" src="${e.file}.jpg" alt="${esc(e.title)}"></a></article>`).join('')}</div><h2>Preostalo</h2><ul>${report.remaining.map(s=>`<li>${esc(s)}</li>`).join('')}</ul><p>JPEG kopije služe za pregled. Originalni PNG snimci čuvaju se lokalno u tmp/emulator-visual-2026-10-25.</p></main><script>document.getElementById('theme').onchange=function(){for(const a of document.querySelectorAll('article'))a.hidden=!!this.value&&a.dataset.theme!==this.value};</script></html>`);
 console.log(`Packaged ${entries.length} screenshots; exact PNG originals retained under workspace tmp/.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
