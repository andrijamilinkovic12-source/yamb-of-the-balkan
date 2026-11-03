(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else { root.YambAnalyticsPrivacy = api; api.mount(root); }
})(typeof window === 'object' ? window : globalThis, function () {
    'use strict';
    function createController({ native, auth, currentUid, http, onState = () => {} }) {
        let revision = 0;
        let queue = Promise.resolve();
        let state = 'off';
        const update = next => { state = next; onState(next); };
        const enqueue = operation => {
            const promise = queue.then(operation);
            queue = promise.catch(() => { update('waiting'); });
            return queue;
        };
        async function synchronize(version) {
            await native.pause();
            update('off');
            const uid = currentUid();
            if (!uid || version !== revision || !(await native.getStatus()).granted) return;
            update('waiting');
            if (!(await http('/api/analytics/config')).enabled || version !== revision) return;
            const identity = await native.prepareIdentity({ uid });
            if (version !== revision || currentUid() !== uid) return;
            const token = await auth.getIdToken({ forceRefresh: false });
            if (!token?.token || (await auth.getCurrentUser())?.user?.uid !== uid || version !== revision) return;
            const registered = await http('/api/analytics/installation', {
                method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token.token },
                body: JSON.stringify({ appInstanceId: identity.appInstanceId })
            });
            if (!registered.ok || !/^[a-f0-9]{64}$/.test(registered.analyticsUserId || '')
                    || version !== revision || currentUid() !== uid) return;
            await native.enableRegistered({ uid, appInstanceId: identity.appInstanceId, analyticsUserId: registered.analyticsUserId });
            if (version === revision) update('on');
        }
        return {
            sync() { const version = ++revision; return enqueue(() => synchronize(version)); },
            choose(granted) {
                const version = ++revision;
                return enqueue(async () => {
                    await native.setChoice({ granted: !!granted });
                    if (version === revision) await synchronize(version);
                });
            },
            clear() { ++revision; return enqueue(async () => { await native.clear(); update('off'); }); },
            pause() { ++revision; return enqueue(async () => { await native.pause(); update('off'); }); },
            getState: () => state
        };
    }
    const text = {
        sr: {
            off: 'Analitika korišćenja: isključena', on: 'Analitika korišćenja: uključena', waiting: 'Analitika korišćenja: čeka povezivanje',
            heading: 'Analitika korišćenja igre',
            description: 'Dozvoljavaš li Google Analytics-u da meri korišćenje igre? Šalju se događaji korišćenja, podaci o uređaju i približnoj lokaciji, identifikator instalacije i pseudonimni identifikator naloga. Ne šaljemo tvoju email adresu ni ime. Analitiku koristimo za razumevanje i poboljšanje igre, bez korišćenja ovih podataka za personalizovane oglase. Izbor možeš promeniti ovde u svakom trenutku. Odbijanje ne sprečava igranje. Oglasi imaju odvojene izbore privatnosti.',
            allow: 'Dozvoljavam analitiku', decline: 'Ne dozvoljavam analitiku', close: 'Zatvori', policy: 'Politika privatnosti',
            login: 'Za izbor analitike prvo se prijavi u igru.'
        },
        en: {
            off: 'Usage analytics: off', on: 'Usage analytics: on', waiting: 'Usage analytics: waiting for connection',
            heading: 'Game usage analytics',
            description: 'May Google Analytics measure your use of the game? Usage events, device and approximate location information, an installation ID and a pseudonymous account ID are sent. We do not send your email address or name. We use analytics to understand and improve the game, without using these data for personalized advertising. You can change this choice here at any time. Declining does not prevent playing. Ads have separate privacy choices.',
            allow: 'Allow analytics', decline: 'Do not allow analytics', close: 'Close', policy: 'Privacy policy',
            login: 'Sign in to the game before choosing analytics.'
        }
    };
    function privacyUrl(location, language) {
        const origin = location.hostname === 'yamb-reconnect-qa.onrender.com'
            ? 'https://yamb-reconnect-qa.onrender.com' : 'https://www.yambofthebalkan.com';
        return origin + (language === 'en' ? '/privacy_en.html' : '/privacy.html');
    }
    function mount(win) {
        const native = win.Capacitor?.Plugins?.AnalyticsPrivacy;
        const auth = win.Capacitor?.Plugins?.FirebaseAuthentication;
        if (!win.Capacitor?.isNativePlatform?.()) return;
        if (!native || !win.Capacitor.isPluginAvailable?.('AnalyticsPrivacy')) {
            // The game loads its web code remotely. Older installed APKs do not
            // have the new native consent bridge; never silently continue their
            // previous Analytics collection after the server rollout.
            const legacy = win.Capacitor?.Plugins?.FirebaseAnalytics;
            if (legacy) void (async () => {
                await legacy.setEnabled({ enabled: false });
                for (const type of ['ANALYTICS_STORAGE', 'AD_STORAGE', 'AD_USER_DATA', 'AD_PERSONALIZATION']) {
                    await legacy.setConsent({ type, status: 'DENIED' });
                }
            })().catch(() => {});
            return;
        }
        if (!auth) return;
        const language = () => win.localStorage.getItem('yamb_lang') === 'en' ? 'en' : 'sr';
        const strings = () => text[language()];
        const currentUid = () => win.yambAuthState?.isLoggedIn ? win.yambAuthState.uid : null;
        const client = new win.YambAccountDeletionClient.Client(typeof SERVER_URL === 'string' ? SERVER_URL : win.location.origin);
        function render(state) {
            const button = win.document.getElementById('analytics-privacy-options');
            if (button) { button.hidden = false; button.textContent = strings()[state]; }
        }
        const controller = createController({ native, auth, currentUid, http: (path, options) => client.json(path, options), onState: render });
        async function openChoices() {
            if (!currentUid()) {
                if (typeof prikaziObavestenje === 'function') await prikaziObavestenje(strings().login);
                return;
            }
            if (win.document.getElementById('analytics-choice-dialog')) return;
            const t = strings();
            const dialog = win.document.createElement('dialog');
            dialog.id = 'analytics-choice-dialog';
            dialog.className = 'analytics-choice-dialog';
            dialog.setAttribute('aria-labelledby', 'analytics-choice-title');
            const heading = win.document.createElement('h2'); heading.id = 'analytics-choice-title'; heading.textContent = t.heading;
            const body = win.document.createElement('p'); body.textContent = t.description;
            const policy = win.document.createElement('a'); policy.href = privacyUrl(win.location, language()); policy.target = '_blank'; policy.rel = 'noopener'; policy.textContent = t.policy;
            const actions = win.document.createElement('div'); actions.className = 'analytics-choice-actions';
            for (const granted of [false, true]) {
                const button = win.document.createElement('button'); button.type = 'button'; button.textContent = granted ? t.allow : t.decline;
                button.addEventListener('click', async () => { dialog.close(); dialog.remove(); await controller.choose(granted); });
                actions.append(button);
            }
            const close = win.document.createElement('button'); close.type = 'button'; close.textContent = t.close;
            close.addEventListener('click', () => { dialog.close(); dialog.remove(); });
            dialog.addEventListener('cancel', () => dialog.remove());
            dialog.append(heading, body, policy, actions, close); win.document.body.append(dialog); dialog.showModal();
        }
        win.yambAnalyticsPrivacy = { identityChanged: () => controller.sync(), clear: () => controller.clear(), openChoices };
        win.document.addEventListener('DOMContentLoaded', () => { render('off'); void controller.sync(); });
        win.addEventListener('yamb:languageChanged', () => render(controller.getState()));
        win.addEventListener('online', () => { void controller.sync(); });
        win.document.addEventListener('visibilitychange', () => { void (win.document.hidden ? controller.pause() : controller.sync()); });
        win.Capacitor?.Plugins?.App?.addListener('appStateChange', status => {
            void (status.isActive ? controller.sync() : controller.pause());
        });
    }
    return { createController, mount, text, privacyUrl };
});
