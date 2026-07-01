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

    function getLanguage() {
        return localStorage.getItem('yamb_lang') === 'en' ? 'en' : 'sr';
    }

    function getText(key, fallback) {
        return typeof t === 'function' ? t(key) : fallback;
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
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

    async function claimPendingRewardBeforeNotificationNavigation(app) {
        if (app && typeof app.claimPendingRewardBeforeExternalNavigation === 'function') {
            return app.claimPendingRewardBeforeExternalNavigation();
        }
        return true;
    }

    async function createTournamentChannel() {
        const plugin = getPushPlugin();
        if (!plugin || typeof plugin.createChannel !== 'function') return;

        try {
            await plugin.createChannel({
                id: CHANNEL_ID,
                name: getText('push_channel_name', 'Yamb obaveštenja'),
                description: getText('push_channel_desc', 'Obaveštenja za turnire, rekorde i Kvartalnu ligu'),
                importance: 4,
                visibility: 1,
                vibration: true
            });
        } catch (error) {
            console.warn('Push kanal nije kreiran:', error);
        }
    }

    function rememberSync(uid, token, language) {
        if (!uid || !token) return;
        localStorage.setItem(SYNC_PREFIX + uid, JSON.stringify({ token, language, at: Date.now() }));
    }

    function isRecentlySynced(uid, token, language) {
        try {
            const raw = localStorage.getItem(SYNC_PREFIX + uid);
            if (!raw) return false;
            const parsed = JSON.parse(raw);
            return parsed?.token === token && parsed?.language === language && Date.now() - (parsed.at || 0) < SYNC_TTL_MS;
        } catch (_error) {
            return false;
        }
    }

    async function sendTokenToServer(app, token, options = {}) {
        const uid = getUid(app);
        const language = getLanguage();
        if (!uid || !token || !app?.socket?.connected) return { ok: false, reason: 'not_ready' };

        if (!options.force && isRecentlySynced(uid, token, language)) {
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
            language,
            categories: { tournament: true, records: true, league: true },
            appId: 'com.yamb.balkan'
        };

        const result = await emitWithAck(app.socket, 'push_register_token', payload);
        if (result && result.ok) rememberSync(uid, token, language);
        return result;
    }

    function openTournamentFromNotification(data = {}) {
        const open = async () => {
            const app = window.app;
            if (!app) return;
            if (!(await claimPendingRewardBeforeNotificationNavigation(app))) return;

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
        const open = async () => {
            const app = window.app;
            if (!app) return;
            if (!(await claimPendingRewardBeforeNotificationNavigation(app))) return;

            if (typeof app.showHighscoresScreen === 'function') {
                await app.showHighscoresScreen();
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

    function getLeagueChampionPeriod(data = {}) {
        const year = Number.parseInt(data.year, 10);
        const quarter = Number.parseInt(data.quarter, 10);
        if (Number.isInteger(year) && Number.isInteger(quarter) && quarter >= 1 && quarter <= 4) {
            return { year, quarter };
        }

        const periodMatch = String(data.periodKey || '').match(/^(\d{4})-Q([1-4])$/i);
        if (periodMatch) {
            return {
                year: Number.parseInt(periodMatch[1], 10),
                quarter: Number.parseInt(periodMatch[2], 10)
            };
        }

        return { year: '', quarter: '' };
    }

    function showLeagueChampionAnimationFromNotification(app, data = {}) {
        if (String(data.type || '') !== 'league_champion_announced') return false;
        if (!app || typeof app.showQuarterWinnerModal !== 'function') return false;

        const playerName = String(data.playerName || '').trim();
        if (!playerName) return false;

        const { year, quarter } = getLeagueChampionPeriod(data);
        const existingModal = document.getElementById('winner-modal-overlay');
        if (existingModal) {
            if (app.effectMgr && typeof app.effectMgr.stop === 'function') {
                app.effectMgr.stop();
            }
            existingModal.remove();
        }

        app.showQuarterWinnerModal({
            year,
            quarter,
            playerName,
            score: data.score || 0,
            photoUrl: data.photoUrl || ''
        });

        if (year && quarter) {
            localStorage.setItem(`yamb_winner_shown_${year}_Q${quarter}`, 'true');
        }

        return true;
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

        const open = async () => {
            const app = window.app;
            const league = window.kvartalnaLiga;
            if (app && !(await claimPendingRewardBeforeNotificationNavigation(app))) return;

            showLeagueChampionAnimationFromNotification(app, data);

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

    function handleNotificationAction(data = {}) {
        const type = String(data.type || '');
        if (type.startsWith('tournament_') || data.scope === 'tournament') {
            openTournamentFromNotification(data);
        } else if (type.startsWith('record_') || data.scope === 'records') {
            openRecordsFromNotification(data);
        } else if (type.startsWith('league_') || data.scope === 'league') {
            openLeagueHallOfFameFromNotification(data);
        }
    }

    function showForegroundNotification(notification = {}) {
        const data = notification?.data || {};
        const title = escapeHtml(notification?.title || 'Yamb of the Balkan');
        const body = escapeHtml(notification?.body || '');
        const app = window.app;
        const modal = app?.modal || window.modalManager;
        const canOpen = Boolean(data.scope || data.type);

        if (app && typeof app.vibrate === 'function') {
            app.vibrate(40);
        }

        if (modal && canOpen && typeof modal.confirm === 'function') {
            const message = `${body || title}<br><br>${getText('push_open_prompt', 'Otvori obaveštenje?')}`;
            modal.confirm(message, {
                title,
                okText: getText('push_open', 'Otvori'),
                cancelText: getText('push_later', 'Kasnije')
            }).then(open => {
                if (open) handleNotificationAction(data);
            });
            return;
        }

        if (modal && typeof modal.alert === 'function') {
            modal.alert(body || title, title);
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

        await plugin.addListener('pushNotificationReceived', notification => {
            showForegroundNotification(notification);
        });

        await plugin.addListener('pushNotificationActionPerformed', event => {
            const data = event?.notification?.data || {};
            handleNotificationAction(data);
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
