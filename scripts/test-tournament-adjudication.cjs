'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const core = require('../www/tournamentAdjudicationCore');
const scheduling = require('../www/tournamentSchedulingCore');
const notifications = require('../www/tournamentNotificationsCore');
const audit = require('../lib/tournament-match-audit');
const review = require('../lib/tournament-adjudication');

const start = Date.parse('2026-11-11T09:00:00+01:00');
const slot = Date.parse('2026-11-12T13:00:00+01:00');
const M = 60000;
const DAY = 1440 * M;
const run = 'fixture-process';
const good = { covers: () => true };
const gap = { covers: () => false };
const player = id => ({ id });
const createMatch = (p1 = null, p2 = null) => ({ p1, p2, winnerId: null });
const options = now => ({ now, resetDelayMs: DAY, createMatch, createId: randomUUID });

function fixture(round = 'qf') {
    const match = createMatch(player('a'), player('b'));
    scheduling.open(match, round, start, randomUUID());
    const state = { status: 'active', registrationCycleId: 'fixture-cycle', tournamentNumber: 15,
        schedulingPolicyVersion: scheduling.VERSION, auditPolicyVersion: audit.VERSION,
        notificationPolicyVersion: notifications.VERSION, adjudicationPolicyVersion: core.VERSION,
        bracket: { qf: Array(4).fill(null), sf: Array(2).fill(null), f: [null] } };
    state.bracket[round][0] = match;
    const rows = [audit.openedEvent(state, round, 0, match)];
    function change(command, uid, at, proposedTime) {
        const s = match.scheduling;
        const input = { uid, scheduleId: s.id, revision: s.revision, proposedTime, proposalId: s.pending?.id, round, index: 0 };
        assert(scheduling.apply(match, command, input, at, randomUUID).ok);
        rows.push(audit.scheduleEvent(state, input, match, command));
    }
    return { state, match, round, rows, change,
        book() { change('propose', 'a', start, '2026-11-12T13:00'); change('accept', 'b', start + M); },
        decide(at, coverage = good, rowsOverride = rows) { return review.evaluate(match, rowsOverride, at, coverage, run); } };
}

function rules() {
    const quiet = fixture();
    const deadline = quiet.match.scheduling.deadlineAt;
    assert.equal(quiet.decide(deadline - 1), null);
    assert.equal(quiet.decide(deadline).kind, 'double_dq');
    assert.equal(quiet.decide(deadline, gap).kind, 'extension', 'no health coverage means no inactivity ruling');
    assert.equal(quiet.decide(deadline, good, []).kind, 'extension', 'missing opening evidence cannot produce DQ');
    quiet.match.rematchRequired = true;
    assert.equal(quiet.decide(deadline).kind, 'extension', 'draw or interruption cannot be punished just for having no new record');

    const proposed = fixture();
    proposed.change('propose', 'a', start + M, '2026-11-12T13:00');
    assert.deepEqual(proposed.decide(deadline), { kind: 'technical', winnerId: 'a', inactiveUids: ['b'], reason: 'unanswered_valid_proposal' });
    assert.equal(proposed.decide(deadline, gap).kind, 'extension');
    const short = fixture();
    short.change('propose', 'a', start, '2026-11-11T09:20');
    assert.equal(short.decide(deadline).kind, 'extension', 'short response window does not decide a winner');
    const counter = fixture();
    counter.change('propose', 'a', start, '2026-11-12T13:00');
    counter.change('propose', 'b', start + M, '2026-11-12T14:00');
    assert.equal(counter.decide(deadline).kind, 'extension', 'both cooperated');

    const booked = fixture();
    booked.book();
    const window = core.windowFor(booked.match);
    const presence = Array.from({ length: 61 }, (_, i) => ({ kind: 'appointment_presence', at: slot + i * 15000,
        scheduleId: booked.match.scheduling.id, actorUid: 'a', details: { sessionId: 'one', runId: run,
            acceptedId: booked.match.scheduling.accepted.id } }));
    const withPresence = [...booked.rows, ...presence];
    assert.equal(booked.decide(window.closes - 1, good, withPresence), null);
    assert.deepEqual(booked.decide(window.closes, good, withPresence), { kind: 'technical', winnerId: 'a', inactiveUids: ['b'],
        reason: 'verified_no_show', acceptedId: booked.match.scheduling.accepted.id });
    const opponentPartial = { ...presence[12], actorUid: 'b' };
    assert.equal(booked.decide(window.closes, good, [...withPresence, opponentPartial]), null, 'a partial opponent check-in is not absence');
    assert.equal(booked.decide(deadline, good, [...withPresence, opponentPartial]).kind, 'extension');
    assert.equal(booked.decide(deadline, gap, withPresence).kind, 'extension', 'restart or service gap cannot award a no-show');
    assert.equal(booked.decide(deadline, good, [...booked.rows, ...presence.slice(0, 60)]).kind, 'extension', 'less than 15 minutes is insufficient');
    const hole = presence.filter((_, i) => i < 12 || i > 20);
    assert.equal(booked.decide(deadline, good, [...booked.rows, ...hole]).kind, 'extension', 'device background/connection hole breaks proof');
    const twoDevices = presence.map((row, i) => ({ ...row, details: { ...row.details, sessionId: i < 30 ? 'one' : 'two' } }));
    assert.equal(booked.decide(deadline, good, [...booked.rows, ...twoDevices]).kind, 'extension', 'partial sessions cannot be stitched together');
    const oldProcess = presence.map(row => ({ ...row, details: { ...row.details, runId: 'prior-process' } }));
    assert.equal(booked.decide(deadline, good, [...booked.rows, ...oldProcess]).kind, 'extension');
    assert.equal(booked.decide(deadline, good, presence).kind, 'extension', 'no-show requires a durable mutual booking');

    const monitor = review.createCoverage();
    monitor.sample(start);
    monitor.sample(start + 15000);
    assert(monitor.covers(start, start + 20000));
    monitor.sample(start + 75000);
    assert(!monitor.covers(start, start + 75000));
    assert(monitor.covers(start + 75000, start + 80000));
    monitor.invalidate();
    assert(!monitor.covers(start, start + 80000));
}

function bracketAndRefunds() {
    const f = fixture();
    f.book();
    const { deadlineAt } = f.match.scheduling;
    const extension = review.planDecision(f.state, 'qf', 0, f.match, f.decide(deadlineAt), options(deadlineAt));
    const extended = extension.updates['bracket.qf.0'];
    assert(extended.scheduling.deadlineAt >= deadlineAt + DAY);
    assert.equal(extended.scheduling.accepted.id, f.match.scheduling.accepted.id);
    assert.equal(extended.scheduling.revision, f.match.scheduling.revision + 1);
    assert.equal(core.windowFor(extended), null, 'old appointment cannot be adjudicated after extension');
    f.state.bracket.qf[0] = extended;
    const voided = review.evaluate(extended, f.rows, extended.scheduling.deadlineAt, gap, run);
    assert.equal(voided.kind, 'void');
    assert.deepEqual(voided.refundUids, ['a', 'b']);
    assert.equal(voided.inactiveUids, undefined, 'void has no strike evidence');

    const last = fixture();
    const noWinner = { ...createMatch(player('c'), player('d')), review: { kind: 'double_dq' } };
    last.state.bracket.qf[1] = { ...createMatch(player('c'), player('d')), winnerId: 'c' };
    last.state.bracket.qf[2] = noWinner;
    last.state.bracket.qf[3] = noWinner;
    const dq = last.decide(last.match.scheduling.deadlineAt);
    const result = review.planDecision(last.state, 'qf', 0, last.match, dq, options(last.match.scheduling.deadlineAt));
    assert.equal(result.updates['bracket.qf.0'].winnerId, null);
    assert.equal(result.updates['bracket.sf.0'].winnerId, 'c');
    assert.equal(result.updates['bracket.sf.0'].review.kind, 'bye');
    assert.equal(result.updates['bracket.sf.1'].review.kind, 'empty');
    assert.equal(result.updates['bracket.f.0'].winnerId, null);
    assert.equal(result.updates['bracket.f.0'].review.kind, 'void');
    assert.equal(result.updates['bracket.f.0'].prizesAwarded, true, 'settled without any award');
    assert.equal(result.updates.status, 'finished');
    assert.deepEqual(result.refunds, ['c']);
    last.state.bracket.qf[0] = result.updates['bracket.qf.0'];
    assert(!scheduling.canStart(last.state.bracket.qf[0], start));
    assert(notifications.collect(last.state, last.match.scheduling.deadlineAt).some(row => row.reviewKind === 'double_dq'));
}

async function serverBoundary() {
    const code = fs.readFileSync(require.resolve('../server.js'), 'utf8').replace(/\r\n/g, '\n');
    const actual = name => {
        const start = code.search(new RegExp('(?:async )?function ' + name + '\\('));
        return code.slice(start, code.indexOf('\n}', start) + 2);
    };
    const f = fixture();
    f.book();
    let at = slot, auth = 'a', busy = false;
    const rows = [];
    const handlers = new Map();
    const socket = { id: 'socket-a', connected: true, on: (event, handler) => handlers.set(event, handler) };
    const context = vm.createContext({ socket, console, Date: { now: () => at }, crypto: { randomUUID },
        tournamentAdjudicationCore: core, tournamentAudit: audit, tournamentState: f.state, tournamentStateInitialized: true,
        tournamentAttendanceRunId: run, tournamentAttendanceWrites: 0, tournamentAttendanceCoverage: review.createCoverage(),
        requireTournamentAuth: () => auth, mongoose: { connection: { readyState: 1 } },
        getTournamentMatch: () => ({ match: f.match }), isTournamentParticipant: (match, uid) => [match.p1.id, match.p2.id].includes(uid),
        isPlayerBusyForInvite: () => busy, getTournamentSchedulingRuntime: () => ({ isLocked: () => false }),
        getTournamentAuditStore: () => ({ observe: async row => rows.push(row) }) });
    vm.runInContext(actual('recordTournamentAppointmentPresence'), context);
    const i = code.indexOf("    socket.on('tourney_attendance',");
    vm.runInContext(code.slice(i, code.indexOf('\n    });', i) + 8), context);
    const input = { cycleId: f.state.registrationCycleId, scheduleId: f.match.scheduling.id, round: 'qf', index: 0,
        acceptedId: f.match.scheduling.accepted.id, uid: 'b', at: 0 };
    const send = async (extra = {}) => {
        let result;
        await handlers.get('tourney_attendance')({ ...input, ...extra }, reply => { result = reply.ok; });
        return result;
    };
    auth = null;
    assert.equal(await send({ begin: true }), false);
    auth = 'a';
    assert.equal(await send(), false, 'requires explicit enrollment');
    assert.equal(await send({ acceptedId: 'stale', begin: true }), false);
    busy = true;
    assert.equal(await send({ begin: true }), false);
    busy = false;
    assert.equal(await send({ begin: true }), true);
    assert.equal(rows[0].actorUid, 'a');
    assert.equal(rows[0].at, at);
    assert(await send());
    assert.equal(rows.length, 1, 'repeated ping does not create additional evidence');
    at += core.PING_MS;
    assert(await send());
    assert.equal(rows.length, 2);
    assert.equal(rows[0].details.sessionId, rows[1].details.sessionId);

    at = f.match.scheduling.deadlineAt;
    const plans = [];
    let becameBusy = false;
    Object.assign(context, { tournamentAdjudication: review, tournamentAdjudicationBusy: false,
        tournamentAuditObservations: new Map(), tournamentDecisionOptions: options,
        isTournamentMatchInPlay: () => busy, getTournamentAuditStore: () => ({
            probe: async () => ({ _id: 'state' }),
            evidence: async () => { if (becameBusy) busy = true; return f.rows; }
        }), getTournamentSchedulingRuntime: () => ({ transition: async prepare => {
            const plan = await prepare(f.state);
            if (plan?.canCommit()) plans.push(plan);
            return false;
        } }) });
    vm.runInContext(actual('reviewTournamentDeadlines'), context);
    busy = true;
    await context.reviewTournamentDeadlines();
    assert.equal(plans.length, 0, 'active game or reconnect grace blocks adjudication');
    busy = false;
    becameBusy = true;
    await context.reviewTournamentDeadlines();
    assert.equal(plans.length, 0, 'game start during evidence read blocks adjudication');
    busy = false;
    becameBusy = false;
    await context.reviewTournamentDeadlines();
    assert.equal(plans[0].updates['bracket.qf.0'].review.kind, 'extension');
}

(async () => {
    rules();
    bracketAndRefunds();
    await serverBoundary();
    console.log('PASS: verified 15-minute attendance, uncertainty, double DQ, one extension, neutral void/refund, and safe bracket propagation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
