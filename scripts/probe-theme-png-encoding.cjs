// Lossless PNG encoding experiment only. Master files and active paths stay untouched.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require(process.env.YAMB_SHARP_PATH||'sharp');
const report=JSON.parse(fs.readFileSync('tmp/theme-switch-profile-2026-10-30/packs.json','utf8'));
const selected=report.rows.find(r=>r.theme==='easter').assets.filter(a=>/easter-v6-1|settings-room-v1|daily-room-menu|game-header\/sound/.test(a.resolved));
async function main(){
 const rows=[];
 for(const asset of selected){
  const input=path.join('www',asset.resolved.split('?')[0]),data=await sharp(input).png({compressionLevel:9,adaptiveFiltering:true,palette:false}).toBuffer();
  const [before,after]=await Promise.all([sharp(input).ensureAlpha().raw().toBuffer(),sharp(data).ensureAlpha().raw().toBuffer()]);
  rows.push({source:asset.resolved,beforeBytes:asset.bytes,afterBytes:data.length,identicalRGBA:before.equals(after),sha256RGBA:crypto.createHash('sha256').update(before).digest('hex')});
 }
 fs.writeFileSync('tmp/theme-switch-profile-2026-10-30/lossless-probe.json',JSON.stringify({at:new Date().toISOString(),rows},null,2)+'\n');console.log(JSON.stringify(rows,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
