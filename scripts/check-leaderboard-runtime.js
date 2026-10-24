const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../www/toplista.js'), 'utf8');
const serverSource = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8').replace(/\r\n/g, '\n');
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const uidA = 'firebase-profile-a-1234567890';
const uidB = 'firebase-profile-b-1234567890';

function harness() {
    const values = new Map([['yamb_uid', uidA]]);
    const stored = new Map();
    const timers = new Map();
    const requests = [];
    const handlers = new Map();
    let serial = 0;
    const container = {
        scrollHeight: 1200, scrollTop: 0, clientHeight: 500,
        addEventListener() {}, removeEventListener() {}
    };
    const list = {
        innerHTML: '', children: [], closest: () => container,
        appendChild(row) { this.children.push(row); }
    };
    const root = { classList: { contains: value => value === 'active' } };
    const localList = { innerHTML: '', children: [], appendChild(row) { this.children.push(row); } };
    const document = {
        getElementById(id) {
            if (id === 'global-hs-list') return list;
            if (id === 'local-hs-list') return localList;
            if (id === 'highscores-screen') return root;
            return null;
        },
        querySelectorAll: () => [],
        createElement: () => ({ classList: { add() {} }, setAttribute() {} })
    };
    const socket = {
        connected: true,
        emit(event, payload, ack) { requests.push({ event, payload, ack }); },
        on(event, callback) {
            if (!handlers.has(event)) handlers.set(event, new Set());
            handlers.get(event).add(callback);
        },
        off(event, callback) { handlers.get(event)?.delete(callback); }
    };
    const localforage = {
        async getItem(key) { return clone(stored.get(key)); },
        async setItem(key, value) { stored.set(key, clone(value)); }
    };
    const context = {
        console: { log() {}, warn() {}, error() {} }, document,
        window: { localforage, YambSecurity: {
            escapeHtml: value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
            escapeAttr: value => String(value).replaceAll('"', '&quot;'),
            safeUrl: value => value
        } }, localforage,
        getThemeMedalSource: (_, tier) => `assets/${tier}.png`,
        localStorage: {
            getItem: key => values.get(key) ?? null,
            setItem: (key, value) => values.set(key, value)
        },
        setTimeout(callback) { const id = ++serial; timers.set(id, callback); return id; },
        clearTimeout(id) { timers.delete(id); },
        requestAnimationFrame(callback) { callback(); }
    };
    const Manager = vm.runInNewContext(`${source}\nTopListManager`, context);
    const manager = new Manager({ socket, initSocketConnection() {} });
    const renders = [];
    manager.renderList = (rows, elementId, options) => renders.push({ rows: clone(rows), elementId, options });
    return { manager, socket, requests, timers, list, localList, values, renders,
        renderList: Manager.prototype.renderList,
        fire(event) { for (const callback of handlers.get(event) || []) callback(); } };
}

function entry(id, uid = uidA, score = 2000) {
    return { localId: id, matchId: id, uid, score, synced: false, date: '2026-10-24T10:00:00Z' };
}

async function checkConcurrentLocalWrites() {
    const { manager } = harness();
    await Promise.all([manager._saveLocal(entry('a')), manager._saveLocal(entry('b', uidB))]);
    assert.equal((await manager._readLocalScores()).length, 2,
        'Concurrent local writes lost a score from another account');
}

async function checkSyncDuringNewScore() {
    const { manager } = harness();
    await manager._saveLocal(entry('old'));
    let respond;
    let started;
    const ready = new Promise(resolve => { started = resolve; });
    manager._submitScoreToServer = () => new Promise(resolve => { respond = resolve; started(); });
    const syncing = manager.syncOfflineScores();
    await ready;
    await manager._saveLocal(entry('new', uidB, 2500));
    respond({ ok: true });
    await syncing;
    const scores = await manager._readLocalScores();
    assert.equal(scores.length, 2, 'Delayed score acknowledgement erased a newer phone score');
    assert.equal(scores.find(row => row.localId === 'old').synced, true);
    assert.equal(scores.find(row => row.localId === 'new').synced, false);
}

async function checkSyncAccountIsolation() {
    const { manager, values } = harness();
    await manager._saveLocal(entry('a'));
    await manager._saveLocal(entry('b', uidB));
    const submitted = [];
    manager._submitScoreToServer = async row => { submitted.push(row.uid); return { ok: true }; };
    await manager.syncOfflineScores();
    assert.deepEqual(submitted, [uidA]);
    values.set('yamb_uid', uidB);
    await manager.syncOfflineScores();
    assert.deepEqual(submitted, [uidA, uidB]);
}

function checkGlobalPaging() {
    const { manager, requests, renders } = harness();
    manager._loadGlobal();
    const first = requests.at(-1).payload;
    manager.filterGlobal('monthly');
    const monthly = requests.at(-1).payload;
    manager.handleGlobalPage({ ...first, data: [entry('stale')], hasMore: false });
    assert.equal(renders.length, 0, 'An old period response replaced the selected period');
    manager.handleGlobalPage({ ...monthly, data: [entry('a')], hasMore: true });
    manager.loadMoreGlobal();
    const next = requests.at(-1).payload;
    assert.equal(next.offset, 1);
    manager.handleGlobalPage({ ...next, data: [entry('a'), entry('b', uidB)], hasMore: false });
    assert.equal(manager._getGlobalPageState('monthly').items.length, 2);
    assert.equal(renders.at(-1).options.rankOffset, 1);
    assert.equal(renders.at(-1).rows.length, 1);
    const count = requests.length;
    manager.loadMoreGlobal();
    assert.equal(requests.length, count, 'Exhausted leaderboard keeps requesting pages');
}

function checkGlobalRequestRecovery() {
    const { manager, socket, timers, list, requests, fire } = harness();
    manager._loadGlobal();
    assert.ok(timers.size > 0, 'A lost global response can leave the room loading forever');
    for (const callback of [...timers.values()]) callback();
    assert.equal(manager._getGlobalPageState().loading, false, 'Timed out page cannot be retried');
    assert.ok(list.innerHTML.includes('offline'), 'Timeout does not replace the loading state');
    socket.connected = false;
    fire('disconnect');
    socket.connected = true;
    const count = requests.length;
    fire('connect');
    assert.ok(requests.length > count, 'Reconnection does not reload the visible leaderboard');
}

function checkOfflinePeriodSwitch() {
    const { manager, socket, list, timers } = harness();
    socket.connected = false;
    manager._loadGlobal();
    const weeklyTimer = [...timers.values()][0];
    manager.filterGlobal('monthly');
    list.innerHTML = 'monthly-content';
    weeklyTimer();
    assert.equal(list.innerHTML, 'monthly-content', 'An old offline timer overwrote another period');
}

async function checkConcurrentStatusUpdates() {
    const { manager } = harness();
    const a = entry('a');
    const b = entry('b');
    await manager._saveLocal(a);
    await manager._saveLocal(b);
    await Promise.all([
        manager._markLocalSubmitResult(a, { ok: true }),
        manager._markLocalSubmitResult(b, { permanent: true, reason: 'score_mismatch' }),
        manager._saveLocal(entry('c', uidB))
    ]);
    const scores = await manager._readLocalScores();
    assert.equal(scores.length, 3);
    assert.equal(scores.find(row => row.localId === 'a').synced, true);
    assert.equal(scores.find(row => row.localId === 'b').syncRejected, 'score_mismatch');
}

function checkGlobalErrorRetry() {
    const { manager, requests, renders } = harness();
    manager._loadGlobal();
    manager.handleGlobalPage({ ...requests.at(-1).payload, data: [entry('a')], hasMore: true });
    manager.loadMoreGlobal();
    const failed = requests.at(-1).payload;
    manager.handleGlobalPage({ ...failed, data: [], error: 'server_error' });
    assert.equal(manager._getGlobalPageState().items.length, 1);
    manager.loadMoreGlobal();
    const retry = requests.at(-1).payload;
    assert.equal(retry.offset, 1, 'Failed page retry skipped profiles');
    assert.notEqual(retry.requestId, failed.requestId);
    const count = renders.length;
    manager.handleGlobalPage({ ...failed, data: [entry('old', uidB)], hasMore: true });
    assert.equal(renders.length, count, 'An expired page response was accepted');
    manager.handleGlobalPage({ ...retry, data: [entry('b', uidB)], hasMore: false });
    assert.equal(manager._getGlobalPageState().items.length, 2);
}

function checkCalendarBoundaries() {
    const { manager } = harness();
    const context = vm.createContext({ LEADERBOARD_TIME_ZONE: 'Europe/Belgrade' });
    for (const name of ['getTimeZoneParts', 'getTimeZoneOffsetMs', 'zonedLocalDateTimeToUtc',
        'zonedLocalMidnightToUtc', 'getLeaderboardPeriodStart']) {
        const match = serverSource.match(new RegExp(`function ${name}\\([^]*?\\n\\}`));
        assert.ok(match, `Missing server function ${name}`);
        vm.runInContext(match[0], context);
    }
    const cases = [
        ['2026-03-29', '2026-03-22T23:00:00.000Z', '2026-02-28T23:00:00.000Z'],
        ['2026-03-30', '2026-03-29T22:00:00.000Z', '2026-02-28T23:00:00.000Z'],
        ['2026-10-25', '2026-10-18T22:00:00.000Z', '2026-09-30T22:00:00.000Z'],
        ['2026-10-26', '2026-10-25T23:00:00.000Z', '2026-09-30T22:00:00.000Z'],
        ['2027-01-01', '2026-12-27T23:00:00.000Z', '2026-12-31T23:00:00.000Z']
    ];
    for (const [day, weekly, monthly] of cases) {
        const now = new Date(`${day}T12:00:00Z`);
        for (const [period, expected] of [['weekly', weekly], ['monthly', monthly]]) {
            assert.equal(manager._getPeriodStart(period, now).toISOString(), expected);
            assert.equal(context.getLeaderboardPeriodStart(period, now).toISOString(), expected);
            manager._getPeriodStart = (original => (p, date = now) => original.call(manager, p, date))(
                Object.getPrototypeOf(manager)._getPeriodStart);
            const start = Date.parse(expected);
            const rows = [entry('before'), entry('at')];
            rows[0].date = new Date(start - 1).toISOString();
            rows[1].date = expected;
            assert.deepEqual(Array.from(manager._filterScoresForPeriod(rows, period), row => row.localId), ['at']);
        }
        assert.equal(manager._getPeriodStart('all_time', now), null);
        assert.equal(context.getLeaderboardPeriodStart('all_time', now), null);
    }
}

function checkLocalRendering() {
    const { manager, localList, renderList } = harness();
    const rows = Array.from({ length: 125 }, (_, i) => ({ ...entry(String(i), i % 2 ? uidA : uidB, 2500 - i),
        playerName: '<script>name</script>' }));
    renderList.call(manager, rows, 'local-hs-list');
    assert.equal(localList.children.length, 125, 'Local list hides scores after the first hundred');
    assert.ok(localList.children[0].innerHTML.includes('&lt;script&gt;'));
    assert.ok(!localList.children[0].innerHTML.includes('<script>'));
    assert.ok(localList.children.at(-1).innerHTML.includes('125'));
}

async function checkServerErrors() {
    const start = serverSource.indexOf("    socket.on('get_global_highscores'");
    const end = serverSource.indexOf("    socket.on('submit_match_result'", start);
    const responses = [];
    let handler;
    const context = vm.createContext({
        console: { error() {} }, MONGO_URI: '',
        socket: { on(_, callback) { handler = callback; }, emit(_, payload) { responses.push(payload); } },
        toSafeInt: (value, fallback) => Number(value) || fallback,
        getLeaderboardScoreAddFields: () => ({}),
        Score: { async aggregate() { throw new Error('database down'); } }
    });
    vm.runInContext(serverSource.slice(start, end), context);
    const request = { period: 'all_time', requestId: 42 };
    await handler(request);
    assert.equal(responses.at(-1).error, 'db_unavailable');
    context.MONGO_URI = 'test';
    await handler(request);
    assert.equal(responses.at(-1).error, 'server_error');
    assert.equal(responses.at(-1).requestId, 42);
}

async function main() {
    const checks = [checkConcurrentLocalWrites, checkSyncDuringNewScore, checkSyncAccountIsolation,
        checkConcurrentStatusUpdates, checkGlobalPaging, checkGlobalRequestRecovery, checkOfflinePeriodSwitch,
        checkGlobalErrorRetry, checkCalendarBoundaries, checkLocalRendering, checkServerErrors];
    let failed = 0;
    for (const check of checks) {
        try { await check(); console.log(`PASS ${check.name}`); }
        catch (error) { failed++; console.error(`FAIL ${check.name}: ${error.message}`); }
    }
    assert.equal(failed, 0, `${failed} leaderboard runtime checks failed`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
