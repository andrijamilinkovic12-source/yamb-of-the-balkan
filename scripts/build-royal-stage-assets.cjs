// Trim the existing wordmarks at build time. The animation never reads pixels from the phone's canvas.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.env.YAMB_SHARP_PATH || 'sharp');
const www = path.resolve(__dirname, '../www');
const out = path.join(www, 'assets/effects/royal-stage-v2');

(async () => {
    fs.mkdirSync(out, { recursive: true });
    for (const theme of ['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna']) {
        const root = theme === 'dark' ? 'green-soft-clay' : 'theme-packs/' + theme;
        const version = theme === 'dark' ? 2 : 1;
        const source = path.join(www,'assets',root,'splash-title-soft-clay-v' + version + '.png');
        const {data, info} = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject:true });
        let left = info.width, top = info.height, right = -1, bottom = -1;
        for (let y=0; y<info.height; y++) for (let x=0; x<info.width; x++) {
            if (data[(y*info.width+x)*4+3] < 12) continue;
            left = Math.min(x,left); right = Math.max(x,right); top = Math.min(y,top); bottom = Math.max(y,bottom);
        }
        await sharp(source).extract({left,top,width:right-left+1,height:bottom-top+1})
            .resize({width:960,withoutEnlargement:true}).webp({quality:90,alphaQuality:100}).toFile(path.join(out,theme+'.webp'));
    }
    const w=128, h=480, pixels=Buffer.alloc(w*h*4,255);
    for (let y=0; y<h; y++) for (let x=0; x<w; x++) {
        const v=y/(h-1), across=(x-(w-1)/2)/(w*(.47*(1-v)+.026));
        const falloff=Math.min(1,v/.32);
        const shaft=.47*Math.exp(-across*across*3.6)+.29*Math.exp(-across*across*22);
        pixels[(y*w+x)*4+3]=Math.round(255*shaft*falloff*falloff*(3-2*falloff)*(.72+.28*v));
    }
    await sharp(pixels,{raw:{width:w,height:h,channels:4}}).png().toFile(path.join(out,'spotlight.png'));
})().catch(error=>{console.error(error);process.exitCode=1;});
