const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { getApps, getApp, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getMessaging } = require('firebase-admin/messaging');
const {
    getMongoDatabaseName,
    getServerRuntimeDescriptor,
    getValidatedStagingApplicationId,
    getValidatedStagingClientUrl,
    getValidatedStagingFirebaseProjectId,
    getValidatedStagingInstanceId,
    validateStagingFirebaseRuntime,
    validateStagingGoogleServices,
    validateStagingServerEnvironment
} = require('./reconnect-staging-safety');

const root = path.resolve(__dirname, '..');
const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const configSource = fs.readFileSync(path.join(root, 'www', 'config.js'), 'utf8');
const managersSource = fs.readFileSync(path.join(root, 'www', 'managers.js'), 'utf8');
const buildSource = fs.readFileSync(path.join(root, 'scripts', 'build-reconnect-staging.js'), 'utf8');

const safeEnv = {
    YAMB_RUNTIME_ENV: 'staging',
    YAMB_STAGING_INSTANCE_ID: 'reconnect-qa-01',
    YAMB_STAGING_DB_NAME: 'yamb_reconnect_qa',
    YAMB_PRODUCTION_DB_NAME: 'yamb_production',
    YAMB_STAGING_FIREBASE_PROJECT_ID: 'yamb-reconnect-qa',
    YAMB_PRODUCTION_FIREBASE_PROJECT_ID: 'yamb-of-the-balkan',
    YAMB_ANDROID_APPLICATION_ID: 'com.yamb.balkan.staging',
    FIREBASE_WEB_API_KEY: 'staging-test-key',
    MONGO_URI: 'mongodb+srv://user:pass@example.invalid/yamb_reconnect_qa?retryWrites=true',
    YAMB_CAPACITOR_SERVER_URL: 'https://yamb-reconnect-qa.example.invalid'
};

assert.strictEqual(getMongoDatabaseName(safeEnv.MONGO_URI), 'yamb_reconnect_qa');
assert.deepStrictEqual(validateStagingServerEnvironment(safeEnv), {
    runtimeEnvironment: 'staging',
    instanceId: 'reconnect-qa-01',
    databaseName: 'yamb_reconnect_qa'
});
assert.strictEqual(getValidatedStagingClientUrl(safeEnv), 'https://yamb-reconnect-qa.example.invalid');
assert.strictEqual(getValidatedStagingApplicationId(safeEnv), 'com.yamb.balkan.staging');
assert.strictEqual(getValidatedStagingFirebaseProjectId(safeEnv), 'yamb-reconnect-qa');
assert.strictEqual(getValidatedStagingInstanceId(safeEnv), 'reconnect-qa-01');
const testFirebaseApp = initializeApp({ projectId: safeEnv.YAMB_STAGING_FIREBASE_PROJECT_ID }, 'reconnect-staging-check');
assert(getApps().includes(testFirebaseApp));
assert.strictEqual(getApp('reconnect-staging-check'), testFirebaseApp);
assert.strictEqual(typeof getAuth(testFirebaseApp).verifyIdToken, 'function');
assert.strictEqual(typeof getMessaging(testFirebaseApp).send, 'function');
assert.deepStrictEqual(getServerRuntimeDescriptor(safeEnv), {
    environment: 'staging',
    instanceId: 'reconnect-qa-01'
});
assert.deepStrictEqual(getServerRuntimeDescriptor({}), { environment: 'production', instanceId: '' });

assert.throws(
    () => getValidatedStagingClientUrl({ ...safeEnv, YAMB_CAPACITOR_SERVER_URL: 'https://yamb-of-the-balkan.onrender.com' }),
    /produkcioni/
);
assert.throws(
    () => getValidatedStagingClientUrl({ ...safeEnv, YAMB_CAPACITOR_SERVER_URL: 'http://qa.example.invalid' }),
    /HTTPS/
);
assert.throws(
    () => validateStagingServerEnvironment({ ...safeEnv, YAMB_STAGING_DB_NAME: 'yamb_production' }),
    /marker/
);
assert.throws(
    () => validateStagingServerEnvironment({ ...safeEnv, MONGO_URI: 'mongodb://localhost/yamb_other_qa' }),
    /ne odgovara/
);
assert.throws(
    () => validateStagingServerEnvironment({ ...safeEnv, YAMB_PRODUCTION_DB_NAME: 'yamb_reconnect_qa' }),
    /isto ime/
);
assert.strictEqual(validateStagingFirebaseRuntime('yamb-reconnect-qa', safeEnv), 'yamb-reconnect-qa');
assert.throws(
    () => validateStagingFirebaseRuntime('yamb-of-the-balkan', safeEnv),
    /ne pripada/
);
assert.throws(
    () => getValidatedStagingFirebaseProjectId({
        ...safeEnv,
        YAMB_STAGING_FIREBASE_PROJECT_ID: 'yamb-of-the-balkan'
    }),
    /marker|isti/
);

const productionGoogleServices = {
    project_info: { project_id: 'yamb-of-the-balkan' },
    client: [{ client_info: { android_client_info: { package_name: 'com.yamb.balkan' } } }]
};
const stagingGoogleServices = {
    project_info: { project_id: 'yamb-reconnect-qa' },
    client: [{ client_info: { android_client_info: { package_name: 'com.yamb.balkan.staging' } } }]
};
assert.deepStrictEqual(validateStagingGoogleServices(stagingGoogleServices, productionGoogleServices, safeEnv), {
    projectId: 'yamb-reconnect-qa',
    applicationId: 'com.yamb.balkan.staging'
});
assert.throws(
    () => validateStagingGoogleServices(productionGoogleServices, productionGoogleServices, safeEnv),
    /očekivanom|drugi projekat/
);

function evaluateClientRouting(url, hasCapacitor = true) {
    const location = new URL(url);
    const routingSource = configSource.slice(0, configSource.indexOf('// --- 3. KONSTANTE'));
    return vm.runInNewContext(`${routingSource}\n({ SERVER_URL, YAMB_IS_PRODUCTION_SERVER });`, {
        window: {
            location: {
                hostname: location.hostname,
                protocol: location.protocol,
                origin: location.origin
            },
            Capacitor: hasCapacitor ? {} : undefined
        },
        console: { log() {} },
        URL
    });
}

assert.deepStrictEqual(
    { ...evaluateClientRouting('https://yamb-reconnect-qa.example.invalid/app') },
    { SERVER_URL: 'https://yamb-reconnect-qa.example.invalid', YAMB_IS_PRODUCTION_SERVER: false }
);
assert.deepStrictEqual(
    { ...evaluateClientRouting('https://yamb-of-the-balkan.onrender.com/app') },
    { SERVER_URL: 'https://yamb-of-the-balkan.onrender.com', YAMB_IS_PRODUCTION_SERVER: true }
);

const previousUrl = process.env.YAMB_CAPACITOR_SERVER_URL;
const previousLocalHttp = process.env.YAMB_ALLOW_LOCAL_STAGING_HTTP;
const previousApplicationId = process.env.YAMB_ANDROID_APPLICATION_ID;
try {
    process.env.YAMB_CAPACITOR_SERVER_URL = safeEnv.YAMB_CAPACITOR_SERVER_URL;
    process.env.YAMB_ANDROID_APPLICATION_ID = safeEnv.YAMB_ANDROID_APPLICATION_ID;
    delete process.env.YAMB_ALLOW_LOCAL_STAGING_HTTP;
    delete require.cache[require.resolve('../capacitor.config.js')];
    const stagingCapacitorConfig = require('../capacitor.config.js');
    assert.strictEqual(stagingCapacitorConfig.appId, safeEnv.YAMB_ANDROID_APPLICATION_ID);
    assert.strictEqual(stagingCapacitorConfig.server.url, safeEnv.YAMB_CAPACITOR_SERVER_URL);
    assert.deepStrictEqual(stagingCapacitorConfig.server.allowNavigation, []);
} finally {
    if (previousUrl === undefined) delete process.env.YAMB_CAPACITOR_SERVER_URL;
    else process.env.YAMB_CAPACITOR_SERVER_URL = previousUrl;
    if (previousLocalHttp === undefined) delete process.env.YAMB_ALLOW_LOCAL_STAGING_HTTP;
    else process.env.YAMB_ALLOW_LOCAL_STAGING_HTTP = previousLocalHttp;
    if (previousApplicationId === undefined) delete process.env.YAMB_ANDROID_APPLICATION_ID;
    else process.env.YAMB_ANDROID_APPLICATION_ID = previousApplicationId;
    delete require.cache[require.resolve('../capacitor.config.js')];
}

assert(serverSource.includes("require('./scripts/reconnect-staging-safety')"), 'Server ne koristi staging startup guard');
assert(serverSource.includes('validateStagingFirebaseRuntime(firebaseAdminProjectId, process.env)'), 'Server ne proverava staging Firebase identitet');
assert(serverSource.includes("SERVER_RUNTIME.environment === 'staging' &&"), 'Keyless Firebase Auth mora biti ograničen na staging');
assert(serverSource.includes('stagingProjectIdOnlyAuth ? { projectId: firebaseAdminProjectId }'), 'Staging Admin Auth nema eksplicitan project ID');
assert(serverSource.includes("require('firebase-admin/app')"), 'Server mora koristiti modularni Firebase Admin App API');
assert(serverSource.includes("require('firebase-admin/auth')"), 'Server mora koristiti modularni Firebase Admin Auth API');
assert(serverSource.includes("require('firebase-admin/messaging')"), 'Server mora koristiti modularni Firebase Admin Messaging API');
assert(serverSource.includes('firebaseMessaging = stagingProjectIdOnlyAuth ? null : getMessaging(firebaseApp)'), 'Keyless staging mora isključiti Firebase Messaging');
assert(serverSource.includes('environment: SERVER_RUNTIME.environment'), 'Health endpoint ne potvrđuje runtime okruženje');
assert(serverSource.includes('instanceId: SERVER_RUNTIME.instanceId'), 'Health endpoint ne potvrđuje staging instancu');
assert(managersSource.includes("Staging/local runtime: AdMob je isključen."), 'Staging klijent ne blokira produkcione oglase');
assert(buildSource.includes('validateStagingGoogleServices'), 'Staging build ne proverava google-services.json');
assert(buildSource.includes('fs.writeFileSync(productionGoogleServicesPath, productionGoogleServices)'), 'Staging build ne vraća produkcioni Firebase fajl');

console.log('Reconnect staging checks passed: URL/DB/Firebase isolation, origin routing, AdMob block, dynamic Capacitor config, and remote identity preflight.');
