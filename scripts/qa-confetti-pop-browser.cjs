const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.GREEN_QA_BASE_URL || 'http://127.0.0.1:3130';
const output = 'tmp/confetti-pop-preview';

(async () => {
    fs.mkdirSync(output, { recursive: true });
    const browser = await chromium.launch({ channel: 'msedge' });
    try {
        for (const [theme, width, height] of [['dark',390,844], ['neon',320,480], ['light',1280,800]]) {
            const page = await browser.newPage({ viewport: { width, height } }), errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.addInitScript(() => localStorage.setItem('yamb_sound', 'false'));
            await page.goto(base + '/qa/theme-live-effects-review.html?effect=confetti&sound=1&theme=' + theme);
            await page.waitForFunction(() => window.qaFx?.fx.confettiAnimationId);
            const result = await page.evaluate(async theme => {
                const fx = qaFx.fx, sound = app.soundMgr, canvas = document.getElementById('confetti-canvas');
                fx.stop(); sound.enabled = true;
                const ctx = canvas.getContext('2d'), draw = ctx.drawImage.bind(ctx);
                const audio = sound.ctx = new OfflineAudioContext(1, 12000, 48000);
                const createSource = audio.createBufferSource.bind(audio);
                let draws = 0, callback, pops = 0, atDraw;
                audio.createBufferSource = () => {
                    const node = createSource(), start = node.start.bind(node);
                    node.start = (...args) => { atDraw = draws; pops++; return start(...args); };
                    return node;
                };
                ctx.drawImage = (...args) => { draws++; return draw(...args); };
                window.requestAnimationFrame = fn => { callback = fn; return 1; };
                await fx.spawnThemedConfetti(theme);
                callback(0);
                const first = draws;
                for (let t = 16; t <= 320; t += 16) callback(t);
                const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                let visible = 0;
                for (let i = 3; i < pixels.length; i += 16) if (pixels[i] > 64) visible++;
                const buffer = await audio.startRendering();
                const pcm = buffer.getChannelData(0);
                const rms = (a, b) => Math.sqrt(pcm.subarray(a,b).reduce((s,v) => s + v*v, 0) / (b-a));
                const metrics = [rms(0,720), rms(1440,2880), rms(7680,12000)];
                const samples = theme === 'dark' ? Array.from(pcm, v => Math.round(v * 32767)) : [];
                return {first, pops, atDraw, visible, metrics, samples};
            }, theme);
            assert.equal(result.first, width < 640 ? 133 : 189);
            assert.equal(result.pops, 1); assert.equal(result.atDraw, 0); assert(result.visible > 200);
            const [impact, tail, silence] = result.metrics;
            assert(impact > 0.07 && tail > 0.005 && impact > 2 * tail && silence === 0);
            await page.screenshot({ path: output + '/' + theme + '-burst.png' });
            if (result.samples.length) {
                const pcm = Buffer.alloc(result.samples.length * 2);
                result.samples.forEach((v, i) => pcm.writeInt16LE(v, i * 2));
                const wav = Buffer.alloc(44);
                wav.write('RIFF'); wav.writeUInt32LE(36 + pcm.length, 4); wav.write('WAVEfmt ', 8);
                wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
                wav.writeUInt32LE(48000, 24); wav.writeUInt32LE(96000, 28); wav.writeUInt16LE(2, 32);
                wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(pcm.length, 40);
                fs.writeFileSync(output + '/konfete.wav', Buffer.concat([wav, pcm]));
                await page.reload();
                await page.waitForFunction(() => window.qaFx?.fx.confettiAnimationId);
                await page.evaluate(() => { app.soundMgr.enabled = true; });
                await page.locator('[data-effect=play]').click();
                await page.waitForFunction(() => app.soundMgr.ctx?.state === 'running');
            }
            assert.deepEqual(errors, []); await page.close();
        }
        console.log('Confetti: initial PNG burst and Web Audio onset match; all three viewports draw; live playback, transient, tail and silence verified.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
