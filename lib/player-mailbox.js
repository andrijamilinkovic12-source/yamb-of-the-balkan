'use strict';

const { randomUUID } = require('node:crypto');
const { compareMailboxMessages } = require('./mailbox-system-notices');

const MAILBOX_LIMIT = 100;
const TYPES = new Set(['friend_request', 'friend_accepted', 'friend_declined',
    'tournament_winner', 'tournament_finalist', 'tournament_unplayed', 'tournament_match_warning', 'tournament_event', 'league_reward', 'game_notice',
    'tournament_champion', 'league_champion', 'leaderboard_record', 'league_rank_changed',
    'power_index_milestone', 'fire_streak_milestone', 'fire_streak_ended', 'facebook_follow', 'referral_invite', 'referral_reward',
    'moderation_resolved', 'moderation_dismissed', 'support_reply']);

function createMail(type, details = {}, id = randomUUID()) {
    if (!TYPES.has(type)) throw new TypeError('Unknown mailbox message type');
    return {
        id, type, createdAt: Date.now(),
        ...(details.fromUid ? { fromUid: details.fromUid, fromName: String(details.fromName || '').slice(0, 120) } : {}),
        ...(Number.isSafeInteger(details.reward) ? { reward: details.reward } : {}),
        ...(Number.isSafeInteger(details.rank) ? { rank: details.rank } : {}),
        ...(details.text ? { text: String(details.text).slice(0, 550) } : {}),
        ...(details.reference ? { reference: details.reference } : {}),
        ...(details.tournament ? { tournament: details.tournament } : {}),
        ...(details.tournamentWarning ? { tournamentWarning: details.tournamentWarning } : {}),
        ...(details.tournamentEvent ? { tournamentEvent: details.tournamentEvent } : {}),
        ...(details.leagueRank ? { leagueRank: details.leagueRank } : {}),
        ...(details.statistics ? { statistics: details.statistics } : {})
    };
}

function appendMail(entry) {
    // Durable history is drained into PlayerMailboxEntry; never discard an
    // undelivered message just because a profile outbox reached 100 entries.
    return { $each: [entry], $position: 0 };
}

function parseNoticeAction(action) {
    if (action === undefined) return undefined;
    const url = new URL(typeof action?.url === 'string' && action.url.length <= 300 ? action.url : '');
    if (url.protocol === 'https:' && !url.username && !url.password && !url.port && !url.hash) {
        if (action.type === 'facebook' && ['facebook.com', 'www.facebook.com', 'm.facebook.com'].includes(url.hostname)
            && ((/^\/[\w.-]+\/?$/.test(url.pathname) && !url.search)
                || (url.pathname === '/profile.php' && /^\?id=\d{5,25}$/.test(url.search)))) return { type: action.type, url: url.href };
        if (action.type === 'update' && url.hostname === 'play.google.com' && url.pathname === '/store/apps/details'
            && url.search === '?id=com.yamb.balkan') return { type: action.type, url: url.href };
    }
    throw new TypeError('Invalid player mailbox announcement action');
}

function parseGameNotices(source) {
    if (!source) return [];
    const notices = JSON.parse(source);
    if (!Array.isArray(notices) || notices.length > 20) throw new TypeError('Invalid player mailbox announcements');
    const unique = new Set();
    return notices.map(notice => {
        if (typeof notice?.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(notice.id) || unique.has(notice.id)
            || typeof notice.text !== 'string' || !notice.text.trim() || notice.text.length > 550
            || (notice.title !== undefined && (typeof notice.title !== 'string' || !notice.title.trim() || notice.title.length > 100))
            || !Number.isSafeInteger(notice.createdAt) || notice.createdAt < 0) throw new TypeError('Invalid player mailbox announcement');
        unique.add(notice.id);
        return { ...createMail('game_notice', { text: notice.text.trim() }, `game:${notice.id}`),
            title: notice.title?.trim(), action: parseNoticeAction(notice.action), createdAt: notice.createdAt };
    });
}

function mailboxSnapshot(entries = []) {
    const messages = entries.map(({ id, type, fromName, reward, rank, text, title, action, reference, tournament, tournamentWarning, tournamentEvent, champion, leaderboard, leagueRank, statistics, createdAt, readAt, archived, pinned, protected: isProtected, versionCode, versionName }) =>
        ({ id, type, fromName, reward, rank, text, title, action: action?.type ? action : undefined, reference, tournament, tournamentWarning, leagueRank, createdAt, readAt, archived,
            ...(type === 'android_update' ? { versionCode, versionName } : {}),
            ...(type === 'tournament_event' && tournamentEvent ? { tournamentEvent } : {}),
            ...(pinned === true ? { pinned: true } : {}), ...(isProtected === true ? { protected: true } : {}),
            ...(leaderboard ? { leaderboard: { playerName: leaderboard.playerName, score: leaderboard.score, periods: leaderboard.periods } } : {}),
            ...(statistics ? { statistics: { milestone: statistics.milestone, value: statistics.value,
                next: statistics.next, best: statistics.best } } : {}),
            ...(champion ? { champion: { playerName: champion.playerName, tournamentNumber: champion.tournamentNumber,
                ...(champion.runnerUpName ? { runnerUpName: champion.runnerUpName, resultType: champion.resultType, finalScore: champion.finalScore } : {}),
                year: champion.year, quarter: champion.quarter, score: champion.score } } : {}) }))
        .sort(compareMailboxMessages);
    return { messages, unread: messages.filter(message => !message.readAt).length };
}

function registerPlayerMailbox(socket, { profiles, store, verifiedUid, available, gameNotices = [], loadOfficialNotices = async () => [],
    publishOfficialNotice, ownerUid = '', notify }) {
    const officialNotices = async (summary = false) => [...gameNotices, ...await loadOfficialNotices(summary)]
        .filter(notice => notice.createdAt <= Date.now());
    socket.on('player_mailbox_get', async (data, ack) => {
        if (typeof ack !== 'function') return;
        const uid = verifiedUid(socket);
        if (!uid || !available()) return ack({ ok: false });
        const summary = data?.summary === true;
        try {
            if (store) {
                const snapshot = await store.get(uid, { summary, folder: data?.folder, before: data?.before });
                if (socket.connected && verifiedUid(socket) === uid) return ack({ ok: true, recipientUid: uid,
                    supportOwner: uid === ownerUid, supportAvailable: !!ownerUid, ...snapshot });
                return ack({ ok: false });
            }
            const [profile, notices] = await Promise.all([
                profiles.findOne({ firebaseUid: uid }).select(summary
                    ? 'playerMailbox.id playerMailbox.createdAt playerMailbox.readAt readMailboxGameNotices'
                    : 'playerMailbox readMailboxGameNotices').lean(), officialNotices(summary)
            ]);
            if (profile && socket.connected && verifiedUid(socket) === uid) {
                const read = new Set(profile.readMailboxGameNotices);
                const global = notices.map(notice => ({ ...notice, readAt: read.has(notice.id) ? notice.createdAt || 1 : null }));
                const snapshot = mailboxSnapshot([...(profile.playerMailbox || []), ...global]);
                return ack({ ok: true, recipientUid: uid, unread: snapshot.unread, supportOwner: uid === ownerUid,
                    supportAvailable: !!ownerUid, ...(summary ? {} : { messages: snapshot.messages }) });
            }
        } catch (_) { /* The client offers retry and keeps the current unread state. */ }
        ack({ ok: false });
    });

    socket.on('player_mailbox_read', async (data, ack) => {
        if (typeof ack !== 'function') return;
        const uid = verifiedUid(socket);
        if (!uid || !available() || !Array.isArray(data?.ids) || !data.ids.length || data.ids.length > MAILBOX_LIMIT
            || !data.ids.every(id => typeof id === 'string' && /^[a-zA-Z0-9:_-]{1,120}$/.test(id))) return ack({ ok: false });
        try {
            if (store) {
                await store.mutate(uid, data.ids, 'read');
                ack({ ok: verifiedUid(socket) === uid });
                notify?.(uid);
                return;
            }
            const gameIds = data.ids.some(id => id.startsWith('game:'))
                ? (await officialNotices(true)).filter(notice => data.ids.includes(notice.id)).map(notice => notice.id) : [];
            const personal = data.ids.filter(id => !id.startsWith('game:'));
            let changed = false;
            if (personal.length) {
                const result = await profiles.updateOne({ firebaseUid: uid, playerMailbox: { $elemMatch: { id: { $in: personal }, readAt: null } } },
                    { $set: { 'playerMailbox.$[message].readAt': Date.now() } },
                    { arrayFilters: [{ 'message.id': { $in: personal }, 'message.readAt': null }] });
                changed = result.modifiedCount > 0;
            }
            if (gameIds.length) {
                const result = await profiles.updateOne({ firebaseUid: uid }, { $addToSet: { readMailboxGameNotices: { $each: gameIds } } });
                changed ||= result.modifiedCount > 0;
            }
            ack({ ok: verifiedUid(socket) === uid });
            if (changed) notify?.(uid);
        } catch (_) {
            ack({ ok: false });
        }
    });

    socket.on('player_mailbox_manage', async (data, ack) => {
        if (typeof ack !== 'function') return;
        const uid = verifiedUid(socket);
        if (!uid || !available() || !store || !['archive', 'restore', 'delete'].includes(data?.action)
            || typeof data.id !== 'string' || !/^[a-zA-Z0-9:_-]{1,120}$/.test(data.id)) return ack({ ok: false });
        try {
            await store.mutate(uid, [data.id], data.action);
            ack({ ok: verifiedUid(socket) === uid, recipientUid: uid });
            notify?.(uid);
        } catch (error) { ack({ ok: false, ...(error.code === 'mailbox_protected' ? { reason: 'mailbox_protected' } : {}) }); }
    });

    socket.on('player_mailbox_publish', async (data, ack) => {
        if (typeof ack !== 'function') return;
        if (!ownerUid || verifiedUid(socket) !== ownerUid || !available() || !publishOfficialNotice) return ack({ ok: false });
        const id = data?.requestId;
        if (typeof id !== 'string' || !/^[a-f0-9]{36}$/.test(id)) return ack({ ok: false });
        let notice;
        try {
            if (!data.title?.trim()) return ack({ ok: false, reason: 'publish_invalid' });
            [notice] = parseGameNotices(JSON.stringify([{ id: `published-${id}`, title: data.title, text: data.text,
                action: data.action, createdAt: Date.now() }]));
        } catch (_) { return ack({ ok: false, reason: 'publish_invalid' }); }
        try {
            await publishOfficialNotice(notice);
            ack(verifiedUid(socket) === ownerUid ? { ok: true, recipientUid: ownerUid } : { ok: false });
        } catch (_) { ack({ ok: false }); }
    });
}

module.exports = { createMail, appendMail, parseGameNotices, mailboxSnapshot, registerPlayerMailbox, MAILBOX_LIMIT };
