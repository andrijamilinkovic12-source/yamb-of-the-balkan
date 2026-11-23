const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.GREEN_QA_BASE_URL || 'http://127.0.0.1:3130';
const output = 'tmp/fireworks-blooms-preview';

(async () => {
    fs.mkdirSync(output, { recursive: true });
    const browser = await chromium.launch({ channel: 'msedge' });
    try {
        for (const [theme, width, height] of [['dark', 390, 844], ['light', 1280, 800], ['neon', 320, 480]]) {
            const page = await browser.newPage({ viewport: { width, height } }), errors = [];
            page.on('pageerror', e => errors.push(e.message));
            await page.addInitScript(() => localStorage.setItem('yamb_sound', 'false'));
            await page.goto(base + '/qa/theme-live-effects-review.html?effect=fireworks&sound=1&theme=' + theme);
            await page.waitForFunction(() => window.qaFx?.fx.stageScene?.fireworkAtlas);
            const frames = await page.evaluate(() => {
                const s = qaFx.fx.stageScene, ctx = s.ctx;
                cancelAnimationFrame(s.raf); clearTimeout(s.timer);
                const draw = time => {
                    s.lastFrame = -100; s.startedAt = 0; s.frame(time); cancelAnimationFrame(s.raf);
                    return ctx.getImageData(0, 0, s.canvas.width, s.canvas.height).data;
                };
                const a = draw(4750), b = draw(5010);
                const regions = s.fireworkShells.slice(-3).map(({x, y, radius}) => {
                    let bright = 0, moving = 0;
                    const {a: sx, d: sy} = ctx.getTransform();
                    for (let j = Math.floor((y - radius * 0.22) * sy); j < (y + radius * 0.56) * sy; j++) {
                        for (let i = Math.floor((x - radius * 0.55) * sx); i < (x + radius * 0.55) * sx; i++) {
                            const k = 4 * (j * s.canvas.width + i);
                            if (Math.max(b[k], b[k + 1], b[k + 2]) > 100) bright++;
                            if (Math.abs(a[k] - b[k]) + Math.abs(a[k + 1] - b[k + 1]) > 40) moving++;
                        }
                    }
                    return [bright, moving];
                });
                return { size: [s.images.blooms.naturalWidth, s.images.blooms.naturalHeight], regions };
            });
            assert.deepEqual(frames.size, [1280, 640]);
            assert(frames.regions.every(([bright, moving]) => bright > 120 && moving > 100));
            await page.screenshot({ path: output + '/' + theme + '-finale.png' });
            await page.locator('[data-effect="stop"]').click();
            assert.equal(await page.locator('.live-stage-effect').count(), 0);
            if (theme === 'dark') {
                const result = await page.evaluate(async () => {
                    const render = async (mute, cut) => {
                        const sound = app.soundMgr, rate = 32000;
                        const ctx = sound.ctx = new OfflineAudioContext(1, rate * 2, rate);
                        sound.enabled = !mute;
                        const stop = sound.fireworkExplode('willow', 2, 0.78, [0.32, 0.57, 0.84], 0.02);
                        const task = cut && ctx.suspend(0.18).then(() => { stop(); stop(); return ctx.resume(); });
                        const data = (await ctx.startRendering()).getChannelData(0);
                        if (task) await task;
                        const peak = (start, end) => data.subarray(start * rate, end * rate).reduce((v, n) => Math.max(v, Math.abs(n)), 0);
                        return [peak(0, 0.1), peak(0.30, 0.32), peak(0.55, 0.57), peak(0.82, 0.84), peak(1.35, 2)];
                    };
                    return [await render(false, false), await render(false, true), await render(true, false)];
                });
                assert(result[0].slice(0, 4).every(p => p > 0.012 && p < 1));
                assert.equal(result[0][4], 0); assert(result[1].slice(1).every(p => p === 0));
                assert(result[2].every(p => p === 0));
            }
            assert.deepEqual(errors, []); await page.close();
        }
        console.log('Browser passed: mobile/desktop moving PNG crowns, triple finale, matched crackles, silence after stop and mute.');
    } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
