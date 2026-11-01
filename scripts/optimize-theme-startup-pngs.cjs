// Re-encode only the profiled startup/Settings PNGs, never masters or artwork.
// Default is a dry run. --apply requires exact pixel and metadata equality and
// backs up each original under tmp before replacing a smaller encoded file.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require(process.env.YAMB_SHARP_PATH||'C:/Users/andri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),www=path.join(root,'www');
const out=path.join(root,'tmp/theme-lossless-2026-11-01');
const apply=process.argv.includes('--apply')||process.argv.includes('--apply-prepared');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const metadata=m=>Object.fromEntries(['width','height','space','depth','bitsPerSample','hasAlpha','density','orientation','icc','exif','xmp'].map(key=>[key,Buffer.isBuffer(m[key])?hash(m[key]):m[key]??null]));
function commitRows(rows){
 for(const row of rows)if(hash(fs.readFileSync(path.join(www,row.source)))!==row.beforeSha256)throw Error('Asset changed during preparation:'+row.source);
 for(const row of rows.filter(row=>row.changed)){
  const file=path.join(www,row.source),backup=path.join(out,'originals',row.source);
  fs.mkdirSync(path.dirname(backup),{recursive:true});if(!fs.existsSync(backup))fs.copyFileSync(file,backup);
  fs.copyFileSync(path.join(out,'candidates',row.source),file);
 }
}
(async()=>{
 const profile=read('tmp/theme-switch-profile-2026-10-30/packs.json');
 if(profile.rows.length!==10||profile.rows.some(row=>row.assets.length!==28))throw Error('Expected current10theme×28startup/Settings profile');
 const sources=[...new Set(profile.rows.flatMap(row=>row.assets.map(a=>a.resolved.split('?')[0])))];
 if(process.argv.includes('--apply-prepared')){
  const report=JSON.parse(fs.readFileSync(path.join(out,'dry-run.json'),'utf8'));
  if(report.rows.length!==sources.length||report.rows.some(row=>!sources.includes(row.source)||row.source.includes('..')))throw Error('Prepared source list differs from current profile');
  for(const row of report.rows.filter(row=>row.changed)){
   const before=fs.readFileSync(path.join(www,row.source)),candidate=fs.readFileSync(path.join(out,'candidates',row.source));
   if(hash(before)!==row.beforeSha256||hash(candidate)!==row.afterSha256)throw Error('Prepared file hash changed:'+row.source);
   if(!(await sharp(before).ensureAlpha().raw().toBuffer()).equals(await sharp(candidate).ensureAlpha().raw().toBuffer())||JSON.stringify(metadata(await sharp(before).metadata()))!==JSON.stringify(metadata(await sharp(candidate).metadata())))throw Error('Prepared pixels/metadata mismatch:'+row.source);
  }
  commitRows(report.rows);report.applied=true;
  fs.writeFileSync(path.join(out,'applied.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({applied:true,assets:report.assets,changed:report.changed,beforeBytes:report.beforeBytes,afterBytes:report.afterBytes,savedPercent:report.savedPercent}));return;
 }
 const rows=[];fs.mkdirSync(out,{recursive:true});
 for(const source of sources){
  if(!/^assets\/[a-zA-Z0-9_./-]+\.png$/.test(source)||source.includes('..'))throw Error('Unexpected asset path');
  const file=path.resolve(www,source);if(!file.startsWith(www+path.sep))throw Error('Outside www');
  const bytes=fs.readFileSync(file),beforeMetadata=await sharp(bytes).metadata();
  // These runtime PNGs have no embedded profile/EXIF. Avoid keepMetadata(),
  // which can synthesize EXIF/orientation even for an untagged PNG.
  if(beforeMetadata.icc||beforeMetadata.exif||beforeMetadata.xmp||beforeMetadata.orientation)throw Error('Tagged PNG needs separate preservation review:'+source);
  const candidate=await sharp(bytes).png({compressionLevel:9,adaptiveFiltering:true,palette:false}).toBuffer();
  const afterMetadata=await sharp(candidate).metadata();
  const before=await sharp(bytes).ensureAlpha().raw().toBuffer(),after=await sharp(candidate).ensureAlpha().raw().toBuffer();
  if(!before.equals(after)||JSON.stringify(metadata(beforeMetadata))!==JSON.stringify(metadata(afterMetadata)))throw Error('Pixel or metadata mismatch:'+source);
  const smaller=candidate.length<bytes.length*.99;
  const row={source,beforeBytes:bytes.length,afterBytes:smaller?candidate.length:bytes.length,changed:smaller,width:beforeMetadata.width,height:beforeMetadata.height,identicalRgba:true,identicalMetadata:true,rgbaSha256:hash(before),beforeSha256:hash(bytes),afterSha256:smaller?hash(candidate):hash(bytes)};
  rows.push(row);
  if(smaller){const prepared=path.join(out,'candidates',source);fs.mkdirSync(path.dirname(prepared),{recursive:true});fs.writeFileSync(prepared,candidate);}
 }
 // Validate the full set before any app mutation, including stale-file checks.
 if(apply)commitRows(rows);
 const bySource=new Map(rows.map(row=>[row.source,row]));
 const themes=profile.rows.map(theme=>{
  const assets=theme.assets.map(a=>bySource.get(a.resolved.split('?')[0]));
  const beforeBytes=assets.reduce((s,a)=>s+a.beforeBytes,0),afterBytes=assets.reduce((s,a)=>s+a.afterBytes,0);
  return{theme:theme.theme,assets:assets.length,changed:assets.filter(a=>a.changed).length,beforeBytes,afterBytes,savedPercent:Math.round((1-afterBytes/beforeBytes)*10000)/100};
 });
 const beforeBytes=rows.reduce((s,a)=>s+a.beforeBytes,0),afterBytes=rows.reduce((s,a)=>s+a.afterBytes,0);
 const report={date:'2026-11-01',applied:apply,scope:'Current10theme startup/menu plus Settings profile. PNG lossless encoding only; exact RGBA, dimensions, alpha and relevant color/other metadata equal. No resizing, palette quantization, new artwork, paths, ownership, animation or layout changes. Decoded pixel memory unchanged. Existing cached originals remain visually identical; uncached transfer shrinks only after deployment.',assets:rows.length,changed:rows.filter(a=>a.changed).length,beforeBytes,afterBytes,savedPercent:Math.round((1-afterBytes/beforeBytes)*10000)/100,themes,rows};
 fs.writeFileSync(path.join(out,apply?'applied.json':'dry-run.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({applied:apply,assets:report.assets,changed:report.changed,beforeBytes,afterBytes,savedPercent:report.savedPercent,themes},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
