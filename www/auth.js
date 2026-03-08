/**
 * Yamb of the Balkan - Google Auth
 * Ovaj fajl koristi nativni Capacitor plugin za prijavu.
 */

// Koristimo direktno Capacitor Plugin bez importa (zaobilazimo CORS probleme u browseru)
const { FirebaseAuthentication } = Capacitor.Plugins;

async function prijaviSe() {
    console.log("Iniciram proces prijave...");

    // 1. Provera platforme
    if (Capacitor.getPlatform() === 'web') {
        console.warn("Google Auth nativni plugin ne radi u običnom browseru.");
        alert("Google prijava je dostupna samo u Android aplikaciji. Za testiranje koristi Android Emulator ili fizički uređaj.");
        return;
    }

    try {
        // 2. Poziv nativnog Google prozora
        const result = await FirebaseAuthentication.signInWithGoogle();

        if (result.user) {
            const user = result.user;
            console.log("Uspešna prijava:", user.displayName);

            // 3. Čuvanje podataka u lokalnu memoriju
            if (user.displayName) {
                localStorage.setItem('yamb_player_name', user.displayName);
                
                // Ažuriraj polje za ime u podešavanjima ako postoji
                const nameInput = document.getElementById('setting-name');
                if (nameInput) nameInput.value = user.displayName;
            }

            if (user.photoUrl) {
                localStorage.setItem('yamb_player_photo', user.photoUrl);
            }

            // 4. UI reakcija
            alert("Dobrodošli, " + (user.displayName || "Igraču") + "!");
            
            const loginBtn = document.getElementById('dugmeGooglePrijava');
            if (loginBtn) loginBtn.style.display = 'none';

            // Opciono: Osveži dashboard ako funkcija postoji
            if (typeof updateMainMenuDashboard === 'function') {
                updateMainMenuDashboard();
            }
        }
    } catch (error) {
        console.error("Greška pri prijavi:", error);
        
        // Specifična pomoć za česte greške (Developer mode)
        if (error.message && (error.message.includes("10") || error.message.includes("12500"))) {
            alert("Greška 10/12500: Verovatno SHA-1 ključ u Firebase konzoli nije ispravan ili se ne poklapa sa tvojim ključem za potpisivanje.");
        } else {
            alert("Prijava trenutno nije uspela. Proveri internet vezu.");
        }
    }
}

// Provera statusa prilikom učitavanja ekrana
async function checkLoginStatus() {
    // Preskačemo proveru na webu da ne punimo konzolu greškama
    if (Capacitor.getPlatform() === 'web') return;

    try {
        const result = await FirebaseAuthentication.getCurrentUser();
        if (result.user) {
            const loginBtn = document.getElementById('dugmeGooglePrijava');
            if (loginBtn) loginBtn.style.display = 'none';
            console.log("Korisnik je već ulogovan:", result.user.displayName);
        }
    } catch (e) {
        // Korisnik nije ulogovan, ostavljamo dugme vidljivim
    }
}

// Inicijalizacija kada se učita HTML
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('dugmeGooglePrijava');
    if (btn) {
        btn.addEventListener('click', prijaviSe);
    }
    
    // Proveri da li je već ulogovan nakon kratke pauze da se Capacitor učita
    setTimeout(checkLoginStatus, 500);
});