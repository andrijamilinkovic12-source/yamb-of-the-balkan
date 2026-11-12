'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('../www/tournamentSchedulingCore');
const { createTournamentSchedulingRuntime } = require('../lib/tournament-scheduling-runtime');
const { randomUUID } = require('node:crypto');

const time = value => Date.parse(value);
const at = time('2026-11-11T20:00:00+01:00');
const pair = () => ({ p1: { id: 'a' }, p2: { id: 'b' }, winnerId: null });
const cycleId = 'fixture-cycle';
const open = (round = 'qf', start = at) => {
    const match = pair();
    assert(core.open(match, round, start, randomUUID()));
    return match;
};
const action = (match, uid, extra = {}) => ({ cycleId, round: match.scheduling.round, index: 0,
    scheduleId: match.scheduling.id, revision: match.scheduling.revision, uid,
    proposalId: match.scheduling.pending?.id, ...extra });

function businessRules() {
    for (const [round, cutoff, first] of [
        ['qf', '2026-11-13T20:00:00+01:00', '2026-11-12T15:00:00+01:00'],
        ['sf', '2026-11-13T09:00:00+01:00', '2026-11-12T13:00:00+01:00'],
        ['f', '2026-11-12T20:00:00+01:00', '2026-11-12T11:00:00+01:00']
    ]) {
        const match = open(round);
        assert.equal(match.scheduling.deadlineAt, time(cutoff), round);
        assert.equal(match.scheduling.firstProposalDueAt, time(first), round);
        assert(core.apply(match, 'propose', action(match, 'a', { proposedTime: core.localInput(time(first) + 3600000) }), at, randomUUID).ok);
        assert.equal(match.scheduling.pending.replyDueAt, time(first), round + ' response active hours');
    }
    assert.equal(open('f', time('2027-03-27T21:00:00+01:00')).scheduling.deadlineAt, time('2027-03-29T09:00:00+02:00'));
    assert.equal(open('f', time('2027-10-30T23:00:00+02:00')).scheduling.deadlineAt, time('2027-11-01T09:00:00+01:00'));
    assert.equal(open('qf', time('2026-11-11T22:00:00+01:00')).scheduling.firstProposalDueAt, time('2026-11-12T17:00:00+01:00'));
    assert.equal(core.open({ p1: pair().p1 }, 'sf', at, 'missing-player'), false);
    assert.equal(core.isManaged({ status: 'active' }), false);
    for (const invalid of ['2027-03-28T02:30', '2027-10-31T02:30', '2026-02-30T12:00', '2026-02-30T12:00:00.000Z', {}, null]) {
        assert(Number.isNaN(core.parseTime(invalid)), String(invalid));
    }
    assert.equal(core.parseTime('2026-11-12T21:00'), time('2026-11-12T20:00:00Z'));
    assert.equal(core.parseTime('2027-06-11T21:00'), time('2027-06-11T19:00:00Z'));

    const match = open();
    const deadline = match.scheduling.deadlineAt;
    const propose = (uid, proposedTime, now = at) => core.apply(match, 'propose', action(match, uid, { proposedTime }), now, randomUUID);
    const accept = (uid, now = at, request = action(match, uid)) => core.apply(match, 'accept', request, now, randomUUID);
    for (const invalid of ['2026-11-11T19:59', '2026-11-11T20:14', '2026-11-13T20:00', '2026-11-13T20:01']) {
        assert.equal(propose('a', invalid).reason, 'tourney_schedule_invalid_time');
    }
    assert.equal(propose('spectator', '2026-11-12T21:00').reason, 'tourney_schedule_stale');
    assert.equal(match.scheduling.proposals.length, 0);
    assert(propose('a', '2026-11-12T21:00').ok);
    const old = action(match, 'b');
    const oldDue = match.scheduling.pending.replyDueAt;
    assert.equal(propose('a', '2026-11-12T20:00:00.000Z').reason, 'tourney_schedule_duplicate', 'same instant in different encoding');
    assert.equal(accept('a').reason, 'tourney_schedule_stale', 'own proposal');
    assert(propose('a', '2026-11-12T21:30', at + 60000).ok);
    assert.equal(match.scheduling.pending.replyDueAt, oldDue, 'own edits cannot reset the clock');
    assert.equal(accept('b', at + 60000, old).reason, 'tourney_schedule_stale', 'old rendered acceptance never accepts a changed proposal');
    assert.equal(accept('b', oldDue).reason, 'tourney_schedule_response_expired');
    assert(accept('b', oldDue - 1).ok);
    const original = match.scheduling.accepted.id;
    const originalTime = match.time;
    assert(propose('b', '2026-11-13T16:00', oldDue).ok);
    assert.equal(match.time, originalTime);
    assert(match.timeAccepted && core.canStart(match, oldDue));
    assert.equal(match.scheduling.accepted.id, original);
    assert.equal(match.scheduling.deadlineAt, deadline);
    assert.equal(accept('b', oldDue).reason, 'tourney_schedule_stale');
    assert(accept('a', oldDue).ok);
    assert.notEqual(match.time, originalTime);
    assert(!core.canStart(match, deadline));
    assert.equal(propose('a', '2026-11-13T21:00', deadline).reason, 'tourney_schedule_expired');

    const quick = open('f');
    assert(core.apply(quick, 'propose', action(quick, 'a', { proposedTime: '2026-11-11T20:30' }), at, randomUUID).ok);
    assert(!quick.scheduling.pending.fullResponseWindow);
    assert.equal(quick.scheduling.firstFullWindowProposalAt, null);
    assert(core.apply(quick, 'accept', action(quick, 'b'), at + 60000, randomUUID).ok, 'mutual expedited appointment is possible');
    const prior = action(quick, 'a');
    const oldDeadline = quick.scheduling.deadlineAt;
    assert(core.open(quick, 'f', oldDeadline + 1000, randomUUID()));
    assert.equal(quick.scheduling.attempt, 2);
    assert.equal(quick.scheduling.previousAttemptId, prior.scheduleId);
    assert(quick.scheduling.deadlineAt > oldDeadline);
    assert.equal(quick.time, null);
    assert.equal(core.apply(quick, 'propose', prior, oldDeadline + 1000, randomUUID).reason, 'tourney_schedule_stale');
}

async function runtimeRules() {
    const match = open();
    let state = { schedulingPolicyVersion: core.VERSION, registrationCycleId: cycleId, readinessRevision: 7,
        status: 'active', bracket: { qf: [match, open()] } };
    let durable = structuredClone(state);
    let reject = false, busy = false, concurrentResult;
    const runtime = createTournamentSchedulingRuntime({ getState: () => state, now: () => at, createId: randomUUID,
        isBusy: () => busy,
        persistMatch: async (current, input, next, revision) => {
            assert(runtime.isLocked('qf', 0));
            assert.equal(current, state);
            assert.equal(durable.readinessRevision, revision);
            assert.notEqual(match.scheduling, next.scheduling, 'draft is not published before commit');
            if (reject) throw new Error('write_failed');
            await Promise.resolve();
            durable.bracket[input.round][input.index] = structuredClone(next);
            durable.readinessRevision += 1;
            if (concurrentResult) concurrentResult();
        },
        persistState: async (snapshot, revision) => {
            assert.equal(durable.readinessRevision, revision);
            durable = structuredClone(snapshot);
        }
    });
    const request = action(match, 'a', { proposedTime: '2026-11-12T21:00' });
    assert.equal((await runtime.execute('propose', { ...request, cycleId: 'prior' })).reason, 'tourney_schedule_stale');
    busy = true;
    assert.equal((await runtime.execute('propose', request)).reason, 'tourney_schedule_busy');
    busy = false;
    reject = true;
    await assert.rejects(runtime.execute('propose', request), /write_failed/);
    assert.equal(match.scheduling.pending, null);
    assert(!runtime.isLocked('qf', 0));
    reject = false;
    const one = runtime.execute('propose', request);
    const two = runtime.execute('propose', { ...request, uid: 'b', proposedTime: '2026-11-12T22:00' });
    assert((await one).ok);
    assert.equal((await two).reason, 'tourney_schedule_stale');
    const accept = runtime.execute('accept', action(match, 'b'));
    const save = runtime.save();
    state.bracket.qf[1].winnerId = 'b';
    assert((await accept).ok);
    await save;
    assert.equal(durable.bracket.qf[0].time, match.time);
    assert.equal(durable.bracket.qf[1].winnerId, 'b');
    concurrentResult = () => { match.winnerId = 'a'; };
    assert.equal((await runtime.execute('propose', action(match, 'a', { proposedTime: '2026-11-12T23:00' }))).reason, 'tourney_schedule_stale');
    assert.equal(match.winnerId, 'a');
    assert.equal(match.scheduling.pending, null);
    await runtime.save();
    assert.equal(durable.bracket.qf[0].winnerId, 'a');
    state = structuredClone(durable);
    assert.equal((await runtime.execute('propose', request)).reason, 'tourney_schedule_stale', 'stale request after reload');
}

async function serverRules() {
    const source = fs.readFileSync(require.resolve('../server.js'), 'utf8').replace(/\r\n/g, '\n');
    const actual = name => {
        const start = source.search(new RegExp('(?:async )?function ' + name + '\\('));
        assert(start >= 0, name);
        return source.slice(start, source.indexOf('\n}', start) + 2);
    };
    let now = at;
    const match = open();
    const state = { schedulingPolicyVersion: core.VERSION, registrationCycleId: cycleId, status: 'active',
        bracket: { qf: [match], sf: [null, null], f: [null] } };
    const roomId = 'tourney_qf_0_fixture';
    const room = { tournamentScheduleId: match.scheduling.id, gameFinished: true, matchId: 'played-1' };
    const events = [], handlers = new Map();
    const starter = { id: 'socket-a', uid: 'a', emit: (...args) => events.push(['starter', ...args]) };
    const target = { id: 'socket-b', uid: 'b', emit: (...args) => events.push(['target', ...args]) };
    const sockets = new Map([[starter.id, starter], [target.id, target]]);
    let uid = 'a', saves = 0;
    const context = vm.createContext({ tournamentSchedulingCore: core, tournamentState: state, tournamentStateInitialized: true,
        TOURNEY_ROUNDS: new Set(['qf', 'sf', 'f']), ACCOUNT_DELETION_ENABLED: false,
        Date: { now: () => now }, crypto: { randomUUID }, roomState: { [roomId]: room },
        authorizedTournamentRooms: new Map(), pendingTournamentDuelInvites: {}, privateRooms: {},
        onlinePlayers: { a: starter.id, b: target.id }, ROOM_INVITE_RESPONSE_WINDOW_MS: 60000,
        getSocketUid: id => sockets.get(id)?.uid, sanitizeTournamentName: name => name,
        isPlayerBusyForInvite: () => false, findPendingTournamentDuelInvite: () => null,
        setTimeout: () => ({ unref() {} }),
        rejectTournamentAction: (socket, reason) => socket.emit('error_msg', reason),
        getVerifiedUid: socket => socket.uid, requireTournamentAuth: () => uid,
        getTournamentSchedulingRuntime: () => ({ isLocked: () => false }),
        isTournamentSchedulingUnlocked: () => true,
        getTournamentRoomMatchScores: () => ({ p1Score: 812, p2Score: 812 }),
        saveTournamentToDb: async () => { saves++; }, scheduleTournamentAutoReset() {},
        toSafeInt: value => Number(value || 0), emitTournamentStateUpdate: () => events.push('state'),
        handleTournamentScheduling: (_socket, command, _data, verified) => events.push([command, verified]),
        socket: { ...starter, on: (event, handler) => handlers.set(event, handler) },
        io: { emit: () => events.push('legacy-state'), to: id => sockets.get(id), sockets: { sockets } }
    });
    for (const name of ['createTournamentMatch', 'advanceTournamentBracket', 'openNextTournamentScheduling', 'reopenTournamentScheduling',
        'getTournamentMatch', 'getTournamentPlayer', 'getTournamentOpponent', 'isTournamentParticipant', 'parseTournamentRoomId', 'isCurrentTournamentRoomAttempt', 'canStartManagedTournamentMatch',
        'isTournamentMatchInPlay', 'authorizeManagedTournamentJoin', 'recordTournamentDrawReplay', 'isTournamentDrawRematchAllowed', 'recordTournamentNetworkReplay']) {
        vm.runInContext(actual(name), context);
    }
    for (const event of ['tourney_propose_time', 'tourney_accept_time', 'tourney_start_duel', 'tourney_duel_response']) {
        const start = source.indexOf("    socket.on('" + event + "',");
        vm.runInContext(source.slice(start, source.indexOf('\n    });', start) + 8), context);
    }
    uid = null;
    await handlers.get('tourney_propose_time')({ uid: 'forged' });
    assert.equal(events.length, 0);
    uid = 'a';
    await handlers.get('tourney_propose_time')({ uid: 'forged' });
    await handlers.get('tourney_accept_time')({ uid: 'forged' });
    assert.deepEqual(events.splice(0), [['propose', 'a'], ['accept', 'a']]);

    context.advanceTournamentBracket('qf', 0, match.p1);
    assert.equal(state.bracket.sf[0].scheduling, undefined);
    now += 3600000;
    context.advanceTournamentBracket('qf', 1, { id: 'c' });
    assert.equal(state.bracket.sf[0].scheduling.openedAt, now);
    context.advanceTournamentBracket('sf', 1, { id: 'd' });
    assert.equal(state.bracket.f[0].scheduling, undefined);
    now += 3600000;
    context.advanceTournamentBracket('sf', 0, { id: 'a' });
    assert.equal(state.bracket.f[0].scheduling.openedAt, now);
    const current = match.scheduling.id;
    assert(core.apply(match, 'propose', action(match, 'a', { proposedTime: '2026-11-12T21:00' }), now, randomUUID).ok);
    assert(core.apply(match, 'accept', action(match, 'b'), now, randomUUID).ok);
    const start = { ...action(match, 'a'), acceptedId: match.scheduling.accepted.id };
    handlers.get('tourney_start_duel')({ ...start, acceptedId: 'old-appointment' });
    assert.deepEqual(events.splice(0), [['starter', 'error_msg', 'tourney_schedule_stale']]);
    handlers.get('tourney_start_duel')(start);
    const newRoom = Object.keys(context.pendingTournamentDuelInvites)[0];
    assert(newRoom);
    assert(!context.authorizeManagedTournamentJoin(starter, newRoom), 'invite is not permission before acceptance');
    context.clearPendingTournamentDuelInvite = id => { delete context.pendingTournamentDuelInvites[id]; };
    handlers.get('tourney_duel_response')({ matchRoomId: newRoom, accepted: true });
    assert(context.pendingTournamentDuelInvites[newRoom], 'starter cannot accept the invitation for the opponent');
    context.socket = target;
    handlers.get('tourney_duel_response')({ matchRoomId: newRoom, accepted: true });
    assert.deepEqual(events.splice(0).slice(-2), [['starter', 'tourney_join_allowed', newRoom], ['target', 'tourney_join_allowed', newRoom]]);
    assert(context.authorizeManagedTournamentJoin({ uid: 'a', id: 'socket-a' }, newRoom));
    assert(!context.authorizeManagedTournamentJoin({ uid: 'a', id: 'other-tab' }, newRoom));
    assert(!context.authorizeManagedTournamentJoin({ uid: 'spectator', id: 'socket-a' }, newRoom));
    assert(!context.authorizeManagedTournamentJoin({ uid: 'a', id: 'socket-a' }, 'tourney_qf_0_uninvited'));
    assert(context.authorizeManagedTournamentJoin({}, 'normal-private-room'));
    now = match.scheduling.deadlineAt;
    assert(!context.authorizeManagedTournamentJoin({ uid: 'a', id: 'socket-a' }, newRoom));
    assert(context.isCurrentTournamentRoomAttempt(roomId, match), 'deadline does not invalidate a game already started');
    assert(await context.recordTournamentDrawReplay(roomId));
    assert.equal(match.drawCount, 1);
    assert.equal(match.scheduling.attempt, 2);
    assert(!await context.recordTournamentDrawReplay(roomId));
    assert(context.isTournamentDrawRematchAllowed(roomId, room), 'same-room mutual replay is still available');
    assert(!context.authorizeManagedTournamentJoin({ uid: 'a', id: 'socket-a' }, newRoom), 'old ticket cannot start new replay');
    const replayRoom = 'tourney_qf_0_replay';
    context.roomState[replayRoom] = { tournamentScheduleId: match.scheduling.id, gameFinished: false };
    assert(!context.isTournamentDrawRematchAllowed(roomId, room), 'no parallel replay');
    assert(await context.recordTournamentNetworkReplay(replayRoom));
    assert.equal(match.scheduling.attempt, 3);
    assert(await context.recordTournamentNetworkReplay(replayRoom));
    assert.equal(match.scheduling.attempt, 3);
    assert.equal(match.winnerId, null);
    assert(saves >= 6);
    assert.deepEqual(events, ['state', 'state']);
    state.schedulingPolicyVersion = '';
    assert(context.authorizeManagedTournamentJoin({}, 'tourney_qf_0_legacy'));

    const writeMatch = open();
    const writeState = { ...state, schedulingPolicyVersion: core.VERSION, readinessRevision: 4, bracket: { qf: [writeMatch] } };
    const writes = [], notices = [], socketEvents = [];
    let acceptWrite = false;
    const persistence = vm.createContext({
        tournamentState: writeState, tournamentStateInitialized: true, tournamentSchedulingRuntime: null,
        Date: { now: () => at }, crypto: { randomUUID }, MONGO_URI: 'fixture-only',
        mongoose: { connection: { readyState: 1 }, model: () => ({ async updateOne(filter, update, options) {
            assert.equal(writeMatch.scheduling.pending, null, 'Mongo write precedes publication');
            writes.push({ filter, update, options });
            return { matchedCount: acceptWrite ? 1 : 0 };
        } }) },
        createTournamentSchedulingRuntime: options => createTournamentSchedulingRuntime({ ...options, now: () => at }),
        isTournamentMatchInPlay: () => false, isTournamentSchedulingUnlocked: () => true,
        emitTournamentStateUpdate: () => notices.push(writeMatch.scheduling.pending.id),
        queueTournamentPush: () => {}, console: { error() {} }
    });
    vm.runInContext(actual('getTournamentSchedulingRuntime') + '\n' + actual('handleTournamentScheduling'), persistence);
    const client = { emit: (...args) => socketEvents.push(args) };
    const change = action(writeMatch, 'a', { proposedTime: '2026-11-12T21:00' });
    await persistence.handleTournamentScheduling(client, 'propose', change, 'a');
    assert.equal(socketEvents[0][1].reason, 'err_server_conn');
    assert.equal(notices.length, 0);
    assert.equal(writeState.readinessRevision, 4);
    acceptWrite = true;
    await persistence.handleTournamentScheduling(client, 'propose', change, 'a');
    assert.equal(notices.length, 1);
    assert.equal(writeState.readinessRevision, 5);
    const { filter, update, options } = writes[1];
    assert.equal(filter.registrationCycleId, cycleId);
    assert.equal(filter.readinessRevision, 4);
    assert.equal(filter['bracket.qf.0.scheduling.id'], writeMatch.scheduling.id);
    assert.equal(filter['bracket.qf.0.scheduling.revision'], 0);
    assert.equal(options.writeConcern.w, 'majority');
    assert(Object.keys(update.$set).every(key => key === 'readinessRevision' || key.startsWith('bracket.qf.0.')));
    assert(!Object.hasOwn(update.$set, 'bracket.qf.0.winnerId'), 'scheduling never overwrites a result');
}

(async () => {
    businessRules();
    await runtimeRules();
    await serverRules();
    console.log('PASS: round clocks, DST, proposal identity, mutual rescheduling, serialized durable writes, bracket advance, room entry and replays.');
})().catch(error => { console.error(error); process.exitCode = 1; });
