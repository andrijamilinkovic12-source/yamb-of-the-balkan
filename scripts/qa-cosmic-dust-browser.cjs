const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.GREEN_QA_BASE_URL || 'http://127.0.0.1:3130';
const output = 'tmp/cosmic-dust-review';

(async () => {
    fs.mkdirSync(output, { recursive:true });
    const browser = await chromium.launch({ channel:'msedge' });
    try {
        for (const [theme,width,height] of [['dark',390,844],['neon',320,480],['light',1280,800]]) {
            const page = await browser.newPage({ viewport:{width,height} });
            const errors = [];
            page.on('pageerror', e => errors.push(e.message));
            await page.goto(base+'/qa/theme-live-effects-review.html?theme='+theme+'&effect=cosmic_dust');
            await page.waitForFunction(() => window.qaFx?.fx.stageScene?.dustParticles);
            const result = await page.evaluate(() => {
                const s = qaFx.fx.stageScene, all = s.dustParticles;
                const board = document.querySelector('.qa-board-grid'), before = board.innerHTML;
                clearTimeout(s.timer); cancelAnimationFrame(s.raf);
                const draw = ms => {
                    s.startedAt=0; s.lastFrame=-100; s.frame(ms); cancelAnimationFrame(s.raf);
                    return s.ctx.getImageData(0,0,s.canvas.width,s.canvas.height).data;
                };
                const dimOnly = ms => {
                    const rgba = draw(ms);
                    for (let i=4;i<rgba.length;i+=4) if (rgba[i+3] !== rgba[3]) return false;
                    return rgba[3] > 0 && rgba[3] < 60;
                };
                const entrance = dimOnly(60), exit = dimOnly(5900);
                const delta = (a,b) => {
                    let different=0;
                    for (let i=0;i<a.length;i+=4)
                        if (Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]) > 18) different++;
                    return different;
                };
                const shapes = [4,5,6].map(shape => {
                    s.dustParticles = all.filter(p => p.shape !== shape); const bare = draw(2350);
                    s.dustParticles = all; return delta(bare,draw(2350));
                });
                const motion = delta(draw(1900),draw(2350));
                return { entrance,exit,shapes,motion,unchanged:before===board.innerHTML,
                    png:[s.images.flecks.naturalWidth,s.images.flecks.naturalHeight] };
            });
            assert(result.entrance && result.exit && result.unchanged, JSON.stringify(result));
            assert.deepEqual(result.png,[192,64]);
            assert(result.shapes.every(v => v>20) && result.motion>500, JSON.stringify(result));
            await page.screenshot({path: output+'/'+theme+'.png'});
            await page.emulateMedia({reducedMotion:'reduce'});
            await page.locator('[data-effect=play]').click();
            await page.waitForFunction(() => qaFx.fx.stageScene?.reduced && qaFx.fx.stageScene?.dustParticles);
            const quiet = await page.evaluate(() => {
                const s = qaFx.fx.stageScene;
                clearTimeout(s.timer); cancelAnimationFrame(s.raf);
                const draw = t => {
                    s.startedAt=0; s.lastFrame=-100; s.frame(t); cancelAnimationFrame(s.raf);
                    return s.ctx.getImageData(0,0,s.canvas.width,s.canvas.height).data;
                };
                const a = draw(750), b = draw(1350);
                const still = a.every((v,i) => Math.abs(v-b[i])<=2);
                s.frame(s.duration);
                return still && s.dustParticles.length===45 && !document.querySelector('.live-stage-effect');
            });
            assert(quiet); assert.deepEqual(errors,[]);
            await page.close();
            console.log(theme,width+'x'+height, 'visible PNG pixels per shape:',result.shapes.join('/'),'; fade, orbits, still mode and cleanup passed');
        }
    } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
