// Read-only incident inspection. Never changes profiles, results or diagnostics.
const mongoose = require('mongoose');
require('dotenv').config({ quiet: true });

async function main() {
    const refs = process.argv.slice(2);
    if (!refs.length || refs.some(ref => !/^[a-zA-Z0-9-]{8,128}$/.test(ref))) {
        throw new Error('Supply one or more match IDs (at least 8 alphanumeric characters).');
    }
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured.');
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    const db = mongoose.connection.db;
    const query = { matchId: { $in: refs.map(ref => new RegExp(ref)) } };
    const incidents = await db.collection('disconnectdiagnostics').find(query, {
        projection: { _id: 0, eventId: 1, roomId: 1, matchId: 1, mode: 1, occurredAt: 1, resolvedAt: 1,
            playerName: 1, opponentName: 1, trigger: 1, socketReason: 1, reasonClass: 1,
            graceMs: 1, outcome: 1, reconnectDurationMs: 1, clientConnectionType: 1,
            clientLifecycleSource: 1, clientOnlineAtDisconnect: 1, matchStartedAt: 1,
            clientLifecycleEpisodeId: 1, clientLifecycleSeq: 1, clientNativeConfirmed: 1,
            clientNativeActive: 1, clientVisibilityState: 1, subsequentSocketReason: 1,
            socketDisconnectedAt: 1, resolutionReason: 1, winnerConnectedAtResolution: 1,
            reconnectTurnKey: 1, reconnectBudgetMs: 1, reconnectBudgetUsedMsAtStart: 1,
            reconnectBudgetRemainingMsAtStart: 1, matchAgeMs: 1, moveCount: 1,
            clientDisconnectReason: 1, clientReconnectTransport: 1 }
    }).sort({ occurredAt: 1 }).limit(150).toArray();
    const matches = await db.collection('matchresults').find(query, {
        projection: { _id: 0, matchId: 1, mode: 1, resultType: 1, reason: 1,
            startedAt: 1, finishedAt: 1, createdAt: 1 }
    }).limit(20).toArray();
    console.log(JSON.stringify({ incidents, matches }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; })
    .finally(() => mongoose.disconnect());
