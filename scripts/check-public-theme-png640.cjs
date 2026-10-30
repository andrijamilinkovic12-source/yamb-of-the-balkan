// Bounded public HEAD requests for two observed theme selections; no app/account APIs.
const fs=require('node:fs');
const input=JSON.parse(fs.readFileSync('docs/theme-visual-audit/preload-retention-2026-10-30/menu-browser-after.json','utf8'));
const rows=[];
for(const theme of ['neon','easter']){
 const menu=input.metrics.decodes.filter(x=>x.phase===theme).map(x=>x.source);
 const root=`assets/theme-packs/${theme}/canonical/`;
 const settings=['profile','display-theme','language','terms','privacy'].map(r=>root+`settings-controls/${r}-v2.png?v=2`);
 settings.push(root+'settings-room-identity/settings-room-v1.png?v=1',root+'room-controls/close-v1.png?v=3',...['sound','music','vibration'].map(r=>root+`game-header/${r}-v1.png?v=1`));
 for(const source of [...new Set([...menu,...settings])])rows.push({theme,source});
}
async function main(){
 let next=0;await Promise.all(Array.from({length:4},async()=>{while(next<rows.length){const row=rows[next++],start=Date.now();try{const r=await fetch('https://yamb-reconnect-qa.onrender.com/'+row.source,{method:'HEAD',signal:AbortSignal.timeout(10000)});Object.assign(row,{status:r.status,type:r.headers.get('content-type'),contentLength:r.headers.get('content-length'),ms:Date.now()-start});}catch(e){row.error=e.message;}}}));
 const report={at:new Date().toISOString(),scope:'Public QA HEAD only, two themes, four workers, no body/decode or Android timing evidence.',rows};
 fs.writeFileSync('docs/theme-visual-audit/postdeploy640-2026-10-30/public-png-head.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({count:rows.length,not200:rows.filter(r=>r.status!==200),maxHeaderMs:Math.max(...rows.map(r=>r.ms||0))},null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
