const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

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

checkBalanceSyncAllowance();
checkEmptySnapshotSettingsGuard();
checkAuthWriteBoundary();

console.log('Profile sync checks passed: auth boundary, empty snapshot settings guard, and balance allowance guard.');
