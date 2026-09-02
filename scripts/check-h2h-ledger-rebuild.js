const assert = require('assert');
const { H2H_LEDGER_VERSION, buildPlan, rebuildH2HFromMatches } = require('./rebuild-h2h-from-ledger');

const profiles = [
    { firebaseUid: 'uid-alex-1234567890', playerName: 'Alex', photoUrl: 'alex.png', h2hStats: { legacy: { name: 'Legacy', wins: 9 } } },
    { firebaseUid: 'uid-boba-1234567890', playerName: 'Boba', photoUrl: 'boba.png', h2hStats: {} },
    { firebaseUid: 'uid-cica-1234567890', playerName: 'Cica', photoUrl: 'cica.png', h2hStats: {} }
];

const matches = [
    {
        matchId: 'regular-win', mode: 'random', resultType: 'regular', verification: 'server', statsComplete: true,
        finishedAt: '2026-06-01T12:00:00Z',
        participants: [
            { uid: profiles[0].firebaseUid, score: 800 },
            { uid: profiles[1].firebaseUid, score: 700 }
        ]
    },
    {
        matchId: 'regular-draw', mode: 'friend_invite', resultType: 'regular', verification: 'server', statsComplete: true,
        finishedAt: '2026-06-02T12:00:00Z',
        participants: [
            { uid: profiles[0].firebaseUid, score: 750 },
            { uid: profiles[1].firebaseUid, score: 750 }
        ]
    },
    {
        matchId: 'technical-loss', mode: 'challenge', resultType: 'technical', verification: 'server', statsComplete: true,
        finishedAt: '2026-06-03T12:00:00Z',
        participants: [
            { uid: profiles[0].firebaseUid, result: 'loss', score: 0 },
            { uid: profiles[1].firebaseUid, result: 'win', score: 0 }
        ]
    },
    {
        matchId: 'not-complete', mode: 'online', resultType: 'regular', verification: 'server', statsComplete: false,
        participants: [
            { uid: profiles[0].firebaseUid, score: 1000 },
            { uid: profiles[1].firebaseUid, score: 1 }
        ]
    },
    {
        matchId: 'solo-is-not-h2h', mode: 'solo', resultType: 'regular', verification: 'authenticated_client', statsComplete: true,
        participants: [{ uid: profiles[2].firebaseUid, score: 1000 }]
    }
];

const rebuilt = rebuildH2HFromMatches(profiles, matches);
assert.strictEqual(rebuilt.acceptedMatches, 3, 'Only complete verified online duels may enter H2H.');
assert.strictEqual(rebuilt.skipped.incomplete, 1, 'Incomplete ledger result must be excluded.');
assert.strictEqual(rebuilt.skipped.not_online, 1, 'Solo result must be excluded.');

const alex = rebuilt.rebuilt.get(profiles[0].firebaseUid)[profiles[1].firebaseUid];
const boba = rebuilt.rebuilt.get(profiles[1].firebaseUid)[profiles[0].firebaseUid];
assert.deepStrictEqual(
    { wins: alex.wins, losses: alex.losses, draws: alex.draws, myTotalScore: alex.myTotalScore, gamesWithScore: alex.gamesWithScore, myHighScore: alex.myHighScore, maxWinMargin: alex.maxWinMargin, maxLossMargin: alex.maxLossMargin, currentWinStreak: alex.currentWinStreak, maxWinStreak: alex.maxWinStreak },
    { wins: 1, losses: 1, draws: 1, myTotalScore: 1550, gamesWithScore: 2, myHighScore: 800, maxWinMargin: 100, maxLossMargin: 0, currentWinStreak: 0, maxWinStreak: 1 },
    'Regular and technical results must have the right H2H semantics.'
);
assert.deepStrictEqual(
    { wins: boba.wins, losses: boba.losses, draws: boba.draws, myTotalScore: boba.myTotalScore, gamesWithScore: boba.gamesWithScore },
    { wins: 1, losses: 1, draws: 1, myTotalScore: 1450, gamesWithScore: 2 },
    'The reverse H2H card must be symmetric.'
);

const plan = buildPlan(profiles, matches);
assert.strictEqual(plan.ledgerVersion, H2H_LEDGER_VERSION, 'Plan must mark the H2H ledger version.');
assert.strictEqual(plan.profilesToUpdate, 2, 'Only profiles whose H2H cards differ from the ledger may be updated.');
assert.strictEqual(plan.rebuiltCards, 2, 'Only the verified pair should produce cards.');

console.log('H2H ledger rebuild checks passed.');
