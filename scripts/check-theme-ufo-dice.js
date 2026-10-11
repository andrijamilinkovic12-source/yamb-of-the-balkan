/** Guard the exact face geometry used by all nine Treasury UFO previews. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { FACE_VALUES, PIPS, FACES, THEMES } = require('./build-theme-ufo-dice-previews');

const root = path.resolve(__dirname, '..');
const definitions = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-definitions.json'), 'utf8'));
const themeSkins = definitions.themeGiftDiceSkins.themeToSkin;
const grid = definitions.diceFaceRules.pipGridNormalized;
assert.deepEqual(FACE_VALUES, { front: 5, left: 3, bottom: 6 });
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
assert.deepEqual(PIPS[5], grid['5']);
assert.equal(PIPS[3].length, 3);
assert.deepEqual(PIPS[3][1], [0.5, 0.5]);
assert.equal(PIPS[3][0][0] + PIPS[3][2][0], 1);
assert.equal(PIPS[3][0][1] + PIPS[3][2][1], 1);
assert.notEqual(PIPS[3][0][0], PIPS[3][2][0]);
assert.notEqual(PIPS[3][0][1], PIPS[3][2][1]);
assert.equal(PIPS[6].length, 6);
assert.deepEqual([...new Set(PIPS[6].map(([x]) => x))], [0.27, 0.73]);
assert.deepEqual([...new Set(PIPS[6].map(([, y]) => y))], [0.22, 0.5, 0.78]);
const add = (a, b) => a.map((v, i) => v + b[i]);
assert.deepEqual(FACES.front.origin, add(FACES.left.origin, FACES.left.u));
assert.deepEqual(add(FACES.front.origin, FACES.front.v), FACES.bottom.origin);
assert.deepEqual(add(add(FACES.front.origin, FACES.front.u), FACES.front.v),
  add(FACES.bottom.origin, FACES.bottom.u));
console.log('PASS: nine gift skins, one physical 5/3/6 cube, exact diagonal 3 and two-column 6');
