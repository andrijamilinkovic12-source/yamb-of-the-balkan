const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const repo = path.resolve(__dirname, '..');
const code = fs.readFileSync(path.join(repo, 'www/theme-rewarded-video-pack.js'), 'utf8');
const themes = ['light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const roles = [
  'canonical/rewarded-video/rewarded-video-active-v1.png',
  'canonical/rewarded-video/rewarded-video-active-inline-v1.png',
  'canonical/rewarded-video/rewarded-video-unavailable-v1.png',
  'canonical/rewarded-video/rewarded-video-unavailable-inline-v1.png',
  'daily/reward-video-v3.png',
  'treasury/reward-video-v3.png',
  'solo/finish-reward-video-v3.png'
];
const expectedSizes = [256, 128, 256, 128, 384, 256, 384];
const consumers = [
  ['www/index.html', roles[0]], ['www/pravilaigre.js', roles[1]],
  ['www/index.html', roles[2]], ['www/pravilaigre.js', roles[3]],
  ['www/dnevniizazov.js', roles[4]], ['www/index.html', roles[5]],
  ['www/index.html', roles[6]]
];
for (const [file, role] of consumers) {
  const source = fs.readFileSync(path.join(repo, file), 'utf8');
  assert(source.includes(`assets/green-soft-clay/${role}`), `Missing runtime anchor ${file}: ${role}`);
}
class Classes {
  constructor(values = []) { this.values = new Set(values); }
  contains(value) { return this.values.has(value); }
  toggle(value, enabled) { enabled ? this.values.add(value) : this.values.delete(value); }
  add(value) { this.values.add(value); }
}
function pngSize(filename) {
  const bytes = fs.readFileSync(filename);
  assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a');
  assert.equal(bytes[25], 6, `Expected RGBA: ${filename}`);
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}
for (const theme of themes) {
  const images = roles.map(relative => {
    const image = {
      dataset: { themeSrc: `assets/green-soft-clay/${relative}?v=1` },
      classList: new Classes(), attributes: {},
      getAttribute(name) { return this.attributes[name] || null; },
      set src(value) { this.attributes.src = value; }
    };
    const legacy = { dataset: { themeSrc: 'assets/easter-soft-clay/economy/rewarded-video.png' }, classList: new Classes() };
    image.parentElement = { querySelectorAll: () => [image, legacy], legacy };
    return image;
  });
  const body = { classList: new Classes([`${theme}-theme`]) };
  const document = {
    readyState: 'complete', body, documentElement: { dataset: { splashTheme: theme } },
    querySelectorAll: selector => selector === 'img[data-theme-src]' ? images : []
  };
  vm.runInNewContext(code, { document, localStorage: { getItem: () => theme },
    MutationObserver: class { observe() {} }, Node: { ELEMENT_NODE: 1 } });
  assert(body.classList.contains('theme-rewarded-video-pack-active'));
  images.forEach((image, index) => {
    const actual = image.getAttribute('src');
    const expected = `assets/theme-packs/${theme}/${roles[index]}`;
    assert.equal(actual, expected, `${theme} ${roles[index]}`);
    assert(image.classList.contains('theme-rewarded-video-icon'));
    assert(image.parentElement.legacy.classList.contains('theme-rewarded-video-legacy'));
    const filename = path.join(repo, 'www', actual);
    assert(fs.existsSync(filename), `Missing ${filename}`);
    assert.deepEqual(pngSize(filename), [expectedSizes[index], expectedSizes[index]]);
  });
}
console.log('PASS: 9 themes × 7 mapped rewarded-video roles, correct PNG paths, RGBA and sizes.');
