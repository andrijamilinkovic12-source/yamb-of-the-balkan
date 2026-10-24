const fs=require('node:fs'),path=require('node:path');
const {sheet,root,output}=require('./build-theme-visual-audit.cjs');
const report=JSON.parse(fs.readFileSync(path.join(output,'report.json')));
(async()=>{
 const index=[];
 for(const theme of report.summary.filter(t=>t.id!=='universal')){
  const rows=report.assets.filter(a=>a.theme===theme.id&&a.activation.startsWith('active-'));
  for(let offset=0;offset<rows.length;offset+=100){
   const chunk=rows.slice(offset,offset+100),file=`contrast-${theme.id}-${offset/100+1}.png`;
   await sheet(file,chunk.map(a=>({file:a.file,theme:a.theme,label:'',id:a.id})),10,105,110);
   index.push({file,theme:theme.id,ids:chunk.map(a=>a.id)});
  }
 }
 fs.writeFileSync(path.join(output,'contrast-sheets.json'),JSON.stringify(index,null,2)+'\n');
 console.log('Wrote flattened real-surface contrast probes for ten themes.');
})().catch(e=>{console.error(e);process.exitCode=1;});
