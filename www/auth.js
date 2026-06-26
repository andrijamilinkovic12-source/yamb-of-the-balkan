/**
 * Yamb of the Balkan - Google Auth
 * Ovaj fajl koristi nativni Capacitor plugin za prijavu i sinhronizuje statistiku sa MongoDB-om.
 */

// --- POMOĆNA FUNKCIJA ZA BEZBEDAN PREVOD ---
const _t = (key, fallback) => {
    if (typeof t !== 'function') return fallback;
    const translated = t(key);
    return (!translated || translated === key) ? fallback : translated;
};

const authDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- POMOĆNA FUNKCIJA ZA CUSTOM ALERTE ---
async function prikaziObavestenje(tekst) {
    if (window.modalManager) {
        if (typeof window.modalManager.alert === 'function') {
            await window.modalManager.alert(tekst);
            return;
        } else if (typeof window.modalManager.confirm === 'function') {
            await window.modalManager.confirm(tekst);
            return;
        }
    }
    alert(tekst);
}

async function getYambFirebaseIdToken(forceRefresh = false, options = {}) {
    const authPlugin = (typeof Capacitor !== 'undefined' && Capacitor.Plugins)
        ? Capacitor.Plugins.FirebaseAuthentication
        : null;

    if (!authPlugin) {
        window.yambLastFirebaseTokenStatus = {
            ok: false,
            reason: 'firebase_plugin_missing',
            updatedAt: Date.now()
        };
        return null;
    }

    const attempts = Math.max(1, parseInt(options.attempts || (forceRefresh ? 8 : 3), 10) || 1);
    const delayMs = Math.max(100, parseInt(options.delayMs || 350, 10) || 350);
    let lastReason = 'missing_firebase_token';

    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            if (attempt > 1 && typeof authPlugin.getCurrentUser === 'function') {
                await authPlugin.getCurrentUser().catch(() => null);
            }

            const result = await authPlugin.getIdToken({ forceRefresh: forceRefresh || attempt > 1 });
            if (result && typeof result.token === 'string' && result.token.length > 100) {
                window.yambLastFirebaseTokenStatus = {
                    ok: true,
                    attempts: attempt,
                    updatedAt: Date.now()
                };
                return result.token;
            }

            lastReason = 'empty_firebase_token';
        } catch (error) {
            lastReason = error?.message || 'firebase_token_error';
            if (attempt === attempts) {
                console.warn("Firebase ID token nije dostupan:", error);
            }
        }

        if (attempt < attempts) {
            await authDelay(delayMs);
        }
    }

    window.yambLastFirebaseTokenStatus = {
        ok: false,
        reason: lastReason,
        attempts,
        updatedAt: Date.now()
    };
    return null;
}

window.getYambFirebaseIdToken = getYambFirebaseIdToken;

function normalizeFirebaseAuthUser(user) {
    if (!user || typeof user !== 'object') return null;

    const uid = String(user.uid || user.id || user.userId || '').trim();
    if (!uid || uid === 'undefined' || uid === 'null') return null;

    return {
        ...user,
        uid,
        displayName: user.displayName || user.name || user.email || localStorage.getItem('yamb_player_name') || _t('hs_player', "Igrač"),
        photoUrl: user.photoUrl || user.photoURL || user.imageUrl || user.photo || '',
        email: user.email || ''
    };
}

async function resolveFirebaseAuthUser(signInResult = null) {
    const fromResult = normalizeFirebaseAuthUser(signInResult?.user || signInResult);
    if (fromResult) return fromResult;

    const authPlugin = (typeof Capacitor !== 'undefined' && Capacitor.Plugins)
        ? Capacitor.Plugins.FirebaseAuthentication
        : null;
    if (!authPlugin) return null;

    if (typeof authPlugin.getCurrentUser === 'function') {
        try {
            const current = await authPlugin.getCurrentUser();
            const user = normalizeFirebaseAuthUser(current?.user);
            if (user) return user;
        } catch (error) {
            console.warn("Ne mogu da pročitam trenutnog Firebase korisnika:", error);
        }
    }

    if (typeof authPlugin.getPendingAuthResult === 'function') {
        try {
            const pending = await authPlugin.getPendingAuthResult();
            const user = normalizeFirebaseAuthUser(pending?.user);
            if (user) return user;
        } catch (error) {
            console.warn("Ne mogu da pročitam pending Firebase login rezultat:", error);
        }
    }

    return null;
}

function setYambAuthState(user, options = {}) {
    const normalized = normalizeFirebaseAuthUser(user);
    const previousState = window.yambAuthState || {};

    if (!normalized) {
        localStorage.removeItem('yamb_uid');
        localStorage.removeItem('yamb_player_name');
        localStorage.removeItem('yamb_player_photo');

        if (window.app) {
            window.app.playerId = null;
            window.app.playerName = "";
        }

        window.yambAuthState = {
            ...previousState,
            uid: null,
            user: null,
            isLoggedIn: false,
            loginInProgress: !!options.loginInProgress,
            checkingLogin: !!options.checkingLogin,
            updatedAt: Date.now()
        };
        return null;
    }

    localStorage.setItem('yamb_uid', normalized.uid);
    migrateLegacyLocalProgressToUid(normalized.uid);

    if (normalized.displayName) {
        localStorage.setItem('yamb_player_name', normalized.displayName);
    }
    if (normalized.photoUrl) {
        localStorage.setItem('yamb_player_photo', normalized.photoUrl);
    }

    if (window.app) {
        window.app.playerId = normalized.uid;
        if (normalized.displayName) window.app.playerName = normalized.displayName;
    }

    window.yambAuthState = {
        ...previousState,
        uid: normalized.uid,
        user: normalized,
        isLoggedIn: true,
        loginInProgress: false,
        checkingLogin: false,
        restoreFailed: false,
        restoreFailedReason: null,
        updatedAt: Date.now()
    };

    return normalized;
}

function safeParseLocalJson(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.warn(`Neispravan lokalni zapis: ${key}`, error);
        return null;
    }
}

function getAuthQuarterInfo() {
    const now = new Date();
    return {
        year: now.getFullYear(),
        quarter: Math.floor(now.getMonth() / 3) + 1
    };
}

function normalizeLocalLeagueData(data) {
    if (!data || typeof data !== 'object') return null;

    const normalized = {
        year: parseInt(data.year) || 0,
        quarter: parseInt(data.quarter) || 0,
        baselineScore: parseInt(data.baselineScore) || 0,
        quarterlyScore: parseInt(data.quarterlyScore) || 0
    };

    if (normalized.quarter < 1 || normalized.quarter > 4) return null;
    if (normalized.quarterlyScore < 0) normalized.quarterlyScore = 0;
    if (normalized.baselineScore < 0) normalized.baselineScore = 0;
    return normalized;
}

function pickBetterLeagueData(current, candidate) {
    if (!candidate) return current;
    if (!current) return candidate;

    const now = getAuthQuarterInfo();
    const candidateIsCurrent = candidate.year === now.year && candidate.quarter === now.quarter;
    const currentIsCurrent = current.year === now.year && current.quarter === now.quarter;

    if (candidateIsCurrent && !currentIsCurrent) return candidate;
    if (!candidateIsCurrent && currentIsCurrent) return current;

    if (candidate.year > current.year) return candidate;
    if (candidate.year === current.year && candidate.quarter > current.quarter) return candidate;

    if (candidate.year === current.year && candidate.quarter === current.quarter) {
        return candidate.quarterlyScore > current.quarterlyScore ? candidate : current;
    }

    return current;
}

function migrateLegacyLocalProgressToUid(uid) {
    if (!uid) return false;

    const targetKey = 'yamb_quarter_data_' + uid;
    const legacyKeys = [
        targetKey,
        'yamb_quarter_data_guest',
        'yamb_quarter_data_legacy',
        'yamb_quarter_data'
    ];

    let bestLeagueData = null;
    legacyKeys.forEach(key => {
        bestLeagueData = pickBetterLeagueData(bestLeagueData, normalizeLocalLeagueData(safeParseLocalJson(key)));
    });

    if (!bestLeagueData || bestLeagueData.quarterlyScore <= 0) return false;

    const currentTarget = normalizeLocalLeagueData(safeParseLocalJson(targetKey));
    const mergedLeagueData = pickBetterLeagueData(currentTarget, bestLeagueData);
    const improvedTarget = !currentTarget || mergedLeagueData.quarterlyScore > currentTarget.quarterlyScore ||
        mergedLeagueData.year !== currentTarget.year || mergedLeagueData.quarter !== currentTarget.quarter;

    if (improvedTarget) {
        localStorage.setItem(targetKey, JSON.stringify(mergedLeagueData));
        localStorage.setItem('yamb_legacy_migration_pending_' + uid, 'true');
        console.log(`Legacy migracija: prebačeno ${mergedLeagueData.quarterlyScore} liga poena na prijavljen nalog.`);
    }

    return improvedTarget;
}

window.migrateLegacyLocalProgressToUid = migrateLegacyLocalProgressToUid;

// --- POMOĆNA FUNKCIJA ZA AŽURIRANJE UI-a ---
function osveziAuthUI(user) {
    const loginBtn = document.getElementById('dugmeGooglePrijava');
    const userInfo = document.getElementById('auth-user-info');
    const logoutBtn = document.getElementById('btn-google-logout');
    const nameInput = document.getElementById('setting-name');
    const userPhoto = document.getElementById('auth-user-photo'); 

    if (user && user.displayName) {
        if (loginBtn) loginBtn.style.display = 'none';
        
        if (userInfo) {
            userInfo.innerText = user.displayName;
            userInfo.style.color = 'var(--gold-main)';
        }
        
        if (userPhoto) {
            const slikaUrl = user.photoUrl || user.photoURL || localStorage.getItem('yamb_player_photo');
            if (slikaUrl) {
                userPhoto.src = slikaUrl;
                userPhoto.style.display = 'block';
            }
        }
        
        if (logoutBtn) logoutBtn.style.display = 'block';
        
        if (nameInput) {
            nameInput.value = user.displayName;
            nameInput.disabled = true; 
            nameInput.style.opacity = '0.6';
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'flex';
        
        if (userInfo) {
            userInfo.innerText = _t('settings_not_logged_in', "Niste prijavljeni");
            userInfo.style.color = 'var(--text-main)';
        }
        
        if (userPhoto) {
            userPhoto.src = '';
            userPhoto.style.display = 'none';
        }
        
        if (logoutBtn) logoutBtn.style.display = 'none';
        
        if (nameInput) {
            nameInput.disabled = false;
            nameInput.style.opacity = '1';
        }
    }
}

// --- POMOĆNA FUNKCIJA ZA PAKOVANJE LOKALNE STATISTIKE ---
function getFullLocalStats() {
    if (window.app && typeof window.app.getFullLocalStats === 'function') {
        return window.app.getFullLocalStats();
    }

    const uid = localStorage.getItem('yamb_uid');
    if (!uid) return {}; // STRIKTNO ZABRANJEN GOST
    migrateLegacyLocalProgressToUid(uid);

    const soundSetting = localStorage.getItem('yamb_sound');
    const vibrationSetting = localStorage.getItem('yamb_vibration');
    const musicSetting = localStorage.getItem('yamb_music');
    const musicVolumeSetting = localStorage.getItem('yamb_music_volume');
    const languageSetting = localStorage.getItem('yamb_lang');

    return {
        games: (window.app && window.app.stats) ? (window.app.stats.games || 0) : 0,
        wins: (window.app && window.app.stats) ? (window.app.stats.wins || 0) : 0,
        losses: (window.app && window.app.stats) ? (window.app.stats.losses || 0) : 0,
        highscore: (window.app && window.app.stats) ? (window.app.stats.highscore || 0) : 0,
        totalScoreSum: (window.app && window.app.stats) ? (window.app.stats.totalScoreSum || 0) : 0,
        maxWinStreak: (window.app && window.app.stats) ? (window.app.stats.maxWinStreak || 0) : 0,
        penaltyPoints: (window.app && window.app.stats) ? (window.app.stats.penaltyPoints || 0) : 0, 
        tournamentWins: window.statsManager ? (window.statsManager.stats.tournamentWins || 0) : 0, 
        balance: parseInt(localStorage.getItem('yamb_dukati')) || 0,
        undoTokens: parseInt(localStorage.getItem('yamb_undo_tokens')) || 0, // DODATO: Pakovanje tokena za server
        currentWinStreak: window.statsManager ? window.statsManager.stats.currentWinStreak : 0,
        unlockedTrophies: window.statsManager ? window.statsManager.stats.unlockedTrophies : [],
        unlockedSkins: window.statsManager ? window.statsManager.stats.unlockedSkins : JSON.parse(localStorage.getItem('yamb_unlocked_skins') || '[]'),
        unlockedEffects: window.statsManager ? window.statsManager.stats.unlockedEffects : JSON.parse(localStorage.getItem('yamb_unlocked_effects') || '[]'),
        yamb_unlocked: JSON.parse(localStorage.getItem('yamb_unlocked') || '[]'),
        unlockedThemes: JSON.parse(localStorage.getItem('yamb_unlocked_themes') || '[]'),
        leagueData: JSON.parse(localStorage.getItem('yamb_quarter_data_' + uid)) || { year: 0, quarter: 0, baselineScore: 0, quarterlyScore: 0 },
        legacyMigration: localStorage.getItem('yamb_legacy_migration_pending_' + uid) === 'true',
        activeSkin: localStorage.getItem('yamb_active_skin') || null,
        activeEffect: localStorage.getItem('yamb_active_effect') || null,
        activeTheme: localStorage.getItem('yamb_theme') || null,
        lastDaily: localStorage.getItem('yamb_last_daily_' + uid) || "",
        dailyRewardClaimed: localStorage.getItem('yamb_daily_reward_claimed_' + uid) || "",
        dailyRewardAmount: parseInt(localStorage.getItem('yamb_daily_reward_amount_' + uid)) || 0,
        soundEnabled: soundSetting === null ? null : soundSetting !== 'false',
        vibrationEnabled: vibrationSetting === null ? null : vibrationSetting !== 'false',
        musicEnabled: musicSetting === null ? null : musicSetting !== 'false',
        musicVolume: musicVolumeSetting === null ? null : parseFloat(musicVolumeSetting),
        language: languageSetting || null,
        h2hStats: JSON.parse(localStorage.getItem('yamb_h2h_stats') || '{}')
    };
}

function refreshLeagueDashboardForCurrentUser() {
    if (window.kvartalnaLiga) {
        window.kvartalnaLiga.selfHeal();
        window.kvartalnaLiga.init();
    }

    if (typeof updateMainMenuDashboard === 'function') {
        updateMainMenuDashboard();
    }
}

function waitForCloudProfileSync(socket, timeoutMs = 4000) {
    return new Promise(resolve => {
        if (!socket || !socket.connected) {
            resolve(null);
            return;
        }

        let settled = false;
        const finish = (payload) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            socket.off('sync_local_stats', onSync);
            resolve(payload || null);
        };
        const onSync = (payload) => finish(payload);
        const timer = setTimeout(() => finish(null), timeoutMs);

        socket.once('sync_local_stats', onSync);
    });
}

function hasMeaningfulLocalProfileForSync() {
    if (window.app && typeof window.app.hasMeaningfulLocalProfile === 'function') {
        return window.app.hasMeaningfulLocalProfile();
    }

    const stats = getFullLocalStats();
    const numericFields = [
        'games',
        'wins',
        'losses',
        'highscore',
        'totalScoreSum',
        'maxWinStreak',
        'tournamentWins',
        'penaltyPoints',
        'balance',
        'undoTokens'
    ];

    if (numericFields.some(field => Math.max(0, Number(stats[field]) || 0) > 0)) return true;

    const freeUnlocks = new Set(['default', 'confetti', 'dark', 'light', 'medium', 'winter']);
    const unlockFields = ['unlockedTrophies', 'unlockedSkins', 'unlockedEffects', 'yamb_unlocked', 'unlockedThemes'];
    if (unlockFields.some(field => Array.isArray(stats[field]) && stats[field].some(item => item && !freeUnlocks.has(item)))) {
        return true;
    }

    const leagueData = stats.leagueData || {};
    if (Math.max(0, Number(leagueData.baselineScore) || 0) > 0 ||
        Math.max(0, Number(leagueData.quarterlyScore) || 0) > 0) {
        return true;
    }

    return stats.h2hStats && typeof stats.h2hStats === 'object' && Object.keys(stats.h2hStats).length > 0;
}

function getAccountSnapshotKey(uid) {
    return uid ? 'yamb_account_snapshot_' + uid : '';
}

function getAccountSnapshotStorageKeys(uid) {
    const keys = [
        'yamb_stats',
        'yamb_dukati',
        'yamb_undo_tokens',
        'yamb_unlocked_skins',
        'yamb_unlocked_effects',
        'yamb_unlocked_themes',
        'yamb_unlocked',
        'yamb_h2h_stats',
        'yamb_theme',
        'yamb_active_skin',
        'yamb_active_effect',
        'yamb_sound',
        'yamb_vibration',
        'yamb_music',
        'yamb_music_volume',
        'yamb_lang',
        'yamb_player_name',
        'yamb_player_photo'
    ];

    if (uid) {
        keys.push(
            'yamb_quarter_data_' + uid,
            'yamb_last_daily_' + uid,
            'yamb_daily_reward_claimed_' + uid,
            'yamb_daily_reward_amount_' + uid,
            'yamb_legacy_migration_pending_' + uid,
            'yamb_tourney_reg_' + uid
        );
    }

    return keys;
}

function calculateProfileSnapshotWeight(stats = {}) {
    const numericFields = [
        'games',
        'totalGames',
        'wins',
        'losses',
        'highscore',
        'totalScoreSum',
        'maxWinStreak',
        'tournamentWins',
        'penaltyPoints',
        'balance',
        'undoTokens'
    ];
    const numericWeight = numericFields.reduce((sum, field) => {
        const value = Math.max(0, Number(stats[field]) || 0);
        return sum + value;
    }, 0);
    const freeUnlocks = new Set(['default', 'confetti', 'dark', 'light', 'medium', 'winter']);
    const unlockFields = ['unlockedTrophies', 'unlockedSkins', 'unlockedEffects', 'yamb_unlocked', 'unlockedThemes'];
    const unlockWeight = unlockFields.reduce((sum, field) => {
        const items = Array.isArray(stats[field]) ? stats[field] : [];
        return sum + items.filter(item => item && !freeUnlocks.has(item)).length * 1000;
    }, 0);
    const leagueData = stats.leagueData || {};
    const leagueWeight = Math.max(0, Number(leagueData.baselineScore) || 0) +
        Math.max(0, Number(leagueData.quarterlyScore) || 0);
    const h2hWeight = stats.h2hStats && typeof stats.h2hStats === 'object'
        ? Object.keys(stats.h2hStats).length * 500
        : 0;

    return numericWeight + unlockWeight + leagueWeight + h2hWeight;
}

function readAccountLocalSnapshot(uid) {
    const snapshotKey = getAccountSnapshotKey(uid);
    if (!snapshotKey) return null;
    try {
        const raw = localStorage.getItem(snapshotKey);
        return raw ? JSON.parse(raw) : null;
    } catch (err) {
        console.warn("Neispravan lokalni account snapshot:", err);
        return null;
    }
}

function saveAccountLocalSnapshot(uid) {
    if (!uid) return false;

    const stats = getFullLocalStats();
    const weight = calculateProfileSnapshotWeight(stats);
    if (weight <= 0) return false;

    const existing = readAccountLocalSnapshot(uid);
    if (existing && Number(existing.weight || 0) > weight) {
        return false;
    }

    const values = {};
    getAccountSnapshotStorageKeys(uid).forEach(key => {
        const value = localStorage.getItem(key);
        if (value !== null) values[key] = value;
    });

    localStorage.setItem(getAccountSnapshotKey(uid), JSON.stringify({
        uid,
        createdAt: Date.now(),
        weight,
        values
    }));

    return true;
}

function restoreAccountLocalSnapshot(uid) {
    const snapshot = readAccountLocalSnapshot(uid);
    if (!snapshot || !snapshot.values || typeof snapshot.values !== 'object') return false;

    Object.entries(snapshot.values).forEach(([key, value]) => {
        if (typeof key === 'string' && typeof value === 'string') {
            localStorage.setItem(key, value);
        }
    });

    if (window.app) {
        window.app.playerId = uid;
        window.app.playerName = localStorage.getItem('yamb_player_name') || window.app.playerName || _t('hs_player', "Igrač");
        if (typeof window.app.refreshLocalStats === 'function') window.app.refreshLocalStats();
    }
    if (window.statsManager && typeof window.statsManager.loadStats === 'function') {
        window.statsManager.stats = window.statsManager.loadStats() || window.statsManager.stats;
        window.statsManager.previousBalance = window.statsManager.stats.balance || 0;
    }
    refreshLeagueDashboardForCurrentUser();
    return true;
}

function rememberCloudSyncResult(result = {}) {
    window.yambLastCloudSyncResult = {
        ok: !!result.ok,
        reason: result.reason || (result.ok ? 'ok' : 'unknown_error'),
        ...result,
        updatedAt: Date.now()
    };
    return window.yambLastCloudSyncResult;
}

async function syncLoggedInProfileToCloud(user, options = {}) {
    const uid = user?.uid || localStorage.getItem('yamb_uid');
    if (!uid) {
        rememberCloudSyncResult({ ok: false, reason: 'missing_uid' });
        return false;
    }
    if (!window.app) {
        rememberCloudSyncResult({ ok: false, reason: 'app_not_ready' });
        return false;
    }
    if (!window.app.socket) {
        rememberCloudSyncResult({ ok: false, reason: 'socket_not_ready' });
        return false;
    }

    const displayName = user?.displayName || localStorage.getItem('yamb_player_name') || _t('hs_player', "Igrač");
    window.app.playerId = uid;
    window.app.playerName = displayName;
    localStorage.setItem('yamb_uid', uid);
    localStorage.setItem('yamb_player_name', displayName);

    refreshLeagueDashboardForCurrentUser();

    const socket = window.app.socket;
    if (socket.disconnected) {
        socket.connect();
    }

    if (!socket.connected) {
        return new Promise(resolve => {
            let settled = false;
            const finish = (value) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                socket.off('connect', onConnect);
                resolve(value);
            };
            const onConnect = async () => {
                const synced = await syncLoggedInProfileToCloud(user, options);
                finish(synced);
            };
            const timer = setTimeout(() => {
                rememberCloudSyncResult({ ok: false, reason: 'socket_connect_timeout' });
                finish(false);
            }, options.timeoutMs || 5000);

            socket.once('connect', onConnect);
        });
    }

    if (typeof window.app.authenticateSocketIdentity !== 'function') {
        console.warn("Cloud sync preskočen: nedostaje Firebase verifikacija socketa.");
        rememberCloudSyncResult({ ok: false, reason: 'token_auth_missing' });
        return false;
    }

    const authResult = await window.app.authenticateSocketIdentity(!!options.forceRefresh);
    if (!authResult || !authResult.ok) {
        console.warn(`Cloud sync blokiran dok Firebase identitet nije potvrđen: ${authResult?.reason || 'unknown_error'}`);
        rememberCloudSyncResult({
            ...(authResult || {}),
            ok: false,
            reason: authResult?.reason || window.yambLastFirebaseTokenStatus?.reason || 'firebase_auth_failed'
        });
        return false;
    }

    const shouldRestore = options.preferCloudRestore ||
        (typeof window.app.shouldRestoreCloudBeforeProfilePush === 'function' && window.app.shouldRestoreCloudBeforeProfilePush());
    let restoreResult = null;
    if (shouldRestore && typeof window.app.pullCloudProfile === 'function') {
        restoreResult = await window.app.pullCloudProfile({
            forceRefresh: !!options.forceRefresh,
            timeoutMs: options.timeoutMs || 4000
        });
    }

    if (shouldRestore &&
        (!restoreResult || !restoreResult.ok) &&
        restoreResult?.reason !== 'profile_not_found' &&
        !hasMeaningfulLocalProfileForSync()) {
        console.warn(`Cloud restore nije potvrđen (${restoreResult?.reason || 'no_restore_result'}). Blokiram slanje praznog lokalnog profila.`);
        rememberCloudSyncResult({
            ...(restoreResult || {}),
            ok: false,
            reason: restoreResult?.reason || 'cloud_restore_failed'
        });
        return false;
    }

    const syncWait = options.waitForSync ? waitForCloudProfileSync(socket, options.timeoutMs || 4000) : null;

    socket.emit('set_player_data', {
        uid,
        name: window.app.playerName,
        photoUrl: localStorage.getItem('yamb_player_photo') || '',
        stats: getFullLocalStats(),
        playerId: window.app.playerId
    });

    if (window.yambPushNotifications && typeof window.yambPushNotifications.ensureRegistered === 'function') {
        window.yambPushNotifications.ensureRegistered(window.app)
            .catch(error => console.warn("Push registracija nije uspela:", error));
    }

    if (!syncWait) {
        rememberCloudSyncResult({ ok: true, reason: 'sent_without_wait' });
        return true;
    }

    const cloudStats = await syncWait;
    if (cloudStats && window.app && typeof window.app.applyCloudProfileSync === 'function') {
        window.app.applyCloudProfileSync(cloudStats);
    }
    refreshLeagueDashboardForCurrentUser();
    if (cloudStats) {
        saveAccountLocalSnapshot(uid);
        rememberCloudSyncResult({ ok: true, reason: 'profile_synced' });
    } else {
        rememberCloudSyncResult({ ok: false, reason: 'profile_sync_timeout' });
    }

    return !!cloudStats;
}

async function clearAccountLocalCache(uid) {
    if (!uid) return;

    [
        'yamb_quarter_data_' + uid,
        'yamb_last_daily_' + uid,
        'yamb_daily_reward_claimed_' + uid,
        'yamb_daily_reward_amount_' + uid,
        'yamb_legacy_migration_pending_' + uid,
        'yamb_tourney_reg_' + uid
    ].forEach(key => localStorage.removeItem(key));

    // Namerno ne brišemo yamb_saved_game_* ovde: nedovršene lokalne partije
    // moraju da prežive odjavu i da se pojave posle ponovne prijave istog naloga.
}

// --- FUNKCIJA ZA PRIJAVU ---
async function prijaviSe() {
    console.log("Iniciram proces prijave...");

    window.yambAuthState = {
        ...(window.yambAuthState || {}),
        loginInProgress: true,
        checkingLogin: false,
        updatedAt: Date.now()
    };

    const authPlugin = (typeof Capacitor !== 'undefined' && Capacitor.Plugins)
        ? Capacitor.Plugins.FirebaseAuthentication
        : null;

    if (!authPlugin) {
        console.warn("Google Auth nativni plugin nije dostupan u ovom okruženju.");
        window.yambAuthState = {
            ...(window.yambAuthState || {}),
            loginInProgress: false,
            checkingLogin: false,
            updatedAt: Date.now()
        };
        await prikaziObavestenje(_t('auth_only_mobile', "Google prijava je dostupna samo u mobilnoj aplikaciji."));
        return;
    }

    try {
        const result = await authPlugin.signInWithGoogle();
        const signedInUser = setYambAuthState(await resolveFirebaseAuthUser(result));

        if (!signedInUser) {
            console.warn("Google login je završen bez važećeg Firebase korisnika.");
            window.yambAuthState = {
                ...(window.yambAuthState || {}),
                loginInProgress: false,
                checkingLogin: false,
                updatedAt: Date.now()
            };
            await prikaziObavestenje(_t('auth_login_failed', "Prijava trenutno nije uspela. Proveri internet vezu."));
            return;
        }

        console.log("Uspešna prijava:", signedInUser.displayName);
        osveziAuthUI(signedInUser);
        await getYambFirebaseIdToken(true, { attempts: 8, delayMs: 400 });

        let syncOk = true;
        if (window.app) {
            syncOk = await syncLoggedInProfileToCloud(signedInUser, {
                forceRefresh: true,
                preferCloudRestore: true,
                waitForSync: true,
                timeoutMs: 5000
            });
        }

        refreshLeagueDashboardForCurrentUser();

        if (!syncOk &&
            window.app &&
            typeof window.app.hasMeaningfulLocalProfile === 'function' &&
            !window.app.hasMeaningfulLocalProfile()) {
            if (restoreAccountLocalSnapshot(signedInUser.uid)) {
                console.warn("Cloud restore nije potvrđen posle login-a, koristim lokalni account snapshot kao privremeni fallback.");
            } else {
                console.warn("Login je uspeo, ali cloud profil nije vraćen. Ostajem na prijavi da ne prikažem prazan nalog.");
                localStorage.setItem('yamb_force_cloud_restore_next_login', 'true');
                window.yambAuthState = {
                    ...(window.yambAuthState || {}),
                    restoreFailed: true,
                    restoreFailedReason: window.yambLastCloudSyncResult?.reason || window.yambLastFirebaseTokenStatus?.reason || 'unknown_error',
                    updatedAt: Date.now()
                };
                window.app.navigateTo('splash-screen');
                const splashLogin = document.getElementById('splash-login-container');
                if (splashLogin) splashLogin.style.display = 'flex';
                const reason = window.yambAuthState.restoreFailedReason;
                const reasonSuffix = reason ? ` (${reason})` : '';
                await prikaziObavestenje(_t('auth_profile_restore_failed', "Prijava je prošla, ali profil nije vraćen iz cloud-a. Pokušajte ponovo za par sekundi.") + reasonSuffix);
                return;
            }
        }

        if (window.app) window.app.navigateTo('main-menu');

        const playerName = signedInUser.displayName || _t('player_guest', "Igraču");
        await prikaziObavestenje(_t('auth_welcome', "Dobrodošli, ") + playerName + "!");
    } catch (error) {
        console.error("Greška pri prijavi:", error);
        window.yambAuthState = {
            ...(window.yambAuthState || {}),
            loginInProgress: false,
            checkingLogin: false,
            updatedAt: Date.now()
        };
        if (error.message && (error.message.includes("10") || error.message.includes("12500"))) {
            await prikaziObavestenje(_t('auth_sha1_error', "Greška 10/12500: Verovatno SHA-1 ključ u Firebase konzoli nije ispravan."));
        } else {
            await prikaziObavestenje(_t('auth_login_failed', "Prijava trenutno nije uspela. Proveri internet vezu."));
        }
    }
}

// --- FUNKCIJA ZA ODJAVU ---
async function odjaviSe() {
    if (typeof Capacitor === 'undefined' || !Capacitor.Plugins || !Capacitor.Plugins.FirebaseAuthentication) {
         return; 
    }

    const msgText = _t('msg_logout_confirm', "Da li ste sigurni da želite da se odjavite?");

    if (window.modalManager && typeof window.modalManager.confirm === 'function') {
        const potvrda = await window.modalManager.confirm(msgText);
        if (!potvrda) return;
    } else {
        if (!confirm(msgText)) return;
    }

    try {
        const logoutUid = localStorage.getItem('yamb_uid');
        if (window.app && typeof window.app.autoSaveGame === 'function') {
            await window.app.autoSaveGame(true);
        }
        saveAccountLocalSnapshot(logoutUid);

        let logoutSyncConfirmed = !logoutUid;
        if (logoutUid && window.app && window.app.socket) {
            try {
                logoutSyncConfirmed = await syncLoggedInProfileToCloud({
                    uid: logoutUid,
                    displayName: localStorage.getItem('yamb_player_name') || window.app.playerName || _t('hs_player', "Igrač")
                }, {
                    waitForSync: true,
                    timeoutMs: 5000
                });
            } catch (syncErr) {
                console.warn("Cloud sync pre odjave nije potvrđen:", syncErr);
                logoutSyncConfirmed = false;
            }
        }

        if (logoutUid && !logoutSyncConfirmed) {
            const syncWarning = _t(
                'msg_logout_sync_warning',
                "Server nije potvrdio čuvanje najnovijih podataka. Ako se odjavite sada, poslednje lokalne promene možda neće biti vraćene. Nastaviti odjavu?"
            );
            let nastaviOdjavu = false;
            if (window.modalManager && typeof window.modalManager.confirm === 'function') {
                nastaviOdjavu = await window.modalManager.confirm(syncWarning);
            } else {
                nastaviOdjavu = confirm(syncWarning);
            }
            if (!nastaviOdjavu) return;
        }

        if (window.yambPushNotifications && typeof window.yambPushNotifications.unregisterCurrentDevice === 'function') {
            await window.yambPushNotifications.unregisterCurrentDevice(window.app);
        }

        await Capacitor.Plugins.FirebaseAuthentication.signOut();
        console.log("Korisnik uspešno odjavljen.");
        await clearAccountLocalCache(logoutUid);
        localStorage.setItem('yamb_force_cloud_restore_next_login', 'true');

        // 1. Brisanje Firebase podataka
        localStorage.removeItem('yamb_player_photo');
        localStorage.removeItem('yamb_uid');

        // 2. STRIKTNO BRISANJE STATISTIKE I INVENTARA - Sve kreće od nule!
        localStorage.removeItem('yamb_stats');
        localStorage.removeItem('yamb_dukati');
        localStorage.removeItem('yamb_undo_tokens'); // DODATO: Brisanje tokena pri odjavi
        
        localStorage.removeItem('yamb_quarter_data');

        localStorage.removeItem('yamb_unlocked_skins');
        localStorage.removeItem('yamb_unlocked_effects');
        localStorage.removeItem('yamb_unlocked_themes'); 
        localStorage.removeItem('yamb_unlocked'); 
        localStorage.removeItem('yamb_last_daily');
        localStorage.removeItem('yamb_h2h_stats'); 
        
        // Resetovanje aktivnih skinova i tema
        localStorage.removeItem('yamb_theme');
        localStorage.removeItem('yamb_active_skin');
        localStorage.removeItem('yamb_active_effect');

        // Vraćanje UI teme na osnovnu (Zelenu)
        document.body.className = '';
        const themeSelect = document.getElementById('setting-theme');
        if (themeSelect) themeSelect.value = 'dark';
        
        // 3. RESETOVANJE OBJEKATA U RADNOJ MEMORIJI
        if (window.app) {
            window.app.stats = { games: 0, wins: 0, losses: 0, highscore: 0, totalScoreSum: 0, penaltyPoints: 0 };
            window.app.socketVerifiedUid = null;
            window.app.authRetryInProgress = false;
            
            if (window.app.socket && window.app.socket.connected) {
                window.app.socket.disconnect(); 
            }
        }
        if (window.statsManager) {
            window.statsManager.stats = { games: 0, totalGames: 0, wins: 0, losses: 0, highscore: 0, tournamentWins: 0, balance: 0, currentWinStreak: 0, penaltyPoints: 0, unlockedTrophies: [], unlockedSkins: [], unlockedEffects: [] };
            window.statsManager.previousBalance = 0;
        }

        // 4. Izbacivanje na Splash ekran i prikazivanje dugmeta za Login
        localStorage.removeItem('yamb_player_name');
        if (window.app) {
            window.app.playerName = "";
            window.app.playerId = null; 
            window.app.navigateTo('splash-screen');
        }
        
        const splashLoginContainer = document.getElementById('splash-login-container');
        if (splashLoginContainer) splashLoginContainer.style.display = 'flex';
        
        osveziAuthUI(null);

        const nameInput = document.getElementById('setting-name');
        if (nameInput) nameInput.value = "";
        
        refreshLeagueDashboardForCurrentUser();
        
    } catch (error) {
        console.error("Greška pri odjavi:", error);
        await prikaziObavestenje(_t('auth_logout_error', "Došlo je do greške pri odjavi."));
    }
}

// --- PROVERA STATUSA PRILIKOM UČITAVANJA (GOTO KEEPER) ---
async function checkLoginStatus() {
    const splashLoginContainer = document.getElementById('splash-login-container');

    window.yambAuthState = {
        ...(window.yambAuthState || {}),
        loginInProgress: false,
        checkingLogin: true,
        updatedAt: Date.now()
    };

    const authPlugin = (typeof Capacitor !== 'undefined' && Capacitor.Plugins)
        ? Capacitor.Plugins.FirebaseAuthentication
        : null;

    if (!authPlugin) {
        console.warn("Nema Capacitora - Prijava nije moguća na Webu.");
        window.yambAuthState = {
            ...(window.yambAuthState || {}),
            loginInProgress: false,
            checkingLogin: false,
            updatedAt: Date.now()
        };
        setTimeout(() => { if (splashLoginContainer) splashLoginContainer.style.display = 'flex'; }, 4000);
        return; 
    }

    try {
        const result = await authPlugin.getCurrentUser();
        const signedInUser = setYambAuthState(normalizeFirebaseAuthUser(result?.user));

        if (signedInUser) {
            console.log("Korisnik je već ulogovan:", signedInUser.displayName);
            osveziAuthUI(signedInUser);

            const initialCloudSync = syncLoggedInProfileToCloud(signedInUser, {
                preferCloudRestore: true,
                waitForSync: true,
                timeoutMs: 3500
            });

            setTimeout(async () => {
                const syncOk = await initialCloudSync;
                if (window.yambAuthState) window.yambAuthState.checkingLogin = false;
                refreshLeagueDashboardForCurrentUser();
                if (!syncOk &&
                    window.app &&
                    typeof window.app.hasMeaningfulLocalProfile === 'function' &&
                    !window.app.hasMeaningfulLocalProfile()) {
                    if (restoreAccountLocalSnapshot(signedInUser.uid)) {
                        console.warn("Cloud restore nije potvrđen, koristim lokalni account snapshot kao privremeni fallback.");
                    } else {
                        console.warn("Cloud profil nije vraćen, a lokalni profil je prazan. Ostajem na prijavi da ne prikažem nalog od nule.");
                        setYambAuthState(null);
                        osveziAuthUI(null);
                        if (splashLoginContainer) splashLoginContainer.style.display = 'flex';
                        return;
                    }
                }
                if (window.app && !window.app.inviteDetected) {
                    window.app.navigateTo('main-menu'); 
                }
            }, 4000);

        } else {
            setYambAuthState(null);
            setTimeout(() => { if (splashLoginContainer) splashLoginContainer.style.display = 'flex'; }, 4000);
            if (window.app) window.app.navigateTo('splash-screen');
        }
    } catch (e) {
        setYambAuthState(null);
        setTimeout(() => { if (splashLoginContainer) splashLoginContainer.style.display = 'flex'; }, 4000);
        if (window.app) window.app.navigateTo('splash-screen');
    }
}

// Inicijalizacija
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('dugmeGooglePrijava');
    if (btn) btn.addEventListener('click', prijaviSe);
    
    checkLoginStatus();
});

// === PRIJEM SAČUVANIH REZULTATA IZ MONGODB BAZE ===
function inicijalizujCloudSync() {
    if (window.app && window.app.socket) {
        const uid = localStorage.getItem('yamb_uid');
        if (uid && window.app.socket.connected) {
            syncLoggedInProfileToCloud({
                uid,
                displayName: localStorage.getItem('yamb_player_name') || window.app.playerName
            });
        }

    } else {
        setTimeout(inicijalizujCloudSync, 100);
    }
}

inicijalizujCloudSync();
