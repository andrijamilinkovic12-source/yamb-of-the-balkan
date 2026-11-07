const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'www/managers.js'), 'utf8');
const prelude = source.slice(source.indexOf('const YAMB_THEME_IDS ='), source.indexOf('const filterYambThemeIds'));
const effectClass = source.slice(source.indexOf('class EffectManager {'), source.indexOf('class SoundManager {'));
const soundClass = source.slice(source.indexOf('class SoundManager {'), source.indexOf('class ShopManager {'));
const roles = ['ribbon', 'chip', 'lozenge'];
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'source-assets/theme-live-confetti-v1/manifest.json'), 'utf8'));
assert.equal(manifest.assets.length, themes.length * roles.length);
const hashes = new Set();
for (const theme of themes) {
    const prefix = theme === 'dark' ? 'assets/green-soft-clay/' : `assets/theme-packs/${theme}/`;
    for (const role of roles) {
        const filename = path.join(root, 'www', prefix, `canonical/confetti-particles/${role}-v1.png`);
        const bytes = fs.readFileSync(filename);
        assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a');
        assert.equal(bytes.readUInt32BE(16), 256);
        assert.equal(bytes.readUInt32BE(20), 256);
        assert.equal(bytes[25], 6, `${theme}/${role}: expected RGBA sprite`);
        const digest = crypto.createHash('sha256').update(bytes).digest('hex');
        const entry = manifest.assets.find(item => item.theme === theme && item.role === role);
        assert(entry, `${theme}/${role}: missing provenance`);
        assert.equal(entry.productionSha256, digest, `${theme}/${role}: stale manifest hash`);
        assert.equal(entry.sourceSha256, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, entry.source))).digest('hex'));
        hashes.add(digest);
    }
}
assert.equal(hashes.size, 30, 'Every themed particle must have its own PNG artwork');

function harness({ reducedMotion = false, muted = false, width = 390, height = 844 } = {}) {
    const frames = new Map();
    const draws = [];
    const positions = [];
    const pops = [];
    const buffers = [];
    let nextId = 1;
    const ctx = {
        setTransform() {}, clearRect() {}, save() {}, restore() {},
        translate(x, y) { positions.push({ x, y }); }, rotate() {},
        drawImage(image) { draws.push(image.src); }
    };
    const canvas = { width: 0, height: 0, getContext() { return ctx; } };
    const document = {
        body: { classList: { contains() { return false; }, remove() {} } },
        documentElement: { dataset: { splashTheme: 'dark' }, clientWidth: width, clientHeight: height, classList: { remove() {} } },
        getElementById(id) { return id === 'confetti-canvas' ? canvas : null; },
        querySelectorAll() { return []; },
        addEventListener() {}
    };
    const window = {
        innerWidth: width, innerHeight: height, devicePixelRatio: 3,
        matchMedia() { return { matches: reducedMotion }; },
        AudioContext: class {
            sampleRate = 48000;
            state = 'running';
            destination = {};
            createBuffer(channels, length, sampleRate) {
                const samples = new Float32Array(length);
                const buffer = { channels, sampleRate, samples, getChannelData() { return samples; } };
                buffers.push(buffer);
                return buffer;
            }
            createBufferSource() {
                return { connect() {}, start() { pops.push({ buffer: this.buffer, drawCount: draws.length }); } };
            }
        }
    };
    class Image {
        set src(value) {
            this._src = value;
            assert(fs.existsSync(path.join(root, 'www', value)), `Missing ${value}`);
            queueMicrotask(() => this.onload());
        }
        get src() { return this._src; }
    }
    const context = vm.createContext({
        document, window, Image, console,
        Audio: class { addEventListener() {} },
        localStorage: { getItem(key) { return muted && key === 'yamb_sound' ? 'false' : null; } },
        requestAnimationFrame(callback) { const id = nextId++; frames.set(id, callback); return id; },
        cancelAnimationFrame(id) { frames.delete(id); },
        clearTimeout() {}
    });
    vm.runInContext(`${prelude}\n${effectClass}\n${soundClass}\nwindow.app = { soundMgr: new SoundManager() };\nthis.EffectManager = EffectManager;`, context);
    const fx = new context.EffectManager();
    return {
        fx, document, frames, draws, positions, canvas, pops, buffers,
        frame(now) {
            const callbacks = [...frames.values()];
            frames.clear();
            callbacks.forEach(callback => callback(now));
        }
    };
}

async function main() {
    const qa = harness();
    for (const [themeIndex, theme] of themes.entries()) {
        qa.document.documentElement.dataset.splashTheme = theme;
        qa.fx.spawnConfetti();
        await new Promise(resolve => setImmediate(resolve));
        assert(qa.frames.size > 0, `${theme}: effect must begin after its PNG sprites load`);
        qa.draws.length = 0;
        qa.positions.length = 0;
        assert.equal(qa.pops.length, themeIndex, `${theme}: no pop before the first frame`);
        qa.frame(themeIndex * 1000);
        assert.equal(qa.pops.length, themeIndex + 1, `${theme}: pop must play with the first frame`);
        assert.equal(qa.pops.at(-1).drawCount, 0, `${theme}: pop must precede the particle draws`);
        assert.equal(qa.draws.length, 114, `${theme}: first frame must have a visible burst`);
        let peak = 0;
        for (let frame = 1; frame <= 55; frame++) {
            const previous = qa.draws.length;
            qa.frame(themeIndex * 1000 + frame * 16);
            peak = Math.max(peak, qa.draws.length - previous);
        }
        assert(peak >= 180 && peak <= 228, `${theme}: expected a fuller burst within the mobile budget, got ${peak}`);
        assert.equal(qa.canvas.width, 585, `${theme}: mobile canvas must limit high DPR cost`);
        assert.equal(qa.pops.length, themeIndex + 1, `${theme}: the follow-up wave must not replay the pop`);
        assert(qa.positions.some(point => point.x < 390 * 0.12), `${theme}: burst does not reach the left edge`);
        assert(qa.positions.some(point => point.x > 390 * 0.88), `${theme}: burst does not reach the right edge`);
        assert(qa.positions.some(point => point.y < 844 * 0.2), `${theme}: burst does not reach the top of the screen`);
        const prefix = theme === 'dark' ? 'assets/green-soft-clay/' : `assets/theme-packs/${theme}/`;
        assert(qa.draws.every(src => src.startsWith(`${prefix}canonical/confetti-particles/`)), `${theme}: wrong theme artwork`);
        if (themeIndex < themes.length - 1) {
            qa.document.documentElement.dataset.splashTheme = themes[themeIndex + 1];
            qa.frame(themeIndex * 1000 + 900);
            assert.equal(qa.frames.size, 0, `${theme}: theme switch must stop the old particle layer`);
        }
    }
    qa.fx.stop();
    assert.equal(qa.frames.size, 0, 'Stop must cancel the animation frame');
    assert.equal(qa.buffers.length, 1, 'Replay must reuse the same short sound buffer');
    const { channels, sampleRate, samples } = qa.buffers[0];
    assert.equal(channels, 1);
    assert.equal(samples.length / sampleRate, 0.16);
    assert.equal(Math.abs(samples[0]), 0);
    assert.equal(Math.abs(samples.at(-1)), 0);
    const peakSample = values => Math.max(...values.map(Math.abs));
    assert(peakSample(samples) > 0.1 && peakSample(samples) < 1, 'Pop must be audible without clipping');
    assert(peakSample(samples.slice(-1200)) < 0.02, 'Paper tail must die away quickly');

    const desktop = harness({ width: 1280, height: 800, muted: true });
    await desktop.fx.spawnThemedConfetti('dark');
    desktop.frame(0);
    assert.equal(desktop.draws.length, 162, 'Desktop must have a larger initial burst');
    assert.equal(desktop.canvas.width, 2560, 'Desktop canvas must cap DPR at 2');
    let desktopPeak = 0;
    for (let frame = 1; frame <= 250; frame++) {
        const previous = desktop.draws.length;
        desktop.frame(frame * 16);
        desktopPeak = Math.max(desktopPeak, desktop.draws.length - previous);
    }
    assert(desktopPeak >= 265 && desktopPeak <= 324, `Expected a fuller desktop burst, got ${desktopPeak}`);
    assert.equal(desktop.frames.size, 0, 'Confetti must finish on its own');
    assert.equal(desktop.pops.length, 0, 'Mute must suppress the pop without suppressing confetti');
    assert.equal(desktop.buffers.length, 0, 'Mute must not synthesize the pop');

    const cancelled = harness();
    const pending = cancelled.fx.spawnThemedConfetti('dark');
    cancelled.fx.stop();
    await pending;
    assert.equal(cancelled.frames.size, 0, 'Stop during sprite load must cancel the pending burst');
    await cancelled.fx.spawnThemedConfetti('dark');
    cancelled.document.documentElement.dataset.splashTheme = 'light';
    cancelled.frame(0);
    assert.equal(cancelled.frames.size, 0, 'Theme change before the first frame must cancel the burst');
    assert.equal(cancelled.pops.length, 0, 'Cancelled bursts must not pop');

    const reduced = harness({ reducedMotion: true });
    reduced.fx.spawnConfetti();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(reduced.frames.size, 0, 'Reduced motion must not animate confetti');
    assert.equal(reduced.pops.length, 0, 'Reduced motion must not pop without a visual burst');
    console.log('Live confetti passed: ten themed PNG sets, denser mobile and desktop bursts, one synced pop, mute, cancellation and reduced motion.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
