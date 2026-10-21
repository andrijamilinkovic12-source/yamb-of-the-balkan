const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'www/managers.js'), 'utf8');
const prelude = source.slice(source.indexOf('const YAMB_THEME_IDS ='), source.indexOf('const filterYambThemeIds'));
const effectClass = source.slice(source.indexOf('class EffectManager {'), source.indexOf('class SoundManager {'));
assert(prelude.includes('GOLD_RAIN_THEME_PROFILES') && effectClass.includes('spawnGoldRain()'));

function harness(reducedMotion = false) {
    const nodes = [];
    const classes = new Set();
    const raf = new Map();
    const timeouts = new Map();
    const imagePaths = [];
    const draws = [];
    let nextId = 1;
    let now = 0;
    const classList = {
        add(...names) { names.forEach(name => classes.add(name)); },
        remove(...names) { names.forEach(name => classes.delete(name)); },
        contains(name) { return classes.has(name); }
    };
    const body = {
        classList,
        appendChild(node) { node.parentNode = body; nodes.push(node); }
    };
    const makeNode = tag => {
        const node = {
            tag,
            className: '',
            style: { setProperty() {} },
            classList: { add(name) { node.className += ` ${name}`; } },
            remove() {
                const index = nodes.indexOf(node);
                if (index >= 0) nodes.splice(index, 1);
                node.parentNode = null;
            }
        };
        if (tag === 'canvas') node.getContext = () => ({
            setTransform() {}, clearRect() {}, save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
            drawImage(...args) { draws.push(args); }, fillRect() {},
            createRadialGradient() { return { addColorStop() {} }; }
        });
        return node;
    };
    const document = {
        body,
        documentElement: { dataset: { splashTheme: 'dark' }, classList: { remove() {} }, clientWidth: 390, clientHeight: 844 },
        createElement: makeNode,
        getElementById() { return null; },
        querySelectorAll(selector) {
            const names = selector.split(',').map(item => item.trim().split('.').slice(1));
            return nodes.filter(node => names.some(parts => parts.every(part => node.className.split(/\s+/).includes(part))));
        }
    };
    const window = {
        innerWidth: 390,
        innerHeight: 844,
        devicePixelRatio: 3,
        matchMedia() { return { matches: reducedMotion }; },
        addEventListener() {}, removeEventListener() {}
    };
    class Image {
        set src(value) {
            imagePaths.push(value);
            assert(fs.existsSync(path.join(root, 'www', value.split('?')[0])), `Missing canonical coin ${value}`);
            queueMicrotask(() => this.onload());
        }
    }
    const context = vm.createContext({
        document, window, Image,
        localStorage: { getItem() { return null; } },
        dukatIconHtml() { return '<img class="dukat-icon-inline">'; },
        performance: { now() { return now; } },
        requestAnimationFrame(callback) { const id = nextId++; raf.set(id, callback); return id; },
        cancelAnimationFrame(id) { raf.delete(id); },
        setTimeout(callback) { const id = nextId++; timeouts.set(id, callback); return id; },
        clearTimeout(id) { timeouts.delete(id); }
    });
    vm.runInContext(`${prelude}\n${effectClass}\nthis.EffectManager = EffectManager;`, context);
    const effect = new context.EffectManager();
    return {
        effect, document, body, nodes, classes, raf, timeouts, imagePaths, draws,
        frame(at) {
            now = at;
            const callbacks = [...raf.values()];
            raf.clear();
            callbacks.forEach(callback => callback(at));
        }
    };
}

async function main() {
    const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
    const app = harness();
    for (const [index, theme] of themes.entries()) {
        app.document.documentElement.dataset.splashTheme = theme;
        await app.effect.spawnGoldRain();
        assert(app.classes.has('fx-gold-rain'), `${theme}: effect did not start`);
        assert.equal(app.nodes.filter(node => node.className === 'gold-rain-canvas').length, 1, `${theme}: duplicate canvas`);
        assert(app.imagePaths.at(-1).includes(theme === 'dark' ? 'green-soft-clay/canonical/ducat' : `theme-packs/${theme}/canonical/ducat`));
        const previousDraws = app.draws.length;
        app.frame((index + 1) * 3000);
        assert(app.draws.length > previousDraws, `${theme}: canonical coin was not drawn`);
    }
    app.effect.stop();
    assert(!app.classes.has('fx-gold-rain'));
    assert.equal(app.nodes.filter(node => node.className.startsWith('gold-rain')).length, 0);
    assert.equal(app.raf.size, 0);

    const reduced = harness(true);
    await reduced.effect.spawnGoldRain();
    assert.equal(reduced.draws.length, 3, 'Reduced motion must draw three static canonical ducats');
    assert.equal(reduced.raf.size, 0, 'Reduced motion must not animate');
    reduced.effect.stop();

    const switcher = harness();
    await switcher.effect.spawnGoldRain();
    switcher.document.documentElement.dataset.splashTheme = 'neon';
    switcher.frame(100);
    assert(!switcher.classes.has('fx-gold-rain'), 'Switching theme must remove the old effect');
    assert.equal(switcher.nodes.filter(node => node.className.startsWith('gold-rain')).length, 0);
    console.log('Gold Rain runtime passed: ten canonical ducats, one canvas, cleanup, theme switch and reduced motion.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
