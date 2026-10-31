// Public static GET only; no app/account APIs, cookies or private session access.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const normalize=s=>s.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
const hash=s=>crypto.createHash('sha256').update(normalize(s)).digest('hex');
const files=['game.js','theme-leaderboard-room.js','theme-online-players-room.js','theme-invite-friend-room.js','theme-game-header.js','theme-settings-room.js'];
async function main(){
 const localHtml=fs.readFileSync('www/index.html','utf8');
 const version=(html,file)=>html.match(new RegExp(file.replaceAll('.','\\.')+'\\?v=([^"\']+)'))?.[1];
 const rows=await Promise.all(['https://yamb-reconnect-qa.onrender.com','https://yamb-of-the-balkan.onrender.com'].map(async host=>{
  const r=await fetch(host+'/?verify641='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(20000)}),html=await r.text();
  const resources=await Promise.all(files.map(async file=>{
   const v=version(html,file);if(!v)throw Error('Missing version: '+file);
   const response=await fetch(host+'/'+file+'?v='+encodeURIComponent(v)+'&verify641='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(20000)}),body=await response.text();
   return {file,version:v,expectedVersion:version(localHtml,file),status:response.status,sha256Normalized:hash(body),matchesLocalNormalized:hash(body)===hash(fs.readFileSync(path.join('www',file),'utf8'))};
  }));return {host,status:r.status,resources};
 }));
 const report={at:new Date().toISOString(),commit:require('node:child_process').execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim(),scope:'Public HTML/JS GET only; not proof of loaded Android byte hashes.',rows};
 const out='docs/theme-visual-audit/postdeploy641-2026-10-30';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/published.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
 if(rows.some(r=>r.status!==200||r.resources.some(x=>x.status!==200||!x.matchesLocalNormalized||x.version!==x.expectedVersion)))process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
