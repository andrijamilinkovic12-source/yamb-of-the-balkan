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
        projection: { _id: 0, eventId: 1, matchId: 1, mode: 1, occurredAt: 1, resolvedAt: 1,
            playerName: 1, opponentName: 1, trigger: 1, socketReason: 1, reasonClass: 1,
            graceMs: 1, outcome: 1, reconnectDurationMs: 1, clientConnectionType: 1 }
    }).sort({ occurredAt: 1 }).limit(150).toArray();
    const matches = await db.collection('matchresults').find(query, {
        projection: { _id: 0, matchId: 1, mode: 1, resultType: 1, reason: 1,
            startedAt: 1, finishedAt: 1, createdAt: 1 }
    }).limit(20).toArray();
    console.log(JSON.stringify({ incidents, matches }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; })
    .finally(() => mongoose.disconnect());
