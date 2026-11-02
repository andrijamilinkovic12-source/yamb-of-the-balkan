(async function () {
    'use strict';
    const language = new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'sr';
    const origin = window.YambAccountDeletionClient.webApiOrigin(window.location);
    const client = new window.YambAccountDeletionClient.Client(origin, { storage: localStorage });
    let adapter = null;
    try {
        const config = await client.config();
        if (config.enabled && config.firebase) {
            const [{ initializeApp }, firebase] = await Promise.all([
                import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),
                import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js')
            ]);
            const auth = firebase.getAuth(initializeApp(config.firebase));
            await firebase.setPersistence(auth, firebase.browserSessionPersistence);
            const provider = new firebase.GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });
            adapter = {
                signIn: async () => (await firebase.signInWithPopup(auth, provider)).user,
                reauthenticate: async user => (await firebase.reauthenticateWithPopup(user, provider)).user,
                signOut: () => firebase.signOut(auth)
            };
        }
    } catch (_) { /* Show support details and keep destructive controls disabled. */ }
    window.YambDeletionPage.create({ document, client, auth: adapter, language });
})();
