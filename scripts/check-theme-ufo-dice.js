/** Guard the exact face geometry used by all nine Treasury UFO previews. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { FACE_VALUES, PIPS, THEMES } = require('./build-theme-ufo-dice-previews');

const root = path.resolve(__dirname, '..');
const definitions = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-definitions.json'), 'utf8'));
const themeSkins = definitions.themeGiftDiceSkins.themeToSkin;
const grid = definitions.diceFaceRules.pipGridNormalized;
assert.deepEqual(FACE_VALUES, { top: 1, front: 2, right: 3 });
assert.equal(Object.keys(THEMES).length, 9);
for (const [theme, config] of Object.entries(THEMES)) {
  assert.equal(config.skin, themeSkins[theme], `${theme}: wrong gift skin`);
  assert.ok(fs.existsSync(path.join(root, 'source-assets/theme-icon-packs', theme,
    'treasury-effect-previews-v2/preview-ufo-abduction-background.png')));
  assert.ok(fs.existsSync(path.join(root, 'www/assets/dice-skins-v1', `${config.skin}-face-v1.png`)));
}
for (let value = 1; value <= 6; value++) {
  const points = grid[String(value)];
  assert.equal(points.length, value, `${value}: wrong pip count`);
  assert.equal(new Set(points.map(([x, y]) => `${x},${y}`)).size, value);
  for (const [x, y] of points) assert.ok(x > 0 && x < 1 && y > 0 && y < 1);
}
for (const value of [1, 2, 3]) assert.deepEqual(PIPS[value], grid[String(value)]);
console.log('PASS: nine gift skins, one rounded 3D cube, canonical top/front/right 1/2/3 pip layouts');
