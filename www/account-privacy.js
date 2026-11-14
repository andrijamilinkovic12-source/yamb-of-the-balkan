(function () {
    'use strict';
    let busy = false;
    let clearing = null;
    const language = () => localStorage.getItem('yamb_lang') === 'en' ? 'en' : 'sr';
    const strings = () => window.YambAccountDeletionClient.text[language()];
    const client = () => new window.YambAccountDeletionClient.Client(
        typeof SERVER_URL === 'string' ? SERVER_URL : window.location.origin, { storage: localStorage }
    );
    const confirmAction = message => window.modalManager?.confirm
        ? window.modalManager.confirm(message) : Promise.resolve(window.confirm(message));
    const notice = message => typeof prikaziObavestenje === 'function' ? prikaziObavestenje(message) : Promise.resolve(window.alert(message));

    function updateControls() {
        const button = document.getElementById('delete-account-button');
        const hasReceipt = !!client().savedReceipt();
        if (button) {
            button.textContent = hasReceipt ? strings().status : strings().label;
            button.disabled = busy || (!hasReceipt && !localStorage.getItem('yamb_uid'));
        }
        const signedOutStatus = document.getElementById('deletion-status-button');
        if (signedOutStatus) {
            signedOutStatus.hidden = !hasReceipt;
            signedOutStatus.disabled = busy;
            signedOutStatus.textContent = strings().status;
        }
    }

    async function clearLocalAccount(uid, purge = true) {
        // Events for another account must never wipe the currently active one.
        if (!uid || localStorage.getItem('yamb_uid') !== uid) return;
        if (clearing) return clearing;
        clearing = (async () => {
            const rememberedLanguage = language();
            const rememberedTheme = localStorage.getItem('yamb_theme') || localStorage.getItem('yamb_last_theme') || 'dark';
            if (!purge && typeof saveAccountLocalSnapshot === 'function') saveAccountLocalSnapshot(uid);
            window.yambAccountDeletionInProgress = true;
            const app = window.app;
            if (app) {
                app.autoSaveGame = async () => {};
                app.socket?.disconnect();
                app.playerId = null;
                app.playerName = '';
                app.socketVerifiedUid = null;
                app.stats = { games: 0, wins: 0, losses: 0, highscore: 0, totalScoreSum: 0, penaltyPoints: 0 };
            }
            const keys = typeof getAccountSnapshotStorageKeys === 'function' ? getAccountSnapshotStorageKeys(uid) : [];
            for (const key of [...keys, 'yamb_uid', 'yamb_quarter_data', 'yamb_last_daily', 'yamb_daily_reward_claimed',
                'yamb_daily_reward_amount', 'yamb_push_token', 'yamb_push_token_synced_' + uid,
                'yamb_global_chat_read_' + uid, 'yamb_duel_chat_disabled_' + uid]) localStorage.removeItem(key);
            app?.globalChat?.syncActivityIdentity();
            if (purge) localStorage.removeItem('yamb_account_snapshot_' + uid);
            if (purge) localStorage.setItem('yamb_deletion_disabled_uid', uid);
            localStorage.setItem('yamb_lang', rememberedLanguage);
            localStorage.setItem('yamb_last_theme', rememberedTheme);
            localStorage.setItem('yamb_force_cloud_restore_next_login', 'true');
            window.yambAuthState = { uid: null, user: null, isLoggedIn: false, loginInProgress: false, checkingLogin: false };
            if (window.statsManager) {
                window.statsManager.stats = { games: 0, wins: 0, losses: 0, highscore: 0, balance: 0, unlockedTrophies: [], unlockedSkins: [], unlockedEffects: [] };
                window.statsManager.previousBalance = 0;
            }
            let storageError = null;
            try {
                if (purge && window.localforage) {
                    for (const key of await window.localforage.keys()) {
                        if (key.startsWith('yamb_saved_game_' + uid + '_')) await window.localforage.removeItem(key);
                    }
                    const scores = await window.localforage.getItem('yamb_ultimate_scores');
                    if (Array.isArray(scores)) await window.localforage.setItem('yamb_ultimate_scores', scores.filter(item => item.uid !== uid && item.playerId !== uid));
                }
            } catch (error) { storageError = error; }
            try { await window.Capacitor?.Plugins?.PushNotifications?.unregister?.(); } catch (_) {}
            try {
                if (window.yambAnalyticsPrivacy) await window.yambAnalyticsPrivacy.clear();
                else await window.Capacitor?.Plugins?.FirebaseAnalytics?.resetAnalyticsData?.();
            } catch (_) {}
            try { await window.Capacitor?.Plugins?.FirebaseAuthentication?.signOut?.(); } catch (_) {}
            if (typeof osveziAuthUI === 'function') osveziAuthUI(null);
            app?.navigateTo('splash-screen');
            updateControls();
            if (storageError) throw storageError;
        })();
        try { await clearing; } finally { clearing = null; }
    }

    async function showStatus(api, receipt) {
        const result = await api.poll(receipt);
        await notice(result.state === 'complete'
            ? strings().complete + (result.analytics?.state === 'submitted' ? '\n\n' + strings().analyticsSubmitted : '')
            : strings().pending);
    }

    async function begin() {
        if (busy) return;
        busy = true;
        updateControls();
        const api = client();
        let accepted = false;
        try {
            const receipt = api.savedReceipt();
            if (receipt) { await showStatus(api, receipt); return; }
            const uid = localStorage.getItem('yamb_uid');
            if (!uid) return await notice(strings().login);
            const config = await api.config();
            if (!config.enabled) return await notice(strings().unavailable);
            if (!await confirmAction(strings().warning)) return;
            const auth = window.Capacitor?.Plugins?.FirebaseAuthentication;
            if (!auth) return await notice(strings().unavailable);
            const signedIn = await auth.signInWithGoogle();
            const user = signedIn?.user;
            if (user?.uid !== uid) {
                await clearLocalAccount(uid, false);
                await notice(strings().wrong);
                window.location.reload();
                return;
            }
            const identity = String(user.email || user.displayName || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
            if (!await confirmAction(strings().confirm + '<br><strong>' + identity + '</strong><br><br>' + strings().finalWarning)) return;
            const token = await auth.getIdToken({ forceRefresh: true });
            const current = await auth.getCurrentUser();
            if (!token?.token || current?.user?.uid !== uid) throw new Error('identity_changed');
            const result = await api.request(token.token);
            accepted = true;
            await clearLocalAccount(uid);
            await showStatus(api, result);
        } catch (error) {
            if (/cancel|12501|popup-closed/i.test(error?.message || '')) return;
            const safeCode = String(error?.code || 'unknown');
            console.warn('[Account deletion] Request failed:', /^[A-Za-z0-9_/-]{1,80}$/.test(safeCode) ? safeCode : 'unknown');
            await notice(error?.code === 'recent_sign_in_required' ? strings().recent
                : accepted || api.savedReceipt() ? strings().uncertain : strings().unavailable);
        } finally {
            busy = false;
            updateControls();
            if (window.yambAccountDeletionInProgress) window.location.reload();
        }
    }

    async function handleStarted(data) {
        const uid = data?.uid;
        if (!uid || uid !== localStorage.getItem('yamb_uid')) return;
        const initiatedHere = busy;
        try {
            await clearLocalAccount(uid);
            if (!initiatedHere) {
                await notice(strings().received);
                window.location.reload();
            }
        } catch (_) { await notice(strings().uncertain); }
    }
    window.yambAccountPrivacy = { begin, clearLocalAccount, handleStarted, updateControls };
    document.addEventListener('DOMContentLoaded', updateControls);
    window.addEventListener('yamb:languageChanged', updateControls);
})();
