'use strict';
// Dedicated loopback replica set only. Never loads .env or connects to production.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const { createGlobalChatModerationStore } = require('../lib/global-chat-moderation-store');
const { createGlobalChatModeration } = require('../lib/global-chat-moderation');
const { createProfileWrites } = require('../lib/profile-writes');
const { CATEGORIES, createPlayerSupport } = require('../lib/player-support');
const { registerPlayerMailbox } = require('../lib/player-mailbox');
const { tournamentChampionNotice, leagueChampionNotice, persistChampionNotice } = require('../lib/mailbox-champions');
const { leaderboardRecordNotice, publishLeaderboardRecordNotice } = require('../lib/mailbox-leaderboard');
const { installLeagueRankMail, publishLeagueRankMail } = require('../lib/league-rank-mail');
const source = fs.readFileSync(require.resolve('../server'), 'utf8');

async function main() {
    const port = Number(process.env.YAMB_CHAT_TEST_MONGO_PORT);
    assert(Number.isInteger(port) && port > 1024 && port < 65536, 'Set a loopback test Mongo port');
    const dbName = 'yamb_chat_moderation_qa_' + randomUUID().replace(/-/g, '');
    const conn = mongoose.createConnection(`mongodb://127.0.0.1:${port}/?directConnection=true`,
        { dbName, serverSelectionTimeoutMS: 4000, autoIndex: false });
    try {
        await conn.asPromise();
        const hello = await conn.db.admin().command({ hello: 1 });
        assert(hello.isWritablePrimary && hello.setName === 'yamb-test-chat', 'Dedicated QA replica set required');
        const compile = (variable, name) => {
            const start = source.indexOf('const ' + variable + ' = new mongoose.Schema(');
            const end = source.indexOf("mongoose.model('" + name + "', " + variable + ")", start);
            assert(start >= 0 && end > start);
            const context = { mongoose, MAX_BALANCE: 100000, GlobalChatMessageSchema: schemas.message, SUPPORT_CATEGORIES: CATEGORIES };
            return vm.runInNewContext(source.slice(start, end).replace(/const UserProfile = $/, '') + '\n' + variable, context);
        };
        const schemas = {};
        const start = source.indexOf('const GlobalChatMessageSchema =');
        const end = source.indexOf('const GlobalChatSchema =', start);
        schemas.message = vm.runInNewContext(source.slice(start, end) + '\nGlobalChatMessageSchema', { mongoose });
        const mailStart = source.indexOf('const PlayerMailSchema =');
        const mailEnd = source.indexOf('const PlayerSupportTicketSchema =', mailStart);
        const mailSchema = vm.runInNewContext(source.slice(mailStart, mailEnd) + '\nPlayerMailSchema', { mongoose });
        const profileSchema = new mongoose.Schema({
            firebaseUid: String, playerName: String, chatBanUntil: Number, chatBanPermanent: Boolean,
            chatBanReason: String, chatBanActorUid: String, chatBanAt: Number,
            leagueData: { year: Number, quarter: Number, baselineScore: Number, quarterlyScore: Number },
            readMailboxGameNotices: [String], playerMailbox: [mailSchema],
            pendingLeagueRankMail: { type: [mailSchema], default: undefined }
        });
        const rankStart = source.indexOf('const LEAGUE_RANK_BANDS =');
        const rankEnd = source.indexOf('const LEAGUE_PAGE_SIZE =', rankStart);
        const rankRules = vm.runInNewContext(source.slice(rankStart, rankEnd) + '\n({ bands: LEAGUE_RANK_BANDS, ids: LEAGUE_RANK_IDS })',
            { MAX_LEAGUE_SCORE: Number.MAX_SAFE_INTEGER });
        const rankJobs = [], rankEvents = [];
        let rankPeriod = { year: 2026, quarter: 4 };
        let publishRanks = true;
        installLeagueRankMail(profileSchema, {
            currentPeriod: () => rankPeriod,
            rankFor: score => rankRules.ids[rankRules.bands.findIndex(band => score >= band.min && score <= band.max)],
            publish: uid => { if (publishRanks) rankJobs.push(publishLeagueRankMail(models.Profile, uid, uid => rankEvents.push(uid))); }
        });
        profileSchema.pre('save', function () { if (this.$locals.rankSaveFail) throw new Error('qa_rank_save_failed'); });
        const models = {
            Chat: conn.model('GlobalChat', compile('GlobalChatSchema', 'GlobalChat')),
            Report: conn.model('GlobalChatReport', compile('GlobalChatReportSchema', 'GlobalChatReport')),
            Audit: conn.model('GlobalChatModerationLog', compile('GlobalChatModerationLogSchema', 'GlobalChatModerationLog')),
            Ticket: conn.model('PlayerSupportTicket', compile('PlayerSupportTicketSchema', 'PlayerSupportTicket')),
            Notice: conn.model('PlayerGameNotice', compile('PlayerGameNoticeSchema', 'PlayerGameNotice')),
            Score: conn.model('Score', compile('ScoreSchema', 'Score')),
            Match: conn.model('MatchResult', new mongoose.Schema({ matchId: String, mode: String, resultType: String,
                finishedAt: Date, participants: [{ uid: String, name: String }] })),
            Profile: conn.model('UserProfile', profileSchema)
        };
        for (const model of Object.values(models)) await model.createCollection();
        await models.Audit.createIndexes();
        await models.Ticket.createIndexes();
        const current = { id: 'message-new', senderUid: 'qa-player', sender: 'QA player', msg: 'Changed', revision: 1 };
        const legacy = { id: 'message-old', senderUid: 'qa-player', sender: 'QA player', msg: 'Legacy' };
        await models.Chat.collection.insertOne({ messages: [current, legacy] });
        await models.Profile.create({ firebaseUid: 'qa-player', playerName: 'QA player' });
        await models.Profile.create({ firebaseUid: 'qa-reporter', playerName: 'QA reporter' });
        const reportId = (await models.Report.create({ messageId: current.id, senderUid: 'qa-player',
            reportedByUid: 'qa-reporter', msg: 'Original', reportReason: 'Report reason' })).id;
        await models.Report.collection.insertOne({ messageId: legacy.id, senderUid: 'qa-player', msg: 'Legacy report without status' });
        const store = createGlobalChatModerationStore({ connection: conn, models, profileWrites: createProfileWrites() });
        const events = [], notices = [], history = [current, legacy];
        let forceDuplicateId = false, id = 0;
        const service = createGlobalChatModeration({ ownerUid: 'qa-owner', store,
            enqueue: operation => operation(), getHistory: () => history,
            publish: (event, data) => events.push({ event, data }),
            notify: (uid, event, data) => notices.push({ uid, event, data }),
            newId: () => forceDuplicateId ? 'qa-1' : 'qa-' + ++id });
        const owner = { verifiedUid: 'qa-owner', id: 'socket-a', playerName: 'QA owner' };
        const stranger = { verifiedUid: 'qa-player', id: 'socket-b', playerName: 'QA owner' };
        assert.equal((await service.list(stranger, { tab: 'reports' })).reason, 'err_chat_moderator_required');
        assert.equal((await service.capabilities(owner)).pending, 2);
        const reports = (await service.list(owner, { tab: 'reports' })).rows;
        const first = reports.find(row => row._id === reportId);
        assert.equal(first.msg, 'Original');
        assert.equal(first.currentMessage.msg, 'Changed');
        assert.equal(first.reportReason, 'Report reason');
        const mute = { action: 'mute', duration: 'permanent', targetUid: 'qa-player', reason: 'QA moderation' };
        assert.equal((await service.act(owner, mute)).ok, true);
        assert.equal((await service.capabilities(stranger)).restriction.permanent, true);
        assert.equal((await service.list(owner, { tab: 'bans' })).rows[0].chatBanReason, mute.reason);
        const deletion = { action: 'delete', reportId, messageId: current.id, revision: 1, reason: 'QA removal', reply: 'Public reply' };
        forceDuplicateId = true;
        assert.equal((await service.act(owner, deletion)).reason, 'err_chat_moderation_save_failed');
        assert.equal((await models.Chat.findOne()).messages.length, 2, 'Audit write failure rolls back message removal');
        assert.equal((await models.Report.findById(reportId)).status, 'open', 'Audit failure leaves the report open');
        assert.equal(events.length, 0);
        assert.equal((await models.Profile.findOne({ firebaseUid: 'qa-reporter' })).playerMailbox.length, 0);
        forceDuplicateId = false;
        assert.equal((await service.act(owner, deletion)).ok, true);
        assert.equal((await models.Report.findById(reportId)).status, 'resolved');
        assert.equal((await models.Report.findById(reportId)).msg, 'Original');
        const [reply] = (await models.Profile.findOne({ firebaseUid: 'qa-reporter' })).playerMailbox;
        assert.equal(reply.id, `moderation:${reportId}`);
        assert.equal(reply.type, 'moderation_resolved');
        assert.equal(reply.text, 'Public reply');
        assert.equal(reply.reference, reportId);
        assert.equal((await models.Profile.findOne({ firebaseUid: 'qa-player' })).playerMailbox.length, 0);
        assert.ok(notices.some(notice => notice.uid === 'qa-reporter' && notice.event === 'player_mailbox_changed'));
        assert.equal(events[0].data.id, current.id);
        assert.equal((await service.act(owner, { ...deletion, reportId: '', reply: '', messageId: legacy.id, revision: 0 })).ok, true);
        assert.equal((await models.Chat.findOne()).messages.length, 0, 'Legacy messages without a revision can be moderated');
        assert.equal((await service.act(owner, { ...mute, action: 'unmute' })).ok, true);
        assert.equal((await service.capabilities(stranger)).restriction, null);
        const legacyReport = (await models.Report.findOne({ messageId: legacy.id })).id;
        assert.equal((await service.act(owner, { action: 'dismiss', reportId: legacyReport, reason: 'QA dismissed report' })).ok, true);
        assert.equal((await models.Report.findById(legacyReport)).status, 'dismissed');
        assert.equal((await service.act(owner, { action: 'resolve', reportId: legacyReport, reason: 'Already handled' })).reason, 'err_chat_report_resolved');
        assert.equal(notices.some(notice => notice.uid === 'qa-player' && notice.event === 'global_chat_moderation_notice'), true);
        assert.equal((await service.list(owner, { tab: 'audit' })).rows.length, 5);
        await models.Match.create({ matchId: 'reporter-match', mode: 'random', resultType: 'regular', finishedAt: new Date(),
            participants: [{ uid: 'qa-reporter' }, { uid: 'qa-player', name: 'Private opponent' }] });
        const emptyDiagnostics = { findOne() { return { sort: () => ({ select: () => ({ lean: async () => null }) }) }; } };
        const supportNotices = [];
        const support = createPlayerSupport({ connection: conn, profiles: models.Profile, tickets: models.Ticket, matches: models.Match,
            submissions: emptyDiagnostics, disconnects: emptyDiagnostics, notify: uid => supportNotices.push(uid) });
        function supportClient(verifiedUid) {
            const listeners = new Map();
            support.bind({ verifiedUid, on: (key, callback) => listeners.set(key, callback) }, {
                verifiedUid: socket => socket.verifiedUid, available: () => true, ownerUid: 'qa-owner' });
            return (event, data) => new Promise(resolve => listeners.get(`player_support_${event}`)(data, resolve));
        }
        const send = supportClient('qa-reporter');
        const admin = supportClient('qa-owner');
        const request = { requestId: 'b'.repeat(36), category: 'results', description: 'Test not visible in results.', uid: 'qa-player', attachDiagnostics: true };
        assert.deepEqual(await supportClient(null)('submit', request), { ok: false });
        const ticket = await send('submit', request);
        assert.equal(ticket.ok, true);
        assert.equal((await send('submit', request)).reference, ticket.reference);
        assert.equal((await send('submit', { ...request, requestId: 'c'.repeat(36) })).reason, 'support_rate');
        assert.deepEqual(await send('list', {}), { ok: false });
        assert.equal((await admin('list', {})).rows[0].diagnostics.match.matchId, 'reporter-match');
        assert.equal((await admin('list', {})).rows[0].diagnostics.match.participants, undefined);
        const answer = { reference: ticket.reference, text: 'Looked into your result.' };
        assert.deepEqual(await send('reply', answer), { ok: false });
        assert.equal((await admin('reply', answer)).ok, true);
        assert.equal((await admin('reply', answer)).ok, true);
        assert.equal((await admin('reply', { ...answer, text: 'Different answer' })).reason, 'support_closed');
        assert.equal((await admin('list', {})).rows.length, 0);
        assert.deepEqual(supportNotices, ['qa-reporter']);
        assert.equal((await models.Profile.findOne({ firebaseUid: 'qa-reporter' })).playerMailbox.filter(mail => mail.type === 'support_reply').length, 1);
        assert.equal((await models.Profile.findOne({ firebaseUid: 'qa-player' })).playerMailbox.length, 0);
        console.log('Player support: verified owner access, private diagnostics, retry safety and single inbox reply passed.');

        function mailboxClient(verifiedUid) {
            const listeners = new Map();
            registerPlayerMailbox({ connected: true, verifiedUid, on: (key, callback) => listeners.set(key, callback) }, {
                profiles: models.Profile, verifiedUid: socket => socket.verifiedUid, available: () => true,
                loadOfficialNotices: async () => (await models.Notice.find({}).lean()).map(({ _id, ...notice }) => ({ ...notice, id: _id })) });
            return (event, data) => new Promise(resolve => listeners.get(`player_mailbox_${event}`)(data, resolve));
        }
        const inbox = mailboxClient('qa-reporter');
        const outsider = mailboxClient('qa-player');
        const both = await inbox('get', {});
        assert.equal(both.unread, 2);
        const summary = await inbox('get', { summary: true });
        assert.equal(summary.unread, both.unread);
        assert.equal(Object.hasOwn(summary, 'messages'), false);
        await outsider('read', { ids: [both.messages[0].id] });
        assert.equal((await inbox('get', { summary: true })).unread, 2);
        await inbox('read', { ids: [both.messages[0].id] });
        assert.equal((await inbox('get', { summary: true })).unread, 1);
        assert.ok((await inbox('get', {})).messages.find(row => row.id === both.messages[0].id).readAt);
        console.log('Mailbox: MongoDB summary projection, private delivery and individual read persistence passed.');
        const winner = tournamentChampionNotice({ winnerId: 'qa-player', winnerName: 'QA Champion', tournamentNumber: 12,
            tournamentCycleId: 'qa-cycle', wonAt: Date.now() });
        const league = leagueChampionNotice({ year: 2026, quarter: 3, archivedAt: Date.now(),
            champion: { playerId: 'qa-player', playerName: 'QA Champion', score: 150000 } });
        const inserted = await Promise.all([persistChampionNotice(models.Notice, winner), persistChampionNotice(models.Notice, winner)]);
        assert.deepEqual(inserted.sort(), [false, true]);
        assert.equal(await persistChampionNotice(models.Notice, league), true);
        for (const client of [inbox, outsider]) {
            const received = await client('get', {});
            const publicRows = received.messages.filter(row => row.champion);
            assert.equal(publicRows.length, 2);
            assert.ok(publicRows.every(row => row.champion.playerId === undefined && row.champion.playerName === 'QA Champion'));
        }
        await inbox('read', { ids: [winner.id, league.id] });
        const reader = await inbox('get', {});
        const otherReader = await outsider('get', {});
        assert.ok(reader.messages.filter(row => row.champion).every(row => row.readAt));
        assert.ok(otherReader.messages.filter(row => row.champion).every(row => row.readAt === null));
        console.log('Champions: concurrent publication is idempotent; both messages reach all players with separate read state.');
        const record = leaderboardRecordNotice({ all_time: { uid: 'previous-holder', score: 1200 } },
            { uid: 'qa-player', matchId: 'qa-record', playerName: 'Record holder', score: 1450, date: new Date(), createdAt: Date.now() },
            { weekly: new Date(0), monthly: new Date(0), all_time: null });
        const recordScore = await models.Score.create({ playerId: 'qa-player', uid: 'qa-player', matchId: 'qa-record', score: 1450,
            mailboxRecordNotice: record, mailboxRecordPending: true });
        let liveChanges = 0;
        const recordDependencies = { scores: models.Score, notices: models.Notice, changed: () => liveChanges++ };
        await publishLeaderboardRecordNotice(recordDependencies, recordScore.toObject());
        await publishLeaderboardRecordNotice(recordDependencies, recordScore.toObject());
        assert.equal(liveChanges, 1);
        assert.equal((await models.Score.findById(recordScore._id)).mailboxRecordPending, false);
        for (const client of [inbox, outsider]) {
            const received = await client('get', {});
            const recordRows = received.messages.filter(row => row.type === 'leaderboard_record');
            assert.equal(recordRows.length, 1);
            assert.equal(recordRows[0].leaderboard.playerName, 'Record holder');
            assert.equal(recordRows[0].leaderboard.playerId, undefined);
            assert.equal(recordRows[0].leaderboard.periods.length, 3);
        }
        console.log('Leaderboard: stored score evidence, unique shared announcement and delivery to all accounts passed.');
        const rankUid = 'qa-rank-player';
        await models.Profile.create({ firebaseUid: rankUid,
            leagueData: { year: 2026, quarter: 4, baselineScore: 0, quarterlyScore: 4999 } });
        const rankPlayer = await models.Profile.findOne({ firebaseUid: rankUid });
        rankPlayer.leagueData.quarterlyScore = 5000;
        rankPlayer.$locals.rankSaveFail = true;
        await assert.rejects(rankPlayer.save(), /qa_rank_save_failed/);
        const failedRankSave = await models.Profile.findOne({ firebaseUid: rankUid }).lean();
        assert.equal(failedRankSave.leagueData.quarterlyScore, 4999);
        assert.equal(failedRankSave.playerMailbox.length, 0);
        rankPlayer.$locals.rankSaveFail = false;
        await rankPlayer.save();
        await Promise.all(rankJobs);
        let rankProfile = await models.Profile.findOne({ firebaseUid: rankUid }).lean();
        assert.equal(rankProfile.playerMailbox.length, 1);
        assert.equal(rankProfile.playerMailbox[0].type, 'league_rank_changed');
        assert.deepEqual(rankProfile.playerMailbox[0].leagueRank, { year: 2026, quarter: 4, previousRank: 'amater',
            nextRank: 'profi', score: 5000, direction: 'up' });
        await rankPlayer.save();
        rankPlayer.leagueData.quarterlyScore = 14999;
        await rankPlayer.save();
        await Promise.all(rankJobs);
        assert.equal((await models.Profile.findOne({ firebaseUid: rankUid })).playerMailbox.length, 1);
        rankPlayer.leagueData.quarterlyScore = 100000;
        publishRanks = false;
        await rankPlayer.save();
        rankProfile = await models.Profile.findOne({ firebaseUid: rankUid }).lean();
        assert.equal(rankProfile.pendingLeagueRankMail.length, 1, 'Rank transition survives until private delivery succeeds');
        const pending = rankProfile.pendingLeagueRankMail[0];
        assert.equal(pending.leagueRank.previousRank, 'profi');
        assert.equal(pending.leagueRank.nextRank, 'titan');
        await Promise.all([publishLeagueRankMail(models.Profile, rankUid, uid => rankEvents.push(uid)),
            publishLeagueRankMail(models.Profile, rankUid, uid => rankEvents.push(uid))]);
        rankProfile = await models.Profile.findOne({ firebaseUid: rankUid }).lean();
        assert.equal(rankProfile.pendingLeagueRankMail.length, 0);
        assert.equal(rankProfile.playerMailbox.length, 2, 'Concurrent delivery does not duplicate a rank message');
        publishRanks = true;
        rankPlayer.leagueData.quarterlyScore = 99999;
        await rankPlayer.save();
        await Promise.all(rankJobs);
        rankProfile = await models.Profile.findOne({ firebaseUid: rankUid }).lean();
        assert.equal(rankProfile.playerMailbox[0].leagueRank.direction, 'down');
        assert.equal(rankProfile.playerMailbox[0].leagueRank.nextRank, 'legenda');
        rankPeriod = { year: 2027, quarter: 1 };
        rankPlayer.leagueData = { year: 2027, quarter: 1, baselineScore: 99999, quarterlyScore: 0 };
        await rankPlayer.save();
        await Promise.all(rankJobs);
        assert.equal((await models.Profile.findOne({ firebaseUid: rankUid })).playerMailbox.length, 3, 'Quarter reset is not a rank demotion');
        assert.ok(rankEvents.every(uid => uid === rankUid));
        const opponentInbox = await outsider('get', {});
        assert.equal(opponentInbox.messages.some(row => row.type === 'league_rank_changed'), false);
        assert.equal((await mailboxClient(rankUid)('get', {})).messages.filter(row => row.type === 'league_rank_changed').length, 3);
        console.log('League rank mail: private promotion, skipped ranks, demotion, quarter reset and retry-safe delivery passed.');
        console.log('MongoDB moderation: legacy reports/messages, private report snapshot, durable actions and audit, rollback on audit failure, mute/unmute and report dismissal passed.');
    } finally {
        await conn.close();
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
