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
            const context = { mongoose, MAX_BALANCE: 100000, GlobalChatMessageSchema: schemas.message };
            return vm.runInNewContext(source.slice(start, end).replace(/const UserProfile = $/, '') + '\n' + variable, context);
        };
        const schemas = {};
        const start = source.indexOf('const GlobalChatMessageSchema =');
        const end = source.indexOf('const GlobalChatSchema =', start);
        schemas.message = vm.runInNewContext(source.slice(start, end) + '\nGlobalChatMessageSchema', { mongoose });
        const models = {
            Chat: conn.model('GlobalChat', compile('GlobalChatSchema', 'GlobalChat')),
            Report: conn.model('GlobalChatReport', compile('GlobalChatReportSchema', 'GlobalChatReport')),
            Audit: conn.model('GlobalChatModerationLog', compile('GlobalChatModerationLogSchema', 'GlobalChatModerationLog')),
            Profile: conn.model('UserProfile', new mongoose.Schema({
                firebaseUid: String, playerName: String, chatBanUntil: Number, chatBanPermanent: Boolean,
                chatBanReason: String, chatBanActorUid: String, chatBanAt: Number
            }))
        };
        for (const model of Object.values(models)) await model.createCollection();
        await models.Audit.createIndexes();
        const current = { id: 'message-new', senderUid: 'qa-player', sender: 'QA player', msg: 'Changed', revision: 1 };
        const legacy = { id: 'message-old', senderUid: 'qa-player', sender: 'QA player', msg: 'Legacy' };
        await models.Chat.collection.insertOne({ messages: [current, legacy] });
        await models.Profile.create({ firebaseUid: 'qa-player', playerName: 'QA player' });
        const reportId = (await models.Report.create({ messageId: current.id, senderUid: 'qa-player',
            reportedByUid: 'qa-owner', msg: 'Original', reportReason: 'Report reason' })).id;
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
        const deletion = { action: 'delete', reportId, messageId: current.id, revision: 1, reason: 'QA removal' };
        forceDuplicateId = true;
        assert.equal((await service.act(owner, deletion)).reason, 'err_chat_moderation_save_failed');
        assert.equal((await models.Chat.findOne()).messages.length, 2, 'Audit write failure rolls back message removal');
        assert.equal((await models.Report.findById(reportId)).status, 'open', 'Audit failure leaves the report open');
        assert.equal(events.length, 0);
        forceDuplicateId = false;
        assert.equal((await service.act(owner, deletion)).ok, true);
        assert.equal((await models.Report.findById(reportId)).status, 'resolved');
        assert.equal((await models.Report.findById(reportId)).msg, 'Original');
        assert.equal(events[0].data.id, current.id);
        assert.equal((await service.act(owner, { ...deletion, reportId: '', messageId: legacy.id, revision: 0 })).ok, true);
        assert.equal((await models.Chat.findOne()).messages.length, 0, 'Legacy messages without a revision can be moderated');
        assert.equal((await service.act(owner, { ...mute, action: 'unmute' })).ok, true);
        assert.equal((await service.capabilities(stranger)).restriction, null);
        const legacyReport = (await models.Report.findOne({ messageId: legacy.id })).id;
        assert.equal((await service.act(owner, { action: 'dismiss', reportId: legacyReport, reason: 'QA dismissed report' })).ok, true);
        assert.equal((await models.Report.findById(legacyReport)).status, 'dismissed');
        assert.equal((await service.act(owner, { action: 'resolve', reportId: legacyReport, reason: 'Already handled' })).reason, 'err_chat_report_resolved');
        assert.equal(notices.some(notice => notice.uid === 'qa-player' && notice.event === 'global_chat_moderation_notice'), true);
        assert.equal((await service.list(owner, { tab: 'audit' })).rows.length, 5);
        console.log('MongoDB moderation: legacy reports/messages, private report snapshot, durable actions and audit, rollback on audit failure, mute/unmute and report dismissal passed.');
    } finally {
        await conn.close();
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
