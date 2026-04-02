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
    const uid = localStorage.getItem('yamb_uid');
    if (!uid) return {}; // STRIKTNO ZABRANJEN GOST

    return {
        games: (window.app && window.app.stats) ? (window.app.stats.games || 0) : 0,
        wins: (window.app && window.app.stats) ? (window.app.stats.wins || 0) : 0,
        losses: (window.app && window.app.stats) ? (window.app.stats.losses || 0) : 0,
        highscore: (window.app && window.app.stats) ? (window.app.stats.highscore || 0) : 0,
        totalScoreSum: (window.app && window.app.stats) ? (window.app.stats.totalScoreSum || 0) : 0,
        maxWinStreak: (window.app && window.app.stats) ? (window.app.stats.maxWinStreak || 0) : 0,
        tournamentWins: window.statsManager ? (window.statsManager.stats.tournamentWins || 0) : 0, 
        balance: parseInt(localStorage.getItem('yamb_dukati')) || 0,
        currentWinStreak: window.statsManager ? window.statsManager.stats.currentWinStreak : 0,
        unlockedTrophies: window.statsManager ? window.statsManager.stats.unlockedTrophies : [],
        unlockedSkins: window.statsManager ? window.statsManager.stats.unlockedSkins : JSON.parse(localStorage.getItem('yamb_unlocked_skins') || '[]'),
        unlockedEffects: window.statsManager ? window.statsManager.stats.unlockedEffects : JSON.parse(localStorage.getItem('yamb_unlocked_effects') || '[]'),
        yamb_unlocked: JSON.parse(localStorage.getItem('yamb_unlocked') || '[]'),
        unlockedThemes: JSON.parse(localStorage.getItem('yamb_unlocked_themes') || '[]'),
        // ISPRAVKA 1: Dinamički ključ za ligu na osnovu UID-a
        leagueData: JSON.parse(localStorage.getItem('yamb_quarter_data_' + uid)) || { year: 0, quarter: 0, baselineScore: 0, quarterlyScore: 0 },
        activeSkin: localStorage.getItem('yamb_active_skin') || null,
        activeEffect: localStorage.getItem('yamb_active_effect') || null,
        activeTheme: localStorage.getItem('yamb_theme') || null,
        lastDaily: localStorage.getItem('yamb_last_daily_' + uid) || "",
        soundEnabled: window.app ? window.app.soundEnabled : true,
        vibrationEnabled: window.app ? window.app.vibrationEnabled : true,
        h2hStats: JSON.parse(localStorage.getItem('yamb_h2h_stats') || '{}')
    };
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
                
                if (window.app.socket && window.app.socket.disconnected) {
                    window.app.socket.connect();
                }

                if (window.app.socket && window.app.socket.connected) {
                    window.app.socket.emit('set_player_data', { 
                        uid: user.uid, 
                        name: window.app.playerName, 
                        photoUrl: localStorage.getItem('yamb_player_photo') || '',
                        stats: getFullLocalStats()
                    });
                }
            }

            if (typeof updateMainMenuDashboard === 'function') {
                updateMainMenuDashboard();
            }
            
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
        await Capacitor.Plugins.FirebaseAuthentication.signOut();
        console.log("Korisnik uspešno odjavljen.");

        // ISPRAVKA 2: Moramo sačuvati UID pre brisanja da bismo znali čiju ligu brišemo
        const targetUid = localStorage.getItem('yamb_uid');

        // 1. Brisanje Firebase podataka
        localStorage.removeItem('yamb_player_photo');
        localStorage.removeItem('yamb_uid');

        // 2. STRIKTNO BRISANJE STATISTIKE I INVENTARA - Sve kreće od nule!
        localStorage.removeItem('yamb_stats');
        localStorage.removeItem('yamb_dukati');
        
        // Brišemo novu dinamičku ligu za ovog korisnika, ali i staru za svaki slučaj
        if (targetUid) localStorage.removeItem('yamb_quarter_data_' + targetUid);
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
            window.app.stats = { games: 0, wins: 0, losses: 0, highscore: 0, totalScoreSum: 0 };
            
            if (window.app.socket && window.app.socket.connected) {
                window.app.socket.disconnect(); 
            }
        }
        if (window.statsManager) {
            window.statsManager.stats = { totalGames: 0, wins: 0, losses: 0, highscore: 0, tournamentWins: 0, balance: 0, currentWinStreak: 0, unlockedTrophies: [], unlockedSkins: [], unlockedEffects: [] };
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
        
        if (typeof updateMainMenuDashboard === 'function') {
            updateMainMenuDashboard();
        }
        
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
            localStorage.setItem('yamb_player_name', result.user.displayName || _t('hs_player', "Igrač"));
            osveziAuthUI(result.user);
            
            if (window.app) {
                window.app.playerId = result.user.uid;
                window.app.playerName = result.user.displayName || _t('hs_player', "Igrač");
            }

            setTimeout(() => { 
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
        
        window.app.socket.off('sync_local_stats');
        window.app.socket.on('sync_local_stats', (dbStats) => {
            
            if (!localStorage.getItem('yamb_uid')) {
                console.log("🛑 Prijavljivanje obavezno: Ignorišem Cloud Sync jer korisnik nije ulogovan.");
                return; 
            }

            console.log("🔄 Preuzeta cela statistika iz oblaka:", dbStats);
            
            window.app.stats = { 
                games: dbStats.games || 0,
                wins: dbStats.wins || 0, 
                losses: dbStats.losses || 0,
                highscore: dbStats.highscore || 0,
                totalScoreSum: dbStats.totalScoreSum || 0,
                maxWinStreak: dbStats.maxWinStreak || 0
            };
            localStorage.setItem('yamb_stats', JSON.stringify(window.app.stats));
            
            let mergedUnlocked = dbStats.yamb_unlocked || [];
            if (mergedUnlocked.length === 0) {
                mergedUnlocked = [
                    ...(dbStats.unlockedTrophies || []), 
                    ...(dbStats.unlockedSkins || []), 
                    ...(dbStats.unlockedEffects || [])
                ];
            }
            
            const freeDefaults = ['default', 'confetti', 'dark', 'light', 'medium', 'winter'];
            freeDefaults.forEach(item => {
                if (!mergedUnlocked.includes(item)) mergedUnlocked.push(item);
            });

            localStorage.setItem('yamb_unlocked', JSON.stringify(mergedUnlocked));
            localStorage.setItem('yamb_unlocked_skins', JSON.stringify(dbStats.unlockedSkins || []));
            localStorage.setItem('yamb_unlocked_effects', JSON.stringify(dbStats.unlockedEffects || []));
            
            let lokalneTeme = JSON.parse(localStorage.getItem('yamb_unlocked_themes') || '[]');
            let cloudTeme = dbStats.unlockedThemes || [];
            let sakriveneTeme = (dbStats.unlockedSkins || []).filter(t => ['neon', 'amethyst'].includes(t));
            let opsteTeme = (dbStats.yamb_unlocked || []).filter(t => ['neon', 'amethyst'].includes(t));
            
            let spojeneTeme = [...new Set([...lokalneTeme, ...cloudTeme, ...sakriveneTeme, ...opsteTeme])];
            localStorage.setItem('yamb_unlocked_themes', JSON.stringify(spojeneTeme));

            if (dbStats.activeSkin) localStorage.setItem('yamb_active_skin', dbStats.activeSkin);
            if (dbStats.activeEffect) localStorage.setItem('yamb_active_effect', dbStats.activeEffect);
            if (dbStats.activeTheme) {
                localStorage.setItem('yamb_theme', dbStats.activeTheme);
                
                if (window.app && typeof window.app.applyTheme === 'function') {
                    window.app.applyTheme(dbStats.activeTheme);
                } else {
                    document.body.className = '';
                    if (dbStats.activeTheme !== 'dark') {
                        document.body.classList.add(dbStats.activeTheme + '-theme');
                    }
                }
                
                const themeSelect = document.getElementById('setting-theme');
                if (themeSelect) themeSelect.value = dbStats.activeTheme;
            }

            if (dbStats.soundEnabled !== undefined) {
                localStorage.setItem('yamb_sound', dbStats.soundEnabled);
                if (window.app && window.app.soundMgr) {
                    window.app.soundMgr.enabled = dbStats.soundEnabled;
                    window.app.soundEnabled = dbStats.soundEnabled;
                }
            }
            if (dbStats.vibrationEnabled !== undefined) {
                localStorage.setItem('yamb_vibration', dbStats.vibrationEnabled);
                if (window.app) window.app.vibrationEnabled = dbStats.vibrationEnabled;
            }

            if (dbStats.h2hStats) {
                localStorage.setItem('yamb_h2h_stats', JSON.stringify(dbStats.h2hStats));
            }
            
            // === ISPRAVLJENI KOD ZA DNEVNI IZAZOV ===
            const currentUid = localStorage.getItem('yamb_uid');
            const danasnjiDatum = new Date().toDateString();
            const lokalniZapis = localStorage.getItem('yamb_last_daily_' + currentUid);

            if (dbStats.lastDaily) {
                // Ako se server i klijent razlikuju, a lokalno nije danas, preuzmi sa clouda
                if (lokalniZapis !== danasnjiDatum) {
                    localStorage.setItem('yamb_last_daily_' + currentUid, dbStats.lastDaily);
                }
            } else {
                // STRIKTNA ZABRANA: Ne briši ako je korisnik LOKALNO već odigrao danas!
                if (lokalniZapis !== danasnjiDatum) {
                    localStorage.removeItem('yamb_last_daily_' + currentUid);
                }
            }
            // =========================================

            if (window.statsManager) {
                window.statsManager.stats.wins = dbStats.wins || 0;
                window.statsManager.stats.losses = dbStats.losses || 0;
                window.statsManager.stats.totalGames = dbStats.games || 0;
                window.statsManager.stats.highscore = dbStats.highscore || 0;
                window.statsManager.stats.tournamentWins = dbStats.tournamentWins || 0; 
                window.statsManager.stats.balance = dbStats.balance || 0;
                window.statsManager.stats.currentWinStreak = dbStats.currentWinStreak || 0;
                window.statsManager.stats.maxWinStreak = dbStats.maxWinStreak || 0;
                window.statsManager.stats.unlockedTrophies = dbStats.unlockedTrophies || [];
                window.statsManager.stats.unlockedSkins = dbStats.unlockedSkins || [];
                window.statsManager.stats.unlockedEffects = dbStats.unlockedEffects || [];
                window.statsManager.saveStats();
            }

            if (dbStats.balance !== undefined) {
                localStorage.setItem('yamb_dukati', dbStats.balance);
            }
            
            // ISPRAVKA 3: Čuvanje Cloud podataka u dinamički ključ za prijavljenog korisnika
            if (dbStats.leagueData && dbStats.leagueData.year > 0) {
                localStorage.setItem('yamb_quarter_data_' + currentUid, JSON.stringify(dbStats.leagueData));
            }
            
            if (typeof updateMainMenuDashboard === 'function') {
                updateMainMenuDashboard();
            }
        });
        
        const uid = localStorage.getItem('yamb_uid');
        if (uid && window.app.socket.connected) {
            window.app.socket.emit('set_player_data', {
                uid: uid,
                name: window.app.playerName,
                photoUrl: localStorage.getItem('yamb_player_photo') || '',
                stats: getFullLocalStats(),
                playerId: window.app.playerId
            });
        }

    } else {
        setTimeout(inicijalizujCloudSync, 100);
    }
}

inicijalizujCloudSync();