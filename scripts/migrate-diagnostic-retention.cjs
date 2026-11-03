'use strict';

// Explicit release migration for Atlas deployments that reject collMod.
// Dry run by default. Never reads .env; the database must be named explicitly.
const fs = require('node:fs');
const { MongoClient } = require('mongodb');
const TTL = 30 * 86400;
const COLLECTIONS = ['disconnectdiagnostics', 'matchresultsubmissiondiagnostics'];

async function migrateDiagnosticRetention(db, apply = false) {
    const results = [];
    for (const name of COLLECTIONS) {
        const collection = db.collection(name);
        let indexes;
        try { indexes = await collection.listIndexes().toArray(); }
        catch (error) { if (error.code !== 26) throw error; indexes = []; }
        const existing = indexes.find(i => i.key.occurredAt === 1 && Object.keys(i.key).length === 1);
        if (existing?.expireAfterSeconds === TTL) {
            results.push({ collection: name, status: 'already_configured' });
            continue;
        }
        // Never remove an index with extra semantics such as uniqueness,
        // partial filtering, custom collation, or sparse/hidden behavior.
        if (existing && (existing.unique || existing.sparse || existing.hidden || existing.partialFilterExpression || existing.collation)) {
            throw new Error('diagnostic_index_requires_manual_review');
        }
        const expiredCount = await collection.countDocuments({ occurredAt: { $type: 'date', $lt: new Date(Date.now() - TTL * 1000) } });
        if (!apply) {
            results.push({ collection: name, status: 'migration_required', expiredCount });
            continue;
        }
        const beforeCount = await collection.countDocuments({});
        if (existing) await collection.dropIndex(existing.name);
        try {
            await collection.createIndex({ occurredAt: 1 }, { name: existing?.name || 'occurredAt_1', expireAfterSeconds: TTL });
        } catch (error) {
            // Restore the original lookup index if rebuilding fails. Documents
            // are never dropped or rewritten by this script.
            if (existing) {
                const options = { name: existing.name };
                if (existing.expireAfterSeconds !== undefined) options.expireAfterSeconds = existing.expireAfterSeconds;
                try { await collection.createIndex(existing.key, options); }
                catch (_) { throw Object.assign(new Error('diagnostic_index_restore_failed'), { code: 'diagnostic_index_restore_failed' }); }
            }
            throw error;
        }
        const verified = await collection.listIndexes().toArray();
        if (!verified.some(i => i.key.occurredAt === 1 && Object.keys(i.key).length === 1 && i.expireAfterSeconds === TTL)) {
            throw new Error('diagnostic_retention_verification_failed');
        }
        results.push({ collection: name, status: 'configured', beforeCount, expiredCount });
    }
    return results;
}

async function main() {
    const arg = flag => process.argv[process.argv.indexOf(flag) + 1];
    if (!process.argv.includes('--connection-file') || !process.argv.includes('--expected-db')) throw new Error('explicit_connection_and_database_required');
    const config = JSON.parse(fs.readFileSync(arg('--connection-file'), 'utf8').replace(/^\uFEFF/, ''));
    const expected = arg('--expected-db');
    let uri;
    try { uri = new URL(config.uri); } catch (_) { throw new Error('invalid_connection'); }
    if (!expected || config.dbName !== expected || decodeURIComponent(uri.pathname.slice(1)) !== expected || !/^mongodb(?:\+srv)?:$/.test(uri.protocol)) throw new Error('database_mismatch');
    const client = new MongoClient(config.uri, { serverSelectionTimeoutMS: 10000 });
    try {
        await client.connect();
        console.log(JSON.stringify({ database: expected, applied: process.argv.includes('--apply'), results: await migrateDiagnosticRetention(client.db(expected), process.argv.includes('--apply')) }, null, 2));
    } finally { await client.close(); }
}

module.exports = { migrateDiagnosticRetention };
if (require.main === module) main().catch(error => {
    const code = String(error.code || error.name || 'migration_failed');
    console.error(/^[A-Za-z0-9_/-]{1,80}$/.test(code) ? code : 'migration_failed');
    process.exitCode = 1;
});
