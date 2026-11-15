'use strict';
// Disposable local QA replica set only; never loads .env or contacts a player.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const { removeFriendship } = require('../lib/friendships');
const { createProfileWrites } = require('../lib/profile-writes');
const { createMail, appendMail } = require('../lib/player-mailbox');

async function main() {
    const port = Number(process.env.YAMB_CHAT_TEST_MONGO_PORT);
    assert(Number.isInteger(port) && port > 1024 && port < 65536, 'Dedicated local Mongo port required');
    const conn = mongoose.createConnection(`mongodb://127.0.0.1:${port}/?directConnection=true`, {
        dbName: 'yamb_friend_removal_qa_' + randomUUID().replaceAll('-', ''), serverSelectionTimeoutMS: 4000
    });
    try {
        await conn.asPromise();
        const hello = await conn.db.admin().command({ hello: 1 });
        assert(hello.isWritablePrimary && hello.setName === 'yamb-test-chat');
        const profiles = conn.model('UserProfile', new mongoose.Schema({ firebaseUid: { type: String, unique: true },
            playerName: String, friends: [String], friendRequests: [String],
            friendNotifications: [mongoose.Schema.Types.Mixed], playerMailbox: [mongoose.Schema.Types.Mixed],
            highscore: Number, balance: Number, h2hStats: mongoose.Schema.Types.Mixed }));
        await profiles.init();
        await profiles.create([
            { firebaseUid: 'alice', playerName: 'Alice', friends: ['bob', 'charlie'], friendRequests: ['bob', 'charlie'],
                friendNotifications: [{ fromUid: 'bob', type: 'accepted' }, { fromUid: 'charlie', type: 'accepted' }],
                playerMailbox: [createMail('friend_accepted', { fromUid: 'bob', fromName: 'Bob' }, 'old-mail')],
                highscore: 1200, balance: 4567, h2hStats: { bob: { wins: 4, name: 'Bob' } } },
            { firebaseUid: 'bob', playerName: 'Bob', friends: ['alice'], friendRequests: ['alice'],
                friendNotifications: [{ fromUid: 'alice', type: 'accepted' }] },
            { firebaseUid: 'charlie', playerName: 'Charlie', friends: ['alice', 'dave'] },
            { firebaseUid: 'dave', playerName: 'Dave', friends: ['charlie'] }
        ]);
        const source = fs.readFileSync(require.resolve('../server'), 'utf8');
        const begin = source.indexOf("    socket.on('send_friend_req',");
        const end = source.indexOf("    socket.on('get_friends_list',", begin);
        assert(begin > 0 && end > begin);
        const events = [], mailboxNotices = [], sockets = new Map();
        const io = { sockets: { sockets }, to: id => ({ emit: (name, data) => events.push({ id, name, data }) }) };
        const writes = createProfileWrites();
        const client = (id, uid) => {
            const hooks = new Map();
            const socket = { id, verifiedUid: uid, playerId: uid, connected: true,
                on: (name, fn) => hooks.set(name, fn), emit: (name, data) => events.push({ id, name, data }) };
            sockets.set(id, socket);
            vm.runInNewContext(source.slice(begin, end), { socket, MONGO_URI: 'local-test-only',
                mongoose: { connection: conn }, UserProfile: profiles, profileWrites: writes, removeFriendship,
                getVerifiedUid: s => s.verifiedUid, getSocketUid: id => sockets.get(id)?.verifiedUid,
                getConnectedFriendSocketId: uid => [...sockets.values()].find(s => s.verifiedUid === uid)?.id || '',
                createMail, appendMail, notifyPlayerMailbox: uid => mailboxNotices.push(uid), io,
                console: { error() {} } });
            return { socket, call: (name, data) => new Promise(resolve => hooks.get(name)(data, resolve)) };
        };
        const alice = client('alice-phone', 'alice');
        client('alice-other-device', 'alice');
        const bob = client('bob-phone', 'bob');
        client('charlie-phone', 'charlie');
        const guest = client('guest', null);
        guest.socket.playerId = 'alice';
        assert.equal((await guest.call('remove_friend', { targetUid: 'bob', uid: 'alice' })).reason, 'err_friend_auth_required');
        for (const targetUid of ['alice', '<invalid>', {}, '']) assert.equal((await alice.call('remove_friend', { targetUid })).ok, false);
        assert.equal((await alice.call('remove_friend', { targetUid: 'dave', uid: 'charlie' })).removed, false);
        assert.ok((await profiles.findOne({ firebaseUid: 'charlie' })).friends.includes('dave'));

        const update = profiles.updateOne;
        profiles.updateOne = function (filter, ...args) {
            if (filter.firebaseUid === 'bob') throw new Error('qa_second_write_failed');
            return update.call(this, filter, ...args);
        };
        assert.equal((await alice.call('remove_friend', { targetUid: 'bob' })).ok, false);
        profiles.updateOne = update;
        assert.ok((await profiles.findOne({ firebaseUid: 'alice' })).friends.includes('bob'), 'Second-write failure rolls back both accounts');
        assert.equal(events.length, 0);

        const removed = await alice.call('remove_friend', { targetUid: 'bob' });
        assert.equal(removed.ok, true);
        assert.equal(removed.recipientUid, 'alice');
        assert.equal(removed.removed, true);
        let a = await profiles.findOne({ firebaseUid: 'alice' }).lean();
        let b = await profiles.findOne({ firebaseUid: 'bob' }).lean();
        assert.deepEqual(a.friends, ['charlie']);
        assert.deepEqual(b.friends, []);
        assert.deepEqual(a.friendRequests, ['charlie']);
        assert.deepEqual(b.friendRequests, []);
        assert.deepEqual(a.friendNotifications.map(n => n.fromUid), ['charlie']);
        assert.deepEqual(b.friendNotifications, []);
        assert.equal(a.highscore, 1200);
        assert.equal(a.balance, 4567);
        assert.equal(a.h2hStats.bob.wins, 4);
        assert.equal(a.playerMailbox.length, 1, 'No deletion message is created; historic messages remain');
        assert.equal(b.playerMailbox.length, 0);
        assert.deepEqual(mailboxNotices, []);
        assert.equal(events.length, 2, 'Only the other account/device receive a silent refresh signal');
        assert.ok(events.every(e => e.name === 'friendships_changed' && Object.keys(e.data).join() === 'recipientUid'));
        assert.equal((await bob.call('resolve_friend_req', { challengerUid: 'alice', accepted: true })).ok, false,
            'A stale accepted popup cannot resurrect the friendship');

        // Online Players uses the same send/accept endpoints. No friendship is
        // granted until a fresh request is explicitly accepted again.
        assert.equal((await alice.call('send_friend_req', { targetUid: 'bob' })).status, 'sent');
        b = await profiles.findOne({ firebaseUid: 'bob' }).lean();
        assert.deepEqual(b.friendRequests, ['alice']);
        assert.equal(b.friends.includes('alice'), false);
        assert.equal((await alice.call('remove_friend', { targetUid: 'bob' })).removed, false);
        assert.deepEqual((await profiles.findOne({ firebaseUid: 'bob' })).friendRequests.toObject(), ['alice'],
            'Retrying an old removal does not cancel the new request');
        assert.equal((await bob.call('resolve_friend_req', { challengerUid: 'alice', accepted: true })).ok, true);
        assert.ok((await profiles.findOne({ firebaseUid: 'alice' })).friends.includes('bob'));
        assert.ok((await profiles.findOne({ firebaseUid: 'bob' })).friends.includes('alice'));
        events.length = 0;
        mailboxNotices.length = 0;
        const concurrent = await Promise.all([alice.call('remove_friend', { targetUid: 'bob' }), bob.call('remove_friend', { targetUid: 'alice' })]);
        assert.equal(concurrent.filter(r => r.removed).length, 1);
        assert.equal(events.length, 2);
        assert.deepEqual(mailboxNotices, []);
        assert.ok(!(await profiles.findOne({ firebaseUid: 'bob' })).friends.includes('alice'));
        // Offline peers must read the same persistent relationship after login.
        sockets.delete('bob-phone');
        await profiles.updateOne({ firebaseUid: 'alice' }, { $addToSet: { friends: 'bob' } });
        await profiles.updateOne({ firebaseUid: 'bob' }, { $addToSet: { friends: 'alice' } });
        events.length = 0;
        assert.equal((await alice.call('remove_friend', { targetUid: 'bob' })).removed, true);
        assert.equal(events.length, 1, 'An offline peer needs no live socket for removal');
        client('bob-after-login', 'bob');
        assert.deepEqual((await profiles.findOne({ firebaseUid: 'bob' })).friends.toObject(), []);
        await profiles.updateOne({ firebaseUid: 'alice' }, { $addToSet: { friends: 'deleted-peer' } });
        assert.equal((await alice.call('remove_friend', { targetUid: 'deleted-peer' })).removed, true,
            'A ghost card can be removed even if the former peer profile no longer exists');
        assert.ok(!(await profiles.findOne({ firebaseUid: 'alice' })).friends.includes('deleted-peer'));
        console.log('Friend removal: verified owner, bilateral atomic removal, rollback, silent multi-device refresh, unchanged history, stale accepts, retries and new request + acceptance passed.');
    } finally {
        if (conn.readyState === 1) await conn.dropDatabase();
        await conn.close();
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
