'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { leaderboardRecordNotice, publishLeaderboardRecordNotice } = require('../lib/mailbox-leaderboard');
const { createProfileWrites } = require('../lib/profile-writes');
const { mailboxSnapshot } = require('../lib/player-mailbox');

const at = Date.parse('2026-11-14T12:00:00Z');
const starts = { weekly: new Date('2026-11-08T23:00:00Z'), monthly: new Date('2026-10-31T23:00:00Z'), all_time: null };
const playerA = 'qa-leaderboard-a-1234567890';
const playerB = 'qa-leaderboard-b-1234567890';
const entry = { uid: playerB, matchId: 'partija-1', playerName: 'Igrač $& <B>', score: 900, date: new Date(at), createdAt: at };

function records() {
    return { weekly: { uid: playerA, score: 600 }, monthly: { uid: playerB, score: 850 }, all_time: { uid: playerA, score: 880 } };
}

function planning() {
    const notice = leaderboardRecordNotice(records(), entry, starts);
    assert.deepEqual(notice.leaderboard.periods.map(row => [row.period, row.change]),
        [['weekly', 'leader_changed'], ['monthly', 'record_improved'], ['all_time', 'leader_changed']]);
    assert.equal(leaderboardRecordNotice(records(), { ...entry, score: 600 }, starts), null);
    const tied = leaderboardRecordNotice(records(), { ...entry, score: 880 }, starts);
    assert.deepEqual(tied.leaderboard.periods.map(row => row.period), ['weekly', 'monthly']);
    const sameScoreEarlier = leaderboardRecordNotice({ all_time: { uid: playerA, score: 900, date: new Date(at + 1) } }, entry, starts);
    assert.equal(sameScoreEarlier.leaderboard.periods.find(row => row.period === 'all_time').change, 'leader_changed_tie');
    assert.equal(leaderboardRecordNotice({ all_time: { uid: playerA, score: 900, date: new Date(at - 1) },
        weekly: { uid: playerA, score: 1000 }, monthly: { uid: playerA, score: 1000 } }, entry, starts), null);
    const old = leaderboardRecordNotice(records(), { ...entry, date: new Date('2026-10-30T12:00:00Z') }, starts);
    assert.deepEqual(old.leaderboard.periods.map(row => row.period), ['all_time']);
    const first = leaderboardRecordNotice({}, entry, starts);
    assert.ok(first.leaderboard.periods.every(row => row.change === 'first_record'));
    assert.equal(first.id, notice.id);
    assert.equal(mailboxSnapshot([notice]).messages[0].leaderboard.playerId, undefined);
    assert.equal(mailboxSnapshot([notice]).messages[0].leaderboard.playerName, entry.playerName);
}

async function persistence() {
    const notice = leaderboardRecordNotice(records(), entry, starts);
    const score = { _id: 'row', mailboxRecordPending: true, mailboxRecordNotice: notice };
    const documents = new Map();
    let failWrite = true;
    let failReceipt = false;
    let events = 0;
    const dependencies = {
        notices: { async updateOne({ _id }, { $setOnInsert }) {
            if (failWrite) throw new Error('notice_write_failed');
            const inserted = !documents.has(_id);
            if (inserted) documents.set(_id, $setOnInsert);
            return { upsertedCount: Number(inserted) };
        } },
        scores: { async updateOne() {
            if (failReceipt) throw new Error('receipt_write_failed');
            score.mailboxRecordPending = false;
        } },
        changed: () => events++
    };
    await assert.rejects(publishLeaderboardRecordNotice(dependencies, score), /notice_write_failed/);
    assert.equal(score.mailboxRecordPending, true);
    assert.equal(events, 0);
    failWrite = false;
    failReceipt = true;
    await assert.rejects(publishLeaderboardRecordNotice(dependencies, score), /receipt_write_failed/);
    assert.equal(score.mailboxRecordPending, true);
    assert.equal(events, 1, 'Readers see the saved message while the pending receipt awaits retry');
    failReceipt = false;
    await publishLeaderboardRecordNotice(dependencies, score);
    await publishLeaderboardRecordNotice(dependencies, score);
    assert.equal(score.mailboxRecordPending, false);
    assert.equal(documents.size, 1);
    assert.equal(events, 1);
}

async function concurrentScoreWrites() {
    const source = fs.readFileSync(require.resolve('../server'), 'utf8').replace(/\r\n/g, '\n');
    const begin = source.indexOf('async function persistLeaderboardScoreRecord(');
    const code = source.slice(begin, source.indexOf('\n}', begin) + 2);
    const rows = [{ _id: 'initial', uid: playerA, playerId: playerA, matchId: 'initial', score: 500, date: new Date(at) }];
    const notifications = new Map();
    const jobs = [];
    let failNotice = false;
    let next = 0;
    const scoreModel = {
        async findOne({ playerId, matchId }) { return rows.find(row => row.playerId === playerId && row.matchId === matchId); },
        async findOneAndUpdate(filter, { $setOnInsert }) {
            const existing = await this.findOne(filter);
            if (existing) return existing;
            const row = { _id: String(++next), ...$setOnInsert };
            rows.push(row);
            return row;
        },
        async updateOne({ _id }) { rows.find(row => row._id === _id).mailboxRecordPending = false; }
    };
    const dependencies = { scores: scoreModel, notices: { async updateOne({ _id }, { $setOnInsert }) {
        if (failNotice) throw new Error('notice_write_failed');
        const inserted = !notifications.has(_id);
        if (inserted) notifications.set(_id, $setOnInsert);
        return { upsertedCount: Number(inserted) };
    } }, changed() {} };
    const context = {
        Date, console, MONGO_URI: true, MAX_SCORE: 3500, MAX_NAME_LENGTH: 40,
        leaderboardWrites: createProfileWrites(), Score: scoreModel,
        toSafeInt: Number, normalizeSoloRecordAchievements: value => value || [],
        freezeMatchRecordAchievements: async () => [],
        leaderboardRecordNotice, LEADERBOARD_RECORD_PERIODS: Object.keys(starts), getLeaderboardPeriodStart: period => starts[period],
        async captureLeaderboardRecordSnapshots() {
            await new Promise(resolve => setTimeout(resolve, 5));
            return Object.fromEntries(Object.entries(starts).map(([period, start]) => [period,
                rows.filter(row => !start || row.date >= start).slice().sort((a, b) => b.score - a.score)[0]]));
        },
        publishLeaderboardMailboxRecord: row => publishLeaderboardRecordNotice(dependencies, row),
        queueRecordPush: promise => jobs.push(Promise.resolve(promise).catch(() => {})),
        notifyBrokenLeaderboardRecords: async () => ({ ok: true })
    };
    vm.createContext(context);
    vm.runInContext(code, context);
    const save = (uid, matchId, score, extra = {}) => context.persistLeaderboardScoreRecord({ uid, matchId, score,
        playerName: uid, date: new Date(at), mode: 'Solo', silent: true, ...extra });
    await Promise.all([save(playerA, 'improvement', 700), save(playerB, 'new-leader', 900)]);
    await Promise.all(jobs);
    assert.equal(rows.length, 3);
    assert.equal(notifications.size, 2);
    const changes = [...notifications.values()].map(row => row.leaderboard.periods[0]);
    assert.deepEqual(changes.map(row => [row.change, row.previousScore]), [['record_improved', 500], ['leader_changed', 700]]);
    assert.equal((await save(playerB, 'new-leader', 900)).duplicate, true);
    assert.equal(notifications.size, 2);
    failNotice = true;
    assert.equal((await save(playerA, 'retry', 1000)).ok, true);
    await Promise.all(jobs);
    assert.equal(rows.at(-1).mailboxRecordPending, true);
    failNotice = false;
    assert.equal((await save(playerA, 'retry', 1000)).duplicate, true);
    await Promise.all(jobs);
    assert.equal(rows.at(-1).mailboxRecordPending, false);
    assert.equal(notifications.size, 3);
    await save(playerB, 'backfill', 1100, { notifyRecords: false });
    await Promise.all(jobs);
    assert.equal(notifications.size, 3, 'Silent history restoration retains its existing caller contract');
}

(async () => {
    planning();
    await persistence();
    await concurrentScoreWrites();
    console.log('Leaderboard mail: all periods, ties, old results, concurrent writes and durable publication retries passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
