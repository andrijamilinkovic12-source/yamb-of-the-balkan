const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.GREEN_QA_BASE_URL || 'http://127.0.0.1:3130';
const output = 'tmp/ice-age-preview';

(async () => {
    fs.mkdirSync(output, { recursive: true });
    const browser = await chromium.launch({ channel: 'msedge' });
    try {
        for (const [theme, width, height] of [['dark', 390, 844], ['light', 1280, 800], ['winter', 320, 480]]) {
            const page = await browser.newPage({ viewport: { width, height } });
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.addInitScript(() => localStorage.setItem('yamb_sound', 'false'));
            await page.goto(base + '/qa/theme-live-effects-review.html?effect=ice_age&sound=1&theme=' + theme);
            await page.waitForFunction(() => window.qaFx?.fx.stageScene?.iceReveal);
            const check = await page.evaluate(() => {
                const s = qaFx.fx.stageScene, c = s.ctx;
                cancelAnimationFrame(s.raf); clearTimeout(s.timer);
                s.alpha = 1;
                const scale = c.getTransform();
                const alpha = (x, y) => c.getImageData(Math.floor(x * scale.a), Math.floor(y * scale.d), 1, 1).data[3];
                const measure = progress => {
                    c.clearRect(0, 0, s.width, s.height); s.iceControlFrost(progress);
                    return s.iceControls.map(({node}) => {
                        const {left, right, top, width, height} = node.getBoundingClientRect(), y = top + height / 2;
                        return [alpha(left + width / 2, y), alpha(right + 2, y), alpha(left, top)];
                    });
                };
                const start = measure(0), midway = measure(0.67), full = measure(1);
                const first = s.iceControls[0].node;
                first.style.visibility = 'hidden'; s.resize();
                const hiddenCount = s.iceControls.length;
                first.style.visibility = ''; s.resize();
                s.startedAt = 0; s.lastFrame = -100; s.frame(3130); cancelAnimationFrame(s.raf);
                return { start, midway, full, hiddenCount, coverage: s.overlay.dataset.coverage, pointer: getComputedStyle(s.overlay).pointerEvents };
            });
            assert.equal(check.start.length, 8); assert.equal(check.hiddenCount, 7);
            assert(check.start.every(([a]) => a === 0));
            assert(check.midway.some(([a]) => a > 0) && check.midway.some(([a]) => a === 0));
            assert(check.full.every(([center, gap, corner]) => center > 0 && gap === 0 && corner < center));
            assert.equal(check.pointer, 'none'); assert.equal(check.coverage, '1.000');
            await page.screenshot({ path: output + '/' + theme + '-frozen.png' });
            await page.locator('[data-effect="stop"]').click();
            assert.equal(await page.locator('.live-stage-effect').count(), 0);
            if (theme === 'dark') {
                const results = await page.evaluate(async () => {
                    const render = async (mute, cut) => {
                        const ctx = new OfflineAudioContext(1, 48000, 48000);
                        const sound = Object.create(Object.getPrototypeOf(app.soundMgr));
                        sound.ctx = ctx; sound.enabled = !mute;
                        const stop = sound.iceAgeCrack();
                        const stopTask = cut ? ctx.suspend(0.14).then(() => { stop(); stop(); return ctx.resume(); }) : null;
                        const samples = (await ctx.startRendering()).getChannelData(0);
                        await stopTask;
                        const peak = (from, end) => samples.subarray(from * 48000, end * 48000).reduce((a, b) => Math.max(a, Math.abs(b)), 0);
                        return [peak(0, 0.05), peak(0.132, 0.176), peak(0.19, 0.24), peak(0.64, 1)];
                    };
                    return [await render(false, false), await render(false, true), await render(true, false)];
                });
                assert(results[0].slice(0, 3).every(peak => peak > 0.035 && peak < 1));
                assert.equal(results[0][3], 0); assert.equal(results[1][2], 0);
                assert(results[2].every(peak => peak === 0));
            }
            assert.deepEqual(errors, []); await page.close();
        }
        console.log('Ice browser QA passed: eight shaped targets, uncovered gaps, growth order, hidden controls, click-through, fracture audio, mute and cancellation.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
