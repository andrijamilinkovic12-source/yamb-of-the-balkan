(async () => {
    const client = new window.YambAccountDeletionClient.Client(location.origin, { storage: localStorage });
    const localUser = async () => {
        const response = await fetch('/__qa__/identity/web', { cache: 'no-store' });
        if (!response.ok) throw new Error('demo_unavailable');
        const user = await response.json();
        return { ...user, getIdToken: async () => user.token };
    };
    window.YambDeletionPage.create({ document, client, language: new URLSearchParams(location.search).get('lang'), auth: {
        signIn: localUser, reauthenticate: localUser, signOut: async () => {}
    } });
})();
