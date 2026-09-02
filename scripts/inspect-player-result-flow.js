const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function getArgument(name) {
    const index = process.argv.indexOf(name);
    return index === -1 ? '' : String(process.argv[index + 1] || '').trim();
}

function currentLeaguePeriod(now = new Date()) {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Europe/Belgrade',
            year: 'numeric',
            month: 'numeric'
        }).formatToParts(now).map(part => [part.type, part.value])
    );
    return { year: Number(parts.year), quarter: Math.floor((Number(parts.month) - 1) / 3) + 1 };
}

function serializeMatch(match) {
    return {
        matchId: match.matchId,
        mode: match.mode,
        resultType: match.resultType,
        verification: match.verification,
        economyEligible: !!match.economyEligible,
        statsComplete: !!match.statsComplete,
        finishedAt: match.finishedAt,
        participants: (match.participants || []).map(participant => ({
            uid: participant.uid,
            score: participant.score,
            result: participant.result
        }))
    };
}

async function main() {
    const uid = getArgument('--uid');
    if (!uid) throw new Error('Obavezan je --uid.');
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI nije konfigurisan.');

    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 });
    const db = mongoose.connection.db;
    const period = currentLeaguePeriod();
    const [profile, matches, diagnostics, scores, leagueScore] = await Promise.all([
        db.collection('userprofiles').findOne(
            { firebaseUid: uid },
            { projection: { playerName: 1, balance: 1, games: 1, wins: 1, losses: 1, totalScoreSum: 1, highscore: 1, leagueData: 1, recentMatchResultIds: 1, claimedGameRewardIds: 1, updatedAt: 1 } }
        ),
        db.collection('matchresults').find(
            { 'participants.uid': uid },
            { projection: { matchId: 1, mode: 1, resultType: 1, verification: 1, economyEligible: 1, statsComplete: 1, finishedAt: 1, createdAt: 1, participants: 1 } }
        ).sort({ finishedAt: -1, createdAt: -1 }).limit(12).toArray(),
        db.collection('matchresultsubmissiondiagnostics').find(
            { uid },
            { projection: { occurredAt: 1, clientResultId: 1, matchId: 1, mode: 1, stage: 1, outcome: 1, reason: 1, duplicate: 1, statsApplied: 1 } }
        ).sort({ occurredAt: -1 }).limit(20).toArray(),
        db.collection('scores').find(
            { $or: [{ playerId: uid }, { uid }] },
            { projection: { score: 1, matchId: 1, mode: 1, date: 1 } }
        ).sort({ date: -1 }).limit(12).toArray(),
        db.collection('leaguescores').findOne(
            { playerId: uid, year: period.year, quarter: period.quarter },
            { projection: { score: 1, date: 1 } }
        )
    ]);

    console.log(JSON.stringify({
        inspectedAt: new Date().toISOString(),
        currentLeaguePeriod: period,
        profile,
        recentMatchResults: matches.map(serializeMatch),
        recentSubmissionDiagnostics: diagnostics,
        recentLeaderboardScores: scores,
        currentLeagueScore: leagueScore
    }, null, 2));
}

main()
    .catch(error => {
        console.error(JSON.stringify({ error: error.message }, null, 2));
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect().catch(() => {});
    });
