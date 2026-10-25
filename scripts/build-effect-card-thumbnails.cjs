const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require(process.env.YAMB_SHARP_PATH||'sharp');
const root=path.resolve(__dirname,'..');
const themes=['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna'];
const out='www/assets/effects/treasury-thumbnails-v1';
const ledger='source-assets/theme-effect-card-thumbnails-v1/manifest.json';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const jobs=[
 ['universal','ice_age','www/assets/effects/stage-v1/frost-corner.png'],
 ['universal','balkan','www/assets/effects/stage-v1/trumpet.png'],
 ['universal','dragon_fire','www/assets/effects/stage-v1/flame.png'],
 ...themes.flatMap(theme=>[
  [theme,'black_hole',`www/assets/effects/black-hole/${theme}-core-v1.png`],
  [theme,'supernova',`www/assets/effects/supernova/${theme}-plasma-v2.png`],
  [theme,'ufo_abduction',`www/assets/effects/stage-v1/ufo-${theme}.png`],
  [theme,'royal_yamb',theme==='dark'?'www/assets/green-soft-clay/splash-title-soft-clay-v2.png':`www/assets/theme-packs/${theme}/splash-title-soft-clay-v1.png`]
 ])
];
(async()=>{
 fs.mkdirSync(path.join(root,out),{recursive:true});fs.mkdirSync(path.dirname(path.join(root,ledger)),{recursive:true});
 const prior=fs.existsSync(path.join(root,ledger))?JSON.parse(fs.readFileSync(path.join(root,ledger))):{assets:[]};
 const assets=[];
 for(const [theme,effectId,source] of jobs){
  const original=fs.readFileSync(path.join(root,source));
  const {data,info}=await sharp(original).ensureAlpha().resize({width:384,height:256,fit:'inside',withoutEnlargement:true}).png({compressionLevel:9}).toBuffer({resolveWithObject:true});
  const productionPath=`${out}/${theme}-${effectId.replaceAll('_','-')}-v1.png`;
  fs.writeFileSync(path.join(root,productionPath),data);
  const old=prior.assets.find(a=>a.productionPath===productionPath&&a.sha256===hash(data));
  assets.push({theme,effectId,source,productionPath,sourceSha256:hash(original),sha256:hash(data),sourceBytes:original.length,bytes:data.length,
   sourceWidth:original.readUInt32BE(16),sourceHeight:original.readUInt32BE(20),width:info.width,height:info.height,
   canonicalVariantOf:source,method:'Proportional downscale of the entire RGBA canvas; no recoloring, crop, repaint or change to the runtime effect.',
   usage:'Riznica / Efekti / card preview only',...(theme==='universal'?{exception:'Existing shared physical ice, trumpet or natural flame; theme-neutral by design.'}:{}),
   status:old?.status||'awaiting-review',...(old?.review?{review:old.review}:{})});
 }
 const manifest={schemaVersion:1,createdOn:'2026-10-25',purpose:'Small canonical derivatives for effect cards; full PNGs remain in the animations.',assets};
 fs.writeFileSync(path.join(root,ledger),JSON.stringify(manifest,null,2)+'\n');
 const {sheet}=require('./build-theme-visual-audit.cjs');
 await sheet('effect-card-derivatives-v1.png',assets.map((a,index)=>({file:a.productionPath,theme:a.theme,label:a.effectId,id:'D'+String(index+1).padStart(4,'0')})),5,210,205);
 console.log(JSON.stringify({files:assets.length,sourceBytes:assets.reduce((s,a)=>s+a.sourceBytes,0),thumbnailBytes:assets.reduce((s,a)=>s+a.bytes,0)}));
})().catch(e=>{console.error(e);process.exitCode=1;});
