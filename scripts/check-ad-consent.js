const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const managers = fs.readFileSync(path.join(__dirname, '..', 'www', 'managers.js'), 'utf8');
const start = managers.indexOf('class AdMobController {');
const end = managers.indexOf('// --- GLOBALNE INSTANCE ---', start);
assert(start >= 0 && end > start, 'AdMobController nije pronađen');
const controllerSource = `${managers.slice(start, end)}\nAdMobController`;

function createController(capacitor) {
    const events = [];
    const privacyButton = { hidden: true };
    const context = {
        window: { Capacitor: capacitor, addEventListener() {} },
        document: {
            visibilityState: 'visible',
            getElementById: () => privacyButton,
            addEventListener() {}
        },
        localStorage: { getItem: () => null },
        navigator: { onLine: true },
        console: { info() {}, warn() {}, error() {} },
        setTimeout: () => { events.push('retry-scheduled'); return 1; },
        clearTimeout: () => {}
    };
    const AdMobController = vm.runInNewContext(controllerSource, context);
    const controller = new AdMobController();
    controller.updateUI = () => {};
    controller.setupListeners = async () => { events.push('listeners'); };
    controller.triggerHighPriorityLoad = type => { events.push(`load:${type}`); };
    return { controller, events, privacyButton };
}

async function checkLegacyWaitsForNativeForm() {
    let status = 'REQUIRED';
    const legacyAdMob = {
        requestConsentInfo: async () => ({ status, isConsentFormAvailable: true }),
        showConsentForm: async () => { throw new Error('Dupla forma pri pokretanju'); },
        initialize: async () => events.push('admob-init')
    };
    const capacitor = {
        isNativePlatform: () => true,
        isPluginAvailable: () => false,
        Plugins: { AdMob: legacyAdMob }
    };
    const { controller, events, privacyButton } = createController(capacitor);
    await controller.initialize();
    assert.equal(controller.canRequestAds, false);
    assert.equal(privacyButton.hidden, true);
    assert.deepEqual(events, ['retry-scheduled']);

    status = 'OBTAINED';
    await controller.initialize();
    assert.equal(controller.canRequestAds, true);
    assert.equal(privacyButton.hidden, false);
    assert(events.indexOf('admob-init') > events.indexOf('retry-scheduled'));
    assert(events.includes('load:rewarded') && events.includes('load:interstitial'));
}

async function checkLegacyFailureBlocksAds() {
    const legacyAdMob = {
        requestConsentInfo: async () => { throw new Error('UMP unavailable'); },
        showConsentForm: async () => ({}),
        initialize: async () => { throw new Error('Ads must remain blocked'); }
    };
    const { controller, events } = createController({
        isNativePlatform: () => true,
        isPluginAvailable: () => false,
        Plugins: { AdMob: legacyAdMob }
    });
    await controller.initialize();
    assert.equal(controller.canRequestAds, false);
    assert.deepEqual(events, ['retry-scheduled']);
}

async function checkNewPluginGatesAds() {
    for (const allowed of [false, true]) {
        const events = [];
        const adMob = { initialize: async () => events.push('admob-init') };
        const consent = {
            requestConsent: async () => {
                events.push('ump-complete');
                return { canRequestAds: allowed, privacyOptionsRequired: true };
            }
        };
        const { controller } = createController({
            isNativePlatform: () => true,
            isPluginAvailable: name => name === 'AdConsent',
            Plugins: { AdConsent: consent, AdMob: adMob }
        });
        await controller.initialize();
        assert.equal(controller.canRequestAds, allowed);
        assert.deepEqual(events, allowed ? ['ump-complete', 'admob-init'] : ['ump-complete']);
    }
}

Promise.resolve()
    .then(checkLegacyWaitsForNativeForm)
    .then(checkLegacyFailureBlocksAds)
    .then(checkNewPluginGatesAds)
    .then(() => console.log('Ad consent checks passed: legacy wait, failure block, and new UMP gate.'))
    .catch(error => { console.error(error); process.exitCode = 1; });
