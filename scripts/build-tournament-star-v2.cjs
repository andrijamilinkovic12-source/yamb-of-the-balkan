const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require(process.env.YAMB_SHARP_PATH||'sharp');
const {sheet,root}=require('./build-theme-visual-audit.cjs');
const file=path.join(root,'source-assets/theme-tournament-star-v2/manifest.json');
const manifest=JSON.parse(fs.readFileSync(file,'utf8'));
const hash=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
(async()=>{
 const previews=[];
 for(const asset of manifest.assets){
  const destinations=asset.role==='champion-trophy'
   ? ['champion-trophy','champion-trophy-room'].map(name=>`www/assets/theme-packs/${asset.theme}/canonical/tournament-awards/${name}-v2.png`)
   : [`www/assets/theme-packs/${asset.theme}/canonical/${asset.role==='finalist-silver'?'tournament-awards':'competition-medals'}/${asset.role}-v2.png`];
  asset.production=[];
  for(const productionPath of destinations){
   const previous=productionPath.replace('-v2.png','-v1.png');
   const original=fs.readFileSync(path.join(root,previous));
   const width=original.readUInt32BE(16),height=original.readUInt32BE(20);
   const old=await sharp(original).trim({threshold:4}).toBuffer({resolveWithObject:true});
   const insetX=Math.max(0,-(old.info.trimOffsetLeft||0)),insetY=Math.max(0,-(old.info.trimOffsetTop||0));
   const component=await sharp(path.join(root,asset.master)).trim({threshold:4})
     .resize(old.info.width,old.info.height,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
   const png=await sharp({create:{width,height,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
     .composite([{input:component,left:insetX,top:insetY}]).png({compressionLevel:9}).toBuffer();
   fs.writeFileSync(path.join(root,productionPath),png);
   asset.production.push({productionPath,supersedes:previous,width,height,sha256:hash(png),bytes:png.length,opticalBox:[insetX,insetY,old.info.width,old.info.height]});
  }
  asset.masterSha256=hash(fs.readFileSync(path.join(root,asset.master)));
  previews.push({file:asset.production[0].productionPath,theme:asset.theme,label:asset.role,id:'five-point star'});
 }
 fs.writeFileSync(file,JSON.stringify(manifest,null,2)+'\n');
 fs.writeFileSync(path.join(path.dirname(file),'prompts.md'),'# Tournament star correction v2\n\nBuilt-in image_gen edits. Runtime dimensions and optical bounds follow each preceding file.\n\n'+manifest.assets.map(a=>`## ${a.theme} / ${a.role}\n\n${a.prompt}\n`).join('\n'));
 await sheet('star-corrections-v2.png',previews,7,180,202);
 console.log('Packaged',manifest.assets.length,'star corrections with unchanged canvas dimensions.');
})().catch(e=>{console.error(e);process.exitCode=1;});
