const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const gameSource = fs.readFileSync(path.join(root, 'www', 'game.js'), 'utf8');

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
    assert(completedDuel.includes('markMatchResultStatsApplied(matchId, player.uid)'), 'Regular duel does not mark applied stats');

    const technical = extractFunction(serverSource, 'applyServerSideTechnicalResult');
    assert(technical.includes("resultType: 'technical'"), 'Technical duel is not written to the ledger');
    assert(technical.includes('ensureMatchResult({'), 'Technical duel bypasses the ledger');
    assert(technical.includes('hasUserAppliedMatchResult(winner, matchId)'), 'Technical win lacks durable profile idempotency');

    const reconciler = extractFunction(serverSource, 'reconcileStoredServerMatchResult');
    assert(reconciler.includes('hasUserAppliedMatchResult(user, result.matchId)'), 'Reconciler can duplicate a previously saved profile result');
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
    checkLocalResultValidation();
    await checkLedgerIdempotencyAndConflict();
    console.log('Match result checks passed: all modes wired, auth validated, retry queued, idempotent, and conflict-safe.');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
