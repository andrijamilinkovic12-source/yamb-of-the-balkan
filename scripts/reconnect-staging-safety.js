const PRODUCTION_HOSTS = new Set([
    'yamb-of-the-balkan.onrender.com'
]);
const PRODUCTION_APPLICATION_ID = 'com.yamb.balkan';

function normalizeRuntimeEnvironment(value) {
    const normalized = String(value || 'production').trim().toLowerCase();
    if (normalized === 'prod') return 'production';
    if (normalized === 'stage' || normalized === 'qa') return 'staging';
    return normalized;
}

function getMongoDatabaseName(uri) {
    const raw = String(uri || '').trim();
    if (!raw) return '';
    try {
        const parsed = new URL(raw);
        return decodeURIComponent(parsed.pathname.replace(/^\/+/, '').split('/')[0] || '').trim();
    } catch (_) {
        return '';
    }
}

function hasStagingMarker(value) {
    return /(?:^|[._-])(staging|stage|qa|test)(?:$|[._-])/i.test(String(value || ''));
}

function getValidatedStagingInstanceId(env = process.env) {
    const instanceId = String(env.YAMB_STAGING_INSTANCE_ID || '').trim();
    if (!/^[a-z0-9][a-z0-9_-]{2,47}$/i.test(instanceId)) {
        throw new Error('YAMB_STAGING_INSTANCE_ID mora imati 3-48 bezbednih znakova.');
    }
    return instanceId;
}

function getValidatedStagingApplicationId(env = process.env) {
    const applicationId = String(env.YAMB_ANDROID_APPLICATION_ID || 'com.yamb.balkan.staging').trim();
    if (!/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/i.test(applicationId) || !hasStagingMarker(applicationId)) {
        throw new Error('YAMB_ANDROID_APPLICATION_ID mora biti validan poseban staging, qa ili test paket.');
    }
    if (applicationId === PRODUCTION_APPLICATION_ID) {
        throw new Error('Staging APK ne sme koristiti produkcioni Android package.');
    }
    return applicationId;
}

function getValidatedStagingFirebaseProjectId(env = process.env) {
    const projectId = String(env.YAMB_STAGING_FIREBASE_PROJECT_ID || '').trim();
    if (!/^[a-z0-9][a-z0-9-]{4,62}$/i.test(projectId) || !hasStagingMarker(projectId)) {
        throw new Error('YAMB_STAGING_FIREBASE_PROJECT_ID mora biti validan i sadržati staging, qa ili test marker.');
    }

    const productionProjectId = String(env.YAMB_PRODUCTION_FIREBASE_PROJECT_ID || '').trim();
    if (!productionProjectId) {
        throw new Error('YAMB_PRODUCTION_FIREBASE_PROJECT_ID je obavezan kao zaštita od mešanja Firebase projekata.');
    }
    if (productionProjectId === projectId) {
        throw new Error('Staging i produkcioni Firebase projekat ne smeju biti isti.');
    }
    return projectId;
}

function validateStagingFirebaseRuntime(actualProjectId, env = process.env) {
    const expectedProjectId = getValidatedStagingFirebaseProjectId(env);
    if (String(actualProjectId || '').trim() !== expectedProjectId) {
        throw new Error('Firebase Admin credentials ne pripadaju očekivanom staging projektu.');
    }
    if (!String(env.FIREBASE_WEB_API_KEY || '').trim()) {
        throw new Error('FIREBASE_WEB_API_KEY je obavezan za staging i ne sme pasti na produkcioni Android config.');
    }
    return expectedProjectId;
}

function parseGoogleServicesConfig(value, label) {
    try {
        return typeof value === 'string' ? JSON.parse(value) : value;
    } catch (_) {
        throw new Error(`${label} google-services.json nije validan JSON.`);
    }
}

function validateStagingGoogleServices(stagingValue, productionValue, env = process.env) {
    const staging = parseGoogleServicesConfig(stagingValue, 'Staging');
    const production = parseGoogleServicesConfig(productionValue, 'Produkcioni');
    const expectedProjectId = getValidatedStagingFirebaseProjectId(env);
    const stagingProjectId = String(staging?.project_info?.project_id || '').trim();
    const productionProjectId = String(production?.project_info?.project_id || '').trim();
    const applicationId = getValidatedStagingApplicationId(env);
    const packages = Array.isArray(staging?.client)
        ? staging.client.map(client => String(client?.client_info?.android_client_info?.package_name || '').trim())
        : [];

    if (stagingProjectId !== expectedProjectId) {
        throw new Error('Staging google-services.json ne pripada očekivanom Firebase projektu.');
    }
    if (!productionProjectId || productionProjectId === stagingProjectId) {
        throw new Error('Staging google-services.json mora koristiti drugi projekat od produkcionog.');
    }
    if (!packages.includes(applicationId)) {
        throw new Error(`Staging Firebase projekat nema Android klijent ${applicationId}.`);
    }
    return { projectId: stagingProjectId, applicationId };
}

function getValidatedStagingClientUrl(env = process.env) {
    const raw = String(env.YAMB_CAPACITOR_SERVER_URL || '').trim();
    if (!raw) throw new Error('YAMB_CAPACITOR_SERVER_URL je obavezan za staging build.');

    let parsed;
    try {
        parsed = new URL(raw);
    } catch (_) {
        throw new Error('YAMB_CAPACITOR_SERVER_URL nije ispravan URL.');
    }

    const isLoopback = ['localhost', '127.0.0.1', '10.0.2.2'].includes(parsed.hostname);
    const allowLocalHttp = /^(?:1|true|yes)$/i.test(String(env.YAMB_ALLOW_LOCAL_STAGING_HTTP || ''));
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLoopback && allowLocalHttp)) {
        throw new Error('Staging klijent zahteva HTTPS; lokalni HTTP je dozvoljen samo uz YAMB_ALLOW_LOCAL_STAGING_HTTP=true.');
    }
    if (PRODUCTION_HOSTS.has(parsed.hostname.toLowerCase())) {
        throw new Error('Staging build odbija produkcioni Yamb host.');
    }
    if (parsed.username || parsed.password || parsed.search || parsed.hash) {
        throw new Error('Staging server URL ne sme sadržati kredencijale, query ili fragment.');
    }

    parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    return parsed.toString().replace(/\/$/, '');
}

function validateStagingServerEnvironment(env = process.env) {
    const runtimeEnvironment = normalizeRuntimeEnvironment(env.YAMB_RUNTIME_ENV);
    if (runtimeEnvironment !== 'staging') {
        throw new Error('YAMB_RUNTIME_ENV mora biti staging za izolovani reconnect server.');
    }

    const instanceId = getValidatedStagingInstanceId(env);

    const expectedDatabaseName = String(env.YAMB_STAGING_DB_NAME || '').trim();
    const actualDatabaseName = getMongoDatabaseName(env.MONGO_URI);
    if (!expectedDatabaseName || !hasStagingMarker(expectedDatabaseName)) {
        throw new Error('YAMB_STAGING_DB_NAME mora eksplicitno sadržati staging, qa ili test marker.');
    }
    if (!actualDatabaseName || actualDatabaseName !== expectedDatabaseName) {
        throw new Error('MONGO_URI baza ne odgovara tačno vrednosti YAMB_STAGING_DB_NAME.');
    }

    const productionDatabaseName = String(env.YAMB_PRODUCTION_DB_NAME || '').trim();
    if (productionDatabaseName && productionDatabaseName === actualDatabaseName) {
        throw new Error('Staging i produkciona baza ne smeju imati isto ime.');
    }

    return { runtimeEnvironment, instanceId, databaseName: actualDatabaseName };
}

function getServerRuntimeDescriptor(env = process.env) {
    const runtimeEnvironment = normalizeRuntimeEnvironment(env.YAMB_RUNTIME_ENV);
    if (runtimeEnvironment === 'staging') {
        const staging = validateStagingServerEnvironment(env);
        return {
            environment: staging.runtimeEnvironment,
            instanceId: staging.instanceId
        };
    }
    if (runtimeEnvironment !== 'production' && runtimeEnvironment !== 'development' && runtimeEnvironment !== 'test') {
        throw new Error(`Nepoznat YAMB_RUNTIME_ENV: ${runtimeEnvironment}`);
    }
    return { environment: runtimeEnvironment, instanceId: '' };
}

module.exports = {
    PRODUCTION_APPLICATION_ID,
    PRODUCTION_HOSTS,
    getMongoDatabaseName,
    getServerRuntimeDescriptor,
    getValidatedStagingApplicationId,
    getValidatedStagingClientUrl,
    getValidatedStagingFirebaseProjectId,
    getValidatedStagingInstanceId,
    hasStagingMarker,
    normalizeRuntimeEnvironment,
    validateStagingFirebaseRuntime,
    validateStagingGoogleServices,
    validateStagingServerEnvironment
};
