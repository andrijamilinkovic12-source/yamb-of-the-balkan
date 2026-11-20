'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { test } = require('node:test');

const authSource = fs.readFileSync(require.resolve('../www/auth.js'), 'utf8');
const gameSource = fs.readFileSync(require.resolve('../www/game.js'), 'utf8');
const serverSource = fs.readFileSync(require.resolve('../server.js'), 'utf8');
const uid = 'audit-account-a-1234567890';
const otherUid = 'audit-account-b-1234567890';
const turn = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => {
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    return { promise, resolve };
};
const profileReply = (overrides = {}) => ({ ok: true, uid,
    cloudStats: { recipientUid: uid, statsAuthoritative: true, games: 1, balance: 1000 }, ...overrides });

class Socket extends EventEmitter {
    constructor() {
        super();
        this.connected = true;
        this.disconnected = false;
        this.id = 'audit-socket';
        this.requests = [];
    }
    emit(event, data, ack) {
        const request = { event, data, ack };
        this.requests.push(request);
        this.onSend?.(request);
        return true;
    }
    receive(event, data) { return super.emit(event, data); }
    disconnect() {
        this.connected = false;
        this.disconnected = true;
        this.receive('disconnect');
    }
    connect() {
        this.connected = true;
        this.disconnected = false;
        this.receive('connect');
    }
}

function fixture(saved = {}) {
    const storage = new Map(Object.entries({ yamb_uid: uid, yamb_player_name: 'Audit',
        yamb_dukati: '1000', yamb_stats: JSON.stringify({ games: 1, balance: 1000 }),
        yamb_lang: 'sr', ...saved }));
    const timers = new Map();
    let timerId = 0;
    const socket = new Socket();
    const notices = [], confirmations = [], navigations = [], applied = [];
    const user = { uid, displayName: 'Audit' };
    let nativeUser = user;
    let signOutCalls = 0;
    const plugin = {
        getCurrentUser: async () => ({ user: nativeUser }),
        async signOut() { signOutCalls++; nativeUser = null; }
    };
    const window = {
        Capacitor: { Plugins: { FirebaseAuthentication: plugin } },
        modalManager: { async confirm(message) { confirmations.push(message); return true; },
            async alert(message) { notices.push(message); } }
    };
    const context = {
        window, Capacitor: window.Capacitor, URL, Intl, queueMicrotask,
        localStorage: { getItem: key => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) },
        document: { getElementById: id => id === 'splash-screen'
            ? { classList: { contains: () => navigations.at(-1) === 'splash-screen' } } : null, querySelector: () => null,
            querySelectorAll: () => [], addEventListener() {} },
        setTimeout(fn, ms) { timers.set(++timerId, { fn, ms }); return timerId; },
        clearTimeout(id) { timers.delete(id); },
        console: { log() {}, warn() {}, error() {} }
    };
    vm.createContext(context);
    vm.runInContext(authSource.slice(0, authSource.indexOf('// Inicijalizacija')), context);
    vm.runInContext(gameSource.replace('window.app = new YambApp();', 'globalThis.TestApp = YambApp;'), context);
    const app = Object.create(context.TestApp.prototype);
    Object.assign(app, {
        socket, playerId: uid, playerName: 'Audit', stats: {}, gameActive: false,
        async autoSaveGame() {}, applyTheme() {}, refreshLocalStats() {},
        navigateTo(view) { navigations.push(view); },
        async authenticateSocketIdentity() { return { ok: true, uid: storage.get('yamb_uid') }; },
        shouldRestoreCloudBeforeProfilePush: () => false,
        getFullLocalStats() { return { ...JSON.parse(storage.get('yamb_stats') || '{}'),
            balance: Number(storage.get('yamb_dukati') || 0) }; },
        applyCloudProfileSync(data) { applied.push(data); return true; }
    });
    window.app = app;
    context.setYambAuthState(user);
    const expire = async ms => {
        for (const [id, timer] of [...timers]) {
            if (timer.ms === ms) { timers.delete(id); await timer.fn(); }
        }
        await turn();
    };
    const autoConfirm = () => {
        socket.onSend = request => {
            if (['set_player_data', 'request_profile_sync'].includes(request.event)) {
                queueMicrotask(() => request.ack?.(profileReply()));
            }
        };
    };
    return { context, window, app, storage, socket, timers, plugin, user, notices,
        confirmations, navigations, applied, expire, autoConfirm, signOutCalls: () => signOutCalls };
}

test('logout clears all identity sources, cancels delayed settings and preserves account saves', async () => {
    const f = fixture({ ['yamb_saved_game_' + uid + '_1']: 'unfinished' });
    f.autoConfirm();
    f.app.socketVerifiedUid = uid;
    f.app.settingsSyncTimer = f.context.setTimeout(() => assert.fail('Stale setting write'), 350);
    await f.context.odjaviSe();
    assert.equal(f.signOutCalls(), 1);
    assert.equal(f.window.yambAuthState.uid, null);
    assert.equal(f.window.yambAuthState.isLoggedIn, false);
    assert.equal(f.context.getPlayerId(), null);
    assert.equal(f.app.requireLogin(), false);
    assert.equal(f.storage.has('yamb_uid'), false);
    assert.equal(f.app.playerId, null);
    assert.equal(f.app.socketVerifiedUid, null);
    assert.equal(f.socket.connected, false);
    assert.equal(f.storage.get('yamb_saved_game_' + uid + '_1'), 'unfinished');
    assert(f.context.readAccountLocalSnapshot(uid));
    await f.expire(350);
    assert.deepEqual(f.navigations, ['splash-screen']);
});

test('cancelled logout, rejected sync and failed native sign-out preserve the active account', async () => {
    const cancelled = fixture();
    cancelled.window.modalManager.confirm = async () => false;
    await cancelled.context.odjaviSe();
    assert.equal(cancelled.signOutCalls(), 0);
    assert.equal(cancelled.storage.get('yamb_uid'), uid);

    const unsynced = fixture();
    unsynced.socket.onSend = request => request.ack?.({ ok: false, reason: 'server_error' });
    unsynced.window.modalManager.confirm = async message => {
        unsynced.confirmations.push(message);
        return unsynced.confirmations.length === 1;
    };
    await unsynced.context.odjaviSe();
    assert.equal(unsynced.confirmations.length, 2);
    assert.equal(unsynced.signOutCalls(), 0);
    assert.equal(unsynced.storage.get('yamb_dukati'), '1000');

    const failed = fixture();
    failed.autoConfirm();
    failed.plugin.signOut = async () => { throw Error('Native failure'); };
    await failed.context.odjaviSe();
    assert.equal(failed.window.yambAuthState.uid, uid);
    assert.equal(failed.storage.get('yamb_uid'), uid);
    assert.equal(failed.socket.connected, true);
    assert.equal(failed.notices.length, 1);
    // The action lock must be released after errors too.
    failed.plugin.signOut = async () => {};
    await failed.context.odjaviSe();
    assert.equal(failed.storage.has('yamb_uid'), false);
});

test('double logout cannot run twice while confirmation is open', async () => {
    const f = fixture();
    f.autoConfirm();
    const gate = deferred();
    let prompts = 0;
    f.window.modalManager.confirm = () => { prompts++; return gate.promise; };
    const first = f.context.odjaviSe();
    await f.context.odjaviSe();
    assert.equal(prompts, 1);
    gate.resolve(true);
    await first;
    assert.equal(f.signOutCalls(), 1);
});

test('startup navigation and late Firebase acknowledgements cannot revive a closed session', async () => {
    const f = fixture();
    f.autoConfirm();
    await f.context.checkLoginStatus();
    await f.context.odjaviSe();
    await f.expire(4000);
    assert.deepEqual(f.navigations, ['splash-screen']);

    const late = fixture();
    late.window.getYambFirebaseIdToken = async () => 'audit-token';
    const pending = late.context.TestApp.prototype.authenticateSocketIdentity.call(late.app, true);
    await turn();
    const request = late.socket.requests.find(item => item.event === 'auth_firebase_token');
    assert(request);
    late.context.setYambAuthState(null);
    late.context.setYambAuthState(late.user);
    request.ack({ ok: true, uid });
    assert.equal((await pending).reason, 'account_changed');
    assert.equal(late.app.socketVerifiedUid, null);
});

test('token lookup completing after logout sends no authentication request', async () => {
    const f = fixture();
    const token = deferred();
    f.window.getYambFirebaseIdToken = () => token.promise;
    const pending = f.context.TestApp.prototype.authenticateSocketIdentity.call(f.app, true);
    f.context.setYambAuthState(null);
    token.resolve('audit-token');
    assert.equal((await pending).reason, 'account_changed');
    assert.equal(f.socket.requests.length, 0);
    assert.equal(f.storage.has('yamb_uid'), false);
});

test('a delayed startup user lookup cannot replace a newer account', async () => {
    for (const failed of [false, true]) {
        const f = fixture();
        const lookup = deferred();
        f.plugin.getCurrentUser = () => lookup.promise.then(() => {
            if (failed) throw Error('Old lookup failed');
            return { user: f.user };
        });
        const startup = f.context.checkLoginStatus();
        f.context.setYambAuthState({ uid: otherUid, displayName: 'Other' });
        lookup.resolve();
        await startup;
        assert.equal(f.storage.get('yamb_uid'), otherUid);
        assert.equal(f.window.yambAuthState.uid, otherUid);
        assert.equal(f.socket.requests.length, 0);
    }
});

test('unrelated balance events cannot confirm a profile save, including logout sync', async () => {
    const f = fixture();
    let completed = false;
    const pending = f.context.syncLoggedInProfileToCloud(f.user, { waitForSync: true })
        .then(result => { completed = true; return result; });
    await turn();
    f.socket.receive('sync_local_stats', { balance: 9999, recipientUid: uid });
    await turn();
    assert.equal(completed, false);
    assert.equal(f.applied.length, 0);
    f.socket.requests.at(-1).ack(profileReply());
    assert.equal(await pending, true);
    assert.equal(f.applied.length, 1);
    assert.equal(f.window.yambLastCloudSyncResult.reason, 'profile_synced');
    assert.equal(f.socket.listenerCount('disconnect'), 0);
});

test('each concurrent save waits for its own acknowledgement', async () => {
    const f = fixture();
    let firstDone = false;
    const first = f.app.requestProfileSync('set_player_data', { marker: 1 })
        .then(result => { firstDone = true; return result; });
    const second = f.app.requestProfileSync('set_player_data', { marker: 2 });
    f.socket.requests[1].ack(profileReply({ marker: 2 }));
    assert.equal((await second).marker, 2);
    assert.equal(firstDone, false);
    f.socket.requests[0].ack(profileReply({ marker: 1 }));
    assert.equal((await first).marker, 1);
    assert.equal(f.timers.size, 0);
});

test('timeouts, transport loss, server errors and invalid accounts never report saved', async () => {
    for (const scenario of ['timeout', 'disconnect', 'error', 'invalid-response', 'wrong-account', 'account-change']) {
        const f = fixture();
        const pending = f.context.syncLoggedInProfileToCloud(f.user, { waitForSync: true, timeoutMs: 25 });
        await turn();
        const request = f.socket.requests.at(-1);
        if (scenario === 'timeout') await f.expire(25);
        if (scenario === 'disconnect') f.socket.disconnect();
        if (scenario === 'error') request.ack({ ok: false, reason: 'server_error' });
        if (scenario === 'invalid-response') request.ack(null);
        if (scenario === 'wrong-account') request.ack(profileReply({ uid: otherUid }));
        if (scenario === 'account-change') {
            f.context.setYambAuthState({ uid: otherUid, displayName: 'Other' });
            request.ack(profileReply());
        }
        assert.equal(await pending, false, scenario);
        assert.equal(f.applied.length, 0, scenario);
        assert.equal(f.timers.size, 0, scenario);
        assert.equal(f.socket.listenerCount('disconnect'), 0, scenario);
    }
});

test('account changes during restore or pending trophy work stop the old profile push', async () => {
    for (const stage of ['restore', 'trophies']) {
        const f = fixture();
        const gate = deferred();
        if (stage === 'restore') {
            f.app.shouldRestoreCloudBeforeProfilePush = () => true;
            f.app.pullCloudProfile = () => gate.promise;
        } else {
            f.window.trophyManager = { retryPendingClaims: () => gate.promise };
        }
        const pending = f.app.emitPlayerData(false, { waitForSync: true });
        await turn();
        f.context.setYambAuthState(null);
        f.context.setYambAuthState(f.user);
        gate.resolve({ ok: true });
        assert.equal((await pending).reason, 'account_changed', stage);
        assert.equal(f.socket.requests.length, 0, stage);
    }
});

test('cloud pull and game profile push use the same request-specific contract', async () => {
    const f = fixture();
    const pull = f.app.pullCloudProfile();
    await turn();
    f.socket.receive('sync_local_stats', { balance: 123 });
    assert.equal(f.applied.length, 0);
    f.socket.requests.at(-1).ack(profileReply());
    assert.equal((await pull).ok, true);
    assert.equal(f.applied.length, 1);
    const push = f.app.emitPlayerData(false, { waitForSync: true });
    await turn();
    f.socket.requests.at(-1).ack({ ok: false, reason: 'mongo_unavailable' });
    const result = await push;
    assert.equal(result.ok, false);
    assert.equal(result.synced, false);
    assert.equal(result.reason, 'mongo_unavailable');
    assert.equal(f.context.TestApp.prototype.applyCloudProfileSync.call(f.app,
        { recipientUid: otherUid, balance: 9999 }), false);
    assert.equal(f.storage.get('yamb_dukati'), '1000');
});

test('latest snapshot follows legitimate spends and settings while retaining recovery progress', () => {
    const f = fixture();
    assert.equal(f.context.saveAccountLocalSnapshot(uid), true);
    f.storage.set('yamb_dukati', '100');
    f.storage.set('yamb_lang', 'en');
    f.storage.set('yamb_sound', 'false');
    assert.equal(f.context.saveAccountLocalSnapshot(uid), true);
    const snapshot = f.context.readAccountLocalSnapshot(uid);
    assert.equal(snapshot.values.yamb_dukati, '100');
    assert.equal(snapshot.progressBackup.values.yamb_dukati, '1000');
    f.storage.delete('yamb_dukati');
    f.storage.set('yamb_lang', 'sr');
    f.storage.set('yamb_sound', 'true');
    assert.equal(f.context.restoreAccountLocalSnapshot(uid), true);
    assert.equal(f.storage.get('yamb_dukati'), '100');
    assert.equal(f.storage.get('yamb_lang'), 'en');
    assert.equal(f.storage.get('yamb_sound'), 'false');
});

test('offline snapshot recovery applies the account audio and language before another profile push', () => {
    const f = fixture({ yamb_sound: 'false', yamb_vibration: 'false', yamb_music: 'false',
        yamb_music_volume: '0', yamb_music_last_volume: '0.25', yamb_lang: 'en' });
    f.context.saveAccountLocalSnapshot(uid);
    f.context.setYambAuthState(null);
    f.context.setYambAuthState({ uid: otherUid, displayName: 'Other' });
    for (const key of ['yamb_sound', 'yamb_vibration', 'yamb_music']) f.storage.set(key, 'true');
    f.storage.set('yamb_music_volume', '0.8');
    f.storage.set('yamb_music_last_volume', '0.8');
    f.storage.set('yamb_lang', 'sr');
    f.app.soundEnabled = true;
    f.app.vibrationEnabled = true;
    f.app.soundMgr = {
        enabled: true, musicEnabled: true, musicVolume: 0.8, lastAudibleMusicVolume: 0.8,
        normalizeMusicVolume(value, fallback = 0.4) {
            const volume = value === null ? NaN : Number(value);
            return Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : fallback;
        },
        setMusicEnabled(value) { this.musicEnabled = value; },
        setMusicVolume(value) { this.musicVolume = value; }
    };
    f.context.document.documentElement = { lang: 'sr' };
    let translated = 0, controlsRefreshed = 0;
    f.context.applyTranslations = () => { translated++; };
    f.app.updateQuickMenuIcons = () => { controlsRefreshed++; };
    f.context.setYambAuthState(null);
    f.context.setYambAuthState(f.user);
    assert.equal(f.context.restoreAccountLocalSnapshot(uid), true);
    assert.equal(f.app.soundEnabled, false);
    assert.equal(f.app.vibrationEnabled, false);
    assert.equal(f.app.soundMgr.enabled, false);
    assert.equal(f.app.soundMgr.musicEnabled, false);
    assert.equal(f.app.soundMgr.musicVolume, 0);
    assert.equal(f.app.soundMgr.lastAudibleMusicVolume, 0.25);
    assert.equal(f.context.document.documentElement.lang, 'en');
    assert.equal(translated, 1);
    assert.equal(controlsRefreshed, 1);
    const packed = f.context.TestApp.prototype.getFullLocalStats.call(f.app);
    assert.equal(packed.soundEnabled, false);
    assert.equal(packed.vibrationEnabled, false);
    assert.equal(packed.musicEnabled, false);
    assert.equal(packed.musicVolume, 0);
});

test('empty or foreign profiles cannot erase snapshots, and older snapshot format still restores', () => {
    const f = fixture();
    f.context.saveAccountLocalSnapshot(uid);
    const original = f.storage.get('yamb_account_snapshot_' + uid);
    f.storage.set('yamb_stats', '{}'); f.storage.set('yamb_dukati', '0');
    assert.equal(f.context.saveAccountLocalSnapshot(uid), false);
    assert.equal(f.storage.get('yamb_account_snapshot_' + uid), original);
    f.context.setYambAuthState({ uid: otherUid, displayName: 'Other' });
    assert.equal(f.context.saveAccountLocalSnapshot(uid), false);
    assert.equal(f.context.restoreAccountLocalSnapshot(uid), false);
    const otherBalance = f.storage.get('yamb_dukati');
    f.storage.set('yamb_account_snapshot_' + otherUid, original);
    assert.equal(f.context.restoreAccountLocalSnapshot(otherUid), false);
    assert.equal(f.storage.get('yamb_dukati'), otherBalance);
    f.context.setYambAuthState(f.user);
    f.storage.set('yamb_account_snapshot_' + uid, JSON.stringify({ uid, weight: 1,
        values: { yamb_stats: '{"games":1}', yamb_lang: 'en', ['yamb_dukati_' + otherUid]: 'bad' } }));
    assert.equal(f.context.restoreAccountLocalSnapshot(uid), true);
    assert.equal(f.storage.get('yamb_lang'), 'en');
    assert.equal(f.storage.has('yamb_dukati_' + otherUid), false);
    assert.equal(f.storage.has('yamb_dukati'), false, 'Absent latest values must not retain stale state');
    const fresh = fixture({ yamb_stats: '{}', yamb_dukati: '0', yamb_lang: 'en' });
    assert.equal(fresh.context.saveAccountLocalSnapshot(uid), true, 'New players can back up settings before their first game');
});

test('an authoritative cloud correction can replace outdated progress even when the new profile is empty', () => {
    const f = fixture();
    f.context.saveAccountLocalSnapshot(uid);
    f.storage.set('yamb_stats', '{}');
    f.storage.set('yamb_dukati', '0');
    assert.equal(f.context.saveAccountLocalSnapshot(uid, { authoritative: true }), true);
    const latest = f.context.readAccountLocalSnapshot(uid);
    assert.equal(latest.values.yamb_dukati, '0');
    assert.equal(latest.progressBackup.values.yamb_dukati, '1000');
    f.storage.set('yamb_lang', 'en');
    assert.equal(f.context.saveAccountLocalSnapshot(uid), true, 'Settings can still change after a confirmed correction');
    f.storage.set('yamb_dukati', '999');
    f.context.restoreAccountLocalSnapshot(uid);
    assert.equal(f.storage.get('yamb_dukati'), '0', 'Recovery must use the corrected latest state');
    assert.equal(f.storage.get('yamb_lang'), 'en');
});

function serverFixture({ mongo = true, authenticated = true, saveError = false } = {}) {
    const handlers = new Map(), emitted = [], order = [];
    const saveGate = deferred();
    const socket = { verifiedUid: authenticated ? uid : null, playerId: authenticated ? uid : null,
        on(event, handler) { handlers.set(event, handler); }, emit(...args) { emitted.push(args); } };
    class UserProfile {
        constructor(data) { Object.assign(this, data); }
        static async findOne() { return null; }
        async save() { order.push('saving'); await saveGate.promise; if (saveError) throw Error('Database failure'); order.push('saved'); }
    }
    const initialStats = { games: 1, wins: 0, losses: 0, highscore: 100, totalScoreSum: 100,
        currentWinStreak: 0, maxWinStreak: 0, tournamentWins: 0, penaltyPoints: 0 };
    const payload = user => ({ recipientUid: user.firebaseUid, statsAuthoritative: true, games: user.games });
    const context = {
        socket, UserProfile, MONGO_URI: mongo ? 'mock-database' : '', onlinePlayers: {}, registeredSockets: {},
        sadrziPsovku: () => false, normalizeMonitorTheme: () => 'dark', touchMonitorActivity() {},
        globalChatActivity: { snapshot() {} }, globalChatModeration: { pushCapabilities: async () => {} },
        getVerifiedTournamentWins: async () => 0,
        buildInitialProfileState: () => ({ stats: initialStats, unlockedTrophies: [] }),
        buildInitialEconomyState: () => ({ balance: 0, undoTokens: 0, unlockedTrophies: [],
            unlockedSkins: [], unlockedEffects: [], yamb_unlocked: [] }),
        getBestSubmittedScoreForUid: async () => 0, referralAttributionAvailable: () => false,
        coerceBooleanSetting: value => typeof value === 'boolean' ? value : null,
        normalizeMusicVolume: (value, fallback) => value ?? fallback,
        normalizeLanguageSetting: (value, fallback) => value || fallback,
        normalizeH2HStatsForUser: value => value, normalizeDailyKeyForSync: value => value || '',
        getDefaultCurrentLeagueData: () => ({}), normalizeActiveSelections() {},
        maybeApplyLegacyLeagueMigration: async () => {}, syncCurrentLeagueScoreFromUserProfile: async () => {},
        emitProfileSync(target, user) { order.push('profile-event'); target.emit('sync_local_stats', payload(user)); },
        buildProfileSyncPayload: payload, buildH2HRecordSummary: () => ({}),
        updateOnlineCount() {}, flushPendingOnlineRoomResume() {}, console: { error() {} }
    };
    vm.createContext(context);
    const writeStart = serverSource.indexOf("    socket.on('set_player_data'");
    const writeEnd = serverSource.indexOf("    socket.on('claim_daily_reward'", writeStart);
    const readStart = serverSource.indexOf("    socket.on('request_profile_sync'");
    const readEnd = serverSource.indexOf("    socket.on('request_daily_challenge'", readStart);
    assert(writeStart > 0 && writeEnd > writeStart && readStart > 0 && readEnd > readStart);
    vm.runInContext(serverSource.slice(writeStart, writeEnd) + serverSource.slice(readStart, readEnd), context);
    return { context, socket, handlers, order, emitted, saveGate, UserProfile };
}

test('actual server save acknowledges only after persistence and reports database failure', async () => {
    for (const saveError of [false, true]) {
        const f = serverFixture({ saveError });
        let reply;
        const pending = f.handlers.get('set_player_data')({ uid: otherUid, name: 'Audit', stats: {} },
            result => { reply = result; f.order.push('ack'); });
        await turn();
        assert.equal(reply, undefined);
        assert.deepEqual(f.order, ['saving']);
        f.saveGate.resolve();
        await pending;
        assert.equal(reply.ok, !saveError);
        if (saveError) assert.equal(reply.reason, 'server_error');
        else {
            assert(f.order.indexOf('ack') > f.order.indexOf('saved'));
            assert.equal(reply.uid, uid, 'Client UID must not choose the saved account');
            assert.equal(reply.cloudStats.recipientUid, uid);
            assert.equal(f.emitted[0][0], 'sync_local_stats', 'Older clients still receive the profile event');
        }
    }
});

test('actual server read returns the requested profile in its own acknowledgement', async () => {
    const f = serverFixture();
    f.UserProfile.findOne = async () => ({ firebaseUid: uid, games: 7 });
    let reply;
    await f.handlers.get('request_profile_sync')({}, result => { reply = result; });
    assert.equal(reply.ok, true);
    assert.equal(reply.cloudStats.games, 7);
    assert.equal(reply.uid, uid);
    f.UserProfile.findOne = async () => null;
    await f.handlers.get('request_profile_sync')({}, result => { reply = result; });
    assert.equal(reply.reason, 'profile_not_found');
});

test('older clients without a save callback still receive the profile event', async () => {
    const f = serverFixture();
    f.saveGate.resolve();
    await f.handlers.get('set_player_data')({ name: 'Audit', stats: {} });
    assert.equal(f.emitted[0][0], 'sync_local_stats');
    assert.equal(f.emitted[0][1].recipientUid, uid);
});

test('actual server read and write reject unverified identities and unavailable storage', async () => {
    for (const options of [{ authenticated: false }, { mongo: false }]) {
        const f = serverFixture(options);
        for (const event of ['set_player_data', 'request_profile_sync']) {
            let reply;
            await f.handlers.get(event)({ uid, name: 'Audit' }, result => { reply = result; });
            assert.equal(reply.ok, false);
            assert.equal(reply.reason, options.authenticated === false ? 'firebase_token_required' : 'mongo_unavailable');
        }
        assert.equal(f.order.includes('saving'), false);
    }
});
