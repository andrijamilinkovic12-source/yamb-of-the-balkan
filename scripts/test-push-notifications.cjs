'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const serverSource = read('server.js');
const authSource = read('www/auth.js');
const quietConsole = { log() {}, warn() {}, error() {} };

function actual(source, name) {
    const start = source.search(new RegExp('(?:async )?function ' + name + '\\('));
    assert(start >= 0, name);
    return source.slice(start, source.indexOf('\n}', start) + 2);
}

function transport(docs, messaging) {
    const removed = [], queries = [];
    const context = vm.createContext({ console: quietConsole, MONGO_URI: 'fixture',
        PUSH_TOKEN_STALE_MS: 86400000, PUSH_NOTIFICATION_CHANNEL_ID: 'tournament_notifications',
        firebaseMessaging: messaging,
        pushDeliveryPolicy: { selectUids: value => value, allowsUid: () => true },
        tournamentNotificationsCore: { inQuietHours: () => false },
        PushToken: { find(query) {
            queries.push(query);
            return { select: () => ({ lean: async () => docs }) };
        } }, removeInvalidPushTokens: async tokens => removed.push(...tokens)
    });
    for (const name of ['normalizePushLanguage', 'stringifyPushData', 'isInvalidFcmTokenError',
        'getPushTokenDocsForUids', 'getLocalizedPushMessage', 'buildPushMessage', 'sendPushToUids']) {
        vm.runInContext(actual(serverSource, name), context);
    }
    return { context, removed, queries, send: message => context.sendPushToUids(['user'], message) };
}

async function checkTransport() {
    const failed = { success: false, error: { code: 'messaging/server-unavailable' } };
    const invalid = { success: false, error: { code: 'messaging/registration-token-not-registered' } };
    const docs = [{ uid: 'user', token: 'fixture-token', language: 'sr' }];
    const f = transport(docs, { sendEachForMulticast: async () => ({ successCount: 0, responses: [failed] }) });
    assert.equal((await f.send({})).ok, false, 'Rejected multicast must allow the caller to retry');
    assert.equal(f.queries[0]['categories.tournament'].$ne, false);
    assert(f.queries[0].lastSeenAt.$gte > Date.now() - 90000000);
    f.context.tournamentState = { pushFlags: {} };
    f.context.saveTournamentToDb = async () => {};
    for (const name of ['ensureTournamentPushFlags', 'markTournamentPushFlag', 'clearTournamentPushFlag', 'sendTournamentPushOnce']) {
        vm.runInContext(actual(serverSource, name), f.context);
    }
    assert.equal((await f.context.sendTournamentPushOnce('started', () => f.send({}))).ok, false);
    assert.equal(f.context.tournamentState.pushFlags.started, undefined, 'FCM rejection must release the one-time tournament flag');
    f.context.firebaseMessaging.sendEachForMulticast = async () => ({ successCount: 1, responses: [{ success: true }] });
    assert.equal((await f.context.sendTournamentPushOnce('started', () => f.send({}))).sent, 1);
    assert.equal((await f.context.sendTournamentPushOnce('started', () => { throw Error('Duplicate send'); })).skipped, true);
    f.context.firebaseMessaging.sendEachForMulticast = async () => ({ successCount: 0, responses: [invalid] });
    assert.equal((await f.send({})).invalid, 1);
    assert.deepEqual(f.removed, ['fixture-token']);

    let sends = 0;
    const many = Array.from({ length: 502 }, (_, index) => ({ uid: 'user', token: 'token-' + index, language: 'sr' }));
    many.push({ uid: 'user', token: 'english-token', language: 'en' });
    many.push(many[0]);
    const messages = [];
    const grouped = transport(many, { sendEachForMulticast: async message => {
        assert(message.tokens.length <= 500);
        messages.push(message);
        if (++sends === 2) throw Object.assign(Error('fixture'), { code: 'messaging/server-unavailable' });
        return { successCount: message.tokens.length, responses: message.tokens.map(() => ({ success: true })) };
    } });
    const result = await grouped.send({ category: 'records', type: 'record_broken', scope: 'records',
        title: 'Rekord', body: 'Novi rekord', localizations: { en: { title: 'Record', body: 'New record' } },
        data: { score: 1234, period: 'monthly' } });
    assert.equal(result.ok, true, 'A partial success must not replay the whole broadcast');
    assert.equal(result.sent, 501);
    assert.equal(result.failed, 2);
    assert.equal(messages[2].notification.title, 'Record', 'One failed batch must not block the next language');
    assert.equal(messages[0].data.score, '1234');
    assert.equal(messages[0].android.notification.channelId, 'tournament_notifications');
    assert.equal(grouped.queries[0]['categories.records'].$ne, false);

    const fallback = transport(docs, { send: async () => { throw failed.error; } });
    assert.equal((await fallback.send({})).ok, false, 'Single-send fallback must expose failure');
    const expired = transport(docs, { send: async () => { throw Error('Expired message was sent'); } });
    assert.equal((await expired.send({ expiresAt: Date.now() - 1 })).sent, 0);
    assert.equal((await expired.send({ isCurrent: () => false })).sent, 0);
    const empty = transport([], { send: async () => { throw Error('No recipients'); } });
    assert.equal((await empty.send({})).ok, true);
    console.log('PASS: FCM failures, invalid-token cleanup, partial batches, localization, expiry and category queries.');
}

async function checkLeagueRetry() {
    const target = { year: 2026, quarter: 3, periodKey: '2026-Q3', dateKey: '2026-10-01' };
    const champion = { playerName: 'Fixture', score: 1000 };
    let claimed = false, resets = 0, cycleFails = true, sendFails = false;
    const context = vm.createContext({ MONGO_URI: 'fixture',
        getLeagueChampionAnnouncementTarget: () => target,
        archiveLeagueQuarter: async () => ({ champion }),
        LeagueHallOfFame: {
            findOneAndUpdate: () => ({ lean: async () => {
                if (claimed) return null;
                claimed = true;
                return { champion };
            } }),
            updateOne: async () => { claimed = false; resets++; }
        },
        getLeagueChampionCycleNumber: async () => { if (cycleFails) throw Error('fixture db failure'); return 3; },
        buildLeagueChampionPushPayload: () => ({ playerName: champion.playerName, score: champion.score }),
        getPushEnabledUids: async () => ['user'],
        sendPushToUids: async () => sendFails ? { ok: false, sent: 0 } : { ok: true, sent: 1 },
        toSafeInt: value => parseInt(value, 10) || 0
    });
    vm.runInContext(actual(serverSource, 'notifyQuarterlyLeagueChampionIfDue'), context);
    await assert.rejects(context.notifyQuarterlyLeagueChampionIfDue(), /fixture db failure/);
    assert.equal(resets, 1, 'A database error after claiming must release the announcement');
    cycleFails = false;
    sendFails = true;
    assert.equal((await context.notifyQuarterlyLeagueChampionIfDue()).ok, false);
    assert.equal(resets, 2);
    sendFails = false;
    assert.equal((await context.notifyQuarterlyLeagueChampionIfDue()).sent, 1);
    assert.equal((await context.notifyQuarterlyLeagueChampionIfDue()).skipped, 'already_sent');
    assert.equal(resets, 2, 'Successful announcement must remain deduplicated');
    console.log('PASS: league announcement releases its claim after database/FCM failure and deduplicates success.');
}

function clientFixture() {
    let time = 0, sequence = 0, permission = 'prompt';
    let activeScreen = 'splash-screen', leagueModal = false;
    const timers = new Map(), listeners = {}, storage = new Map(), calls = [];
    const setTimer = (callback, delay = 0) => {
        const id = ++sequence;
        timers.set(id, { callback, at: time + delay });
        return id;
    };
    const plugin = {
        addListener: async (name, handler) => { listeners[name] = handler; },
        createChannel: async data => calls.push(['channel', data.id]),
        checkPermissions: async () => ({ receive: permission }),
        requestPermissions: async () => ({ receive: 'granted' }),
        register: async () => calls.push(['register']), unregister: async () => calls.push(['unregister'])
    };
    const app = { playerId: 'user', socket: { connected: true, emit: (name, data, ack) => {
        calls.push([name, data]);
        if (ack) ack({ ok: true });
    } }, authenticateSocketIdentity: async () => ({ ok: true }),
    claimPendingRewardBeforeExternalNavigation: async () => true,
    navigateTo: id => { activeScreen = id; },
    showHighscoresScreen: async () => { activeScreen = 'highscores-screen'; },
    topListManager: { filterGlobal: period => calls.push(['filter', period]) },
    tournamentManager: { open: () => calls.push(['tournament']),
        openMatchModal: (round, index) => calls.push(['match', round, index]) },
    showQuarterWinnerModal: data => calls.push(['winner', data]),
    hasMeaningfulLocalProfile: () => true,
    modal: { confirm: async body => { calls.push(['foreground', body]); return false; } } };
    const context = vm.createContext({ console: quietConsole, window: { app,
        Capacitor: { Plugins: { PushNotifications: plugin }, isNativePlatform: () => true, getPlatform: () => 'android' },
        kvartalnaLiga: { openModal: () => { leagueModal = true; },
            toggleMainView: view => calls.push(['league', view]), switchHofTab: tab => calls.push(['hof', tab]) } },
    document: { readyState: 'complete', querySelector: () => ({ id: activeScreen }),
        getElementById: id => id === 'league-modal-overlay' ? (leagueModal ? {} : null)
            : id === 'splash-login-container' ? { style: {} } : null },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, String(value)),
        removeItem: key => storage.delete(key) }, setTimeout: setTimer, clearTimeout: id => timers.delete(id),
    Capacitor: { Plugins: { FirebaseAuthentication: { getCurrentUser: async () => ({ user: { uid: 'user' } }) } } },
    normalizeFirebaseAuthUser: user => user,
    setYambAuthState(user) {
        if (user?.uid) storage.set('yamb_uid', user.uid);
        else storage.delete('yamb_uid');
        return user;
    },
    osveziAuthUI() {}, authActionInProgress: false,
    syncLoggedInProfileToCloud: async () => true, refreshLeagueDashboardForCurrentUser() {}, restoreAccountLocalSnapshot: () => false });
    vm.runInContext(read('www/pushNotifications.js'), context);
    vm.runInContext(actual(authSource, 'checkLoginStatus'), context);
    const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
    return { app, context, calls, storage, listeners, api: context.window.yambPushNotifications,
        screen: () => activeScreen, setPermission: value => { permission = value; }, flush,
        async advance(duration) {
            const until = time + duration;
            await flush();
            while (true) {
                const next = [...timers].filter(([, item]) => item.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
                if (!next) break;
                time = next[1].at;
                timers.delete(next[0]);
                await next[1].callback();
                await flush();
            }
            time = until;
        } };
}

async function checkClient() {
    const f = clientFixture();
    f.setPermission('denied');
    assert.equal((await f.api.ensureRegistered(f.app)).reason, 'permission_denied');
    assert(!f.calls.some(row => row[0] === 'register'));
    f.setPermission('prompt');
    assert.equal((await f.api.ensureRegistered(f.app)).ok, true);
    await f.listeners.registration({ value: 'fixture-token-abcdefghijklmnopqrstuvwxyz' });
    await f.flush();
    assert.equal(f.calls.filter(row => row[0] === 'push_register_token').length, 1);
    await f.api.syncCurrentDevice(f.app);
    assert.equal(f.calls.filter(row => row[0] === 'push_register_token').length, 1, 'Daily cache should avoid redundant sync');
    f.storage.set('yamb_lang', 'en');
    await f.api.syncCurrentDevice(f.app, { force: true });
    const registered = f.calls.filter(row => row[0] === 'push_register_token');
    assert.equal(registered.at(-1)[1].language, 'en', 'Language changes must reach the token record');
    assert(Object.values(registered.at(-1)[1].categories).every(Boolean));

    await f.context.checkLoginStatus();
    f.listeners.pushNotificationActionPerformed({ notification: { data: {
        type: 'record_broken', period: 'monthly', scope: 'records'
    } } });
    await f.advance(1000);
    assert.equal(f.screen(), 'highscores-screen');
    assert(f.calls.some(row => row[0] === 'filter' && row[1] === 'monthly'));
    await f.advance(10000);
    assert.equal(f.screen(), 'highscores-screen', 'Late auth completion must not eject the push destination');
    f.app.navigateTo('main-menu');
    assert.equal(f.screen(), 'main-menu', 'Manual navigation remains unrestricted');

    f.api.openTournamentFromNotification({ round: 'f', index: '0' });
    await f.advance(1000);
    assert(f.calls.some(row => row[0] === 'match' && row[1] === 'f' && row[2] === 0));
    f.api.openLeagueHallOfFameFromNotification({ type: 'league_champion_announced', periodKey: '2026-Q3',
        playerName: 'Fixture winner', score: '1234' });
    await f.advance(1000);
    assert(f.calls.some(row => row[0] === 'winner' && row[1].quarter === 3));
    assert(f.calls.some(row => row[0] === 'hof' && row[1] === 'champions'));
    f.listeners.pushNotificationReceived({ title: 'Fixture', body: '<script>bad</script>', data: { type: 'record_broken' } });
    await f.flush();
    assert(f.calls.some(row => row[0] === 'foreground' && row[1].includes('&lt;script&gt;')));
    await f.api.unregisterCurrentDevice(f.app);
    assert(f.calls.some(row => row[0] === 'push_unregister_token'));
    assert.equal(f.storage.has('yamb_push_token'), false);

    const normal = clientFixture();
    await normal.context.checkLoginStatus();
    await normal.advance(5000);
    assert.equal(normal.screen(), 'main-menu', 'Normal authenticated startup must still complete');
    console.log('PASS: native permissions, token registration/language/logout, foreground escaping, push destinations and delayed auth navigation.');
}

(async () => {
    await checkTransport();
    await checkLeagueRetry();
    await checkClient();
})().catch(error => { console.error(error); process.exitCode = 1; });
