const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const style = fs.readFileSync(path.join(root, 'www', 'style.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'www', 'index.html'), 'utf8');
const game = fs.readFileSync(path.join(root, 'www', 'game.js'), 'utf8');
const languages = fs.readFileSync(path.join(root, 'www', 'languages.js'), 'utf8');

assert(/#rotate-lock-overlay\s*\{[^}]*position:\s*fixed;[^}]*inset:\s*0;[^}]*z-index:\s*2147483647;[^}]*display:\s*none;/s.test(style),
    'Portrait-only overlay must be a full-screen layer above every room and modal');
assert(/@media screen and \(orientation:\s*landscape\)\s*\{\s*#rotate-lock-overlay\s*\{\s*display:\s*flex\s*!important;\s*\}\s*\}/.test(style),
    'Landscape overlay must not depend on screen height or a particular room');
assert(!/@media[^{}]*max-height[^{}]*\{\s*#rotate-lock-overlay/.test(style),
    'Old short-landscape-only orientation rule is still present');
assert(/html\.portrait-orientation-active #rotate-lock-overlay\s*\{\s*display:\s*none\s*!important;\s*\}/.test(style)
    && /html\.landscape-orientation-active #rotate-lock-overlay\s*\{\s*display:\s*flex\s*!important;\s*\}/.test(style),
    'Physical orientation must override viewport changes caused by the keyboard');

const overlayStart = html.indexOf('<div id="rotate-lock-overlay"');
const firstRoom = html.indexOf('<div id="undo-menu-overlay"');
assert(overlayStart > 0 && firstRoom > overlayStart, 'Orientation overlay must be a global body child, not nested in a room');
assert(html.includes('role="alertdialog" aria-modal="true" aria-labelledby="rotate-lock-title"'),
    'Orientation notice needs a semantic title');
for (const key of ['rotate_msg', 'rotate_sub']) {
    assert(html.includes(`data-lang="${key}"`), `${key} missing from the overlay`);
    assert(languages.match(new RegExp(`"${key}"`, 'g'))?.length >= 2, `${key} must exist in both languages`);
}

const handlerStart = game.indexOf('    handleRotationLock() {');
const handlerEnd = game.indexOf('    checkForInvite() {', handlerStart);
assert(handlerStart >= 0 && handlerEnd > handlerStart, 'Global orientation handler missing');
const handler = game.slice(handlerStart, handlerEnd);
assert(handler.includes("matchMedia('(orientation: landscape)')") && handler.includes("physicalOrientation.startsWith('landscape')")
    && handler.includes("overlay.setAttribute('aria-hidden'"),
    'Orientation handler must update the accessibility state');
assert(!handler.includes('innerHeight <') && !handler.includes('overlay.style.display'),
    'Orientation handler must not reintroduce a height limit or fight CSS visibility');

console.log('Portrait lock checks passed: one global, localized overlay covers every landscape viewport and room.');
