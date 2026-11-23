const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.GREEN_QA_BASE_URL || 'http://127.0.0.1:3130';
const output = 'tmp/royal-yamb-review';
const themes = ['dark','neon','light','medium','winter','easter','desert','moon','severna','amethyst'];
const freeze = () => {
    const scene = qaFx.fx.stageScene;
    cancelAnimationFrame(scene.raf); clearTimeout(scene.timer);
    window.drawRoyalQA = ms => {
        scene.startedAt = 0; scene.lastFrame = -100; scene.frame(ms); cancelAnimationFrame(scene.raf);
    };
};

(async () => {
    fs.mkdirSync(output, {recursive:true});
    const browser = await chromium.launch({channel:'msedge'});
    try {
        for (const [i,theme] of themes.entries()) {
            const [width,height] = [[390,844],[320,480],[1280,800]][i%3];
            const page = await browser.newPage({viewport:{width,height}});
            const errors = [];
            page.on('pageerror', e => errors.push(e.message));
            await page.addInitScript(() => localStorage.setItem('yamb_sound','false'));
            await page.goto(base+'/qa/theme-live-effects-review.html?effect=royal_yamb&sound=1&theme='+theme);
            await page.waitForFunction(() => window.qaFx?.fx.stageScene?.royalLogo);
            await page.evaluate(freeze);
            const result = await page.evaluate(() => {
                const s=qaFx.fx.stageScene, c=s.ctx, draw=c.drawImage.bind(c);
                let excluded, images=[];
                c.drawImage=(img,...args)=>{ images.push(img); if (img!==excluded) draw(img,...args); };
                const pixels=()=>c.getImageData(0,0,s.canvas.width,s.canvas.height).data;
                const signal=(ms,img)=>{
                    excluded=img; drawRoyalQA(ms); const bare=pixels();
                    excluded=null; images=[]; drawRoyalQA(ms); const full=pixels();
                    let count=0;
                    for(let k=0;k<full.length;k+=4) {
                        if(Math.abs(full[k]-bare[k])+Math.abs(full[k+1]-bare[k+1])+Math.abs(full[k+2]-bare[k+2])>36) count++;
                    }
                    return count;
                };
                const seal=signal(1050,s.images.seal);
                const earlyTitle=images.includes(s.royalLogo);
                const title=signal(3620,s.royalLogo);
                const lateSeal=images.includes(s.images.seal);
                const glint=signal(3620,s.royalShine), light=signal(3620,s.royalBeam);
                const beams=images.filter(im=>im===s.royalBeam).length;
                const poses=[s.images.coin,s.images.coinLeft,s.images.coinRight].filter(im=>images.includes(im)).length;
                c.drawImage=draw;
                return {seal,title,glint,light,earlyTitle,lateSeal,beams,poses,
                    original:s.images.seal.src.endsWith('/Logo_green.png'), themeLogo:s.royalLogo.src,
                    maskWidth:s.royalShine.width, logoWidth:s.royalLogo.naturalWidth};
            });
            assert(result.original && result.themeLogo.endsWith('/'+theme+'.webp') && !result.earlyTitle && !result.lateSeal);
            assert(result.seal>1500 && result.title>2500 && result.glint>80 && result.light>400, JSON.stringify(result));
            assert(result.maskWidth<result.logoWidth/3 && result.beams===4);
            assert.equal(result.poses,3);
            if (i<3) await page.screenshot({path:output+'/'+theme+'-crest.png'});
            if (theme==='dark') {
                await page.evaluate(()=>drawRoyalQA(1050));
                await page.screenshot({path:output+'/dark-seal.png'});
                const audio=await page.evaluate(async()=>{
                    async function render(cut,muted) {
                        const sm=app.soundMgr, rate=24000;
                        const ctx=sm.ctx=new OfflineAudioContext(1,rate*5,rate);
                        sm.enabled=!muted;
                        const stop=sm.royalFanfare(2.5);
                        const stopped=cut && ctx.suspend(.6).then(()=>{stop();stop();return ctx.resume();});
                        const pcm=(await ctx.startRendering()).getChannelData(0);
                        if(stopped) await stopped;
                        const peak=(a,b)=>pcm.subarray(a*rate,b*rate).reduce((m,v)=>Math.max(m,Math.abs(v)),0);
                        return [peak(.08,.18),peak(2.33,2.49),peak(2.55,2.75),peak(4.1,5)];
                    }
                    return [await render(false,false),await render(true,false),await render(false,true)];
                });
                assert(audio[0][0]>.01 && audio[0][1]===0 && audio[0][2]>.04 && audio[0][3]===0);
                assert(audio[1][2]===0 && audio[2].every(v=>v===0));
            }
            await page.evaluate(()=>drawRoyalQA(8000));
            assert.equal(await page.locator('.live-stage-effect').count(),0);
            if (i<3) {
                await page.emulateMedia({reducedMotion:'reduce'});
                await page.locator('[data-effect=play]').click();
                await page.waitForFunction(()=>qaFx.fx.stageScene?.royalLayout && qaFx.fx.stageScene.reduced);
                await page.evaluate(freeze);
                assert(await page.evaluate(()=>{
                    const s=qaFx.fx.stageScene;
                    const pixels=()=>s.ctx.getImageData(0,0,s.canvas.width,s.canvas.height).data;
                    drawRoyalQA(750); const a=pixels();
                    drawRoyalQA(1400); const b=pixels();
                    return a.every((v,i)=>Math.abs(v-b[i])<=2);
                }));
                await page.locator('[data-effect=stop]').click();
                assert.equal(await page.locator('.live-stage-effect').count(),0);
            }
            assert.deepEqual(errors,[]);
            console.log(theme,width+'x'+height,'seal, wordmark, highlights, four beams, three ducat poses and exit passed');
            await page.close();
        }
    } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
