const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.GREEN_QA_BASE_URL || 'http://127.0.0.1:3138';
const output = 'tmp/thunder-storm-preview';

(async () => {
    fs.mkdirSync(output, { recursive: true });
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        for (const [theme, width, height] of [['dark', 390, 844], ['light', 1280, 800], ['neon', 320, 480]]) {
            const context = await browser.newContext({ viewport: { width, height } });
            const page = await context.newPage(), errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.addInitScript(() => localStorage.setItem('yamb_sound', 'false'));
            await page.goto(base + '/qa/theme-live-effects-review.html?theme=' + theme + '&effect=thunder&sound=1');
            await page.waitForFunction(() => window.qaFx?.fx.stageScene?.thunderBolt);
            const draw = async time => page.evaluate(t => {
                const scene = qaFx.fx.stageScene;
                cancelAnimationFrame(scene.raf); clearTimeout(scene.timer);
                scene.startedAt = 0; scene.lastFrame = -100; scene.frame(t * 1000); cancelAnimationFrame(scene.raf);
            }, time);
            for (const [time, label] of [[0.8, 'clouds'], [1.51, 'strike'], [1.9, 'afterglow']]) {
                await draw(time); await page.screenshot({ path: `${output}/${theme}-${width}-${label}.png` });
                if (label === 'strike') {
                    const state = await page.evaluate(() => {
                        const scene = qaFx.fx.stageScene, pixels = scene.ctx.getImageData(0, 0, scene.canvas.width, scene.canvas.height).data;
                        let bright = 0;
                        for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 2] > 190 && pixels[i] > 90) bright++;
                        return { phase: scene.overlay.dataset.thunderPhase, branches: scene.thunderBranches.length, bright };
                    });
                    assert.equal(state.phase, 'strike'); assert.equal(state.branches, 12); assert(state.bright > 1000);
                }
            }
            const meanDrawMs = await page.evaluate(() => {
                const scene = qaFx.fx.stageScene, start = performance.now();
                for (let i = 0; i < 80; i++) { scene.ctx.clearRect(0, 0, scene.width, scene.height); scene.thunder(1.35 + i * 0.018); }
                return (performance.now() - start) / 80;
            });
            await draw(4.5); assert.equal(await page.locator('.live-stage-effect').count(), 0); assert.deepEqual(errors, []);
            console.log(theme, width + 'x' + height, 'screenshots and cleanup passed; mean draw ms:', meanDrawMs.toFixed(2));
            if (theme === 'dark') {
                await page.evaluate(() => { app.soundMgr.enabled = true; });
                await page.locator('[data-effect="play"]').click(); await page.waitForTimeout(1650);
                assert.equal(await page.evaluate(() => app.soundMgr.ctx.state), 'running');
                await page.locator('[data-effect="stop"]').click(); assert.equal(await page.locator('.live-stage-effect').count(), 0);
                const audio = await page.evaluate(async () => {
                    const source = await (await fetch('/managers.js')).text();
                    const soundClass = source.slice(source.indexOf('class SoundManager {'), source.indexOf('class ShopManager {'));
                    const Sound = new Function(soundClass + '\nreturn SoundManager;')();
                    const render = async (muted = false, cut = null) => {
                        const ctx = new OfflineAudioContext(1, Math.ceil(4.6 * 48000), 48000), sound = Object.create(Sound.prototype);
                        sound.ctx = ctx; sound.enabled = !muted; sound.playSound = fn => { if (sound.enabled) fn.call(sound); };
                        let allocations = 0;
                        const createBuffer = ctx.createBuffer.bind(ctx);
                        ctx.createBuffer = (...args) => { allocations++; return createBuffer(...args); };
                        const cleanup = sound.thunder(1.48);
                        let stop;
                        if (cut !== null) stop = ctx.suspend(cut).then(() => { cleanup?.(); cleanup?.(); return ctx.resume(); });
                        const buffer = await ctx.startRendering(); if (stop) await stop;
                        const data = buffer.getChannelData(0);
                        const rms = (from, to) => {
                            let sum = 0, count = 0;
                            for (let i = Math.floor(from * 48000); i < Math.floor(to * 48000); i++) { sum += data[i] ** 2; count++; }
                            return Math.sqrt(sum / count);
                        };
                        const max = (from = 0) => {
                            let peak = 0;
                            for (let i = Math.floor(from * 48000); i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
                            return peak;
                        };
                        return { peak: max(), ambience: rms(0.4, 1), crack: rms(1.482, 1.56), rumble: rms(1.65, 2.1),
                            tail: max(4.25), afterCut: cut === null ? 0 : max(cut + 0.12), allocations,
                            samples: muted || cut !== null ? undefined : Array.from(data) };
                    };
                    return { normal: await render(), muted: await render(true), earlyExit: await render(false, 0.6), lateExit: await render(false, 1.65) };
                });
                assert(audio.normal.peak < 0.65); assert(audio.normal.ambience > 0.001);
                assert(audio.normal.crack > audio.normal.ambience * 4); assert(audio.normal.rumble > 0.01);
                assert.equal(audio.normal.tail, 0); assert.equal(audio.normal.allocations, 1);
                assert.equal(audio.muted.peak, 0); assert.equal(audio.muted.allocations, 0);
                assert.equal(audio.earlyExit.afterCut, 0); assert.equal(audio.lateExit.afterCut, 0);
                const samples = audio.normal.samples; delete audio.normal.samples;
                const wave = Buffer.alloc(44 + samples.length * 2);
                wave.write('RIFF'); wave.writeUInt32LE(wave.length - 8, 4); wave.write('WAVEfmt ', 8);
                wave.writeUInt32LE(16, 16); wave.writeUInt16LE(1, 20); wave.writeUInt16LE(1, 22);
                wave.writeUInt32LE(48000, 24); wave.writeUInt32LE(96000, 28); wave.writeUInt16LE(2, 32); wave.writeUInt16LE(16, 34);
                wave.write('data', 36); wave.writeUInt32LE(samples.length * 2, 40);
                samples.forEach((value, i) => wave.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value)) * 32767), 44 + i * 2));
                fs.writeFileSync(output + '/thunder-storm.wav', wave);
                console.log('Real Web Audio:', JSON.stringify(audio));
            }
            await context.close();
        }
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
        const page = await context.newPage();
        await page.goto(base + '/qa/theme-live-effects-review.html?theme=light&effect=thunder');
        await page.waitForFunction(() => window.qaFx?.fx.stageScene?.thunderBolt);
        assert.equal(await page.evaluate(() => qaFx.fx.stageScene.reduced), true);
        await page.waitForTimeout(2800); assert.equal(await page.locator('.live-stage-effect').count(), 0);
        await context.close();
        console.log('Thunder browser QA passed: actual rendering, sound, mute, early/late cancellation and reduced motion.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
