const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const leagueSource = fs.readFileSync(path.join(root, 'www', 'kvartalnaliga.js'), 'utf8');
const gameSource = fs.readFileSync(path.join(root, 'www', 'game.js'), 'utf8');
const rulesSource = fs.readFileSync(path.join(root, 'www', 'pravilaigre.js'), 'utf8');

function extractFunction(source, name) {
    const start = source.indexOf(`function ${name}(`);
    assert.notStrictEqual(start, -1, `Missing function ${name}`);
    const bodyStart = source.indexOf('{', start);
    let depth = 0;
    let quote = null;
    let escaped = false;

    for (let index = bodyStart; index < source.length; index++) {
        const char = source[index];
        if (quote) {
            if (escaped) escaped = false;
            else if (char === '\\') escaped = true;
            else if (char === quote) quote = null;
            continue;
        }
        if (char === '"' || char === "'" || char === '`') {
            quote = char;
            continue;
        }
        if (char === '{') depth++;
        if (char === '}' && --depth === 0) return source.slice(start, index + 1);
    }

    throw new Error(`Could not extract function ${name}`);
}

function checkQuarterClockAndSettlement() {
    const context = vm.createContext({ Date, Intl, Math, Number, Object });
    vm.runInContext(`
        const LEADERBOARD_TIME_ZONE = 'Europe/Belgrade';
        const MAX_GAME_DURATION = 6 * 60 * 60 * 1000;
        const LEAGUE_SETTLEMENT_GRACE_MS = MAX_GAME_DURATION + (5 * 60 * 1000);
        ${extractFunction(serverSource, 'getTimeZoneParts')}
        ${extractFunction(serverSource, 'getTimeZoneOffsetMs')}
        ${extractFunction(serverSource, 'zonedLocalDateTimeToUtc')}
        ${extractFunction(serverSource, 'zonedLocalMidnightToUtc')}
        ${extractFunction(serverSource, 'getServerQuarterInfo')}
        ${extractFunction(serverSource, 'getLeaguePeriodEnd')}
        ${extractFunction(serverSource, 'getLeagueSettlementInfo')}
    `, context);

    const getQuarter = vm.runInContext('getServerQuarterInfo', context);
    const getEnd = vm.runInContext('getLeaguePeriodEnd', context);
    const getSettlement = vm.runInContext('getLeagueSettlementInfo', context);

    assert.deepStrictEqual(
        { ...getQuarter(new Date('2026-06-30T21:59:59.999Z')) },
        { year: 2026, quarter: 2 },
        'Belgrade Q2 ended too early'
    );
    assert.deepStrictEqual(
        { ...getQuarter(new Date('2026-06-30T22:00:00.000Z')) },
        { year: 2026, quarter: 3 },
        'Belgrade Q3 did not start at local midnight'
    );
    assert.strictEqual(getEnd(2026, 2).toISOString(), '2026-06-30T22:00:00.000Z');
    assert.strictEqual(getSettlement(2026, 2, new Date('2026-07-01T04:04:59.999Z')).settled, false);
    assert.strictEqual(getSettlement(2026, 2, new Date('2026-07-01T04:05:00.000Z')).settled, true);
}

function checkRanksAndModes() {
    for (const band of [
        '{ min: 0, max: 4999 }',
        '{ min: 5000, max: 14999 }',
        '{ min: 15000, max: 49999 }',
        '{ min: 50000, max: 99999 }',
        '{ min: 100000, max: MAX_LEAGUE_SCORE }'
    ]) {
        assert(serverSource.includes(band), `Missing rank band ${band}`);
    }

    for (const mode of ['solo', 'hotseat', 'ai', 'random', 'friend_invite', 'challenge', 'tournament', 'online']) {
        assert(serverSource.includes(`'${mode}'`), `League match ledger is missing mode ${mode}`);
    }
    assert(gameSource.includes('await this.queueCompletedLocalMatchResult({'), 'Local modes do not enter the match ledger');
    assert(serverSource.includes('await applyTechnicalLeagueDelta(user, player.score, { periodDate:'), 'Regular online modes do not add final score to the league');
}

function checkRewardsAndArchiveSafety() {
    const archive = extractFunction(serverSource, 'archiveLeagueQuarter');
    assert(archive.includes('if (!settlement.settled) return null;'), 'Quarter archive can freeze before settlement');
    assert(archive.includes('archivedAtMs >= settlement.settlesAt.getTime()'), 'Premature archives are not rebuilt after settlement');

    const rewardStart = serverSource.indexOf("socket.on('check_quarter_reward'");
    const rewardEnd = serverSource.indexOf("socket.on('claim_shop_ad_reward'", rewardStart);
    const rewardHandler = serverSource.slice(rewardStart, rewardEnd);
    assert(rewardHandler.includes('!isPastLeaguePeriod(year, quarter)'), 'Current or future quarter can claim a reward');
    assert(rewardHandler.includes("reason: 'quarter_settling'"), 'Reward claim does not wait for late match results');
    assert(rewardHandler.includes('rank === 1) rewardAmount = 10000'));
    assert(rewardHandler.includes('rank === 2) rewardAmount = 5000'));
    assert(rewardHandler.includes('rank === 3) rewardAmount = 2500'));
    assert(rewardHandler.includes('claimedLeagueRewards: { $ne: rewardKey }'), 'Quarter reward is not idempotent');

    assert(serverSource.includes("{ periodDate: storedResult?.finishedAt }"), 'Technical win can cross into the wrong quarter');
    assert(serverSource.includes("periodDate: storedResult?.finishedAt"), 'Technical loss can cross into the wrong quarter');
    assert(serverSource.includes("return replyMatchResult(false, 'invalid_finished_at', true);"), 'Client can forge an old quarter finish time');
}

function checkTotalsAndPresentation() {
    assert(serverSource.includes('const MAX_LEAGUE_ALL_TIME_SCORE = 1000000000;'), 'All-Time total still uses the quarterly cap');
    assert(serverSource.includes('Math.min(MAX_LEAGUE_ALL_TIME_SCORE'), 'All-Time normalization does not use its own cap');
    assert(leagueSource.includes("timeZone: 'Europe/Belgrade'"), 'Client quarter is based on device timezone');
    assert(leagueSource.includes('const safePoints = Number(points);'), 'Client league points can concatenate strings');
    assert(leagueSource.includes("return myUid ? scoreUid === myUid : score?.playerName === myName;"), 'Players with the same name can overwrite each other in the league view');
    assert(gameSource.includes('this.mergeCloudLeagueData(uid, data.leagueData, { preferIncoming: true });'), 'Verified server league penalties can leave a stale higher local score');
    assert(gameSource.includes('const automaticRewardKey = `yamb_quarter_reward_checked_'), 'A player on a new device can miss the previous-quarter reward');
    assert(serverSource.includes("{ $sort: { score: -1, date: 1, playerId: 1 } }"), 'Tied league scores do not have deterministic ordering');
    assert(rulesSource.includes('Amater 0-4.999'), 'Displayed rules omit rank thresholds');
    assert(rulesSource.includes('10.000, 5.000 i 2.500'), 'Displayed rules omit exact quarter rewards');
}

checkQuarterClockAndSettlement();
checkRanksAndModes();
checkRewardsAndArchiveSafety();
checkTotalsAndPresentation();

console.log('Quarterly league checks passed.');
