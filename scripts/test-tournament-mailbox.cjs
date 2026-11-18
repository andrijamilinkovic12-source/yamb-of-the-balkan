'use strict';
// Synthetic fixtures and an optional disposable loopback DB; no .env or live accounts.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const scheduling = require('../www/tournamentSchedulingCore');
const notifications = require('../www/tournamentNotificationsCore');
const clock = require('../www/tournamentReadinessCore');
const copy = require('../www/tournamentMailCore').copy;
const { publicCandidates, privateCandidate, matchSummary, createTournamentMailbox } = require('../lib/tournament-mailbox');
const { createTournamentReadinessStore } = require('../lib/tournament-readiness-store');
const { createMailboxStore, mailboxEntrySchema } = require('../lib/player-mailbox-store');
const { tournamentChampionNotice } = require('../lib/mailbox-champions');
const at = Date.parse('2026-11-17T10:00:00Z');
function fixture() {
    const players = Array.from({ length: 8 }, (_, i) => ({ id: 'p' + i, name: `Player ${i}` }));
    const qf = Array.from({ length: 4 }, (_, i) => {
        const match = { p1: players[i * 2], p2: players[i * 2 + 1], winnerId: null };
        scheduling.open(match, 'qf', at, randomUUID()); return match;
    });
    return { tournamentNumber: 12, registrationCycleId: randomUUID(), status: 'active', players,
        readinessPolicyVersion: clock.VERSION, schedulingPolicyVersion: scheduling.VERSION,
        notificationPolicyVersion: notifications.VERSION, bracket: { qf, sf: [null, null], f: [null] } };
}
function pure() {
    const state = fixture();
    assert.deepEqual(publicCandidates(state, at).map(row => row.tournamentEvent.kind), ['started']);
    const outcomes = ['regular', 'technical', 'double_dq', 'bye'];
    state.bracket.qf.forEach((match, i) => {
        if (i < 2) Object.assign(match, { winnerId: match.p1.id, resultType: outcomes[i], scoreLabel: i ? '1-0 TP' : '1200-1100' });
        else match.review = { kind: outcomes[i] };
        if (i === 3) match.winnerId = match.p1.id;
    });
    const summary = publicCandidates(state, at)[0];
    assert.equal(summary.tournamentEvent.kind, 'round_complete');
    assert.deepEqual(summary.tournamentEvent.matches.map(m => m.outcome), outcomes);
    assert.equal(summary.tournamentEvent.matches[1].score, '', 'No fake dice score for a technical decision');
    assert.equal(matchSummary({ p1: { id: 'deleted_uid', name: 'Old name' }, p2: state.players[0], review: { kind: 'void' } }).p1, '');
    const final = { p1: state.players[0], p2: state.players[2], winnerId: null };
    scheduling.open(final, 'f', at, randomUUID());
    final.scheduling.accepted = { id: 'accepted-a', at: at + 3600000, acceptedAt: at };
    state.bracket.f[0] = final;
    const first = publicCandidates(state, at).find(row => row.tournamentEvent.kind === 'final_scheduled');
    final.scheduling.accepted = { id: 'accepted-b', at: at + 7200000, acceptedAt: at };
    const previous = JSON.stringify(['accepted-a', at + 3600000]);
    const changed = publicCandidates(state, at, previous).find(row => row.tournamentEvent.kind === 'final_rescheduled');
    const repeated = publicCandidates(state, at, JSON.stringify(['accepted-b', at + 7200000])).find(row => row.tournamentEvent.kind === 'final_scheduled');
    assert.notEqual(first.id, changed.id); assert.equal(changed.id, repeated.id, 'A changed final time cannot create a second announcement next tick');
    delete final.scheduling.accepted; final.scheduling.pending = { at: at + 9000000 };
    assert.ok(!publicCandidates(state, at).some(row => row.tournamentEvent.kind.startsWith('final_')), 'A proposal is never a confirmed public time');
    state.status = 'finished'; final.review = { kind: 'void' };
    assert.ok(publicCandidates(state, at).some(row => row.tournamentEvent.kind === 'finished_without_winner'));
    const notice = { _id: 'source', uid: 'p0', cycleId: state.registrationCycleId, tournamentNumber: 12, kind: 'match_result',
        round: 'qf', index: 0, resultType: 'regular', scoreLabel: '1200-1100', won: true, createdAt: at };
    const own = privateCandidate(notice, state);
    assert.equal(own.tournamentEvent.opponent, 'Player 1');
    assert.ok(!JSON.stringify(own.tournamentEvent).includes('p0'));
    assert.equal(privateCandidate({ ...notice, uid: 'deleted_uid' }, state), null);
    state.bracket.qf[0].review = { kind: 'technical' };
    assert.equal(privateCandidate(notice, state), null, 'Keep the existing reasoned adjudication mail');
    for (const language of ['sr', 'en']) {
        const text = copy(summary.tournamentEvent, language);
        assert.match(text.body, /1200-1100/); assert.doesNotMatch(text.body, /1-0/);
        assert.match(copy(changed.tournamentEvent, language).body, /13:00/);
        for (const round of ['qf', 'sf', 'f']) for (const won of [true, false]) {
            const message = copy({ ...own.tournamentEvent, round, won }, language);
            assert.match(message.title, language === 'sr' ? (won ? /Pobeda/ : /Poraz/) : (won ? /Victory/ : /Defeat/));
            assert.doesNotMatch(message.body, /Invalid Date|undefined|\{\w+\}/);
        }
        const technical = copy({ ...own.tournamentEvent, resultType: 'technical', score: '1-0' }, language);
        assert.doesNotMatch(technical.body, /1-0/);
        for (const kind of ['registration_confirmed', 'readiness_confirmed', 'readiness_requested', 'readiness_halfway', 'readiness_last_call',
            'readiness_withdrawn', 'readiness_expired', 'readiness_cancelled', 'reliability_warning', 'reliability_suspension', 'match_bye',
            'match_opened', 'match_proposed', 'match_confirmed', 'match_reminder_30', 'match_reminder_5', 'match_deadline',
            'match_replay_draw', 'match_replay_network', 'match_replay_server', 'cancelled', 'finished_without_winner']) {
            const text = copy({ tournamentNumber: 12, kind, round: 'sf', scheduledAt: at + 3600000, deadlineAt: at + 86400000,
                replyDueAt: at + 1800000, blockedEdition: 13, amount: 5000, refundPending: 500 }, language);
            assert.ok(text?.title && text.body, kind + '/' + language);
            assert.doesNotMatch(text.title + text.body, /Invalid Date|undefined|\{\w+\}/);
        }
    }
    const champion = tournamentChampionNotice({ tournamentNumber: 12, winnerId: 'p0', winnerName: 'Player 0',
        runnerUpName: 'Player 2', wonAt: new Date(at), resultType: 'technical', scoreLabel: '1-0 TP' });
    assert.equal(champion.champion.finalScore, ''); assert.equal(champion.champion.runnerUpName, 'Player 2');
    console.log('Tournament mail policy: audience, round outcomes, confirmed/changed final, replay-safe identities, deleted names and SR/EN passed.');
}
async function database() {
    const port = Number(process.env.YAMB_CHAT_TEST_MONGO_PORT);
    assert(Number.isInteger(port) && port > 1024 && port < 65536);
    const conn = mongoose.createConnection(`mongodb://127.0.0.1:${port}/?directConnection=true`, {
        dbName: 'yamb_tournament_mailbox_qa_' + randomUUID().replaceAll('-', ''), serverSelectionTimeoutMS: 4000 });
    try {
        await conn.asPromise();
        const hello = await conn.db.admin().command({ hello: 1 });
        assert(hello.isWritablePrimary && hello.setName === 'yamb-test-chat');
        const profiles = conn.model('UserProfile', new mongoose.Schema({ firebaseUid: String, balance: Number,
            playerMailbox: [mongoose.Schema.Types.Mixed], readMailboxGameNotices: [String] }));
        const entries = conn.model('PlayerMailboxEntry', mailboxEntrySchema(mongoose));
        const notices = conn.model('PlayerGameNotice', new mongoose.Schema({ _id: String, createdAt: Number }, { strict: false }));
        await Promise.all([profiles.init(), entries.init(), notices.init()]);
        let now = at, state = fixture(), fail = false, failReceipt = false;
        await profiles.create([...state.players, { id: 'outsider' }].map(p => ({ firebaseUid: p.id, balance: 7777 })));
        const tables = new Map();
        for (const name of ['tournamentstates', 'tournamentnotices', 'tournamententries', 'tournamentmatchaudits', 'tournamentmailboxstate', 'playermailboxentries', 'playergamenotices', 'userprofiles']) tables.set(name, conn.db.collection(name));
        const delivery = tables.get('playermailboxentries'), write = delivery.updateOne.bind(delivery);
        delivery.updateOne = async (...args) => { if (fail) { fail = false; throw Error('qa_write_failed'); } return write(...args); };
        const sourceNotices = tables.get('tournamentnotices'), receiptWrite = sourceNotices.updateOne.bind(sourceNotices);
        sourceNotices.updateOne = async (...args) => {
            if (failReceipt && args[1].$set?.mailboxHandledAt) { failReceipt = false; throw Error('qa_receipt_failed'); }
            return receiptWrite(...args);
        };
        const connection = { db: { collection: name => tables.get(name) } };
        const persist = async () => tables.get('tournamentstates').replaceOne({}, structuredClone(state), { upsert: true });
        await persist();
        const readiness = createTournamentReadinessStore({ connection: conn, now: () => now, getRuntimeState: () => state });
        const refresh = [], broadcasts = [];
        const options = { connection, currentNotice: row => readiness.currentNotice(row), now: () => now,
            notify: uid => refresh.push(uid), changed: () => broadcasts.push(1) };
        let service = createTournamentMailbox(options);
        await readiness.syncMatchNotices(state.registrationCycleId); await service.sync();
        const box = createMailboxStore({ profiles, entries, notices, systemNotices: [] });
        assert.equal((await box.get('outsider')).messages.length, 1, 'Everyone gets the start announcement');
        assert.equal(await entries.countDocuments({}), 8, 'Only the eight paired entrants get their match notice');
        await service.sync(); service = createTournamentMailbox(options); await service.sync();
        assert.equal(await entries.countDocuments({}), 8); assert.equal(await notices.countDocuments({}), 1);
        const match = state.bracket.qf[0];
        Object.assign(match, { winnerId: 'p0', resultType: 'regular', resultRecordedAt: ++now, scoreLabel: '1200-1100' });
        await persist(); await readiness.syncMatchNotices(state.registrationCycleId);
        fail = true; await assert.rejects(service.sync(), /qa_write_failed/);
        failReceipt = true; await assert.rejects(service.sync(), /qa_receipt_failed/);
        await Promise.all([service.sync(), createTournamentMailbox(options).sync()]);
        const resultRows = await entries.find({ 'message.tournamentEvent.kind': 'match_result' }).lean();
        assert.deepEqual(resultRows.map(row => row.recipientUid).sort(), ['p0', 'p1']);
        assert.equal(resultRows.find(row => row.recipientUid === 'p0').message.tournamentEvent.won, true);
        assert.equal(resultRows.find(row => row.recipientUid === 'p1').message.tournamentEvent.won, false);
        assert.equal((await box.get('outsider')).messages.length, 1);
        await box.mutate('p0', [resultRows.find(row => row.recipientUid === 'p0').id], 'delete');
        await createTournamentMailbox(options).sync();
        assert.equal((await box.get('p0')).messages.some(row => row.tournamentEvent?.kind === 'match_result'), false);
        for (const m of state.bracket.qf) if (!m.winnerId) { m.winnerId = m.p1.id; m.resultType = 'technical'; m.scoreLabel = '1-0 TP'; }
        await persist(); await service.sync();
        assert.equal(await notices.countDocuments({ 'tournamentEvent.kind': 'round_complete' }), 1);
        const final = { p1: state.players[0], p2: state.players[2], winnerId: null };
        scheduling.open(final, 'f', now, randomUUID()); state.bracket.f[0] = final;
        final.scheduling.pending = { id: 'a', by: 'p0', at: now + 3600000, createdAt: now, replyDueAt: now + 900000 };
        await persist(); await service.sync();
        assert.equal(await notices.countDocuments({ 'tournamentEvent.kind': 'final_scheduled' }), 0);
        final.scheduling.accepted = { ...final.scheduling.pending, acceptedBy: 'p2', acceptedAt: now }; final.scheduling.pending = null;
        await persist(); await service.sync();
        final.scheduling.accepted = { ...final.scheduling.accepted, id: 'b', at: now + 7200000 };
        await persist(); await service.sync(); await createTournamentMailbox(options).sync();
        assert.equal(await notices.countDocuments({ 'tournamentEvent.kind': 'final_scheduled' }), 1);
        assert.equal(await notices.countDocuments({ 'tournamentEvent.kind': 'final_rescheduled' }), 1);
        const publicBox = await box.get('outsider');
        assert.ok(publicBox.messages.every(row => !row.tournamentEvent?.opponent && !row.tournamentEvent?.won));
        await tables.get('tournamententries').insertOne({ _id: 'entry', uid: 'p3', tournamentNumber: 12, chargedAt: ++now });
        await service.sync();
        await tables.get('tournamententries').updateOne({ _id: 'entry' }, { $set: { readinessConfirmedAt: ++now } });
        await service.sync();
        assert.equal(await entries.countDocuments({ recipientUid: 'p3', 'message.tournamentEvent.kind': 'registration_confirmed' }), 1);
        assert.equal(await entries.countDocuments({ recipientUid: 'p3', 'message.tournamentEvent.kind': 'readiness_confirmed' }), 1);
        await tables.get('tournamentnotices').insertOne({ _id: 'old-technical', uid: 'p0', kind: 'match_result', resultType: 'technical',
            cycleId: 'old-cycle', scheduleId: 'old-schedule', tournamentNumber: 11, round: 'qf', index: 0, createdAt: ++now, dueAt: now });
        await tables.get('tournamentmatchaudits').insertOne({ cycleId: 'old-cycle', scheduleId: 'old-schedule', kind: 'adjudication_technical' });
        await service.sync();
        assert.equal(await entries.countDocuments({ 'message.tournamentEvent.resultType': 'technical' }), 0, 'Adjudication already has its reasoned private mail after a cycle change too');
        state.bracket.sf[0] = { p1: state.players[0], p2: null, winnerId: 'p0', review: { kind: 'bye', at: ++now } };
        await persist(); await service.sync(); await service.sync();
        assert.equal(await entries.countDocuments({ recipientUid: 'p0', 'message.tournamentEvent.kind': 'match_bye' }), 1);
        for (const uid of ['p4', 'p5']) await sourceNotices.insertOne({ _id: 'cancel-' + uid, uid, kind: 'readiness_cancelled',
            cycleId: 'cancelled-cycle', tournamentNumber: 12, createdAt: now, dueAt: now, amount: 5500, refundPending: 500 });
        await service.sync();
        assert.equal(await notices.countDocuments({ 'tournamentEvent.kind': 'cancelled' }), 1);
        assert.equal(await entries.countDocuments({ 'message.tournamentEvent.kind': 'readiness_cancelled' }), 2);
        assert.equal((await entries.findOne({ recipientUid: 'p4', 'message.tournamentEvent.kind': 'readiness_cancelled' })).message.tournamentEvent.amount, 5000);
        state.status = 'finished'; final.review = { kind: 'double_dq' }; await persist(); await service.sync();
        assert.equal(await notices.countDocuments({ 'tournamentEvent.kind': 'finished_without_winner' }), 1);
        assert.ok((await profiles.find().lean()).every(p => p.balance === 7777));
        assert.deepEqual(await tables.get('tournamentstates').findOne({}, { projection: { _id: 0 } }), state, 'Notifications never change the tournament');
        state = fixture(); state.tournamentNumber = 13; state.registrationCycleId = '';
        delete state.schedulingPolicyVersion;
        for (const m of state.bracket.qf) delete m.scheduling;
        state.bracket.qf[1].winnerId = 'p2'; state.bracket.qf[1].resultType = 'regular'; state.bracket.qf[1].scoreLabel = '1400-1300';
        const beforeLegacy = await entries.countDocuments({ 'message.tournamentEvent.kind': 'match_result' });
        await persist(); await service.sync();
        assert.equal(await entries.countDocuments({ 'message.tournamentEvent.kind': 'match_result' }), beforeLegacy, 'Legacy history is not resent on activation');
        Object.assign(state.bracket.qf[0], { winnerId: 'p1', resultType: 'regular', scoreLabel: '1200-1300' });
        await persist(); await service.sync(); await createTournamentMailbox(options).sync();
        assert.equal(await entries.countDocuments({ 'message.tournamentEvent.tournamentNumber': 13,
            'message.tournamentEvent.kind': 'match_result' }), 2, 'A new legacy result reaches both actual players once');
        const marker = await tables.get('tournamentmailboxstate').findOne({ observed: { $exists: true } });
        assert.ok(Object.values(marker.observed).every(value => /^[a-f0-9]{64}$/.test(value)), 'Control metadata stores hashes, not player identities');
        console.log('Tournament mailbox DB: private recipients, public summaries, failed-write retry, restart, deleted mail, final changes, receipts and unchanged balances/state passed.');
    } finally { if (conn.readyState === 1) await conn.dropDatabase(); await conn.close(); }
}
(async () => { pure(); if (process.env.YAMB_CHAT_TEST_MONGO_PORT) await database(); })().catch(error => { console.error(error); process.exitCode = 1; });
