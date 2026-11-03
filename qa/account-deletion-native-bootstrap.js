(async () => {
    const lang = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'sr';
    localStorage.setItem('yamb_lang', lang);
    const getUser = async () => {
        const response = await fetch('/__qa__/identity/native', { cache: 'no-store' });
        if (!response.ok) throw new Error('demo_unavailable');
        return response.json();
    };
    let user = await getUser();
    localStorage.setItem('yamb_uid', user.uid);
    localStorage.setItem('yamb_player_name', user.displayName);
    window.Capacitor = { Plugins: { FirebaseAuthentication: {
        signInWithGoogle: async () => ({ user: user = await getUser() }),
        getCurrentUser: async () => ({ user }),
        getIdToken: async () => ({ token: user.token }), signOut: async () => {}
    } } };
    window.app = { stats: {}, socket: { disconnect() {} }, autoSaveGame() {}, navigateTo() {}, showMainMenu() {}, saveSettingAuto() {} };
    window.prikaziObavestenje = message => window.modalManager.alert(message);
    window.getAccountSnapshotStorageKeys = () => ['yamb_stats', 'yamb_dukati', 'yamb_player_name', 'yamb_player_photo'];
    const html = await (await fetch('/game-source.html')).text();
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const settings = parsed.getElementById('settings-screen');
    settings.classList.add('active');
    document.body.append(settings, parsed.getElementById('custom-modal-overlay'), parsed.getElementById('settings-theme-overlay'));
    document.getElementById('setting-name').value = 'Probni igrač';
    document.getElementById('auth-user-photo').style.display = 'none';
    document.getElementById('setting-theme').value = 'dark';
    if (typeof applyTranslations === 'function') applyTranslations();
    const info = document.getElementById('auth-user-info');
    info.removeAttribute('data-lang');
    info.textContent = user.displayName;
    document.getElementById('btn-google-logout').style.display = 'block';
    for (const source of ['theme-game-header.js', 'theme-settings-room.js', 'theme-settings-picker.js']) {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = source; script.onload = resolve; script.onerror = reject;
            document.body.append(script);
        });
    }
    await window.themeSettingsRoom.apply();
    window.yambAccountPrivacy.updateControls();
})();
