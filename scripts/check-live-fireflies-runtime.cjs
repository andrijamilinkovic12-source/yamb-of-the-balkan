const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'www/managers.js'), 'utf8');
const prelude = source.slice(source.indexOf('const YAMB_THEME_IDS ='), source.indexOf('const filterYambThemeIds'));
const effectClass = source.slice(source.indexOf('class EffectManager {'), source.indexOf('class SoundManager {'));
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'source-assets/theme-live-fireflies-v1/manifest.json'), 'utf8'));
const bubbleManifest = JSON.parse(fs.readFileSync(path.join(root, 'source-assets/theme-live-bubbles-v1/manifest.json'), 'utf8'));
assert.deepEqual(Object.keys(manifest.themes).sort(), [...themes].sort(), 'Every theme needs an original firefly PNG');
assert.equal(new Set(Object.values(manifest.themes).map(item => item.sourceSha256)).size, 10,
    'Firefly masters must be independently drawn, not recolored copies');
for (const item of Object.values(manifest.themes)) {
    assert(fs.existsSync(path.join(root, item.source)) && fs.existsSync(path.join(root, item.sprite)));
    assert(fs.existsSync(path.join(root, item.treasuryPreview)) && fs.existsSync(path.join(root, item.treasuryThumbnail)));
}
assert.deepEqual(Object.keys(bubbleManifest.themes).sort(), [...themes].sort(), 'Every theme needs an original bubble PNG');
assert.equal(new Set(Object.values(bubbleManifest.themes).map(item => item.sourceSha256)).size, 10,
    'Bubble masters must be independently drawn, not recolored copies');
for (const item of Object.values(bubbleManifest.themes)) {
    assert(fs.existsSync(path.join(root, item.source)) && fs.existsSync(path.join(root, item.sprite)));
    assert(fs.existsSync(path.join(root, item.treasuryPreview)) && fs.existsSync(path.join(root, item.treasuryThumbnail)));
}

function harness({ width = 390, reducedMotion = false, missing = false } = {}) {
    const nodes = [];
    const timers = new Map();
    const observers = [];
    let nextTimer = 1;
    const classes = new Set();
    const makeNode = tag => ({
        tag, className: '', children: [], attributes: {}, parentNode: null,
        style: { values: {}, setProperty(name, value) { this.values[name] = value; } },
        setAttribute(name, value) { this.attributes[name] = value; },
        appendChild(child) { this.children.push(child); child.parentNode = this; },
        append(...children) { children.forEach(child => this.appendChild(child)); },
        remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(child => child !== this); this.parentNode = null; }
    });
    const body = makeNode('body');
    body.classList = {
        contains(name) { return classes.has(name); },
        add(name) { classes.add(name); },
        remove(name) { classes.delete(name); }
    };
    const documentElement = { dataset: { splashTheme: 'dark' }, classList: { remove() {} } };
    const document = {
        body, documentElement,
        createElement: makeNode,
        createDocumentFragment: () => makeNode('fragment'),
        getElementById: () => null,
        querySelectorAll(selector) {
            const names = selector.split(',').map(item => item.trim().slice(1));
            const walk = node => [node, ...node.children.flatMap(walk)];
            return walk(body).filter(node => names.some(name => node.className.split(/\s+/).includes(name)));
        }
    };
    class Image {
        set src(value) {
            this._src = value;
            if (!missing) assert(fs.existsSync(path.join(root, 'www', value)), `Missing PNG ${value}`);
            queueMicrotask(() => (missing ? this.onerror : this.onload)());
        }
        get src() { return this._src; }
    }
    class MutationObserver {
        constructor(callback) { this.callback = callback; this.active = true; observers.push(this); }
        observe() {}
        disconnect() { this.active = false; }
    }
    const window = {
        innerWidth: width,
        matchMedia(query) { return { matches: query.includes('reduced-motion') ? reducedMotion : width <= 760 }; },
        addEventListener() {}, removeEventListener() {}
    };
    const context = vm.createContext({
        document, window, Image, MutationObserver,
        localStorage: { getItem() { return null; } },
        setTimeout(callback) { const id = nextTimer++; timers.set(id, callback); return id; },
        clearTimeout(id) { timers.delete(id); },
        requestAnimationFrame() { return 1; }, cancelAnimationFrame() {},
        dukatIconHtml() { return ''; }
    });
    vm.runInContext(`${prelude}\n${effectClass}\nthis.EffectManager = EffectManager;`, context);
    const effect = new context.EffectManager();
    effect.getEffectSurfaceTone = () => 'dark';
    const sprites = () => document.querySelectorAll('.magic-firefly__sprite');
    return { effect, document, window, observers, timers, sprites, fields: () => document.querySelectorAll('.firefly-field') };
}

async function main() {
    const app = harness();
    for (const theme of themes) {
        app.document.documentElement.dataset.splashTheme = theme;
        await app.effect.spawnFireflies();
        assert.equal(app.fields().length, 1, `${theme}: duplicate overlay`);
        assert.equal(app.sprites().length, 20, `${theme}: mobile sprite count`);
        const expected = theme === 'dark' ? 'green-soft-clay' : `theme-packs/${theme}`;
        assert(app.sprites().every(sprite => sprite.src.includes(expected) && sprite.src.endsWith('/effects/firefly-v1.png')),
            `${theme}: wrong theme sprite`);
        assert(app.document.querySelectorAll('.magic-firefly__halo').length === 20, `${theme}: missing themed light`);
        assert(app.document.querySelectorAll('.magic-firefly__light').length === 0, `${theme}: old CSS dots remain`);
        const fly = app.document.querySelectorAll('.magic-firefly')[0];
        assert(fly.style.values['--ff-dx-c'] && fly.style.values['--ff-dy-c'] && fly.style.values['--ff-flap'],
            `${theme}: direction or wing motion missing`);
    }
    app.document.documentElement.dataset.splashTheme = 'dark';
    app.observers.filter(observer => observer.active).forEach(observer => observer.callback());
    assert.equal(app.fields().length, 0, 'Theme switch must remove old fireflies');

    const wide = harness({ width: 900 });
    await wide.effect.spawnFireflies();
    assert.equal(wide.sprites().length, 28, 'Wide screen count');
    wide.effect.stop();
    assert.equal(wide.fields().length, 0, 'Stop must clear field');
    assert(wide.observers.every(observer => !observer.active), 'Stop must disconnect observer');

    const reduced = harness({ reducedMotion: true });
    await reduced.effect.spawnFireflies();
    assert.equal(reduced.sprites().length, 3, 'Reduced motion uses three static sprites');
    assert(reduced.fields()[0].className.includes('firefly-field--reduced'));
    reduced.effect.stop();

    const absent = harness({ missing: true });
    await absent.effect.spawnFireflies();
    assert.equal(absent.fields().length, 0, 'Missing PNG must not show generic CSS dots');

    const bubbles = harness();
    for (const theme of themes) {
        bubbles.document.documentElement.dataset.splashTheme = theme;
        await bubbles.effect.spawnBubbles();
        const fields = bubbles.document.querySelectorAll('.bubble-field');
        const sprites = bubbles.document.querySelectorAll('.magic-bubble');
        assert.equal(fields.length, 1, `${theme}: duplicate bubble field`);
        assert.equal(sprites.length, 24, `${theme}: mobile bubble count`);
        const expected = theme === 'dark' ? 'green-soft-clay' : `theme-packs/${theme}`;
        assert(sprites.every(sprite => sprite.tag === 'img' && sprite.src.includes(expected)
            && sprite.src.endsWith('/effects/bubble-v1.png')), `${theme}: wrong theme bubble PNG`);
        for (const size of ['small', 'medium', 'large']) {
            assert.equal(sprites.filter(sprite => sprite.className.includes(`magic-bubble--${size}`)).length, 8,
                `${theme}: missing ${size} bubbles`);
        }
        assert(sprites.every(sprite => sprite.style.values['--bubble-duration']
            && sprite.style.values['--bubble-drift-c']), `${theme}: motion variables missing`);
    }
    bubbles.document.documentElement.dataset.splashTheme = 'dark';
    bubbles.observers.filter(observer => observer.active).forEach(observer => observer.callback());
    assert.equal(bubbles.document.querySelectorAll('.bubble-field').length, 0,
        'Theme switch must remove old bubble field');

    const wideBubbles = harness({ width: 900 });
    await wideBubbles.effect.spawnBubbles();
    assert.equal(wideBubbles.document.querySelectorAll('.magic-bubble').length, 35, 'Wide bubble count');
    wideBubbles.effect.stop();
    assert.equal(wideBubbles.document.querySelectorAll('.bubble-field').length, 0, 'Stop must remove bubbles');

    const stillBubbles = harness({ reducedMotion: true });
    await stillBubbles.effect.spawnBubbles();
    assert.equal(stillBubbles.document.querySelectorAll('.magic-bubble').length, 3, 'Reduced motion uses three static PNGs');
    assert(stillBubbles.document.querySelectorAll('.bubble-field')[0].className.includes('bubble-field--reduced'));
    stillBubbles.effect.stop();

    const missingBubbles = harness({ missing: true });
    await missingBubbles.effect.spawnBubbles();
    assert.equal(missingBubbles.document.querySelectorAll('.bubble-field').length, 0,
        'Missing PNG must not show emoji bubbles');
    console.log('Live effects passed: 10 firefly and 10 bubble PNG themes, three bubble sizes, theme switch, stop and reduced motion.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
