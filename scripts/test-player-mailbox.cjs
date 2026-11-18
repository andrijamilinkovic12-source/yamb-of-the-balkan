const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createMail, appendMail, mailboxSnapshot, parseGameNotices, registerPlayerMailbox } = require('../lib/player-mailbox');
const { tournamentChampionNotice, leagueChampionNotice, persistChampionNotice } = require('../lib/mailbox-champions');
const { systemMailboxNotices, FACEBOOK_NOTICE_ID, REFERRAL_NOTICE_ID } = require('../lib/mailbox-system-notices');

async function checkLeagueAnnouncement() {
    const source = fs.readFileSync(require.resolve('../server'), 'utf8').replace(/\r\n/g, '\n');
    const begin = source.indexOf('async function archiveLeagueQuarter(');
    const code = source.slice(begin, source.indexOf('\n}', begin) + 2);
    let settled = false;
    let archive;
    let failPublication = false;
    const published = [];
    const context = {
        Date, isPastLeaguePeriod: () => true,
        getLeagueSettlementInfo: () => ({ settled, settlesAt: new Date(1000) }),
        getLeaguePeriodKey: (year, quarter) => `${year}_Q${quarter}`,
        LeagueHallOfFame: {
            findOne: () => ({ lean: async () => archive }),
            findOneAndUpdate: ({ periodKey }, { $set }) => ({ lean: async () => (archive = { periodKey, ...$set }) })
        },
        fetchTopLeagueScoresForPeriod: async () => [{ playerId: 'winner', playerName: 'Champion', score: 150000 }],
        UserProfile: { findOne: () => ({ lean: async () => ({}) }) },
        toSafeInt: value => Number(value), leagueChampionNotice,
        publishMailboxChampion: async notice => {
            if (failPublication) throw new Error('database_offline');
            if (notice && !published.some(row => row.id === notice.id)) published.push(notice);
        }
    };
    vm.createContext(context);
    vm.runInContext(code, context);
    assert.equal(await context.archiveLeagueQuarter(2026, 3), null);
    assert.equal(published.length, 0, 'Unsettled quarter is not announced');
    settled = true;
    failPublication = true;
    await assert.rejects(context.archiveLeagueQuarter(2026, 3), /database_offline/);
    assert.ok(archive, 'Settled archive survives a notification write failure');
    failPublication = false;
    await context.archiveLeagueQuarter(2026, 3);
    await context.archiveLeagueQuarter(2026, 3);
    assert.equal(published.length, 1, 'Repeated archive loads recover publication without duplicates');
    assert.equal(published[0].champion.playerName, 'Champion');
    assert.equal(published[0].createdAt, archive.archivedAt);
}

async function main() {
    const permanent = systemMailboxNotices(100);
    assert.deepEqual(permanent.map(row => row.id), [FACEBOOK_NOTICE_ID, REFERRAL_NOTICE_ID]);
    assert.ok(permanent.every(row => row.pinned && row.protected));
    assert.equal(permanent[1].type, 'referral_invite');
    assert.equal(permanent[1].action, undefined, 'Referral notice does not open Facebook');
    const ordered = mailboxSnapshot([{ ...permanent[1], createdAt: 999 }, { id: 'ordinary', createdAt: 2000 },
        { ...permanent[0], createdAt: 1 }, { id: 'other-pinned', pinned: true, createdAt: 3000 }]).messages;
    assert.deepEqual(ordered.map(row => row.id), [FACEBOOK_NOTICE_ID, REFERRAL_NOTICE_ID, 'other-pinned', 'ordinary']);
    const hooks = new Map();
    const socket = { connected: true, on: (event, listener) => hooks.set(event, listener) };
    const personal = createMail('friend_accepted', { fromUid: 'private-uid', fromName: '<Player>' }, 'friend-test');
    const announcements = parseGameNotices(JSON.stringify([
        { id: 'update', text: 'Game update', createdAt: 100 },
        { id: 'future', text: 'Scheduled update', createdAt: Date.now() + 60000 }
    ]));
    let uid = null;
    const published = new Map();
    const lookups = [];
    const projections = [];
    const updates = [];
    const notified = [];
    const readByUid = new Map();
    const profiles = {
        findOne(filter) {
            lookups.push(filter);
            return { select: fields => {
                projections.push(fields);
                return { lean: async () => ({ playerMailbox: [personal], readMailboxGameNotices: readByUid.get(filter.firebaseUid) || ['game:update'] }) };
            } };
        },
        async updateOne(...args) {
            updates.push(args);
            const [filter, update] = args;
            if (update.$addToSet) readByUid.set(filter.firebaseUid,
                [...new Set([...(readByUid.get(filter.firebaseUid) || ['game:update']), ...update.$addToSet.readMailboxGameNotices.$each])]);
            return { modifiedCount: Number(updates.length === 1) };
        }
    };
    registerPlayerMailbox(socket, { profiles, verifiedUid: () => uid, available: () => true, gameNotices: announcements,
        notify: account => notified.push(account),
        ownerUid: 'owner', loadOfficialNotices: async () => [...published.values()],
        publishOfficialNotice: async notice => { if (!published.has(notice.id)) published.set(notice.id, notice); } });
    const call = (name, payload) => new Promise(resolve => hooks.get(name)(payload, resolve));
    assert.deepEqual(await call('player_mailbox_get', { firebaseUid: 'other' }), { ok: false });
    assert.equal(lookups.length, 0);
    uid = 'verified-account';
    const inbox = await call('player_mailbox_get', { firebaseUid: 'other' });
    assert.deepEqual(lookups, [{ firebaseUid: uid }]);
    assert.equal(inbox.recipientUid, uid);
    assert.equal(inbox.unread, 1);
    assert.deepEqual(inbox.messages.map(message => message.id), ['friend-test', 'game:update']);
    assert.equal(inbox.messages[0].fromUid, undefined);
    assert.equal(inbox.messages[0].fromName, '<Player>');
    const summary = await call('player_mailbox_get', { summary: true, firebaseUid: 'other' });
    assert.equal(summary.unread, inbox.unread);
    assert.equal(summary.recipientUid, uid);
    assert.equal(Object.hasOwn(summary, 'messages'), false);
    assert.equal(projections.at(-1), 'playerMailbox.id playerMailbox.createdAt playerMailbox.readAt readMailboxGameNotices');
    assert.equal((await call('player_mailbox_read', { ids: ['friend-test', 'game:update', 'game:future'], firebaseUid: 'other' })).ok, true);
    assert.ok(updates.every(([filter]) => filter.firebaseUid === uid));
    assert.deepEqual(updates[0][2].arrayFilters, [{ 'message.id': { $in: ['friend-test'] }, 'message.readAt': null }]);
    assert.deepEqual(updates[1][1], { $addToSet: { readMailboxGameNotices: { $each: ['game:update'] } } });
    assert.equal((await call('player_mailbox_read', { ids: ['friend-test'] })).ok, true);
    assert.deepEqual(notified, [uid]);
    assert.deepEqual(await call('player_mailbox_read', { ids: ['<invalid>'] }), { ok: false });
    assert.equal(appendMail(personal).$slice, undefined, 'Delivery outbox must not discard older messages');
    assert.equal(mailboxSnapshot(Array.from({ length: 110 }, (_, index) => ({ ...personal, createdAt: index }))).messages.length, 110);
    assert.throws(() => parseGameNotices('{"id":"invalid"}'));
    const facebook = { id: 'facebook', text: 'Follow our page.', createdAt: 100,
        action: { type: 'facebook', url: 'https://www.facebook.com/profile.php?id=61588191682382' } };
    assert.equal(parseGameNotices(JSON.stringify([facebook]))[0].action.url, facebook.action.url);
    for (const url of ['https://www.facebook.com/profile.php?id=61588191682382&next=https://example.com',
        'https://www.facebook.com.evil.example/profile.php?id=61588191682382',
        'https://www.facebook.com/profile.php?id=not-a-number']) {
        assert.throws(() => parseGameNotices(JSON.stringify([{ ...facebook, action: { type: 'facebook', url } }])));
    }
    const announcement = { requestId: 'a'.repeat(36), title: 'Update', text: 'New version.', action: {
        type: 'update', url: 'https://play.google.com/store/apps/details?id=com.yamb.balkan' } };
    assert.deepEqual(await call('player_mailbox_publish', announcement), { ok: false });
    uid = 'owner';
    assert.equal((await call('player_mailbox_publish', { ...announcement, action: { type: 'facebook', url: 'https://facebook.com.evil.example/a' } })).reason, 'publish_invalid');
    assert.equal((await call('player_mailbox_publish', { ...announcement, action: { type: 'update', url: 'https://play.google.com/store/apps/details?id=com.other' } })).reason, 'publish_invalid');
    assert.equal((await call('player_mailbox_publish', announcement)).ok, true);
    assert.equal((await call('player_mailbox_publish', { ...announcement, title: 'Duplicate' })).ok, true);
    assert.equal(published.size, 1);
    uid = 'reader';
    const sent = (await call('player_mailbox_get', {})).messages.find(message => message.title === 'Update');
    assert.deepEqual(sent.action, announcement.action);
    assert.equal(sent.readAt, null);
    const champion = tournamentChampionNotice({ tournamentNumber: 12, tournamentCycleId: 'season-12',
        winnerId: 'winner-private', winnerName: 'Test champion', wonAt: Date.now() });
    const league = leagueChampionNotice({ year: 2026, quarter: 3, archivedAt: Date.now(),
        champion: { playerId: 'league-private', playerName: 'League champion', score: 150000 } });
    assert.equal(tournamentChampionNotice({ tournamentNumber: 12, winnerId: 'deleted_user', wonAt: Date.now() }), null);
    assert.equal(leagueChampionNotice({ year: 2026, quarter: 5, champion: { playerId: 'winner', score: 5 } }), null);
    const collection = { async updateOne({ _id }, { $setOnInsert: document }, options) {
        assert.equal(options.upsert, true);
        const inserted = !published.has(_id);
        if (inserted) published.set(_id, { id: _id, ...document });
        return { upsertedCount: Number(inserted) };
    } };
    assert.equal(await persistChampionNotice(collection, champion), true);
    assert.equal(await persistChampionNotice(collection, { ...champion, createdAt: Date.now() + 2 }), false);
    assert.equal(await persistChampionNotice(collection, league), true);
    assert.equal(await persistChampionNotice(collection, league), false);
    for (const account of ['reader', 'different-account', 'previously-offline']) {
        uid = account;
        const received = await call('player_mailbox_get', {});
        for (const entry of [champion, league]) {
            const mail = received.messages.find(message => message.id === entry.id);
            assert.equal(mail.type, entry.type);
            assert.equal(mail.champion.playerName, entry.champion.playerName);
            assert.equal(mail.champion.playerId, undefined);
            assert.equal(mail.readAt, null);
        }
    }
    uid = 'reader';
    assert.equal((await call('player_mailbox_read', { ids: [champion.id, league.id] })).ok, true);
    assert.ok((await call('player_mailbox_get', {})).messages.find(row => row.id === champion.id).readAt);
    uid = 'previously-offline';
    assert.equal((await call('player_mailbox_get', {})).messages.find(row => row.id === champion.id).readAt, null);
    console.log('Public champions: unique tournament/quarter notices reach all accounts with private read state.');
    await checkLeagueAnnouncement();
    console.log('Player Mailbox: server-owned unread count, UID isolation, read scope, public announcements and payload validation passed.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
