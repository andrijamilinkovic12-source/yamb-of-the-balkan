'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const audit = require('../lib/tournament-match-audit');
const scheduling = require('../www/tournamentSchedulingCore');
const { createTournamentSchedulingRuntime } = require('../lib/tournament-scheduling-runtime');
const notifications = require('../www/tournamentNotificationsCore');
const adjudication = require('../www/tournamentAdjudicationCore');

const at = Date.parse('2026-11-11T09:00:00+01:00');
let sequence = 0;
const createId = () => 'fixture-' + ++sequence;
const createMatch = (p1 = null, p2 = null) => ({ p1, p2, winnerId: null });
const options = { now: at + 300000, createId, createMatch, resetDelayMs: 86400000 };

function fixture(round = 'qf') {
    const players = [{ id: 'player-a', pi: '10' }, { id: 'player-b', pi: '12' }];
    const match = createMatch(...players);
    scheduling.open(match, round, at, createId());
    const state = { status: 'active', registrationCycleId: createId(), tournamentNumber: 14, players,
        schedulingPolicyVersion: scheduling.VERSION, notificationPolicyVersion: notifications.VERSION,
        auditPolicyVersion: audit.VERSION, readinessRevision: 3,
        bracket: { qf: Array(4).fill(null), sf: Array(2).fill(null), f: [null] } };
    state.bracket[round][0] = match;
    const roomId = `tourney_${round}_0_fixture`;
    const matchId = createId();
    const receipt = audit.event(state, round, 0, match, 'game_started', matchId, at + 60000,
        { matchId, roomId, open: true });
    const ledger = { matchId, roomId, mode: 'tournament', verification: 'server', resultType: 'regular',
        participants: [{ uid: players[1].id, score: 700 }, { uid: players[0].id, score: 900 }],
        winnerUid: players[0].id, loserUid: players[1].id, finishedAt: new Date(at + 120000) };
    return { state, match, players, receipt, ledger, roomId, matchId };
}

function rules() {
    const f = fixture();
    assert.equal(audit.event({ ...f.state, auditPolicyVersion: '' }, 'qf', 0, f.match, 'test', 'key', at), null);
    assert.equal(audit.fromLedger(f.receipt, null, 3500), null);
    for (const bad of [{ verification: 'authenticated_client' }, { winnerUid: f.players[1].id }, { roomId: 'other' },
        { participants: [{ uid: f.players[0].id, score: 900 }, { uid: f.players[0].id, score: 900 }] }, { finishedAt: new Date(at) }]) {
        assert.equal(audit.fromLedger(f.receipt, { ...f.ledger, ...bad }, 3500), false, JSON.stringify(bad));
    }
    const result = audit.fromLedger(f.receipt, f.ledger, 3500);
    assert.equal(result.kind, 'result_recorded');
    assert.equal(result.p1Score, 900, 'scores matched by UID, not arrival order');
    const next = audit.planResolution(f.state, f.receipt, result, options);
    assert.equal(next.updates['bracket.sf.0'].p1.id, f.players[0].id);
    assert(!next.updates['bracket.sf.0'].scheduling, 'next-round clock waits for both opponents');
    assert.equal(next.close, f.receipt._id);
    assert.equal(next.events[0].matchId, f.matchId);
    assert.equal(f.match.winnerId, null, 'planning does not publish');
    f.state.bracket.sf[0] = { p1: null, p2: { id: 'player-c' } };
    const advance = audit.planResolution(f.state, f.receipt, result, options);
    assert.equal(advance.events[1].kind, 'match_opened');
    assert.equal(advance.updates['bracket.sf.0'].scheduling.openedAt, options.now);

    const drawLedger = { ...f.ledger, winnerUid: '', loserUid: '', isDraw: true,
        participants: f.ledger.participants.map(player => ({ ...player, score: 900 })) };
    const draw = audit.planResolution(f.state, f.receipt, audit.fromLedger(f.receipt, drawLedger, 3500), options);
    assert.equal(draw.events[0].kind, 'draw_recorded');
    assert.equal(draw.updates['bracket.qf.0'].lastDrawScoreLabel, '900-900');
    assert.equal(draw.updates['bracket.qf.0'].scheduling.attempt, 2);
    assert.equal(draw.updates['bracket.qf.0'].winnerId, null);
    const technical = audit.fromLedger(f.receipt, { ...f.ledger, resultType: 'technical', reason: 'turn_timeout' }, 3500);
    assert.equal(technical.p1Score, 1);
    assert.equal(technical.reason, 'turn_timeout');
    const interrupted = audit.planResolution(f.state, f.receipt, { kind: 'game_interrupted', at: options.now,
        reason: 'server_interruption' }, options);
    const replay = interrupted.updates['bracket.qf.0'];
    assert.equal(replay.replayReason, 'server_interruption');
    assert.equal(replay.timeAccepted, false);
    assert.equal(replay.winnerId, null);
    f.state.bracket.qf[0] = replay;
    assert.equal(audit.planResolution(f.state, f.receipt, result, options), null, 'old room cannot decide replay');
    assert(notifications.collect(f.state, options.now).every(n => n.kind === 'match_replay_server'));
}

function fake(state) {
    let db = { tournamentstates: [structuredClone(state)], tournamentmatchaudits: [], matchresults: [],
        userprofiles: state.players.map(player => ({ firebaseUid: player.id, balance: 2000, tournamentWins: 0 })), tourneystats: [],
        tournamententries: state.players.map(player => ({ _id: player.id, cycleId: state.registrationCycleId, uid: player.id,
            tournamentNumber: state.tournamentNumber, startedAt: at, status: 'started', amount: 5500, refundedAmount: 0 })),
        tournamentreliabilities: [], tournamentnotices: [] };
    let fault;
    const val = (doc, key) => key.split('.').reduce((value, segment) => value?.[segment], doc);
    const set = (doc, key, value) => {
        const keys = key.split('.');
        const end = keys.pop();
        keys.reduce((value, segment) => value[segment], doc)[end] = structuredClone(value);
    };
    const matches = (row, filter) => Object.entries(filter).every(([key, value]) => {
        const actual = val(row, key);
        if (value === null) return actual == null;
        if (typeof value === 'object') return Object.entries(value).every(([op, operand]) =>
            op === '$in' ? operand.includes(actual) : op === '$gt' ? actual > operand : op === '$lte' ? actual <= operand : false);
        return actual === value;
    });
    const connection = { db: { collection: name => ({
        find: filter => ({ sort: () => ({ toArray: async () => structuredClone(db[name].filter(row => matches(row, filter))) }) }),
        async findOne(filter, options) { return structuredClone((options?.session?.draft || db)[name].find(row => matches(row, filter))); },
        async distinct(key, filter, options) { return [...new Set((options?.session?.draft || db)[name]
            .filter(row => matches(row, filter)).map(row => row[key]))]; },
        async findOneAndUpdate(filter, update, options) {
            const row = options.session.draft[name].find(item => matches(item, filter));
            if (!row) return null;
            for (const [key, value] of Object.entries(update.$inc || {})) set(row, key, (val(row, key) || 0) + value);
            return structuredClone(row);
        },
        async updateOne(filter, update, options) {
            if (fault === name) throw new Error('fixture_write_failed');
            const rows = (options?.session?.draft || db)[name];
            let row = rows.find(item => matches(item, filter));
            const matchedCount = Number(Boolean(row));
            if (!row && options?.upsert) { row = { ...filter }; rows.push(row); }
            if (!row) return { matchedCount };
            if (!matchedCount) Object.assign(row, structuredClone(update.$setOnInsert || {}));
            for (const [key, value] of Object.entries(update.$set || {})) set(row, key, value);
            for (const [key, value] of Object.entries(update.$inc || {})) set(row, key, (val(row, key) || 0) + value);
            for (const [key, value] of Object.entries(update.$push || {})) {
                const existing = val(row, key) || [];
                set(row, key, value.$each ? [...value.$each, ...existing] : [...existing, value]);
            }
            return { matchedCount };
        }
    }) }, async transaction(fn, options) {
        assert.equal(options.writeConcern.w, 'majority');
        assert.equal(options.readConcern.level, 'snapshot');
        const draft = structuredClone(db);
        await fn({ draft });
        db = draft;
    } };
    const held = new Set();
    const store = audit.createStore({ connection, guardWrite: async references => {
        held.add(references);
        return () => held.delete(references);
    } });
    return { store, held, get db() { return db; }, fail: value => { fault = value; } };
}

async function persistence() {
    const f = fixture();
    const h = fake(f.state);
    const filter = { registrationCycleId: f.state.registrationCycleId, readinessRevision: 3 };
    const runtime = createTournamentSchedulingRuntime({ getState: () => f.state, isBusy: () => false,
        now: () => at, createId,
        persistMatch: async (state, input, match, rev, command) => h.store.commitState({ ...filter, readinessRevision: rev },
            { 'bracket.qf.0': match, readinessRevision: rev + 1 }, { events: [audit.scheduleEvent(state, input, match, command)] }),
        persistTransition: (_state, plan, rev) => h.store.commitState({ ...filter, readinessRevision: rev },
            { ...plan.updates, readinessRevision: rev + 1 }, plan) });
    const action = { ...filter, cycleId: f.state.registrationCycleId, round: 'qf', index: 0, scheduleId: f.match.scheduling.id,
        revision: 0, uid: f.players[0].id, proposedTime: '2026-11-11T19:00' };
    h.fail('tournamentmatchaudits');
    await assert.rejects(runtime.execute('propose', action), /fixture_write_failed/);
    assert.equal(f.state.bracket.qf[0].scheduling.pending, null);
    assert.equal(h.db.tournamentstates[0].bracket.qf[0].scheduling.pending, null, 'audit failure rolls back bracket');
    h.fail(null);
    assert((await runtime.execute('propose', action)).ok);
    const pending = f.state.bracket.qf[0].scheduling.pending;
    assert((await runtime.execute('accept', { ...action, revision: 1, proposalId: pending.id, uid: f.players[1].id })).ok);
    assert.deepEqual(h.db.tournamentmatchaudits.map(row => row.kind), ['time_proposed', 'time_accepted']);
    await h.store.observe(f.receipt);
    await h.store.observe(f.receipt);
    assert.equal((await h.store.openGames(f.state.registrationCycleId)).length, 1);

    const prepare = state => audit.planResolution(state, f.receipt, audit.fromLedger(f.receipt, f.ledger, 3500), options);
    h.fail('tournamentmatchaudits');
    await assert.rejects(runtime.transition(prepare), /fixture_write_failed/);
    assert.equal(h.db.tournamentstates[0].bracket.qf[0].winnerId, null);
    h.fail(null);
    const one = runtime.transition(prepare);
    const duplicate = runtime.transition(prepare);
    assert(await one);
    assert.equal(await duplicate, false);
    assert.equal(f.state.bracket.qf[0].winnerId, f.players[0].id);
    assert.equal((await h.store.openGames(f.state.registrationCycleId)).length, 0);
    assert.equal(h.db.tournamentmatchaudits.filter(row => row.kind === 'result_recorded').length, 1);
    assert.equal(h.held.size, 0);

    const final = fixture('f');
    final.state.status = 'finished';
    final.match.winnerId = final.players[0].id;
    const p = fake(final.state);
    const awards = final.players.map((player, i) => {
        const amount = i ? 5500 : 44000;
        const role = i ? 'runnerup' : 'winner';
        return { uid: player.id, amount, role, notice: { id: 'a'.repeat(64), matchId: 'final-game', role, reward: amount } };
    });
    const plan = { events: [audit.event(final.state, 'f', 0, final.match, 'final_settled', 'awards', options.now)],
        final: { awards, maxBalance: 100000, record: { winnerId: final.players[0].id, winnerName: 'Winner', wonAt: new Date(at) } } };
    const finalFilter = { registrationCycleId: final.state.registrationCycleId, readinessRevision: 3 };
    const values = { 'bracket.f.0.prizesAwarded': true, readinessRevision: 4 };
    p.fail('tourneystats');
    await assert.rejects(p.store.commitState(finalFilter, values, plan), /fixture_write_failed/);
    assert.deepEqual(p.db.userprofiles.map(row => row.balance), [2000, 2000]);
    assert.ok(p.db.userprofiles.every(row => !row.pendingTournamentPrizes), 'notice rolls back with the wallet');
    assert.equal(p.db.tournamentmatchaudits.length, 0, 'receipt and prize fail together');
    p.fail(null);
    await p.store.commitState(finalFilter, values, plan);
    await assert.rejects(p.store.commitState(finalFilter, values, plan), /revision_conflict/);
    assert.deepEqual(p.db.userprofiles.map(row => row.balance), [46000, 7500]);
    assert.deepEqual(p.db.userprofiles.map(row => row.pendingTournamentPrizes), awards.map(award => [award.notice]));
    assert.equal(p.db.tourneystats[0].wins, 1);
    assert.equal(p.db.tourneystats[0].championships.length, 1);

    const voided = fixture();
    const r = fake(voided.state);
    r.db.userprofiles[1].balance = 99000;
    const refund = { events: [audit.event(voided.state, 'qf', 0, voided.match, 'adjudication_void', 'refund', options.now)],
        refunds: voided.players.map(player => player.id), refundMaxBalance: 100000 };
    const refundFilter = { registrationCycleId: voided.state.registrationCycleId, readinessRevision: 3 };
    const refundValues = { 'bracket.qf.0.review': { kind: 'void' }, readinessRevision: 4 };
    r.fail('tournamententries');
    await assert.rejects(r.store.commitState(refundFilter, refundValues, refund), /fixture_write_failed/);
    assert.deepEqual(r.db.userprofiles.map(row => row.balance), [2000, 99000]);
    assert.equal(r.db.tournamentstates[0].bracket.qf[0].review, undefined, 'void and refund roll back together');
    r.fail(null);
    await r.store.commitState(refundFilter, refundValues, refund);
    await assert.rejects(r.store.commitState(refundFilter, refundValues, refund), /revision_conflict/);
    assert.deepEqual(r.db.userprofiles.map(row => row.balance), [7500, 100000]);
    assert.deepEqual(r.db.tournamententries.map(row => [row.status, row.amount - row.refundedAmount]),
        [['refunded', 0], ['refunded', 4500]], 'capacity-limited refund remains a durable debt');

    const sanctioned = fixture();
    const z = fake(sanctioned.state);
    const sanction = { events: [audit.event(sanctioned.state, 'qf', 0, sanctioned.match, 'adjudication_double_dq', 'case', options.now)],
        incident: { cycleId: sanctioned.state.registrationCycleId, tournamentNumber: sanctioned.state.tournamentNumber,
            inactiveUids: [sanctioned.players[0].id, sanctioned.players[1].id], reason: 'both_inactive', at: options.now } };
    const sanctionFilter = { registrationCycleId: sanctioned.state.registrationCycleId, readinessRevision: 3 };
    const sanctionValues = { 'bracket.qf.0.review': { kind: 'double_dq' }, readinessRevision: 4 };
    z.fail('tournamentnotices');
    await assert.rejects(z.store.commitState(sanctionFilter, sanctionValues, sanction), /fixture_write_failed/);
    assert.equal(z.db.tournamentstates[0].bracket.qf[0].review, undefined);
    assert.equal(z.db.tournamentreliabilities.length, 0, 'warning, notice and decision roll back together');
    z.fail(null);
    await z.store.commitState(sanctionFilter, sanctionValues, sanction);
    await assert.rejects(z.store.commitState(sanctionFilter, sanctionValues, sanction), /revision_conflict/);
    assert.equal(z.db.tournamentreliabilities.length, 2);
    assert.deepEqual(z.db.tournamentnotices.map(row => row.kind), ['reliability_warning', 'reliability_warning']);
}

async function restart() {
    const source = fs.readFileSync(require.resolve('../server.js'), 'utf8').replace(/\r\n/g, '\n');
    const actual = name => {
        const start = source.search(new RegExp('(?:async )?function ' + name + '\\('));
        assert(start >= 0);
        return source.slice(start, source.indexOf('\n}', start) + 2);
    };
    for (const mode of ['ledger', 'interruption', 'live', 'conflict']) {
        const f = fixture();
        const h = fake(f.state);
        await h.store.observe(f.receipt);
        if (mode === 'ledger' || mode === 'conflict') h.db.matchresults.push({ ...f.ledger,
            verification: mode === 'conflict' ? 'authenticated_client' : 'server' });
        const runtime = createTournamentSchedulingRuntime({ getState: () => f.state, isBusy: () => false, createId,
            persistTransition: (state, plan, rev) => h.store.commitState({ registrationCycleId: state.registrationCycleId,
                readinessRevision: rev }, { ...plan.updates, readinessRevision: rev + 1 }, plan) });
        const context = vm.createContext({ tournamentAudit: audit, tournamentAdjudicationCore: adjudication,
            tournamentDecisionOptions: () => options, tournamentState: f.state, tournamentStateInitialized: false,
            Date: { now: () => options.now }, MAX_SCORE: 3500, TOURNEY_FINISHED_RESET_DELAY_MS: options.resetDelayMs,
            ACCOUNT_DELETION_ENABLED: false, crypto: { randomUUID: createId }, pendingAuditedTournamentGames: new Map(),
            roomState: mode === 'live' ? { [f.roomId]: { matchId: f.matchId } } : {},
            getTournamentAuditStore: () => h.store, getTournamentSchedulingRuntime: () => runtime, createTournamentMatch: createMatch,
            getTournamentMatch: (round, index) => ({ match: f.state.bracket[round][index] }) });
        for (const name of ['resolveAuditedTournamentGame', 'recoverAuditedTournamentGames']) vm.runInContext(actual(name), context);
        await context.recoverAuditedTournamentGames();
        await context.recoverAuditedTournamentGames();
        const match = f.state.bracket.qf[0];
        assert.equal(match.winnerId, mode === 'ledger' ? f.players[0].id : null);
        assert.equal(match.scheduling.attempt, mode === 'interruption' ? 2 : 1);
        assert.equal((await h.store.openGames(f.state.registrationCycleId)).length, ['live', 'conflict'].includes(mode) ? 1 : 0);
        assert.equal(h.db.tournamentmatchaudits.filter(row => row.kind === 'recovery_conflict').length, mode === 'conflict' ? 1 : 0);
    }
    const f = fixture();
    const h = fake(f.state);
    let confirmWrite;
    let connected = true;
    const pending = new Map();
    const context = vm.createContext({ tournamentAudit: audit, tournamentState: f.state, pendingAuditedTournamentGames: pending,
        Date: { now: () => options.now }, console: { error() {} }, parseTournamentRoomId: () => ({ round: 'qf', index: 0 }),
        getTournamentMatch: () => ({ match: f.match }), getTournamentAuditStore: () => ({ ...h.store,
            observe: async row => { await new Promise(resolve => { confirmWrite = resolve; }); await h.store.observe(row); } }) });
    vm.runInContext(actual('persistAuditedTournamentGame'), context);
    const room = { matchId: f.matchId, matchStartedAt: at + 60000, tournamentScheduleId: f.match.scheduling.id };
    const reserve = context.persistAuditedTournamentGame(f.roomId, room, () => connected);
    assert.equal(room.tournamentAuditGame, undefined, 'cannot start until a durable receipt exists');
    assert(pending.get(f.matchId).starting);
    connected = false;
    confirmWrite();
    assert.equal(await reserve, false, 'rechecks participants after the asynchronous write');
    assert.equal(room.tournamentAuditGame, undefined);
    assert.equal(pending.size, 0);
    assert.deepEqual((await h.store.evidence(f.state.registrationCycleId, 'qf', 0)).map(row => row.kind), ['game_started', 'game_start_aborted']);
}

(async () => {
    rules();
    await persistence();
    await restart();
    console.log('PASS: audited scheduling, durable room receipts, server-result recovery, replay without penalty, conflict quarantine and atomic final awards.');
})().catch(error => { console.error(error); process.exitCode = 1; });
