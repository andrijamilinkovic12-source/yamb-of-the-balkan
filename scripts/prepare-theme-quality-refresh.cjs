const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p)));
const report=read('docs/theme-visual-audit/report.json'),defs=read('docs/theme-definitions.json');
const dest=path.join(root,'source-assets/theme-quality-refresh-v2');fs.mkdirSync(dest,{recursive:true});
const file=path.join(dest,'manifest.json');
const existing=fs.existsSync(file)?read('source-assets/theme-quality-refresh-v2/manifest.json'):{schemaVersion:1,createdOn:'2026-10-24',tool:'built-in image_gen',assets:[],redirects:[]};
const plan=[];
for(const a of report.assets.filter(a=>a.activation.startsWith('active-')&&a.visualStatus!=='prihvatljiv')){
 const theme=defs.themes.find(t=>t.id===a.theme);if(!theme)continue;
 const base=`www/assets/${a.theme==='dark'?'green-soft-clay':`theme-packs/${a.theme}`}`;
 if(/\/(?:daily|treasury)\/reward-video-v3\.png$|\/solo\/finish-reward-video-v3\.png$/.test(a.file)){
  if(!existing.redirects.some(r=>r.from===a.file))existing.redirects.push({theme:a.theme,from:a.file,to:`${base}/canonical/rewarded-video/rewarded-video-active-inline-v${['easter','desert','severna'].includes(a.theme)?2:1}.png`,reason:'Use existing canonical video action instead of a duplicate composed icon.'});
  continue;
 }
 // The audit accidentally attached the ornate-state finding to the clean menu icon.
 const target=a.theme==='easter'&&a.file.includes('/online-players-room-identity/online-players-room-menu-')
  ? `www/assets/theme-packs/easter/canonical/online-players-internal/state-v1.png`:a.file;
 const role=path.posix.basename(target).replace(/-v\d+\.png$/,'');
 const references=[target];let request='';
 if(target.includes('/competition-medals/')){
  const family=role.startsWith('fire-streak')?'fire-streak':'power-index';
  references.push(`${base}/canonical/statistics-overview/${family}-v${family==='fire-streak'&&a.theme!=='dark'?2:1}.png`);
  request=`Replace ONLY the emblem inside the medal with a faithful miniature embossed copy of the canonical ${family==='fire-streak'?'FLAME':'POWER INDEX'} icon in Image 2. It must clearly retain that reference silhouette and recognizable color details. Remove the old ${family==='fire-streak'?'firecracker/dynamite':'bar graph'} completely. Preserve the medal's original ${role.split('-').at(-1)} metal rim, themed center, ribbon, camera and composition. Do not put a different generic flame or bolt in its place.`;
 }else if(target.includes('/solo-record-icons/')){
  request=`Simplify this ${role} RECORD icon: remove ALL foliage, fruit, houses, architectural portals, repeated ornamental rims and extra plinths. Keep a carefully sculpted, readable 3D Soft icon with a controlled number of details. Meaning must be obvious: ${role==='all_time'?'one bold infinity loop, no pedestal':role==='personal'?'one human bust beside a single short rising graph in a compact simple rounded plaque':role==='monthly'?'a monthly calendar with two simple binder tabs and a regular 3-by-4 grid of twelve square date recesses':'a weekly calendar with two simple binder tabs and exactly seven simple date recesses in a single horizontal row'}. Preserve original themed material, distinctive silhouette proportions, palette and light. No inscriptions or numerals.`;
 }else if(target.includes('finish-score-mark')){
  request='Replace the ambiguous minus sign with a compact sculptural four-point score spark. Use one clearly readable four-point star with substantial soft 3D volume, a restrained small themed backing form if needed for contrast, and no text, numbers, plants, pedestal, border ornaments or extra sparkles. Make it a tasteful score symbol in the same material and palette, not an ornate award.';
 }else if(target.includes('/achievement-trophies/')){
  request=role==='veteran'?'Remove ONLY the laurel/leaf branches inside the medal. Preserve its central terracotta star, ivory medal, green ribbon and tactile matte clay material. No replacement ornament.':`Remove the laurel wreath completely. ${a.theme==='dark'?'Keep the sculptural ivory lightning bolt and a single small rounded forest-green support beneath it; no surrounding ring or branches.':'Keep the die as the unmistakable hero on one compact simple themed support; no wreath, crown, floral shapes or extra ornaments. If three die faces are visible they must be TOP 1, LEFT 2, RIGHT 3, with the three pips diagonal and two pips on opposite diagonal corners; never duplicate visible face values.'} Make the volume and silhouette deliberate and refined, not flat or unfinished.`;
 }else if(target.includes('/online-players-internal/')){
  request=`Replace the elaborate framed group with ${a.theme==='dark'?'two':'three'} clean faceless sculpted player pawns in the theme's material. No hair, eyes, faces, clothing detail or architectural portal. Use a single low-profile rounded backing/support only if needed, with the current palette. Keep clear separation of the people at small size, consistent with the other player icons of this theme.`;
 }else if(target.includes('/leaderboard-controls/')){
  request='Remove ONLY the decorative leaf/laurel branches. Keep the central globe or hourglass and the three-rank podium. Preserve all useful silhouettes, themed material, light and palette. A clean carefully shaped podium symbol, without extra scenery or ornaments.';
 }else if(target.includes('/quarterly-navigation/')){
  request=role==='tab-champions'?'Remove ONLY the decorative leaf branches from the league cup. Preserve the four-part quarterly symbol and all essential cup parts, its material, palette and silhouette. No new ornaments.':'Simplify the Hall of Fame portal by removing its ornate crown and curling ornaments. Preserve one clean compact doorway with a single restrained themed star, dimensional depth and readable shape. No leaves, extra gems or architectural detail.';
 }else if(target.includes('/tournament-navigation/')){
  request='Preserve the star and three-rank podium exactly, but improve the star silhouette contrast on an ivory/cream background with a restrained sage-green beveled edge and a soft contact shadow. No extra decoration. Keep the same size and proportions.';
 }else if(target.includes('/treasury-effect-thumbnails/')){
  if(role.includes('gold-rain')){
   references.push(`${base}/canonical/ducat/ducat-front-v${['easter','desert','severna'].includes(a.theme)?2:1}.png`);
   request='Replace the decorated display with FOUR separate falling coins at staggered heights, gently angled. Every coin must faithfully reproduce the exact canonical five-pip coin in Image 2, with its same rim, material, colors and rounded-square or circular pips. No leaves, moons, pedestal, ribbon trails, light beams or extra stars. Keep ample breathing space and a readable small preview.';
  }else if(role.includes('confetti'))request=`Show a loose burst of six to eight clean thick paper confetti pieces and two short curled ribbons in this theme's palette and material language. No central flower, foliage, laurel, pot, backing, scenery or tiny decorative stars. ${a.theme==='neon'?'Increase the visible cyan and restrained magenta edge area so the pieces remain clear on the dark navy card.':'Preserve the clay thickness and refined rounded edges with soft shadows.'}`;
  else if(role.includes('fireworks'))request='Replace the flower/palm/potted-bouquet-like composition with two clearly radial FIREWORK BURSTS at different heights. Each burst has thin tapered softly glowing streaks radiating from a compact center, separated short luminous particles and restrained soft 3D volume in this theme palette. No stems, leaves, palm fronds, round flower heads, pots, base, pedestal, buildings or extra decorations. The direction must feel explosive, not botanical. Readable at 64px.';
  else request='Replace the ornamental sculpture with COSMIC DUST: a loose, airy diagonal drift of small softly luminous rounded particles at several depths, with a subtle translucent mist connecting only part of the flow. Keep plenty of negative space. Soft 3D material and the existing theme palette, varied particle sizes. No leaf-like curls, cabbage folds, spiral ribbons, large planets, rings, stars, flowers, fixed pedestal or hard sculpture. An elegant thumbnail of floating space dust, not a decorative object.';
 }
 if(!request)throw Error('No request for '+target);
 const prompt=`Use case: precise-object-edit. Asset: ${theme.nameSr} / ${role}. Image 1 is the EDIT TARGET. ${references.length>1?'Image 2 is the CANONICAL IDENTITY REFERENCE, which must be reproduced faithfully.':''} Request: ${request} Style: 3D Soft Neomorphism; direction ${theme.direction==='clay'?'matte tactile CLAY':'SMOOTH RUBBER / MATTE PLASTIC'}. Preserve the theme DNA and exact color family already present in Image 1. Retain the current camera angle, optical footprint and generous transparent margins. Clear volume, soft consistent lighting, clean high-quality alpha edges. Balanced detail: neither kitsch nor a flat simplistic pictogram. No laurel wreaths, leaves added as ornaments, cabbage-like folds, random gems or text. Genuine transparent background; no baked white square, checkerboard, floor or scene. Output one standalone PNG asset, not a sheet.`;
 const productionPath=target.replace(/-v\d+\.png$/,'-quality-v2.png');
 const job={id:a.id,theme:a.theme,role,previous:target,productionPath,master:`source-assets/theme-quality-refresh-v2/${a.theme}/${role}-master.png`,references,prompt,reason:a.reason,status:'pending'};
 const done=existing.assets.find(x=>x.previous===target);plan.push(done?{...job,...done}:job);
}
existing.assets=plan;fs.writeFileSync(file,JSON.stringify(existing,null,2)+'\n');
fs.writeFileSync(path.join(dest,'prompts.md'),'# PNG quality refresh v2\n\nBuilt-in image_gen, one edit per PNG.\n\n'+plan.map(a=>`## ${a.theme} / ${a.role}\n\n${a.prompt}\n`).join('\n'));
console.log(JSON.stringify({pngEdits:plan.length,redirects:existing.redirects.length,byTheme:Object.fromEntries(defs.themes.map(t=>[t.id,plan.filter(a=>a.theme===t.id).length]))}));
