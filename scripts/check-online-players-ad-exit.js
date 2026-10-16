const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'www', 'onlinenumber.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'www', 'index.html'), 'utf8');
const start = source.indexOf('window.closeOnlinePlayersModal = function(options = {}) {');
const end = source.indexOf('window.refreshOnlinePlayersModal = function()', start);
assert(start >= 0 && end > start, 'Zatvaranje Online igrača nije pronađeno');
assert(html.includes('window.closeOnlinePlayersModal({ showAd: true })'), 'Dugme za izlaz mora tražiti oglas');

let now = 100000;
let shows = 0;
const overlay = { style: { display: 'flex' } };
const context = {
    window: { app: { adMob: { showInterstitial: async () => { shows++; return true; } } } },
    document: { getElementById: id => id === 'online-players-overlay' ? overlay : null },
    Date: { now: () => now },
    isOnlinePlayersModalOpen: () => overlay.style.display !== 'none',
    stopOnlinePlayersAutoRefresh() {},
    cleanupOnlinePlayersSocketListeners() {},
    clearTimeout() {},
    onlinePlayersOpenedAt: 0,
    onlinePlayersSearchTimer: null,
    onlinePlayersRenderCurrent: null
};
vm.createContext(context);
vm.runInContext(source.slice(start, end), context);

context.onlinePlayersOpenedAt = now - 9000;
context.window.closeOnlinePlayersModal();
assert.equal(shows, 0, 'Ulazak u meč ili posmatranje ne sme otvoriti oglas');

overlay.style.display = 'flex';
context.onlinePlayersOpenedAt = now - 3000;
context.window.closeOnlinePlayersModal({ showAd: true });
assert.equal(shows, 0, 'Kratko otvaranje sobe ne sme otvoriti oglas');

overlay.style.display = 'flex';
context.onlinePlayersOpenedAt = now - 9000;
context.window.closeOnlinePlayersModal({ showAd: true });
assert.equal(shows, 1, 'Izlazak posle pregleda sobe treba da zatraži jedan oglas');
context.window.closeOnlinePlayersModal({ showAd: true });
assert.equal(shows, 1, 'Ponovljeno zatvaranje ne sme zatražiti drugi oglas');

console.log('Online players exit checks passed: game transitions, quick exit, deliberate exit, duplicate close.');
