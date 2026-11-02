'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { Client, text, webApiOrigin } = require('../www/account-deletion-client');
assert.equal(webApiOrigin(new URL('https://yamb-reconnect-qa.onrender.com/delete-account.html')), 'https://yamb-reconnect-qa.onrender.com', 'QA web requests must never target production');
assert.equal(webApiOrigin(new URL('http://127.0.0.1:3181/delete-account.html')), 'http://127.0.0.1:3181');
assert.equal(webApiOrigin(new URL('https://www.yambofthebalkan.com/delete-account.html')), 'https://yamb-of-the-balkan.onrender.com');
const { create, translations } = require('../www/account-deletion-page');
const uid = 'test_account_to_remove_12345';
const other = 'test_account_to_keep_678901';
const receipt = { jobId: '00000000-0000-4000-8000-000000000001', receipt: 'a'.repeat(43) };
function storage(values = {}) {
    const data = new Map(Object.entries(values));
    return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key) };
}
{
    const source = fs.readFileSync('www/auth.js', 'utf8');
    const normalizerSource = source.match(/function normalizeFirebaseAuthUser\(user\) \{[\s\S]*?\n\}/)[0];
    const normalize = values => vm.runInNewContext(normalizerSource + '\nnormalizeFirebaseAuthUser', {
        localStorage: storage(values), _t: () => 'Igrač'
    });
    const privateUser = { uid, email: 'private-login@example.invalid' };
    const missingName = normalize({})(privateUser);
    assert.equal(missingName.displayName, 'Igrač', 'a private login email must not become the public player name');
    assert.equal(missingName.email, privateUser.email, 'the private authentication email remains available for account management');
    assert.equal(normalize({ yamb_uid: other, yamb_player_name: 'Other player' })(privateUser).displayName, 'Igrač', 'a previous account name must not leak into the new account');
    assert.equal(normalize({ yamb_uid: uid, yamb_player_name: privateUser.email })(privateUser).displayName, 'Igrač', 'legacy cached email fallbacks must not remain public');
    assert.equal(normalize({ yamb_uid: uid, yamb_player_name: 'My nickname' })(privateUser).displayName, 'My nickname');
    assert.equal(normalize({})({ ...privateUser, displayName: 'Google name' }).displayName, 'Google name');
}
function pageHarness(analyticsState) {
    const ids = ['deletion-message', 'deletion-login', 'deletion-account', 'deletion-check', 'deletion-continue', 'deletion-change', 'deletion-final', 'deletion-cancel', 'deletion-agree', 'deletion-email', 'deletion-review', 'deletion-review-email'];
    const elements = Object.fromEntries(ids.map(id => [id, { hidden: id !== 'deletion-message', disabled: false, checked: false, textContent: '', dataset: {}, handlers: {}, addEventListener(event, handler) { this.handlers[event] = handler; }, focus() {} }]));
    const document = { documentElement: {}, getElementById: id => elements[id], querySelectorAll: () => [] };
    let saved = null;
    let requests = 0;
    let state = 'pending';
    let verifiedUid = uid;
    const client = {
        savedReceipt: () => saved,
        request: async token => { assert.equal(token, 'test-only-token'); requests++; saved = receipt; return receipt; },
        poll: async () => { if (state === 'error') throw new Error('simulated failure'); if (state === 'complete') saved = null; return { state, ...(analyticsState ? { analytics: { state: analyticsState } } : {}) }; }
    };
    const user = { uid, email: '<sample>@example.invalid', getIdToken: async () => 'test-only-token' };
    const auth = { signIn: async () => user, signOut: async () => {}, reauthenticate: async () => ({ ...user, uid: verifiedUid }) };
    const controller = create({ document, client, auth, language: 'en' });
    return { elements, controller, click: id => elements[id].handlers.click(), requests: () => requests, setState: value => { state = value; }, setVerifiedUid: value => { verifiedUid = value; } };
}

function nativeHarness(choices = [true, true], selectedUid = uid) {
    const localStorage = storage({ yamb_uid: uid, yamb_lang: 'en', yamb_stats: 'private-stats', ['yamb_account_snapshot_' + uid]: 'own-snapshot', ['yamb_account_snapshot_' + other]: 'other-snapshot' });
    const savedGames = new Map([['yamb_saved_game_' + uid + '_1', { private: true }], ['yamb_saved_game_' + other + '_1', { preserve: true }], ['yamb_ultimate_scores', [{ uid }, { uid: other }]]]);
    const messages = [];
    let requests = 0, signIns = 0, signOuts = 0, reloads = 0;
    const elements = { 'delete-account-button': { disabled: true, textContent: '' } };
    const document = { getElementById: id => elements[id], addEventListener() {} };
    const auth = {
        signInWithGoogle: async () => { signIns++; return { user: { uid: selectedUid, email: 'test@example.invalid' } }; },
        getIdToken: async () => ({ token: 'test-only-token' }), getCurrentUser: async () => ({ user: { uid: selectedUid } }),
        signOut: async () => { signOuts++; }
    };
    class FakeClient {
        savedReceipt() { return null; }
        async config() { return { enabled: true }; }
        async request(token) { assert.equal(token, 'test-only-token'); requests++; return receipt; }
        async poll() { return { state: 'complete' }; }
    }
    const window = {
        YambAccountDeletionClient: { Client: FakeClient, text },
        modalManager: { confirm: async () => choices.shift() },
        location: { origin: 'https://example.invalid', reload: () => { reloads++; } }, addEventListener() {},
        app: { socket: { disconnect() {} }, autoSaveGame() {}, navigateTo() {}, stats: {} },
        Capacitor: { Plugins: { FirebaseAuthentication: auth } },
        localforage: { keys: async () => [...savedGames.keys()], getItem: async key => savedGames.get(key), setItem: async (key, value) => savedGames.set(key, value), removeItem: async key => savedGames.delete(key) }
    };
    const authSource = fs.readFileSync('www/auth.js', 'utf8');
    const keyFunction = authSource.match(/function getAccountSnapshotStorageKeys\(uid\) \{[\s\S]*?\n\}/)[0];
    vm.runInNewContext(keyFunction + '\n' + fs.readFileSync('www/account-privacy.js', 'utf8'), {
        window, document, localStorage, SERVER_URL: 'https://example.invalid',
        prikaziObavestenje: async message => messages.push(message),
        saveAccountLocalSnapshot: id => localStorage.setItem('yamb_account_snapshot_' + id, 'preserved-before-account-change')
    });
    return { window, localStorage, savedGames, messages, counts: () => ({ requests, signIns, signOuts, reloads }) };
}

(async () => {
    const saved = storage();
    const fetchCalls = [];
    let status = 'pending';
    let clock = 0;
    const client = new Client('https://example.invalid', {
        storage: saved, now: () => clock, sleep: async ms => { clock += ms; },
        fetch: async (url, options) => {
            fetchCalls.push({ url, options });
            return { ok: true, json: async () => url.endsWith('/status/' + receipt.jobId) ? { ok: true, state: status } : { ok: true, ...receipt } };
        }
    });
    assert.throws(() => new Client('http://unsafe.example.invalid'), /invalid_deletion_origin/);
    await client.request('test-only-token');
    assert.equal(fetchCalls[0].url.includes('test-only-token'), false);
    assert.equal(JSON.parse(fetchCalls[0].options.body).confirmation, 'DELETE');
    assert.equal(fetchCalls[0].options.credentials, 'omit');
    assert.equal([...saved.data.values()].join('').includes('test-only-token'), false);
    assert.equal((await client.poll(undefined, 2000)).state, 'pending');
    assert(client.savedReceipt(), 'pending status must retain the receipt');
    status = 'complete';
    assert.equal((await client.poll()).state, 'complete');
    assert.equal(client.savedReceipt(), null);
    assert(fetchCalls.filter(item => item.url.includes('/status/')).every(item => item.options.headers['X-Deletion-Receipt'] === receipt.receipt));

    const page = pageHarness();
    await page.click('deletion-final');
    assert.equal(page.requests(), 0);
    await page.click('deletion-login');
    assert.equal(page.elements['deletion-email'].textContent, '<sample>@example.invalid');
    await page.click('deletion-continue');
    assert.equal(page.elements['deletion-review'].hidden, true);
    page.elements['deletion-agree'].checked = true;
    await page.click('deletion-continue');
    await page.click('deletion-cancel');
    assert.equal(page.requests(), 0, 'cancel must never submit a deletion');
    await page.click('deletion-continue');
    page.setVerifiedUid(other);
    await page.click('deletion-final');
    assert.equal(page.requests(), 0, 'a changed identity must not be submitted');
    page.setVerifiedUid(uid);
    await page.click('deletion-final');
    assert.equal(page.requests(), 1);
    assert.equal(page.elements['deletion-message'].textContent, translations.en.pending);
    assert.equal(page.elements['deletion-check'].hidden, false);
    page.setState('error');
    await page.click('deletion-check');
    assert.equal(page.elements['deletion-message'].textContent, translations.en.error);
    page.setState('complete');
    await page.click('deletion-check');
    assert.equal(page.elements['deletion-message'].textContent, translations.en.complete);
    const analyticsPage = pageHarness('submitted');
    await analyticsPage.click('deletion-login');
    analyticsPage.elements['deletion-agree'].checked = true;
    await analyticsPage.click('deletion-continue');
    await analyticsPage.click('deletion-final');
    analyticsPage.setState('complete');
    await analyticsPage.click('deletion-check');
    assert.equal(analyticsPage.elements['deletion-message'].textContent, translations.en.complete + '\n\n' + translations.en.analyticsSubmitted,
        'web completion must distinguish game cleanup from asynchronous Google processing');

    const cancelled = nativeHarness([false]);
    await cancelled.window.yambAccountPrivacy.begin();
    assert.equal(cancelled.counts().signIns, 0);
    assert.equal(cancelled.localStorage.getItem('yamb_stats'), 'private-stats');
    const cancelledAfterLogin = nativeHarness([true, false]);
    await cancelledAfterLogin.window.yambAccountPrivacy.begin();
    assert.equal(cancelledAfterLogin.counts().requests, 0);
    assert.equal(cancelledAfterLogin.localStorage.getItem('yamb_uid'), uid);
    const wrong = nativeHarness([true], other);
    await wrong.window.yambAccountPrivacy.begin();
    assert.equal(wrong.counts().requests, 0);
    assert.equal(wrong.localStorage.getItem('yamb_account_snapshot_' + uid), 'preserved-before-account-change');
    assert(wrong.savedGames.has('yamb_saved_game_' + uid + '_1'));
    const deleted = nativeHarness();
    await deleted.window.yambAccountPrivacy.begin();
    assert.equal(deleted.counts().requests, 1);
    assert.equal(deleted.counts().signOuts, 1);
    assert.equal(deleted.localStorage.getItem('yamb_uid'), null);
    assert.equal(deleted.localStorage.getItem('yamb_account_snapshot_' + uid), null);
    assert.equal(deleted.localStorage.getItem('yamb_account_snapshot_' + other), 'other-snapshot');
    assert.equal(deleted.localStorage.getItem('yamb_lang'), 'en');
    assert.equal(deleted.savedGames.has('yamb_saved_game_' + uid + '_1'), false);
    assert.equal(deleted.savedGames.has('yamb_saved_game_' + other + '_1'), true);
    assert.deepEqual(deleted.savedGames.get('yamb_ultimate_scores'), [{ uid: other }]);
    assert(deleted.messages.includes(text.en.complete));
    const remote = nativeHarness();
    await remote.window.yambAccountPrivacy.handleStarted({ uid: other });
    assert.equal(remote.counts().signOuts, 0);
    await remote.window.yambAccountPrivacy.handleStarted({ uid });
    assert.equal(remote.counts().requests, 0);
    assert.equal(remote.counts().signOuts, 1);
    assert(remote.messages.includes(text.en.received));
    console.log('Account deletion UI checks passed: explicit confirmation, cancel, identity mismatch, safe text rendering, pending/failure/success, private receipts and account-specific device cleanup.');
})().catch(error => { console.error(error); process.exitCode = 1; });
