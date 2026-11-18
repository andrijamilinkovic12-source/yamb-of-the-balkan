'use strict';
// Disposable loopback QA database only; never reads .env or production config.
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const { createMailboxStore, mailboxEntrySchema, PAGE_SIZE } = require('../lib/player-mailbox-store');
const { createMail, appendMail, registerPlayerMailbox } = require('../lib/player-mailbox');
const { FACEBOOK_NOTICE_ID, REFERRAL_NOTICE_ID, FACEBOOK_URL } = require('../lib/mailbox-system-notices');
const { createPlayUpdateWatcher, startPlayUpdateNotices, STORE_URL } = require('../lib/play-update-notices');

async function main() {
    const port = Number(process.env.YAMB_CHAT_TEST_MONGO_PORT);
    assert(Number.isInteger(port) && port > 1024 && port < 65536, 'Dedicated loopback Mongo port required');
    const conn = mongoose.createConnection(`mongodb://127.0.0.1:${port}/?directConnection=true`, {
        dbName: 'yamb_mailbox_history_qa_' + randomUUID().replaceAll('-', ''), serverSelectionTimeoutMS: 4000
    });
    try {
        await conn.asPromise();
        const hello = await conn.db.admin().command({ hello: 1 });
        assert(hello.isWritablePrimary && hello.setName === 'yamb-test-chat');
        const profiles = conn.model('UserProfile', new mongoose.Schema({ firebaseUid: String,
            playerMailbox: [mongoose.Schema.Types.Mixed], readMailboxGameNotices: [String] }));
        const entries = conn.model('PlayerMailboxEntry', mailboxEntrySchema(mongoose));
        const notices = conn.model('PlayerGameNotice', new mongoose.Schema({ _id: String,
            type: String, title: String, text: String, createdAt: Number, action: mongoose.Schema.Types.Mixed, pinned: Boolean, protected: Boolean,
            versionCode: Number, versionName: String,
            champion: mongoose.Schema.Types.Mixed, leaderboard: mongoose.Schema.Types.Mixed }));
        await Promise.all([profiles.init(), entries.init(), notices.init()]);
        const store = createMailboxStore({ profiles, entries, notices, systemNotices: [], gameNotices: [
            { id: 'game:environment', type: 'game_notice', text: 'Environment notice', createdAt: 1 }
        ] });
        const mails = Array.from({ length: 145 }, (_, i) => ({ ...createMail('friend_accepted', {
            fromUid: 'sender-private-uid', fromName: 'QA sender'
        }, 'mail-' + String(i).padStart(4, '0')), createdAt: Math.floor(i / 4) + 2, readAt: i === 0 ? 100 : null }));
        await profiles.create({ firebaseUid: 'alice', playerMailbox: mails, readMailboxGameNotices: ['game:notice-0000'] });
        await profiles.create({ firebaseUid: 'bob' });
        await notices.insertMany(Array.from({ length: 75 }, (_, i) => ({ _id: 'game:notice-' + String(i).padStart(4, '0'),
            type: 'game_notice', title: 'Shared ' + i, text: 'QA announcement', createdAt: Math.floor(i / 3) + 2, action: {} })));
        await notices.create({ _id: 'game:future', type: 'game_notice', text: 'Not yet', createdAt: Date.now() + 86400000 });
        const allPages = async (account, folder = 'inbox') => {
            const rows = [];
            let before = '';
            do {
                const result = await store.get(account, { folder, before });
                assert(result.messages.length <= PAGE_SIZE, 'Only one bounded page is returned');
                rows.push(...result.messages);
                assert.notEqual(result.next, before || 'first-page', 'Cursor makes progress');
                before = result.next;
            } while (before);
            assert.equal(new Set(rows.map(row => row.id)).size, rows.length, 'No duplicate or skipped tied-date IDs');
            return rows;
        };
        const original = await allPages('alice');
        assert.equal(original.length, 221, 'History goes beyond both old limits, including all 75 public notices');
        assert.equal((await store.get('alice', { summary: true })).unread, 219);
        assert.equal(original.find(row => row.id === 'game:notice-0000').readAt, 1);
        assert.ok(original.every(row => !row.fromUid && !row.action), 'Private sender identifiers and empty actions are not exposed');
        assert.equal((await profiles.findOne({ firebaseUid: 'alice' })).playerMailbox.length, 0);
        assert.equal((await profiles.findOne({ firebaseUid: 'alice' })).readMailboxGameNotices.length, 0);
        assert.equal((await allPages('bob')).length, 76, 'Other recipients never see private history');

        await store.mutate('alice', ['mail-0001', 'game:notice-0001'], 'archive');
        assert.equal((await store.get('alice', { summary: true })).unread, 217, 'Archive removes unread badge contribution');
        let archive = await allPages('alice', 'archive');
        assert.deepEqual(new Set(archive.map(row => row.id)), new Set(['mail-0001', 'game:notice-0001']));
        assert.ok(archive.every(row => row.archived));
        assert.ok((await allPages('bob')).find(row => row.id === 'game:notice-0001'));
        await store.mutate('alice', ['game:notice-0001'], 'read');
        await store.mutate('alice', ['mail-0001', 'game:notice-0001'], 'restore');
        assert.equal((await allPages('alice', 'archive')).length, 0);
        assert.equal((await store.get('alice', { summary: true })).unread, 218);
        assert.equal((await allPages('bob')).find(row => row.id === 'game:notice-0001').readAt, null);
        await store.mutate('alice', ['mail-0001', 'game:notice-0001'], 'delete');
        await store.mutate('alice', ['mail-0001', 'game:notice-0001'], 'restore');
        assert.equal((await allPages('alice')).length, 219, 'Deleted mail cannot be restored through archive');
        assert.equal((await notices.findById('game:notice-0001')).text, 'QA announcement', 'Deleting shared mail keeps its original for others');
        assert.equal((await entries.findOne({ recipientUid: 'alice', id: 'mail-0001' })).message, undefined,
            'Private deleted message body is removed; minimal tombstone prevents replay');
        await profiles.updateOne({ firebaseUid: 'alice' }, { $push: { playerMailbox: appendMail(mails[1]) } });
        await store.migrate('alice');
        assert.equal((await allPages('alice')).length, 219, 'Repeated delivery cannot resurrect a deletion');

        // Fault after history insertion but before outbox acknowledgment: retry
        // must preserve both the original mail and the recipient's newer state.
        const late = { ...createMail('support_reply', { text: 'Durable reply' }, 'late-delivery'), createdAt: 1000 };
        await profiles.updateOne({ firebaseUid: 'alice' }, { $push: { playerMailbox: appendMail(late) } });
        const updateProfile = profiles.updateOne;
        profiles.updateOne = function (filter, update, ...args) {
            if (update.$pull?.playerMailbox) throw new Error('qa_outbox_ack_failure');
            return updateProfile.call(this, filter, update, ...args);
        };
        await assert.rejects(store.migrate('alice'), /qa_outbox_ack_failure/);
        assert.equal((await profiles.findOne({ firebaseUid: 'alice' })).playerMailbox.length, 1);
        assert.equal(await entries.countDocuments({ recipientUid: 'alice', id: late.id }), 1);
        profiles.updateOne = updateProfile;
        await entries.updateOne({ recipientUid: 'alice', id: late.id }, { $set: { archived: true, readAt: 2000 } });
        await store.migrate('alice');
        archive = await allPages('alice', 'archive');
        assert.equal(archive.length, 1);
        assert.equal(archive[0].readAt, 2000);
        assert.equal(await entries.countDocuments({ recipientUid: 'alice', id: late.id }), 1);

        await Promise.all([store.mutate('alice', ['game:notice-0003'], 'read'),
            store.mutate('alice', ['game:notice-0003'], 'archive')]);
        const concurrent = (await allPages('alice', 'archive')).find(row => row.id === 'game:notice-0003');
        assert.ok(concurrent?.readAt && concurrent.archived, 'Concurrent read/archive preserve independent recipient fields');
        await store.mutate('alice', ['game:notice-0003'], 'restore');

        // A large burst remains in the delivery outbox until persistence works.
        const burst = Array.from({ length: 1001 }, (_, i) => ({ ...late, id: 'burst-' + i, createdAt: 2000 + i }));
        await profiles.create({ firebaseUid: 'burst', playerMailbox: burst });
        const bulk = entries.bulkWrite;
        entries.bulkWrite = async () => { throw new Error('qa_history_offline'); };
        await assert.rejects(store.get('burst'), /qa_history_offline/);
        assert.equal((await profiles.findOne({ firebaseUid: 'burst' })).playerMailbox.length, 1001);
        entries.bulkWrite = bulk;
        await store.drain();
        assert.equal((await allPages('burst')).length, 1077);
        assert.equal((await store.get('burst', { summary: true })).unread, 1077);
        await assert.rejects(store.get('alice', { before: 'bad' }));
        await assert.rejects(store.get('alice', { folder: 'other' }));

        // Socket payload cannot select a different account or a hidden source.
        const hooks = new Map();
        let verified = 'bob';
        const socket = { connected: true, on: (name, fn) => hooks.set(name, fn) };
        registerPlayerMailbox(socket, { store, profiles, available: () => true, verifiedUid: () => verified });
        const call = (name, payload) => new Promise(resolve => hooks.get(name)(payload, resolve));
        assert.equal((await call('player_mailbox_get', { firebaseUid: 'alice' })).recipientUid, 'bob');
        assert.equal((await call('player_mailbox_manage', { id: late.id, action: 'delete', uid: 'alice' })).ok, true);
        assert.equal((await allPages('alice', 'archive')).length, 1, 'Guessing a private mail ID cannot affect its owner');
        assert.equal((await call('player_mailbox_manage', { id: 'game:notice-0002', action: 'delete' })).ok, true);
        assert.ok((await allPages('alice')).find(row => row.id === 'game:notice-0002'));
        assert.deepEqual(await call('player_mailbox_manage', { id: '<invalid>', action: 'delete' }), { ok: false });
        assert.deepEqual(await call('player_mailbox_manage', { id: 'valid', action: 'publish' }), { ok: false });
        verified = null;
        assert.deepEqual(await call('player_mailbox_manage', { id: 'valid', action: 'delete' }), { ok: false });

        // Existing Facebook announcement predates the new separate referral.
        await notices.create({ _id: FACEBOOK_NOTICE_ID, type: 'facebook_follow', createdAt: 1,
            pinned: true, protected: true, action: { type: 'facebook', url: FACEBOOK_URL } });
        const announcementStore = createMailboxStore({ profiles, entries, notices });
        let firstPage = await announcementStore.get('burst');
        const pinned = firstPage.messages[0];
        assert.equal(pinned.id, FACEBOOK_NOTICE_ID);
        assert.deepEqual(pinned.action, { type: 'facebook', url: FACEBOOK_URL });
        assert.equal(pinned.pinned, true);
        assert.equal(pinned.protected, true);
        const referral = firstPage.messages[1];
        assert.equal(referral.id, REFERRAL_NOTICE_ID);
        assert.equal(referral.type, 'referral_invite');
        assert.equal(referral.pinned, true);
        assert.equal(referral.protected, true);
        assert.equal(pinned.createdAt, 1, 'Existing Facebook date survives seeding');
        assert.equal(firstPage.unread, 1079);
        assert.equal(firstPage.messages.length, PAGE_SIZE);
        assert.equal((await announcementStore.get('burst', { before: firstPage.next })).messages[0].id, 'burst-982');

        registerPlayerMailbox(socket, { store: announcementStore, profiles, available: () => true, verifiedUid: () => verified });
        verified = 'burst';
        for (const id of [pinned.id, referral.id]) for (const action of ['archive', 'delete']) assert.deepEqual(await call('player_mailbox_manage', { id, action }),
            { ok: false, reason: 'mailbox_protected' });
        assert.equal((await call('player_mailbox_get', { folder: 'archive' })).messages.length, 0);
        assert.equal((await call('player_mailbox_read', { ids: [pinned.id] })).ok, true);
        const restarted = createMailboxStore({ profiles, entries, notices });
        await notices.create({ _id: 'game:newer-than-pinned', type: 'game_notice', text: 'Newer notice', createdAt: Date.now() });
        firstPage = await restarted.get('burst');
        assert.equal(firstPage.messages[0].id, FACEBOOK_NOTICE_ID);
        assert.ok(firstPage.messages[0].readAt);
        assert.equal(firstPage.messages[1].id, REFERRAL_NOTICE_ID);
        assert.equal(firstPage.messages[1].readAt, null, 'Reading Facebook does not mark referrals read');
        assert.equal(firstPage.messages[2].id, 'game:newer-than-pinned');
        assert.equal(firstPage.unread, 1079);
        assert.equal(await notices.countDocuments({ _id: FACEBOOK_NOTICE_ID }), 1);
        assert.equal(await notices.countDocuments({ _id: REFERRAL_NOTICE_ID }), 1);
        assert.equal((await call('player_mailbox_read', { ids: [referral.id] })).ok, true);
        assert.equal((await restarted.get('burst')).unread, 1078);
        assert.equal((await restarted.get('alice')).messages[0].readAt, null, 'Reading the announcement is scoped to the player');

        let lifecycle = 'RELEASE_LIFECYCLE_STATE_APPROVED_NOT_PUBLISHED';
        let rollout = 'completed';
        let versionCode = 115;
        let versionName = '12.5';
        let track = 'production';
        let trackError = false;
        let available = false;
        let notified = 0;
        let edits = 0;
        let discarded = 0;
        const requests = [];
        const apiBase = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.yamb.balkan';
        const request = async (method, url, data) => {
            requests.push([method, url]);
            if (method === 'GET' && url === `${apiBase}/tracks/production/releases`) {
                return { releases: [{ track, releaseLifecycleState: lifecycle, releaseName: versionName,
                    activeArtifacts: [{ versionCode }] }] };
            }
            if (method === 'POST' && url === `${apiBase}/edits`) {
                assert.deepEqual(data, {});
                return { id: `isolated-read-${++edits}` };
            }
            if (method === 'GET' && url.startsWith(`${apiBase}/edits/`) && url.endsWith('/tracks/production')) {
                if (trackError) throw new Error('Test API timeout');
                return { track: 'production', releases: [{ status: rollout, versionCodes: [String(versionCode)],
                    ...(rollout === 'inProgress' ? { userFraction: 0.25 } : {}) }] };
            }
            if (method === 'DELETE' && url.startsWith(`${apiBase}/edits/`)) {
                discarded++;
                return;
            }
            assert.fail(`Unexpected Play request: ${method} ${url}`);
        };
        const createWatcher = () => createPlayUpdateWatcher({ request, notices, baselineVersionCode: 114,
            available: () => available, onPublished: () => notified++ });
        const watcher = createWatcher();
        startPlayUpdateNotices({ environment: 'staging', env: { YAMB_PLAY_UPDATE_NOTICES_ENABLED: 'true' },
            onError: () => assert.fail('Staging must not configure Play access') });
        assert.equal(await watcher.check(), false, 'A disconnected database must skip the Play request');
        assert.equal(requests.length, 0);
        available = true;
        assert.equal(await watcher.check(), false, 'Approval without publication cannot announce');
        assert.equal(edits, 0);
        lifecycle = 'RELEASE_LIFECYCLE_STATE_PUBLISHED';
        track = 'qa';
        assert.equal(await watcher.check(), false, 'An internal track cannot announce');
        track = 'production';
        for (const state of ['inProgress', 'halted', 'draft']) {
            rollout = state;
            assert.equal(await watcher.check(), false, `Reject ${state} rollout`);
        }
        assert.equal(await notices.countDocuments({ type: 'android_update' }), 0);
        rollout = 'completed';
        trackError = true;
        await assert.rejects(watcher.check(), /Test API timeout/);
        assert.equal(edits, discarded, 'Discard the snapshot even after a lookup fails');
        trackError = false;
        assert.deepEqual(await Promise.all([watcher.check(), watcher.check()]), [true, false]);
        assert.equal(notified, 1);
        assert.equal(edits, discarded);
        const updateId = 'game:android-update:115';
        const delivered = (await restarted.get('alice')).messages.find(message => message.id === updateId);
        assert.ok(delivered);
        assert.deepEqual({ name: delivered.versionName, code: delivered.versionCode, action: delivered.action },
            { name: '12.5', code: 115, action: { type: 'update', url: STORE_URL } });
        assert.ok((await restarted.get('bob')).messages.some(message => message.id === updateId && message.readAt === null));
        await restarted.mutate('alice', [updateId], 'read');
        assert.equal(await createWatcher().check(), false, 'Restarted watcher must not duplicate the notice');
        assert.equal(await notices.countDocuments({ _id: updateId, createdAt: delivered.createdAt }), 1);
        assert.ok((await restarted.get('alice')).messages.find(message => message.id === updateId).readAt);
        assert.equal((await restarted.get('bob')).messages.find(message => message.id === updateId).readAt, null);
        versionCode = 114;
        assert.equal(await createWatcher().check(), false, 'Previous release after a rollback must not announce');
        versionCode = 116;
        versionName = 'Summer release';
        const parallel = await Promise.all([createWatcher().check(), createWatcher().check()]);
        assert.equal(parallel.filter(Boolean).length, 1, 'Parallel watchers must publish the next full release once');
        assert.equal((await notices.findById('game:android-update:116').lean()).versionName, '116');
        assert.equal(await notices.countDocuments({ type: 'android_update' }), 2);
        assert.equal(notified, 2);
        console.log('Google Play release notices: published and completed, skip internal/staged/halted/draft or rollback, retry safely, preserve per-player read state.');
        console.log('Pinned Facebook and referral announcements: fixed first/second place, pagination, independent read state, restart and archive/delete protection passed.');
        console.log('Mailbox history: 1,077 messages paged without loss, tied cursors, durable retries, migration, private archive/delete, read badges and UID isolation passed.');
    } finally {
        if (conn.readyState === 1) await conn.dropDatabase();
        await conn.close();
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
