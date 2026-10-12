const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.join(__dirname, '..');
const dice = JSON.parse(fs.readFileSync(path.join(root, 'source-assets/dice-skins-v1/manifest.json'), 'utf8'));
const buttons = JSON.parse(fs.readFileSync(path.join(root, 'source-assets/skin-action-buttons-v1/manifest.json'), 'utf8'));
const ids = new Set(dice.skins.map(skin => skin.id));
const hashes = new Map();
assert.equal(buttons.skins.length, ids.size, 'Every dice skin needs a button set');

for (const set of buttons.skins) {
    assert(ids.delete(set.id), `Unexpected or repeated skin ${set.id}`);
    for (const state of ['roll', 'announce', 'cancel']) {
        const asset = set.states[state];
        assert(asset && /^#[0-9a-f]{6}$/i.test(asset.ink), `${set.id}/${state}: missing ink`);
        const file = path.join(root, asset.runtime);
        const bytes = fs.readFileSync(file);
        assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${file}: PNG signature`);
        assert.equal(bytes.readUInt32BE(16), 768, `${file}: PNG width`);
        assert.equal(bytes.readUInt32BE(20), 240, `${file}: PNG height`);
        assert.equal(bytes[25], 6, `${file}: expected RGBA PNG`);
        const hash = crypto.createHash('sha256').update(bytes).digest('hex');
        assert(!hashes.has(hash), `${file}: duplicate of ${hashes.get(hash)}`);
        hashes.set(hash, file);
    }
}
assert.equal(ids.size, 0, `Missing skin sets: ${[...ids].join(', ')}`);

const html = fs.readFileSync(path.join(root, 'www/index.html'), 'utf8');
for (const name of ['skin-action-buttons.css', 'skin-action-buttons-data.js', 'skin-action-buttons.js']) {
    assert(html.includes(name), `www/index.html does not load ${name}`);
}
console.log(`Verified ${buttons.skins.length} skins and ${hashes.size} distinct RGBA PNG button assets.`);
