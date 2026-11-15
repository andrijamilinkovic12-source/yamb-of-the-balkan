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
            const google = new firebase.GoogleAuthProvider();
            google.setCustomParameters({ prompt: 'select_account' });
            const facebook = config.facebook === true ? new firebase.FacebookAuthProvider() : null;
            let selectedProvider = google;
            async function signIn(provider) {
                const result = await firebase.signInWithPopup(auth, provider);
                // A first sign-in to the deletion portal does not create a game account.
                if (firebase.getAdditionalUserInfo(result)?.isNewUser) {
                    await firebase.deleteUser(result.user);
                    throw new Error('sign_in_required');
                }
                selectedProvider = provider;
                return result.user;
            }
            adapter = {
                signIn: () => signIn(google),
                signInFacebook: facebook && (() => signIn(facebook)),
                reauthenticate: async user => (await firebase.reauthenticateWithPopup(user, selectedProvider)).user,
                signOut: () => firebase.signOut(auth)
            };
        }
    } catch (_) { /* Show support details and keep destructive controls disabled. */ }
    window.YambDeletionPage.create({ document, client, auth: adapter, language });
})();
