const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const configSource = fs.readFileSync(path.join(root, 'www', 'config.js'), 'utf8');
const trophyManagerSource = fs.readFileSync(path.join(root, 'www', 'trophyManager.js'), 'utf8');
const gameSource = fs.readFileSync(path.join(root, 'www', 'game.js'), 'utf8');
const featuresSource = fs.readFileSync(path.join(root, 'www', 'features.js'), 'utf8');
const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(root, 'www', 'index.html'), 'utf8');

function extractFunction(source, name) {
    const start = source.indexOf(`function ${name}`);
    assert.notStrictEqual(start, -1, `Missing server function: ${name}`);

    const bodyStart = source.indexOf('{', start);
    let depth = 0;
    let quote = null;
    let escaped = false;

    for (let i = bodyStart; i < source.length; i++) {
        const char = source[i];

        if (quote) {
            if (escaped) {
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (char === quote) {
                quote = null;
            }
            continue;
        }

        if (char === "'" || char === '"' || char === '`') {
            quote = char;
            continue;
        }
        if (char === '{') depth++;
        if (char === '}') {
            depth--;
            if (depth === 0) return source.slice(start, i + 1);
        }
    }

    throw new Error(`Unclosed server function: ${name}`);
}

const storage = new Map();
const clientContext = {
    console: { log() {}, warn() {}, error: console.error },
    window: {
        location: { hostname: 'localhost', protocol: 'http:', host: 'localhost' },
        Capacitor: undefined
    },
    module: { exports: {} },
    localStorage: {
        getItem(key) { return storage.has(key) ? storage.get(key) : null; },
        setItem(key, value) { storage.set(key, String(value)); },
        removeItem(key) { storage.delete(key); }
    },
    document: {
        getElementById() { return null; },
        createElement() { return { classList: { add() {}, remove() {} }, remove() {} }; },
        body: { appendChild() {} }
    },
    URL,
    Intl,
    Date,
    Math,
    Number,
    Object,
    Promise,
    Set,
    clearTimeout,
    setTimeout
};
vm.createContext(clientContext);
vm.runInContext(configSource, clientContext);
vm.runInContext(trophyManagerSource, clientContext);
vm.runInContext(featuresSource, clientContext);

const clientConfig = vm.runInContext(`({
    total: CONFIG.TOTAL_TROPHIES,
    trophies: SHOP_DATA.TROPHIES,
    columns: KOLONE,
    rows: REDOVI_IGRA
})`, clientContext);
const TrophyManager = clientContext.window.TrophyManager;
const YambFeatures = clientContext.window.YambFeatures;

const rewardsMatch = serverSource.match(/const TROPHY_REWARDS = Object\.freeze\((\{[\s\S]*?\n\})\);/);
assert(rewardsMatch, 'Missing TROPHY_REWARDS');
const serverRewards = vm.runInNewContext(`(${rewardsMatch[1]})`);

const specialIdsMatch = serverSource.match(/const SPECIAL_TROPHY_IDS = new Set\((\[[\s\S]*?\])\);/);
assert(specialIdsMatch, 'Missing SPECIAL_TROPHY_IDS');
const specialTrophyIds = vm.runInNewContext(specialIdsMatch[1]);

const serverContext = {
    console: { log() {}, warn() {}, error: console.error },
    Intl,
    Date,
    Math,
    Number,
    Object,
    Set,
    Array,
    KOLONE: Array.from(clientConfig.columns),
    REDOVI_IGRA: Array.from(clientConfig.rows),
    ALL_TROPHY_IDS: new Set(Object.keys(serverRewards)),
    SPECIAL_TROPHY_IDS: new Set(specialTrophyIds),
    MAX_PROFILE_GAMES: 1000000,
    MAX_PENALTY_POINTS: 1000000,
    MAX_PROFILE_COMPETITIVE_BUFFER: 1000000,
    MAX_SCORE: 100000,
    __nightHour: 12
};
vm.createContext(serverContext);

[
    'toSafeInt',
    'sanitizeIdArray',
    'clampSafeInt',
    'normalizeProfileStats',
    'hasProfileStatsPayload',
    'isProgressTrophyEarned',
    'getTrophyCell',
    'sumTopRows',
    'hasOnlyYambZeros',
    'isBelgradeNightOwlHour',
    'normalizeTrophyProof',
    'getTrophyProgressStats',
    'isSpecialTrophyEarned',
    'isTrophyClaimEarned',
    'filterAllowedTrophies',
    'buildInitialProfileState'
].forEach(name => vm.runInContext(extractFunction(serverSource, name), serverContext));
vm.runInContext('isBelgradeNightOwlHour = () => __nightHour >= 3 && __nightHour <= 5;', serverContext);
const serverClaimEarned = vm.runInContext('isTrophyClaimEarned', serverContext);
const buildInitialProfileState = vm.runInContext('buildInitialProfileState', serverContext);

const clientIds = clientConfig.trophies.map(trophy => trophy.id);
const serverIds = Object.keys(serverRewards);
assert.strictEqual(clientConfig.total, clientIds.length, 'CONFIG.TOTAL_TROPHIES is stale');
assert.strictEqual(new Set(clientIds).size, clientIds.length, 'Duplicate client trophy ID');
assert.deepStrictEqual([...clientIds].sort(), [...serverIds].sort(), 'Client/server trophy IDs differ');
clientConfig.trophies.forEach(trophy => {
    assert.strictEqual(Number(trophy.reward), Number(serverRewards[trophy.id]), `Reward mismatch: ${trophy.id}`);
});
assert(indexSource.includes(`id="stat-trophies" class="stat-val-mini c-gold">0 / ${clientIds.length}<`), 'Initial trophy count is stale');
assert(gameSource.includes("reason: 'pending_trophy_claims'"), 'Profile sync does not block unresolved trophy claims');
assert(gameSource.includes('confirmTrophyShowcaseEntries'), 'Game-over trophy showcase does not validate claim results');
assert(gameSource.includes("new Set(['invalid_trophy', 'trophy_not_earned'])"), 'Trophy showcase does not filter permanent claim rejections');
assert(gameSource.includes('timeoutMs = 9000'), 'Trophy showcase can time out before the claim result settles');
assert(gameSource.includes('if (result === timeoutResult) return null;'), 'Trophy showcase displays unconfirmed timed-out claims');
assert(serverSource.includes('estimateEconomyCeiling({ ...stats, unlockedTrophies: requestedTrophies })'), 'Initial economy ceiling uses unfiltered trophies');

const guardedInitialProfile = buildInitialProfileState({
    games: 1,
    highscore: 100,
    unlockedTrophies: ['first_play', 'godlike', 'unknown_trophy']
});
assert.deepStrictEqual(Array.from(guardedInitialProfile.unlockedTrophies), ['first_play'], 'Initial profile accepted an invalid progress trophy');
const legacySpecialProfile = buildInitialProfileState({ games: 1, unlockedTrophies: ['prophet'] });
assert.deepStrictEqual(Array.from(legacySpecialProfile.unlockedTrophies), ['prophet'], 'Initial legacy special trophy import regressed');

const columns = Array.from(clientConfig.columns);
const rows = Array.from(clientConfig.rows);

function makeSheet(fill = null) {
    return Object.fromEntries(columns.map(column => [
        column,
        Object.fromEntries(rows.map(row => [row, fill]))
    ]));
}

function withCell(sheet, column, row, value) {
    sheet[column][row] = value;
    return sheet;
}

function topRows(sheet, column, values) {
    ['1', '2', '3', '4', '5', '6'].forEach((row, index) => {
        sheet[column][row] = values[index];
    });
    return sheet;
}

const fullSheet = () => makeSheet(10);
const cases = [
    { id: 'first_play', expected: true, stats: { games: 0, totalGames: 0 } },
    { id: 'apprentice', expected: true, stats: { games: 9, totalGames: 9 } },
    { id: 'apprentice', expected: false, stats: { games: 8, totalGames: 8 } },
    { id: 'veteran', expected: true, stats: { games: 49, totalGames: 49 } },
    { id: 'veteran', expected: false, stats: { games: 48, totalGames: 48 } },
    { id: 'kafana', expected: true, mode: 'Hotseat' },
    { id: 'kafana', expected: false, mode: 'Solo' },
    { id: 'score_1000', expected: true, score: 1000 },
    { id: 'score_1000', expected: false, score: 999 },
    { id: 'grandmaster', expected: true, score: 1250 },
    { id: 'grandmaster', expected: true, score: 0, stats: { highscore: 1250 } },
    { id: 'grandmaster', expected: false, score: 1249 },
    { id: 'legend', expected: true, score: 2000 },
    { id: 'legend', expected: false, score: 1999 },
    { id: 'mythic', expected: true, score: 2500 },
    { id: 'mythic', expected: false, score: 2499 },
    { id: 'godlike', expected: true, score: 3000 },
    { id: 'godlike', expected: false, score: 2999 },
    { id: 'surgeon', expected: true, sheet: fullSheet() },
    { id: 'surgeon', expected: false, sheet: withCell(fullSheet(), 'Ručno', 'Poker', 0) },
    { id: 'immortal', expected: true, sheet: fullSheet() },
    { id: 'immortal', expected: false, sheet: withCell(fullSheet(), 'Najava', 'Yamb', 0) },
    { id: 'minimal', expected: true, sheet: withCell(makeSheet(), 'Nadole', 'Min', 6) },
    { id: 'minimal', expected: false, sheet: withCell(makeSheet(), 'Nadole', 'Min', 7) },
    { id: 'math', expected: true, sheet: topRows(makeSheet(), 'Slobodna', [3, 6, 9, 12, 15, 18]) },
    { id: 'math', expected: false, sheet: topRows(makeSheet(), 'Slobodna', [3, 6, 9, 12, 15, 17]) },
    { id: 'concrete', expected: true, sheet: columns.reduce((sheet, column) => withCell(sheet, column, 'Kenta', 30), makeSheet()) },
    { id: 'concrete', expected: false, sheet: columns.slice(0, -1).reduce((sheet, column) => withCell(sheet, column, 'Kenta', 30), makeSheet()) },
    { id: 'perfectionist', expected: true, sheet: columns.reduce((sheet, column) => topRows(sheet, column, [10, 10, 10, 10, 10, 10]), makeSheet()) },
    { id: 'perfectionist', expected: false, sheet: columns.reduce((sheet, column, index) => topRows(sheet, column, index === 0 ? [9, 10, 10, 10, 10, 10] : [10, 10, 10, 10, 10, 10]), makeSheet()) },
    { id: 'miner', expected: true, sheet: Object.assign(makeSheet(), { Nadole: { ...makeSheet().Nadole, Max: 30, Min: 5, '1': 3 } }) },
    { id: 'miner', expected: false, sheet: Object.assign(makeSheet(), { Nadole: { ...makeSheet().Nadole, Max: 25, Min: 5, '1': 3 } }) },
    { id: 'prophet', expected: true, flags: { hasProphet: true } },
    { id: 'prophet', expected: false, flags: { hasProphet: false } },
    { id: 'sveti_ilija', expected: true, flags: { hasSvetiIlija: true } },
    { id: 'sveti_ilija', expected: false, flags: { hasSvetiIlija: false } },
    { id: 'sniper', expected: true, sheet: withCell(makeSheet(), 'Najava', 'Yamb', 50) },
    { id: 'sniper', expected: false, sheet: withCell(makeSheet(), 'Najava', 'Yamb', 0) },
    { id: 'hazard', expected: true, sheet: withCell(makeSheet(), 'Ručno', 'Yamb', 50) },
    { id: 'hazard', expected: false, sheet: withCell(makeSheet(), 'Ručno', 'Yamb', 0) },
    { id: 'firecracker', expected: true, sheet: columns.slice(0, 5).reduce((sheet, column) => withCell(sheet, column, 'Yamb', 50), makeSheet()) },
    { id: 'firecracker', expected: false, sheet: columns.slice(0, 4).reduce((sheet, column) => withCell(sheet, column, 'Yamb', 50), makeSheet()) },
    { id: 'potato', expected: true, sheet: withCell(makeSheet(), 'Sredina', 'Yamb', 0) },
    { id: 'potato', expected: false, sheet: withCell(makeSheet(), 'Sredina', 'Yamb', 50) },
    { id: 'achilles', expected: true, sheet: withCell(fullSheet(), 'Nagore', 'Yamb', 0) },
    { id: 'achilles', expected: false, sheet: withCell(fullSheet(), 'Nagore', 'Poker', 0) },
    { id: 'night_owl', expected: true, hour: 3 },
    { id: 'night_owl', expected: false, hour: 2 },
    { id: 'close_call', expected: true, mode: 'Online', flags: { scoreDiff: -4 } },
    { id: 'close_call', expected: false, mode: 'Online', flags: { scoreDiff: 5 } },
    { id: 'close_call', expected: false, mode: 'Solo', flags: { scoreDiff: 1 } },
    { id: 'spite', expected: true, mode: 'AI', flags: { scoreDiff: 200 } },
    { id: 'spite', expected: false, mode: 'AI', flags: { scoreDiff: 199 } },
    { id: 'spite', expected: false, mode: 'Solo', flags: { scoreDiff: 500 } }
];

class StatsStub {
    constructor(stats) {
        this.stats = {
            games: 0,
            totalGames: 0,
            wins: 0,
            losses: 0,
            highscore: 0,
            totalScoreSum: 0,
            tournamentWins: 0,
            maxWinStreak: 0,
            currentWinStreak: 0,
            penaltyPoints: 0,
            balance: 0,
            unlockedTrophies: [],
            ...stats
        };
    }

    getStats() { return this.stats; }
    saveStats() {}
    unlockTrophy(trophyId) {
        if (!this.stats.unlockedTrophies.includes(trophyId)) {
            this.stats.unlockedTrophies.push(trophyId);
            return true;
        }
        return false;
    }
}

cases.forEach((testCase, index) => {
    const trophy = clientConfig.trophies.find(item => item.id === testCase.id);
    assert(trophy, `Unknown trophy in test: ${testCase.id}`);

    const statsManager = new StatsStub(testCase.stats);
    const manager = new TrophyManager(statsManager, null);
    manager.trophies = [trophy];
    manager.getBelgradeHour = () => testCase.hour ?? 12;

    let proof = null;
    manager.unlock = (item, claimProof) => {
        proof = claimProof;
        return { trophy: item, claimPromise: Promise.resolve() };
    };

    const score = testCase.score ?? 0;
    const sheet = testCase.sheet || makeSheet();
    const mode = testCase.mode || 'Solo';
    const flags = testCase.flags || {};
    const unlocked = manager.checkEndGameTrophies(score, sheet, mode, flags);
    const clientEarned = unlocked.length === 1;
    assert.strictEqual(clientEarned, testCase.expected, `Client condition failed: ${testCase.id} case ${index + 1}`);
    if (clientEarned) {
        assert(unlocked[0].claimPromise && typeof unlocked[0].claimPromise.then === 'function', `Unlocked trophy is missing claimPromise: ${testCase.id}`);
    }

    if (!proof) proof = manager.buildClaimProof(score, sheet, mode, flags);
    serverContext.__nightHour = testCase.hour ?? 12;
    const serverEarned = serverClaimEarned(testCase.id, statsManager.stats, proof);
    assert.strictEqual(serverEarned, testCase.expected, `Server condition failed: ${testCase.id} case ${index + 1}`);
});

async function checkPendingClaimRetry() {
    storage.clear();
    clientContext.localStorage.setItem('yamb_uid', 'test-user');
    clientContext.window.app = { socket: { connected: true } };

    const trophy = clientConfig.trophies.find(item => item.id === 'first_play');
    const statsManager = new StatsStub({ balance: 1000 });
    const manager = new TrophyManager(statsManager, null);
    manager.claimServerReward = async () => ({
        ok: true,
        localFallback: true,
        trophyId: trophy.id,
        reward: trophy.reward
    });

    const unlockResult = manager.unlock(trophy, { stats: { games: 1 } }, { silent: true });
    await unlockResult.claimPromise;
    assert.strictEqual(statsManager.stats.balance, 1500, 'Local fallback reward was not applied exactly once');
    assert.strictEqual(manager.loadPendingClaims().length, 1, 'Local fallback proof was not queued');

    clientContext.window.app.socket.connected = false;
    const disconnectedResult = await manager.retryPendingClaims();
    assert.strictEqual(disconnectedResult.remaining, 1, 'Disconnected retry did not report pending claims');
    assert.strictEqual(manager.loadPendingClaims().length, 1, 'Disconnected retry removed a pending claim');
    clientContext.window.app.socket.connected = true;

    manager.claimServerReward = async () => ({ ok: false, reason: 'claim_timeout' });
    const timeoutResult = await manager.retryPendingClaims();
    assert.strictEqual(timeoutResult.claimed, 0, 'Timed-out pending claim was incorrectly marked claimed');
    assert.strictEqual(timeoutResult.remaining, 1, 'Timed-out pending claim was incorrectly removed');

    manager.claimServerReward = async () => ({
        ok: true,
        trophyId: trophy.id,
        reward: trophy.reward,
        balance: 1500
    });
    const retryResult = await manager.retryPendingClaims();
    assert.strictEqual(retryResult.claimed, 1, 'Pending trophy was not retried');
    assert.strictEqual(manager.loadPendingClaims().length, 0, 'Successful pending claim was not removed');
    assert.strictEqual(statsManager.stats.balance, 1500, 'Server balance was not applied after retry');

    clientContext.localStorage.setItem('yamb_uid', 'other-user');
    assert.strictEqual(manager.loadPendingClaims().length, 0, 'Pending trophy claims leaked between users');
}

async function checkPermanentClaimRollback() {
    storage.clear();
    clientContext.localStorage.setItem('yamb_uid', 'rollback-user');
    clientContext.localStorage.setItem('yamb_unlocked', JSON.stringify(['default', 'first_play']));
    clientContext.window.app = { socket: { connected: true } };

    const trophy = clientConfig.trophies.find(item => item.id === 'first_play');
    const statsManager = new StatsStub({ balance: 1000, unlockedTrophies: [] });
    const manager = new TrophyManager(statsManager, null);
    manager.claimServerReward = async () => ({ ok: false, reason: 'trophy_not_earned', trophyId: trophy.id });

    const unlockResult = manager.unlock(trophy, { stats: { games: 0 } }, { silent: true });
    await unlockResult.claimPromise;
    assert(!statsManager.stats.unlockedTrophies.includes(trophy.id), 'Permanently rejected trophy stayed locally unlocked');
    assert.strictEqual(statsManager.stats.balance, 1000, 'Immediate permanent rejection changed local balance');
    assert(!JSON.parse(clientContext.localStorage.getItem('yamb_unlocked')).includes(trophy.id), 'Rejected trophy stayed in yamb_unlocked');
    assert.strictEqual(manager.loadPendingClaims().length, 0, 'Permanent rejection was queued for retry');
}

async function checkPendingPermanentRollback() {
    storage.clear();
    clientContext.localStorage.setItem('yamb_uid', 'pending-rollback-user');
    clientContext.window.app = { socket: { connected: true } };

    const trophy = clientConfig.trophies.find(item => item.id === 'first_play');
    const statsManager = new StatsStub({ balance: 1000, unlockedTrophies: [] });
    const manager = new TrophyManager(statsManager, null);
    manager.claimServerReward = async () => ({
        ok: true,
        localFallback: true,
        trophyId: trophy.id,
        reward: trophy.reward
    });

    const unlockResult = manager.unlock(trophy, { stats: { games: 1 } }, { silent: true });
    await unlockResult.claimPromise;
    assert.strictEqual(statsManager.stats.balance, 1500, 'Local fallback reward was not applied before pending rollback test');
    assert(statsManager.stats.unlockedTrophies.includes(trophy.id), 'Local fallback trophy was not locally unlocked before rollback test');
    assert.strictEqual(manager.loadPendingClaims()[0].localRewardApplied, true, 'Pending claim did not remember local reward application');

    manager.claimServerReward = async () => ({ ok: false, reason: 'trophy_not_earned', trophyId: trophy.id });
    const retryResult = await manager.retryPendingClaims();
    assert.strictEqual(retryResult.remaining, 0, 'Permanently rejected pending claim was not removed');
    assert(!statsManager.stats.unlockedTrophies.includes(trophy.id), 'Permanently rejected pending trophy stayed locally unlocked');
    assert.strictEqual(statsManager.stats.balance, 1000, 'Local fallback reward was not reversed after permanent rejection');
}

function checkFeatureFallbackProof() {
    storage.clear();
    const originalIntl = clientContext.Intl;
    const originalDate = clientContext.Date;
    let captured = [];

    class FakeDate extends originalDate {
        constructor(...args) {
            super(args.length ? args[0] : '2026-01-01T00:00:00Z');
        }

        getHours() {
            return 1;
        }

        static now() {
            return new originalDate('2026-01-01T00:00:00Z').getTime();
        }
    }

    try {
        clientContext.Intl = {
            DateTimeFormat: class {
                constructor(_locale, options) {
                    this.options = options;
                }

                format() {
                    assert.strictEqual(this.options.timeZone, 'Europe/Belgrade', 'Feature fallback does not request Belgrade time');
                    return '4';
                }
            }
        };
        clientContext.Date = FakeDate;
        clientContext.window.statsManager = new StatsStub({
            games: 1,
            totalGames: 1,
            balance: 1000,
            unlockedTrophies: []
        });
        clientContext.window.trophyManager = {
            unlock(trophy, proof) {
                captured.push({ trophy, proof });
            }
        };

        const runFeatures = scores => {
            captured = [];
            const features = new YambFeatures({
                stats: {},
                onlineMode: false,
                aiMode: false,
                players: ['Me', 'Near', 'Leader'],
                playerName: 'Me',
                hasProphet: false,
                hasSvetiIlija: false,
                calculateTotalScore(index) {
                    return scores[index] || 0;
                }
            });
            features.checkAchievements(scores[0], makeSheet());
            return captured;
        };

        const closeCaptured = runFeatures([1000, 1003, 999]);
        const nightOwl = closeCaptured.find(entry => entry.trophy.id === 'night_owl');
        assert(nightOwl, 'Feature fallback did not unlock night_owl at Belgrade hour');
        assert.strictEqual(nightOwl.proof.flags.localHour, 4, 'Feature fallback proof used local browser hour instead of Belgrade hour');

        const closeCall = closeCaptured.find(entry => entry.trophy.id === 'close_call');
        assert(closeCall, 'Feature fallback did not detect close finish with best opponent');
        assert.strictEqual(closeCall.proof.flags.scoreDiff, 3, 'Feature fallback close_call proof uses the wrong scoreDiff');

        const spiteCaptured = runFeatures([1000, 1003, 1205]);
        const spite = spiteCaptured.find(entry => entry.trophy.id === 'spite');
        assert(spite, 'Feature fallback did not compare against the best opponent score');
        assert.strictEqual(spite.proof.flags.scoreDiff, 205, 'Feature fallback scoreDiff does not use best opponent minus own score');
    } finally {
        clientContext.Intl = originalIntl;
        clientContext.Date = originalDate;
        delete clientContext.window.trophyManager;
    }
}

async function checkLedgerFailureHandling() {
    const ledgerUpdates = [];
    const ledgerContext = {
        console: { log() {}, warn() {}, error: console.error },
        ALL_TROPHY_IDS: new Set(serverIds),
        UserProfile: {
            async updateOne(query, update) {
                ledgerUpdates.push({ query, update });
                return { matchedCount: 1 };
            }
        },
        Array,
        Set,
        Object
    };
    vm.createContext(ledgerContext);
    ['sanitizeIdArray', 'sanitizeTrophyIds', 'ensureTrophyRewardLedger']
        .forEach(name => {
            const extracted = extractFunction(serverSource, name);
            vm.runInContext(name === 'ensureTrophyRewardLedger' ? `async ${extracted}` : extracted, ledgerContext);
        });

    const ensureLedger = vm.runInContext('ensureTrophyRewardLedger', ledgerContext);
    const migrated = await ensureLedger({
        _id: 'legacy-user',
        unlockedTrophies: ['first_play', 'invalid'],
        claimedTrophyRewards: undefined,
        unmarkModified() {}
    });
    assert.deepStrictEqual(Array.from(migrated), ['first_play'], 'Legacy trophy ledger was not sanitized');
    assert.strictEqual(ledgerUpdates.length, 1, 'Legacy trophy ledger was not persisted');

    ledgerContext.UserProfile.updateOne = async () => {
        throw new Error('database unavailable');
    };
    await assert.rejects(() => ensureLedger({
        _id: 'failing-user',
        unlockedTrophies: ['first_play'],
        claimedTrophyRewards: undefined,
        unmarkModified() {}
    }), /database unavailable/, 'Ledger database failure was swallowed');
}

checkFeatureFallbackProof();

(async () => {
    await checkPendingClaimRetry();
    await checkPermanentClaimRollback();
    await checkPendingPermanentRollback();
    await checkLedgerFailureHandling();
})()
    .then(() => {
        console.log(`Trophy checks passed: ${clientIds.length} definitions, ${cases.length} condition cases, feature fallback, pending retry, permanent rollback, ledger failure, and initial profile guard flows.`);
    })
    .catch(err => {
        console.error(err);
        process.exitCode = 1;
    });
