'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createPushDeliveryPolicy } = require('../lib/push-delivery-policy');
const safety = require('./reconnect-staging-safety');
const a = 'fixture-staging-player-000001';
const b = 'fixture-staging-player-000002';
const outside = 'fixture-other-player-0000001';
const env = { YAMB_STAGING_FCM_ENABLED: 'true', YAMB_STAGING_FCM_ALLOWED_UIDS: JSON.stringify([a, b]),
    YAMB_STAGING_FIREBASE_PROJECT_ID: 'yamb-reconnect-qa', YAMB_PRODUCTION_FIREBASE_PROJECT_ID: 'yamb-of-the-balkan',
    GOOGLE_CLOUD_PROJECT: 'yamb-reconnect-qa', FIREBASE_WEB_API_KEY: 'fixture-public-key' };
const account = { type: 'service_account', project_id: 'yamb-reconnect-qa',
    client_email: 'fixture@yamb-reconnect-qa.iam.gserviceaccount.com', private_key: 'fixture-not-a-real-key' };
const source = fs.readFileSync(require.resolve('../server'), 'utf8').replace(/\r\n/g, '\n');

function actual(name) {
    const start = source.search(new RegExp('(?:async )?function ' + name + '\\('));
    assert(start > 0, name);
    return source.slice(start, source.indexOf('\n}', start) + 2);
}

function init(environment, values, credentials, failMessaging = false) {
    const policy = createPushDeliveryPolicy({ environment, env: values });
    const apps = [], sends = [];
    const context = vm.createContext({ process: { env: values }, SERVER_RUNTIME: { environment },
        pushDeliveryPolicy: policy, ANALYTICS_PRIVACY_ENABLED: false,
        parseFirebaseServiceAccount: () => credentials,
        getFirebaseCredentialSource: () => credentials ? 'fixture_credentials' : 'fixture_project_only',
        getConfiguredFirebaseProjectId: value => value?.project_id || values.GOOGLE_CLOUD_PROJECT,
        validateStagingFirebaseRuntime: safety.validateStagingFirebaseRuntime,
        console: { log() {}, warn() {} },
        require(name) {
            if (name === 'firebase-admin/app') return {
                cert: value => value,
                getApps: () => apps,
                getApp: () => apps[0],
                initializeApp(options, name) { const app = { options, name }; apps.push(app); return app; }
            };
            if (name === 'firebase-admin/auth') return { getAuth: () => ({}) };
            if (name === 'firebase-admin/app-check') return { getAppCheck: () => ({}) };
            if (name === 'firebase-admin/messaging') return { getMessaging(app) {
                if (failMessaging) throw Error('fixture init failed');
                sends.push(app); return { fixture: true };
            } };
            throw Error('Unexpected fixture module');
        } });
    const start = source.indexOf("try {\n    const { cert, getApps, getApp, initializeApp }");
    const end = source.indexOf('// Inicijalizacija aplikacije', start);
    assert(start > 0 && end > start);
    vm.runInContext('let firebaseAuth = null, firebaseAppCheck = null, firebaseMessaging = null, firebaseAdminCredentialSource, firebaseAdminProjectId;\n'
        + source.slice(start, end), context);
    return { context, apps, sends };
}

async function main() {
    const production = createPushDeliveryPolicy({ environment: 'production', env: {} });
    assert(production.enabled);
    assert.deepEqual(production.selectUids([outside]), [outside]);
    for (const runtime of ['production', 'development', 'test']) {
        assert.throws(() => createPushDeliveryPolicy({ environment: runtime, env }), /requires_staging_runtime/);
    }
    assert(!createPushDeliveryPolicy({ environment: 'production', env: { FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9399' } }).enabled);
    assert.throws(() => createPushDeliveryPolicy({ environment: 'staging', env: { ...env, FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9399' } }), /forbidden_with_auth_emulator/);
    for (const text of ['', 'null', '{}', '[]', '["short"]', JSON.stringify([a, a]), JSON.stringify(Array(17).fill(a))]) {
        assert.throws(() => createPushDeliveryPolicy({ environment: 'staging', env: { ...env, YAMB_STAGING_FCM_ALLOWED_UIDS: text } }), /allowlist_invalid/);
    }
    assert.throws(() => createPushDeliveryPolicy({ environment: 'staging', env: { ...env,
        YAMB_PRODUCTION_FIREBASE_PROJECT_ID: env.YAMB_STAGING_FIREBASE_PROJECT_ID } }), /ne smeju biti isti/);
    const stage = createPushDeliveryPolicy({ environment: 'staging', env });
    assert.deepEqual(stage.selectUids([outside, a, ' ' + b + ' ', a, null]), [a, b]);
    assert(!stage.allowsUid(outside));
    for (const value of [null, { ...account, project_id: 'yamb-of-the-balkan' },
        { ...account, client_email: 'fixture@yamb-of-the-balkan.iam.gserviceaccount.com' }, { ...account, private_key: '' }]) {
        assert.throws(() => stage.validateCredentials(value), /own_project_service_account/);
    }
    stage.validateCredentials(account);
    const disabled = { ...env, YAMB_STAGING_FCM_ENABLED: 'false' };
    assert.equal(init('staging', disabled, null).sends.length, 0, 'Keyless QA enabled FCM');
    assert.equal(init('staging', disabled, account).sends.length, 0, 'Default QA credentials enabled FCM');
    const live = init('staging', env, account);
    assert.equal(live.sends.length, 1);
    assert.equal(live.sends[0].name, 'yamb-staging-messaging');
    assert.equal(live.sends[0].options.projectId, env.YAMB_STAGING_FIREBASE_PROJECT_ID);
    assert.throws(() => init('staging', env, null), /initialization_failed/);
    assert.throws(() => init('staging', env, { ...account, project_id: 'yamb-of-the-balkan' }), /ne pripadaju/);
    assert.throws(() => init('staging', env, { ...account, client_email: 'fixture@yamb-of-the-balkan.iam.gserviceaccount.com' }), /initialization_failed/);
    assert.throws(() => init('staging', env, account, true), /initialization_failed/);
    assert.equal(init('production', {}, { ...account, project_id: 'yamb-of-the-balkan' }).sends.length, 1);

    const deliveries = [];
    let reads = 0;
    const send = vm.createContext({ pushDeliveryPolicy: stage, MONGO_URI: 'fixture-no-network',
        firebaseMessaging: { sendEachForMulticast: async message => { deliveries.push(message); return {
            successCount: message.tokens.length, responses: message.tokens.map(() => ({ success: true })) }; } },
        PushToken: { find(query) { reads++; assert.deepEqual(Array.from(query.uid.$in), [a]);
            return { select: () => ({ lean: async () => [{ uid: a, token: 'qa-token' }, { uid: outside, token: 'forged-token' }] }) }; } },
        PUSH_TOKEN_STALE_MS: 10000, normalizePushLanguage: () => 'sr',
        getLocalizedPushMessage: value => value, buildPushMessage: (_base, tokens) => ({ tokens }),
        removeInvalidPushTokens: async () => {}, isInvalidFcmTokenError: () => false, console });
    for (const name of ['getPushTokenDocsForUids', 'sendPushToUids']) vm.runInContext(actual(name), send);
    assert.equal((await send.sendPushToUids([outside])).sent, 0);
    assert.equal(reads, 0, 'Disallowed user reached the token query');
    assert.equal((await send.sendPushToUids([outside, a])).sent, 1);
    assert.equal(deliveries.length, 1);
    assert.deepEqual(Array.from(deliveries[0].tokens), ['qa-token'], 'Token owner bypassed the allowlist');
    console.log('PASS: QA push opt-in, scoped credentials, test-account allowlist at query/send, emulator block, fail-closed initialization and unchanged production defaults. No real push sent.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
