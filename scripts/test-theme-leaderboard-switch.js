const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

let active = 'easter';
const loads = [];
const icon = {
    dataset: { leaderboardControl: 'global' },
    isConnected: true,
    src: '',
    getClientRects() { return [{}]; },
    getAttribute(name) { return name === 'src' ? this.src : null; }
};
class PendingImage {
    set src(source) { this.source = source; loads.push(this); }
    decode() { return Promise.resolve(); }
}
const document = {
    readyState: 'complete',
    body: { classList: { contains: value => value === `${active}-theme` } },
    querySelectorAll: () => [icon],
    getElementById: () => ({})
};
const window = {};
class MutationObserver { observe() {} }
vm.runInNewContext(fs.readFileSync('www/theme-leaderboard-room.js', 'utf8'),
    { window, document, Image: PendingImage, MutationObserver });

(async () => {
    assert.equal(icon.dataset.leaderboardReady, 'false');
    active = 'neon';
    window.themeLeaderboard.apply();
    assert.equal(icon.dataset.leaderboardReady, 'false');
    for (const image of loads.filter(item => item.source.includes('/neon/'))) image.onload();
    await new Promise(resolve => setImmediate(resolve));
    assert.match(icon.src, /theme-packs\/neon\/canonical\/leaderboard-controls\/global-v2\.png/);
    assert.equal(icon.dataset.leaderboardReady, 'true');
    for (const image of loads.filter(item => item.source.includes('/easter/'))) image.onload();
    await new Promise(resolve => setImmediate(resolve));
    assert.match(icon.src, /theme-packs\/neon\//, 'An older theme must not overwrite the new icon');
    console.log('Leaderboard theme switch: old late PNG cannot replace the selected theme.');
})().catch(error => { console.error(error); process.exitCode = 1; });
