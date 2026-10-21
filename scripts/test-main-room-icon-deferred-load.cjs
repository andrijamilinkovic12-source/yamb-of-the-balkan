const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('www/theme-main-room-icons.js', 'utf8');
const classes = initial => ({
    items: new Set(initial),
    contains(name) { return this.items.has(name); },
    toggle(name, enabled) { if (enabled) this.items.add(name); else this.items.delete(name); }
});
const menu = { id: 'main-menu', classList: classes([]) };
const room = {
    id: 'game-scene', classList: classes(['screen']),
    matches(selector) { return selector === '.screen.active' && this.classList.contains('active'); },
    querySelectorAll(selector) { return selector === 'img[data-theme-src]' ? [roomImage] : []; }
};
function image(screen) {
    const styles = new Map();
    const listeners = {};
    return {
        dataset: { themeSrc: 'assets/green-soft-clay/canonical/solo-room-identity/solo-room-v1.png' },
        parentElement: { classList: classes([]), querySelectorAll() { return []; } },
        classList: classes([]), complete: false, naturalWidth: 0,
        style: {
            getPropertyValue(name) { return styles.get(name)?.value || ''; },
            getPropertyPriority(name) { return styles.get(name)?.priority || ''; },
            setProperty(name, value, priority) { styles.set(name, { value, priority }); },
            removeProperty(name) { styles.delete(name); }
        },
        addEventListener(name, callback) { listeners[name] = callback; },
        fire(name) { listeners[name]?.(); },
        closest(selector) {
            if (selector === '.screen') return screen;
            if (selector === '#main-menu') return screen === menu ? menu : null;
            return null;
        },
        matches(selector) { return selector === 'img[data-theme-src]'; },
        getAttribute(name) { return name === 'src' ? this._src || null : null; },
        set src(value) { this._src = value; }
    };
}
const menuImage = image(menu);
const roomImage = image(room);
let observerCallback;
const document = {
    readyState: 'complete',
    body: { classList: classes(['neon-theme']) },
    documentElement: { dataset: { splashTheme: 'neon' } },
    querySelectorAll(selector) { return selector === 'img[data-theme-src]' ? [menuImage, roomImage] : []; }
};
vm.runInNewContext(source, {
    document, localStorage: { getItem() { return 'neon'; } },
    MutationObserver: class { constructor(callback) { observerCallback = callback; } observe() {} },
    Node: { ELEMENT_NODE: 1 }
});
assert(menuImage.getAttribute('src')?.includes('/neon/'), 'Menu icon should start loading');
assert.equal(roomImage.getAttribute('src'), null, 'Hidden room icon should remain dormant');
assert.equal(roomImage.style.getPropertyValue('visibility'), 'hidden');
room.classList.toggle('active', true);
observerCallback([{ type: 'attributes', target: room }]);
assert(roomImage.getAttribute('src')?.includes('/neon/'), 'Opening the room should load its own theme icon');
roomImage.complete = true;
roomImage.naturalWidth = 512;
roomImage.fire('load');
assert.equal(roomImage.style.getPropertyValue('visibility'), '', 'Loaded icon should become visible');
console.log('Hidden room icon defers until activation; menu icon loads immediately.');
