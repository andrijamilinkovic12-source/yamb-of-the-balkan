// Local renderer evidence only; these images are not Android emulator captures.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sharp=require(process.env.YAMB_SHARP_PATH||'sharp');
const root=path.resolve(__dirname,'..'),source=path.join(root,'tmp/online-random-layout-runtime');
const output=path.join(root,'docs/theme-visual-audit/finish-resize-2026-10-30');
const names={dark:'Zelena',light:'Svetlo zlato',medium:'Trula višnja',winter:'Plavi okean',neon:'Neon Cyber',amethyst:'Kraljevski ametist',easter:'Vaskršnja',desert:'Pustinjsko staklo',moon:'Mesečev sjaj',severna:'Severna maglina'};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function main(){
 const report=JSON.parse(fs.readFileSync(path.join(source,'resize-report.json'),'utf8'));
 assert.equal(report.failures.length,0);assert.equal(report.rows.length,150);
 assert.equal(new Set(report.rows.map(x=>x.theme)).size,10);
 fs.mkdirSync(output,{recursive:true});
 const images=[];
 for(const [theme,name]of Object.entries(names))for(const[state,size]of [['win','320x568'],['loss','411x891']]){
  const stem=`${theme}-resize-${state}-${size}`;
  await sharp(path.join(source,stem+'.png')).resize({width:480}).jpeg({quality:88}).toFile(path.join(output,stem+'.jpg'));
  images.push({theme,name,state,size,file:stem+'.jpg'});
 }
 report.date='2026-10-30';report.localGameVersion='6.37';report.screenshots=images;
 report.conclusion='150 lokalnih stanja prolazi: granice i centar kartice, bez skrola sobe/kartice, učitani vidljivi PNG i bez nagradnih/revanš zahteva. Odsečen Android kadar nije ponovljen u Chromium testu; promena Android wm/density i kompozitor nisu ovim provereni. Sintetički iznosi/PI služe prikazu, nisu dokaz stvarne isplate. Nema produkcionog testa ili promene dizajna.';
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(path.join(output,'index.html'),`<!doctype html><html lang="sr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Završni panel — promene veličine</title><style>body{margin:0;background:#18222c;color:#edf4f7;font:16px/1.5 system-ui;padding:24px}main{max-width:1200px;margin:auto}a{color:#9edcff}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px}article{background:#253543;padding:14px;border-radius:12px}img{width:100%;height:auto}</style><main><h1>Završni panel: 150 lokalnih provera</h1><p><strong>Ovo su izolovani lokalni prikazi, ne snimci emulatora ili stvarnih partija.</strong></p><p>${esc(report.conclusion)}</p><p>10 tema × pobeda/poraz/remi ×411×891 →360×640 →320×568 →430×932 →411×891. Animacije uključene, mobilna emulacija DPR3.5; stvarni handleGameOver/CSS, spoljni zahtevi blokirani. Font može biti offline zamena.</p><p><a href="report.json">Mere i svih150 rezultata</a></p><div class="grid">${images.map(x=>`<article><h2>${esc(x.name)}</h2><p>${x.state==='win'?'Pobeda':'Poraz'} · ${esc(x.size)}</p><img loading="lazy" src="${x.file}" alt="${esc(x.name)} — lokalni završni panel"></article>`).join('')}</div></main></html>`);
 console.log('WROTE local finish resize audit: 150 measured states, 20 images; Android resize issue remains open.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
