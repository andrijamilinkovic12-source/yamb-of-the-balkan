'use strict';

// UI navigation contract for the real direct-challenge method, without accounts.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../www/game.js'), 'utf8');
let classes;
const context = {
    window: { showNotification() {} },
    document: { getElementById: () => ({ classList: { contains: name => classes.has(name), remove: name => classes.delete(name) } }) },
    t: key => key
};
vm.runInNewContext(source.replace('window.app = new YambApp();', 'globalThis.TestYambApp = YambApp;'), context);

async function check({ confirmed = true, result = { ok: true, leftMatchmaking: true }, started = false, changedScreen = false, initialClasses = ['active', 'is-random-online'] } = {}) {
    classes = new Set(initialClasses);
    const navigation = [], emits = [], notices = [];
    let rotationStops = 0;
    const app = Object.create(context.TestYambApp.prototype);
    Object.assign(app, {
        playerName: 'QA', gameActive: false, isSpectator: false,
        socket: { connected: true, emit: event => emits.push(event) },
        requireLogin: () => true,
        ensureSocketReadyForOnline: async () => ({ ok: true }),
        setupSocketListeners() {}, isDoNotDisturbActive: () => false,
        escapeHtml: value => value,
        modal: { confirm: async () => confirmed },
        emitSocketAck: async (event) => {
            emits.push(event);
            app.gameActive = started;
            if (changedScreen) classes = new Set(['active', 'is-friend-invite']);
            return result;
        },
        stopWaitingHofRotation() { rotationStops++; },
        navigateTo: screen => navigation.push(screen),
        showServerNotice: reason => notices.push(reason)
    });
    await app.challengePlayer('friend-socket', 'Friend');
    const shouldLeave = confirmed && result.ok && result.leftMatchmaking && !started && !changedScreen
        && initialClasses.includes('active') && initialClasses.includes('is-random-online');
    assert.deepEqual(navigation, shouldLeave ? ['main-menu'] : []);
    assert.equal(rotationStops, shouldLeave ? 1 : 0);
    assert.equal(classes.has('is-random-online'), changedScreen ? false : initialClasses.includes('is-random-online') && !shouldLeave);
    assert.deepEqual(emits, confirmed ? ['send_challenge'] : [], 'A waiting-screen transition must never emit back_to_menu and accidentally forfeit an accepted duel');
    assert.deepEqual(notices, confirmed && !result.ok ? [result.reason] : []);
}

(async () => {
    await check();
    await check({ confirmed: false });
    await check({ result: { ok: false, reason: 'err_player_busy' } });
    await check({ result: { ok: true } });
    await check({ started: true });
    await check({ changedScreen: true });
    await check({ initialClasses: [] });
    console.log('PASS: direct-invite queue exit, cancelled/failed/legacy replies, immediate game-start race and navigation race; no accidental match exit.');
})().catch(error => { console.error(error); process.exitCode = 1; });
