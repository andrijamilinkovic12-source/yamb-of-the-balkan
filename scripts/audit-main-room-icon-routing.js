const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repo = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(repo, 'www/index.html'), 'utf8');
const script = fs.readFileSync(path.join(repo, 'www/theme-main-room-icons.js'), 'utf8');
const themes = ['light','medium','winter','neon','amethyst','easter','desert','moon','severna'];
const menuStart = html.indexOf('id="main-menu"');
const menuEnd = html.indexOf('id="quote-screen"', menuStart);
assert(menuStart >= 0 && menuEnd > menuStart, 'Main menu boundaries missing');

const relevant = source => /canonical\/[a-z-]+-room-identity\/|(?:runtime\/menu\/)?(?:treasury|ducats-undo)-free-v3\.png|canonical\/tournament-awards\/champion-trophy-v1\.png/.test(source);
const htmlAnchors = [...html.matchAll(/<img\b[^>]*data-theme-src="(assets\/green-soft-clay\/[^\"]+)"[^>]*>/g)]
  .filter(match => relevant(match[1]))
  .map(match => ({ source:match[1], inMenu:match.index > menuStart && match.index < menuEnd }));
const dynamicAnchors = fs.readdirSync(path.join(repo, 'www')).filter(file => file.endsWith('.js'))
  .flatMap(file => [...fs.readFileSync(path.join(repo, 'www', file), 'utf8')
    .matchAll(/<img\b[^>]*data-theme-src="(assets\/green-soft-clay\/[^\"]+)"[^>]*>/g)]
    .filter(match => relevant(match[1]))
    .map(match => ({ source:match[1], inMenu:false, file })));
const anchors = [...htmlAnchors, ...dynamicAnchors];
assert(dynamicAnchors.length >= 9, 'Expected dynamic room headers and tournament symbols');
assert.equal(htmlAnchors.filter(anchor => anchor.inMenu).length, 14, 'Expected fourteen menu anchors plus league watermark');
assert(anchors.some(anchor => anchor.source.includes('treasury-free-v3') && !anchor.inMenu), 'Treasury room anchor missing');
assert(anchors.some(anchor => anchor.source.includes('champion-trophy-v1') && !anchor.inMenu), 'Tournament room anchor missing');
assert(anchors.some(anchor => anchor.source.includes('ducats-undo-free-v3') && anchor.inMenu), 'Economy entrance anchor missing');

class ClassList {
  constructor(values = []) { this.values = new Set(values); }
  contains(value) { return this.values.has(value); }
  toggle(value, force) { force ? this.values.add(value) : this.values.delete(value); }
}

function expectedPath(theme, anchor) {
  const green = anchor.source;
  const room = !anchor.inMenu;
  const canonical = green.match(/canonical\/([a-z-]+)-room-identity\//);
  if (canonical) return `assets/theme-packs/${theme}/canonical/${canonical[1]}-room-identity/${canonical[1]}-room${room ? '' : '-menu'}-v1.png`;
  if (green.includes('treasury-free-v3')) return `assets/theme-packs/${theme}/${room ? '' : 'runtime/menu/'}treasury-free-v3.png`;
  if (green.includes('ducats-undo-free-v3')) return `assets/theme-packs/${theme}/${room ? '' : 'runtime/menu/'}ducats-undo-free-v3.png`;
  if (green.includes('champion-trophy-v1')) return `assets/theme-packs/${theme}/canonical/tournament-awards/champion-trophy${room ? '-room' : ''}-v1.png`;
  throw new Error(`Unexpected anchor ${green}`);
}

function pngSize(filename) {
  const bytes = fs.readFileSync(filename);
  assert.equal(bytes.subarray(1,4).toString(), 'PNG', `Invalid PNG ${filename}`);
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

for (const theme of themes) {
  const images = anchors.map(anchor => {
    const host = { classList:new ClassList(), querySelectorAll:() => [] };
    return {
      anchor, dataset:{ themeSrc:anchor.source }, parentElement:host,
      classList:new ClassList(), attributes:{},
      matches:selector => selector === 'img[data-theme-src]',
      closest:selector => selector === '#main-menu' && anchor.inMenu ? {} : null,
      getAttribute(name) { return this.attributes[name] || null; },
      set src(value) { this.attributes.src = value; }
    };
  });
  const body = { classList:new ClassList([`${theme}-theme`]) };
  const document = {
    readyState:'complete', body,
    documentElement:{ dataset:{ splashTheme:theme } },
    querySelectorAll:selector => selector === 'img[data-theme-src]' ? images : [],
    querySelector:() => null
  };
  vm.runInNewContext(script, {
    document, localStorage:{ getItem:() => theme },
    MutationObserver:class { observe() {} }, Node:{ ELEMENT_NODE:1 }
  }, { filename:'theme-main-room-icons.js' });
  for (const image of images) {
    const expected = expectedPath(theme, image.anchor);
    const actual = image.getAttribute('src');
    assert.equal(actual, expected, `${theme}: wrong destination for ${image.anchor.source}`);
    assert(image.classList.contains('theme-main-room-icon'), `${theme}: missing icon class for ${actual}`);
    assert(image.parentElement.classList.contains('theme-main-room-icon-host'), `${theme}: missing host class for ${actual}`);
    const file = path.join(repo, 'www', actual);
    assert(fs.existsSync(file), `${theme}: missing runtime file ${actual}`);
    const required = image.anchor.inMenu ? 384 : 512;
    assert.deepEqual(pngSize(file), [required, required], `${theme}: wrong size for ${actual}`);
  }
  const watermark = path.join(repo, `www/assets/theme-packs/${theme}/canonical/quarterly-league-room-identity/quarterly-league-room-menu-v1.png`);
  assert(fs.existsSync(watermark), `${theme}: missing league watermark`);
  assert.deepEqual(pngSize(watermark), [384,384]);
}
console.log(`PASS: ${themes.length} themes, ${htmlAnchors.length} static and ${dynamicAnchors.length} dynamic anchors per theme, 15 menu roles including league, correct paths and PNG sizes.`);
