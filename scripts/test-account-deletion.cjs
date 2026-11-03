'use strict';
const assert = require('node:assert/strict');
const { createAccountDeletion, scrubEmbedded, referenceHashes, hash } = require('../lib/account-deletion');
const { Mongoose } = require('mongoose');

const uid = 'test_only_account_123456789';
const other = 'another_test_account_987654';
const currentToken = { uid, auth_time: Math.floor(Date.now() / 1000), firebase: { sign_in_provider: 'google.com' } };

// In-memory job adapter; no Mongo connection, .env, credentials, or live Firebase.
function harness(extra = {}) {
    const rows = [];
    const calls = [];
    let token = { ...currentToken };
    const jobs = {
        async createIndex() {},
        async findOne(query) {
            if (query.referenceHashes) return rows.find(row => row.referenceHashes.some(ref => query.referenceHashes.$in.includes(ref))) || null;
            return rows.find(row => Object.entries(query).every(([key, value]) => row[key] === value)) || null;
        },
        async findOneAndUpdate(query, update, options = {}) {
            let row;
            if (query.identityHash) {
                row = rows.find(item => item.identityHash === query.identityHash);
                if (!row && options.upsert) { row = structuredClone(update.$setOnInsert); rows.push(row); }
            } else {
                row = rows.find(item => item.state === 'pending' && item.nextAttemptAt <= new Date());
            }
            if (!row) return null;
            Object.assign(row, update.$set || {});
            for (const [key, value] of Object.entries(update.$inc || {})) row[key] = (row[key] || 0) + value;
            return structuredClone(row);
        },
        async updateOne(query, update) {
            const row = rows.find(item => item._id === query._id);
            Object.assign(row, update.$set || {});
            for (const key of Object.keys(update.$unset || {})) delete row[key];
        },
        async updateMany() {}
    };
    const auth = {
        async verifyIdToken(value, checkRevoked) {
            calls.push(['verify', checkRevoked]);
            if (value !== 'verified-test-token') throw new Error('invalid');
            return token;
        },
        async updateUser(id, value) { calls.push(['disable', id, value.disabled]); },
        async revokeRefreshTokens(id) { calls.push(['revoke', id]); },
        async deleteUser(id) { calls.push(['delete-auth', id]); }
    };
    const service = createAccountDeletion({
        enabled: true, getDb: () => ({ collection: () => jobs }), getAuth: () => auth,
        getModels: () => ({}), monitorId: value => 'monitor-' + value,
        beforeDelete: async id => calls.push(['disconnect', id]),
        eraseData: async id => calls.push(['erase-data', id]), ...extra
    });
    return { service, calls, rows, auth, setToken: value => { token = value; } };
}

async function run() {
    const fixture = {
        winnerId: other, winnerName: 'Keep this winner',
        runnerUpId: uid, runnerUpName: 'Remove this name',
        bracket: { qf: [{ p1: { id: uid, name: 'Remove', photoUrl: 'https://example.invalid/private' }, p2: { id: other, name: 'Keep' }, winnerId: other }] },
        prizeAwards: { [uid]: true, [other]: true }
    };
    const cleaned = scrubEmbedded(fixture, uid);
    assert.equal(cleaned.runnerUpId, '');
    assert.equal(cleaned.runnerUpName, 'Deleted player');
    assert.equal(cleaned.winnerName, 'Keep this winner');
    assert.equal(cleaned.bracket.qf[0].p1.photoUrl, '');
    assert.equal(cleaned.bracket.qf[0].p2.name, 'Keep');
    assert.equal(cleaned.prizeAwards[uid], undefined);
    assert.equal(fixture.runnerUpName, 'Remove this name', 'scrubbing must not mutate the caller');
    assert(referenceHashes({ raw: { custom_data: JSON.stringify({ uid }) } }).has(hash(uid)));

    const h = harness();
    await assert.rejects(h.service.request('bad-token', 'DELETE'), { code: 'sign_in_required' });
    await assert.rejects(h.service.request('verified-test-token', true), { code: 'confirmation_required' });
    h.setToken({ ...currentToken, auth_time: 1 });
    await assert.rejects(h.service.request('verified-test-token', 'DELETE'), { code: 'recent_sign_in_required' });
    h.setToken({ ...currentToken, firebase: { sign_in_provider: 'password' } });
    await assert.rejects(h.service.request('verified-test-token', 'DELETE'), { code: 'google_sign_in_required' });
    assert.equal(h.rows.length, 0, 'invalid/unconfirmed requests must not create a deletion job');
    h.setToken(currentToken);

    const releaseOldWrite = await h.service.guardWrite({ firebaseUid: uid });
    const receipt = await h.service.request('verified-test-token', 'DELETE');
    assert.equal(receipt.state, 'pending');
    assert.equal(await h.service.isBlocked(uid), true);
    assert.equal(await h.service.isBlocked(other), false);
    await assert.rejects(h.service.guardWrite({ firebaseUid: uid }), { code: 'account_deleted' });
    const releaseOther = await h.service.guardWrite({ firebaseUid: other });
    releaseOther();
    let drained = false;
    const draining = h.service.waitForWrites(uid).then(() => { drained = true; });
    await new Promise(resolve => setTimeout(resolve, 40));
    assert.equal(drained, false, 'cleanup must wait for an already-started account write');
    releaseOldWrite();
    await draining;
    await h.service.work();
    assert.equal(h.rows[0].state, 'complete');
    assert.equal(h.rows[0].uid, undefined, 'completed job must not retain the raw Firebase UID');
    assert.deepEqual(h.calls.filter(call => call[0] !== 'verify').map(call => call[0]), ['disable', 'revoke', 'disconnect', 'erase-data', 'delete-auth']);
    assert(h.calls.filter(call => call[0] === 'verify').every(call => call[1] === true));
    assert.equal((await h.service.status(receipt.jobId, receipt.receipt)).state, 'complete');
    await assert.rejects(h.service.status(receipt.jobId, 'a'.repeat(43)), { code: 'not_found' });
    await assert.rejects(h.service.guardWrite({ firebaseUid: uid }), { code: 'account_deleted' });

    // A partial failure remains a blocked pending job and never reports success.
    let fail = true;
    const retry = harness({ eraseData: async () => { if (fail) throw new Error('simulated DB failure'); } });
    const pending = await retry.service.request('verified-test-token', 'DELETE');
    await retry.service.work();
    assert.equal(retry.rows[0].state, 'pending');
    assert.equal(retry.rows[0].uid, uid);
    assert.equal((await retry.service.status(pending.jobId, pending.receipt)).state, 'pending');
    assert.equal(retry.calls.some(call => call[0] === 'delete-auth'), false);
    fail = false;
    retry.rows[0].nextAttemptAt = new Date(0);
    await retry.service.work();
    assert.equal(retry.rows[0].state, 'complete');

    // Google acceptance is a durable, independently retryable stage, not proof
    // of completed erasure at Google. Game/Auth cleanup cannot skip a failure.
    let providerFails = true;
    let snapshots = 0;
    const providerCalls = [];
    const analytics = harness({ analytics: {
        async snapshot() { snapshots++; return { propertyId: '123456', appInstanceIds: ['test_instance_12345678'] }; },
        async submit(id, plan, acks, acknowledge) {
            assert.equal(id, uid);
            assert.equal(plan.propertyId, '123456');
            if (!acks.includes('user-selector')) {
                providerCalls.push('user');
                await acknowledge({ key: 'user-selector', requestedAt: new Date() });
            }
            if (providerFails) throw Object.assign(new Error('private provider message'), { code: 'analytics_deletion_unavailable' });
            providerCalls.push('instance');
            await acknowledge({ key: 'instance-selector', requestedAt: new Date() });
        },
        async eraseRegistry() { providerCalls.push('erase-registry'); }
    } });
    const analyticReceipt = await analytics.service.request('verified-test-token', 'DELETE');
    await analytics.service.work();
    assert.equal(analytics.rows[0].state, 'pending');
    assert.deepEqual(analytics.rows[0].analyticsAcknowledged, ['user-selector']);
    assert.equal(analytics.rows[0].analyticsPlan.appInstanceIds[0], 'test_instance_12345678');
    assert.equal(analytics.calls.some(call => ['erase-data', 'delete-auth'].includes(call[0])), false);
    assert.deepEqual((await analytics.service.status(analyticReceipt.jobId, analyticReceipt.receipt)).analytics, { state: 'pending' });
    // Simulate an ordinary later-stage failure and another process restart.
    providerFails = false;
    analytics.rows[0].nextAttemptAt = new Date(0);
    await analytics.service.work();
    assert.equal(snapshots, 1, 'retry must keep the original immutable installation snapshot');
    assert.deepEqual(providerCalls, ['user', 'instance', 'erase-registry']);
    assert.equal(analytics.rows[0].state, 'complete');
    assert.equal(analytics.rows[0].uid, undefined);
    assert.equal(analytics.rows[0].analyticsPlan, undefined);
    assert.equal(analytics.rows[0].analyticsAcknowledged, undefined);
    assert.deepEqual((await analytics.service.status(analyticReceipt.jobId, analyticReceipt.receipt)).analytics, { state: 'submitted' });

    // Exercise real Mongoose 8 hooks with an isolated stub collection.
    const mongo = new Mongoose();
    h.service.installWriteGuards(mongo);
    const Profile = mongo.model('DeletionTestProfile', new mongo.Schema({ firebaseUid: String, score: Number }, { bufferCommands: false }));
    let writes = 0;
    Profile.collection.insertOne = async () => { writes++; return { insertedId: 'test' }; };
    Profile.collection.updateOne = async () => { writes++; return { matchedCount: 1 }; };
    await assert.rejects(new Profile({ firebaseUid: uid }).save(), { code: 'account_deleted' });
    await assert.rejects(Profile.updateOne({ firebaseUid: uid }, { $inc: { score: 1 } }), { code: 'account_deleted' });
    await new Profile({ firebaseUid: other }).save();
    await Profile.updateOne({ firebaseUid: other }, { $inc: { score: 1 } });
    assert.equal(writes, 2, 'blocked identity must never reach the collection');
    await h.service.waitForWrites(other);
    let batchCalls = 0;
    const Batch = {
        async insertMany() { batchCalls++; },
        async bulkWrite() { batchCalls++; throw new Error('simulated batch failure'); }
    };
    h.service.protectModelBatches({ Batch });
    await assert.rejects(Batch.insertMany([{ firebaseUid: uid }]), { code: 'account_deleted' });
    await assert.rejects(Batch.bulkWrite([{ updateOne: { filter: { firebaseUid: uid }, update: { score: 1 } } }]), { code: 'account_deleted' });
    await Batch.insertMany([{ firebaseUid: other }]);
    await assert.rejects(Batch.bulkWrite([{ firebaseUid: other }]), /batch failure/);
    await h.service.waitForWrites(other);
    assert.equal(batchCalls, 2);
    console.log('Account deletion checks passed: recent verified identity, explicit confirmation, job receipts, retry, write drain, shared history and real Mongoose guards.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
