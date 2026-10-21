const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'www/managers.js'), 'utf8');
const prelude = source.slice(source.indexOf('const YAMB_THEME_IDS ='), source.indexOf('const filterYambThemeIds'));
const effectClass = source.slice(source.indexOf('class EffectManager {'), source.indexOf('class SoundManager {'));
assert(prelude.includes('GOLD_RAIN_THEME_PROFILES') && effectClass.includes('spawnGoldRain()'));

function harness(reducedMotion = false, { failParticle = false, failAll = false, width = 390 } = {}) {
    const nodes = [];
    const classes = new Set();
    const raf = new Map();
    const timeouts = new Map();
    const imagePaths = [];
    const observers = [];
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
            children: [],
            style: { properties: {}, setProperty(name, value) { this.properties[name] = value; } },
            setAttribute() {},
            appendChild(child) { child.parentNode = node; node.children.push(child); },
            classList: { add(name) { node.className += ` ${name}`; } },
            remove() {
                const index = nodes.indexOf(node);
                if (index >= 0) nodes.splice(index, 1);
                node.parentNode = null;
            }
        };
        return node;
    };
    const document = {
        body,
        documentElement: { dataset: { splashTheme: 'dark' }, classList: { remove() {} }, clientWidth: width, clientHeight: 844 },
        createElement: makeNode,
        getElementById() { return null; },
        querySelectorAll(selector) {
            const names = selector.split(',').map(item => item.trim().split('.').slice(1));
            return nodes.filter(node => names.some(parts => parts.every(part => node.className.split(/\s+/).includes(part))));
        }
    };
    const window = {
        innerWidth: width,
        innerHeight: 844,
        devicePixelRatio: 3,
        matchMedia() { return { matches: reducedMotion }; },
        addEventListener() {}, removeEventListener() {}
    };
    class Image {
        set src(value) {
            this._src = value;
            imagePaths.push(value);
            assert(fs.existsSync(path.join(root, 'www', value.split('?')[0])), `Missing canonical coin ${value}`);
            queueMicrotask(() => {
                if (failAll || (failParticle && value.includes('ducat-particle'))) this.onerror();
                else this.onload();
            });
        }
        get src() { return this._src; }
    }
    class MutationObserver {
        constructor(callback) { this.callback = callback; this.active = true; observers.push(this); }
        observe() {}
        disconnect() { this.active = false; }
    }
    const context = vm.createContext({
        document, window, Image, MutationObserver,
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
        effect, document, body, nodes, classes, raf, timeouts, imagePaths, observers,
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
        const layers = app.nodes.filter(node => node.className === 'gold-rain-particles');
        assert.equal(layers.length, 1, `${theme}: duplicate coin layer`);
        assert.equal(layers[0].children.length, 46, `${theme}: missing visible PNG coins`);
        assert(layers[0].children.every(node => node.tag === 'img' && node.src === app.imagePaths.at(-1)));
        const delays = layers[0].children.map(node => parseInt(node.style.properties['--fall-delay'], 10));
        assert(Math.min(...delays) < 490 && Math.max(...delays) >= 860, `${theme}: coins must arrive in staggered waves`);
        assert(layers[0].children.every(node => node.style.properties['--fall-quarter-drift'] !== undefined
            && node.style.properties['--fall-late-drift'] !== undefined), `${theme}: coins need a complete swaying fall`);
        assert(app.imagePaths.at(-1).includes(theme === 'dark' ? 'green-soft-clay/canonical/ducat' : `theme-packs/${theme}/canonical/ducat`));
        assert(app.nodes.some(node => node.className.includes('gold-rain-atmosphere--clear')), `${theme}: lighting obscures the canonical coins`);
        app.frame((index + 1) * 3000);
    }
    app.effect.stop();
    assert(!app.classes.has('fx-gold-rain'));
    assert.equal(app.nodes.filter(node => node.className.startsWith('gold-rain')).length, 0);
    assert.equal(app.raf.size, 0);

    const wide = harness(false, { width: 900 });
    await wide.effect.spawnGoldRain();
    assert.equal(wide.nodes.find(node => node.className === 'gold-rain-particles')?.children.length, 68,
        'Wide screens must use the same three-wave layout with 68 canonical ducats');
    wide.effect.stop();

    const reduced = harness(true);
    await reduced.effect.spawnGoldRain();
    assert.equal(reduced.nodes.find(node => node.className === 'gold-rain-static-coin')?.children.length, 3, 'Reduced motion must show three static canonical ducats');
    assert.equal(reduced.raf.size, 0, 'Reduced motion must not animate');
    reduced.effect.stop();

    const switcher = harness();
    await switcher.effect.spawnGoldRain();
    switcher.document.documentElement.dataset.splashTheme = 'neon';
    switcher.observers.filter(observer => observer.active).forEach(observer => observer.callback());
    assert(!switcher.classes.has('fx-gold-rain'), 'Switching theme must remove the old effect');
    assert.equal(switcher.nodes.filter(node => node.className.startsWith('gold-rain')).length, 0);
    const fallback = harness(false, { failParticle: true });
    await fallback.effect.spawnGoldRain();
    assert(fallback.nodes.find(node => node.className === 'gold-rain-particles')?.children.every(node => node.src.includes('ducat-front-v1.png')),
        'A failed particle sprite must fall back to the same theme canonical front');
    const absent = harness(false, { failAll: true });
    await absent.effect.spawnGoldRain();
    assert(!absent.classes.has('fx-gold-rain') && !absent.nodes.some(node => node.className.startsWith('gold-rain-atmosphere')),
        'Missing canonical PNGs must not leave a light-only effect');
    console.log('Gold Rain runtime passed: ten canonical PNG sets, visible DOM coin layers, cleanup, theme switch and reduced motion.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
