(function () {
    const TOKEN_KEY = 'yamb_push_token';
    const SYNC_PREFIX = 'yamb_push_token_synced_';
    const SYNC_TTL_MS = 24 * 60 * 60 * 1000;
    const CHANNEL_ID = 'tournament_notifications';

    let listenersReady = false;
    let activeApp = null;
    let registerInProgress = false;

    function getPushPlugin() {
        return window.Capacitor?.Plugins?.PushNotifications || null;
    }

    function isNativePushAvailable() {
        const plugin = getPushPlugin();
        if (!plugin) return false;
        if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function') {
            return window.Capacitor.isNativePlatform();
        }
        return true;
    }

    function getUid(app) {
        return app?.playerId || localStorage.getItem('yamb_uid') || '';
    }

    function getPlatform() {
        if (window.Capacitor && typeof window.Capacitor.getPlatform === 'function') {
            return window.Capacitor.getPlatform();
        }
        return 'unknown';
    }

    function emitWithAck(socket, eventName, payload, timeoutMs = 8000) {
        return new Promise(resolve => {
            if (!socket || !socket.connected) {
                resolve({ ok: false, reason: 'socket_disconnected' });
                return;
            }

            let settled = false;
            const finish = (result) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(result || { ok: false, reason: 'empty_response' });
            };
            const timer = setTimeout(() => finish({ ok: false, reason: 'push_ack_timeout' }), timeoutMs);
            socket.emit(eventName, payload, finish);
        });
    }

    async function ensureSocketAuth(app, forceRefresh = false) {
        if (!app || !app.socket || !app.socket.connected) return { ok: false, reason: 'socket_disconnected' };
        if (typeof app.authenticateSocketIdentity !== 'function') return { ok: false, reason: 'auth_missing' };
        return app.authenticateSocketIdentity(forceRefresh);
    }

    async function createTournamentChannel() {
        const plugin = getPushPlugin();
        if (!plugin || typeof plugin.createChannel !== 'function') return;

        try {
            await plugin.createChannel({
                id: CHANNEL_ID,
                name: 'Yamb obavestenja',
                description: 'Obavestenja za turnire, rekorde i kvartalnu ligu',
                importance: 4,
                visibility: 1,
                vibration: true
            });
        } catch (error) {
            console.warn('Push kanal nije kreiran:', error);
        }
    }

    function rememberSync(uid, token) {
        if (!uid || !token) return;
        localStorage.setItem(SYNC_PREFIX + uid, JSON.stringify({ token, at: Date.now() }));
    }

    function isRecentlySynced(uid, token) {
        try {
            const raw = localStorage.getItem(SYNC_PREFIX + uid);
            if (!raw) return false;
            const parsed = JSON.parse(raw);
            return parsed?.token === token && Date.now() - (parsed.at || 0) < SYNC_TTL_MS;
        } catch (_error) {
            return false;
        }
    }

    async function sendTokenToServer(app, token, options = {}) {
        const uid = getUid(app);
        if (!uid || !token || !app?.socket?.connected) return { ok: false, reason: 'not_ready' };

        if (!options.force && isRecentlySynced(uid, token)) {
            return { ok: true, cached: true };
        }

        let authResult = await ensureSocketAuth(app, false);
        if (!authResult || !authResult.ok) {
            authResult = await ensureSocketAuth(app, true);
        }
        if (!authResult || !authResult.ok) return authResult || { ok: false, reason: 'auth_failed' };

        const payload = {
            token,
            platform: getPlatform(),
            categories: { tournament: true, records: true, league: true },
            appId: 'com.yamb.balkan'
        };

        const result = await emitWithAck(app.socket, 'push_register_token', payload);
        if (result && result.ok) rememberSync(uid, token);
        return result;
    }

    function openTournamentFromNotification(data = {}) {
        const open = () => {
            const app = window.app;
            if (!app) return;

            if (app.tournamentManager && typeof app.tournamentManager.open === 'function') {
                app.tournamentManager.activeTab = 'bracket';
                app.tournamentManager.open();

                const round = data.round || data.tournamentRound;
                const index = Number.parseInt(data.index ?? data.matchIndex, 10);
                if (round && Number.isInteger(index) && typeof app.tournamentManager.openMatchModal === 'function') {
                    setTimeout(() => app.tournamentManager.openMatchModal(round, index), 400);
                }
                return;
            }

            if (typeof app.navigateTo === 'function') app.navigateTo('main-menu');
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', open, { once: true });
        } else {
            setTimeout(open, 150);
        }
    }

    function openRecordsFromNotification(data = {}) {
        const open = () => {
            const app = window.app;
            if (!app) return;

            if (typeof app.showHighscoresScreen === 'function') {
                app.showHighscoresScreen();
            } else if (typeof app.navigateTo === 'function') {
                app.navigateTo('highscores-screen');
            }

            const period = ['weekly', 'monthly', 'all_time'].includes(data.period)
                ? data.period
                : 'weekly';

            setTimeout(() => {
                if (app.topListManager && typeof app.topListManager.filterGlobal === 'function') {
                    app.topListManager.filterGlobal(period);
                }
            }, 300);
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', open, { once: true });
        } else {
            setTimeout(open, 150);
        }
    }

    function openLeagueHallOfFameFromNotification(data = {}) {
        const openHallOfFameTab = (league, retries = 12) => {
            const modal = document.getElementById('league-modal-overlay');
            if (modal && typeof league.toggleMainView === 'function') {
                league.toggleMainView('hof');
                if (typeof league.switchHofTab === 'function') {
                    setTimeout(() => league.switchHofTab('champions'), 150);
                }
                return;
            }

            if (retries > 0) {
                setTimeout(() => openHallOfFameTab(league, retries - 1), 300);
            }
        };

        const open = () => {
            const app = window.app;
            const league = window.kvartalnaLiga;

            if (league) {
                if (typeof league.openModal === 'function') {
                    league.openModal();
                } else if (typeof league.showModal === 'function') {
                    league.showModal();
                }
                openHallOfFameTab(league);
                return;
            }

            if (app && typeof app.navigateTo === 'function') app.navigateTo('main-menu');
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', open, { once: true });
        } else {
            setTimeout(open, 150);
        }
    }

    async function ensureListeners(app) {
        if (listenersReady) return;
        const plugin = getPushPlugin();
        if (!plugin) return;

        await plugin.addListener('registration', token => {
            const value = token?.value || '';
            if (!value) return;

            localStorage.setItem(TOKEN_KEY, value);
            sendTokenToServer(activeApp || app || window.app, value, { force: true })
                .catch(error => console.warn('Push token nije poslat serveru:', error));
        });

        await plugin.addListener('registrationError', error => {
            console.warn('Push registracija nije uspela:', error);
        });

        await plugin.addListener('pushNotificationActionPerformed', event => {
            const data = event?.notification?.data || {};
            const type = String(data.type || '');
            if (type.startsWith('tournament_') || data.scope === 'tournament') {
                openTournamentFromNotification(data);
            } else if (type.startsWith('record_') || data.scope === 'records') {
                openRecordsFromNotification(data);
            } else if (type.startsWith('league_') || data.scope === 'league') {
                openLeagueHallOfFameFromNotification(data);
            }
        });

        listenersReady = true;
    }

    async function ensureRegistered(app = window.app, options = {}) {
        activeApp = app || activeApp || window.app;
        if (registerInProgress) return { ok: true, inProgress: true };
        if (!isNativePushAvailable()) return { ok: false, reason: 'push_unavailable' };
        if (!getUid(activeApp)) return { ok: false, reason: 'not_logged_in' };

        const plugin = getPushPlugin();
        registerInProgress = true;

        try {
            await ensureListeners(activeApp);
            await createTournamentChannel();

            let permissions = await plugin.checkPermissions();
            if (permissions.receive === 'prompt') {
                permissions = await plugin.requestPermissions();
            }

            if (permissions.receive !== 'granted') {
                return { ok: false, reason: 'permission_denied' };
            }

            await plugin.register();

            const existingToken = localStorage.getItem(TOKEN_KEY);
            if (existingToken) {
                sendTokenToServer(activeApp, existingToken, options)
                    .catch(error => console.warn('Push token sync nije uspeo:', error));
            }

            return { ok: true };
        } catch (error) {
            console.warn('Push registracija nije dostupna:', error);
            return { ok: false, reason: 'push_registration_error' };
        } finally {
            registerInProgress = false;
        }
    }

    async function unregisterCurrentDevice(app = window.app) {
        const token = localStorage.getItem(TOKEN_KEY);

        if (token && app?.socket?.connected) {
            await ensureSocketAuth(app, false);
            await emitWithAck(app.socket, 'push_unregister_token', { token }).catch(() => null);
        }

        const plugin = getPushPlugin();
        if (plugin && typeof plugin.unregister === 'function') {
            try {
                await plugin.unregister();
            } catch (error) {
                console.warn('Push unregister nije uspeo:', error);
            }
        }

        localStorage.removeItem(TOKEN_KEY);
    }

    window.yambPushNotifications = {
        ensureRegistered,
        unregisterCurrentDevice,
        openTournamentFromNotification,
        openRecordsFromNotification,
        openLeagueHallOfFameFromNotification
    };
})();
