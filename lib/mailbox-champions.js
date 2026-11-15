'use strict';

const { createHash } = require('node:crypto');

function tournamentChampionNotice(record) {
    if (!record || !Number.isSafeInteger(record.tournamentNumber) || record.tournamentNumber < 1
        || !record.winnerId || record.winnerId.startsWith('deleted_')) return null;
    const createdAt = new Date(record.wonAt).getTime();
    if (!Number.isFinite(createdAt)) return null;
    const key = createHash('sha256').update(JSON.stringify([record.tournamentCycleId || '', record.tournamentNumber])).digest('hex');
    return { id: `game:champion-tournament:${key}`, type: 'tournament_champion', createdAt,
        champion: { playerId: record.winnerId, playerName: String(record.winnerName || '').trim().slice(0, 120),
            tournamentNumber: record.tournamentNumber } };
}

function leagueChampionNotice(archive) {
    const champion = archive?.champion;
    if (!champion?.playerId || !Number.isInteger(archive.year) || !Number.isInteger(archive.quarter)
        || archive.quarter < 1 || archive.quarter > 4 || !Number.isSafeInteger(champion.score) || champion.score < 0) return null;
    const createdAt = new Date(archive.archivedAt).getTime();
    if (!Number.isFinite(createdAt)) return null;
    return { id: `game:champion-league:${archive.year}-Q${archive.quarter}`, type: 'league_champion', createdAt,
        champion: { playerId: champion.playerId, playerName: String(champion.playerName || '').trim().slice(0, 120),
            year: archive.year, quarter: archive.quarter, score: champion.score } };
}

async function persistChampionNotice(collection, notice, options = {}) {
    if (!notice) return false;
    const { id, ...entry } = notice;
    const result = await collection.updateOne({ _id: id }, { $setOnInsert: entry }, { ...options, upsert: true });
    return result.upsertedCount === 1;
}

module.exports = { tournamentChampionNotice, leagueChampionNotice, persistChampionNotice };
