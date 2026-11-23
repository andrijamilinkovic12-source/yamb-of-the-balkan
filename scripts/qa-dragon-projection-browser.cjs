const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.GREEN_QA_BASE_URL || 'http://127.0.0.1:3130';
const output = 'tmp/dragon-projection-preview';

(async () => {
    fs.mkdirSync(output, { recursive: true });
    const browser = await chromium.launch({ channel: 'msedge' });
    try {
        for (const [theme, width, height] of [['dark', 390, 844], ['light', 1280, 800], ['neon', 320, 480]]) {
            const page = await browser.newPage({ viewport: { width, height } }), errors = [];
            page.on('pageerror', e => errors.push(e.message));
            await page.addInitScript(() => localStorage.setItem('yamb_sound', 'false'));
            await page.goto(base + '/qa/theme-live-effects-review.html?effect=dragon_fire&sound=1&theme=' + theme);
            await page.waitForFunction(() => window.qaFx?.fx.stageScene?.dragonLayout);
            const frame = async ms => page.evaluate(t => {
                const s = qaFx.fx.stageScene, c = s.ctx;
                cancelAnimationFrame(s.raf); clearTimeout(s.timer);
                s.startedAt = 0; s.lastFrame = -100; s.frame(t); cancelAnimationFrame(s.raf);
                const pose = s.dragonPose(t / 1000), { data } = c.getImageData(0, 0, s.canvas.width, s.canvas.height);
                const sy = c.getTransform().d, mouthY = Math.floor(pose.mouth.y * sy);
                let green = 0, distant = 0, near = 0, deepest = 0, outsideBoard = 0;
                for (let y = 0; y < s.canvas.height; y += 2) for (let x = 0; x < s.canvas.width; x += 2) {
                    const k = 4 * (y * s.canvas.width + x);
                    if (y < mouthY && data[k + 1] > 70 && data[k + 1] > data[k] * 1.08) green++;
                    if (data[k] < 105 || data[k] < data[k + 2] * 1.7) continue;
                    if (y >= mouthY && y < mouthY + 35 * sy) distant++;
                    if (x < s.board.x * sy || x > s.board.right * sy || y > s.board.bottom * sy) outsideBoard++;
                    if (y > mouthY + s.dragonLayout.run * sy * 0.28) { near++; deepest = y; }
                }
                return { green, distant, near, deepest, outsideBoard, phase: s.overlay.dataset.dragonPhase,
                    head: s.images.head.naturalWidth, atlas: s.images.plume.naturalWidth };
            }, ms);
            const breatheIn = await frame(1290);
            assert.equal(breatheIn.head, 384); assert.equal(breatheIn.atlas, 640);
            assert(breatheIn.green > 120 && !breatheIn.near);
            await page.screenshot({ path: output + '/' + theme + '-inhale.png' });
            const far = await frame(1640), peak = await frame(2670), next = await frame(2800);
            assert(peak.green > 120 && peak.distant > 30, 'The face and the mouth remain readable');
            assert(peak.near > 220 && peak.near > far.near + 200);
            assert(peak.deepest !== next.deepest || peak.near !== next.near);
            await page.screenshot({ path: output + '/' + theme + '-breath.png' });
            const crest = await frame(4160);
            assert(crest.near > peak.near && crest.outsideBoard > 40, 'The last curl clears the edge of the board');
            await page.screenshot({ path: output + '/' + theme + '-crest.png' });
            const end = await frame(5210); assert.equal(end.phase, 'exit'); assert.equal(end.near, 0);
            await page.locator('[data-effect="stop"]').click(); assert.equal(await page.locator('.live-stage-effect').count(), 0);
            if (theme === 'dark') {
                await page.evaluate(() => { app.soundMgr.enabled = true; });
                await page.locator('[data-effect="play"]').click();
                await page.waitForFunction(() => window.qaFx.fx.stageScene?.overlay.dataset.dragonPhase === 'breath');
                assert.equal(await page.evaluate(() => app.soundMgr.ctx.state), 'running');
                await page.locator('[data-effect="stop"]').click(); assert.equal(await page.locator('.live-stage-effect').count(), 0);
                const soundTest = await page.evaluate(async () => {
                    const render = async (enabled, cut) => {
                        const rate = 24000, sound = Object.create(Object.getPrototypeOf(app.soundMgr));
                        const ctx = sound.ctx = new OfflineAudioContext(1, rate * 4, rate);
                        sound.enabled = enabled;
                        const stop = sound.dragonBreath(0.7);
                        const task = cut && ctx.suspend(1.4).then(() => { stop(); stop(); return ctx.resume(); });
                        const samples = (await ctx.startRendering()).getChannelData(0);
                        if (task) await task;
                        const rms = (a, b) => Math.sqrt(samples.subarray(a * rate, b * rate)
                            .reduce((sum, n) => sum + n * n, 0) / ((b - a) * rate));
                        return [rms(2.3, 2.48), rms(3.1, 3.22), rms(3.7, 4)];
                    };
                    return [await render(true, false), await render(true, true), await render(false, false)];
                });
                assert(soundTest[0][1] > soundTest[0][0] * 1.35 && soundTest[0][2] === 0);
                assert(soundTest.slice(1).every(samples => samples.every(n => n === 0)));
            }
            assert.deepEqual(errors, []); await page.close();
        }
        console.log('Browser passed: frontal hologram, visible throat, growing foreground flames, playback and cleanup on three viewports.');
    } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
