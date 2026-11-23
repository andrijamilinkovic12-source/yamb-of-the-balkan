'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { spawn } = require('node:child_process');
const mongoose = require('mongoose');
const source = fs.readFileSync(require.resolve('../server'), 'utf8').replace(/\r/g, '');
function load(ctx, names) {
    for (const name of names.split(' ')) {
        const code = source.match(new RegExp('^(?:async )?function ' + name + '\\([\\s\\S]*?^}', 'm'));
        assert(code, name);
        vm.runInContext(code[0], ctx);
    }
}

async function roomAndUi() {
    const midnight = Date.parse('2026-06-30T22:00:00Z');
    let now = midnight - 50, owns = false, attempts = 0, announcements = 0;
    const room = { players: ['a', 'b'], playerUids: ['a', 'b'], allScores: [900, 800] };
    const ctx = vm.createContext({ roomState: { r: room }, MONGO_URI: true, Date: { now: () => now },
        console: { error() {}, log() {} }, calculateCompletedDuelTotal: n => n, getDuelParticipantMeta: uid => ({ uid }),
        ensureRoomMatchId: () => 'm', getOnlineDuelType: () => 'random', setTimeout: fn => setImmediate(fn),
        profileWrites: { owns: () => owns, run: async (_, fn) => { now += 150; owns = true; try { return await fn(); } finally { owns = false; } } },
        ensureMatchResult: async p => {
            assert.equal(p.finishedAt, midnight - 50); assert.equal(announcements, 0);
            return ++attempts === 1 ? { ok: false } : { ok: true, result: { statsAppliedUids: ['a', 'b'] } };
        },
        persistLeaderboardScoreRecord: async () => ({ ok: true }), emitCompletedOnlineGame: () => announcements++,
        applyTournamentCompletedDuelResult() {}, recordTournamentDrawReplay() {}, markOnlineRoomGameFinished() { room.gameFinished = true; } });
    load(ctx, 'hasCompletedOnlineDuelScores applyServerSideCompletedDuel settleCompletedOnlineRoom');
    await Promise.all([ctx.settleCompletedOnlineRoom('r', 'a'), ctx.settleCompletedOnlineRoom('r', 'b')]);
    assert.deepEqual([attempts, announcements, room.gameFinished], [2, 1, true]);

    const ui = fs.readFileSync(require.resolve('../www/kvartalnaliga'), 'utf8');
    const acks = [], renders = [], syncs = [];
    let uid = 'a';
    const client = vm.createContext({ localStorage: { getItem: key => key === 'yamb_uid' ? uid : null },
        window: { app: { socket: { connected: true, emit: (_e, _p, ack) => acks.push(ack) }, applyCloudProfileSync: data => syncs.push(data) } },
        document: { getElementById: () => null, querySelector: () => null }, setTimeout: () => 1, clearTimeout() {} });
    const m = vm.runInContext(ui.slice(0, ui.lastIndexOf('window.kvartalnaLiga = new')) +
        '\nObject.create(KvartalnaLigaManager.prototype)', client);
    m.leaderboardRequestSerial = 0; m.leaderboardPageSize = 50; m.resetLeaderboardPagination();
    m.renderList = (_rank, rows) => renders.push(rows[0].score);
    m.loadLeaguePage('profi'); m.loadLeaguePage('profi', { reset: true });
    const page = score => ({ ok: true, rankId: 'profi', items: [{ playerId: 'a', score }] });
    acks[1](page(8000)); acks[0](page(7000)); assert.deepEqual(renders, [8000]);
    m.getScores = () => ({ quarterlyScore: 900 }); m.syncWithServer(); uid = 'b';
    acks[2]({ ok: true, leagueData: { quarterlyScore: 900 } }); assert.equal(syncs.length, 0);
    console.log('PASS: online midnight, failed write/retry, concurrent finishes, stale pages and account switching.');
}

// Optional real transaction test. Only starts a fresh loopback replica; never reads .env.
async function replica(binary) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yamb-league-test-'));
    const probe = net.createServer();
    await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
    const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
    const host = '127.0.0.1:' + port, uri = 'mongodb://' + host;
    const proc = spawn(binary, ['--dbpath', root, '--port', String(port), '--bind_ip', '127.0.0.1', '--replSet', 'qltest',
        '--oplogSize', '32', '--wiredTigerCacheSizeGB', '0.25'], { windowsHide: true, stdio: 'ignore' });
    const stopped = new Promise(resolve => { proc.once('error', resolve); proc.once('exit', resolve); });
    let direct, db;
    try {
        direct = await mongoose.createConnection(uri, { directConnection: true, serverSelectionTimeoutMS: 20000 }).asPromise();
        await direct.db.admin().command({ replSetInitiate: { _id: 'qltest', members: [{ _id: 0, host }] } });
        db = await mongoose.createConnection(uri + '/league_fixture?replicaSet=qltest').asPromise();
        await bookingCases(db);
    } finally {
        await db?.close();
        if (direct) {
            await direct.db.admin().command({ shutdown: 1, force: true, timeoutSecs: 1 }).catch(() => {});
            await direct.close();
        }
        if (proc.exitCode === null) proc.kill();
        await stopped;
        if (path.dirname(root) === path.resolve(os.tmpdir()) && path.basename(root).startsWith('yamb-league-test-')) {
            fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
        }
    }
}

async function bookingCases(db) {
    let now = Date.parse('2026-06-30T21:59:00Z');
    class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
    const model = (name, fields, index) => {
        const schema = new mongoose.Schema(fields, { strict: false });
        if (index) schema.index(index, { unique: true });
        return db.model(name, schema);
    };
    const UserProfile = model('UserProfile', { firebaseUid: String, leagueData: Object, games: Number, totalScoreSum: Number,
        highscore: Number, recentMatchResultIds: [String], recentPowerIndexDeltas: [Object] }, { firebaseUid: 1 });
    const MatchResult = model('MatchResult', { matchId: String, leagueBooking: Object }, { matchId: 1 });
    const LeagueScore = model('LeagueScore', { date: Date }, { playerId: 1, year: 1, quarter: 1 });
    const LeagueClosing = model('LeagueClosing', { _id: String, sealed: Boolean });
    const LeagueHallOfFame = model('LeagueHallOfFame', { periodKey: String }, { periodKey: 1 });
    await Promise.all(Object.values(db.models).map(m => m.init()));
    const ctx = vm.createContext({ mongoose: { connection: db }, UserProfile, MatchResult, LeagueScore, LeagueClosing, LeagueHallOfFame,
        MONGO_URI: true, Date: Clock, Intl, LEADERBOARD_TIME_ZONE: 'Europe/Belgrade', LEAGUE_SETTLEMENT_GRACE_MS: 21900000,
        MAX_LEAGUE_SCORE: Number.MAX_SAFE_INTEGER, MAX_LEAGUE_ALL_TIME_SCORE: Number.MAX_SAFE_INTEGER, MAX_NAME_LENGTH: 40,
        MAX_SCORE: 9999, MATCH_RESULT_MODES: new Set(['random','solo']), MATCH_PARTICIPANT_RESULTS: new Set(['win','loss','solo']),
        sanitizeIdArray: value => value || [], sanitizeTournamentName: s => s, sadrziPsovku: () => false,
        powerIndexCore: require('../www/powerIndexCore'), publishMailboxChampion() {}, leagueChampionNotice() {}, console });
    load(ctx, 'toSafeInt getTimeZoneParts getTimeZoneOffsetMs zonedLocalDateTimeToUtc zonedLocalMidnightToUtc getServerQuarterInfo getLeagueQuarterInfoForTimestamp getLeaguePeriodEnd getLeagueSettlementInfo compareLeaguePeriod getLeaguePeriodKey isPastLeaguePeriod isCurrentLeaguePeriod getDefaultCurrentLeagueData normalizeLeagueData coerceLeagueDataToCurrentPeriod normalizeUserLeagueDataForCurrentPeriod ensureUserLeagueDataCurrentPeriod hasUserAppliedMatchResult normalizeMatchResultMode normalizeMatchParticipant normalizeMatchResultPayload getMatchResultIdentitySignature getLeaguePointsFromStoredMatchResult applyTechnicalLeagueDelta bookMatchLeague ensureMatchResult fetchTopLeagueScoresForPeriod archiveLeagueQuarter syncCurrentLeagueScoreFromUserProfile');
    const user = uid => UserProfile.create({ firebaseUid: uid, playerName: uid, leagueData: { year: 2026, quarter: 2, quarterlyScore: 999800, baselineScore: 0 } });
    const q2 = { year: 2026, quarter: 2 };
    await user('a');
    const duel = { matchId: 'duel', finishedAt: now, participants: ['a','b'].map(uid => ({ uid, score: 600 })) };
    assert.equal((await ctx.ensureMatchResult(duel)).reason, 'profile_not_found');
    assert.equal(await MatchResult.countDocuments(), 0); assert.equal(await LeagueScore.countDocuments(), 0);
    assert.equal((await UserProfile.findOne({ firebaseUid: 'a' })).leagueData.quarterlyScore, 999800);
    await user('b'); assert.equal((await ctx.ensureMatchResult(duel)).ok, true);
    assert.equal((await ctx.ensureMatchResult(duel)).created, false);
    assert.equal(await LeagueScore.countDocuments({ ...q2, score: 1000400 }), 2);
    const first = await LeagueScore.findOne({ playerId: 'a' });
    now += 1000;
    await ctx.syncCurrentLeagueScoreFromUserProfile(await UserProfile.findOne({ firebaseUid: 'a' }));
    assert.equal(+(await LeagueScore.findById(first._id)).date, +first.date);
    now = Date.parse('2026-07-01T04:04:59.999Z');
    const previous = { ...duel, matchId: 'grace', participants: [{ uid: 'b', score: 900 }] };
    const latch = () => { let open; const promise = new Promise(resolve => { open = resolve; }); return { open, promise }; };
    const writing = latch(), release = latch(), sealing = latch();
    const apply = ctx.applyTechnicalLeagueDelta;
    ctx.applyTechnicalLeagueDelta = async (...args) => {
        writing.open(); await release.promise; return apply(...args);
    };
    const lastBooking = ctx.ensureMatchResult(previous);
    await writing.promise;
    now++;
    const close = LeagueClosing.updateOne.bind(LeagueClosing);
    LeagueClosing.updateOne = (...args) => { const query = close(...args).exec(); sealing.open(); return query; };
    const podium = ctx.archiveLeagueQuarter(2026, 2);
    await sealing.promise; release.open();
    assert.equal((await lastBooking).ok, true);
    const archive = await podium;
    ctx.applyTechnicalLeagueDelta = apply;
    assert.equal((await ctx.ensureMatchResult(previous)).created, false);
    assert.equal((await LeagueScore.findOne({ ...q2, playerId: 'b' })).score, 1001300);
    assert.equal((await UserProfile.findOne({ firebaseUid: 'b' })).leagueData.quarterlyScore, 0);
    assert.equal(archive.champion.playerId, 'b');
    const late = { ...duel, matchId: 'late', mode: 'solo', verification: 'authenticated_client', participants: [{ uid: 'a', score: 2000 }] };
    let submit;
    Object.assign(ctx, { socket: { verifiedUid: 'a', on: (_event, handler) => { submit = handler; } },
        buildClientReportedMatchResult: () => ({ ok: true, payload: late, selfParticipant: late.participants[0] }),
        verifyLocalGameSessionToken: () => ({ ok: true, sessionId: 'late-session', startedAt: duel.finishedAt - 90000, duration: 90000 }),
        recordMatchResultSubmissionDiagnostic() {}, MIN_GAME_DURATION: 1000, MAX_GAME_DURATION: 21600000,
        RECENT_MATCH_RESULT_MEMORY: 200, PLAYER_REFERRALS_ENABLED: false,
        persistLeaderboardScoresForMatchResult: async () => 0, emitProfileSyncToUid() {} });
    load(ctx, 'rememberUserAppliedMatchResult powerIndexBeforeLeagueBooking rememberRecentPowerIndexGain getRecentPowerIndexGain markMatchResultStatsApplied');
    const start = source.indexOf("    socket.on('submit_match_result'");
    vm.runInContext(source.slice(start, source.indexOf("\n    socket.on(", start + 10)), ctx);
    for (let i = 0; i < 2; i++) {
        let ack;
        await submit({}, result => { ack = result; });
        assert.equal(ack?.ok, true, JSON.stringify(ack));
        assert.equal(ack.duplicate, i === 1);
    }
    assert.equal((await MatchResult.findOne({ matchId: 'late' })).leagueBooking.status, 'quarter_closed');
    const stats = await UserProfile.findOne({ firebaseUid: 'a' });
    assert.deepEqual([stats.games, stats.totalScoreSum, stats.highscore], [1, 2000, 2000]);
    assert.equal((await MatchResult.findOne({ matchId: 'late' })).participants[0].score, 2000);
    assert.equal((await LeagueScore.findOne({ ...q2, playerId: 'a' })).score, 1000400);
    assert.equal(await LeagueScore.countDocuments({ quarter: 3 }), 0);
    assert.equal((await ctx.archiveLeagueQuarter(2026, 2)).champion.playerId, 'b');
    const technical = { ...duel, finishedAt: now, matchId: 'technical', resultType: 'technical',
        winnerReward: 650, loserCoinPenalty: 1100,
        participants: [{ uid: 'a', result: 'win' }, { uid: 'b', result: 'loss' }] };
    const copies = await Promise.all([ctx.ensureMatchResult(technical), ctx.ensureMatchResult(technical)]);
    assert(copies.every(x => x.ok)); assert.equal(copies.filter(x => x.created).length, 1);
    assert.equal((await LeagueScore.findOne({ quarter: 3, playerId: 'a' })).score, 650);
    assert.equal(await LeagueScore.countDocuments({ quarter: 3, playerId: 'b' }), 0);
    console.log('PASS: real replica rollback, retry, million-point total, unchanged tie date, grace and frozen podium; a late submission counts once in both history and regular stats.');
}

(async () => {
    await roomAndUi();
    if (process.argv[2] === '--replica') await replica(path.resolve(process.argv[3]));
})().catch(error => { console.error(error); process.exitCode = 1; });
