'use strict';
// Local demo services only: no .env, real Google accounts, production DB or deploy.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn, spawnSync } = require('node:child_process');
const express = require('express');
const { MongoClient } = require('mongodb');
const { MongoMemoryServer } = require('../tmp/account-deletion-tests/node_modules/mongodb-memory-server-core');
const root = path.resolve(__dirname, '..');
const verifyOnly = process.argv.includes('--verify-only');
const temporary = path.join(root, 'tmp/account-deletion-qa', verifyOnly ? 'verification' : 'preview');
const project = 'demo-yamb-account-deletion';
const frontendPort = verifyOnly ? 3191 : 3181, backendPort = verifyOnly ? 3192 : 3182, authPort = verifyOnly ? 9299 : 9199;
const children = [];
let mongod, mongo, listener;
const reports = path.join(root, 'reports/play-console-pregled-2026-11-01');
fs.mkdirSync(temporary, { recursive: true });
fs.mkdirSync(reports, { recursive: true });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function available(url, predicate = response => response.ok) {
    for (let attempt = 0; attempt < 100; attempt++) {
        try { const response = await fetch(url); if (await predicate(response)) return; } catch (_) {}
        await delay(400);
    }
    throw new Error('Local test service did not become ready: ' + url);
}

async function identity(kind) {
    assert(['web', 'native', 'verification'].includes(kind));
    const credential = { sub: 'deletion-test-' + kind, email: `deletion-${kind}@example.invalid`, email_verified: true, name: 'Probni igrač' };
    const response = await fetch(`http://127.0.0.1:${authPort}/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=local-test-key`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
            postBody: new URLSearchParams({ id_token: JSON.stringify(credential), providerId: 'google.com' }).toString(),
            requestUri: `http://localhost:${frontendPort}`, returnSecureToken: true
        })
    });
    const data = await response.json();
    if (!response.ok) throw new Error('Emulator sign-in failed: ' + JSON.stringify(data));
    const uid = data.localId;
    assert(uid && data.idToken);
    const db = mongo.db('account_deletion_local_demo');
    await db.collection('userprofiles').updateOne({ firebaseUid: uid }, { $setOnInsert: { firebaseUid: uid, playerName: 'Probni igrač', balance: 1234, friends: [], h2hStats: {}, photoUrl: '' } }, { upsert: true });
    await db.collection('userprofilebackups').updateOne({ firebaseUid: uid }, { $setOnInsert: { firebaseUid: uid, playerName: 'Probni igrač', profile: { balance: 1234 }, createdAt: new Date() } }, { upsert: true });
    return { uid, email: credential.email, displayName: credential.name, token: data.idToken };
}

async function verifyEndToEnd() {
    const account = await identity('verification');
    const base = `http://127.0.0.1:${backendPort}`;
    const authHeaders = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + account.token };
    const missing = await fetch(base + '/api/account-deletion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmation: 'DELETE' }) });
    assert.equal(missing.status, 401);
    const cancelled = await fetch(base + '/api/account-deletion', { method: 'POST', headers: authHeaders, body: JSON.stringify({ uid: 'someone-else' }) });
    assert.equal(cancelled.status, 400);
    const accepted = await fetch(base + '/api/account-deletion', { method: 'POST', headers: authHeaders, body: JSON.stringify({ confirmation: 'DELETE', uid: 'ignored-client-input' }) });
    assert.equal(accepted.status, 202);
    const receipt = await accepted.json();
    let state;
    for (let attempt = 0; attempt < 60; attempt++) {
        const result = await fetch(base + '/api/account-deletion/status/' + receipt.jobId, { headers: { 'X-Deletion-Receipt': receipt.receipt } });
        state = (await result.json()).state;
        if (state === 'complete') break;
        await delay(250);
    }
    assert.equal(state, 'complete', 'real app server must finish the durable deletion job');
    const db = mongo.db('account_deletion_local_demo');
    assert.equal(await db.collection('userprofiles').countDocuments({ firebaseUid: account.uid }), 0);
    assert.equal(await db.collection('userprofilebackups').countDocuments({ firebaseUid: account.uid }), 0);
    process.env.FIREBASE_AUTH_EMULATOR_HOST = `127.0.0.1:${authPort}`;
    const { initializeApp, deleteApp } = require('firebase-admin/app');
    const { getAuth } = require('firebase-admin/auth');
    const verificationApp = initializeApp({ projectId: project }, 'local-deletion-verifier');
    try { await assert.rejects(getAuth(verificationApp).getUser(account.uid), error => error.code === 'auth/user-not-found'); }
    finally { await deleteApp(verificationApp); }
    const proof = {
        testedAt: new Date().toISOString(), environment: 'Loopback-only demo Firebase Authentication + temporary MongoDB',
        results: { noToken: missing.status, noConfirmation: cancelled.status, confirmedRequest: accepted.status, finalState: state, profileDeleted: true, backupDeleted: true, firebaseIdentityDeleted: true },
        productionResourcesUsed: false
    };
    fs.writeFileSync(path.join(reports, 'account-deletion-end-to-end.json'), JSON.stringify(proof, null, 2) + '\n');
    console.log('END-TO-END PASS: real app HTTP routes, Firebase Admin emulator, profile + backup deletion, durable job and receipt.');
}

async function cleanup() {
    for (const child of children.reverse()) if (child.pid && child.exitCode === null) {
        if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' });
        else child.kill('SIGTERM');
    }
    await new Promise(resolve => listener ? listener.close(resolve) : resolve());
    if (mongo) await mongo.close();
    if (mongod) await mongod.stop();
}
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => {
    if (stopping) return; stopping = true;
    await cleanup(); process.exit(0);
});

(async () => {
    fs.writeFileSync(path.join(temporary, 'firebase.json'), JSON.stringify({ emulators: {
        auth: { host: '127.0.0.1', port: authPort }, hub: { host: '127.0.0.1', port: verifyOnly ? 4429 : 4419 },
        logging: { host: '127.0.0.1', port: verifyOnly ? 4529 : 4519 }, ui: { enabled: false }, singleProjectMode: true
    } }));
    fs.writeFileSync(path.join(temporary, 'empty.env'), '# Isolated local demo: no production environment.\n');
    mongod = await MongoMemoryServer.create({ binary: { version: '7.0.14', downloadDir: path.join(root, 'tmp/account-deletion-tests/binaries') }, instance: { ip: '127.0.0.1', dbName: 'account_deletion_local_demo' } });
    assert.equal(new URL(mongod.getUri()).hostname, '127.0.0.1');
    mongo = await MongoClient.connect(mongod.getUri());
    const emulatorLog = fs.openSync(path.join(temporary, 'firebase.log'), 'a');
    const firebase = spawn('firebase.cmd', ['emulators:start', '--only', 'auth', '--project', project, '--config', 'firebase.json'], {
        cwd: temporary, windowsHide: true, shell: process.platform === 'win32',
        env: { ...process.env, CI: 'true', NO_UPDATE_NOTIFIER: '1', FIREBASE_CLI_DISABLE_TELEMETRY: '1' }, stdio: ['ignore', emulatorLog, emulatorLog]
    });
    children.push(firebase);
    await available(`http://127.0.0.1:${authPort}/`, () => true);
    const serverLog = fs.openSync(path.join(temporary, 'server.log'), 'a');
    const env = {
        ...process.env, YAMB_RUNTIME_ENV: 'test', YAMB_TEST_ENV_FILE: path.join(temporary, 'empty.env'),
        PORT: String(backendPort), MONGO_URI: mongod.getUri('account_deletion_local_demo'),
        FIREBASE_AUTH_EMULATOR_HOST: `127.0.0.1:${authPort}`, FIREBASE_WEB_API_KEY: 'local-test-key',
        GOOGLE_CLOUD_PROJECT: project, GCLOUD_PROJECT: project, ACCOUNT_DELETION_ENABLED: 'true', ACCOUNT_DELETION_SINGLE_INSTANCE: 'true',
        FIREBASE_APP_CHECK_ENFORCE: 'false', MAINTENANCE_MODE: 'false',
        ACCOUNT_DELETION_FIREBASE_WEB_CONFIG_JSON: JSON.stringify({ apiKey: 'local-test-key', authDomain: 'localhost', projectId: project, appId: '1:123456789:web:localtest' })
    };
    for (const key of ['FIREBASE_SERVICE_ACCOUNT', 'FIREBASE_ADMIN_CREDENTIALS', 'FIREBASE_SERVICE_ACCOUNT_BASE64', 'FIREBASE_SERVICE_ACCOUNT_PATH', 'GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_CONFIG']) env[key] = '';
    const backend = spawn(process.execPath, ['server.js'], { cwd: root, env, windowsHide: true, stdio: ['ignore', serverLog, serverLog] });
    children.push(backend);
    await available(`http://127.0.0.1:${backendPort}/api/account-deletion/config`, async response => response.ok && (await response.json()).enabled === true);
    await verifyEndToEnd();
    if (verifyOnly) { await cleanup(); return; }

    const app = express();
    app.use(express.json());
    app.get('/game-source.html', (_req, res) => res.sendFile(path.join(root, 'www/index.html')));
    app.get('/__qa__/identity/:kind', async (req, res) => {
        if (!['web', 'native'].includes(req.params.kind)) return res.sendStatus(404);
        try { res.set('Cache-Control', 'no-store').json(await identity(req.params.kind)); }
        catch (_) { res.status(503).json({ error: 'demo_unavailable' }); }
    });
    app.use('/api/account-deletion', (req, res) => {
        const body = req.method === 'POST' ? JSON.stringify(req.body) : '';
        const headers = { ...req.headers, host: `127.0.0.1:${backendPort}` };
        if (req.method === 'POST') headers['content-length'] = Buffer.byteLength(body);
        const target = http.request({ hostname: '127.0.0.1', port: backendPort, path: '/api/account-deletion' + req.url, method: req.method,
            headers }, upstream => {
            res.writeHead(upstream.statusCode, upstream.headers); upstream.pipe(res);
        });
        target.on('error', () => res.sendStatus(503));
        target.end(body);
    });
    app.get('/__qa__/web-bootstrap.js', (_req, res) => res.type('js').send(fs.readFileSync(path.join(root, 'qa/account-deletion-web-bootstrap.js'), 'utf8')));
    app.get('/__qa__/native-bootstrap.js', (_req, res) => res.type('js').send(fs.readFileSync(path.join(root, 'qa/account-deletion-native-bootstrap.js'), 'utf8')));
    app.get('/__qa__/modal.js', (_req, res) => {
        const source = fs.readFileSync(path.join(root, 'www/managers.js'), 'utf8');
        const start = source.indexOf('class ModalManager');
        const end = source.indexOf('// --- 4. EFFECT MANAGER', start);
        res.type('js').send("const _safeT = key => typeof t === 'function' ? t(key) : key;\n" + source.slice(start, end) + '\nwindow.modalManager = new ModalManager();');
    });
    app.get('/native-preview.html', (_req, res) => res.sendFile(path.join(root, 'qa/account-deletion-native.html')));
    app.get('/delete-account.html', (_req, res) => {
        let html = fs.readFileSync(path.join(root, 'website-updates/public/delete-account.html'), 'utf8');
        html = html.replace('src="account-deletion-web.js?v=1"', 'src="/__qa__/web-bootstrap.js"');
        html = html.replace('<body>', '<body><div style="padding:10px;text-align:center;background:#e6d298;color:#302b19;font:13px Arial">LOKALNA PROBA — Firebase emulator i privremena baza. Nema stvarnih naloga.</div>');
        res.set('Cache-Control', 'no-store').type('html').send(html);
    });
    app.use(express.static(path.join(root, 'website-updates/public'), { maxAge: 0 }));
    app.use(express.static(path.join(root, 'www'), { maxAge: 0 }));
    listener = app.listen(frontendPort, '127.0.0.1', () => console.log(`LOCAL PREVIEW READY http://127.0.0.1:${frontendPort}/delete-account.html and /native-preview.html`));
})().catch(async error => { console.error(error); await cleanup(); process.exitCode = 1; });
