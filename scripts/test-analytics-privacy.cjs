'use strict';
const assert = require('node:assert/strict');
const { createAnalyticsPrivacy } = require('../lib/analytics-privacy');
const { createController, mount, privacyUrl } = require('../www/analytics-privacy');
const { hash } = require('../lib/account-deletion');
const uid = 'analytics_test_user_123456789';
const other = 'analytics_test_other_12345678';
const appInstanceId = 'test_app_instance_123456789';

async function serverChecks() {
    const rows = new Map();
    let blocked = false;
    let releases = 0;
    let revokedChecks = 0;
    let providerArgs;
    const collection = {
        async createIndex() {},
        async updateOne(query, update) {
            const row = rows.get(query._id);
            if (row && row.uid !== query.uid) throw Object.assign(new Error('duplicate'), { code: 11000 });
            if (!row) rows.set(query._id, { _id: query._id, ...structuredClone(update.$setOnInsert) });
        },
        find(query) { return { toArray: async () => [...rows.values()].filter(row => row.uid === query.uid) }; },
        async deleteMany(query) { for (const [key, row] of rows) if (row.uid === query.uid) rows.delete(key); }
    };
    const service = createAnalyticsPrivacy({
        enabled: true, getDb: () => ({ collection: name => { assert.equal(name, 'analyticsinstallations'); return collection; } }),
        getAuth: () => ({ verifyIdToken: async (token, checkRevoked) => {
            assert.equal(checkRevoked, true); revokedChecks++;
            if (!['first-token', 'other-token'].includes(token)) throw new Error('invalid token');
            return { uid: token === 'first-token' ? uid : other, firebase: { sign_in_provider: 'google.com' } };
        } }),
        guardWrite: async value => { assert.equal(typeof value.uid, 'string'); if (blocked) throw Object.assign(new Error('deleted'), { code: 'account_deleted' }); return () => releases++; },
        provider: { propertyId: '12345678', async submit(...args) { providerArgs = args; return { state: 'submitted' }; } }
    });
    await assert.rejects(service.register(null, appInstanceId), { code: 'sign_in_required' });
    await assert.rejects(service.register('bad-token', appInstanceId), { code: 'sign_in_required' });
    await assert.rejects(service.register('first-token', 'short'), { code: 'analytics_identity_invalid' });
    assert.equal(rows.size, 0);
    assert.deepEqual(await service.register('first-token', appInstanceId), { ok: true, analyticsUserId: hash(uid) });
    await service.register('first-token', appInstanceId);
    assert.equal(rows.size, 1);
    await assert.rejects(service.register('other-token', appInstanceId), { code: 'analytics_identity_conflict' });
    assert.equal(rows.get(hash(appInstanceId)).uid, uid, 'a second account cannot claim an installation');
    blocked = true;
    await assert.rejects(service.register('first-token', 'new_instance_12345678'), { code: 'account_deleted' });
    assert.equal(rows.size, 1, 'deleted accounts cannot add installation IDs after the write drain');
    const plan = await service.snapshot(uid);
    assert.deepEqual(plan, { propertyId: '12345678', appInstanceIds: [appInstanceId] });
    await assert.rejects(service.submit(uid, { ...plan, propertyId: '87654321' }, [], () => {}), { code: 'analytics_property_mismatch' });
    await service.submit(uid, plan, [], () => {});
    assert.equal(providerArgs[0].uid, hash(uid), 'Analytics receives a pseudonymous ID, never a raw Firebase UID/email');
    await service.eraseRegistry(other);
    assert.equal(rows.size, 1);
    await service.eraseRegistry(uid);
    assert.equal(rows.size, 0);
    assert.equal(releases, 3, 'release reservations even after duplicate-index errors');
    assert(revokedChecks >= 4);
}

function clientHarness() {
    const calls = [];
    let granted = false, identity = uid, registered = true, serverEnabled = true, nativeAvailable = true;
    let intercept = async () => {};
    const controller = createController({
        currentUid: () => identity,
        native: {
            async pause() { calls.push('pause'); },
            async getStatus() { return { granted }; },
            async setChoice(value) { granted = value.granted; calls.push(granted ? 'grant' : 'deny'); },
            async prepareIdentity() { if (!nativeAvailable) throw new Error('native_failure'); calls.push('prepare'); return { appInstanceId }; },
            async enableRegistered(value) { calls.push('enable'); assert.equal(value.analyticsUserId, hash(uid)); },
            async clear() { calls.push('clear'); granted = false; }
        },
        auth: { async getIdToken() { return { token: 'test-token' }; }, async getCurrentUser() { return { user: { uid: identity } }; } },
        http: async (path, options) => {
            if (path === '/api/analytics/config') { calls.push('config'); return { enabled: serverEnabled }; }
            assert.equal(path, '/api/analytics/installation');
            assert.deepEqual(JSON.parse(options.body), { appInstanceId });
            assert.equal(options.headers.Authorization, 'Bearer test-token');
            calls.push('register'); await intercept();
            if (!registered) throw new Error('server_failure');
            return { ok: true, analyticsUserId: hash(uid) };
        }
    });
    return { controller, calls, set: value => {
        if ('granted' in value) granted = value.granted;
        if ('identity' in value) identity = value.identity;
        if ('registered' in value) registered = value.registered;
        if ('serverEnabled' in value) serverEnabled = value.serverEnabled;
        if ('nativeAvailable' in value) nativeAvailable = value.nativeAvailable;
        if ('intercept' in value) intercept = value.intercept;
    } };
}
async function clientChecks() {
    assert.equal(privacyUrl(new URL('https://yamb-reconnect-qa.onrender.com'), 'sr'), 'https://yamb-reconnect-qa.onrender.com/privacy.html');
    assert.equal(privacyUrl(new URL('https://yamb-reconnect-qa.onrender.com'), 'en'), 'https://yamb-reconnect-qa.onrender.com/privacy_en.html');
    assert.equal(privacyUrl(new URL('https://yamb-of-the-balkan.onrender.com'), 'en'), 'https://www.yambofthebalkan.com/privacy_en.html');
    assert.equal(privacyUrl(new URL('https://other.invalid'), 'sr'), 'https://www.yambofthebalkan.com/privacy.html');
    const legacyCalls = [];
    mount({ Capacitor: {
        isNativePlatform: () => true, isPluginAvailable: () => false,
        Plugins: { FirebaseAnalytics: {
            async setEnabled(value) { legacyCalls.push(value); },
            async setConsent(value) { legacyCalls.push(value); }
        } }
    } });
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(legacyCalls[0], { enabled: false });
    assert.deepEqual(legacyCalls.slice(1).map(value => value.status), ['DENIED', 'DENIED', 'DENIED', 'DENIED'],
        'older installed APKs must stop collecting after a remote web-code rollout');
    const off = clientHarness();
    await off.controller.sync();
    assert.deepEqual(off.calls, ['pause']);
    await off.controller.choose(true);
    assert.deepEqual(off.calls.slice(1), ['grant', 'pause', 'config', 'prepare', 'register', 'enable']);
    assert.equal(off.controller.getState(), 'on');
    await off.controller.choose(false);
    assert.equal(off.controller.getState(), 'off');
    assert.equal(off.calls.filter(call => call === 'enable').length, 1);
    for (const failure of [{ registered: false }, { serverEnabled: false }, { nativeAvailable: false }, { identity: null }]) {
        const h = clientHarness(); h.set({ granted: true, ...failure });
        await h.controller.sync();
        assert(!h.calls.includes('enable'), 'collection must remain off without account, server, identity or registration');
    }
    const changed = clientHarness();
    let signal;
    const waiting = new Promise(resolve => { signal = resolve; });
    let proceed;
    changed.set({ granted: true, intercept: async () => { signal(); await new Promise(resolve => { proceed = resolve; }); } });
    const first = changed.controller.sync();
    await waiting;
    changed.set({ identity: other });
    const second = changed.controller.pause();
    proceed(); await first; await second;
    assert(!changed.calls.includes('enable'), 'an in-flight response cannot enable collection after account/background changes');
    const clean = clientHarness(); clean.set({ granted: true });
    await clean.controller.sync(); await clean.controller.clear();
    assert.equal(clean.controller.getState(), 'off');
    assert.equal(clean.calls.at(-1), 'clear');
}
(async () => {
    await serverChecks(); await clientChecks();
    console.log('Analytics privacy checks passed: verified account binding, exclusive installations, pseudonymous IDs, deletion blocks, default-off consent, registration-before-collection, failures and identity races. No live service used.');
})().catch(error => { console.error(error); process.exitCode = 1; });
