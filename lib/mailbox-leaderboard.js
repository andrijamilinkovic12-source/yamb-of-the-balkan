'use strict';

const { createHash } = require('node:crypto');

const PERIODS = ['weekly', 'monthly', 'all_time'];

function leaderboardRecordNotice(previousRecords, entry, periodStarts) {
    if (!entry?.uid || !entry.matchId || !Number.isSafeInteger(entry.score) || entry.score <= 0) return null;
    const playedAt = new Date(entry.date).getTime();
    if (!Number.isFinite(playedAt)) return null;
    const periods = PERIODS.flatMap(period => {
        const start = periodStarts[period];
        if (start && playedAt < new Date(start).getTime()) return [];
        const previous = previousRecords?.[period];
        const previousAt = new Date(previous?.date).getTime();
        const tieChangesLeader = previous && entry.score === previous.score && entry.uid !== previous.uid
            && (playedAt < previousAt || (playedAt === previousAt && entry.uid < previous.uid));
        if (previous && (entry.score < previous.score || (entry.score === previous.score && !tieChangesLeader))) return [];
        return [{ period, change: tieChangesLeader ? 'leader_changed_tie' : !previous ? 'first_record'
            : previous.uid === entry.uid ? 'record_improved' : 'leader_changed',
            previousScore: previous?.score || 0, periodStartedAt: start ? new Date(start).getTime() : null }];
    });
    if (!periods.length) return null;
    const key = createHash('sha256').update(JSON.stringify([entry.uid, entry.matchId])).digest('hex');
    return { id: `game:leaderboard-record:${key}`, type: 'leaderboard_record', createdAt: entry.createdAt,
        leaderboard: { playerId: entry.uid, playerName: String(entry.playerName || '').trim().slice(0, 120), score: entry.score, periods } };
}

async function publishLeaderboardRecordNotice({ scores, notices, changed }, score) {
    if (!score?.mailboxRecordPending || !score.mailboxRecordNotice) return;
    const { id, ...notice } = score.mailboxRecordNotice;
    const saved = await notices.updateOne({ _id: id }, { $setOnInsert: notice }, { upsert: true });
    if (saved.upsertedCount) changed();
    await scores.updateOne({ _id: score._id, mailboxRecordPending: true }, { $set: { mailboxRecordPending: false } });
}

module.exports = { PERIODS, leaderboardRecordNotice, publishLeaderboardRecordNotice };
