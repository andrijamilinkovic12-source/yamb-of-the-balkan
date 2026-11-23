const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.GREEN_QA_BASE_URL || 'http://127.0.0.1:3130';
const output = 'tmp/drone-digits';

(async () => {
    fs.mkdirSync(output, {recursive:true});
    const browser = await chromium.launch({channel:'msedge'});
    try {
        for (const [theme,width,height] of [['dark',390,844],['neon',320,480],['light',1280,800]]) {
            const page = await browser.newPage({viewport:{width,height}});
            const errors = [];
            page.on('pageerror',e => errors.push(e.message));
            await page.goto(base + '/qa/theme-live-effects-review.html?effect=drones&face=6&theme=' + theme);
            for (let face=1; face<=6; face++) {
                await page.locator('#drone-face').selectOption(String(face));
                await page.waitForFunction(n => window.qaFx?.fx.stageScene?.overlay?.dataset.face === String(n), face);
                const data = await page.evaluate(() => {
                    const s = qaFx.fx.stageScene, c = s.ctx;
                    cancelAnimationFrame(s.raf); clearTimeout(s.timer);
                    function draw(t) {
                        s.lastFrame = -100; s.startedAt = 0; s.frame(t); cancelAnimationFrame(s.raf);
                        return c.getImageData(0,0,s.canvas.width,s.canvas.height).data;
                    }
                    // Compare the held formation with and without its connecting lights.
                    const links = s.droneLinks;
                    s.droneLinks = null; const bare = draw(4400); s.droneLinks = links;
                    const full = draw(4400);
                    let lit = 0;
                    for (let i=0; i<bare.length; i+=4) if (full[i]+full[i+1]+full[i+2] - bare[i]-bare[i+1]-bare[i+2] > 80) lit++;
                    return {lit, size:s.droneTargets[0].size, width:s.images.drone.naturalWidth, count:s.droneTargets.length};
                });
                assert(data.lit>250 && data.size>=72 && data.width===160 && data.count<=6,JSON.stringify(data));
                if (theme==='dark' || face===6) await page.screenshot({path:output+'/'+theme+'-'+face+'.png'});
            }
            await page.emulateMedia({reducedMotion:'reduce'});
            await page.evaluate(() => {
                localStorage.setItem('yamb_active_effect','drones');
                qaFx.fx.celebrateYamb(4);
            });
            await page.waitForFunction(() => qaFx.fx.stageScene?.overlay?.dataset.face === '4');
            const still = await page.evaluate(() => {
                const s=qaFx.fx.stageScene;
                cancelAnimationFrame(s.raf); clearTimeout(s.timer);
                const draw = ms => {
                    s.startedAt=0; s.lastFrame=-100; s.frame(ms); cancelAnimationFrame(s.raf);
                    return s.ctx.getImageData(0,0,s.canvas.width,s.canvas.height).data;
                };
                const a=draw(800), b=draw(1600);
                const same=a.every((v,i)=>Math.abs(v-b[i])<=2);
                s.frame(s.duration);
                return same && s.stopped && !document.querySelector('.live-stage-effect');
            });
            assert(still); assert.deepEqual(errors,[]);
            await page.close();
            console.log(theme, width+'x'+height, 'six visible digit formations; equipped effect, still mode and cleanup passed');
        }
    } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
