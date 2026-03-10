/**
 * Yamb of the Balkan - Google Auth
 * Ovaj fajl koristi nativni Capacitor plugin za prijavu.
 */

const { FirebaseAuthentication } = Capacitor.Plugins;

// --- POMOĆNA FUNKCIJA ZA AŽURIRANJE UI-a ---
function osveziAuthUI(user) {
    const loginBtn = document.getElementById('dugmeGooglePrijava');
    const userInfo = document.getElementById('auth-user-info');
    const logoutBtn = document.getElementById('btn-google-logout');
    const nameInput = document.getElementById('setting-name');
    const userPhoto = document.getElementById('auth-user-photo'); // <-- Dodato za sliku

    // Pomoćna funkcija za prevod unutar JS-a
    const translate = (key, fallback) => (typeof t !== 'undefined') ? t(key) : fallback;

    if (user && user.displayName) {
        // Igrač je ulogovan
        if (loginBtn) loginBtn.style.display = 'none';
        
        if (userInfo) {
            userInfo.innerText = user.displayName;
            userInfo.style.color = 'var(--gold-main)';
        }
        
        // Prikazujemo sliku sa Google naloga
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
            nameInput.disabled = true; // Zabrani ručno menjanje imena dok je prijavljen
            nameInput.style.opacity = '0.6';
        }
    } else {
        // Igrač NIJE ulogovan
        if (loginBtn) loginBtn.style.display = 'flex';
        
        if (userInfo) {
            userInfo.innerText = translate('settings_not_logged_in', "Niste prijavljeni");
            userInfo.style.color = 'var(--text-main)';
        }
        
        // Sakrivamo sliku
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

    if (Capacitor.getPlatform() === 'web') {
        console.warn("Google Auth nativni plugin ne radi u običnom browseru.");
        alert("Google prijava je dostupna samo u aplikaciji.");
        return;
    }

    try {
        const result = await FirebaseAuthentication.signInWithGoogle();

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

            // Sinhronizacija sa glavnom instancom igre i serverom
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
    if (Capacitor.getPlatform() === 'web') return;

    const msgText = (typeof t !== 'undefined') ? t('msg_logout_confirm') : "Da li ste sigurni da želite da se odjavite?";

    // Pitamo igrača za potvrdu pre nego što ga izlogujemo
    if (window.modalManager && window.modalManager.overlay) {
        const potvrda = await window.modalManager.confirm(msgText);
        if (!potvrda) return;
    } else {
        if (!confirm(msgText)) return;
    }

    try {
        await FirebaseAuthentication.signOut();
        console.log("Korisnik uspešno odjavljen.");

        // Brisanje podataka
        localStorage.removeItem('yamb_player_photo');
        
        // Vraćanje na generičko ime umesto Google imena
        let defaultName = "Gost_" + Math.floor(Math.random() * 9000 + 1000);
        localStorage.setItem('yamb_player_name', defaultName);

        // Osvežavanje UI-a (prosledimo null da ga prebaci u izlogovan state)
        osveziAuthUI(null);

        // Ažuriranje polja za unos imena
        const nameInput = document.getElementById('setting-name');
        if (nameInput) nameInput.value = defaultName;

        // Ažuriranje igre i servera
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
    if (Capacitor.getPlatform() === 'web') return;

    try {
        const result = await FirebaseAuthentication.getCurrentUser();
        if (result.user) {
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