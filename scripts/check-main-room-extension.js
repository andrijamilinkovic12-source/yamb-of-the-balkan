const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'www/index.html'), 'utf8');
const menu = html.slice(html.indexOf('id="main-menu"'), html.indexOf('id="quote-screen"'));
assert(menu.length > 0, 'Main menu not found');
assert(!/data-theme-src="assets\/(?:easter|desert|severna)-soft-clay\//.test(menu), 'Legacy themed menu image remains');
assert(!/class="special-svg-icon/.test(menu), 'Legacy Treasury or Tournament menu SVG remains');
for (const source of ['treasury-free-v3.png', 'champion-trophy-v1.png', 'ducats-undo-free-v3.png']) {
  assert(menu.includes(source), `Missing Green anchor for ${source}`);
}
const map = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-asset-implementation-map.json'), 'utf8'));
const slots = ['runtime/menu/treasury-free-v3', 'treasury-free-v3', 'canonical/tournament-awards/champion-trophy-v1', 'runtime/menu/ducats-undo-free-v3', 'ducats-undo-free-v3'];
for (const theme of map.themes) {
  for (const slotId of slots) {
    const slot = theme.slots[slotId];
    assert.equal(slot?.stage, 'linked', `Unlinked ${theme.themeId}/${slotId}`);
    assert(fs.existsSync(path.join(root, slot.productionPath)), `Missing ${slot.productionPath}`);
    assert(fs.existsSync(path.join(root, slot.masterPath)), `Missing ${slot.masterPath}`);
  }
  const companion = path.join(root, `www/assets/theme-packs/${theme.themeId}/canonical/tournament-awards/champion-trophy-room-v1.png`);
  assert(fs.existsSync(companion), `Missing ${companion}`);
}
const page = fs.readFileSync(path.join(root, 'docs/theme-main-room-icon-review.html'), 'utf8');
assert.equal((page.match(/data-room-extension="treasury"/g) || []).length, 9);
assert.equal((page.match(/data-room-extension="tournament"/g) || []).length, 9);
assert.equal((page.match(/data-room-extension="economy"/g) || []).length, 9);
console.log('PASS: nine themes, three new room roles, linked files and no legacy main-menu images.');
