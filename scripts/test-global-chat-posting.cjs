'use strict';

// Exercise the production handlers with isolated sockets and an in-memory database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createProfileWrites } = require('../lib/profile-writes');
const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const section = (start, end) => {
    const from = source.indexOf(start);
    const to = source.indexOf(end, from);
    assert(from >= 0 && to > from, `Production section missing: ${start}`);
    return source.slice(from, to);
};
const copy = value => JSON.parse(JSON.stringify(value));
const deferred = () => {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
};
function fixture(options = {}) {
    const handlers = new Map(), sent = [], writes = [], reports = [], broadcasts = [], errors = [];
    const database = { messages: [] };
    const sockets = new Map();
    const socket = { id: 'socket-alice', verifiedUid: 'alice', playerId: 'alice', playerName: 'Alice', connected: true,
        handshake: { headers: {}, address: '127.0.0.1' },
        on(event, handler) { handlers.set(event, handler); },
        emit(event, data) { sent.push({ event, data }); }
    };
    sockets.set(socket.id, socket);
    const profileWrites = createProfileWrites();
    const model = {
        async findOneAndUpdate(query, update) {
            writes.push(copy({ query, update }));
            await options.write?.(query, update);
            if (update.$set) Object.assign(database, copy(update.$set));
            if (update.$push?.messages) {
                database.messages.push(...copy(update.$push.messages.$each));
                database.messages = database.messages.slice(-50);
            }
            return database;
        },
        async create(report) { await options.report?.(report); reports.push(copy(report)); }
    };
    const io = { sockets: { sockets }, emit(event, data) {
        broadcasts.push({ event, data });
        for (const client of sockets.values()) client.emit(event, data);
    } };
    const context = vm.createContext({ socket, io, profileWrites, console: { log() {}, error: (...args) => errors.push(args) },
        Date, Intl, Math, Promise, crypto: require('node:crypto'), setTimeout, clearTimeout,
        MONGO_URI: options.mongo ? 'mock-only' : '', process: { env: { MONGO_URI: options.mongo ? 'mock-only' : '' } },
        mongoose: { model: () => model }, UserProfile: { findOne(query) {
            return { select() { return { lean: async () => options.profile ? options.profile(query) : null }; } };
        }, findOneAndUpdate: async () => {} },
        globalChatHistory: [], globalChatSaveQueue: Promise.resolve(), globalChatWeeklyResetTimer: null,
        globalChatLastResetWeekKey: '', globalChatLastResetAt: 0,
        globalChatRateLimits: {}, globalChatReportLimits: {}, chatBans: {},
        MAX_CHAT_HISTORY: 50, GLOBAL_CHAT_MIN_INTERVAL_MS: 1200, GLOBAL_CHAT_SPAM_STRIKE_LIMIT: 4,
        GLOBAL_CHAT_SPAM_MUTE_MS: 15000, GLOBAL_CHAT_PROFANITY_BAN_BASE_MS: 3600000,
        GLOBAL_CHAT_REPORT_COOLDOWN_MS: 30000, GLOBAL_CHAT_OWNER_UID: '',
        GLOBAL_CHAT_RESET_TIME_ZONE: 'Europe/Belgrade', GLOBAL_CHAT_SYSTEM_ANNOUNCEMENTS: [],
        getLeaderboardPeriodStart: () => new Date('2026-11-15T23:00:00Z'),
        getTimeZoneParts: () => ({ year: 2026, month: 11, day: 16 }),
        padDatePart: n => String(n).padStart(2, '0'),
        toSafeInt: n => Number(n) || 0, cenzurisiPoruku: options.filter || (text => text),
        globalChatActivity: { stop() {} }, globalChatModeration: { pushCapabilities: async () => {} }, notifyChatUid() {}
    });
    vm.runInContext(section('function createGlobalChatMessageId(', 'const globalChatMutations ='), context);
    const registerHandlers = vm.runInContext('(function(socket) {\n' +
        section("    socket.on('request_global_chat_history',", "    socket.on('send_challenge',") + '\n})', context);
    const bindSocket = client => {
        registerHandlers(client);
    };
    bindSocket(socket);
    const post = async data => {
        let result;
        await handlers.get('global_chat_msg')(data, reply => { result = reply; });
        return result;
    };
    return { context, socket, sockets, handlers, sent, writes, reports, broadcasts, errors, database, post, bindSocket, profileWrites };
}

async function main() {
    for (const data of [undefined, null, false, 12, 'text', [], {}, { msg: {} }, { msg: [] },
        { msg: 12 }, { msg: true }, { msg: { toString: null } }, { msg: [{ toString: null }] }]) {
        const f = fixture({ mongo: true });
        assert.equal((await f.post(data)).reason, 'err_chat_invalid_message');
        assert.equal(f.writes.length, 0);
        assert.equal(f.context.globalChatHistory.length, 0);
    }
    for (const msg of ['', ' \n ', 'x'.repeat(551)]) {
        const f = fixture();
        assert.equal((await f.post({ msg })).reason, 'err_chat_edit_length');
    }
    const valid = fixture();
    const accepted = await valid.post({ msg: 'x'.repeat(550), senderUid: 'forged', sender: 'Forged', createdAt: -1 });
    assert.equal(accepted.ok, true);
    assert.equal(valid.context.globalChatHistory.length, 1);
    assert.equal(valid.context.globalChatHistory[0].senderUid, 'alice');
    assert.equal(valid.context.globalChatHistory[0].msg.length, 550);
    const guest = fixture(); guest.socket.verifiedUid = '';
    assert.equal((await guest.post({ msg: 'Not allowed' })).reason, 'err_chat_auth_required');
    assert.equal(guest.context.globalChatHistory.length, 0);

    for (const disconnect of [false, true]) {
        const lookup = deferred(), entered = deferred();
        const f = fixture({ mongo: true, profile: query => {
            assert.equal(query.firebaseUid, 'alice');
            entered.resolve();
            return lookup.promise;
        } });
        const posting = f.post({ msg: 'Pending message' });
        await entered.promise;
        if (disconnect) f.socket.connected = false;
        else { f.socket.verifiedUid = 'bob'; f.socket.playerName = 'Bob'; }
        lookup.resolve(null);
        assert.equal((await posting).reason, 'err_chat_auth_required');
        assert.equal(f.context.globalChatHistory.length, 0, 'Identity changes during lookup cannot publish');
        assert.equal(f.writes.length, 0);
    }
    const delivery = fixture();
    const guestEvents = [], peerEvents = [];
    delivery.sockets.set('guest', { connected: true, playerName: 'Forged', verifiedUid: '', emit: (...args) => guestEvents.push(args) });
    delivery.sockets.set('peer', { connected: true, playerName: 'Bob', verifiedUid: 'bob', emit: (...args) => peerEvents.push(args) });
    await delivery.post({ msg: 'Authenticated delivery' });
    assert(peerEvents.some(([event]) => event === 'global_chat_msg'));
    for (const event of ['global_chat_msg_updated', 'global_chat_msg_deleted', 'global_chat_history'])
        delivery.context.publishGlobalChat(event, { id: 'fixture' });
    assert.equal(guestEvents.length, 0, 'Guests never receive message text, updates, deletions or reset history');

    const committed = deferred(), writing = deferred();
    const slow = fixture({ mongo: true, write: () => { writing.resolve(); return committed.promise; } });
    let acknowledged = false;
    const saving = slow.post({ msg: 'Commit before publishing' }).then(result => { acknowledged = true; return result; });
    await writing.promise;
    assert.equal(slow.context.globalChatHistory.length, 0);
    assert(!slow.sent.some(item => item.event === 'global_chat_msg'));
    assert.equal(acknowledged, false, 'No success acknowledgement before the database commits');
    committed.resolve();
    assert.equal((await saving).ok, true);
    assert.deepEqual(copy(slow.context.globalChatHistory), slow.database.messages);

    let failWrite = true;
    const failed = fixture({ mongo: true, write: () => { if (failWrite) throw Error('database unavailable'); } });
    assert.equal((await failed.post({ msg: 'Must not appear' })).reason, 'err_chat_save_failed');
    assert.equal(failed.database.messages.length, 0);
    assert.equal(failed.context.globalChatHistory.length, 0);
    assert(!failed.sent.some(item => item.event === 'global_chat_msg'));
    failWrite = false;
    failed.context.globalChatRateLimits.alice.lastAt = 0;
    assert.equal((await failed.post({ msg: 'Queue recovers' })).ok, true);

    const queued = fixture({ mongo: true });
    const releaseQueue = deferred();
    queued.context.enqueueGlobalChatWrite(() => releaseQueue.promise);
    const waiting = queued.post({ msg: 'Cancel before queued persistence' });
    await new Promise(resolve => setImmediate(resolve));
    queued.socket.verifiedUid = 'bob';
    releaseQueue.resolve();
    assert.equal((await waiting).reason, 'err_chat_auth_required');
    assert.equal(queued.writes.length, 0);

    const releaseProfile = deferred(), profileEntered = deferred();
    const ordering = fixture({ mongo: true });
    const profileWork = ordering.profileWrites.run('alice', async () => {
        profileEntered.resolve();
        await releaseProfile.promise;
    });
    await profileEntered.promise;
    const chatWork = ordering.context.enqueueGlobalChatWrite(() => ordering.profileWrites.run('alice', async () => {}));
    const orderedPost = ordering.post({ msg: 'Consistent lock order' });
    releaseProfile.resolve();
    await profileWork;
    await chatWork;
    assert.equal((await orderedPost).ok, true, 'Posting never holds a profile scope while waiting for the chat queue');

    const lateCommit = deferred(), startedCommit = deferred();
    const changedDuringWrite = fixture({ mongo: true, write: () => { startedCommit.resolve(); return lateCommit.promise; } });
    const originalAccountPost = changedDuringWrite.post({ msg: 'Original author survives delayed commit' });
    await startedCommit.promise;
    changedDuringWrite.socket.verifiedUid = 'bob';
    changedDuringWrite.socket.playerName = 'Bob';
    lateCommit.resolve();
    assert.equal((await originalAccountPost).reason, 'err_chat_auth_required');
    assert.equal(changedDuringWrite.database.messages[0].senderUid, 'alice');
    assert.equal(changedDuringWrite.context.globalChatHistory[0].sender, 'Alice');

    const durable = deferred(), enteredWrite = deferred();
    const reset = fixture({ mongo: true, write: (_query, update) => {
        if (update.$push) { enteredWrite.resolve(); return durable.promise; }
    } });
    const postBeforeReset = reset.post({ msg: 'Before reset' });
    await enteredWrite.promise;
    const resetting = reset.context.resetGlobalChatHistory('fixture');
    durable.resolve();
    await postBeforeReset;
    await resetting;
    assert.equal(reset.database.messages.length, 0);
    assert.equal(reset.context.globalChatHistory.length, 0, 'A slow append cannot resurrect messages after a weekly reset');
    assert.equal(reset.sent.filter(item => item.event === 'global_chat_history').at(-1).data.length, 0);
    reset.context.globalChatRateLimits.alice.lastAt = 0;
    assert.equal((await reset.post({ msg: 'After reset' })).ok, true);
    assert.deepEqual(copy(reset.context.globalChatHistory), reset.database.messages);

    const failedReset = fixture({ mongo: true, write: (_query, update) => {
        if (update.$set) throw Error('reset unavailable');
    } });
    await failedReset.post({ msg: 'Retain on reset failure' });
    await assert.rejects(failedReset.context.resetGlobalChatHistory('fixture'));
    assert.equal(failedReset.context.globalChatHistory.length, 1);
    assert.equal(failedReset.database.messages.length, 1);
    assert(!failedReset.sent.some(item => item.event === 'global_chat_history'));

    const reporting = deferred();
    const reported = fixture({ mongo: true, report: () => reporting.promise });
    reported.context.globalChatHistory.push({ id: 'other', senderUid: 'bob', msg: 'Report fixture' });
    const secondHandlers = new Map();
    const secondSocket = { ...reported.socket, id: 'same-account-second-socket', on: (event, handler) => secondHandlers.set(event, handler) };
    reported.bindSocket(secondSocket);
    const attempts = Array.from({ length: 12 }, (_, index) =>
        (index % 2 ? secondHandlers : reported.handlers).get('report_global_chat_msg')({ messageId: 'other' }));
    reporting.resolve();
    await Promise.all(attempts);
    assert.equal(reported.reports.length, 1);
    assert.equal(reported.sent.filter(item => item.data?.reason === 'err_chat_report_slow_down').length, 11);
    let failReport = true;
    const retryReport = fixture({ mongo: true, report: () => { if (failReport) throw Error('report unavailable'); } });
    retryReport.context.globalChatHistory.push({ id: 'other', senderUid: 'bob', msg: 'Report fixture' });
    await retryReport.handlers.get('report_global_chat_msg')({ messageId: 'other' });
    failReport = false;
    await retryReport.handlers.get('report_global_chat_msg')({ messageId: 'other' });
    assert.equal(retryReport.reports.length, 1, 'Failed reporting releases the reserved cooldown');

    const legacy = fixture();
    await legacy.handlers.get('global_chat_msg')({ msg: 'Legacy client without an ack' });
    assert(legacy.sent.some(item => item.event === 'global_chat_msg'));
    await legacy.handlers.get('global_chat_msg')({ msg: { toString: null } });
    assert(legacy.sent.some(item => item.event === 'global_chat_post_rejected'));

    const rolling = fixture({ mongo: true });
    for (let i = 0; i < 51; i++) {
        if (rolling.context.globalChatRateLimits.alice) rolling.context.globalChatRateLimits.alice.lastAt = 0;
        assert.equal((await rolling.post({ msg: `Rolling message ${i}` })).ok, true);
    }
    assert.equal(rolling.database.messages.length, 50);
    assert.deepEqual(copy(rolling.context.globalChatHistory), rolling.database.messages);
    assert.equal(rolling.database.messages[0].msg, 'Rolling message 1');

    const calendar = fixture();
    calendar.context.LEADERBOARD_TIME_ZONE = 'Europe/Belgrade';
    for (const name of ['getTimeZoneParts', 'getTimeZoneOffsetMs', 'zonedLocalDateTimeToUtc',
        'zonedLocalMidnightToUtc', 'getLeaderboardPeriodStart', 'padDatePart']) {
        const start = source.indexOf(`function ${name}(`);
        const end = source.indexOf('\n}', start) + 2;
        assert(start >= 0 && end > start);
        vm.runInContext(source.slice(start, end), calendar.context);
    }
    for (const [date, key, next] of [
        ['2026-11-19T12:00:00Z', '2026-11-16', '2026-11-22T23:00:00.000Z'],
        ['2026-03-28T12:00:00Z', '2026-03-23', '2026-03-29T22:00:00.000Z'],
        ['2026-10-24T12:00:00Z', '2026-10-19', '2026-10-25T23:00:00.000Z'],
        ['2026-10-25T23:00:00Z', '2026-10-26', '2026-11-01T23:00:00.000Z']
    ]) {
        assert.equal(calendar.context.getGlobalChatWeekKey(new Date(date)), key);
        assert.equal(calendar.context.getNextGlobalChatResetAt(new Date(date)).toISOString(), next);
    }
    const scheduled = [];
    calendar.context.setTimeout = (fn, ms) => { const timer = { fn, ms, unref() {} }; scheduled.push(timer); return timer; };
    calendar.context.clearTimeout = () => {};
    calendar.context.resetGlobalChatHistory = async () => { throw Error('reset temporarily unavailable'); };
    calendar.context.scheduleGlobalChatWeeklyReset();
    scheduled[0].fn();
    await new Promise(resolve => setImmediate(resolve));
    assert(scheduled[1].ms > 59000 && scheduled[1].ms <= 60000, 'A failed weekly reset retries after one minute');
    calendar.context.resetGlobalChatHistory = async () => {};
    scheduled[1].fn();
    await new Promise(resolve => setImmediate(resolve));
    assert(scheduled[2].ms > 60000 && scheduled[2].ms <= 7 * 86400000, 'A successful retry restores the weekly schedule');
    console.log('Global Chat posting: validation, identity, authenticated delivery, durable acknowledgements, failures/recovery, reset ordering, report concurrency and legacy clients passed.');
}

if (require.main === module) {
    const watchdog = setTimeout(() => { console.error('Global Chat posting test timed out'); process.exit(1); }, 10000);
    main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => clearTimeout(watchdog));
}
module.exports = { fixture, deferred };
