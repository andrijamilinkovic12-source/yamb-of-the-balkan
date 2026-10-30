// Public static version verification only; no accounts, cookies or app API calls.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const normalize=text=>text.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
const hash=text=>crypto.createHash('sha256').update(normalize(text)).digest('hex');
async function main(){
 const rows=await Promise.all(['https://yamb-reconnect-qa.onrender.com','https://yamb-of-the-balkan.onrender.com'].map(async host=>{
  const response=await fetch(host+'/?verify640='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(20000)}),html=await response.text();
  const resources=await Promise.all(['game.js','theme-game-header.js','theme-settings-room.js'].map(async file=>{
   const version=html.match(new RegExp(file.replaceAll('.','\\.')+'\\?v=([^"\']+)'))?.[1];
   if(!version)throw Error('Missing version: '+file);
   const res=await fetch(host+'/'+file+'?v='+encodeURIComponent(version)+'&verify640='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(20000)}),body=await res.text();
   return {file,version,status:res.status,sha256Normalized:hash(body),matchesLocalNormalized:hash(body)===hash(fs.readFileSync(path.join('www',file),'utf8'))};
  }));
  return {host,status:response.status,resources};
 }));
 const result={checkedAt:new Date().toISOString(),commit:require('node:child_process').execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim(),scope:'Public static GET only; not proof of the Android loaded version.',rows};
 const dir='docs/theme-visual-audit/postdeploy640-2026-10-30';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/published.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result,null,2));
 if(rows.some(r=>r.status!==200||r.resources.some(x=>x.status!==200||!x.matchesLocalNormalized)||(r.resources.find(x=>x.file==='game.js')?.version!=='6.40')))process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
