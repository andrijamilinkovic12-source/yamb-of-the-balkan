'use strict';

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createTournamentReadinessStore } = require('../lib/tournament-readiness-store');
const { createTournamentReadinessService } = require('../lib/tournament-readiness');
const core = require('../www/tournamentReadinessCore');
const scheduling = require('../www/tournamentSchedulingCore');
const notices = require('../www/tournamentNotificationsCore');
const audit = require('../lib/tournament-match-audit');

const MAX = 5000000;
const FEE = 5500;
const HOUR = 3600000;
const clone = value => value == null ? value : structuredClone(value);
const valueAt = (document, field) => field.split('.').reduce((value, key) => value?.[key], document);

function match(document, filter) {
    return Object.entries(filter).every(([key, expected]) => {
        if (key === '$or') return expected.some(item => match(document, item));
        if (key === '$expr') {
            const [left, right] = expected.$lt.map(field => valueAt(document, field.slice(1)));
            return left < right;
        }
        const actual = valueAt(document, key);
        if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
            return Object.entries(expected).every(([operator, value]) => {
                if (operator === '$gte') return actual >= value;
                if (operator === '$lte') return actual <= value;
                if (operator === '$lt') return actual < value;
                if (operator === '$in') return value.includes(actual);
                throw new Error('Unsupported test query: ' + operator);
            });
        }
        return expected === null ? actual == null : actual === expected;
    });
}

function harness() {
    let at = Date.parse('2026-11-11T09:00:00+01:00');
    let failSave = false;
    let database = {
        tournamentstates: [{ _id: 'state-document', tournamentNumber: 11, status: 'registration',
            registrationCycleId: randomUUID(), readinessPolicyVersion: core.VERSION, readinessRevision: 0,
            readiness: null, players: [], pushFlags: {}, bracket: { qf: [null, null, null, null], sf: [null, null], f: [null] } }],
        userprofiles: Array.from({ length: 10 }, (_, i) => ({ _id: 'profile-' + i, firebaseUid: 'uid-' + i, balance: 100000 })),
        tournamententries: [], tournamentnotices: [], tournamentmatchaudits: []
    };
    let queue = Promise.resolve();
    const held = new Set();
    let sequence = 0;
    function collection(name) {
        const rows = options => (options?.session?.draft || database)[name];
        function apply(document, update, inserted) {
            Object.assign(document, clone(update.$set || {}));
            if (inserted) Object.assign(document, clone(update.$setOnInsert || {}));
            for (const [key, value] of Object.entries(update.$inc || {})) document[key] = Number(document[key] || 0) + value;
        }
        return {
            async findOne(filter, options) { return clone(rows(options).find(row => match(row, filter)) || null); },
            find(filter) {
                let selected = rows().filter(row => match(row, filter));
                return {
                    sort(sort) {
                        selected.sort((a, b) => {
                            for (const [key, direction] of Object.entries(sort)) {
                                if (a[key] !== b[key]) return (a[key] < b[key] ? -1 : 1) * direction;
                            }
                            return 0;
                        });
                        return this;
                    },
                    limit(count) { selected = selected.slice(0, count); return this; },
                    async toArray() { return clone(selected); }
                };
            },
            async findOneAndUpdate(filter, update, options) {
                assert.equal(options.returnDocument, 'after');
                assert.equal(options.includeResultMetadata, false);
                const row = rows(options).find(item => match(item, filter));
                if (!row) return null;
                apply(row, update, false);
                return clone(row);
            },
            async updateOne(filter, update, options = {}) {
                if (name === 'tournamentstates' && failSave) throw new Error('simulated_state_write_failure');
                let row = rows(options).find(item => match(item, filter));
                let inserted = false;
                if (!row && options.upsert) {
                    row = clone(filter); rows(options).push(row); inserted = true;
                }
                if (!row) return { matchedCount: 0, modifiedCount: 0 };
                const before = JSON.stringify(row);
                apply(row, update, inserted);
                return { matchedCount: inserted ? 0 : 1, modifiedCount: before === JSON.stringify(row) ? 0 : 1,
                    upsertedCount: inserted ? 1 : 0 };
            },
            async updateMany(filter, update, options) {
                rows(options).filter(row => match(row, filter)).forEach(row => apply(row, update, false));
            },
            async insertOne(document, options) {
                assert(!rows(options).some(row => row._id === document._id), 'unique entry ID');
                rows(options).push(clone(document));
            }
        };
    }
    const connection = {
        db: { collection },
        transaction(task, options) {
            assert.equal(options.writeConcern.w, 'majority');
            assert.equal(options.readConcern.level, 'snapshot');
            const run = async () => {
                const session = { draft: clone(database) };
                const result = await task(session);
                database = session.draft;
                return result;
            };
            const result = queue.then(run);
            queue = result.catch(() => {});
            return result;
        }
    };
    let busy = false, blockedUid;
    const store = createTournamentReadinessStore({ connection, maxBalance: MAX, now: () => at, isMatchInPlay: () => busy,
        guardWrite: async uid => {
            if (blockedUid && uid === blockedUid) throw Object.assign(new Error('blocked'), { code: 'account_deleted' });
            const key = ++sequence; held.add(key); return () => held.delete(key);
        } });
    const service = createTournamentReadinessService({ store, entryFee: FEE, now: () => at,
        createId: randomUUID, shuffle: items => items, createMatch: (p1, p2) => ({ p1, p2, winnerId: null }) });
    return {
        store, service, held,
        get data() { return database; }, get state() { return database.tournamentstates[0]; },
        setTime: value => { at = value; }, advance: duration => { at += duration; },
        setBusy: value => { busy = value; }, block: value => { blockedUid = value; },
        setFailSave: value => { failSave = value; },
        balance: index => database.userprofiles[index].balance,
        setBalance: (index, value) => { database.userprofiles[index].balance = value; },
        register(index, extra = {}) {
            return service.execute('register', { uid: 'uid-' + index, cycleId: database.tournamentstates[0].registrationCycleId,
                requestId: 'entry-request-' + index + '-unique', accepted: true, policyVersion: core.VERSION,
                player: { name: 'Player ' + index }, ...extra });
        },
        command(command, index, extra = {}) {
            const state = database.tournamentstates[0];
            return service.execute(command, { uid: 'uid-' + index, cycleId: state.registrationCycleId,
                entryId: state.players.find(player => player.id === 'uid-' + index)?.entryId, ...extra });
        }
    };
}

async function main() {
    const h = harness();
    h.setFailSave(true);
    await assert.rejects(h.register(0), /simulated_state_write_failure/);
    assert.equal(h.balance(0), 100000, 'state failure rolls back real store debit');
    assert.equal(h.data.tournamententries.length, 0, 'state failure rolls back ledger insert');
    assert.equal(h.held.size, 0, 'write guards release after rollback');
    h.setFailSave(false);
    await h.register(0);
    assert.equal(h.balance(0), 100000 - FEE);
    assert.equal(h.state._id, 'state-document', 'state ID is not changed by copied runtime state');
    await h.register(0);
    assert.equal(h.balance(0), 100000 - FEE, 'native store duplicate is not charged twice');
    const entryId = h.state.players[0].entryId;
    h.setFailSave(true);
    await assert.rejects(h.command('withdraw', 0), /simulated_state_write_failure/);
    assert.equal(h.balance(0), 100000 - FEE, 'refund rollback');
    assert.equal(h.state.players.length, 1);
    h.setFailSave(false);
    h.setBalance(0, MAX);
    await h.command('withdraw', 0);
    assert.equal(h.balance(0), MAX, 'balance limit is preserved');
    assert.equal(h.data.tournamententries[0].refundedAmount, 0, 'refund is owed, not truncated');
    h.setBalance(0, MAX - 1000);
    await h.store.settleRefunds();
    assert.equal(h.balance(0), MAX, 'available capacity is refunded');
    assert.equal(h.data.tournamententries[0].refundedAmount, 1000);
    await h.store.settleRefunds();
    assert.equal(h.data.tournamententries[0].refundedAmount, 1000, 'retry cannot duplicate refund');
    h.setBalance(0, MAX - 10000);
    await h.store.settleRefunds();
    assert.equal(h.balance(0), MAX - 5500);
    assert.equal(h.data.tournamententries[0].refundedAmount, FEE, 'entire fee eventually returned');
    const ownNotice = (await h.store.getNotices('uid-0'))[0];
    assert.equal(ownNotice.entryId, entryId);
    assert.equal(ownNotice.recipientUid, 'uid-0', 'client can reject a late notice after switching accounts');
    assert.equal((await h.store.getNotices('uid-1')).length, 0, 'inbox is account-scoped');
    await h.store.acknowledge('uid-1', ownNotice.noticeId);
    assert.equal((await h.store.getNotices('uid-0')).length, 1, 'another account cannot acknowledge a notice');
    await h.store.acknowledge('uid-0', ownNotice.noticeId);
    assert.equal((await h.store.getNotices('uid-0')).length, 0, 'notice acknowledgement persists');

    const n = harness();
    n.setTime(Date.parse('2026-11-11T23:00:00+01:00'));
    for (let i = 0; i < 8; i += 1) await n.register(i);
    assert.equal((await n.store.getNotices('uid-0')).length, 1, 'in-app confirmation available at night');
    const sent = [];
    const send = async (uid, notice) => { sent.push({ uid, notice }); return { sent: 1 }; };
    await n.store.deliver(send);
    assert.equal(sent.length, 0, 'no push at night');
    n.setTime(Date.parse('2026-11-12T09:00:00+01:00'));
    await n.store.deliver(send);
    assert.equal(sent.length, 8, 'morning pushes only to eight participants');
    await n.store.deliver(send);
    assert.equal(sent.length, 8, 'persisted sent flag prevents duplicates');
    await n.command('confirm', 0);
    assert.equal(n.data.tournamententries.find(entry => entry.uid === 'uid-0').readinessConfirmedAt,
        Date.parse('2026-11-12T09:00:00+01:00'), 'personal confirmation timestamp is durably recorded');
    n.advance(3 * HOUR);
    await n.store.deliver(send);
    assert.equal(sent.length, 15, 'halfway reminder only to seven unconfirmed participants');
    assert(!sent.slice(8).some(row => row.uid === 'uid-0'));
    n.advance(2.5 * HOUR);
    await n.store.deliver(send);
    assert.equal(sent.length, 22, 'last-call reminder only to pending participants');
    n.advance(0.5 * HOUR);
    await n.command('tick', 0);
    await n.store.deliver(send);
    assert.equal(n.state.players.length, 1, 'unconfirmed entries refunded and removed');
    assert(sent.slice(22).every(row => row.notice.kind === 'readiness_expired'), 'no stale confirmation push after deadline');
    assert.equal(n.held.size, 0, 'all guards released');

    const catchup = harness();
    for (let i = 0; i < 8; i += 1) await catchup.register(i);
    catchup.advance(5.5 * HOUR);
    const recovered = [];
    await catchup.store.deliver(async (_uid, notice) => { recovered.push(notice); return { sent: 1 }; });
    assert.equal(recovered.length, 8, 'restart catch-up coalesces missed reminders');
    assert(recovered.every(notice => notice.kind === 'readiness_last_call'));
    await catchup.store.deliver(async (_uid, notice) => { recovered.push(notice); return { sent: 1 }; });
    assert.equal(recovered.length, 8, 'older reminder is not delivered after catch-up');

    const m = harness();
    Object.assign(m.state, { status: 'active', schedulingPolicyVersion: scheduling.VERSION, notificationPolicyVersion: notices.VERSION });
    const at = value => Date.parse('2026-11-' + value + ':00+01:00');
    const match = { p1: { id: 'uid-0' }, p2: { id: 'uid-1' } };
    m.state.bracket.qf[0] = match;
    const cycleId = m.state.registrationCycleId;
    scheduling.open(match, 'qf', at('11T09:00'), randomUUID());
    const sync = () => m.store.syncMatchNotices(cycleId);
    const seen = [];
    const sendMatch = async (uid, notice) => { seen.push({ uid, ...notice }); return { sent: 1 }; };
    const opened = await sync();
    assert.equal(opened.length, 2);
    assert(opened.every(notice => notice.kind === 'match_opened' && notice.noticeId.startsWith('tm:')));
    assert.equal((await sync()).length, 0, 'polling and restart use deterministic IDs');
    assert.equal((await m.store.getNotices('uid-2')).length, 0);
    await m.store.acknowledge('uid-2', opened[0].noticeId);
    assert.equal((await m.store.getNotices('uid-0')).length, 1);
    await m.store.acknowledge('uid-0', opened[0].noticeId);
    await m.store.deliver(sendMatch);
    assert.deepEqual(seen.map(n => n.uid), ['uid-1'], 'read in-app notices do not generate a duplicate push');

    const propose = (by, proposedTime, time) => scheduling.apply(match, 'propose', { uid: by,
        scheduleId: match.scheduling.id, revision: match.scheduling.revision, proposedTime }, time, randomUUID);
    const accept = (by, time) => scheduling.apply(match, 'accept', { uid: by, scheduleId: match.scheduling.id,
        revision: match.scheduling.revision, proposalId: match.scheduling.pending.id }, time, randomUUID);
    assert(propose('uid-0', '2026-11-11T22:30', at('11T09:05')).ok);
    m.setTime(at('11T09:05'));
    const proposals = await sync();
    assert.deepEqual(proposals.map(n => n.recipientUid), ['uid-1']);
    assert(propose('uid-1', '2026-11-11T23:00', at('11T09:06')).ok);
    m.setTime(at('11T09:06'));
    assert.equal((await m.store.getNotices('uid-1')).length, 0, 'counteroffer invalidates prior proposal');
    assert(accept('uid-0', at('11T09:06')).ok);
    assert((await sync()).every(n => n.kind === 'match_confirmed'));
    await m.store.deliver(sendMatch);
    assert(!seen.some(n => n.kind === 'match_proposed'), 'superseded notices never push');
    m.setTime(at('11T22:30'));
    assert((await sync()).every(n => n.kind === 'match_reminder_30'));
    m.setBusy(true);
    await m.store.deliver(sendMatch);
    assert(!seen.some(n => n.kind === 'match_reminder_30'), 'no scheduling reminder during the game');
    m.setBusy(false);
    await m.store.deliver(sendMatch);
    assert.equal(seen.filter(n => n.kind === 'match_reminder_30').length, 2, 'night reminder only for the agreed night slot');
    m.setTime(at('11T22:55'));
    m.block('uid-0');
    assert.deepEqual((await sync()).map(n => n.recipientUid), ['uid-1'], 'a blocked account does not block the other player');
    await m.store.deliver(async () => { throw new Error('temporary FCM outage'); });
    await m.store.deliver(sendMatch);
    assert(!seen.some(n => n.kind === 'match_reminder_5'), 'failed push is retried only after backoff');
    m.setTime(at('11T23:00'));
    await m.store.deliver(sendMatch);
    assert(!seen.some(n => n.kind === 'match_reminder_5'), '5-minute reminder expires exactly at the appointment');
    assert.equal(m.held.size, 0);

    const missed = harness();
    const unplayed = { p1: { id: 'uid-0' }, p2: { id: 'uid-1' } };
    Object.assign(missed.state, { status: 'active', schedulingPolicyVersion: scheduling.VERSION, notificationPolicyVersion: notices.VERSION });
    missed.state.bracket.qf[0] = unplayed;
    scheduling.open(unplayed, 'qf', at('11T09:00'), randomUUID());
    missed.setTime(at('11T10:05'));
    const latest = await missed.store.syncMatchNotices(missed.state.registrationCycleId);
    assert.deepEqual(latest.map(n => n.kind), ['match_daily_propose', 'match_daily_propose'], 'restart presents one current action per participant');
    assert.deepEqual((await missed.store.getNotices('uid-0')).map(n => n.kind), ['match_daily_propose']);
    const catchUpPush = [];
    await missed.store.deliver(async (_uid, notice) => { catchUpPush.push(notice.kind); return { sent: 1 }; });
    assert.deepEqual(catchUpPush, ['match_daily_propose', 'match_daily_propose'], 'older opening push is not sent after the daily reminder');

    const audited = harness();
    Object.assign(audited.state, { schedulingPolicyVersion: scheduling.VERSION, auditPolicyVersion: audit.VERSION });
    for (let i = 0; i < 8; i += 1) await audited.register(i);
    for (let i = 0; i < 7; i += 1) await audited.command('confirm', i);
    audited.setFailSave(true);
    await assert.rejects(audited.command('confirm', 7), /simulated_state_write_failure/);
    assert.equal(audited.data.tournamentmatchaudits.length, 0, 'no draw audit without the committed official draw');
    audited.setFailSave(false);
    assert((await audited.command('confirm', 7)).started);
    assert.equal(audited.data.tournamentmatchaudits.length, 4);
    assert(audited.data.tournamentmatchaudits.every(row => row.kind === 'match_opened' && row.participantUids.length === 2));
    console.log('PASS: native-store transaction contract, refund capacity/rollback, private durable inbox, quiet hours, recipient filtering and outbox recovery.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
