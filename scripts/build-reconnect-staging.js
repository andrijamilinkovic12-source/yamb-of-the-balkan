const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.reconnect-staging') });
const {
    getValidatedStagingClientUrl,
    getValidatedStagingApplicationId,
    getValidatedStagingFirebaseProjectId,
    getValidatedStagingInstanceId,
    validateStagingGoogleServices
} = require('./reconnect-staging-safety');

const root = path.resolve(__dirname, '..');
const generatedConfigPath = path.join(root, 'android', 'app', 'src', 'main', 'assets', 'capacitor.config.json');
const generatedPluginsPath = path.join(root, 'android', 'app', 'src', 'main', 'assets', 'capacitor.plugins.json');
const androidManifestPath = path.join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
const generatedGradlePaths = [
    'android/app/capacitor.build.gradle',
    'android/capacitor-cordova-android-plugins/build.gradle',
    'android/capacitor-cordova-android-plugins/cordova.variables.gradle',
    'android/capacitor.settings.gradle'
].map(relativePath => path.join(root, relativePath));
const productionGoogleServicesPath = path.join(root, 'android', 'app', 'google-services.json');
const sourceApkPath = path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const outputDir = path.join(root, 'tmp', 'reconnect-staging');

function run(command, args, cwd = root, env = process.env) {
    const result = spawnSync(command, args, { cwd, env, stdio: 'inherit', shell: false });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} nije uspeo (exit ${result.status}).`);
}

async function readJsonResponse(url, label) {
    const response = await fetch(url, {
        cache: 'no-store',
        signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`${label} je vratio HTTP ${response.status}.`);
    return response.json();
}

async function verifyRemoteRuntime(serverUrl, expectedInstanceId, expectedFirebaseProjectId) {
    const status = await readJsonResponse(`${serverUrl}/healthz`, 'Staging /healthz');
    if (status?.environment !== 'staging' || status?.instanceId !== expectedInstanceId) {
        throw new Error('Staging server identitet ne odgovara YAMB_STAGING_INSTANCE_ID; build je zaustavljen.');
    }
    if (status?.maintenance === true) throw new Error('Staging server je u maintenance režimu.');

    const firebaseStatus = await readJsonResponse(`${serverUrl}/api/firebase-auth-status`, 'Staging Firebase status');
    if (!firebaseStatus?.firebaseAdminActive || firebaseStatus?.firebaseAdminProjectId !== expectedFirebaseProjectId) {
        throw new Error('Staging server nije povezan sa očekivanim Firebase projektom.');
    }
    if (!firebaseStatus?.firebaseWebApiKeyPresent) {
        throw new Error('Staging server nema eksplicitni Firebase Web API key.');
    }
}

async function main() {
    const instanceId = getValidatedStagingInstanceId(process.env);
    const serverUrl = getValidatedStagingClientUrl(process.env);
    const applicationId = getValidatedStagingApplicationId(process.env);
    const firebaseProjectId = getValidatedStagingFirebaseProjectId(process.env);
    const stagingGoogleServicesPath = String(process.env.YAMB_STAGING_GOOGLE_SERVICES_JSON || '').trim();
    if (!path.isAbsolute(stagingGoogleServicesPath)) {
        throw new Error('YAMB_STAGING_GOOGLE_SERVICES_JSON mora biti apsolutna putanja.');
    }
    if (!fs.existsSync(stagingGoogleServicesPath)) {
        throw new Error('Staging google-services.json nije pronađen.');
    }
    const productionGoogleServices = fs.readFileSync(productionGoogleServicesPath);
    const stagingGoogleServices = fs.readFileSync(stagingGoogleServicesPath);
    if (path.resolve(stagingGoogleServicesPath) === productionGoogleServicesPath) {
        throw new Error('Staging google-services.json ne sme biti produkcioni fajl projekta.');
    }
    const buildEnv = { ...process.env, YAMB_ANDROID_APPLICATION_ID: applicationId };
    validateStagingGoogleServices(
        stagingGoogleServices.toString('utf8'),
        productionGoogleServices.toString('utf8'),
        buildEnv
    );

    await verifyRemoteRuntime(serverUrl, instanceId, firebaseProjectId);
    run(process.execPath, [path.join(root, 'scripts', 'check-js.js')]);
    run(process.execPath, [path.join(root, 'scripts', 'check-match-results.js')]);
    run(process.execPath, [path.join(root, 'scripts', 'check-online-reconnect.js')]);

    const previousGeneratedConfig = fs.existsSync(generatedConfigPath)
        ? fs.readFileSync(generatedConfigPath)
        : null;
    const previousGeneratedPlugins = fs.existsSync(generatedPluginsPath)
        ? fs.readFileSync(generatedPluginsPath)
        : null;
    const originalAndroidManifest = fs.readFileSync(androidManifestPath);
    const previousGradleFiles = generatedGradlePaths.map(filePath =>
        fs.existsSync(filePath) ? fs.readFileSync(filePath) : null
    );
    try {
        // `copy` ne generiše registar nativnih plugina. Bez `sync` APK izgleda kao
        // mobilna aplikacija, ali FirebaseAuthentication nije dostupan u WebView-u.
        run(process.execPath, [path.join(root, 'node_modules', '@capacitor', 'cli', 'bin', 'capacitor'), 'sync', 'android'], root, buildEnv);
        const generatedConfig = JSON.parse(fs.readFileSync(generatedConfigPath, 'utf8'));
        if (generatedConfig?.server?.url !== serverUrl || generatedConfig?.appId !== applicationId) {
            throw new Error('Generisani Android config nema potvrđeni staging URL i package.');
        }
        const generatedPlugins = JSON.parse(fs.readFileSync(generatedPluginsPath, 'utf8'));
        if (!Array.isArray(generatedPlugins) || !generatedPlugins.some(plugin =>
            plugin?.classpath === 'io.capawesome.capacitorjs.plugins.firebase.authentication.FirebaseAuthenticationPlugin'
        )) {
            throw new Error('Staging APK nema registrovan nativni FirebaseAuthentication plugin.');
        }

        const productionLinkHost = 'android:host="yamb-of-the-balkan.onrender.com"';
        const manifestText = originalAndroidManifest.toString('utf8');
        if (manifestText.split(productionLinkHost).length - 1 !== 2) {
            throw new Error('Android manifest nema očekivana dva produkciona pozivna linka.');
        }
        const stagingLinkHost = `android:host="${new URL(serverUrl).hostname}"`;
        fs.writeFileSync(androidManifestPath, manifestText.replaceAll(productionLinkHost, stagingLinkHost), 'utf8');

        fs.writeFileSync(productionGoogleServicesPath, stagingGoogleServices);

        const gradleCommand = process.platform === 'win32' ? 'cmd.exe' : './gradlew';
        const gradleArgs = process.platform === 'win32'
            ? ['/d', '/s', '/c', 'gradlew.bat', 'assembleDebug']
            : ['assembleDebug'];
        run(gradleCommand, gradleArgs, path.join(root, 'android'), buildEnv);
        if (!fs.existsSync(sourceApkPath)) throw new Error('Gradle nije napravio očekivani debug APK.');

        fs.mkdirSync(outputDir, { recursive: true });
        const safeInstanceId = instanceId.replace(/[^a-z0-9_-]/gi, '-');
        const outputApkPath = path.join(outputDir, `yamb-reconnect-${safeInstanceId}.apk`);
        fs.copyFileSync(sourceApkPath, outputApkPath);
        const sha256 = crypto.createHash('sha256').update(fs.readFileSync(outputApkPath)).digest('hex');
        const manifest = {
            createdAt: new Date().toISOString(),
            environment: 'staging',
            instanceId,
            serverUrl,
            firebaseProjectId,
            applicationId,
            versionCode: 111,
            versionName: '12.1',
            apk: path.basename(outputApkPath),
            sha256
        };
        fs.writeFileSync(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
        console.log(`Staging APK je spreman: ${outputApkPath}`);
        console.log(`SHA-256: ${sha256}`);
    } finally {
        fs.writeFileSync(productionGoogleServicesPath, productionGoogleServices);
        fs.writeFileSync(androidManifestPath, originalAndroidManifest);
        generatedGradlePaths.forEach((filePath, index) => {
            if (previousGradleFiles[index]) fs.writeFileSync(filePath, previousGradleFiles[index]);
            else if (fs.existsSync(filePath)) fs.rmSync(filePath);
        });
        if (previousGeneratedConfig) {
            fs.mkdirSync(path.dirname(generatedConfigPath), { recursive: true });
            fs.writeFileSync(generatedConfigPath, previousGeneratedConfig);
        } else if (fs.existsSync(generatedConfigPath)) {
            fs.rmSync(generatedConfigPath);
        }
        if (previousGeneratedPlugins) fs.writeFileSync(generatedPluginsPath, previousGeneratedPlugins);
        else if (fs.existsSync(generatedPluginsPath)) fs.rmSync(generatedPluginsPath);
    }
}

main().catch(error => {
    console.error(`Staging build je zaustavljen: ${error.message}`);
    process.exitCode = 1;
});
