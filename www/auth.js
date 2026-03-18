/**
 * Yamb of the Balkan - Google Auth
 * Ovaj fajl koristi nativni Capacitor plugin za prijavu i sinhronizuje statistiku sa MongoDB-om.
 */

// --- POMOĆNA FUNKCIJA ZA AŽURIRANJE UI-a ---
function osveziAuthUI(user) {
    const loginBtn = document.getElementById('dugmeGooglePrijava');
    const userInfo = document.getElementById('auth-user-info');
    const logoutBtn = document.getElementById('btn-google-logout');
    const nameInput = document.getElementById('setting-name');
    const userPhoto = document.getElementById('auth-user-photo'); 

    const translate = (key, fallback) => (typeof t !== 'undefined') ? t(key) : fallback;

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
            userInfo.innerText = translate('settings_not_logged_in', "Niste prijavljeni");
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
    return {
        games: (window.app && window.app.stats) ? (window.app.stats.games || 0) : 0,
        wins: (window.app && window.app.stats) ? (window.app.stats.wins || 0) : 0,
        losses: (window.app && window.app.stats) ? (window.app.stats.losses || 0) : 0,
        highscore: (window.app && window.app.stats) ? (window.app.stats.highscore || 0) : 0,
        totalScoreSum: (window.app && window.app.stats) ? (window.app.stats.totalScoreSum || 0) : 0,
        balance: parseInt(localStorage.getItem('yamb_dukati')) || 0,
        currentWinStreak: window.statsManager ? window.statsManager.stats.currentWinStreak : 0,
        unlockedTrophies: window.statsManager ? window.statsManager.stats.unlockedTrophies : [],
        unlockedSkins: window.statsManager ? window.statsManager.stats.unlockedSkins : JSON.parse(localStorage.getItem('yamb_unlocked_skins') || '[]'),
        unlockedEffects: window.statsManager ? window.statsManager.stats.unlockedEffects : JSON.parse(localStorage.getItem('yamb_unlocked_effects') || '[]'),
        yamb_unlocked: JSON.parse(localStorage.getItem('yamb_unlocked') || '[]'),
        leagueData: JSON.parse(localStorage.getItem('yamb_quarter_data')) || { year: 0, quarter: 0, baselineScore: 0 }
    };
}

// --- FUNKCIJA ZA PRIJAVU ---
async function prijaviSe() {
    console.log("Iniciram proces prijave...");

    if (typeof Capacitor === 'undefined' || !Capacitor.Plugins || !Capacitor.Plugins.FirebaseAuthentication) {
        console.warn("Google Auth nativni plugin nije dostupan u ovom okruženju.");
        alert("Google prijava je dostupna samo u mobilnoj aplikaciji.");
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
            alert("Dobrodošli, " + (user.displayName || "Igraču") + "!");

            if (window.app) {
                window.app.playerId = user.uid; 
                if (user.displayName) window.app.playerName = user.displayName;
                
                if (window.app.socket && window.app.socket.connected) {
                    window.app.socket.emit('set_player_data', { 
                        uid: user.uid, 
                        name: window.app.playerName, 
                        stats: getFullLocalStats()
                    });
                }
            }

            if (typeof updateMainMenuDashboard === 'function') {
                updateMainMenuDashboard();
            }
        }
    } catch (error) {
        console.error("Greška pri prijavi:", error);
        if (error.message && (error.message.includes("10") || error.message.includes("12500"))) {
            alert("Greška 10/12500: Verovatno SHA-1 ključ u Firebase konzoli nije ispravan.");
        } else {
            alert("Prijava trenutno nije uspela. Proveri internet vezu.");
        }
    }
}

// --- FUNKCIJA ZA ODJAVU ---
async function odjaviSe() {
    if (typeof Capacitor === 'undefined' || !Capacitor.Plugins || !Capacitor.Plugins.FirebaseAuthentication) {
         return; 
    }

    const msgText = (typeof t !== 'undefined') ? t('msg_logout_confirm') : "Da li ste sigurni da želite da se odjavite?";

    if (window.modalManager && window.modalManager.overlay) {
        const potvrda = await window.modalManager.confirm(msgText);
        if (!potvrda) return;
    } else {
        if (!confirm(msgText)) return;
    }

    try {
        await Capacitor.Plugins.FirebaseAuthentication.signOut();
        console.log("Korisnik uspešno odjavljen.");

        // 1. Brisanje Firebase podataka
        localStorage.removeItem('yamb_player_photo');
        localStorage.removeItem('yamb_uid');

        // 2. STRIKTNO BRISANJE STATISTIKE I INVENTARA - Gost kreće apsolutno od nule!
        localStorage.removeItem('yamb_stats');
        localStorage.removeItem('yamb_dukati');
        localStorage.removeItem('yamb_quarter_data');
        localStorage.removeItem('yamb_unlocked_skins');
        localStorage.removeItem('yamb_unlocked_effects');
        localStorage.removeItem('yamb_unlocked'); 
        
        // Resetovanje aktivnih skinova i tema
        localStorage.setItem('yamb_theme', 'dark');
        localStorage.removeItem('yamb_active_skin');
        localStorage.removeItem('yamb_active_effect');

        // Vraćanje UI teme na osnovnu (Zelenu)
        document.body.className = '';
        const themeSelect = document.getElementById('setting-theme');
        if (themeSelect) themeSelect.value = 'dark';
        
        // 3. RESETOVANJE OBJEKATA U RADNOJ MEMORIJI!
        if (window.app) {
            window.app.stats = { games: 0, wins: 0, losses: 0, highscore: 0, totalScoreSum: 0 };
        }
        if (window.statsManager) {
            window.statsManager.stats = { totalGames: 0, wins: 0, losses: 0, highscore: 0, balance: 0, currentWinStreak: 0, unlockedTrophies: [], unlockedSkins: [], unlockedEffects: [] };
            window.statsManager.saveStats();
        }
        // RESET KVARTALNE LIGE U MEMORIJI (Da bi vizuelno pala na nulu odmah)
        if (window.kvartalnaLiga) {
            window.kvartalnaLiga.quarterData = { year: 0, quarter: 0, baselineScore: 0 };
        }

        // 4. Generisanje Gost imena i privremenog ID-a
        let defaultName = "Gost_" + Math.floor(Math.random() * 9000 + 1000);
        localStorage.setItem('yamb_player_name', defaultName);

        osveziAuthUI(null);

        const nameInput = document.getElementById('setting-name');
        if (nameInput) nameInput.value = defaultName;

        if (window.app) {
            window.app.playerName = defaultName;
            window.app.playerId = 'guest_' + Date.now(); 
            
            if (window.app.socket && window.app.socket.connected) {
                window.app.socket.emit('set_player_data', { 
                    name: window.app.playerName, 
                    stats: getFullLocalStats()
                });
            }
        }
        
        // Forsirano osvežavanje UI panela (Meni kartice za Dukate i Ligu idu na 0)
        if (typeof updateMainMenuDashboard === 'function') {
            updateMainMenuDashboard();
        }
        
    } catch (error) {
        console.error("Greška pri odjavi:", error);
        alert("Došlo je do greške pri odjavi.");
    }
}

// --- PROVERA STATUSA PRILIKOM UČITAVANJA ---
async function checkLoginStatus() {
    if (typeof Capacitor === 'undefined' || !Capacitor.Plugins || !Capacitor.Plugins.FirebaseAuthentication) {
        osveziAuthUI(null); 
        return; 
    }

    try {
        const result = await Capacitor.Plugins.FirebaseAuthentication.getCurrentUser();
        if (result && result.user) {
            console.log("Korisnik je već ulogovan:", result.user.displayName);
            
            localStorage.setItem('yamb_uid', result.user.uid); 
            osveziAuthUI(result.user);
            
            if (window.app) {
                window.app.playerId = result.user.uid;
            }
            
            if (window.app && result.user.displayName && window.app.playerName !== result.user.displayName) {
                window.app.playerName = result.user.displayName;
                localStorage.setItem('yamb_player_name', result.user.displayName);
                
                if (window.app.socket && window.app.socket.connected) {
                    window.app.socket.emit('set_player_data', { 
                        uid: result.user.uid, 
                        name: window.app.playerName, 
                        stats: getFullLocalStats()
                    });
                }
            }
        } else {
            osveziAuthUI(null);
        }
    } catch (e) {
        osveziAuthUI(null);
    }
}

// Inicijalizacija
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('dugmeGooglePrijava');
    if (btn) btn.addEventListener('click', prijaviSe);
    
    setTimeout(checkLoginStatus, 500);
});

// === PRIJEM SAČUVANIH REZULTATA IZ MONGODB BAZE ===
setTimeout(() => {
    if (window.app && window.app.socket) {
        window.app.socket.on('sync_local_stats', (dbStats) => {
            console.log("🔄 Preuzeta cela statistika iz oblaka:", dbStats);
            
            window.app.stats = { 
                games: dbStats.games || 0,
                wins: dbStats.wins || 0, 
                losses: dbStats.losses || 0,
                highscore: dbStats.highscore || 0,
                totalScoreSum: dbStats.totalScoreSum || 0
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

            if (window.statsManager) {
                window.statsManager.stats.wins = dbStats.wins || 0;
                window.statsManager.stats.losses = dbStats.losses || 0;
                window.statsManager.stats.totalGames = dbStats.games || 0;
                window.statsManager.stats.highscore = dbStats.highscore || 0;
                window.statsManager.stats.balance = dbStats.balance || 0;
                window.statsManager.stats.currentWinStreak = dbStats.currentWinStreak || 0;
                window.statsManager.stats.unlockedTrophies = dbStats.unlockedTrophies || [];
                window.statsManager.stats.unlockedSkins = dbStats.unlockedSkins || [];
                window.statsManager.stats.unlockedEffects = dbStats.unlockedEffects || [];
                window.statsManager.saveStats();
            }

            if (dbStats.balance !== undefined) {
                localStorage.setItem('yamb_dukati', dbStats.balance);
            }
            
            if (dbStats.leagueData && dbStats.leagueData.year > 0) {
                localStorage.setItem('yamb_quarter_data', JSON.stringify(dbStats.leagueData));
                
                if (window.kvartalnaLiga) {
                    window.kvartalnaLiga.quarterData = dbStats.leagueData;
                }
            }
            
            if (typeof updateMainMenuDashboard === 'function') {
                updateMainMenuDashboard();
            }
        });
    }
}, 2500);