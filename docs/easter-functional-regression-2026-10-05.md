# Vaskrs — funkcionalna regresija i Riznica, 2026-10-05

Završni lokalni prolaz postojećih provera: **17/17 prolazi**. Lokalni `npm` launcher nema `npm-cli.js`, pa su skriptovi iz test-matrice pokrenuti direktno kroz `node`.

Prošli su: `check-js`, `check-ad-consent`, `check-game-rules`, `check-trophies`, `check-profile-sync`, `check-match-results`, `check-quarterly-league`, `check-online-reconnect`, `check-socket-transport`, `check-firebase-security`, `check-reconnect-staging`, `check-h2h-ledger-rebuild`, `check-theme-performance`, `check-effect-screen-lifecycle`, `check-portrait-lock`, `check-easter-asset-coverage` i `check-green-asset-coverage`. Socket test je ponovljen sa dozvoljenim lokalnim loopback pristupom pošto je prvi pokušaj zaustavila sandbox mrežna zabrana; završni rezultat je prolaz.

Riznica je izmerena u Chrome-u na Pixel 7 Pro emulatoru, u lokalnom Vaskrs QA prikazu, sa sveže učitanim iframe-om i isključenim HTTP keširanjem za CDP sesiju. `scripts/measure-easter-treasury.js` otvara samo postojeći Vaskrs QA tab i ne šalje podatke na server. Dva ponavljanja:

| Metrika | Prvo | Drugo |
| --- | ---: | ---: |
| Kreiranje 26 kartica | 146 ms | 179 ms |
| Dekodirane prve četiri slike | 367 ms | 437 ms |
| Pripremljeno svih 26 trofeja | 755 ms | 780 ms |
| Neuspele slike | 0 | 0 |

Prethodna priprema trofeja nije postojala u novom iframe-u (`hadWarmup: false`). Kod u `riznica.js` priprema trofeje tokom ulaznog intra sa četiri paralelna učitavanja. Uvodni prikaz trenutno traje 4,6 s, pa se osećaj čekanja ne poklapa sa izmerenim vremenom učitavanja samih PNG-ova. Ovaj nalaz ne dokazuje isto vreme na sporoj mreži, instaliranom APK-u ili fizičkom telefonu; lokalni QA server i emulator su brži od takvog scenarija.

Android debug APK je uspešno napravljen (`assembleDebug --offline`) i potvrđeno je da sadrži nova dva Vaskrs PNG-a za tablu. Ažuriranje na prvobitnom emulatoru nije uspelo: `/data` particija od 5,8 GB imala je svega oko 396 KB slobodno (`Requested internal only, but not enough space`). Android `pm trim-caches 1G` nije oslobodio dovoljno prostora. Nisu brisani podaci aplikacije ni druge aplikacije.

Napravljen je **novi, odvojeni** AVD `Easter_QA_10GB` (Pixel 7 Pro, Android 36), sa 10 GB za `/data`; prvobitni `Pixel_7_Pro` AVD je sačuvan i uredno ugašen radi RAM-a. Debug APK je instaliran na novom emulatoru i aplikacija se otvara bez belog ekrana; posle instalacije ostalo je oko 7,4 GB slobodno. Važna granica: `capacitor.config.json` usmerava WebView na udaljenu web verziju, pa vizuelni prikaz u samoj aplikaciji ne potvrđuje lokalne izmene koje su upakovane u APK. Pokušaj da WebView direktno otvori `https://localhost` potvrdio je da lokalni Capacitor server nije dostupan u ovoj konfiguraciji; aplikacija je zatim vraćena na svoj početni ekran.

Za potvrdu zapakovanih fajlova napravljen je zaseban Android build tip `qaLocal`. On koristi `android/app/src/qaLocal/assets/capacitor.config.json` bez `server.url`; normalni debug i release ostaju na originalnoj konfiguraciji. `assembleQaLocal --offline` prolazi, a pregled APK-a potvrđuje da je u njega upisan lokalni config. Instaliran je samo na novi emulator; WebView zaista otvara `https://localhost/`. Unutar aplikacije lokalni Vaskrs QA preview uspešno je prikazao glavni meni, Riznicu sa trofejima i novim katancem, te online tablu sa novim PNG ikonama izlaza i najave. Snimci: `docs/easter-main-qa-apk-2026-10-05.png`, `docs/easter-treasury-qa-apk-2026-10-05.png`, `docs/easter-board-qa-apk-2026-10-05.png`. To su probni podaci iz QA preview-a, ne prijavljen nalog ni stvarna online partija. Prethodni duplirani Chrome snimci su uklonjeni; QA APK snimci ih zamenjuju.

Preostaje ručna provera sa stvarnim nalogom i serverom: online meč, stvarni rezultati, sinhronizacija trofeja i stanje nagrada; zatim fizički telefon. Testovi i QA preview ne simuliraju te spoljne tokove. Pre objave korisnicima i dalje je potrebna objava web verzije ili promena načina na koji produkcioni APK učitava sadržaj; sama instalacija standardnog APK-a sa trenutnom `server.url` konfiguracijom nije dovoljna da se lokalne izmene pojave korisnicima.
