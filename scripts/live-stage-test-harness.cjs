const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

function makeHarness({ width = 390, height = 844, reduced = false, theme = 'dark', native } = {}) {
    const frames = new Map(), timers = new Map(), contexts = [];
    let id = 0;
    const fakeContext = () => {
        const calls = [];
        const gradient = () => ({ addColorStop() {} });
        const target = { calls, createRadialGradient: gradient, createLinearGradient: gradient,
            getImageData(x, y, w, h) {
                const data = new Uint8ClampedArray(w * h * 4);
                for (let yy = 20; yy < h - 20; yy++) for (let xx = 25; xx < w - 25; xx++) data[(yy * w + xx) * 4 + 3] = 255;
                return { data };
            }
        };
        return new Proxy(target, { get(object, key) {
            if (key in object) return object[key];
            return (...args) => calls.push([key, ...args.map(a => typeof a === 'number' ? Math.round(a * 100) / 100 : a)]);
        } });
    };
    const element = tag => {
        const classes = new Set();
        const node = { tag, children: [], parentNode: null, dataset: {}, textContent: '',
            style: { opacity: '1', borderColor: '', setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; } },
            classList: { add(...a) { a.forEach(v => classes.add(v)); }, remove(...a) { a.forEach(v => classes.delete(v)); }, contains(v) { return classes.has(v); } },
            appendChild(child) { this.children.push(child); child.parentNode = this; return child; },
            remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(v => v !== this); this.parentNode = null; },
            setAttribute(k, v) { this[k] = v; },
            get isConnected() { return Boolean(this.parentNode); }
        };
        Object.defineProperty(node, 'className', { set(value) { value.split(/\s+/).forEach(v => classes.add(v)); }, get() { return [...classes].join(' '); } });
        if (tag === 'canvas') {
            const backing = native?.createCanvas(1, 1);
            const ctx = backing ? backing.getContext('2d') : fakeContext();
            contexts.push(ctx);
            node.getContext = () => ctx;
            node.native = backing;
            for (const key of ['width', 'height']) Object.defineProperty(node, key, {
                get() { return backing ? backing[key] : this['_' + key]; },
                set(value) { if (backing) backing[key] = value; else this['_' + key] = value; }
            });
        }
        return node;
    };
    const body = element('body');
    const board = { left: width * 0.1, top: height * 0.15, width: width * 0.8, height: height * 0.7 };
    const table = element('table'); table.getBoundingClientRect = () => ({ ...board, right: board.left + board.width, bottom: board.top + board.height });
    const scores = Array.from({ length: 18 }, (_, i) => {
        const score = element('button'); score.textContent = String(20 + i);
        score.getBoundingClientRect = () => ({ left: board.left + (i % 6) * board.width / 6, top: board.top + Math.floor(i / 6) * 40 + 80, width: 40, height: 28 });
        return score;
    });
    table.querySelectorAll = () => scores;
    const document = { body, documentElement: element('html'), hidden: false,
        createElement: element, querySelector: () => table, querySelectorAll: selector => selector === '.player-table' ? [table] : [],
        getElementById: () => null, addEventListener() {}, removeEventListener() {} };
    const window = { innerWidth: width, innerHeight: height, devicePixelRatio: 1,
        matchMedia: query => ({ matches: query.includes('prefers-reduced-motion') ? reduced : width <= 760 }),
        addEventListener() {}, removeEventListener() {}, app: { playerName: 'Andrija' } };
    const pending = [];
    class Image {
        constructor() { this.naturalWidth = 576; this.naturalHeight = 260; }
        set src(source) { this._src = source; pending.push(this); queueMicrotask(() => this.onload?.()); }
        get src() { return this._src; }
        decode() { return Promise.resolve(); }
    }
    const managerSource = fs.readFileSync(path.join(root, 'www/managers.js'), 'utf8');
    const prelude = managerSource.slice(managerSource.indexOf('const YAMB_THEME_IDS ='), managerSource.indexOf('const filterYambThemeIds'));
    const context = vm.createContext({ console, document, window, Image, queueMicrotask, Uint8ClampedArray,
        localStorage: { getItem: key => key === 'yamb_theme' ? theme : null },
        requestAnimationFrame(callback) { frames.set(++id, callback); return id; }, cancelAnimationFrame(key) { frames.delete(key); },
        setTimeout(callback, delay) { timers.set(++id, { callback, delay }); return id; }, clearTimeout(key) { timers.delete(key); },
        MutationObserver: class { observe() {} disconnect() {} }
    });
    vm.runInContext(prelude + '\n' + fs.readFileSync(path.join(root, 'www/live-effects-stage.js'), 'utf8') +
        '\nthis.Stage = LiveEffectsStage; this.effectIds = LIVE_STAGE_EFFECT_IDS;', context);
    const effectClass = managerSource.slice(managerSource.indexOf('class EffectManager {'), managerSource.indexOf('class SoundManager {'));
    vm.runInContext(effectClass + '\nthis.Manager = EffectManager;', context);
    const owner = { getGoldRainThemeId: () => theme, getTargetTable: () => table, stageScene: null };
    if (native) context.Stage.preload = async (type, themeId) => Object.fromEntries(await Promise.all(
        Object.entries(context.Stage.sources(type, themeId)).map(async ([role, source]) => [role,
            await native.loadImage(path.join(root, 'www', source.split('?')[0]))])));
    return { Stage: context.Stage, Manager: context.Manager, effectIds: [...context.effectIds], owner, body, board, scores, contexts, frames, timers,
        setTheme(value) { theme = value; }, step(now) {
            const next = frames.entries().next().value;
            if (!next) throw new Error('No frame scheduled');
            frames.delete(next[0]); next[1](now);
        } };
}
module.exports = { makeHarness, root };
