const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const { makeHarness } = require('./live-stage-test-harness.cjs');
const base = process.env.GREEN_QA_BASE_URL || 'http://127.0.0.1:3130';
const output = 'tmp/wedding-kolo-preview';
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];

(async () => {
    const horns = new Set();
    for (const theme of themes) {
        const h = makeHarness({ theme }), audio = [];
        h.setSoundManager({ balkanTrumpet: (...args) => audio.push(args), stopBalkanMusic: () => audio.push('stop') });
        const scene = new h.Stage(h.owner, 'balkan'); await scene.start();
        const src = scene.images.trumpet.src; horns.add(src);
        assert(fs.existsSync('www/' + src)); assert(!audio.length);
        h.step(0); h.step(3000); h.step(7900);
        assert.deepEqual(audio, [[60 / 144, 0.045]]);
        assert(scene.weddingPetals.length <= 44 && scene.weddingCloth.width === 640);
        h.setTheme(theme === 'light' ? 'dark' : 'light'); h.step(7970); scene.stop();
        assert.deepEqual(audio, [[60 / 144, 0.045], 'stop']);
        assert.equal(h.frames.size, 0); assert.equal(h.body.children.length, 0);
    }
    assert.equal(horns.size, 10);
    fs.mkdirSync(output, { recursive: true });
    const browser = await chromium.launch({ channel: 'msedge' });
    try {
        for (const [theme, width, height] of [['dark', 390, 844], ['neon', 320, 480], ['light', 1280, 800]]) {
            const page = await browser.newPage({ viewport: { width, height } }), errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.addInitScript(() => localStorage.setItem('yamb_sound', 'false'));
            await page.goto(base + '/qa/theme-live-effects-review.html?effect=balkan&sound=1&theme=' + theme);
            await page.waitForFunction(() => window.qaFx?.fx.stageScene?.weddingCloth);
            const sample = await page.evaluate(() => {
                const s = qaFx.fx.stageScene, c = s.ctx;
                cancelAnimationFrame(s.raf); clearTimeout(s.timer);
                const draw = t => {
                    s.startedAt = 0; s.lastFrame = -100; s.frame(t); cancelAnimationFrame(s.raf);
                    const { mid, floor, cast } = s.weddingSet, scale = c.getTransform();
                    return c.getImageData((mid - cast / 2) * scale.a, (floor - cast * 0.52) * scale.d,
                        cast * scale.a, cast * 0.53 * scale.d).data;
                };
                const a = draw(2090), b = draw(2310); let different = 0, solid = 0;
                for (let i = 0; i < a.length; i += 4) {
                    if (Math.abs(a[i] - b[i]) > 15) different++;
                    if (b[i + 3] > 220) solid++;
                }
                return { different, solid, size: [s.images.dancers.naturalWidth, s.images.dancers.naturalHeight] };
            });
            assert.deepEqual(sample.size, [800, 410]); assert(sample.different > 300 && sample.solid > 1000);
            await page.screenshot({ path: output + '/' + theme + '.png' });
            await page.locator('[data-effect="stop"]').click();
            assert.equal(await page.locator('.live-stage-effect').count(), 0);
            if (theme === 'dark') {
                const result = await page.evaluate(async () => {
                    const sound = app.soundMgr, rate = 24000;
                    const render = async cut => {
                        sound.enabled = true; sound.musicEnabled = true; sound.musicVolume = 0.5;
                        let resumes = 0;
                        sound.bgMusic = { paused: false, pause() { this.paused = true; } };
                        sound.playMusic = () => { resumes++; sound.bgMusic.paused = false; };
                        const ctx = sound.ctx = new OfflineAudioContext(1, rate * 9, rate);
                        sound.balkanTrumpet();
                        if (!sound.bgMusic.paused) throw new Error('Background track still playing');
                        const voices = sound.balkanNodes.length;
                        const task = cut && ctx.suspend(1.4).then(() => { sound.stopBalkanMusic(true); return ctx.resume(); });
                        const data = (await ctx.startRendering()).getChannelData(0);
                        if (task) await task;
                        sound.stopBalkanMusic(true); sound.stopBalkanMusic(true);
                        const peak = (start, end) => data.subarray(start * rate, end * rate).reduce((v, n) => Math.max(v, Math.abs(n)), 0);
                        return { sections: [peak(0.06, 0.5), peak(1.65, 2.5), peak(7.8, 8.3)], silence: peak(8.6, 9),
                            resumes, voices, remaining: sound.balkanNodes.length, timer: sound.balkanStopTimer };
                    };
                    return [await render(false), await render(true)];
                });
                const [full, stopped] = result;
                assert(full.sections.every(n => n > 0.06 && n < 1)); assert.equal(full.silence, 0);
                assert.deepEqual(stopped.sections.slice(1), [0, 0]);
                for (const r of result) {
                    assert(r.voices < 32); assert.equal(r.resumes, 1); assert.equal(r.remaining, 0); assert.equal(r.timer, null);
                }
            }
            assert.deepEqual(errors, []); await page.close();
        }
        const h = makeHarness({ reduced: true });
        h.setSoundManager({ balkanTrumpet() { throw Error('Music in reduced motion'); } });
        const scene = new h.Stage(h.owner, 'balkan'); await scene.start(); h.step(0); h.step(700); h.step(2600);
        assert.equal(h.body.children.length, 0);
        console.log('Wedding: ten themed horns, moving cast on three viewports, offline audio, interruption, background music restoration and quiet reduced motion passed.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
