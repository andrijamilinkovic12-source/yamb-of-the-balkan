const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative));
const source = read('www/managers.js').toString('utf8');
const css = read('www/efekti.css').toString('utf8');
const manifest = JSON.parse(read('source-assets/theme-live-black-hole-v1/manifest.json'));
const ids = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
assert.deepEqual(manifest.assets.map(asset => asset.theme), ids);
assert.equal(new Set(manifest.assets.map(asset => asset.sha256)).size, 10, 'each theme must have its own PNG');
for (const asset of manifest.assets) {
    const png = read(asset.productionPath);
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${asset.theme} PNG signature`);
    assert.equal(png[25], 6, `${asset.theme} PNG must retain alpha`);
    assert.equal(crypto.createHash('sha256').update(png).digest('hex'), asset.sha256, `${asset.theme} manifest hash`);
    assert(png.readUInt32BE(16) >= 1000 && png.readUInt32BE(20) >= 1000, `${asset.theme} size`);
}
assert(source.includes("if (type === 'black_hole') void this.spawnBlackHole()"));
assert(source.includes("if (type === 'black_hole') this.loadBlackHoleSprite"));
assert(!css.includes('bhTableSingularity') && !css.includes('.bh-starfield'), 'old violent board collapse and starfield must be gone');
assert(css.includes('scale(.975)') && css.includes('black-hole-sprite'), 'subtle board tug and PNG sprite must be active');
assert(css.includes('@keyframes bhStreamFlow') && css.includes('@keyframes bhLensWave')
    && css.includes('var(--bh-mid-x)') && css.includes('var(--bh-near-x)'),
    'independent orbit, lens and curved particle motion must be active');

function element(tag = 'div') {
    const classes = new Set();
    const node = {
        tag, children: [], parentNode: null, style: { setProperty(name, value) { this[name] = value; } },
        classList: { add(...names) { names.forEach(name => classes.add(name)); }, remove(...names) { names.forEach(name => classes.delete(name)); }, contains(name) { return classes.has(name); } },
        appendChild(child) { this.children.push(child); child.parentNode = this; return child; },
        append(...children) { children.forEach(child => this.appendChild(child)); },
        remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(child => child !== this); this.parentNode = null; },
        setAttribute() {},
        getBoundingClientRect() { return { left: 40, top: 120, width: 320, height: 520 }; }
    };
    Object.defineProperty(node, 'className', { get() { return [...classes].join(' '); }, set(value) { classes.clear(); value.split(/\s+/).filter(Boolean).forEach(name => classes.add(name)); } });
    return node;
}

const start = source.indexOf('    loadBlackHoleSprite(');
const end = source.indexOf('    trigger(type) {', start);
assert(start > 0 && end > start);
const prelude = source.slice(source.indexOf('const YAMB_THEME_IDS ='), source.indexOf('const filterYambThemeIds'));
const Manager = new Function(`${prelude}\nreturn class {
    constructor() { this.blackHoleRunId = 0; this.blackHoleSpritePromises = {}; this.blackHoleCleanup = null; this.timers = []; }
    getGoldRainThemeId() { return globalThis.activeBlackHoleTheme; }
    clearEffectTimeouts() { this.timers = []; }
    scheduleEffectTimeout(callback, delay) { this.timers.push({ callback, delay }); }
    ${source.slice(start, end)}
}`)();

async function main() {
    const previous = { document: global.document, window: global.window, Image: global.Image, MutationObserver: global.MutationObserver };
    const body = element('body');
    const table = element();
    table.className = 'player-table';
    table.style.opacity = '1';
    table.style.borderColor = '';
    let reduced = false;
    let observer;
    global.activeBlackHoleTheme = 'neon';
    global.document = { body, documentElement: element('html'), createElement: element, createDocumentFragment: () => element('fragment'), querySelectorAll: selector => selector === '.player-table' ? [table] : [] };
    global.window = { matchMedia: () => ({ matches: reduced }) };
    global.Image = class { set src(value) { this._src = value; queueMicrotask(() => this.onload?.()); } get src() { return this._src; } };
    global.MutationObserver = class { constructor(callback) { this.callback = callback; observer = this; } observe() {} disconnect() { this.disconnected = true; } fire() { this.callback(); } };
    try {
        const manager = new Manager();
        await manager.spawnBlackHole();
        assert.equal(body.children.length, 1, 'one scene appears');
        const scene = body.children[0];
        assert.equal(scene.children[1].children[0].src, 'assets/effects/black-hole/neon-core-v1.png');
        assert.equal(scene.children.length, 5, 'atmosphere, PNG orbit, two lens waves and particles');
        assert.equal(scene.children[1].children.length, 3, 'PNG with two independently moving streams');
        assert.equal(scene.children[4].children.length, 16, 'sixteen spiralling particles');
        assert.equal(scene.style['--bh-size'], '185.6px', 'sprite follows board width');
        assert.equal(scene.style['--bh-core-x'], '49%', 'moving orbit aligns with themed core');
        assert(table.classList.contains('anim-black-hole-table'));
        assert.equal(manager.timers[0].delay, 5800);
        global.activeBlackHoleTheme = 'moon';
        observer.fire();
        assert.equal(body.children.length, 0, 'theme switch clears the old image');
        assert(!table.classList.contains('anim-black-hole-table'));

        reduced = true;
        await manager.spawnBlackHole();
        assert.equal(body.children[0].children.length, 2, 'reduced motion has no particles');
        assert(!table.classList.contains('anim-black-hole-table'), 'reduced motion leaves the board still');
        assert.equal(manager.timers[0].delay, 2600);
        manager.timers[0].callback();
        assert.equal(body.children.length, 0);

        const pending = [];
        global.activeBlackHoleTheme = 'desert';
        global.Image = class { set src(value) { this._src = value; pending.push(this); } get src() { return this._src; } };
        const cold = new Manager();
        const load = cold.spawnBlackHole();
        cold.blackHoleRunId++;
        pending.forEach(image => image.onload());
        await load;
        assert.equal(body.children.length, 0, 'late load cannot restore a stopped effect');
        console.log('Black Hole runtime passed: ten unique transparent PNGs, theme switch, reduced motion and cancellation.');
    } finally {
        global.document = previous.document;
        global.window = previous.window;
        global.Image = previous.Image;
        global.MutationObserver = previous.MutationObserver;
        delete global.activeBlackHoleTheme;
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
