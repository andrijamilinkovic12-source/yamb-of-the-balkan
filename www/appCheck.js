(function () {
    'use strict';

    let initializationPromise = null;
    let initialized = false;
    let lastError = '';

    function getPlugin() {
        return window.Capacitor?.Plugins?.FirebaseAppCheck || null;
    }

    async function initialize() {
        if (initializationPromise) return initializationPromise;

        initializationPromise = (async () => {
            const plugin = getPlugin();
            if (!plugin) {
                return { ok: false, reason: 'app_check_plugin_unavailable' };
            }

            try {
                await plugin.initialize();
                await plugin.setTokenAutoRefreshEnabled({ enabled: true });
                initialized = true;
                lastError = '';
                return { ok: true };
            } catch (error) {
                initialized = false;
                lastError = error?.message || 'app_check_initialization_failed';
                console.warn('Firebase App Check inicijalizacija nije uspela:', lastError);
                return { ok: false, reason: lastError };
            }
        })();

        return initializationPromise;
    }

    async function getToken(forceRefresh = false) {
        const status = await initialize();
        if (!status.ok) return '';

        try {
            const result = await getPlugin().getToken({ forceRefresh: !!forceRefresh });
            return typeof result?.token === 'string' ? result.token : '';
        } catch (error) {
            lastError = error?.message || 'app_check_token_failed';
            console.warn('Firebase App Check token nije dostupan:', lastError);
            return '';
        }
    }

    window.yambAppCheck = {
        initialize,
        getToken,
        getStatus: () => ({ initialized, lastError })
    };

    void initialize();
})();
