'use strict';

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const core = require('../www/tournamentReadinessCore');
const scheduling = require('../www/tournamentSchedulingCore');
const { createTournamentReadinessService } = require('../lib/tournament-readiness');

const FEE = 5500;
const HOUR = 3600000;
const initialTime = Date.parse('2026-11-11T09:00:00+01:00');
let assertions = 0;
function equal(actual, expected, label) { assert.deepEqual(actual, expected, label); assertions += 1; }

function clocks() {
    const cases = [
        ['2026-11-11T09:00:00+01:00', '2026-11-11T15:00:00+01:00'],
        ['2026-11-11T16:00:00+01:00', '2026-11-11T22:00:00+01:00'],
        ['2026-11-11T20:15:00+01:00', '2026-11-12T13:15:00+01:00'],
        ['2026-11-11T22:00:00+01:00', '2026-11-12T15:00:00+01:00'],
        ['2026-11-11T23:35:00+01:00', '2026-11-12T15:00:00+01:00'],
        ['2026-11-11T04:00:00+01:00', '2026-11-11T15:00:00+01:00'],
        ['2027-03-27T20:00:00+01:00', '2027-03-28T13:00:00+02:00'],
        ['2027-10-30T20:00:00+02:00', '2027-10-31T13:00:00+01:00'],
        ['2026-12-31T20:00:00+01:00', '2027-01-01T13:00:00+01:00']
    ];
    for (const [start, expected] of cases) {
        const at = Date.parse(start);
        const deadline = core.addActiveMs(at, core.CONFIRMATION_MS);
        equal(deadline, Date.parse(expected), start);
        equal(core.activeMsBetween(at, deadline), core.CONFIRMATION_MS, 'six active hours');
    }
    equal(core.activeMsBetween(Date.parse('2026-11-11T22:00:00+01:00'), Date.parse('2026-11-12T09:00:00+01:00')), 0, 'night is paused');
    assert.throws(() => core.addActiveMs(NaN, 100));
    assert.throws(() => core.addActiveMs(initialTime, -1));
    equal(core.isManaged({ status: 'active', tournamentNumber: 10 }), false, 'existing tournament is legacy');
}

function harness({ legacy = false } = {}) {
    let at = initialTime;
    let database = {
        state: { status: 'registration', tournamentNumber: 11, players: [], pushFlags: {},
            bracket: { qf: [null, null, null, null], sf: [null, null], f: [null] },
            readinessPolicyVersion: legacy ? '' : core.VERSION, registrationCycleId: randomUUID(),
            schedulingPolicyVersion: legacy ? '' : scheduling.VERSION, readinessRevision: 0, readiness: null },
        profiles: Array.from({ length: 12 }, (_, index) => ({ firebaseUid: 'player-' + index, balance: 100000 })),
        entries: [], notices: []
    };
    let queue = Promise.resolve();
    let failSave = false;
    const store = {
        transaction(task) {
            const run = async () => {
                const draft = structuredClone(database);
                let loadedCycle;
                const result = await task({
                    async loadState(cycleId) {
                        loadedCycle = cycleId;
                        return draft.state.registrationCycleId === cycleId ? draft.state : null;
                    },
                    async saveState() {
                        if (failSave) throw new Error('simulated_database_failure');
                        draft.state.readinessRevision += 1;
                    },
                    async findEntry(uid, requestId) {
                        return draft.entries.find(entry => entry.cycleId === loadedCycle && entry.uid === uid && entry.requestId === requestId);
                    },
                    async charge(uid, amount) {
                        const user = draft.profiles.find(profile => profile.firebaseUid === uid && profile.balance >= amount);
                        if (user) user.balance -= amount;
                        return user || null;
                    },
                    async createEntry(entry) { draft.entries.push(entry); },
                    async refund(entryId, reason) {
                        const entry = draft.entries.find(item => item.entryId === entryId);
                        if (!entry) throw new Error('missing_entry');
                        const user = draft.profiles.find(profile => profile.firebaseUid === entry.uid);
                        user.balance += entry.amount - entry.refundedAmount;
                        entry.refundedAmount = entry.amount;
                        entry.status = 'refunded';
                        entry.refundReason = reason;
                        return { user, pending: 0 };
                    },
                    async startEntry(entryId) { draft.entries.find(entry => entry.entryId === entryId).status = 'started'; },
                    async requestConfirmation(entryId, time, deadline) {
                        Object.assign(draft.entries.find(entry => entry.entryId === entryId), {
                            readinessRequestedAt: time, readinessDeadlineAt: deadline
                        });
                    },
                    async confirmEntry(entryId, time) {
                        draft.entries.find(entry => entry.entryId === entryId).readinessConfirmedAt = time;
                    },
                    async notice(notice) {
                        if (!draft.notices.some(item => item.noticeId === notice.noticeId)) draft.notices.push(notice);
                    }
                });
                database = draft;
                return structuredClone(result);
            };
            const operation = queue.then(run);
            queue = operation.catch(() => {});
            return operation;
        }
    };
    const service = () => createTournamentReadinessService({ store, createId: randomUUID,
        createMatch: (p1, p2) => ({ p1, p2, winnerId: null }),
        shuffle: players => players, entryFee: FEE, now: () => at });
    let runtime = service();
    const player = index => database.state.players.find(item => item.id === 'player-' + index);
    const payload = (index, extra = {}) => ({ uid: 'player-' + index, cycleId: database.state.registrationCycleId,
        entryId: player(index)?.entryId, ...extra });
    return {
        get state() { return database.state; }, get entries() { return database.entries; },
        get notices() { return database.notices; }, get at() { return at; },
        advance: duration => { at += duration; }, setTime: value => { at = value; },
        setFailSave: value => { failSave = value; },
        restart: () => { runtime = service(); },
        player,
        balance: index => database.profiles.find(user => user.firebaseUid === 'player-' + index).balance,
        setBalance: (index, value) => { database.profiles.find(user => user.firebaseUid === 'player-' + index).balance = value; },
        register(index, extra = {}) {
            return runtime.execute('register', payload(index, { requestId: 'registration-request-' + index,
                accepted: true, policyVersion: core.VERSION, player: { name: 'Player ' + index }, ...extra }));
        },
        confirm: (index, extra) => runtime.execute('confirm', payload(index, extra)),
        withdraw: (index, extra) => runtime.execute('withdraw', payload(index, extra)),
        tick: () => runtime.execute('tick', { cycleId: database.state.registrationCycleId })
    };
}

async function fill(h) {
    for (let index = 0; index < 8; index += 1) equal((await h.register(index)).ok, true, 'registration');
}

async function run() {
    clocks();
    const legacy = harness({ legacy: true });
    equal((await legacy.register(0)).ok, false, 'no retroactive readiness');
    equal(legacy.balance(0), 100000, 'legacy was not charged');

    const h = harness();
    equal((await h.register(0, { accepted: false })).ok, false, 'explicit acceptance required');
    equal((await h.register(0, { policyVersion: 'old' })).ok, false, 'old client rejected');
    equal((await h.register(0, { cycleId: { $ne: null } })).ok, false, 'no query injection');
    equal((await h.register(0, { requestId: '' })).ok, false, 'idempotency token required');
    equal(h.balance(0), 100000, 'rejections never charge');
    await fill(h);
    equal(h.state.status, 'confirmation', 'eighth registration does not start tournament');
    equal(h.state.bracket.qf, [null, null, null, null], 'no draw before confirmations');
    equal(h.notices.length, 24, 'three durable reminders per participant');
    equal(h.notices[1].dueAt, initialTime + 3 * HOUR, 'halfway reminder');
    equal(h.notices[2].dueAt, initialTime + 5.5 * HOUR, 'last half-hour reminder');
    equal((await h.register(8)).ok, false, 'ninth registration refused');
    equal(h.balance(8), 100000, 'ninth player never charged');
    for (let index = 0; index < 7; index += 1) equal((await h.confirm(index)).ok, true, 'participant can confirm');
    equal(h.state.status, 'confirmation', 'seven confirmations are insufficient');
    const duplicate = await Promise.all(Array.from({ length: 12 }, () => h.confirm(0)));
    equal(duplicate.every(result => result.ok), true, 'confirmation retries are idempotent');
    equal(core.countReady(h.state), 7, 'no duplicate confirmations');
    equal((await h.confirm(8, { entryId: h.player(7).entryId })).ok, false, 'cannot confirm for another account');
    equal((await h.confirm(7)).started, true, 'eighth confirmation starts the bracket');
    equal(h.state.status, 'active', 'tournament started');
    equal(h.state.bracket.qf.length, 4, 'four quarterfinals');
    equal(h.state.bracket.qf.map(match => match.scheduling.openedAt), Array(4).fill(h.at), 'quarterfinal clocks start on official draw');
    equal(new Set(h.state.bracket.qf.map(match => match.scheduling.id)).size, 4, 'each match has its own scheduling identity');
    equal(h.entries.every(entry => entry.status === 'started'), true, 'all eight fees are retained for the started tournament');
    equal((await h.withdraw(0)).ok, false, 'no refund after start');
    equal(h.balance(0), 100000 - FEE, 'confirmation never costs another entry fee');

    const replaced = harness();
    await fill(replaced);
    for (let index = 0; index < 7; index += 1) await replaced.confirm(index);
    const original = structuredClone(replaced.player(0));
    replaced.advance(6 * HOUR);
    equal((await replaced.confirm(7)).ok, false, 'exact-deadline confirmation is late');
    equal(replaced.balance(7), 100000, 'expired player receives full refund');
    equal(replaced.state.players.length, 7, 'only expired player removed');
    equal(replaced.player(0), original, 'other confirmations and deadlines are preserved');
    equal((await replaced.register(8)).ok, true, 'replacement admitted with full six-hour window');
    equal((await replaced.confirm(8)).started, true, 'replacement confirmation unlocks play');

    const retry = harness();
    const attempts = await Promise.all(Array.from({ length: 10 }, () => retry.register(0)));
    equal(attempts.every(result => result.ok), true, 'same registration is retryable');
    equal(retry.balance(0), 100000 - FEE, 'duplicate registration only charges once');
    const oldEntry = retry.player(0).entryId;
    await retry.withdraw(0);
    await retry.withdraw(0, { entryId: oldEntry });
    equal(retry.balance(0), 100000, 'duplicate withdrawal only refunds once');
    equal((await retry.register(0)).ok, false, 'old request cannot resurrect refunded entry');
    equal((await retry.register(0, { requestId: 'second-registration-request' })).ok, true, 'new voluntary entry allowed');
    equal((await retry.withdraw(0, { entryId: oldEntry })).ok, false, 'delayed old withdrawal cannot remove new entry');
    equal(retry.balance(0), 100000 - FEE, 'new entry is not refunded by stale requests');

    const cancelled = harness();
    await fill(cancelled);
    for (let index = 0; index < 7; index += 1) await cancelled.confirm(index);
    const oldCycle = cancelled.state.registrationCycleId;
    cancelled.advance(24 * HOUR);
    cancelled.restart();
    equal((await cancelled.tick()).cancelled, true, 'hard 24-hour limit survives restart');
    equal(cancelled.state.status, 'registration', 'registration reopens');
    equal(cancelled.state.tournamentNumber, 11, 'no fictitious completed edition');
    equal(cancelled.state.players, [], 'all slots released');
    for (let index = 0; index < 8; index += 1) equal(cancelled.balance(index), 100000, 'all players refunded');
    equal((await cancelled.register(0, { cycleId: oldCycle })).ok, false, 'old cycle cannot join reopened registration');
    await cancelled.tick();
    equal(cancelled.balance(0), 100000, 'restart recovery does not double refund');

    const night = harness();
    night.setTime(Date.parse('2026-11-11T23:00:00+01:00'));
    await fill(night);
    const deadline = Date.parse('2026-11-12T15:00:00+01:00');
    equal(night.player(0).readyDeadlineAt, deadline, 'night registration receives six daytime hours');
    equal(night.notices[0].dueAt, Date.parse('2026-11-12T09:00:00+01:00'), 'push deferred until morning');
    night.advance(10 * HOUR);
    night.restart();
    await night.tick();
    equal(night.state.players.length, 8, 'morning restart does not expire nighttime confirmation');
    equal(night.player(0).readyDeadlineAt, deadline, 'restart does not reset deadline');

    const lateReplacement = harness();
    await fill(lateReplacement);
    for (let index = 0; index < 7; index += 1) await lateReplacement.confirm(index);
    lateReplacement.advance(23 * HOUR);
    await lateReplacement.tick();
    equal((await lateReplacement.register(8)).ok, false, 'no shortened confirmation window for replacements');
    equal(lateReplacement.balance(8), 100000, 'replacement rejected before charge');

    const failure = harness();
    failure.setFailSave(true);
    await assert.rejects(failure.register(0), /simulated_database_failure/);
    equal(failure.balance(0), 100000, 'failed state save rolls back debit');
    equal(failure.entries.length, 0, 'failed transaction leaves no entry ledger');
    failure.setFailSave(false);
    await failure.register(0);
    failure.setFailSave(true);
    await assert.rejects(failure.withdraw(0), /simulated_database_failure/);
    equal(failure.balance(0), 100000 - FEE, 'failed withdrawal rolls back refund');
    equal(failure.state.players.length, 1, 'failed withdrawal preserves entry');
    failure.setFailSave(false);
    await failure.withdraw(0);
    equal(failure.balance(0), 100000, 'safe retry after transaction failure');

    const race = harness();
    const racers = await Promise.all(Array.from({ length: 12 }, (_, index) => race.register(index)));
    equal(racers.filter(result => result.ok).length, 8, 'concurrent registrations cannot overfill');
    equal(race.entries.length, 8, 'only eight payments');
    console.log('PASS: ' + assertions + ' readiness assertions (night/DST, consent, eight confirmations, replacements, retries, rollback, restart, legacy isolation).');
}

run().catch(error => { console.error(error); process.exitCode = 1; });
