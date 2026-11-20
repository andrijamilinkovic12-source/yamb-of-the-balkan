'use strict';

// Real game methods and socket handlers with a deliberately throttled clock.
// No accounts, network, database, rewards or penalties are written.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../www/game.js'), 'utf8');
let now = 100000, sequence = 0;
const scheduled = new Map();
const schedule = (callback, ms, repeat) => {
    const id = ++sequence;
    scheduled.set(id, { callback, ms, repeat, due: now + ms });
    return id;
};
// Execute only once after a stall, just as a throttled WebView does.
const advance = ms => {
    now += ms;
    for (const [id, task] of [...scheduled]) {
        if (!scheduled.has(id) || task.due > now) continue;
        if (task.repeat) task.due = now + task.ms;
        else scheduled.delete(id);
        task.callback();
    }
};
const element = () => {
    const classes = new Set();
    return { style: {}, dataset: {}, hidden: true, textContent: '', innerHTML: '', disabled: false,
        setAttribute() {}, removeAttribute() {},
        replaceChildren() { this.textContent = ''; this.innerHTML = ''; },
        appendChild(child) { this.textContent += child.textContent; },
        classList: { add: (...names) => names.forEach(n => classes.add(n)),
            remove: (...names) => names.forEach(n => classes.delete(n)),
            toggle: (name, on) => on ? classes.add(name) : classes.delete(name),
            contains: name => classes.has(name) } };
};
const elements = Object.fromEntries(['turn-timer-display', 'game-connection-notice', 'game-scene', 'btn-bacaj', 'btn-najava'].map(id => [id, element()]));
const storage = new Map();
const context = {
    Date: class extends Date { static now() { return now; } },
    console: { log() {}, warn() {} },
    setInterval: (fn, ms) => schedule(fn, ms, true), clearInterval: id => scheduled.delete(id),
    setTimeout: (fn, ms) => schedule(fn, ms, false), clearTimeout: id => scheduled.delete(id),
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    document: { getElementById: id => elements[id] || null, createElement: () => element(), querySelector: () => null },
    window: { themeOnlinePlayers: { asset: () => 'fixture.png' } },
    t: key => ({ connection_paused_notice: 'Partija je pauzirana zbog prekida veze. Čekamo ponovno povezivanje.',
        connection_wait_short: 'Pauza', timeout_grace: 'Ističe...', live_badge: 'UŽIVO' }[key] || key)
};
vm.runInNewContext(source.replace('window.app = new YambApp();', 'globalThis.TestApp = YambApp;'), context);
const createApp = mode => {
    scheduled.clear();
    const hooks = new Map(), emitted = [];
    const app = Object.create(context.TestApp.prototype);
    Object.assign(app, { onlineMode: true, gameActive: true, isSpectator: false,
        roomId: `${mode}_timer_fixture`, onlineDuelType: mode, playerId: 'self', playerName: 'Self',
        currentPlayerIdx: 0, myOnlineIndex: 0, timeLeft: 90,
        socket: { connected: true, id: 'self-socket', on: (name, fn) => hooks.set(name, fn), off: name => hooks.delete(name),
            emit: (name, data) => emitted.push({ name, data }) },
        emitOnlinePresencePing() {}, updateTableVisuals() {}, updateDiceVisuals() {},
        highlightCurrentPlayer() {}, createScoreTables() {},
        requestOnlineStateSync(roomId) { emitted.push({ name: 'request_state_sync', data: { roomId } }); },
        setupRoomInviteListeners() {}, setupOnlineRecoveryListeners() {}
    });
    app.setupSocketListeners('Self');
    return { app, hooks, emitted };
};

for (const mode of ['random', 'friend_invite', 'challenge', 'tournament']) {
    const { app, hooks, emitted } = createApp(mode);
    Object.assign(app, { clearOnlineGameOverDelay() {}, updateQuickMenuIcons() {}, updateSpectatorIcon() {},
        resetTurnLogic() {}, loadEquippedEffect() {}, navigateTo() {}, effectMgr: { stop() {} },
        soundMgr: { playMusic() {} } });
    advance(2500); // Matching animation, or a replay-confirmation dialog.
    app.startGame({ skipQuote: true });
    assert(emitted.some(e => e.name === 'request_state_sync' && e.data.roomId === app.roomId),
        `${mode}: entering a match/replay must sync immediately, including the active player`);
    hooks.get('sync_state_response')({ roomId: app.roomId, currentPlayerIdx: 0,
        turnStartTime: 1000, serverNow: 3500, turnTimeLimitMs: 90000, turnTimerPaused: false });
    assert.equal(app.turnTimerDeadline, now + 87500, 'Entry delay must not grant a fresh local 90s');
    app.startClientTimer();
    const oldCallback = scheduled.get(app.turnTimerInterval).callback;
    advance(12500);
    assert.equal(app.timeLeft, 78, `${mode}: a 12.5s stall must consume real elapsed time`);
    app.startClientTimer(12.1);
    const deadline = app.turnTimerDeadline;
    oldCallback();
    assert.equal(app.turnTimerDeadline, deadline, 'Queued previous-turn callback cannot mutate the new timer');
    advance(500);
    app.startClientTimer((deadline - now) / 1000);
    assert.equal(app.turnTimerDeadline, deadline, 'Repeated sync must not round up and extend the deadline');
    advance(12000);
    assert(app.timeLeft === 0);
    assert(elements['turn-timer-display'].innerHTML.includes('Ističe'));

    app.currentPlayerIdx = 1;
    app.startClientTimer(2);
    advance(20000);
    assert.equal(app.timeLeft, -3);
    assert(emitted.some(e => e.name === 'request_state_sync'), 'Throttling must not skip the sync cadence');
    assert.equal(emitted.filter(e => e.name === 'check_timeout').length, 1);
    advance(1000);
    assert.equal(emitted.filter(e => e.name === 'check_timeout').length, 1, 'Timeout check must be rate limited');
    advance(2000);
    assert.equal(emitted.filter(e => e.name === 'check_timeout').length, 2);

    app.startClientTimer(45);
    const pausedCallback = scheduled.get(app.turnTimerInterval).callback;
    hooks.get('opponent_connection_lost')({ roomId: app.roomId, remainingMs: 30000 });
    assert(app.onlineTurnTimerPaused);
    assert.equal(app.turnTimerInterval, null);
    assert.equal(elements['btn-bacaj'].disabled, true);
    assert.equal(elements['btn-najava'].disabled, true);
    advance(1600);
    pausedCallback();
    assert.equal(app.timeLeft, 45, 'Turn timer must freeze during grace');
    assert.equal(elements['turn-timer-display'].textContent, '0:29');
    assert(!elements['game-connection-notice'].hidden);
    advance(30000);
    assert.equal(elements['turn-timer-display'].textContent, '0:00');
    assert(app.opponentReconnectNoticeVisible, 'Grace expiry must wait for the server result');
    assert(!elements['game-connection-notice'].hidden);

    hooks.get('opponent_connection_restored')({ roomId: app.roomId, restoredUid: 'self' });
    assert(elements['game-connection-notice'].hidden);
    assert.equal(app.turnTimerInterval, null, 'Do not restart before authoritative sync');
    hooks.get('sync_state_response')({ roomId: app.roomId, currentPlayerIdx: 1,
        turnStartTime: 1000, serverNow: 4250, turnTimeLimitMs: 12000, turnTimerPaused: false });
    assert.equal(app.timeLeft, 9);
    assert.equal(app.turnTimerDeadline, now + 8750);
    assert(!app.onlineTurnTimerPaused);
    advance(5000);
    assert.equal(app.timeLeft, 4);

    const timerId = app.turnTimerInterval;
    hooks.get('opponent_connection_lost')({ roomId: 'stale-room', remainingMs: 30000 });
    assert.equal(app.turnTimerInterval, timerId, 'Stale-room disconnect cannot pause the current duel');
    hooks.get('sync_state_response')({ roomId: app.roomId, turnTimerPaused: true, disconnectGraceRemainingMs: 5000 });
    assert.equal(elements['turn-timer-display'].textContent, '0:05');
    assert.equal(app.turnTimerInterval, null);
    app.startClientTimer(30);
    assert.equal(scheduled.size, 1, 'Recovery must leave one timer only');
    app.startClientTimer(90);
    assert.equal(scheduled.size, 1, 'New turn must replace the old interval');
    const callback = scheduled.get(app.turnTimerInterval).callback;
    app.roomId = 'another-room';
    const before = app.timeLeft;
    advance(15000);
    callback();
    assert.equal(app.timeLeft, before, 'An old room cannot change a new room timer');
}

for (const mode of ['Solo', 'Hotseat', 'AI', 'Daily']) {
    const { app } = createApp('random');
    app.startClientTimer();
    app.onlineMode = false;
    app.modeTag = mode;
    app.startClientTimer();
    assert.equal(app.turnTimerInterval, null);
    assert.equal(elements['turn-timer-display'].style.display, 'none');
    assert.equal(scheduled.size, 0, `${mode}: online timer must not leak into a local game`);
}
{
    const { app } = createApp('random');
    app.startClientTimer();
    app.isSpectator = true;
    app.startClientTimer();
    assert.equal(scheduled.size, 0);
    assert(elements['turn-timer-display'].classList.contains('timer-turn--spectator'));
    app.isSpectator = false;
    app.gameActive = false;
    app.startClientTimer();
    assert.equal(scheduled.size, 0);
    assert.equal(elements['turn-timer-display'].style.display, 'none');
    app.gameActive = true;
    app.showOpponentReconnectGraceCountdown({ remainingMs: 30000, noticeDelayMs: 1500 });
    app.clearOpponentReconnectGraceCountdown();
    advance(2000);
    assert.equal(scheduled.size, 0, 'Short recovered drop must not show a delayed notice');
    assert(elements['game-connection-notice'].hidden);
}
(async () => {
    for (const delayed of [false, true]) {
        const { app } = createApp('random');
        Object.assign(app, { clearOnlineGameOverDelay() {}, setInviteBusyState() {}, navigateTo() {} });
        app.showOpponentReconnectGraceCountdown({ remainingMs: 30000, noticeDelayMs: delayed ? 1500 : 0 });
        const queuedCallback = [...scheduled.values()][0].callback;
        await app.showMainMenu({ closedOnlineRoom: true, skipBackToMenu: true });
        queuedCallback();
        advance(2000);
        assert.equal(scheduled.size, 0, 'Exit must cancel the active grace timer and delayed notice');
        assert(elements['game-connection-notice'].hidden);
        assert.equal(app.roomId, null);
        assert.equal(app.gameActive, false);
    }
    console.log('PASS: deadline-based countdown, stalls, fractional server sync, stale callbacks/rooms, pause/recovery, grace expiry, menu cleanup and single-interval lifecycle in 4 online modes; no online timer in Solo/Hotseat/AI/Daily or spectator play.');
})().catch(error => { console.error(error); process.exitCode = 1; });
