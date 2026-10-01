const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'tmp', 'reconnect-staging');
const manifestPath = path.join(outputDir, 'manifest.json');
const adb = process.env.ADB_PATH || path.join(
    process.env.LOCALAPPDATA || '',
    'Android', 'Sdk', 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb'
);

function adbRun(args, capture = false) {
    const result = spawnSync(adb, args, { encoding: capture ? 'utf8' : undefined, stdio: capture ? 'pipe' : 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`adb ${args.join(' ')} nije uspeo.`);
    return capture ? String(result.stdout || '') : '';
}

function main() {
    const serials = process.argv.slice(2).map(value => String(value || '').trim()).filter(Boolean);
    if (serials.length !== 2 || serials[0] === serials[1]) {
        throw new Error('Navedi tačno dva različita ADB serijska broja test uređaja.');
    }
    if (!fs.existsSync(manifestPath)) throw new Error('Nedostaje staging manifest; prvo pokreni build:reconnect-staging.');

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.environment !== 'staging' || !manifest.instanceId || !/[._-](?:staging|qa|test)(?:$|[._-])/i.test(manifest.applicationId || '')) {
        throw new Error('APK manifest nije potvrđen staging artefakt.');
    }
    const apkPath = path.join(outputDir, path.basename(manifest.apk || ''));
    if (!fs.existsSync(apkPath)) throw new Error('Staging APK iz manifesta ne postoji.');
    const sha256 = crypto.createHash('sha256').update(fs.readFileSync(apkPath)).digest('hex');
    if (sha256 !== manifest.sha256) throw new Error('SHA-256 APK-a se ne poklapa sa staging manifestom.');

    const devices = adbRun(['devices'], true)
        .split(/\r?\n/)
        .slice(1)
        .map(line => line.trim().split(/\s+/))
        .filter(parts => parts[0] && parts[1] === 'device')
        .map(parts => parts[0]);
    serials.forEach(serial => {
        if (!devices.includes(serial)) throw new Error(`Test uređaj nije spreman: ${serial}`);
    });

    serials.forEach(serial => {
        adbRun(['-s', serial, 'install', '-r', '-t', apkPath]);
        const packageLine = adbRun(['-s', serial, 'shell', 'cmd', 'package', 'list', 'packages', '--show-versioncode'], true)
            .split(/\r?\n/)
            .find(line => line.includes(`package:${manifest.applicationId} `));
        if (!packageLine || !packageLine.includes(`versionCode:${manifest.versionCode}`)) {
            throw new Error(`Verzija nije potvrđena na uređaju ${serial}.`);
        }
    });
    console.log(`Staging APK ${manifest.instanceId} je potvrđen na oba test uređaja.`);
}

try {
    main();
} catch (error) {
    console.error(`Instalacija staging klijenata je zaustavljena: ${error.message}`);
    process.exitCode = 1;
}
