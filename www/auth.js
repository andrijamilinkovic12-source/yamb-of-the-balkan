/**
 * Yamb of the Balkan - Google Auth
 * Ovaj fajl koristi nativni Capacitor plugin za prijavu i sinhronizuje statistiku sa MongoDB-om.
 */

// --- POMOĆNA FUNKCIJA ZA BEZBEDAN PREVOD ---
const _t = (key, fallback) => (typeof t !== 'undefined' ? t(key) : fallback);

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

async function getYambFirebaseIdToken(forceRefresh = false) {
    if (typeof Capacitor === 'undefined' || !Capacitor.Plugins || !Capacitor.Plugins.FirebaseAuthentication) {
        return null;
    }

    try {
        const result = await Capacitor.Plugins.FirebaseAuthentication.getIdToken({ forceRefresh });
        return result && result.token ? result.token : null;
    } catch (error) {
        console.warn("Firebase ID token nije dostupan:", error);
        return null;
    }
}

window.getYambFirebaseIdToken = getYambFirebaseIdToken;

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
        soundEnabled: window.app ? window.app.soundEnabled : true,
        vibrationEnabled: window.app ? window.app.vibrationEnabled : true,
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

async function syncLoggedInProfileToCloud(user, options = {}) {
    const uid = user?.uid || localStorage.getItem('yamb_uid');
    if (!uid || !window.app || !window.app.socket) return false;

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
            const timer = setTimeout(() => finish(false), options.timeoutMs || 5000);

            socket.once('connect', onConnect);
        });
    }

    if (typeof window.app.authenticateSocketIdentity === 'function') {
        const authResult = await window.app.authenticateSocketIdentity(!!options.forceRefresh);
        if (!authResult || !authResult.ok) {
            console.warn(`Cloud sync čeka verifikaciju identiteta: ${authResult?.reason || 'unknown_error'}`);
        }
    }

    const syncWait = options.waitForSync ? waitForCloudProfileSync(socket, options.timeoutMs || 4000) : null;

    socket.emit('set_player_data', {
        uid,
        name: window.app.playerName,
        photoUrl: localStorage.getItem('yamb_player_photo') || '',
        stats: getFullLocalStats(),
        playerId: window.app.playerId
    });

    if (!syncWait) return true;

    const cloudStats = await syncWait;
    if (cloudStats && window.app && typeof window.app.applyCloudProfileSync === 'function') {
        window.app.applyCloudProfileSync(cloudStats);
    }
    refreshLeagueDashboardForCurrentUser();

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

    if (window.localforage && typeof localforage.removeItem === 'function') {
        await Promise.all([
            localforage.removeItem('yamb_saved_game_' + uid + '_1'),
            localforage.removeItem('yamb_saved_game_' + uid + '_2')
        ]);
    }
}

// --- FUNKCIJA ZA PRIJAVU ---
async function prijaviSe() {
    console.log("Iniciram proces prijave...");

    if (typeof Capacitor === 'undefined' || !Capacitor.Plugins || !Capacitor.Plugins.FirebaseAuthentication) {
        console.warn("Google Auth nativni plugin nije dostupan u ovom okruženju.");
        await prikaziObavestenje(_t('auth_only_mobile', "Google prijava je dostupna samo u mobilnoj aplikaciji."));
        return;
    }

    try {
        const result = await Capacitor.Plugins.FirebaseAuthentication.signInWithGoogle();

        if (result.user) {
            const user = result.user;
            console.log("Uspešna prijava:", user.displayName);

            localStorage.setItem('yamb_uid', user.uid);
            migrateLegacyLocalProgressToUid(user.uid);
            
            if (user.displayName) {
                localStorage.setItem('yamb_player_name', user.displayName);
            }
            if (user.photoUrl) {
                localStorage.setItem('yamb_player_photo', user.photoUrl);
            }

            osveziAuthUI(user);
            const playerName = user.displayName || _t('player_guest', "Igraču");
            await prikaziObavestenje(_t('auth_welcome', "Dobrodošli, ") + playerName + "!");

            if (window.app) {
                window.app.playerId = user.uid;
                if (user.displayName) window.app.playerName = user.displayName;

                await syncLoggedInProfileToCloud(user, {
                    forceRefresh: true,
                    waitForSync: true,
                    timeoutMs: 5000
                });
            }

            refreshLeagueDashboardForCurrentUser();
            
            if (window.app) window.app.navigateTo('main-menu');
        }
    } catch (error) {
        console.error("Greška pri prijavi:", error);
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
        if (logoutUid && window.app && window.app.socket) {
            try {
                await syncLoggedInProfileToCloud({
                    uid: logoutUid,
                    displayName: localStorage.getItem('yamb_player_name') || window.app.playerName || _t('hs_player', "Igrač")
                }, {
                    waitForSync: true,
                    timeoutMs: 5000
                });
            } catch (syncErr) {
                console.warn("Cloud sync pre odjave nije potvrđen:", syncErr);
            }
        }

        await Capacitor.Plugins.FirebaseAuthentication.signOut();
        console.log("Korisnik uspešno odjavljen.");
        await clearAccountLocalCache(logoutUid);

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
        localStorage.setItem('yamb_theme', 'dark');
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
            window.statsManager.saveStats();
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

    if (typeof Capacitor === 'undefined' || !Capacitor.Plugins || !Capacitor.Plugins.FirebaseAuthentication) {
        console.warn("Nema Capacitora - Prijava nije moguća na Webu.");
        setTimeout(() => { if (splashLoginContainer) splashLoginContainer.style.display = 'flex'; }, 4000);
        return; 
    }

    try {
        const result = await Capacitor.Plugins.FirebaseAuthentication.getCurrentUser();
        if (result && result.user) {
            console.log("Korisnik je već ulogovan:", result.user.displayName);
            
            localStorage.setItem('yamb_uid', result.user.uid);
            migrateLegacyLocalProgressToUid(result.user.uid);
            localStorage.setItem('yamb_player_name', result.user.displayName || _t('hs_player', "Igrač"));
            osveziAuthUI(result.user);
            
            if (window.app) {
                window.app.playerId = result.user.uid;
                window.app.playerName = result.user.displayName || _t('hs_player', "Igrač");
            }

            const initialCloudSync = syncLoggedInProfileToCloud(result.user, {
                waitForSync: true,
                timeoutMs: 3500
            });

            setTimeout(async () => {
                await initialCloudSync;
                refreshLeagueDashboardForCurrentUser();
                if (window.app && !window.app.inviteDetected) {
                    window.app.navigateTo('main-menu'); 
                }
            }, 4000);

        } else {
            setTimeout(() => { if (splashLoginContainer) splashLoginContainer.style.display = 'flex'; }, 4000);
            if (window.app) window.app.navigateTo('splash-screen');
        }
    } catch (e) {
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
