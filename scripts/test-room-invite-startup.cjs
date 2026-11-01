const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../www/game.js'), 'utf8');
const events = ['incoming_room_invite', 'room_invite_accepted', 'room_invite_declined', 'room_invite_busy', 'room_invite_expired'];
const listeners = new Map();
const socket = {
    connected: true,
    on(event, callback) {
        if (!listeners.has(event)) listeners.set(event, []);
        listeners.get(event).push(callback);
        return this;
    },
    off(event) { listeners.delete(event); return this; }
};
const notices = [], responses = [], prompts = [];
const browser = {
    location: { origin: 'http://localhost' },
    showNotification: (...args) => notices.push(args)
};
const storage = { getItem: () => 'moon' };
function method(name, nextName) {
    const start = source.indexOf(`    ${name}(`);
    const end = source.indexOf(`\n    ${nextName}(`, start);
    assert.ok(start >= 0 && end > start, `Missing method ${name}`);
    return new Function('io', 'window', 'localStorage', 'gt', 'getFallbackPlayerName',
        `return ({${source.slice(start, end)}}).${name};`
    )(() => socket, browser, storage, () => '', () => 'Player');
}
const app = {
    bindConnectionDiagnosticListeners() {},
    modal: { confirm: async text => { prompts.push(text); return false; } },
    isDoNotDisturbActive: () => false,
    escapeHtml: value => value,
    emitSocketAck: async (event, data) => { responses.push({ event, data }); return { ok: true }; },
    setInviteBusyState() {},
    setupOnlineRecoveryListeners() {},
    getMainRoomPackSource: theme => `canonical/${theme}/invite.png`,
    navigateTo() { throw Error('Declined invite must not navigate'); },
    joinPrivateGame() { throw Error('Declined invite must not start a game'); }
};
if (source.includes('    setupRoomInviteListeners(')) {
    app.setupRoomInviteListeners = method('setupRoomInviteListeners', 'setupSocketListeners');
}
const init = method('initSocketConnection', 'async authenticateSocketIdentity');
(async () => {
    init.call(app);
    for (const event of events) {
        assert.equal(listeners.get(event)?.length, 1, `${event} must work immediately after startup, before opening a game or friend room`);
    }
    init.call(app);
    app.setupRoomInviteListeners();
    method('setupSocketListeners', 'isOnlineRecoveryEventRelevant').call(app, 'Player');
    for (const event of events) assert.equal(listeners.get(event).length, 1, `Duplicate listener: ${event}`);
    const invite = { hostName: 'Host|||socket-host', roomId: 'local-test', inviteId: 'invite-test', expiresAt: Date.now() + 60000 };
    await listeners.get('incoming_room_invite')[0](invite);
    assert.equal(prompts.length, 1);
    assert.equal(responses.length, 1);
    assert.equal(responses[0].event, 'room_invite_response');
    assert.equal(responses[0].data.accepted, false);
    assert.equal(responses[0].data.hostSocketId, 'socket-host');
    app.isDoNotDisturbActive = () => true;
    await listeners.get('incoming_room_invite')[0](invite);
    assert.equal(prompts.length, 1, 'Busy player must not receive a modal');
    assert.equal(responses[1].data.busy, true);
    for (const event of events.slice(1)) listeners.get(event)[0]({ targetName: 'Friend' });
    assert.equal(notices.length, 4);
    for (const notice of notices) assert.equal(notice[2].icon, 'canonical/moon/invite.png');
    console.log('Invite startup passed: fresh connection, one listener per event, reuse, decline without join, busy state and themed status notices.');
})().catch(error => { console.error(error); process.exitCode = 1; });
