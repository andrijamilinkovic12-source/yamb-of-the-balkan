const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.GREEN_QA_BASE_URL || 'http://127.0.0.1:3130';
const output = 'tmp/neon-pulse-review';

(async () => {
    fs.mkdirSync(output, { recursive: true });
    const browser = await chromium.launch({ channel: 'msedge' });
    let darkHash;
    try {
        for (const [theme, width, height] of [['dark',390,844], ['light',390,844], ['neon',320,480], ['moon',1280,800]]) {
            const page = await browser.newPage({ viewport: {width,height} });
            const errors = [];
            page.on('pageerror', e => errors.push(e.message));
            await page.goto(base + '/qa/theme-live-effects-review.html?theme=' + theme + '&effect=neon_pulse');
            if (theme === 'light') await page.addStyleTag({ content:
                '.qa-board {background:#f5eee3} .qa-board-grid span {background:#fffaf2;color:#362e25}' });
            await page.waitForFunction(() => window.qaFx?.fx.stageScene?.neonFrame);
            const result = await page.evaluate(() => {
                const scene = qaFx.fx.stageScene, ctx = scene.ctx;
                cancelAnimationFrame(scene.raf); clearTimeout(scene.timer);
                const {x,y,width,height} = scene.neonFrame;
                const draw = ms => {
                    scene.lastFrame = -100; scene.startedAt = 0; scene.frame(ms); cancelAnimationFrame(scene.raf);
                    return ctx.getImageData(0,0,scene.canvas.width,scene.canvas.height).data;
                };
                const bounds = scene.canvas.width, scale = ctx.getTransform().a;
                function pixel(data, px, py) {
                    const i = 4 * (Math.floor(py * scale) * bounds + Math.floor(px * scale));
                    return Array.from(data.subarray(i,i+4));
                }
                const board = document.querySelector('.qa-board-grid');
                const before = board.innerHTML;
                const at = t => {
                    const data = draw(t);
                    let strongest = 0, scanY = -1;
                    for (let dy=8; dy<height-8; dy++) {
                        const a = pixel(data, x+width/2, y+dy)[3];
                        if (a > strongest) { strongest = a; scanY = dy; }
                    }
                    return { scanY, strongest, outside:pixel(data,2,2)[3] };
                };
                const scans = [1100,1750,3000,3650].map(at);
                const display = draw(1400);
                let hash = 2166136261;
                for (const value of display) hash = Math.imul(hash ^ value,16777619);
                return { scans, hash, unchanged:before === board.innerHTML };
            });
            assert(result.unchanged && result.scans.every(s => s.strongest > 100 && s.outside === 0));
            assert(result.scans[0].scanY < result.scans[1].scanY && result.scans[2].scanY > result.scans[3].scanY);
            if (theme === 'dark') darkHash = result.hash;
            if (theme === 'light') assert.equal(result.hash,darkHash,'Identical effect on light and dark boards');
            await page.screenshot({path: output + '/' + theme + '.png'});
            await page.emulateMedia({reducedMotion:'reduce'});
            await page.locator('[data-effect=play]').click();
            await page.waitForFunction(() => qaFx.fx.stageScene?.reduced && qaFx.fx.stageScene?.neonFrame);
            const still = await page.evaluate(() => {
                const s = qaFx.fx.stageScene;
                cancelAnimationFrame(s.raf);
                const draw = ms => {
                    s.lastFrame = -100; s.startedAt = 0; s.frame(ms); cancelAnimationFrame(s.raf);
                    return s.ctx.getImageData(0,0,s.canvas.width,s.canvas.height).data;
                };
                const a = draw(700), b = draw(1400);
                const changed = a.reduce((sum,v,i) => sum + (Math.abs(v-b[i]) > 2 ? 1 : 0),0);
                const visible = b.some((v,i) => i % 4 === 3 && v > 180);
                s.frame(s.duration);
                return {changed, visible, stopped:!document.querySelector('.live-stage-effect')};
            });
            assert(still.changed === 0 && still.visible && still.stopped, JSON.stringify(still));
            assert.deepEqual(errors,[]);
            await page.close();
            console.log(theme, width+'x'+height, 'same palette, two scan directions, static reduced rail and cleanup');
        }
    } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
