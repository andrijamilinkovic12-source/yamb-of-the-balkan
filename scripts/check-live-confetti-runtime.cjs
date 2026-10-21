const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'www/managers.js'), 'utf8');
const prelude = source.slice(source.indexOf('const YAMB_THEME_IDS ='), source.indexOf('const filterYambThemeIds'));
const effectClass = source.slice(source.indexOf('class EffectManager {'), source.indexOf('class SoundManager {'));
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

function harness(reducedMotion = false) {
    const frames = new Map();
    const draws = [];
    let nextId = 1;
    const ctx = {
        setTransform() {}, clearRect() {}, save() {}, restore() {},
        translate() {}, rotate() {},
        drawImage(image) { draws.push(image.src); }
    };
    const canvas = { width: 0, height: 0, getContext() { return ctx; } };
    const document = {
        body: { classList: { contains() { return false; }, remove() {} } },
        documentElement: { dataset: { splashTheme: 'dark' }, clientWidth: 390, clientHeight: 844, classList: { remove() {} } },
        getElementById(id) { return id === 'confetti-canvas' ? canvas : null; },
        querySelectorAll() { return []; }
    };
    const window = {
        innerWidth: 390, innerHeight: 844, devicePixelRatio: 3,
        matchMedia() { return { matches: reducedMotion }; }
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
        document, window, Image,
        localStorage: { getItem() { return null; } },
        requestAnimationFrame(callback) { const id = nextId++; frames.set(id, callback); return id; },
        cancelAnimationFrame(id) { frames.delete(id); },
        clearTimeout() {}
    });
    vm.runInContext(`${prelude}\n${effectClass}\nthis.EffectManager = EffectManager;`, context);
    const fx = new context.EffectManager();
    return {
        fx, document, frames, draws, canvas,
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
        for (let frame = 1; frame <= 55; frame++) qa.frame(themeIndex * 1000 + frame * 16);
        assert(qa.draws.length > 0, `${theme}: confetti must draw visible PNG particles`);
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

    const reduced = harness(true);
    reduced.fx.spawnConfetti();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(reduced.frames.size, 0, 'Reduced motion must not animate confetti');
    console.log('Live confetti passed: 30 unique RGBA PNGs, ten themes, theme switch, cleanup and reduced motion.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
