'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { MongoMemoryServer } = require('../tmp/account-deletion-tests/node_modules/mongodb-memory-server-core');
const { MongoClient } = require('mongodb');
const { migrateDiagnosticRetention } = require('./migrate-diagnostic-retention.cjs');
(async () => {
    const server = await MongoMemoryServer.create({ binary: { version: '7.0.14', downloadDir: path.resolve(__dirname, '../tmp/account-deletion-tests/binaries') }, instance: { ip: '127.0.0.1', dbName: 'diagnostic_retention_disposable_test' } });
    const client = new MongoClient(server.getUri());
    try {
        assert.equal(new URL(server.getUri()).hostname, '127.0.0.1');
        await client.connect();
        const db = client.db('diagnostic_retention_disposable_test');
        const collection = db.collection('disconnectdiagnostics');
        await collection.insertOne({ occurredAt: new Date(), eventId: 'preserve-recent' });
        await collection.createIndex({ occurredAt: 1 });
        await db.collection('matchresultsubmissiondiagnostics').createIndex({ occurredAt: 1 }, { expireAfterSeconds: 2592000 });
        const dry = await migrateDiagnosticRetention(db);
        assert.equal(dry[0].status, 'migration_required');
        assert.equal((await collection.indexes()).find(i => i.name === 'occurredAt_1').expireAfterSeconds, undefined);
        await migrateDiagnosticRetention(db, true);
        assert.equal((await collection.indexes()).find(i => i.name === 'occurredAt_1').expireAfterSeconds, 2592000);
        assert.equal(await collection.countDocuments({ eventId: 'preserve-recent' }), 1);
        assert((await migrateDiagnosticRetention(db, true)).every(i => i.status === 'already_configured'));
        await collection.dropIndex('occurredAt_1');
        await collection.createIndex({ occurredAt: 1 }, { unique: true });
        await assert.rejects(migrateDiagnosticRetention(db, true), /manual_review/);
        assert.equal((await collection.indexes()).find(i => i.name === 'occurredAt_1').unique, true);
        await collection.dropIndex('occurredAt_1');
        await collection.createIndex({ occurredAt: 1 });
        const realCreate = collection.createIndex.bind(collection);
        collection.createIndex = async (key, options) => {
            if (options.expireAfterSeconds !== undefined) throw new Error('simulated_index_build_failure');
            return realCreate(key, options);
        };
        const wrappedDb = { collection: name => name === 'disconnectdiagnostics' ? collection : db.collection(name) };
        await assert.rejects(migrateDiagnosticRetention(wrappedDb, true), /simulated_index_build_failure/);
        assert.equal((await collection.indexes()).find(i => i.name === 'occurredAt_1').expireAfterSeconds, undefined);
        assert.equal(await collection.countDocuments({ eventId: 'preserve-recent' }), 1);
        console.log('Diagnostic retention migration passed: dry run, real TTL replacement, idempotency, preserved recent data, uniqueness protection and failure rollback.');
    } finally { await client.close(); await server.stop(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
