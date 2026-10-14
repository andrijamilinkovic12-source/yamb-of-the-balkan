const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const dice = require(path.join(root, 'source-assets/dice-skins-v1/manifest.json'));
const buttons = require(path.join(root, 'source-assets/skin-action-buttons-v1/manifest.json'));
const manifest = require(path.join(root, 'source-assets/skin-roll-counter-v1/manifest.json'));
assert.equal(manifest.skins.length, dice.skins.length, 'Every dice skin needs a roll counter set');
assert.equal(manifest.skins.length, buttons.skins.length, 'Counter and button skin inventories differ');
const remaining = new Set(dice.skins.map(skin => skin.id));
const hashes = new Set();
const masterHashes = new Set();
for (const set of manifest.skins) {
    assert(remaining.delete(set.skinId), `Unexpected or repeated skin ${set.skinId}`);
    const face = dice.skins.find(skin => skin.id === set.skinId);
    const button = buttons.skins.find(skin => skin.id === set.skinId);
    assert.equal(set.direction, face.direction, `${set.skinId}: counter direction differs from dice`);
    assert.equal(set.direction, button.direction, `${set.skinId}: counter direction differs from buttons`);
    assert.equal(set.diceFace, face.runtime, `${set.skinId}: wrong dice face reference`);
    assert.equal(set.actionButton, button.states.announce.runtime, `${set.skinId}: wrong action button reference`);
    assert(fs.existsSync(path.join(root, set.master)), `${set.skinId}: missing unique master`);
    const masterHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, set.master))).digest('hex');
    assert(!masterHashes.has(masterHash), `${set.skinId}: copied master from another skin`);
    masterHashes.add(masterHash);
    for (let count = 0; count <= 3; count++) {
        const file = path.join(root, set.states[count]);
        const bytes = fs.readFileSync(file);
        assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${file}: PNG signature`);
        assert.equal(bytes.readUInt32BE(16), 256, `${file}: width`);
        assert.equal(bytes.readUInt32BE(20), 256, `${file}: height`);
        assert.equal(bytes[25], 6, `${file}: expected RGBA PNG`);
        const hash = crypto.createHash('sha256').update(bytes).digest('hex');
        assert(!hashes.has(hash), `${file}: duplicate PNG`);
        hashes.add(hash);
    }
}
assert.equal(remaining.size, 0, `Missing skins: ${[...remaining].join(', ')}`);

const attributes = new Map();
const label = {
    _textContent: '', child: null,
    set textContent(value) { this._textContent = value; this.child = null; },
    get textContent() { return this._textContent; },
    setAttribute: (key, value) => attributes.set(key, value),
    replaceChildren(image) { this._textContent = ''; this.child = image; }
};
let ready = null;
let skinChanged;
const scene = { getAttribute: name => name === 'data-action-skin-ready' ? ready : null };
class FakeObserver { constructor(callback) { skinChanged = callback; } observe() {} }
class FakeImage { set src(value) { this._src = value; } get src() { return this._src; } }
const context = vm.createContext({
    window: { app: { brojBacanja: 0 } },
    document: { getElementById: id => ({ 'lbl-status': label, 'game-scene': scene })[id] || null },
    MutationObserver: FakeObserver, Image: FakeImage, gt: () => 'BACANJE'
});
vm.runInContext(fs.readFileSync(path.join(root, 'www/skin-roll-counter-data.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'www/skin-roll-counter.js'), 'utf8'), context);
assert.equal(attributes.get('aria-label'), 'BACANJE: 0/3');
ready = 'classic_red';
skinChanged();
assert(label.child.src.endsWith('/classic_red-0-v1.png'));
for (let count = 1; count <= 3; count++) {
    context.window.app.brojBacanja = count;
    context.window.skinRollCounter.render(count);
    assert(label.child.src.endsWith(`/classic_red-${count}-v1.png`));
    assert.equal(attributes.get('aria-label'), `BACANJE: ${count}/3`);
}
ready = 'theme_neon_cyber';
skinChanged();
assert(label.child.src.endsWith('/theme_neon_cyber-3-v1.png'), 'Gift skin switch did not update the counter');
ready = null;
skinChanged();
assert.equal(label.child, null, 'Previous skin counter remains visible while the next skin loads');
assert.equal(label.textContent, '3/3');

const html = fs.readFileSync(path.join(root, 'www/index.html'), 'utf8');
for (const name of ['skin-roll-counter.css', 'skin-roll-counter-data.js', 'skin-roll-counter.js']) {
    assert(html.includes(name), `www/index.html does not load ${name}`);
}
assert(html.indexOf('skin-roll-counter-data.js') < html.indexOf('skin-action-buttons.js'),
    'Counter catalog must load before the button preload controller');
const css = fs.readFileSync(path.join(root, 'www/skin-roll-counter.css'), 'utf8');
assert(css.includes('#btn-najava {\n        flex: 2 1 0') && css.includes('#btn-bacaj { flex: 3 1 0'),
    'Mobile roll/announce button widths must remain 60/40');
assert(css.includes('transform: none !important'), 'Action buttons must stay fixed while pressed');
const buttonController = fs.readFileSync(path.join(root, 'www/skin-action-buttons.js'), 'utf8');
assert(buttonController.includes('window.SKIN_ROLL_COUNTER') && buttonController.includes('sourcesForSkin(id).map(preload)'),
    'Counter states must preload together with action buttons');
console.log(`Verified ${manifest.skins.length} skin counter sets, ${hashes.size} distinct PNG states, runtime 0→3, and skin switching.`);
