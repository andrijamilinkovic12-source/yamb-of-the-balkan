/**
 * Yamb of the Balkan - Google Auth
 * Ovaj fajl koristi nativni Capacitor plugin za prijavu.
 */

// UKLONJENO: const { FirebaseAuthentication } = Capacitor.Plugins; 
// Ovu dodelu ćemo raditi dinamički samo kada nam zatreba.

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

// --- FUNKCIJA ZA PRIJAVU ---
async function prijaviSe() {
    console.log("Iniciram proces prijave...");

    // 1. Sigurnosna provera: Da li Capacitor uopšte postoji?
    if (typeof Capacitor === 'undefined' || !Capacitor.Plugins || !Capacitor.Plugins.FirebaseAuthentication) {
        console.warn("Google Auth nativni plugin nije dostupan u ovom okruženju.");
        alert("Google prijava je dostupna samo u mobilnoj aplikaciji.");
        return;
    }

    try {
        // Pristupamo pluginu dinamički
        const result = await Capacitor.Plugins.FirebaseAuthentication.signInWithGoogle();

        if (result.user) {
            const user = result.user;
            console.log("Uspešna prijava:", user.displayName);

            if (user.displayName) {
                localStorage.setItem('yamb_player_name', user.displayName);
            }
            if (user.photoUrl) {
                localStorage.setItem('yamb_player_photo', user.photoUrl);
            }

            osveziAuthUI(user);
            alert("Dobrodošli, " + (user.displayName || "Igraču") + "!");

            if (window.app && user.displayName) {
                window.app.playerName = user.displayName;
                
                if (window.app.socket && window.app.socket.connected) {
                    window.app.socket.emit('set_player_data', { 
                        name: window.app.playerName, 
                        stats: { wins: window.app.stats.wins || 0, losses: window.app.stats.losses || 0 } 
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
    // 1. Sigurnosna provera
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
        // Pristupamo pluginu dinamički
        await Capacitor.Plugins.FirebaseAuthentication.signOut();
        console.log("Korisnik uspešno odjavljen.");

        localStorage.removeItem('yamb_player_photo');
        
        let defaultName = "Gost_" + Math.floor(Math.random() * 9000 + 1000);
        localStorage.setItem('yamb_player_name', defaultName);

        osveziAuthUI(null);

        const nameInput = document.getElementById('setting-name');
        if (nameInput) nameInput.value = defaultName;

        if (window.app) {
            window.app.playerName = defaultName;
            if (window.app.socket && window.app.socket.connected) {
                window.app.socket.emit('set_player_data', { 
                    name: window.app.playerName, 
                    stats: { wins: window.app.stats.wins || 0, losses: window.app.stats.losses || 0 } 
                });
            }
        }
        
    } catch (error) {
        console.error("Greška pri odjavi:", error);
        alert("Došlo je do greške pri odjavi.");
    }
}

// --- PROVERA STATUSA PRILIKOM UČITAVANJA ---
async function checkLoginStatus() {
    // 1. Sigurnosna provera
    if (typeof Capacitor === 'undefined' || !Capacitor.Plugins || !Capacitor.Plugins.FirebaseAuthentication) {
        osveziAuthUI(null); // Osiguravamo da UI bude u izlogovanom stanju ako nema plugina
        return; 
    }

    try {
        // Pristupamo pluginu dinamički
        const result = await Capacitor.Plugins.FirebaseAuthentication.getCurrentUser();
        if (result && result.user) {
            console.log("Korisnik je već ulogovan:", result.user.displayName);
            osveziAuthUI(result.user);
            
            if (window.app && result.user.displayName && window.app.playerName !== result.user.displayName) {
                window.app.playerName = result.user.displayName;
                localStorage.setItem('yamb_player_name', result.user.displayName);
                
                if (window.app.socket && window.app.socket.connected) {
                    window.app.socket.emit('set_player_data', { 
                        name: window.app.playerName, 
                        stats: { wins: window.app.stats.wins || 0, losses: window.app.stats.losses || 0 } 
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