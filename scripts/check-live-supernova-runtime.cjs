const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative));
const source = read('www/managers.js').toString('utf8');
const manifest = JSON.parse(read('source-assets/theme-live-supernova-v2/manifest.json'));
const ids = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
assert.deepEqual(manifest.assets.map(asset => asset.theme), ids);
assert.equal(new Set(manifest.assets.map(asset => asset.sha256)).size, 10);
for (const asset of manifest.assets) {
    const png = read(asset.productionPath);
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png[25], 6, `${asset.theme} has transparency`);
    assert.equal(crypto.createHash('sha256').update(png).digest('hex'), asset.sha256);
}

const prelude = source.slice(source.indexOf('const YAMB_THEME_IDS ='), source.indexOf('const filterYambThemeIds'));
const start = source.indexOf('    loadSupernovaSprite(');
const end = source.indexOf('    trigger(type) {', start);
assert(start > 0 && end > start);
const Manager = new Function(`${prelude}\nreturn class {
    constructor() {
        this.supernovaRunId = 0;
        this.supernovaSpritePromises = {};
        this.supernovaCanvasCleanup = null;
        this.timers = [];
    }
    getGoldRainThemeId() { return globalThis.activeSupernovaTheme; }
    scheduleEffectTimeout(callback, delay) { this.timers.push({ callback, delay }); }
    ${source.slice(start, end)}
}`)();

function node(tag = 'div') {
    const classes = new Set();
    const style = { setProperty(name, value) { this[name] = value; }, removeProperty(name) { delete this[name]; } };
    const element = {
        tag, style, dataset: {}, children: [], parentNode: null,
        classList: {
            add(...names) { names.forEach(name => classes.add(name)); },
            remove(...names) { names.forEach(name => classes.delete(name)); },
            contains(name) { return classes.has(name); }
        },
        appendChild(child) { this.children.push(child); child.parentNode = this; return child; },
        remove() {
            if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(child => child !== this);
            this.parentNode = null;
        },
        get isConnected() { return Boolean(this.parentNode); },
        getBoundingClientRect() { return { left: 40, top: 120, width: 320, height: 520 }; }
    };
    Object.defineProperty(element, 'className', {
        set(value) { classes.clear(); value.split(/\s+/).filter(Boolean).forEach(name => classes.add(name)); },
        get() { return [...classes].join(' '); }
    });
    return element;
}

async function main() {
    const prior = { document: global.document, window: global.window, Image: global.Image, requestAnimationFrame: global.requestAnimationFrame, cancelAnimationFrame: global.cancelAnimationFrame };
    const body = node('body');
    const table = node('table');
    table.style.opacity = '1';
    let theme = 'neon';
    let reduced = false;
    const frames = [];
    const ctx = {
        radii: [], strokes: 0,
        setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {}, fill() {}, save() {}, restore() {},
        arc(x, y, radius) { this.radii.push(radius); }, stroke() { this.strokes++; },
        moveTo() {}, lineTo() {},
        createRadialGradient() { return { addColorStop() {} }; }
    };
    global.activeSupernovaTheme = theme;
    global.document = {
        body,
        createElement() {
            const overlay = node();
            Object.defineProperty(overlay, 'innerHTML', {
                set() {
                    const canvas = node('canvas');
                    canvas.getContext = () => ctx;
                    const image = node('img');
                    overlay.children = [canvas, image];
                    canvas.parentNode = overlay;
                    image.parentNode = overlay;
                }
            });
            overlay.querySelector = selector => selector === 'canvas' ? overlay.children[0] : overlay.children[1];
            return overlay;
        },
        querySelectorAll(selector) { return selector === '.player-table' ? [table] : []; },
        querySelector(selector) { return selector === '.player-table' ? table : null; }
    };
    global.window = {
        innerWidth: 390, innerHeight: 844, devicePixelRatio: 2,
        matchMedia(query) { return { matches: query.includes('prefers-reduced-motion') ? reduced : true }; },
        addEventListener() {}, removeEventListener() {}
    };
    global.Image = class {
        set src(value) { this._src = value; queueMicrotask(() => this.onload?.()); }
        get src() { return this._src; }
    };
    global.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
    global.cancelAnimationFrame = () => {};
    const step = now => {
        assert(frames.length, 'animation frame scheduled');
        const callback = frames.shift();
        ctx.radii = [];
        ctx.strokes = 0;
        callback(now);
        return { radii: [...ctx.radii], strokes: ctx.strokes, plume: body.children[0]?.children[1]?.style.transform || '' };
    };
    try {
        const manager = new Manager();
        await manager.spawnSupernova();
        assert.equal(body.children.length, 1);
        assert.equal(body.children[0].children[1].src, 'assets/effects/supernova/neon-plasma-v2.png');
        assert(table.classList.contains('anim-supernova-table'));
        assert.equal(manager.timers[0].delay, 5080);
        step(0);
        step(500);
        const early = step(950);
        const late = step(1600);
        assert(late.radii[0] > early.radii[0] + 100, 'shockwave expands between frames');
        assert(late.strokes > 20, 'particles and shell are animated, not a static illustration');
        assert(late.radii.length > 100, 'fine dust motes spread behind the wave');
        const scale = frame => Number(frame.plume.match(/scale\(([^)]+)\)/)?.[1]);
        assert(scale(late) > scale(early) + 0.5, 'plasma plume expands while particles travel');
        assert.equal(body.children[0].dataset.phase, 'ejecta');
        global.activeSupernovaTheme = theme = 'moon';
        step(1750);
        assert.equal(body.children.length, 0, 'theme switch clears old animation');
        assert(!table.classList.contains('anim-supernova-table'));

        reduced = true;
        await manager.spawnSupernova();
        assert.equal(body.children.length, 1);
        assert.equal(body.children[0].children[1].src, 'assets/effects/supernova/moon-plasma-v2.png');
        assert.equal(manager.timers.at(-1).delay, 1230);
        step(3000);
        manager.supernovaCanvasCleanup();
        assert.equal(body.children.length, 0);

        const pending = [];
        global.Image = class {
            set src(value) { this._src = value; pending.push(this); }
            get src() { return this._src; }
        };
        const cold = new Manager();
        global.activeSupernovaTheme = 'desert';
        const loading = cold.spawnSupernova();
        cold.supernovaRunId++;
        pending.forEach(image => image.onload());
        await loading;
        assert.equal(body.children.length, 0, 'late PNG cannot resurrect a stopped effect');
        console.log('Supernova runtime passed: ten unique PNGs, expanding plasma and shockwave, space dust, theme switch, reduced motion, cancellation.');
    } finally {
        Object.assign(global, prior);
        delete global.activeSupernovaTheme;
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
