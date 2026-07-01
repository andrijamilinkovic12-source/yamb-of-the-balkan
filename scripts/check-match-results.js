const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const gameSource = fs.readFileSync(path.join(root, 'www', 'game.js'), 'utf8');
const topListSource = fs.readFileSync(path.join(root, 'www', 'toplista.js'), 'utf8');

function sliceBalancedBlock(source, start) {
    const signatureEnd = source.indexOf(') {', start);
    const bodyStart = signatureEnd === -1 ? -1 : signatureEnd + 2;
    assert.notStrictEqual(bodyStart, -1, `Missing block near offset ${start}`);

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
        if (char === '}' && --depth === 0) return source.slice(start, i + 1);
    }
    throw new Error(`Unclosed block near offset ${start}`);
}

function extractFunction(source, name) {
    let start = source.indexOf(`async function ${name}`);
    if (start === -1) start = source.indexOf(`function ${name}`);
    assert.notStrictEqual(start, -1, `Missing function: ${name}`);
    return sliceBalancedBlock(source, start);
}

function checkMatchResultWiring() {
    assert(serverSource.includes('const MatchResultSchema = new mongoose.Schema({'), 'Missing MatchResult schema');
    assert(
        /MatchResultSchema\.index\(\{ matchId: 1 \}, \{ unique: true \}\)/.test(serverSource),
        'MatchResult matchId is not uniquely indexed'
    );
    assert(serverSource.includes("resultType: { type: String, enum: ['regular', 'technical']"), 'Ledger does not distinguish regular and technical results');
    assert(serverSource.includes('statsAppliedUids: { type: [String], default: [] }'), 'Ledger is missing per-profile application markers');
    assert(serverSource.includes('statsComplete: { type: Boolean, default: false }'), 'Ledger is missing reconciliation state');
    assert(serverSource.includes('recentMatchResultIds: { type: [String], default: [] }'), 'Profile is missing the crash-safe recent result marker');

    const roomMatchIds = serverSource.match(/matchId:\s*createServerMatchId\(\)/g) || [];
    assert(roomMatchIds.length >= 4, 'Not every online room creation/rematch receives a new matchId');

    const completedDuel = extractFunction(serverSource, 'applyServerSideCompletedDuel');
    assert(completedDuel.includes("resultType: 'regular'"), 'Regular online duel is not written to the ledger');
    assert(completedDuel.includes('ensureMatchResult({'), 'Regular online duel bypasses the ledger');
    assert(completedDuel.includes('hasUserAppliedMatchResult(user, matchId)'), 'Regular duel lacks durable profile idempotency');
    assert(/await applyTechnicalLeagueDelta\(user,\s*player\.score/.test(completedDuel), 'Regular online duel does not update quarterly league points server-side');
    assert(completedDuel.includes('markMatchResultStatsApplied(matchId, player.uid)'), 'Regular duel does not mark applied stats');

    const technical = extractFunction(serverSource, 'applyServerSideTechnicalResult');
    assert(technical.includes("resultType: 'technical'"), 'Technical duel is not written to the ledger');
    assert(technical.includes('ensureMatchResult({'), 'Technical duel bypasses the ledger');
    assert(technical.includes('hasUserAppliedMatchResult(winner, matchId)'), 'Technical win lacks durable profile idempotency');

    const reconciler = extractFunction(serverSource, 'reconcileStoredServerMatchResult');
    assert(reconciler.includes('hasUserAppliedMatchResult(user, result.matchId)'), 'Reconciler can duplicate a previously saved profile result');
    assert(/await applyTechnicalLeagueDelta\(user,\s*score/.test(reconciler), 'Reconciler does not restore quarterly league points for regular duel results');
    assert(reconciler.includes('markMatchResultStatsApplied(result.matchId, uid)'), 'Reconciler does not close incomplete ledger entries');
    assert(serverSource.includes('reconcileIncompleteServerMatchResults'), 'Missing incomplete result reconciliation worker');

    for (const reason of ['disconnect_grace_expired', 'turn_timeout', 'back_to_menu']) {
        assert(serverSource.includes(`reason: '${reason}'`), `Technical reason ${reason} is not persisted`);
    }

    const localHandlerStart = serverSource.indexOf("socket.on('submit_match_result'");
    const localHandlerEnd = serverSource.indexOf("socket.on('submit_score'", localHandlerStart);
    assert(localHandlerStart !== -1 && localHandlerEnd > localHandlerStart, 'Missing local match result endpoint');
    const localHandler = serverSource.slice(localHandlerStart, localHandlerEnd);
    assert(localHandler.includes('const verifiedUid = socket.verifiedUid;'), 'Local result endpoint is not bound to verified auth');
    assert(localHandler.includes('buildClientReportedMatchResult'), 'Local result endpoint does not validate the claimed result');
    assert(localHandler.includes('rememberUserAppliedMatchResult(user, matchId)'), 'Local result stats are not idempotent');

    assert(gameSource.includes('async queueCompletedLocalMatchResult({ mode, participants, playerIndex })'), 'Client is missing the durable local result queue');
    assert(gameSource.includes("this.socket.emit('submit_match_result'"), 'Client never sends queued results to the cloud');
    assert(gameSource.includes('await this.queueCompletedLocalMatchResult({'), 'Completed local game is not added to the queue');

    const completedRoomSettlement = extractFunction(serverSource, 'settleCompletedOnlineRoom');
    assert(completedRoomSettlement.includes('state.completionSettlementPromise'), 'Completed online room can be settled concurrently');
    assert(
        completedRoomSettlement.indexOf('state.completionSettlementPromise = settlementPromise;') <
            completedRoomSettlement.indexOf('return await settlementPromise;'),
        'Completed online room is not locked before awaiting settlement'
    );

    const connectStart = gameSource.indexOf("this.socket.on('connect', async () => {");
    const connectEnd = gameSource.indexOf("this.socket.on('users_count'", connectStart);
    const connectHandler = gameSource.slice(connectStart, connectEnd);
    assert(
        connectHandler.indexOf('await this.syncPendingMatchResults()') < connectHandler.indexOf('await this.emitPlayerData()'),
        'Reconnect pushes aggregate stats before pending match results'
    );
}

function createFunctionContext(extra = {}) {
    const context = {
        crypto,
        Date,
        Math,
        Number,
        JSON,
        MAX_SCORE: 10000,
        toSafeInt(value, fallback = 0) {
            const parsed = Number.parseInt(value, 10);
            return Number.isFinite(parsed) ? parsed : fallback;
        },
        sanitizeTournamentName(value) {
            return String(value || 'Nepoznat').trim().substring(0, 24) || 'Nepoznat';
        },
        sanitizeIdArray(value, maxItems = 150) {
            return Array.isArray(value) ? [...new Set(value.filter(item => typeof item === 'string'))].slice(0, maxItems) : [];
        },
        calculateCompletedDuelTotal(sheet) {
            return Number.isInteger(sheet) ? sheet : null;
        },
        ...extra
    };
    vm.createContext(context);
    vm.runInContext(`
        const MATCH_RESULT_MODES = new Set(['solo', 'hotseat', 'ai', 'random', 'friend_invite', 'challenge', 'tournament', 'online']);
        const MATCH_PARTICIPANT_RESULTS = new Set(['win', 'loss', 'draw', 'solo']);
        ${extractFunction(serverSource, 'createClientMatchId')}
        ${extractFunction(serverSource, 'normalizeMatchResultMode')}
        ${extractFunction(serverSource, 'normalizeMatchParticipant')}
        ${extractFunction(serverSource, 'normalizeMatchResultPayload')}
        ${extractFunction(serverSource, 'buildClientReportedMatchResult')}
        ${extractFunction(serverSource, 'getMatchResultIdentitySignature')}
    `, context);
    return context;
}

function checkLocalResultValidation() {
    const context = createFunctionContext();
    const input = {
        clientResultId: 'local_result_12345',
        mode: 'Hotseat',
        playerIndex: 0,
        participants: [
            { name: 'Player', score: 2500 },
            { name: 'Guest', score: 2400 }
        ],
        scoreSheets: [2500, 2400],
        profileGamesAfter: 11,
        profileTotalScoreAfter: 22000,
        profileHighscoreAfter: 2500,
        finishedAt: Date.now()
    };
    const first = context.buildClientReportedMatchResult('firebase-user-1234567890', 'Player', input);
    const repeated = context.buildClientReportedMatchResult('firebase-user-1234567890', 'Player', input);

    assert.strictEqual(first.ok, true, 'Valid Hotseat result was rejected');
    assert.strictEqual(first.payload.matchId, repeated.payload.matchId, 'Client result id is not deterministic');
    assert.strictEqual(first.payload.participants[0].result, 'win', 'Authenticated local winner was not derived server-side');
    assert.strictEqual(first.payload.participants[1].result, 'loss', 'Local loser was not derived server-side');
    assert.strictEqual(first.payload.participants[0].uid, 'firebase-user-1234567890', 'Verified UID was not assigned to the local player');
    assert.strictEqual(first.payload.participants[1].uid, '', 'Client supplied identity leaked to a local guest');

    const invalid = context.buildClientReportedMatchResult('firebase-user-1234567890', 'Player', {
        ...input,
        participants: [{ name: 'Player', score: 10001 }, { name: 'Guest', score: 0 }]
    });
    assert.strictEqual(invalid.ok, false, 'Out-of-range local score was accepted');

    const mismatchedSheet = context.buildClientReportedMatchResult('firebase-user-1234567890', 'Player', {
        ...input,
        scoreSheets: [2499, 2400]
    });
    assert.strictEqual(mismatchedSheet.ok, false, 'Local score that does not match the completed sheet was accepted');
}

async function checkLeaderboardSemantics() {
    const storage = new Map();
    const localforage = {
        async getItem(key) {
            return storage.has(key) ? storage.get(key) : null;
        },
        async setItem(key, value) {
            storage.set(key, JSON.parse(JSON.stringify(value)));
        }
    };
    const localStorage = {
        getItem(key) {
            return storage.has(`local:${key}`) ? storage.get(`local:${key}`) : null;
        },
        setItem(key, value) {
            storage.set(`local:${key}`, String(value));
        }
    };
    const context = {
        console: { log() {}, warn() {}, error() {} },
        Date,
        Intl,
        Math,
        Number,
        JSON,
        localforage,
        localStorage,
        window: { localforage },
        setTimeout() { return 1; },
        document: { getElementById() { return null; } }
    };
    vm.createContext(context);
    vm.runInContext(`${topListSource}\nglobalThis.TopListManager = TopListManager;`, context);

    const manager = new context.TopListManager({ socket: { connected: false } });
    const now = new Date('2026-07-01T12:00:00.000Z');
    assert.strictEqual(manager._getPeriodStart('weekly', now).toISOString(), '2026-06-28T22:00:00.000Z', 'Weekly leaderboard does not start Monday in Belgrade');
    assert.strictEqual(manager._getPeriodStart('monthly', now).toISOString(), '2026-06-30T22:00:00.000Z', 'Monthly leaderboard does not start at Belgrade month boundary');

    const entries = [
        { uid: 'firebase-user-a-1234567890', score: 100, date: '2026-06-28T21:59:59.000Z' },
        { uid: 'firebase-user-a-1234567890', score: 200, date: '2026-06-28T22:00:00.000Z' },
        { uid: 'firebase-user-b-1234567890', score: 300, date: '2026-06-30T22:00:00.000Z' }
    ];
    const originalGetPeriodStart = manager._getPeriodStart.bind(manager);
    manager._getPeriodStart = period => originalGetPeriodStart(period, now);
    assert.deepStrictEqual(
        Array.from(manager._filterScoresForPeriod(entries, 'weekly'), entry => entry.score),
        [200, 300],
        'Local weekly leaderboard includes scores before Monday or loses valid scores'
    );
    assert.deepStrictEqual(
        Array.from(manager._filterScoresForPeriod(entries, 'monthly'), entry => entry.score),
        [300],
        'Local monthly leaderboard uses the wrong month boundary'
    );
    assert.strictEqual(manager._filterScoresForPeriod(entries, 'all_time').length, 3, 'Local all-time leaderboard does not retain every score');

    await manager._saveLocal({ localId: 'a1', uid: entries[0].uid, score: 500, date: now.toISOString() });
    await manager._saveLocal({ localId: 'a2', uid: entries[0].uid, score: 400, date: now.toISOString() });
    await manager._saveLocal({ localId: 'b1', uid: entries[2].uid, score: 450, date: now.toISOString() });
    const storedScores = await manager._readLocalScores();
    assert.strictEqual(storedScores.length, 3, 'Local leaderboard deduplicates scores or accounts on the same phone');
    assert.deepStrictEqual(
        Array.from(storedScores, entry => entry.score),
        [500, 450, 400],
        'Local leaderboard does not retain and sort every phone score'
    );
    assert(
        topListSource.includes('if (isGlobalList) validData = validData.slice(0, this.maxEntries);'),
        'Local leaderboard display is still limited to the global TOP 100'
    );

    const globalHandlerStart = serverSource.indexOf("socket.on('get_global_highscores'");
    const globalHandlerEnd = serverSource.indexOf('// ==================================================================', globalHandlerStart + 50);
    const globalHandler = serverSource.slice(globalHandlerStart, globalHandlerEnd);
    assert(globalHandler.includes('_id: "$stableUid"'), 'Global leaderboard is not grouped by stable profile UID');
    assert(globalHandler.includes("getLeaderboardPeriodStart('weekly')"), 'Global weekly leaderboard is not period-filtered');
    assert(globalHandler.includes("getLeaderboardPeriodStart('monthly')"), 'Global monthly leaderboard is not period-filtered');
    assert(globalHandler.includes('bestEntry: { $first: "$$ROOT" }'), 'Global leaderboard does not keep one best score per profile');

    const completedDuel = extractFunction(serverSource, 'applyServerSideCompletedDuel');
    assert(completedDuel.includes('persistLeaderboardScoreRecord({'), 'Completed online duel does not write both authoritative scores to the leaderboard');
    assert(serverSource.includes('persistLeaderboardScoresForMatchResult(result'), 'Stored online results cannot repair missing leaderboard rows');
}

function checkGameRewardSessionRaceGuard() {
    const claimStart = serverSource.indexOf("socket.on('claim_game_reward'");
    assert.notStrictEqual(claimStart, -1, 'Missing claim_game_reward handler');
    const claimEnd = serverSource.indexOf("socket.on('get_league_highscores'", claimStart);
    assert.notStrictEqual(claimEnd, -1, 'Could not isolate claim_game_reward handler');
    const claimHandler = serverSource.slice(claimStart, claimEnd);

    assert(claimHandler.includes('rewardSession.claimInProgress'), 'Game reward claim is not protected by an in-memory session lock');
    assert(claimHandler.includes("reason: 'reward_claim_in_progress'"), 'Concurrent game reward claims do not receive a retryable in-progress response');
    assert(claimHandler.includes('rewardSession.claimInProgress = true;'), 'Game reward session is not locked before async reward writes');
    assert(
        claimHandler.indexOf('rewardSession.claimInProgress = true;') < claimHandler.indexOf('await UserProfile.findOne'),
        'Game reward session lock is acquired after the first async profile read'
    );
    assert(claimHandler.includes('releaseRewardClaimLock();'), 'Retryable game reward failures do not release the session lock');
    assert(claimHandler.includes('rewardSession.claimedAt = Date.now();'), 'Successful game reward claims are not marked claimed before clearing');

    assert(
        !serverSource.includes('getPendingGameRewardIncrease'),
        'Profile sync can still bypass claim_game_reward and consume a pending game reward'
    );
}

function checkVerifiedEconomyMatchProof() {
    assert(serverSource.includes('function createLocalGameSessionToken(uid)'), 'Missing signed local game session tokens');
    assert(serverSource.includes('crypto.timingSafeEqual'), 'Local game session signature is not timing-safe');
    assert(serverSource.includes("return replyMatchResult(false, 'game_too_short', true);"), 'Local match ledger accepts sessions shorter than the minimum duration');
    assert(serverSource.includes('normalized.payload.gameSessionId = existingResult') && serverSource.includes(': session.sessionId;'), 'Local match result is not bound to its signed session');
    assert(serverSource.includes("reason: 'game_session_already_used'"), 'Signed local session can be reused for another result');
    assert(serverSource.includes('economyEligible: { type: Boolean, default: false }'), 'Historical match results are implicitly eligible for a second economy reward');
    assert(serverSource.includes('economyEligible: true,\n        participants: participants.map'), 'New server-verified online results are not marked economy eligible');

    const scoreStart = serverSource.indexOf("socket.on('submit_score'");
    const scoreEnd = serverSource.indexOf("socket.on('claim_game_reward'", scoreStart);
    const scoreHandler = serverSource.slice(scoreStart, scoreEnd);
    assert(scoreHandler.includes('findVerifiedMatchParticipant(finalUid, data?.matchId, submittedScore)'), 'Leaderboard score does not require a stored match result');
    assert(extractFunction(serverSource, 'findVerifiedMatchParticipant').includes('economyEligible: true'), 'Leaderboard and rewards can monetize historical unverified match records');
    assert(!scoreHandler.includes('getScoreSessionDuration(socket.id)'), 'Leaderboard score still trusts a client-started timer instead of match proof');

    const leagueStart = serverSource.indexOf("socket.on('submit_league_score'");
    const leagueEnd = serverSource.indexOf('// ==================================================================', leagueStart);
    const leagueHandler = serverSource.slice(leagueStart, leagueEnd);
    assert(leagueHandler.includes("return replyLeagueSubmit(false, 'match_result_required');"), 'Quarterly league still accepts direct client score growth');

    assert(serverSource.includes('rememberUserClaimedGameReward(user, rewardSession.matchId);'), 'Game reward claim is not durably remembered with the balance');
    assert(serverSource.includes('{ $addToSet: { rewardClaimedUids: finalUid }, $set: { updatedAt: new Date() } }'), 'Game reward claim is not persisted in the permanent match ledger');
    assert(gameSource.includes("gameSessionToken: this.localGameSessionToken || ''"), 'Client does not preserve the signed local game session');
    assert(gameSource.includes('matchResultRef = await this.queueCompletedLocalMatchResult({'), 'Client submits leaderboard score before storing local match proof');
    assert(topListSource.includes("matchId: String(matchId || '')"), 'Leaderboard payload does not carry its match proof');

    const sessionContext = {
        Buffer,
        JSON,
        String,
        Number,
        Date,
        crypto,
        LOCAL_GAME_SESSION_SECRET: 'test-local-session-secret',
        MAX_GAME_DURATION: 6 * 60 * 60 * 1000
    };
    vm.createContext(sessionContext);
    ['encodeLocalGameSessionPart', 'signLocalGameSessionPayload', 'createLocalGameSessionToken', 'verifyLocalGameSessionToken']
        .forEach(name => vm.runInContext(extractFunction(serverSource, name), sessionContext));
    const token = sessionContext.createLocalGameSessionToken('verified-user');
    assert.strictEqual(sessionContext.verifyLocalGameSessionToken(token, 'verified-user').ok, true, 'Valid signed local session was rejected');
    assert.strictEqual(sessionContext.verifyLocalGameSessionToken(token, 'different-user').ok, false, 'Signed local session can be transferred to another user');
    const tamperedToken = `${token.slice(0, -1)}${token.endsWith('A') ? 'B' : 'A'}`;
    assert.strictEqual(sessionContext.verifyLocalGameSessionToken(tamperedToken, 'verified-user').ok, false, 'Tampered local session signature was accepted');
}

async function checkLedgerIdempotencyAndConflict() {
    const documents = new Map();
    const MatchResult = {
        async updateOne(filter, update) {
            if (documents.has(filter.matchId)) return { upsertedCount: 0, matchedCount: 1 };
            const document = { ...update.$setOnInsert };
            document.toObject = () => ({ ...document, toObject: undefined });
            documents.set(filter.matchId, document);
            return { upsertedCount: 1, matchedCount: 1 };
        },
        async findOne(filter) {
            return documents.get(filter.matchId) || null;
        }
    };
    const context = createFunctionContext({
        MONGO_URI: 'mongodb://test',
        MatchResult,
        console: { error() {} }
    });
    vm.runInContext(extractFunction(serverSource, 'ensureMatchResult'), context);

    const payload = {
        matchId: 'match-idempotent-test',
        mode: 'random',
        resultType: 'regular',
        verification: 'server',
        participants: [
            { uid: 'uid-a', name: 'A', score: 2500, result: 'win', playerIndex: 0 },
            { uid: 'uid-b', name: 'B', score: 2400, result: 'loss', playerIndex: 1 }
        ]
    };
    const first = await context.ensureMatchResult(payload);
    const repeated = await context.ensureMatchResult(payload);
    const conflict = await context.ensureMatchResult({
        ...payload,
        participants: [
            { uid: 'uid-a', name: 'A', score: 2300, result: 'loss', playerIndex: 0 },
            { uid: 'uid-b', name: 'B', score: 2400, result: 'win', playerIndex: 1 }
        ]
    });

    assert.strictEqual(first.created, true, 'First ledger write was not created');
    assert.strictEqual(repeated.created, false, 'Repeated ledger write was treated as new');
    assert.strictEqual(conflict.ok, false, 'Conflicting result reused an existing matchId');
    assert.strictEqual(conflict.reason, 'match_result_conflict', 'Conflicting result returned the wrong reason');
    assert.strictEqual(documents.size, 1, 'Idempotent ledger created duplicate documents');
}

async function main() {
    checkMatchResultWiring();
    await checkLeaderboardSemantics();
    checkLocalResultValidation();
    checkGameRewardSessionRaceGuard();
    checkVerifiedEconomyMatchProof();
    await checkLedgerIdempotencyAndConflict();
    console.log('Match result checks passed: all modes wired, auth validated, retry queued, idempotent, game reward locked, and conflict-safe.');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
