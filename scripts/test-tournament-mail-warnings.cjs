'use strict';
// Pure policy checks plus optional disposable loopback MongoDB persistence QA.
// Never loads .env, sends push notifications or contacts real players.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const clock = require('../www/tournamentReadinessCore');
const scheduling = require('../www/tournamentSchedulingCore');
const notifications = require('../www/tournamentNotificationsCore');
const { collectWarnings, createTournamentMailWarnings } = require('../lib/tournament-mail-warnings');
const { createMailboxStore, mailboxEntrySchema } = require('../lib/player-mailbox-store');
const time = value => scheduling.parseTime(value);
const noon = time('2026-11-11T13:00');

function fixture(round = 'qf', start = time('2026-11-11T09:00')) {
    const match = { p1: { id: 'a', name: 'Player A' }, p2: { id: 'b', name: 'Player B' } };
    scheduling.open(match, round, start, randomUUID());
    const state = { status: 'active', tournamentNumber: 11, registrationCycleId: randomUUID(),
        readinessPolicyVersion: clock.VERSION, schedulingPolicyVersion: scheduling.VERSION,
        notificationPolicyVersion: notifications.VERSION, players: [match.p1, match.p2], bracket: { [round]: [match] } };
    const apply = (command, uid, at, proposedTime) => {
        const s = match.scheduling;
        assert.equal(scheduling.apply(match, command, { uid, scheduleId: s.id, revision: s.revision,
            proposalId: s.pending?.id, proposedTime }, at, randomUUID).ok, true);
    };
    return { state, match, apply };
}
function pure() {
    for (const [round, half, due] of [['qf', '13:00', '17:00'], ['sf', '12:00', '15:00'], ['f', '11:00', '13:00']]) {
        const f = fixture(round);
        const first = time('2026-11-11T' + half), deadline = time('2026-11-11T' + due);
        assert.equal(collectWarnings(f.state, first - 1).length, 0);
        const rows = collectWarnings(f.state, first);
        assert.equal(rows.length, 2);
        assert.ok(rows.every(row => row.message.tournamentWarning.stage === 'schedule_halfway'));
        assert.ok(rows.every(row => row.message.tournamentWarning.actionDeadlineAt === deadline));
        assert.ok(collectWarnings(f.state, deadline).every(row => row.message.tournamentWarning.stage === 'schedule_overdue'));
        assert.deepEqual(collectWarnings(f.state, first).map(row => row.message.id), rows.map(row => row.message.id));
    }
    const f = fixture();
    assert.equal(collectWarnings({ ...f.state, tournamentNumber: 10 }, noon).length, 0);
    for (const status of ['registration', 'confirmation', 'finished']) assert.equal(collectWarnings({ ...f.state, status }, noon).length, 0);
    assert.equal(collectWarnings({ ...f.state, schedulingPolicyVersion: '' }, noon).length, 0);
    assert.equal(collectWarnings(f.state, noon, () => true).length, 0, 'Live matches and pending authorized starts are protected');
    const modified = structuredClone(f.state);
    modified.players.pop();
    assert.equal(collectWarnings(modified, noon).length, 0, 'Both recipients must be actual entrants');
    for (const kind of ['void', 'double_dq', 'empty']) {
        f.match.review = { kind };
        assert.equal(collectWarnings(f.state, noon).length, 0);
    }
    delete f.match.review;
    f.match.winnerId = 'a';
    assert.equal(collectWarnings(f.state, noon).length, 0);
    delete f.match.winnerId;
    f.match.p2.id = 'deleted_fixture';
    assert.equal(collectWarnings(f.state, noon).length, 0);

    const pending = fixture();
    pending.apply('propose', 'a', time('2026-11-11T09:00'), '2026-11-12T11:00');
    assert.equal(collectWarnings(pending.state, noon - 1).length, 0);
    let rows = collectWarnings(pending.state, noon);
    assert.deepEqual(rows.map(row => row.uid), ['b'], 'Only the player owing a reply is reminded');
    assert.equal(rows[0].message.tournamentWarning.stage, 'reply_halfway');
    const originalId = rows[0].message.id;
    pending.apply('propose', 'a', time('2026-11-11T10:00'), '2026-11-12T12:00');
    assert.equal(collectWarnings(pending.state, noon)[0].message.id, originalId, 'Replacing a proposal cannot spam the same reply clock');
    assert.equal(collectWarnings(pending.state, time('2026-11-11T17:00'))[0].message.tournamentWarning.stage, 'reply_overdue');
    pending.apply('accept', 'b', time('2026-11-11T13:01'));
    assert.equal(collectWarnings(pending.state, time('2026-11-11T14:00')).length, 0, 'A future agreed time is respected');

    const late = fixture();
    late.apply('propose', 'a', time('2026-11-11T09:00'), '2026-11-11T09:30');
    late.apply('accept', 'b', time('2026-11-11T09:01'));
    assert.equal(collectWarnings(late.state, time('2026-11-11T09:44')).length, 0);
    assert.ok(collectWarnings(late.state, time('2026-11-11T09:45')).every(row => row.message.tournamentWarning.stage === 'appointment_missed'));
    const ordinary = fixture();
    assert.ok(collectWarnings(ordinary.state, time('2026-11-12T16:00')).every(row => row.message.tournamentWarning.stage === 'deadline_six_hours'));
    rows = collectWarnings(ordinary.state, time('2026-11-12T21:00'));
    assert.equal(rows.length, 2);
    assert.ok(rows.every(row => row.message.tournamentWarning.stage === 'deadline_last_hour'));
    assert.equal(collectWarnings(ordinary.state, time('2026-11-12T23:00')).length, 0);
    assert.equal(collectWarnings(ordinary.state, ordinary.match.scheduling.deadlineAt).length, 0);

    const priorIds = collectWarnings(late.state, time('2026-11-11T09:45')).map(row => row.message.id);
    const extendedAt = time('2026-11-13T09:00');
    late.match.scheduling.reviewExtendedAt = extendedAt;
    late.match.scheduling.deadlineAt = time('2026-11-14T09:00');
    late.match.scheduling.firstProposalDueAt = time('2026-11-13T17:00');
    late.match.review = { kind: 'extension' };
    rows = collectWarnings(late.state, time('2026-11-13T13:00'));
    assert.ok(rows.length === 2 && rows.every(row => row.message.tournamentWarning.stage === 'schedule_halfway'));
    assert.ok(rows.every(row => !priorIds.includes(row.message.id)), 'Extensions do not resurrect an old missed appointment');
    const replay = fixture();
    const beforeReplay = collectWarnings(replay.state, noon).map(row => row.message.id);
    scheduling.open(replay.match, 'qf', time('2026-11-12T09:00'), randomUUID());
    assert.ok(collectWarnings(replay.state, time('2026-11-12T13:00')).every(row => !beforeReplay.includes(row.message.id)));
    const dst = fixture('qf', time('2026-10-24T21:00'));
    rows = collectWarnings(dst.state, time('2026-10-25T12:00'));
    assert.equal(rows.length, 2, 'The half-window remains four active hours across DST');
    assert.ok(rows.every(row => row.message.tournamentWarning.actionDeadlineAt === time('2026-10-25T16:00')));
    console.log('Tournament mailbox warning policy: XI+, QF/SF/F windows, reply recipient, delayed appointments, final reminders, quiet hours, DST, closed/busy matches, extension and replay passed.');
}

async function database() {
    const port = Number(process.env.YAMB_CHAT_TEST_MONGO_PORT);
    assert(Number.isInteger(port) && port > 1024 && port < 65536, 'Dedicated loopback Mongo port required');
    const conn = mongoose.createConnection(`mongodb://127.0.0.1:${port}/?directConnection=true`, {
        dbName: 'yamb_tournament_mail_qa_' + randomUUID().replaceAll('-', ''), serverSelectionTimeoutMS: 4000
    });
    try {
        await conn.asPromise();
        const hello = await conn.db.admin().command({ hello: 1 });
        assert(hello.isWritablePrimary && hello.setName === 'yamb-test-chat');
        const profiles = conn.model('UserProfile', new mongoose.Schema({ firebaseUid: { type: String, unique: true },
            playerMailbox: [mongoose.Schema.Types.Mixed], readMailboxGameNotices: [String], balance: Number }));
        const entries = conn.model('PlayerMailboxEntry', mailboxEntrySchema(mongoose));
        const notices = conn.model('PlayerGameNotice', new mongoose.Schema({ _id: String, createdAt: Number }));
        await Promise.all([profiles.init(), entries.init(), notices.init()]);
        await profiles.create([{ firebaseUid: 'a', balance: 1234 }, { firebaseUid: 'b', balance: 5678 }, { firebaseUid: 'outsider' }]);
        const f = fixture();
        const states = conn.db.collection('tournamentstates');
        await states.insertOne(structuredClone(f.state));
        const events = [];
        let now = noon, busy = false;
        const options = { profiles, entries, now: () => now,
            loadState: cycleId => states.findOne({ registrationCycleId: cycleId }),
            getRuntimeState: () => f.state, isMatchInPlay: () => busy, notify: uid => events.push(uid) };
        const service = createTournamentMailWarnings(options);
        const cycle = f.state.registrationCycleId;
        const mailbox = createMailboxStore({ profiles, entries, notices, systemNotices: [] });
        await Promise.all([service.sync(cycle), createTournamentMailWarnings(options).sync(cycle)]);
        assert.equal(await entries.countDocuments({}), 2, 'Concurrent workers insert one private message per recipient');
        assert.equal(events.length, 2);
        assert.equal((await mailbox.get('outsider')).messages.length, 0);
        let own = await mailbox.get('a');
        assert.equal(own.messages[0].type, 'tournament_match_warning');
        assert.equal(own.messages[0].tournamentWarning.opponentName, 'Player B');
        await mailbox.mutate('a', [own.messages[0].id], 'delete');
        await service.sync(cycle);
        assert.equal((await mailbox.get('a')).messages.length, 0, 'A deleted warning is not recreated every worker tick');
        const update = entries.updateOne;
        entries.updateOne = async () => { throw new Error('qa_db_write_failed'); };
        now = time('2026-11-11T17:00');
        await assert.rejects(service.sync(cycle), /qa_db_write_failed/);
        entries.updateOne = update;
        assert.equal(await service.sync(cycle), 2, 'A failed write retries without losing the warning');
        assert.equal(await service.sync(cycle), 0);
        busy = true;
        now = time('2026-11-12T16:00');
        assert.equal(await service.sync(cycle), 0);
        busy = false;
        assert.equal(await service.sync(cycle), 2);
        assert.equal((await profiles.findOne({ firebaseUid: 'a' })).balance, 1234);
        assert.equal((await profiles.findOne({ firebaseUid: 'b' })).balance, 5678);
        assert.equal(await notices.countDocuments({}), 0, 'There is no public announcement or push');
        f.state.status = 'finished';
        now = time('2026-11-12T21:00');
        assert.equal(await service.sync(cycle), 0, 'Live completed state suppresses an older persisted candidate');
        f.state.status = 'active';
        await states.updateOne({ registrationCycleId: cycle }, { $set: { status: 'finished' } });
        assert.equal(await service.sync(cycle), 0, 'Durable completion is also authoritative');
        console.log('Tournament mailbox warning storage: private delivery, real inbox, concurrent dedupe, delete/retry safety, busy/finished states, no wallet changes and no public notices passed.');
    } finally {
        if (conn.readyState === 1) await conn.dropDatabase();
        await conn.close();
    }
}

async function worker() {
    const source = fs.readFileSync(require.resolve('../server'), 'utf8').replace(/\r\n/g, '\n');
    const start = source.indexOf('async function checkTournamentReadiness()');
    const end = source.indexOf('\n}', start) + 2;
    const calls = [];
    const { state } = fixture();
    let failMail = false;
    const context = vm.createContext({ tournamentState: state, tournamentStateInitialized: true, tournamentReadinessWorkerBusy: false,
        MONGO_URI: 'local-test-only', mongoose: { connection: { readyState: 1 } }, tournamentReadinessCore: clock,
        tournamentNotificationsCore: notifications,
        getTournamentReadinessStore: () => ({ syncMatchNotices: async () => [], deliver: async () => calls.push('push'), settleRefunds: async () => [] }),
        getTournamentMailWarnings: () => ({ sync: async () => { calls.push('mail'); if (failMail) throw new Error('qa_mail_failure'); } }),
        console: { warn() {}, error(...args) { throw new Error(args.join(' ')); } } });
    vm.runInContext(source.slice(start, end), context);
    await context.checkTournamentReadiness();
    assert.deepEqual(calls, ['mail', 'push']);
    failMail = true;
    await context.checkTournamentReadiness();
    assert.deepEqual(calls, ['mail', 'push', 'mail', 'push'], 'Mailbox failure never blocks existing tournament pushes');
    assert.equal(context.tournamentReadinessWorkerBusy, false);
}

(async () => { pure(); await worker(); if (process.env.YAMB_CHAT_TEST_MONGO_PORT) await database(); })()
    .catch(error => { console.error(error); process.exitCode = 1; });
