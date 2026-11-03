'use strict';
// Read-only diagnostics for the dedicated debuggable QA emulator. No UI input,
// preference changes, auth files, tokens, emails or raw installation IDs.
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const adb = path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe');
const serial = 'emulator-5556', pkg = 'com.yamb.balkan.staging';
function read(args) {
    return execFileSync(adb, ['-s', serial, ...args], { encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'] });
}
function preferences(file) {
    try { return read(['shell', 'run-as', pkg, 'cat', 'shared_prefs/' + file + '.xml']); }
    catch (_) { return ''; }
}
function boolean(xml, key) {
    const value = new RegExp('<boolean name="' + key + '" value="(true|false)"').exec(xml)?.[1];
    return value ? value === 'true' : null;
}
function consentCode(xml, key) {
    const value = new RegExp('<string name="' + key + '">([^<]*)</string>').exec(xml)?.[1];
    return value && /^[A-Za-z0-9_.:-]{1,120}$/.test(value) ? value : null;
}
try {
    if (read(['emu', 'avd', 'name']).split(/\r?\n/)[0].trim() !== 'Yamb_Account_Deletion_QA') throw Error('qa_device_mismatch');
    const measurement = preferences('com.google.android.gms.measurement.prefs');
    const choice = preferences('yamb_analytics_privacy_v1');
    const logs = read(['logcat', '-d', '-s', 'Capacitor:D']);
    console.log(JSON.stringify({
        qaDeviceVerified: true, package: pkg,
        nativePrivacyPluginObserved: /Registering plugin instance: AnalyticsPrivacy/.test(logs),
        measurementPreferencesReadable: !!measurement,
        collectionEnabled: boolean(measurement, 'measurement_enabled'),
        collectionEnabledFromApi: boolean(measurement, 'measurement_enabled_from_api'),
        consentCode: consentCode(measurement, 'consent_settings'),
        dmaConsentCode: consentCode(measurement, 'dma_consent_settings'),
        savedChoice: boolean(choice, 'granted'),
        boundIdentityPresent: /<string name="boundUid">[^<]+<\/string>/.test(choice),
        identifiersDisclosed: false
    }));
} catch (_) {
    console.error(JSON.stringify({ ok: false, reason: 'qa_device_diagnostic_unavailable' }));
    process.exitCode = 1;
}
