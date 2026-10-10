const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative));
const source = relative => read(relative).toString('utf8');
const catalog = source('www/config.js').match(/SKINS:\s*\[([\s\S]*?)\]\s*,\s*EFFECTS:/);
assert(catalog, 'Skin catalog missing');
const ids = [...catalog[1].matchAll(/\bid:\s*'([^']+)'/g)].map(match => match[1]);
const manifest = JSON.parse(source('source-assets/dice-skins-v1/manifest.json'));
const definition = JSON.parse(source('docs/theme-definitions.json'));
const css = source('www/dice-skin-png.css');
const index = source('www/index.html');
const treasury = source('www/managers.js');
const game = source('www/game.js');
assert.equal(ids.length, 48);
assert.deepEqual(manifest.skins.map(item => item.id), ids);
assert.deepEqual(manifest.renderSize, [384, 384]);
assert(definition.universalDiceSkinRules.scope.includes('48 skinova'));
assert(index.indexOf('dice-skin-png.css') > index.indexOf('kockice.css'));
assert(treasury.includes("'<div class=\"dice-dot\"></div>'.repeat(6)"));
assert(!treasury.includes("visualHtml = `<div class=\"dice-preview preview-${item.id}\">⚅</div>`"));
assert(game.includes('dice-dots-wrapper val-'));
assert(game.includes('SHOP_DATA.SKINS.filter(item => item.themeGift)'));
assert(treasury.includes("item.themeGift && !this.unlocked.includes(itemId)"));
assert(treasury.includes('this.grantThemeDiceSkinForTheme(itemId)'));
assert(treasury.includes('this.grantThemeDiceSkinForTheme(item.id)'));
assert(treasury.includes("item.themeGift && !this.getOwnedThemeIds().includes(item.themeGift)"));
assert(game.includes('!this.isThemeUnlocked(themeId)'));
for (const retired of ['desert_glass', 'easter_neumorphic', 'severna_nebula']) {
    assert(!ids.includes(retired), `${retired} is still in Treasury`);
    assert(!css.includes(`.skin-${retired}`), `${retired} is still in runtime CSS`);
    assert(!manifest.skins.some(item => item.id === retired), `${retired} is still in manifest`);
    assert(!fs.existsSync(path.join(root, `www/assets/dice-skins-v1/${retired}-face-v1.png`)), `${retired} runtime PNG still exists`);
    assert(!fs.existsSync(path.join(root, `source-assets/dice-skins-v1/masters/${retired}-master-v1.png`)), `${retired} master PNG still exists`);
}

const giftEntries = [...catalog[1].matchAll(/\{\s*id:\s*'([^']+)'[^\r\n]*?\bthemeGift:\s*'([^']+)'[^\r\n]*/g)];
assert.equal(giftEntries.length, 10, 'Exactly one free gift per theme');
for (const entry of giftEntries) assert(/\bprice:\s*0\b/.test(entry[0]), `${entry[1]} must be free`);
const giftMap = Object.fromEntries(giftEntries.map(entry => [entry[2], entry[1]]));
assert.deepEqual(giftMap, definition.themeGiftDiceSkins.themeToSkin);
const themeDefs = Object.fromEntries(definition.themes.map(theme => [theme.id, theme]));

const hashes = new Set();
for (const item of manifest.skins) {
    assert.equal(item.style, '3D Soft Neomorphism', item.id);
    assert(['Clay', 'Smooth Rubber / Matte Plastic'].includes(item.direction), item.id);
    assert(fs.existsSync(path.join(root, item.master)), `Missing master ${item.id}`);
    const bytes = read(item.runtime);
    assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a', item.id);
    assert.equal(bytes.readUInt32BE(16), 384, item.id);
    assert.equal(bytes.readUInt32BE(20), 384, item.id);
    assert.equal(bytes[25], 6, `${item.id}: must be RGBA`);
    const hash = crypto.createHash('sha256').update(bytes).digest('hex');
    assert.equal(hash, item.sha256, item.id);
    hashes.add(hash);
    assert(css.includes(`.dice.skin-${item.id}`), `Missing gameplay CSS ${item.id}`);
    assert(css.includes(`.dice-preview.preview-${item.id}`), `Missing Treasury CSS ${item.id}`);
    assert(css.includes(`assets/dice-skins-v1/${item.id}-face-v1.png`), `Wrong runtime path ${item.id}`);
    if (item.themeGift) {
        assert.equal(item.themeGift, Object.keys(giftMap).find(theme => giftMap[theme] === item.id), item.id);
        assert.equal(item.direction === 'Clay', themeDefs[item.themeGift].direction === 'clay', `${item.id}: wrong theme direction`);
        if (item.themeGift !== 'dark') assert(item.master.startsWith('source-assets/theme-dice-skins-v1/masters/'), item.id);
    }
}
assert.equal(hashes.size, 48, 'A PNG was reused for another skin');
for (const [id, oldPath] of [['green_clay', 'www/assets/green-dice-pilot/green-clay-face-v1.png'], ['bronze_antique', 'www/assets/green-dice-pilot/bronze-antique-face-v1.png']]) {
    const item = manifest.skins.find(skin => skin.id === id);
    assert.deepEqual(read(item.runtime), read(oldPath), `${id} pilot changed`);
}
console.log('PASS: 48 distinct RGBA dice skins, 10 theme gifts gated by ownership, retired skins removed, shared gameplay/Treasury assets.');
