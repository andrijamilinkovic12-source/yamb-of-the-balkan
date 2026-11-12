'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { ObjectId } = require('mongoose').mongo;
const { createPushDeliveryPolicy } = require('../lib/push-delivery-policy');
const { createQaFcmStats } = require('../qa/fcm-probe');
const { qaRegistrationReceipt, readQaFcmDeliveryConfig, runQaFcmDeliveryProbe } = require('../qa/fcm-delivery');

const ids = ['fixture-qa-current-device-0001', 'fixture-qa-current-device-0002'];
const env = { YAMB_STAGING_FCM_ENABLED: 'true', YAMB_STAGING_FCM_ALLOWED_UIDS: JSON.stringify(ids),
    YAMB_STAGING_FIREBASE_PROJECT_ID: 'yamb-reconnect-qa', YAMB_PRODUCTION_FIREBASE_PROJECT_ID: 'yamb-of-the-balkan' };
const policy = createPushDeliveryPolicy({ environment: 'staging', env });
const runtime = { environment: 'staging', instanceId: 'reconnect-qa-01' };
const fixture = { humanUids: ids, databaseName: 'isolated-qa' };
const at = 100000000;
const documents = ids.map(uid => ({ _id: new ObjectId(), uid, platform: 'android', enabled: true,
    lastSeenAt: at, categories: { tournament: true }, token: 'fixture-token-not-exported' }));
const value = { version: 1, id: 'qa_fcm_delivery_fixture_01', expiresAt: at + 60000,
    registrationIds: documents.map(row => row._id.toHexString()) };
const read = v => readQaFcmDeliveryConfig({ YAMB_QA_FCM_DELIVERY: JSON.stringify(v) }, runtime, fixture, policy, () => at);
const config = read(value);
const source = fs.readFileSync(require.resolve('../server'), 'utf8').replace(/\r\n/g, '\n');
function actual(name) {
    const start = source.search(new RegExp('(?:async )?function ' + name + '\\('));
    assert(start > 0);
    return source.slice(start, source.indexOf('\n}', start) + 2);
}

async function guardsAndClaims() {
    assert.equal(readQaFcmDeliveryConfig({}, runtime, fixture, policy), null);
    for (const wrong of [null, {}, { ...value, extra: true }, { ...value, expiresAt: 'tomorrow' },
        { ...value, registrationIds: [value.registrationIds[0], value.registrationIds[0]] },
        { ...value, registrationIds: [value.registrationIds[0], 'bad'] }, { ...value, id: 'bad' },
        { ...value, expiresAt: at + 86400001 }]) assert.throws(() => read(wrong));
    assert.throws(() => readQaFcmDeliveryConfig({ YAMB_QA_FCM_DELIVERY: JSON.stringify(value) },
        { environment: 'production' }, fixture, policy, () => at));
    assert.deepEqual(qaRegistrationReceipt(ids[0], documents[0], fixture, policy), { qaRegistrationId: value.registrationIds[0] });
    assert.deepEqual(qaRegistrationReceipt('unapproved', documents[0], fixture, policy), {});
    assert.deepEqual(qaRegistrationReceipt(ids[0], documents[0], fixture, { mode: 'production' }), {});
    assert.throws(() => createQaFcmStats({ deliver: true }), /registration_required/);

    const runs = new Map(), sent = [];
    const db = { databaseName: fixture.databaseName, collection(name) {
        if (name === 'pushtokens') return { async findOne(query, options) {
            assert.deepEqual(options.projection, { _id: 1 });
            const row = documents.find(row => row._id.equals(query._id) && row.uid === query.uid
                && row.enabled === query.enabled && row.platform === query.platform
                && row.categories.tournament !== query['categories.tournament'].$ne && row.lastSeenAt >= query.lastSeenAt.$gte);
            return row ? { _id: row._id } : null;
        } };
        assert.equal(name, 'qafcmproberuns');
        return { async updateOne(query, update) {
            if (update.$setOnInsert) {
                if (runs.has(query._id)) return { upsertedCount: 0 };
                runs.set(query._id, { ...update.$setOnInsert }); return { upsertedCount: 1 };
            }
            Object.assign(runs.get(query._id), update.$set); return { matchedCount: 1 };
        } };
    } };
    const options = { config, fixture, db, now: () => at, inQuietHours: () => false,
        async send([uid], message, stats) {
            assert.equal(stats.validationOnly, false);
            assert(stats.registrationId.equals(documents[ids.indexOf(uid)]._id));
            assert.equal(message.data.recipientUid, uid);
            assert.equal(message.type, 'qa_fcm_delivery');
            stats.registrations(1); stats.attempted(1); stats.accepted(1); sent.push(uid);
        } };
    assert((await runQaFcmDeliveryProbe({ ...options, inQuietHours: () => true })).skipped);
    assert((await runQaFcmDeliveryProbe({ ...options, now: () => config.expiresAt })).skipped);
    await assert.rejects(runQaFcmDeliveryProbe({ ...options, db: { databaseName: 'production' } }), /database_mismatch/);
    for (const mutation of [{ uid: 'outside' }, { enabled: false }, { platform: 'web' }, { lastSeenAt: at - 1800001 },
        { categories: { tournament: false } }]) {
        const original = { ...documents[0] };
        Object.assign(documents[0], mutation);
        await assert.rejects(runQaFcmDeliveryProbe(options), /receipt_not_current/);
        Object.assign(documents[0], original);
        assert.equal(runs.size, 0);
    }
    const results = await Promise.all([runQaFcmDeliveryProbe(options), runQaFcmDeliveryProbe(options)]);
    assert.equal(results.filter(r => !r.skipped).length, 1);
    assert.deepEqual(sent, ids);
    assert(!JSON.stringify([...runs.values()]).includes(ids[0]));
    assert(!JSON.stringify([...runs.values()]).includes('fixture-token'));
}

async function senderContract() {
    const messages = [], dryRuns = [];
    const context = vm.createContext({ MONGO_URI: 'fixture-only', pushDeliveryPolicy: policy,
        PUSH_TOKEN_STALE_MS: 1800000, console, normalizePushLanguage: () => 'sr',
        getLocalizedPushMessage: x => x, buildPushMessage: (_x, tokens) => ({ tokens }),
        removeInvalidPushTokens: async () => { throw Error('Probe must not remove registrations'); },
        isInvalidFcmTokenError: () => false,
        PushToken: { find(query) {
            assert(query._id.equals(documents[0]._id), 'Exact current registration ID is mandatory');
            assert.deepEqual(Array.from(query.uid.$in), [ids[0]]);
            return { select: () => ({ lean: async () => [documents[0]] }) };
        } }, firebaseMessaging: { async sendEachForMulticast(message, dryRun) {
            messages.push(message); dryRuns.push(dryRun);
            return { successCount: 1, responses: [{ success: true }] };
        } } });
    for (const name of ['getPushTokenDocsForUids', 'sendPushToUids']) vm.runInContext(actual(name), context);
    const stats = createQaFcmStats({ registrationId: documents[0]._id, deliver: true });
    await context.sendPushToUids([ids[0]], {}, stats);
    assert.equal(dryRuns[0], false);
    assert.equal(messages[0].tokens.length, 1);
    context.firebaseMessaging = { async send(message, dryRun) { dryRuns.push(dryRun); assert(message.token); } };
    await context.sendPushToUids([ids[0]], {}, stats);
    assert.equal(dryRuns[1], false);
    const registered = vm.createContext({ MONGO_URI: 'fixture-only', console, qaRegistrationReceipt,
        qaTournamentFixtureConfig: fixture, pushDeliveryPolicy: policy,
        sanitizePushToken: x => x, sanitizePushPlatform: x => x, normalizePushLanguage: x => x,
        normalizePushCategories: x => x,
        PushToken: { findOneAndUpdate: async () => documents[0] } });
    vm.runInContext(actual('registerPushToken'), registered);
    const result = await registered.registerPushToken(ids[0], { token: 'fixture-private' });
    assert.equal(result.qaRegistrationId, value.registrationIds[0]);
    assert(!JSON.stringify(result).includes('fixture-private'));
}

async function nativeReceipt() {
    const nativeSource = fs.readFileSync(require.resolve('../www/pushNotifications'), 'utf8');
    for (const [origin, receiptExpected] of [['https://yamb-reconnect-qa.onrender.com', true], ['https://yamb-of-the-balkan.onrender.com', false]]) {
        const storage = new Map([['yamb_push_token', 'fixture-native-private']]);
        const app = { playerId: ids[0], authenticateSocketIdentity: async () => ({ ok: true }),
            socket: { connected: true, emit(name, _payload, ack) {
                assert.equal(name, 'push_register_token'); ack({ ok: true, qaRegistrationId: value.registrationIds[0] });
            } } };
        const plugin = { checkPermissions: async () => ({ receive: 'granted' }), register: async () => {},
            addListener: async () => {}, createChannel: async () => {} };
        const context = vm.createContext({ window: { app, location: { origin }, Capacitor: {
            isNativePlatform: () => true, getPlatform: () => 'android', Plugins: { PushNotifications: plugin } } },
        localStorage: { getItem: key => storage.get(key), setItem: (key, val) => storage.set(key, val) }, console, setTimeout, clearTimeout });
        vm.runInContext(nativeSource, context);
        const result = await context.window.yambPushNotifications.ensureRegistered(app, { qaRegistrationReceipt: true });
        assert.equal(result.ok, true);
        assert.equal(result.qaRegistrationId, receiptExpected ? value.registrationIds[0] : undefined);
        assert(!JSON.stringify(result).includes('fixture-native-private'));
    }
}

(async () => {
    await guardsAndClaims(); await senderContract(); await nativeReceipt();
    console.log('PASS: QA-only registration receipts, exact-device delivery, ownership/freshness guards, one-shot claim, quiet hours and no token export.');
})().catch(error => { console.error(error); process.exitCode = 1; });
