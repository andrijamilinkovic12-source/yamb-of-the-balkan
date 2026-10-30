// Builds reviewable evidence from native Android captures, never synthesizes game states.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sharp=require(process.env.YAMB_SHARP_PATH||'sharp');
const root=path.resolve(__dirname,'..'),input=path.join(root,'tmp/two-emulator-qa-2026-10-29'),out=path.join(root,'docs/theme-visual-audit/random-qa-2026-10-29');
const names={dark:'Zelena',light:'Svetlo zlato',medium:'Trula višnja',winter:'Plavi okean',neon:'Neon Cyber',amethyst:'Kraljevski ametist',easter:'Vaskršnja',desert:'Pustinjsko staklo',moon:'Mesečev sjaj',severna:'Severna maglina'};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function main(){
 const verified=JSON.parse(fs.readFileSync(path.join(input,'random3-verified.json'),'utf8'));
 assert.equal(verified.reviewedBy,'visual inspection of native screenshots');
 const images=[];fs.mkdirSync(out,{recursive:true});
 for(const item of verified.images){
  assert(/^[a-z0-9-]+\.png$/.test(item.source));assert(names[item.theme]);
  const file=item.source.replace(/\.png$/,'.jpg');
  await sharp(path.join(input,'screens',item.source)).resize({width:540}).jpeg({quality:88,chromaSubsampling:'4:4:4'}).toFile(path.join(out,file));
  images.push({...item,file,themeName:names[item.theme]});
 }
 const report={date:'2026-10-29',testedCommit:'910b816c',testedGameVersion:'6.36',environment:'Zasebni Android APK com.yamb.balkan.staging, staging/reconnect-qa-01, odvojeni Firebase i Mongo yamb_reconnect_qa. Dva korisnikova QA naloga; nema produkcionog testa u ovom nastavku.',geometry:'720×1560 / 280 dpi tokom igre; proporcionalno originalnim1440×3120 / 560 dpi, isti logički viewport oko411×891 CSS px. Nije fizički Samsung S25.',method:'Isključivo native Android tap/swipe/screenshot i obični klijentski/serverovi potezi. Nema CDP, izvršavanja JS u aplikaciji, čitanja tokena, menjanja rezultata ili soket injekcije.',inventory:'Ranije proverene23 osnovne PNG uloge po temi,230 quality-resolved putanja. Kanonski dukat/video/PowerIndex/medalje koriste se deljeno. Nema novih PNG crteža ili promene postojećih dimenzija.',...verified,images};
 report.date=verified.reviewDate||report.date;
 if (report.resume20261030?.automaticRecovery) report.outcome += ' VAŽNA DOPUNA: ' + report.resume20261030.automaticRecovery;
 delete report.reviewedBy;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="sr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Online random — QA Android pregled</title><style>body{margin:0;padding:24px;background:#15232e;color:#edf6fc;font:16px/1.5 system-ui}main{max-width:1300px;margin:auto}a{color:#afe4ff}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px}img{width:100%;height:auto}article{background:#233847;padding:12px;border:1px solid #7895a8;border-radius:12px}</style><main><h1>Online random — stvarni QA pregled</h1><p>${esc(report.environment)}</p><p>${esc(report.method)}</p><p>${esc(report.outcome)}</p><p>${esc(report.geometry)}</p><a href="report.json">Tačan obuhvat i granice</a><ul>${report.remaining.map(x=>'<li>'+esc(x)+'</li>').join('')}</ul><div class="grid">${images.map(x=>`<article><h2>${esc(x.themeName)}</h2><p>${esc(x.label)}</p><img loading="lazy" src="${x.file}" alt="${esc(x.label)}"></article>`).join('')}</div></main></html>`);
 console.log(`WROTE Random QA: ${images.length} verified native frames; claims limited to manual evidence manifest.`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
