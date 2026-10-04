const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

const packageJson = JSON.parse(read('package.json'));
const indexSource = read('www/index.html');
const appCheckSource = read('www/appCheck.js');
const gameSource = read('www/game.js');
const serverSource = read('server.js');
const gradleSource = read('android/app/build.gradle');
const firestoreRules = read('firestore.rules');

assert.strictEqual(
    packageJson.dependencies['@capacitor-firebase/app-check'],
    '6.3.1',
    'App Check plugin mora ostati usklađen sa Capacitor 6 Firebase pluginovima.'
);
assert(
    indexSource.indexOf('appCheck.js') < indexSource.indexOf('auth.js'),
    'App Check mora da se učita pre Firebase Authentication koda.'
);
assert(appCheckSource.includes('FirebaseAppCheck'), 'Klijent ne inicijalizuje Firebase App Check plugin.');
assert(appCheckSource.includes('setTokenAutoRefreshEnabled'), 'App Check automatsko osvežavanje tokena nije uključeno.');
assert(gameSource.includes("this.socket.emit('auth_firebase_token', { token, appCheckToken }"), 'Socket autentikacija ne šalje App Check token.');
assert(serverSource.includes("require('firebase-admin/app-check')"), 'Server ne učitava Firebase Admin App Check.');
assert(serverSource.includes('firebaseAppCheck.verifyToken(token)'), 'Server ne verifikuje App Check token.');
assert(serverSource.includes('FIREBASE_APP_CHECK_ENFORCE'), 'Nedostaje kontrolisani App Check rollout prekidač.');
assert(!gradleSource.includes('firebase-firestore'), 'Neiskorišćeni Firestore Android SDK ne treba da bude u buildu.');
assert(firestoreRules.includes('allow read, write: if false;'), 'Firestore mora ostati zatvoren dok ga igra ne koristi.');

console.log('Firebase security checks passed: App Check client/server rollout and deny-all Firestore rules.');
