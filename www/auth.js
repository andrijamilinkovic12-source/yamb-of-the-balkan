import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

// 1. Tvoja Firebase Web konfiguracija 
const firebaseConfig = {
  apiKey: "TVOJ_API_KEY",
  authDomain: "tvoj-projekat.firebaseapp.com",
  projectId: "tvoj-projekat",
  // ... dodaj ostale parametre iz konzole
};

// Inicijalizacija Firebase-a
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 2. Glavna funkcija za prijavu
async function prijaviSe() {
    try {
        const result = await FirebaseAuthentication.signInWithGoogle();
        const credential = GoogleAuthProvider.credential(result.credential.idToken);
        const userCredential = await signInWithCredential(auth, credential);
        const user = userCredential.user;

        console.log("Uspešna prijava! Dobrodošao:", user.displayName);
        alert("Zdravo " + user.displayName + "!");

    } catch (error) {
        console.error("Došlo je do greške pri prijavi:", error);
        alert("Prijava nije uspela.");
    }
}

// 3. Povezujemo funkciju sa onim HTML dugmetom
document.getElementById('dugmeGooglePrijava').addEventListener('click', prijaviSe);