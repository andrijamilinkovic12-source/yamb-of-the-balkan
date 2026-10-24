const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require(process.env.YAMB_SHARP_PATH||'sharp');
const {sheet,root}=require('./build-theme-visual-audit.cjs');
const manifestFile=path.join(root,'source-assets/theme-quality-refresh-v2/manifest.json');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const m=JSON.parse(fs.readFileSync(manifestFile));
 const changedThemes=new Set();
 for(const a of m.assets.filter(a=>a.status!=='pending')){
  const masterBytes=fs.readFileSync(path.join(root,a.master));
  if(a.sha256&&a.masterSha256===hash(masterBytes)&&fs.existsSync(path.join(root,a.productionPath))
    &&hash(fs.readFileSync(path.join(root,a.productionPath)))===a.sha256)continue;
  const old=fs.readFileSync(path.join(root,a.previous));
  const width=old.readUInt32BE(16),height=old.readUInt32BE(20);
  const bounds=await sharp(old).trim({threshold:4}).toBuffer({resolveWithObject:true});
  const x=Math.max(0,-(bounds.info.trimOffsetLeft||0)),y=Math.max(0,-(bounds.info.trimOffsetTop||0));
  const art=await sharp(path.join(root,a.master)).trim({threshold:4}).resize(bounds.info.width,bounds.info.height,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  const png=await sharp({create:{width,height,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:art,left:x,top:y}]).png({compressionLevel:9}).toBuffer();
  fs.writeFileSync(path.join(root,a.productionPath),png);
  a.sha256=hash(png);a.masterSha256=hash(masterBytes);a.previousSha256=hash(old);a.width=width;a.height=height;a.bytes=png.length;
  a.opticalBox=[x,y,bounds.info.width,bounds.info.height];
  changedThemes.add(a.theme);
 }
 for(const a of m.redirects){if(!fs.existsSync(path.join(root,a.to)))throw Error('Missing canonical redirect '+a.to);a.sha256=hash(fs.readFileSync(path.join(root,a.to)));}
 // Generation can finish while images are being packaged. Merge only computed metadata,
 // preserving fresh generation/approval states from the serialized manifest store.
 require('./quality-refresh-store.cjs').update(latest=>{
  for(const built of m.assets.filter(a=>a.sha256)){
   const current=latest.assets.find(a=>a.previous===built.previous);
   if(!current||hash(fs.readFileSync(path.join(root,current.master)))!==built.masterSha256)continue;
   for(const key of ['sha256','masterSha256','previousSha256','width','height','bytes','opticalBox'])current[key]=built[key];
  }
  for(const a of m.redirects){const current=latest.redirects.find(r=>r.from===a.from);if(current)current.sha256=a.sha256;}
 });
 const fresh=JSON.parse(fs.readFileSync(manifestFile));
 m.assets=fresh.assets;m.redirects=fresh.redirects;
 const promptLog=['# PNG quality refresh v2','Built-in image_gen; each PNG is generated separately. Production activation requires manual review.'];
 for(const a of m.assets){
  promptLog.push(`## ${a.theme} / ${a.role}`,`Status: ${a.status}\n\nMaster: \`${a.master}\`\n\nProduction: \`${a.productionPath}\``,
   `References:\n${a.references.map(ref=>'- `'+ref+'`').join('\n')}`,a.prompt);
  if(a.contrastRevisionPrompt)promptLog.push('### Contrast refinement',a.contrastRevisionPrompt);
  for(const [index,revision] of (a.refinements||[]).entries())promptLog.push(`### Refinement ${index+1}`,
   `References:\n${revision.references.map(ref=>'- `'+ref+'`').join('\n')}`,revision.prompt);
  if(a.review)promptLog.push('### Review',a.review);
 }
 fs.writeFileSync(path.join(root,'source-assets/theme-quality-refresh-v2/prompts.md'),promptLog.join('\n\n')+'\n');
 const map=Object.fromEntries([...m.redirects.map(a=>[a.from.replace(/^www\//,''),a.to.replace(/^www\//,'')]),
  ...m.assets.filter(a=>a.status==='verified').map(a=>[a.previous.replace(/^www\//,''),a.productionPath.replace(/^www\//,'')])]);
 const module=`// Generated from source-assets/theme-quality-refresh-v2/manifest.json.\n// Pure path lookup: no DOM observer, theme guessing, additional fetch or delayed image swap.\n(function(root){\n'use strict';\nconst replacements=Object.freeze(${JSON.stringify(map,null,2)});\nfunction resolve(source){\n if(typeof source!=='string'||!source)return source;\n const [file,query='']=source.split('?'),prefix=file.startsWith('www/')?'www/':'';\n const key=prefix?file.slice(4):file;\n if(!replacements[key])return source;\n const kept=query.split('&').filter(part=>part&&!/^(?:v|card)=/i.test(part)).join('&');\n return prefix+replacements[key]+(kept?'?'+kept:'');\n}\nif(typeof module==='object'&&module.exports)module.exports={resolve,replacements};\nelse{root.resolveThemeQualityAsset=resolve;globalThis.resolveThemeQualityAsset=resolve;root.THEME_QUALITY_ASSET_MAP=replacements;}\n})(typeof window==='object'?window:globalThis);\n`;
 fs.writeFileSync(path.join(root,'www/theme-quality-assets.js'),module);
 const revision='q2-'+hash(Buffer.from(module)).slice(0,12);
 for(const document of ['www/index.html','docs/theme-statistics-app-frame.html','docs/theme-solo-finish-screen-mobile.html']){
  const file=path.join(root,document),html=fs.readFileSync(file,'utf8');
  fs.writeFileSync(file,html.replace(/theme-quality-assets\.js\?v=[^"']+/g,'theme-quality-assets.js?v='+revision));
 }
 const packaged=m.assets.filter(a=>a.sha256&&fs.existsSync(path.join(root,a.productionPath)));
 for(const theme of [...new Set(packaged.map(a=>a.theme))]){
  const rows=packaged.filter(a=>a.theme===theme);
  if(!changedThemes.has(theme)&&fs.existsSync(path.join(root,`docs/theme-visual-audit/quality-${theme}-v2.png`)))continue;
  await sheet(`quality-${theme}-v2.png`,rows.map(a=>({file:a.productionPath,theme,label:a.role,id:a.id+' new'})),4,210,205);
 }
 console.log(JSON.stringify({packaged:m.assets.filter(a=>a.sha256).length,verified:m.assets.filter(a=>a.status==='verified').length,redirects:m.redirects.length,pending:m.assets.filter(a=>a.status==='pending').length}));
})().catch(e=>{console.error(e);process.exitCode=1;});
