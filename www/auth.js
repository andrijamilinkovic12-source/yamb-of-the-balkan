import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

// Tvoja prava konfiguracija koju si upravo izvukao
const firebaseConfig = {
  apiKey: "AIzaSyAthhzWhNbChPKpu3cVCpD9cMnw2MLcoEs",
  authDomain: "yamb-of-the-balkan.firebaseapp.com",
  projectId: "yamb-of-the-balkan",
  storageBucket: "yamb-of-the-balkan.firebasestorage.app",
  messagingSenderId: "774107011856",
  appId: "1:774107011856:web:d7a8647712308841a02395",
  measurementId: "G-RTL91JHBF9"
};

// Inicijalizacija
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function prijaviSe() {
    try {
        // 1. Capacitor budi nativni Android Google prozor
        const result = await FirebaseAuthentication.signInWithGoogle();

        // 2. Pravimo kredencijal za Firebase
        const credential = GoogleAuthProvider.credential(result.credential.idToken);

        // 3. Prijavljujemo se u Firebase sistem
        const userCredential = await signInWithCredential(auth, credential);
        const user = userCredential.user;

        console.log("Uspešna prijava!", user.displayName);
        alert("Zdravo " + user.displayName + "!");
        
        // Ovde možeš dodati logiku da se ime igrača automatski upiše u podešavanja
        if(user.displayName) {
            localStorage.setItem('yamb_player_name', user.displayName);
        }

    } catch (error) {
        console.error("Greška pri prijavi:", error);
        // Ako dobiješ grešku 12500 ili 10, proveri SHA-1 u Firebase konzoli
        alert("Prijava nije uspela. Proveri internet ili SHA-1 ključ.");
    }
}

document.getElementById('dugmeGooglePrijava').addEventListener('click', prijaviSe);