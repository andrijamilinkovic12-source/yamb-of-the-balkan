const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'www/managers.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'www/efekti.css'), 'utf8');
const start = source.indexOf('    loadIceAgeAssets() {');
const end = source.indexOf('    trigger(type) {', start);
assert(start > 0 && end > start, 'Cannot extract the active Ice Age implementation');
assert(source.includes("if (type === 'ice_age') this.spawnIceAge();"), 'Purchased effect must trigger the PNG runtime');
assert(source.includes("if (type === 'ice_age') this.loadIceAgeAssets()"), 'Equipped effect should preload both PNGs');
assert(!source.slice(start, end).includes('ice-age-chip'), 'Old falling frame chips are no longer active');
assert(css.includes('iceAgeFreeze') && css.includes('iceAgeCrack'), 'Ice must freeze before it cracks');

for (const name of ['frozen-board-v3.png', 'board-cracks-v3.png']) {
    const png = fs.readFileSync(path.join(root, 'www/assets/effects/ice-age', name));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${name} PNG signature`);
    assert.equal(png[25], 6, `${name} retains an alpha channel`);
    assert(png.readUInt32BE(16) >= 1000 && png.readUInt32BE(20) >= 1500, `${name} resolution`);
    assert(css.includes(name), `${name} is used in the live CSS`);
}

const IceManager = new Function(`return class {
    constructor() { this.iceAgeRunId = 0; this.iceAgeAssetsPromise = null; this.timers = []; }
    scheduleEffectTimeout(callback, delay) { this.timers.push({ callback, delay }); }
    ${source.slice(start, end)}
}`)();

function element(tag = 'div') {
    const classes = new Set();
    const node = {
        tag, children: [], parentNode: null,
        style: { setProperty(name, value) { this[name] = value; } },
        classList: { add(...names) { names.forEach(name => classes.add(name)); }, remove(...names) { names.forEach(name => classes.delete(name)); }, contains(name) { return classes.has(name); } },
        appendChild(child) { this.children.push(child); child.parentNode = this; return child; },
        remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(child => child !== this); this.parentNode = null; },
        set innerHTML(value) { this.html = value; }, get innerHTML() { return this.html; }
    };
    Object.defineProperty(node, 'className', { get() { return [...classes].join(' '); }, set(value) { classes.clear(); value.split(/\s+/).filter(Boolean).forEach(name => classes.add(name)); } });
    return node;
}

async function main() {
    const old = { document: global.document, window: global.window, Image: global.Image };
    let reducedMotion = false;
    const table = element();
    table.className = 'player-table';
    table.style.opacity = '1';
    table.style.borderColor = '';
    table.getBoundingClientRect = () => ({ left: 45, right: 345, top: 170, bottom: 720, width: 300, height: 550 });
    const body = element('body');
    global.document = {
        body, createElement: element,
        querySelectorAll(selector) {
            if (selector === '.player-table') return [table];
            if (selector === '.ice-overlay-container, .ice-age-atmosphere') return body.children.filter(node => node.classList.contains('ice-overlay-container') || node.classList.contains('ice-age-atmosphere'));
            return [];
        }
    };
    global.window = { matchMedia: () => ({ matches: reducedMotion }) };
    global.Image = class { set src(value) { this._src = value; queueMicrotask(() => this.onload?.()); } };
    try {
        const manager = new IceManager();
        await manager.spawnIceAge();
        assert.equal(table.children.length, 0, 'freeze overlay stays outside boards that clip children');
        assert.equal(body.children.length, 2, 'one atmosphere and one board overlay');
        assert(body.children[1].innerHTML.includes('ice-age-frost') && body.children[1].innerHTML.includes('ice-age-cracks'), 'frost and crack PNG layers are both present');
        assert.equal(body.children[1].style['--ice-width'], '300px', 'effect tracks actual board dimensions');
        assert.equal(manager.timers.length, 2, 'only fade and cleanup timers remain');
        manager.timers[0].callback();
        assert(body.children[1].classList.contains('ice-melting'), 'frozen board fades after cracking');
        manager.timers[1].callback();
        assert.equal(body.children.length, 0, 'effect cleans up');

        reducedMotion = true;
        manager.timers = [];
        await manager.spawnIceAge();
        assert.equal(manager.timers[1].delay, 2700, 'reduced motion ends promptly');
        manager.timers[1].callback();

        const pending = [];
        global.Image = class { set src(value) { pending.push(this); } };
        const coldManager = new IceManager();
        const load = coldManager.spawnIceAge();
        coldManager.iceAgeRunId++;
        pending.forEach(image => image.onload());
        await load;
        assert.equal(body.children.length, 0, 'late image load cannot restart a stopped effect');
        assert(source.includes('stop() {\n        this.iceAgeRunId++;'), 'stop invalidates pending loads');
        console.log('Ice Age runtime passed: transparent PNGs, full-board frost and cracks, fade, cleanup, reduced motion and cancellation.');
    } finally {
        global.document = old.document;
        global.window = old.window;
        global.Image = old.Image;
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
