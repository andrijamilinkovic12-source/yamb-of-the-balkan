'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const read = file => fs.readFileSync(require.resolve(file), 'utf8');
const source = read('../www/auth.js');
const start = source.indexOf('let facebookLoginAvailable =');
const end = source.indexOf('async function odjaviSe(', start);
assert(start >= 0 && end > start);

function fixture({ provider = 'google.com', popupError, linkError, changeIdentityDuringPopup = false } = {}) {
    const calls = [], messages = [];
    const account = { uid: 'test-uid', displayName: 'Test player', providerData: [{ providerId: provider }] };
    let nativeUser = account;
    const window = { app: { navigateTo: view => calls.push(['navigate', view]) } };
    const signIn = method => async options => {
        calls.push([method, options?.skipNativeAuth === true]);
        if (popupError) throw popupError;
        if (changeIdentityDuringPopup) window.yambAuthState = { uid: 'different-uid', user: { uid: 'different-uid' } };
        if (!options?.skipNativeAuth) nativeUser = { ...account, providerData: [{ providerId: method }] };
        return { user: nativeUser, credential: { idToken: 'test-google', accessToken: 'test-facebook' } };
    };
    window.Capacitor = { Plugins: {
        FirebaseAuthentication: {
            signInWithGoogle: signIn('google.com'), signInWithFacebook: signIn('facebook.com'),
            getCurrentUser: async () => ({ user: nativeUser })
        },
        AccountIdentity: { linkProvider: async ({ uid, provider, token }) => {
            calls.push(['link', uid, provider, token]);
            if (linkError) throw linkError;
            nativeUser = { ...account, providerData: [...account.providerData, { providerId: provider }] };
        } }
    } };
    window.yambAuthState = { uid: account.uid, user: account };
    const context = {
        window, Capacitor: window.Capacitor, document: { getElementById: () => null },
        _t: key => key, console: { log() {}, warn() {} },
        prikaziObavestenje: async message => messages.push(message),
        setYambAuthState: user => { window.yambAuthState = { uid: user.uid, user }; return user; },
        resolveFirebaseAuthUser: async result => result.user,
        getYambFirebaseIdToken: async () => calls.push(['refresh-token']),
        osveziAuthUI: () => {}, refreshLeagueDashboardForCurrentUser: () => {},
        syncLoggedInProfileToCloud: async user => { calls.push(['sync', user.uid]); return true; }
    };
    vm.createContext(context);
    vm.runInContext(source.slice(start, end) + '\nfacebookLoginAvailable = true;', context);
    return { ...context, calls, messages };
}

async function main() {
    for (const provider of ['google.com', 'facebook.com']) {
        const login = fixture();
        await login.prijaviSe(provider);
        assert.deepEqual(login.calls, [[provider, false], ['refresh-token'], ['sync', 'test-uid'], ['navigate', 'main-menu']]);
        assert.equal(login.window.yambAuthState.user.providerData[0].providerId, provider);
        const link = fixture({ provider });
        const other = provider === 'google.com' ? 'facebook.com' : 'google.com';
        await link.connectAuthAccount();
        assert.deepEqual(link.calls, [[other, true], ['link', 'test-uid', other,
            provider === 'google.com' ? 'test-facebook' : 'test-google'], ['refresh-token']]);
        assert.equal(link.window.yambAuthState.uid, 'test-uid');
        assert.deepEqual(link.window.yambAuthState.user.providerData.map(item => item.providerId), [provider, other]);
        await link.connectAuthAccount();
        assert.equal(link.calls.filter(call => call[0] === 'link').length, 1);
    }
    const conflict = fixture({ linkError: { code: 'auth/credential-already-in-use' } });
    await conflict.connectAuthAccount();
    assert.deepEqual(conflict.messages, ['auth_provider_in_use']);
    assert.equal(conflict.window.yambAuthState.user.providerData.length, 1);
    const collision = fixture({ popupError: { code: 'auth/account-exists-with-different-credential' } });
    await collision.prijaviSe('facebook.com');
    assert.deepEqual(collision.messages, ['auth_facebook_existing_account']);
    assert.equal(collision.calls.some(([name]) => name === 'sync'), false);
    const cancelled = fixture({ popupError: new Error('cancelled') });
    await cancelled.connectAuthAccount();
    assert.deepEqual(cancelled.messages, []);
    assert.equal(cancelled.calls.some(([name]) => name === 'link'), false);
    const switched = fixture({ changeIdentityDuringPopup: true });
    await switched.connectAuthAccount();
    assert.equal(switched.window.yambAuthState.uid, 'different-uid');
    assert.equal(switched.calls.some(([name]) => name === 'link'), false);

    const html = read('../www/index.html');
    assert.equal([...html.matchAll(/onclick="openYambLegalPage\('(privacy|terms)'\)"/g)].length, 4);
    const languageSource = read('../www/languages.js');
    for (const origin of ['https://yamb-of-the-balkan.onrender.com', 'https://yamb-reconnect-qa.onrender.com']) {
        for (const lang of ['sr', 'en']) {
            const links = [];
            const context = { window: { location: { origin }, open: (...args) => links.push(args) },
                localStorage: { getItem: () => lang }, document: { addEventListener() {} } };
            vm.runInNewContext(languageSource, context);
            for (const page of ['terms', 'privacy']) context.openYambLegalPage(page);
            const site = origin.includes('-qa.') ? origin : 'https://www.yambofthebalkan.com';
            assert.deepEqual(links, ['terms', 'privacy'].map(page =>
                [`${site}/${page}${lang === 'en' ? '_en' : ''}.html`, '_blank', 'noopener']));
        }
    }
    console.log('Facebook and Google client flows: login, linking in both directions, same UID, cancellation, conflicts, identity changes and localized legal links passed with simulated native providers.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
