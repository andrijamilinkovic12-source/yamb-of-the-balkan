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

function extractClassMethod(source, name) {
    let marker = `\n    async ${name}(`;
    let markerStart = source.indexOf(marker);
    let start = markerStart === -1 ? -1 : markerStart + 5;
    let prefix = 'async ';
    if (start === -1) {
        marker = `\n    ${name}(`;
        markerStart = source.indexOf(marker);
        start = markerStart === -1 ? -1 : markerStart + 5;
        prefix = '';
    }
    assert.notStrictEqual(start, -1, `Missing class method: ${name}`);
    return sliceBalancedBlock(source, start).replace(`${prefix}${name}(`, `${prefix}function ${name}(`);
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
    assert(serverSource.includes('const MatchResultSubmissionDiagnosticSchema = new mongoose.Schema({'), 'Missing local result support diagnostics');
    assert(
        serverSource.includes("MatchResultSubmissionDiagnosticSchema.index({ occurredAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 })"),
        'Local result diagnostics are not automatically expired'
    );

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
    assert(localHandler.includes('recordMatchResultSubmissionDiagnostic({'), 'Local result endpoint does not leave a support diagnostic');
    assert(localHandler.includes("diagnosticStage = 'session_validation'"), 'Session rejection cannot be distinguished in support diagnostics');
    assert(localHandler.includes("diagnosticStage = 'ledger_write'"), 'Ledger failures cannot be distinguished in support diagnostics');
    assert(localHandler.includes("diagnosticStage = 'leaderboard_write'"), 'Leaderboard failures cannot be distinguished in support diagnostics');
    assert(localHandler.includes("diagnosticStage = 'stats_application'"), 'Profile write failures cannot be distinguished in support diagnostics');
    assert(localHandler.includes('await persistLeaderboardScoresForMatchResult(ledgerWrite.result'), 'Local match result does not write its leaderboard row server-side');

    const diagnosticRecorder = extractFunction(serverSource, 'recordMatchResultSubmissionDiagnostic');
    assert(diagnosticRecorder.includes('if (!MONGO_URI || !payload.uid) return;'), 'Diagnostics can write unauthenticated noise');
    assert(diagnosticRecorder.includes("outcome: payload.ok ? 'accepted' : 'rejected'"), 'Diagnostics do not distinguish accepted and rejected submissions');
    assert(!diagnosticRecorder.includes('scoreSheets'), 'Diagnostics retain full score sheets');
    assert(!diagnosticRecorder.includes('ip'), 'Diagnostics retain an IP address');

    assert(gameSource.includes('async queueCompletedLocalMatchResult({ mode, participants, playerIndex })'), 'Client is missing the durable local result queue');
    assert(gameSource.includes("this.socket.emit('submit_match_result'"), 'Client never sends queued results to the cloud');
    assert(gameSource.includes('await this.queueCompletedLocalMatchResult({'), 'Completed local game is not added to the queue');
    assert(gameSource.includes('async emitLocalGameSessionStart(options = {})'), 'Local game session start is not awaitable');
    assert(gameSource.includes('const authResult = await this.authenticateSocketIdentity();'), 'Local game session can start before verified authentication');
    assert(gameSource.includes("reason: 'local_game_session_timeout'"), 'Local game session start has no acknowledgement timeout');
    assert(gameSource.includes('const localSessionReady = await this.requireLocalGameSession();'), 'Local game can begin without a verified result session');
    assert(gameSource.includes('this.rememberPendingGameReward(this.pendingRewardMatchId, this.pendingScore);'), 'Unclaimed game reward is not durable across an app restart');
    assert(gameSource.includes('await this.recoverPendingGameRewards();'), 'Stored game rewards are not retried after authentication');
    const localQueue = extractClassMethod(gameSource, 'queueCompletedLocalMatchResult');
    assert(
        localQueue.indexOf('this.rememberPendingGameReward(entry.clientResultId, playerScore)') <
            localQueue.indexOf('await this.syncPendingMatchResults()'),
        'Reward recovery proof is written after the network wait'
    );
    const localGameOverStart = gameSource.indexOf('async handleGameOver(options = {})');
    const localGameOverEnd = gameSource.indexOf('async safeSubmitScore(', localGameOverStart);
    const localGameOver = gameSource.slice(localGameOverStart, localGameOverEnd);
    assert(
        localGameOver.indexOf('await this.queueCompletedLocalMatchResult({') <
            localGameOver.indexOf("await localforage.removeItem(`yamb_saved_game_${uid}_${this.players.length}`)"),
        'Completed local save is removed before the durable result is queued'
    );

    const claimRewardStart = gameSource.indexOf('async claimReward(doubled)');
    const claimRewardEnd = gameSource.indexOf('getBest5(row, dice)', claimRewardStart);
    assert(claimRewardStart !== -1 && claimRewardEnd > claimRewardStart, 'Missing game reward claim method');
    const claimReward = gameSource.slice(claimRewardStart, claimRewardEnd);
    assert(claimReward.includes('const pendingMatchSync = await this.syncPendingMatchResults();'), 'Reward claim does not retry the durable result first');
    assert(claimReward.includes('await this.topListManager.syncOfflineScores();'), 'Reward claim does not restore the verified score session');
    assert(claimReward.includes('const confirmed = await claimNormalGameReward(this.pendingScore, false);'), 'Base reward does not require server confirmation');
    const baseClaimStart = claimReward.indexOf('const confirmed = await claimNormalGameReward(this.pendingScore, false);');
    const claimFinish = claimReward.indexOf('finishRewardClaim();', baseClaimStart);
    assert(baseClaimStart !== -1 && claimFinish > baseClaimStart, 'Base reward confirmation guard is incomplete');
    assert(!claimReward.slice(baseClaimStart, claimFinish).includes('currentDukati += finalAmount'), 'Base reward still mutates balance before server confirmation');

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
    assert(!topListSource.includes('validData.slice(0, this.maxEntries)'), 'Global leaderboard still has the old TOP 100 client cap');
    assert(topListSource.includes('this.globalPageSize = 50;'), 'Global leaderboard does not use bounded incremental pages');
    assert(topListSource.includes('loadMoreGlobal()'), 'Global leaderboard cannot request the next page');

    const globalHandlerStart = serverSource.indexOf("socket.on('get_global_highscores'");
    const globalHandlerEnd = serverSource.indexOf('// ==================================================================', globalHandlerStart + 50);
    const globalHandler = serverSource.slice(globalHandlerStart, globalHandlerEnd);
    assert(globalHandler.includes('_id: "$stableUid"'), 'Global leaderboard is not grouped by stable profile UID');
    assert(globalHandler.includes("getLeaderboardPeriodStart('weekly')"), 'Global weekly leaderboard is not period-filtered');
    assert(globalHandler.includes("getLeaderboardPeriodStart('monthly')"), 'Global monthly leaderboard is not period-filtered');
    assert(globalHandler.includes('bestEntry: { $first: "$$ROOT" }'), 'Global leaderboard does not keep one best score per profile');
    assert(globalHandler.includes('{ $skip: offset }'), 'Global leaderboard pagination does not advance beyond the first page');
    assert(globalHandler.includes('{ $limit: limit + (legacyRequest ? 0 : 1) }'), 'Global leaderboard cannot detect whether another page exists');
    assert(globalHandler.includes('hasMore'), 'Global leaderboard response does not advertise additional pages');

    const completedDuel = extractFunction(serverSource, 'applyServerSideCompletedDuel');
    assert(completedDuel.includes('persistLeaderboardScoreRecord({'), 'Completed online duel does not write both authoritative scores to the leaderboard');
    const leaderboardBackfill = extractFunction(serverSource, 'backfillMissingLeaderboardScoresFromMatchResults');
    assert(leaderboardBackfill.includes("{ $match: { resultType: 'regular', economyEligible: true } }"), 'Leaderboard backfill excludes verified local results');
    assert(leaderboardBackfill.includes("from: Score.collection.name"), 'Leaderboard backfill does not compare against stored score rows');
    assert(leaderboardBackfill.includes('persistLeaderboardScoreRecord({'), 'Missing leaderboard rows cannot be restored from match proof');
    const ledgerLeaderboardWriter = extractFunction(serverSource, 'persistLeaderboardScoresForMatchResult');
    assert(ledgerLeaderboardWriter.includes("['server', 'authenticated_client'].includes(source.verification)"), 'Verified local results are excluded from direct leaderboard persistence');
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
    assert(claimHandler.includes('await resolvePendingGameRewardSession(finalUid, socket.id, data)'), 'Reward session cannot be restored from a durable match result');

    const rewardResolver = extractFunction(serverSource, 'resolvePendingGameRewardSession');
    assert(rewardResolver.includes('findVerifiedMatchParticipant(uid, requestedMatchId, expectedScore)'), 'Restored reward does not require a verified match result');
    assert(rewardResolver.includes('openPendingGameRewardSession('), 'Verified reward proof does not recreate the claim session');

    const rematchClaim = extractClassMethod(gameSource, 'claimPendingBaseRewardBeforeRematch');
    assert(!rematchClaim.includes('currentBalance + baseScore'), 'Rematch can still accept an optimistic local coin balance');
    assert(!rematchClaim.includes('result && result.localFallback'), 'Rematch can still discard an unconfirmed server reward');
    assert(rematchClaim.includes('const pendingMatchSync = await this.syncPendingMatchResults();'), 'Rematch reward does not retry the durable result first');
    assert(rematchClaim.includes('await this.topListManager.syncOfflineScores();'), 'Rematch reward does not restore its verified score record');

    assert(
        !serverSource.includes('getPendingGameRewardIncrease'),
        'Profile sync can still bypass claim_game_reward and consume a pending game reward'
    );
}

function checkVerifiedEconomyMatchProof() {
    assert(serverSource.includes('function createLocalGameSessionToken(uid, carriedDurationMs = 0)'), 'Missing signed local game session tokens');
    assert(serverSource.includes('crypto.timingSafeEqual'), 'Local game session signature is not timing-safe');
    assert(serverSource.includes("return replyMatchResult(false, 'game_too_short', true);"), 'Local match ledger accepts sessions shorter than the minimum duration');
    assert(serverSource.includes('{ allowExpired: true }'), 'A queued completed result is discarded after its signed session ages out');
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

    const balanceClaim = extractFunction(serverSource, 'claimVerifiedGameRewardBalance');
    assert(balanceClaim.includes('claimedGameRewardIds: { $ne: matchId }'), 'Game reward balance is not guarded by an atomic match claim');
    assert(balanceClaim.includes("$ifNull: ['$balance', 0]"), 'Atomic reward does not update the stored balance');
    assert(balanceClaim.includes('-RECENT_MATCH_RESULT_MEMORY'), 'Atomic reward claim history is not bounded');
    assert(serverSource.includes('{ $addToSet: { rewardClaimedUids: finalUid }, $set: { updatedAt: new Date() } }'), 'Game reward claim is not persisted in the permanent match ledger');
    assert(gameSource.includes("gameSessionToken: this.localGameSessionToken || ''"), 'Client does not preserve the signed local game session');
    assert(gameSource.includes('const queuedResult = await this.queueCompletedLocalMatchResult({'), 'Client submits leaderboard score before storing local match proof');
    assert(gameSource.includes('acceptedClientResultIds.push(item.clientResultId);'), 'Client cannot distinguish a confirmed MatchResult from a queued local result');
    assert(gameSource.includes('serverApplied: true,\n                     skipH2H: true,'), 'An unconfirmed local result can still alter official statistics');
    assert(gameSource.includes("entry.synced !== true) return;"), 'An unconfirmed local leaderboard entry can still alter highscore statistics');
    assert(gameSource.includes("matchId: String(matchId || '')"), 'Reward claim does not carry durable match proof');
    assert(topListSource.includes("matchId: String(matchId || '')"), 'Leaderboard payload does not carry its match proof');

    let sessionNow = 1700000000000;
    class SessionDate extends Date {
        static now() { return sessionNow; }
    }
    const sessionContext = {
        Buffer,
        JSON,
        String,
        Number,
        Date: SessionDate,
        crypto,
        LOCAL_GAME_SESSION_SECRET: 'test-local-session-secret',
        MAX_GAME_DURATION: 6 * 60 * 60 * 1000,
        normalizeCarriedGameDuration(value) {
            return Math.max(0, Math.min(6 * 60 * 60 * 1000, Number(value) || 0));
        }
    };
    vm.createContext(sessionContext);
    ['encodeLocalGameSessionPart', 'signLocalGameSessionPayload', 'createLocalGameSessionToken', 'verifyLocalGameSessionToken']
        .forEach(name => vm.runInContext(extractFunction(serverSource, name), sessionContext));
    const token = sessionContext.createLocalGameSessionToken('verified-user');
    assert.strictEqual(sessionContext.verifyLocalGameSessionToken(token, 'verified-user').ok, true, 'Valid signed local session was rejected');
    const resumedToken = sessionContext.createLocalGameSessionToken('verified-user', 120000);
    assert.strictEqual(sessionContext.verifyLocalGameSessionToken(resumedToken, 'verified-user').duration, 120000, 'Resumed local game lost its carried play duration');
    assert.strictEqual(sessionContext.verifyLocalGameSessionToken(token, 'different-user').ok, false, 'Signed local session can be transferred to another user');
    const tamperedToken = `${token.slice(0, -1)}${token.endsWith('A') ? 'B' : 'A'}`;
    assert.strictEqual(sessionContext.verifyLocalGameSessionToken(tamperedToken, 'verified-user').ok, false, 'Tampered local session signature was accepted');
    sessionNow += sessionContext.MAX_GAME_DURATION + 1;
    assert.strictEqual(sessionContext.verifyLocalGameSessionToken(token, 'verified-user').ok, false, 'Expired session was accepted without queue recovery mode');
    const delayedSession = sessionContext.verifyLocalGameSessionToken(token, 'verified-user', { allowExpired: true });
    assert.strictEqual(delayedSession.ok, true, 'Durably queued result lost its signed session proof after six hours');
    assert.strictEqual(delayedSession.expired, true, 'Recovered expired session was not identified as delayed');
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

async function checkSubmissionDiagnosticBehavior() {
    const written = [];
    const context = {
        MONGO_URI: 'mongodb://test',
        Date,
        String,
        MatchResultSubmissionDiagnostic: {
            async create(document) {
                written.push(document);
            }
        },
        sanitizeTournamentName(value) {
            return String(value || 'Nepoznat').substring(0, 24);
        },
        normalizeMatchResultMode(value, fallback = '') {
            return String(value || fallback).toLowerCase();
        },
        console: { warn() {} }
    };
    vm.createContext(context);
    vm.runInContext(extractFunction(serverSource, 'recordMatchResultSubmissionDiagnostic'), context);

    await context.recordMatchResultSubmissionDiagnostic({
        uid: '',
        clientResultId: 'anonymous-result',
        ok: false,
        reason: 'firebase_token_required'
    });
    assert.strictEqual(written.length, 0, 'Unauthenticated diagnostic was stored');

    await context.recordMatchResultSubmissionDiagnostic({
        uid: 'verified-user-1234567890',
        playerName: 'Support Player',
        clientResultId: 'local-result-123',
        matchId: 'local:verified-user:123',
        mode: 'Solo',
        stage: 'complete',
        ok: true,
        permanent: false,
        duplicate: true,
        statsApplied: true,
        ip: '192.0.2.1',
        scoreSheets: [{ forbidden: true }]
    });

    assert.strictEqual(written.length, 1, 'Authenticated result diagnostic was not stored');
    assert.strictEqual(written[0].outcome, 'accepted', 'Successful diagnostic has the wrong outcome');
    assert.strictEqual(written[0].mode, 'solo', 'Diagnostic mode was not normalized');
    assert.strictEqual(written[0].statsApplied, true, 'Diagnostic lost stats application state');
    assert.strictEqual(Object.hasOwn(written[0], 'ip'), false, 'Diagnostic stored an IP address');
    assert.strictEqual(Object.hasOwn(written[0], 'scoreSheets'), false, 'Diagnostic stored the score sheet');

    context.MatchResultSubmissionDiagnostic.create = async () => {
        throw new Error('diagnostic unavailable');
    };
    await assert.doesNotReject(
        context.recordMatchResultSubmissionDiagnostic({ uid: 'verified-user-1234567890', ok: false }),
        'Diagnostic storage failure escaped into the statistics path'
    );
}

async function checkLocalSessionStartBehavior() {
    const events = [];
    const context = {
        Math,
        Number,
        Promise,
        setTimeout,
        clearTimeout,
        console: { warn() {} },
        gt(key) { return key; }
    };
    vm.createContext(context);
    vm.runInContext(extractClassMethod(gameSource, 'emitLocalGameSessionStart'), context);
    vm.runInContext(extractClassMethod(gameSource, 'requireLocalGameSession'), context);

    const app = {
        roomId: 'local-test-room',
        onlineMode: false,
        isSpectator: false,
        localGameSessionToken: '',
        localGameSessionStartPromise: null,
        initSocketConnection() {},
        async waitForSocketConnection() {
            events.push('connected');
            return { ok: true };
        },
        async authenticateSocketIdentity() {
            events.push('authenticated');
            return { ok: true };
        },
        buildLocalGameSessionPayload(roomId) {
            return { roomId, gameSessionToken: this.localGameSessionToken };
        },
        socket: {
            emit(event, payload, ack) {
                events.push(event);
                assert.strictEqual(payload.roomId, 'local-test-room');
                ack({ ok: true, gameSessionToken: 'signed-local-session' });
            }
        }
    };

    const result = await context.emitLocalGameSessionStart.call(app);
    assert.strictEqual(result.ok, true, 'Verified local session was not accepted');
    assert.strictEqual(app.localGameSessionToken, 'signed-local-session', 'Verified local session token was not retained');
    assert.deepStrictEqual(events, ['connected', 'authenticated', 'start_local_game'], 'Local session started before connection and authentication');

    events.length = 0;
    app.localGameSessionToken = '';
    app.authenticateSocketIdentity = async () => ({ ok: false, reason: 'firebase_token_required' });
    const rejected = await context.emitLocalGameSessionStart.call(app);
    assert.strictEqual(rejected.ok, false, 'Unauthenticated local session was accepted');
    assert.strictEqual(events.includes('start_local_game'), false, 'Unauthenticated local session reached the server start event');

    let staleSessionAlerted = false;
    const staleRoomApp = {
        localGameSessionToken: '',
        async emitLocalGameSessionStart() {
            return { ok: true, gameSessionToken: 'token-for-another-room' };
        },
        modal: {
            async alert() {
                staleSessionAlerted = true;
            }
        }
    };
    const staleRoomAccepted = await context.requireLocalGameSession.call(staleRoomApp);
    assert.strictEqual(staleRoomAccepted, false, 'A token from another local room unlocked the game');
    assert.strictEqual(staleSessionAlerted, true, 'A stale local room token did not notify the player');
}

async function checkBaseRewardConfirmationBehavior() {
    const storage = new Map([['yamb_dukati', '10000']]);
    const context = {
        parseInt,
        console: { warn() {} },
        window: {
            statsManager: {
                stats: { balance: 10000 },
                saveStats() {}
            },
            kvartalnaLiga: { syncWithServer() {} }
        },
        localStorage: {
            getItem(key) { return storage.get(key) || null; },
            setItem(key, value) { storage.set(key, String(value)); }
        },
        gt(key) { return key; },
        dukatIconHtml() { return ''; }
    };
    vm.createContext(context);
    vm.runInContext(extractClassMethod(gameSource, 'claimReward'), context);

    let menuVisits = 0;
    let alerts = 0;
    const app = {
        rewardClaimed: false,
        rewardClaimInProgress: false,
        pendingScore: 275,
        pendingRewardSsvNonce: '',
        lastGameType: 'normal',
        socket: { connected: true },
        topListManager: { async syncOfflineScores() {} },
        async syncPendingMatchResults() { return { remaining: 0 }; },
        async claimServerGameReward() { return { ok: false, reason: 'missing_reward_session', permanent: false }; },
        async emitPlayerData() { return { synced: false }; },
        applyAuthoritativeGameRewardBalance(balance) { storage.set('yamb_dukati', String(balance)); },
        forgetPendingGameReward() {},
        modal: { alert() { alerts++; return Promise.resolve(); } },
        showMainMenu() { menuVisits++; },
        soundMgr: { win() {} },
        effectMgr: { trigger() {}, stop() {} }
    };

    await context.claimReward.call(app, false);
    assert.strictEqual(app.rewardClaimed, false, 'Rejected base reward was marked as claimed');
    assert.strictEqual(app.pendingScore, 275, 'Rejected base reward discarded its retry state');
    assert.strictEqual(storage.get('yamb_dukati'), '10000', 'Rejected base reward changed the local balance');
    assert.strictEqual(menuVisits, 0, 'Rejected base reward closed the result screen');
    assert.strictEqual(alerts, 1, 'Rejected base reward did not inform the player');

    app.claimServerGameReward = async () => ({ ok: true, reward: 275, balance: 10275 });
    await context.claimReward.call(app, false);
    assert.strictEqual(app.rewardClaimed, true, 'Confirmed base reward was not marked as claimed');
    assert.strictEqual(app.pendingScore, 0, 'Confirmed base reward retained stale retry state');
    assert.strictEqual(storage.get('yamb_dukati'), '10275', 'Confirmed server balance was not applied');
    assert.strictEqual(menuVisits, 1, 'Confirmed base reward did not return to the menu');
}

async function checkRewardSessionRecoveryBehavior() {
    const pendingGameRewards = {};
    const pendingGameRewardsByUid = {};
    const opened = [];
    let verificationCalls = 0;
    const context = {
        Date,
        Number,
        String,
        GAME_REWARD_CLAIM_WINDOW_MS: 5 * 60 * 1000,
        pendingGameRewards,
        pendingGameRewardsByUid,
        clearPendingGameRewardSession(uid, session) {
            if (pendingGameRewards[session.socketId] === session) delete pendingGameRewards[session.socketId];
            if (pendingGameRewardsByUid[uid] === session) delete pendingGameRewardsByUid[uid];
        },
        async findVerifiedMatchParticipant(uid, matchId, score) {
            verificationCalls++;
            if (uid !== 'verified-user' || matchId !== 'client-result-1' || score !== 275) {
                return { ok: false, reason: 'match_result_not_found' };
            }
            return {
                ok: true,
                matchId: 'local:verified-user:client-result-1',
                score: 275,
                result: { mode: 'solo' }
            };
        },
        openPendingGameRewardSession(uid, socketId, matchId, score, mode) {
            const session = { uid, socketId, matchId, score, mode, createdAt: Date.now() };
            pendingGameRewards[socketId] = session;
            pendingGameRewardsByUid[uid] = session;
            opened.push(session);
            return session;
        }
    };
    vm.createContext(context);
    vm.runInContext(extractFunction(serverSource, 'resolvePendingGameRewardSession'), context);

    const restored = await context.resolvePendingGameRewardSession('verified-user', 'new-socket', {
        matchId: 'client-result-1',
        score: 275
    });
    assert.strictEqual(restored.ok, true, 'Durable match proof did not restore the reward session');
    assert.strictEqual(restored.restored, true, 'Restored reward session was not identified');
    assert.strictEqual(opened[0].score, 275, 'Restored reward uses the wrong score');

    const reused = await context.resolvePendingGameRewardSession('verified-user', 'new-socket', {
        score: 275
    });
    assert.strictEqual(reused.ok, true, 'Current reward session was not reused');
    assert.strictEqual(verificationCalls, 1, 'Current reward session unnecessarily re-queried the ledger');
}

async function checkAtomicRewardClaimBehavior() {
    const profile = {
        firebaseUid: 'verified-user',
        balance: 10000,
        claimedGameRewardIds: []
    };
    const context = {
        Math,
        MAX_REWARD_PER_GAME: 8000,
        MAX_BALANCE: 5000000,
        RECENT_MATCH_RESULT_MEMORY: 200,
        toSafeInt(value, fallback = 0) {
            const number = Number(value);
            return Number.isFinite(number) ? Math.floor(number) : fallback;
        },
        UserProfile: {
            async findOneAndUpdate(filter, updatePipeline) {
                const matchId = filter.claimedGameRewardIds.$ne;
                if (profile.claimedGameRewardIds.includes(matchId)) return null;
                const rewardExpression = updatePipeline[0].$set.balance.$min[1].$max[1].$add[1];
                profile.balance = Math.min(5000000, Math.max(0, profile.balance + rewardExpression));
                profile.claimedGameRewardIds = [...profile.claimedGameRewardIds, matchId].slice(-200);
                return { ...profile };
            },
            async findOne() {
                return { ...profile };
            }
        }
    };
    vm.createContext(context);
    vm.runInContext(extractFunction(serverSource, 'claimVerifiedGameRewardBalance'), context);

    const first = await context.claimVerifiedGameRewardBalance('verified-user', 'match-atomic-1', 275);
    const repeated = await context.claimVerifiedGameRewardBalance('verified-user', 'match-atomic-1', 275);
    assert.strictEqual(first.claimed, true, 'First verified reward was not claimed');
    assert.strictEqual(repeated.claimed, false, 'Repeated match reward was applied twice');
    assert.strictEqual(profile.balance, 10275, 'Repeated reward changed the balance more than once');
}

async function checkClientRewardRecoveryBehavior() {
    const storage = new Map([['yamb_dukati', '10000']]);
    const context = {
        JSON,
        Math,
        Number,
        String,
        Date,
        parseInt,
        console: { warn() {} },
        getPlayerId() { return 'verified-user'; },
        localStorage: {
            getItem(key) { return storage.get(key) || null; },
            setItem(key, value) { storage.set(key, String(value)); }
        },
        window: {
            statsManager: {
                stats: { balance: 10000 },
                saveStats() {}
            }
        }
    };
    vm.createContext(context);
    [
        'getPendingGameRewardsKey',
        'readPendingGameRewards',
        'writePendingGameRewards',
        'rememberPendingGameReward',
        'forgetPendingGameReward',
        'applyAuthoritativeGameRewardBalance',
        'recoverPendingGameRewards'
    ].forEach(name => vm.runInContext(extractClassMethod(gameSource, name), context));

    const app = {
        playerId: 'verified-user',
        rewardRuntimeId: 'old-runtime',
        socket: { connected: true },
        getPendingGameRewardsKey: context.getPendingGameRewardsKey,
        readPendingGameRewards: context.readPendingGameRewards,
        writePendingGameRewards: context.writePendingGameRewards,
        rememberPendingGameReward: context.rememberPendingGameReward,
        forgetPendingGameReward: context.forgetPendingGameReward,
        applyAuthoritativeGameRewardBalance: context.applyAuthoritativeGameRewardBalance,
        async claimServerGameReward(score, doubled, nonce, matchId) {
            assert.strictEqual(matchId, 'client-result-recovery');
            assert.strictEqual(score, 275);
            return { ok: true, reward: 275, balance: 10275 };
        }
    };

    app.rememberPendingGameReward('client-result-recovery', 275);
    app.rewardRuntimeId = 'new-runtime';
    await context.recoverPendingGameRewards.call(app);
    assert.strictEqual(app.readPendingGameRewards().length, 0, 'Recovered client reward was left in the durable retry queue');
    assert.strictEqual(storage.get('yamb_dukati'), '10275', 'Recovered client reward did not apply the authoritative balance');
}

async function main() {
    checkMatchResultWiring();
    await checkLeaderboardSemantics();
    checkLocalResultValidation();
    checkGameRewardSessionRaceGuard();
    checkVerifiedEconomyMatchProof();
    await checkLedgerIdempotencyAndConflict();
    await checkSubmissionDiagnosticBehavior();
    await checkLocalSessionStartBehavior();
    await checkBaseRewardConfirmationBehavior();
    await checkRewardSessionRecoveryBehavior();
    await checkAtomicRewardClaimBehavior();
    await checkClientRewardRecoveryBehavior();
    console.log('Match result checks passed: all modes wired, auth and local session validated, retry queued, idempotent, diagnostic, reward confirmation locked, and conflict-safe.');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
