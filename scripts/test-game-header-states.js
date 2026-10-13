const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../www/game.js'), 'utf8');
const classes = () => {
    const values = new Set();
    return {
        add: (...names) => names.forEach(name => values.add(name)),
        remove: (...names) => names.forEach(name => values.delete(name)),
        toggle: (name, on) => on ? values.add(name) : values.delete(name),
        contains: name => values.has(name)
    };
};
const eye = { classList: classes(), style: {}, title: '' };
const timer = { classList: classes(), style: {}, innerHTML: '' };
const context = {
    window: { themeOnlinePlayers: { asset: () => 'spectate-v1.png' } },
    document: { getElementById: id => ({ 'gh-spectator-icon': eye, 'turn-timer-display': timer }[id] || null) },
    t: key => ({ spectator_count: '{0} gledalaca', spectator_empty: 'Nema gledalaca', live_badge: 'UŽIVO', timeout_grace: 'Ističe...' }[key] || key),
    console, setTimeout, clearTimeout
};
vm.runInNewContext(source.replace('window.app = new YambApp();', 'globalThis.TestYambApp = YambApp;'), context);
const app = Object.create(context.TestYambApp.prototype);
app.isSpectator = false;
app.onlineMode = true;
app.gameActive = true;
app.currentPlayerIdx = 0;
app.myOnlineIndex = 0;
app.timeLeft = 90;
app.opponentReconnectNoticeVisible = false;
app.updateSpectatorIcon(0);
assert(eye.classList.contains('gh-btn-inactive'));
assert(!eye.classList.contains('gh-btn-active'));
app.updateSpectatorIcon(2);
assert(eye.classList.contains('gh-btn-active'));
assert(!eye.classList.contains('gh-btn-inactive'));
assert.equal(eye.style.filter, '', 'Old gold glow must not override theme glow');
assert(eye.title.includes('2'));
app.updateStatusLabel();
assert(timer.innerHTML.includes('90s'));
assert(!timer.classList.contains('timer-turn--urgent'));
app.timeLeft = 10;
app.updateStatusLabel();
assert(timer.innerHTML.includes('10s'));
assert(timer.classList.contains('timer-turn--urgent'));
app.timeLeft = 0;
app.updateStatusLabel();
assert(timer.innerHTML.includes('Ističe'));
assert(timer.classList.contains('timer-turn--expired'));
app.opponentReconnectNoticeVisible = true;
timer.classList.add('timer-turn--disconnected');
timer.innerHTML = 'Ponovno povezivanje';
app.updateStatusLabel();
assert.equal(timer.innerHTML, 'Ponovno povezivanje', 'Reconnect notice must remain visible');
app.opponentReconnectNoticeVisible = false;
app.isSpectator = true;
app.updateStatusLabel();
assert(timer.classList.contains('timer-turn--spectator'));
assert(!timer.classList.contains('timer-turn--urgent'));
assert(timer.innerHTML.includes('spectate-v1.png'));
console.log('Game header eye, live timer, urgent timer, reconnect and spectator states passed.');
