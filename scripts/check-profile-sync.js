const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const gameSource = fs.readFileSync(path.join(root, 'www', 'game.js'), 'utf8');

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

function extractAsyncFunction(source, name) {
    const start = source.indexOf(`async function ${name}`);
    assert.notStrictEqual(start, -1, `Missing async server function: ${name}`);

    const bodyStart = source.indexOf('{', start);
    let depth = 0;
    let quote = null;
    let escaped = false;

    for (let i = bodyStart; i < source.length; i++) {
        const char = source[i];

        if (quote) {
            if (escaped) escaped = false;
            else if (char === '\\') escaped = true;
            else if (char === quote) quote = null;
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

    throw new Error(`Unclosed async server function: ${name}`);
}

function extractClassMethod(source, signature) {
    const start = source.indexOf(signature);
    assert.notStrictEqual(start, -1, `Missing client method: ${signature}`);

    const methodBodyMarker = source.indexOf(') {', start);
    assert.notStrictEqual(methodBodyMarker, -1, `Missing client method body: ${signature}`);
    const bodyStart = methodBodyMarker + 2;
    let depth = 0;
    let quote = null;
    let escaped = false;

    for (let i = bodyStart; i < source.length; i++) {
        const char = source[i];

        if (quote) {
            if (escaped) escaped = false;
            else if (char === '\\') escaped = true;
            else if (char === quote) quote = null;
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

    throw new Error(`Unclosed client method: ${signature}`);
}

function toSafeInt(value, fallback = 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function isDailyKeyToday(value, today, legacyToday) {
    return value === today || value === legacyToday;
}

function checkBalanceSyncAllowance() {
    assert(
        !serverSource.includes('MAX_AD_REWARD_PER_SYNC'),
        'Profile sync still contains a generic ad reward allowance'
    );

    const context = {
        Math,
        Number,
        Date,
        REQUIRE_ADMOB_SSV: false,
        MAX_DAILY_REWARD: 5000,
        MAX_REWARD_PER_GAME: 500,
        MAX_TOURNEY_REWARD: 10000,
        toSafeInt,
        isDailyKeyToday,
        getDailyChallengeDayKey() { return '2026-06-29'; },
        getLegacyDailyDayKey() { return '2026-06-29'; },
        getDailyChallengeForUid() { return { reward: 750 }; }
    };
    vm.createContext(context);
    vm.runInContext(extractFunction(serverSource, 'calculateAllowedBalanceIncrease'), context);
    const calculateAllowedBalanceIncrease = vm.runInContext('calculateAllowedBalanceIncrease', context);

    const existingUser = {
        firebaseUid: 'test-firebase-uid',
        lastDaily: '',
        lastDailyRewardClaimed: ''
    };

    assert.strictEqual(
        calculateAllowedBalanceIncrease(existingUser, { games: 10, tournamentWins: 2 }, 10, 2, 0),
        0,
        'Unchanged stats received an unexplained balance allowance'
    );
    assert.strictEqual(
        calculateAllowedBalanceIncrease(existingUser, { games: 11, tournamentWins: 2 }, 10, 2, 0),
        500,
        'Game delta reward allowance regressed'
    );
    assert.strictEqual(
        calculateAllowedBalanceIncrease(existingUser, { games: 10, tournamentWins: 3 }, 10, 2, 0),
        10000,
        'Tournament delta reward allowance regressed'
    );
    assert.strictEqual(
        calculateAllowedBalanceIncrease(existingUser, {
            games: 10,
            tournamentWins: 2,
            lastDaily: '2026-06-29',
            dailyRewardClaimed: '2026-06-29',
            dailyRewardAmount: 750
        }, 10, 2, 0),
        750,
        'Daily reward allowance regressed'
    );
}

function checkEmptySnapshotSettingsGuard() {
    const settingsStart = serverSource.indexOf('const requestedSoundEnabled = coerceBooleanSetting(s.soundEnabled);');
    assert.notStrictEqual(settingsStart, -1, 'Missing profile settings sync block');

    const settingsEnd = serverSource.indexOf('if (s.penaltyPoints', settingsStart);
    assert.notStrictEqual(settingsEnd, -1, 'Could not find end of profile settings sync block');

    const settingsSection = serverSource.slice(settingsStart, settingsEnd);
    const guardStart = settingsSection.indexOf('if (canApplyClientProfileSettings) {');
    assert.notStrictEqual(guardStart, -1, 'Profile settings are not guarded against empty client snapshots');

    const beforeGuard = settingsSection.slice(0, guardStart);
    const guardedBlock = settingsSection.slice(guardStart);
    [
        'user.soundEnabled =',
        'user.vibrationEnabled =',
        'user.musicEnabled =',
        'user.musicVolume =',
        'user.language ='
    ].forEach(assignment => {
        assert(
            !beforeGuard.includes(assignment),
            `${assignment} can run before the empty snapshot guard`
        );
        assert(
            guardedBlock.includes(assignment),
            `${assignment} is missing from the guarded settings block`
        );
    });

    assert(
        settingsSection.includes('const canApplyClientProfileSettings = !ignoreEmptyClientSnapshot;'),
        'Profile settings guard does not depend on ignoreEmptyClientSnapshot'
    );
}

function checkAuthWriteBoundary() {
    const handlerStart = serverSource.indexOf("socket.on('set_player_data'");
    assert.notStrictEqual(handlerStart, -1, 'Missing set_player_data handler');

    const handlerEnd = serverSource.indexOf("socket.on('get_online_players_list'", handlerStart);
    assert.notStrictEqual(handlerEnd, -1, 'Could not isolate set_player_data handler');

    const handler = serverSource.slice(handlerStart, handlerEnd);
    const unauthStart = handler.indexOf('if (!verifiedUid)');
    assert.notStrictEqual(unauthStart, -1, 'set_player_data no longer checks verified Firebase UID');

    const unauthEnd = handler.indexOf('try {', unauthStart);
    assert.notStrictEqual(unauthEnd, -1, 'Could not isolate unauthenticated set_player_data branch');

    const unauthBlock = handler.slice(unauthStart, unauthEnd);
    assert(
        unauthBlock.includes("socket.emit('auth_required'") && unauthBlock.includes('return;'),
        'Unauthenticated set_player_data can continue toward profile writes'
    );
}

function checkAuthoritativeOnlineDuelStats() {
    const profilePayload = extractFunction(serverSource, 'buildProfileSyncPayload');
    assert(
        profilePayload.includes('statsAuthoritative: true') && profilePayload.includes('h2hAuthoritative: true'),
        'Profile sync does not mark server stats and H2H as authoritative'
    );

    const completedPayloadStart = serverSource.indexOf("io.to(roomId).emit('online_game_finished'");
    assert.notStrictEqual(completedPayloadStart, -1, 'Missing authoritative online game result payload');
    const completedPayload = serverSource.slice(completedPayloadStart, completedPayloadStart + 1200);
    assert(
        completedPayload.includes('serverStatsAppliedUids'),
        'Online game result does not tell each client whether the server saved its stats'
    );

    const clientFinishStart = gameSource.indexOf('const serverStatsApplied = !!(');
    assert.notStrictEqual(clientFinishStart, -1, 'Client does not detect server-applied regular duel stats');
    const clientFinish = gameSource.slice(clientFinishStart, clientFinishStart + 900);
    assert(
        clientFinish.includes('serverApplied: serverStatsApplied'),
        'Client does not pass the server-applied marker into updateStats'
    );

    const updateStatsStart = gameSource.indexOf('updateStats(score, resultType');
    assert.notStrictEqual(updateStatsStart, -1, 'Missing client updateStats method');
    const updateStats = gameSource.slice(updateStatsStart, updateStatsStart + 5200);
    assert(
        updateStats.includes('const serverAppliedResult = !!options.serverApplied;') &&
        updateStats.includes('!serverAppliedResult && !isTechnical') &&
        updateStats.includes('!serverAppliedResult && !options.deferServerSync'),
        'Server-applied regular duel can still increment or re-sync client stats'
    );

    const cloudMergeStart = gameSource.indexOf('mergeCloudH2HStats(h2hStats)');
    assert.notStrictEqual(cloudMergeStart, -1, 'Missing cloud H2H sync method');
    const cloudMerge = gameSource.slice(cloudMergeStart, cloudMergeStart + 900);
    assert(
        cloudMerge.includes("localStorage.setItem('yamb_h2h_stats', JSON.stringify(cloudH2H))") &&
        !cloudMerge.includes('combineCounts'),
        'Corrected authoritative cloud H2H can still be combined with stale local counters'
    );

    const cloudProfileStart = gameSource.indexOf('applyCloudProfileSync(data = {})');
    assert.notStrictEqual(cloudProfileStart, -1, 'Missing client cloud profile sync method');
    const cloudProfile = gameSource.slice(cloudProfileStart, cloudProfileStart + 18000);
    assert(
        cloudProfile.includes('const statsAuthoritative = data.statsAuthoritative === true;') &&
        cloudProfile.includes('statsAuthoritative ? cloudValue : Math.max(localValue, cloudValue)') &&
        cloudProfile.includes('if (data.h2hAuthoritative === true)') &&
        cloudProfile.includes('this.mergeCloudH2HStats(data.h2hStats);'),
        'Corrected lower server counters can be restored from stale local profile data'
    );

    const h2hSyncStart = serverSource.indexOf('if (s.h2hStats) {');
    assert.notStrictEqual(h2hSyncStart, -1, 'Missing server H2H profile sync block');
    const h2hSync = serverSource.slice(h2hSyncStart, h2hSyncStart + 1300);
    assert(
        h2hSync.includes('const authoritativeH2H =') && !h2hSync.includes('mergeH2HRecord('),
        'Existing server H2H can still add untrusted client counters'
    );

    const quitToMenu = extractClassMethod(gameSource, 'async quitToMenu()');
    assert(
        quitToMenu.includes("this.socket.emit('back_to_menu')") &&
        quitToMenu.includes('backToMenuSent = true') &&
        quitToMenu.includes('this.showMainMenu({ skipBackToMenu: backToMenuSent })'),
        'Manual online quit does not notify the server exactly once before navigation'
    );
    [
        'this.updateStats(',
        "localStorage.setItem('yamb_dukati'",
        'window.kvartalnaLiga.addPoints('
    ].forEach(forbidden => {
        assert(
            !quitToMenu.includes(forbidden),
            `Manual online quit still applies client-side penalty via ${forbidden}`
        );
    });

    const showMainMenu = extractClassMethod(gameSource, 'async showMainMenu(options = {})');
    assert(
        showMainMenu.includes('!options.skipBackToMenu') && showMainMenu.includes("this.socket.emit('back_to_menu')"),
        'Main menu navigation can resend an already reported online quit'
    );
}

function checkClientDuelStatsBehavior() {
    const storage = new Map();
    const localStorage = {
        getItem(key) { return storage.has(key) ? storage.get(key) : null; },
        setItem(key, value) { storage.set(key, String(value)); }
    };
    const context = { Math, Number, JSON, parseInt, localStorage, window: { statsManager: null } };
    vm.createContext(context);

    const updateStatsSource = extractClassMethod(gameSource, 'updateStats(score, resultType');
    const updateStats = vm.runInContext(`(function ${updateStatsSource})`, context);
    const initialStats = {
        games: 10,
        totalGames: 10,
        wins: 4,
        losses: 6,
        highscore: 2700,
        totalScoreSum: 20000,
        currentWinStreak: 0,
        maxWinStreak: 2
    };

    function makeHarness() {
        storage.set('yamb_stats', JSON.stringify(initialStats));
        const calls = { h2h: 0, sync: 0 };
        return {
            harness: {
                stats: { ...initialStats },
                onlineMode: true,
                isSpectator: false,
                players: ['Igrač A', 'Igrač B'],
                playerName: 'Igrač A',
                myOnlineIndex: 0,
                currentOpponentPhoto: '',
                currentOpponentUid: 'opponent-stable-uid',
                socket: { connected: true },
                readLocalJson(key, fallback) {
                    const raw = localStorage.getItem(key);
                    return raw ? JSON.parse(raw) : fallback;
                },
                updateH2HStats() { calls.h2h++; },
                emitPlayerData() { calls.sync++; }
            },
            calls
        };
    }

    let test = makeHarness();
    updateStats.call(test.harness, 2500, 'loss', 2600, false, {
        serverApplied: true,
        skipH2H: true,
        deferServerSync: true
    });
    assert.strictEqual(test.harness.stats.games, 10, 'Server-applied duel incremented client games');
    assert.strictEqual(test.harness.stats.losses, 6, 'Server-applied duel incremented client losses');
    assert.strictEqual(test.harness.stats.totalScoreSum, 20000, 'Server-applied duel duplicated total score');
    assert.deepStrictEqual(test.calls, { h2h: 0, sync: 0 }, 'Server-applied duel updated H2H or echoed profile sync');

    test = makeHarness();
    updateStats.call(test.harness, 2500, 'loss', 2600, false, {
        serverApplied: false,
        deferServerSync: false
    });
    assert.strictEqual(test.harness.stats.games, 11, 'Server failure fallback did not count the duel locally');
    assert.strictEqual(test.harness.stats.losses, 7, 'Server failure fallback did not count the result locally');
    assert.strictEqual(test.harness.stats.totalScoreSum, 22500, 'Server failure fallback did not add the score');
    assert.deepStrictEqual(test.calls, { h2h: 1, sync: 1 }, 'Server failure fallback did not update H2H and request sync once');

    const mergeSource = extractClassMethod(gameSource, 'mergeCloudH2HStats(h2hStats)');
    const mergeCloudH2HStats = vm.runInContext(`(function ${mergeSource})`, context);
    const authoritative = { opponent: { name: 'Protivnik', wins: 2, losses: 2, draws: 0 } };
    storage.set('yamb_h2h_stats', JSON.stringify({ opponent: { name: 'Protivnik', wins: 2, losses: 3, draws: 0 } }));
    mergeCloudH2HStats.call({ normalizeH2HStats(value) { return value; } }, authoritative);
    assert.deepStrictEqual(
        JSON.parse(storage.get('yamb_h2h_stats')),
        authoritative,
        'Authoritative cloud H2H did not replace the inflated local record'
    );
}

async function checkServerDuelIdempotency() {
    const roomState = {
        duel: {
            players: ['socket-a', 'socket-b'],
            playerUids: ['uid-player-a', 'uid-player-b'],
            playerNames: ['Igrač A', 'Igrač B'],
            allScores: [2500, 2600],
            turnIndex: 0
        }
    };
    const saves = [];
    const profileSyncs = [];
    const emitted = [];
    const ledger = new Map();
    const users = new Map([
        ['uid-player-a', { firebaseUid: 'uid-player-a', async save() { saves.push(this.firebaseUid); } }],
        ['uid-player-b', { firebaseUid: 'uid-player-b', async save() { saves.push(this.firebaseUid); } }]
    ]);
    const context = {
        MONGO_URI: 'mongodb://test',
        roomState,
        calculateCompletedDuelTotal(sheet) { return sheet; },
        getDuelParticipantMeta(socketId, fallbackName, fallbackUid) {
            return { uid: fallbackUid, name: fallbackName, photoUrl: '' };
        },
        UserProfile: { async findOne(query) { return users.get(query.firebaseUid) || null; } },
        ensureRoomMatchId(roomId, state) {
            if (!state.matchId) state.matchId = `match-${roomId}`;
            return state.matchId;
        },
        async ensureMatchResult(payload) {
            let result = ledger.get(payload.matchId);
            const created = !result;
            if (!result) {
                result = { ...payload, statsAppliedUids: [] };
                ledger.set(payload.matchId, result);
            }
            return { ok: true, created, result };
        },
        async markMatchResultStatsApplied(matchId, uid) {
            const result = ledger.get(matchId);
            if (!result) return false;
            if (!result.statsAppliedUids.includes(uid)) result.statsAppliedUids.push(uid);
            return true;
        },
        hasUserAppliedMatchResult(user, matchId) {
            return Array.isArray(user.recentMatchResultIds) && user.recentMatchResultIds.includes(matchId);
        },
        rememberUserAppliedMatchResult(user, matchId) {
            user.recentMatchResultIds = [...(user.recentMatchResultIds || []), matchId];
        },
        queueMatchResultReconciliation() {},
        applyCompletedDuelProfileStats(user, resultType, score) { user.profileResult = { resultType, score }; },
        applyCompletedDuelH2H(user, opponent, resultType, score, opponentScore) {
            user.h2hResult = { opponent: opponent.uid, resultType, score, opponentScore };
        },
        emitProfileSyncToUid(uid, user, extra) { profileSyncs.push({ uid, user, extra }); },
        getOnlineDuelType() { return 'random'; },
        io: { to() { return { emit(event, payload) { emitted.push({ event, payload }); } }; } },
        console: { log() {}, error() {} },
        Array, Math
    };
    vm.createContext(context);
    vm.runInContext(extractAsyncFunction(serverSource, 'applyServerSideCompletedDuel'), context);
    vm.runInContext(extractFunction(serverSource, 'emitCompletedOnlineGame'), context);

    const firstApplied = await context.applyServerSideCompletedDuel('duel', 'socket-a');
    assert.deepStrictEqual(Array.from(firstApplied), ['uid-player-a', 'uid-player-b'], 'Server did not save both duel profiles');
    assert.deepStrictEqual(saves, ['uid-player-a', 'uid-player-b'], 'Server saved an unexpected number of duel profiles');
    assert.strictEqual(profileSyncs.length, 2, 'Server did not return the saved profile to both players');

    const repeatedApplied = await context.applyServerSideCompletedDuel('duel', 'socket-b');
    assert.deepStrictEqual(Array.from(repeatedApplied), ['uid-player-a', 'uid-player-b'], 'Repeated game_over lost applied UID state');
    assert.strictEqual(saves.length, 2, 'Repeated game_over saved the same duel twice');
    assert.deepStrictEqual(
        Array.from(ledger.get('match-duel').statsAppliedUids),
        ['uid-player-a', 'uid-player-b'],
        'Durable match ledger did not retain both applied profile markers'
    );

    assert.strictEqual(context.emitCompletedOnlineGame('duel'), true, 'Completed online game payload was not emitted');
    assert.deepStrictEqual(
        Array.from(emitted[0].payload.serverStatsAppliedUids),
        ['uid-player-a', 'uid-player-b'],
        'Completed payload did not identify both server-saved profiles'
    );

    roomState.partial = {
        players: ['socket-partial-a', 'socket-partial-b'],
        playerUids: ['uid-partial-a', 'uid-partial-b'],
        playerNames: ['Igrač C', 'Igrač D'],
        allScores: [2700, 2400],
        turnIndex: 0
    };
    users.set('uid-partial-a', {
        firebaseUid: 'uid-partial-a',
        async save() { saves.push(this.firebaseUid); }
    });
    users.set('uid-partial-b', {
        firebaseUid: 'uid-partial-b',
        async save() { throw new Error('simulated database failure'); }
    });

    const partialApplied = await context.applyServerSideCompletedDuel('partial', 'socket-partial-a');
    assert.deepStrictEqual(Array.from(partialApplied), ['uid-partial-a'], 'Partial save marked a failed profile as server-applied');
    assert.strictEqual(context.emitCompletedOnlineGame('partial'), true, 'Partial result payload was not emitted');
    assert.deepStrictEqual(
        Array.from(emitted[1].payload.serverStatsAppliedUids),
        ['uid-partial-a'],
        'Partial result payload did not isolate the successfully saved profile'
    );
}

async function main() {
    checkBalanceSyncAllowance();
    checkEmptySnapshotSettingsGuard();
    checkAuthWriteBoundary();
    checkAuthoritativeOnlineDuelStats();
    checkClientDuelStatsBehavior();
    await checkServerDuelIdempotency();

    console.log('Profile sync checks passed: auth boundary, profile guards, balance allowance, authoritative duel stats, fallback, and idempotency.');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
