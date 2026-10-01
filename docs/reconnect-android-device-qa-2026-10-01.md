# Android reconnect QA — kontrolisana završna provera

Datum pripreme: 1. oktobar 2026.

## Trenutni status

Ovaj dokument je kapija za proveru na stvarnim uređajima. Provera još nije izvršena i ne sme se označiti kao uspešna bez dokaza sa dva Android uređaja ili emulatora.

Lokalni preflight je potvrdio:

- aplikacija: `com.yamb.balkan`, verzija projekta `12.1` (`versionCode 111`);
- AVD `Pixel_7_Pro` je uspešno pokrenut kao `emulator-5554`, Android 16 / API 36;
- na emulatoru je instaliran APK `12.1` (`versionCode 111`), poslednji put ažuriran 26. septembra 2026. u 14:21:16;
- instalirani APK je stariji od aktuelnih reconnect izmena i zato nije validan dokaz za ovaj fix;
- drugi Android uređaj trenutno nije povezan;
- Gradle 8.14.3 distribucija nije lokalno keširana;
- `capacitor.config.json` usmerava aplikaciju na produkcioni server `https://yamb-of-the-balkan.onrender.com`;
- najnovije reconnect izmene nisu deployovane.

Pripremljena je odvojena staging putanja koja ne menja produkcioni build:

- staging server odbija pokretanje ako runtime, baza ili Firebase Admin projekat nisu eksplicitno staging;
- staging Android build odbija produkcioni URL i zahteva poseban `google-services.json`;
- staging APK koristi poseban package `com.yamb.balkan.staging`, pa ne prepisuje produkcionu aplikaciju;
- klijent koristi HTTPS poreklo iz kog je aplikacija učitana, pa staging Socket/API saobraćaj ne pada nazad na produkciju;
- AdMob se u staging/local runtime-u ne inicijalizuje;
- build pre Gradlea proverava `/healthz` i `/api/firebase-auth-status`, a privremeni Firebase i Capacitor fajlovi vraćaju se i kada build ne uspe;
- installer proverava SHA-256 manifesta i zahteva tačno dva različita ADB uređaja.

Zbog toga bi duel sada proveravao stari APK i staru produkcionu serversku verziju, a mogao bi da upiše stvarne rezultate, kazne i nagrade. Takav test nije validan i nije pokrenut. Izvršeni su samo read-only ADB preflight, boot emulatora i provera paketa/verzije.

## Obavezni preduslovi

Pre prvog duela moraju biti ispunjene sve stavke:

1. Izolovan staging server i posebna staging baza, bez produkcionih profila i rezultata.
2. Dva namenska test naloga sa poznatim početnim stanjem statistike, lige, H2H i salda.
3. Build koji sadrži aktuelne `server.js` i `www/game.js` izmene i pokazuje isključivo na staging URL.
4. Dva Android uređaja, ili jedan telefon i jedan emulator, vidljivi preko `adb devices -l`.
5. Podešen privatni monitor token i sačuvan početni snimak monitora.
6. Automatske provere moraju biti zelene neposredno pre builda:

   ```powershell
   node scripts/check-js.js
   node scripts/check-match-results.js
   node scripts/check-online-reconnect.js
   node scripts/check-reconnect-staging.js
   ```

Ne koristiti stvarne korisnike, produkcioni matchmaking, produkcioni turnir niti kupovine/nagradne oglase.

## Bezbedna priprema staging builda

1. Kopirati `.env.reconnect-staging.example` u lokalni `.env.reconnect-staging` i uneti isključivo staging vrednosti. Taj lokalni fajl je ignorisan u Git-u. Secrets se podešavaju u procesu/CI okruženju i ne upisuju se u izvornu konfiguraciju.
2. Deployovati istu verziju koda kao zaseban staging servis sa `YAMB_RUNTIME_ENV=staging`, posebnom bazom i staging Firebase service account-om. Server se neće pokrenuti ako identiteti nisu usklađeni.
3. Podesiti lokalne promenljive za javni staging URL, isti `YAMB_STAGING_INSTANCE_ID`, staging Firebase project ID, package `com.yamb.balkan.staging` i apsolutnu putanju do zasebnog staging `google-services.json`. Firebase projekat mora imati Android klijent registrovan za taj staging package.
4. Pokrenuti:

   ```powershell
   npm run check:reconnect-staging
   npm run build:reconnect-staging
   ```

5. Tek kada postoje dva test uređaja i build manifest, instalirati bez automatskog pokretanja ili prijave:

   ```powershell
   npm run install:reconnect-staging-clients -- <adb-serial-1> <adb-serial-2>
   ```

Build izlaz je u ignorisanom direktorijumu `tmp/reconnect-staging/`. Skripta se zaustavlja pre builda ako URL, server instance ID, Firebase projekat ili Android package nisu tačno potvrđeni.

## Evidencija svakog testa

Za svaki pokušaj zapisati:

- režim i način ulaska;
- puni `matchId` i kratki ID;
- uređaj, Android verziju i verziju aplikacije;
- vreme odlaska u pozadinu i vreme povratka;
- početnu mrežu, završnu mrežu i da li je socket stvarno prekinut;
- preostalo vreme poteza pre odlaska i posle sinhronizacije;
- rezultat u monitoru i konačni `MatchResult`;
- stanje statistike/salda oba test naloga pre i posle.

Read-only detalj incidenta može se izvući komandom:

```powershell
node scripts/inspect-disconnects.js <matchId>
```

## Matrica ulaznih putanja

Svaki scenario ispod izvršiti u sva četiri serverska režima:

| Režim | Ulaz | Očekivani prefiks sobe |
|---|---|---|
| random | javno nasumično uparivanje | `room_` |
| challenge | direktni izazov online igrača | `duel_` |
| friend_invite | soba/link poziva prijatelju | `yamb-` |
| tournament | prihvaćen turnirski duel | `tourney_` |

## Test scenariji

### A. Kratko minimizovanje, kraće od dve sekunde

1. Tokom aktivnog poteza poslati aplikaciju u pozadinu.
2. Vratiti je za približno jednu sekundu.

Očekivanje: igra se nastavlja iz autoritativnog stanja; nema tehničkog rezultata; provisional incident se ne čuva; protivnik ne vidi zakašnjeli reconnect ekran.

### B. Pozadina tri do deset sekundi

Očekivanje: partija se odmah pauzira; monitor beleži jednu lifecycle epizodu; povratak daje `recovered`; tabla, igrač na potezu i tajmer dolaze sa servera; nema kazne ni duplog rezultata.

### C. Zaključavanje telefona i povratak pre roka

Obični duel vratiti pre 30 sekundi, turnir pre pet minuta. Očekivanje je isto kao u scenariju B. Vidljiv WebView bez native potvrde ne sme sam proglasiti povratak.

### D. Povratak posle isteka roka

Očekivanje: kasni resume se odbija; postoji tačno jedan tehnički rezultat; pobednik je igrač koji je bio povezan u trenutku odluke; statistika, H2H, liga i saldo menjaju se najviše jednom.

### E. Wi‑Fi na mobilnu mrežu i obrnuto

Prebaciti mrežu dok je aplikacija u pozadini i vratiti se pre roka. Očekivanje: Socket.IO reconnect ili same-socket resume vraća partiju; monitor može prikazati `transport close/error`, ali 4G/Wi‑Fi oznaka nije sama po sebi uzrok prekida.

### F. Brzi ponovljeni pause/resume na istom potezu

Izvršiti najmanje tri prekida na istom potezu. Očekivanje: rok se ne resetuje na novih 30 sekundi pri svakom prekidu; monitor povezuje samo istu lifecycle epizodu; novi potez dobija novi budžet; sigurnosna dopuna tajmera primenjuje se samo jednom po potezu.

### G. Oba igrača odlaze u pozadinu

Očekivanje: odsutan igrač ne dobija tehničku pobedu nad drugim odsutnim igračem. Obična partija završava bez kazne i bez pobednika. Turnirski duel ostaje u kosturu za mrežno ponavljanje, bez automatskog pobednika.

### H. Trka sa konačnim ishodom

Ponoviti blizu poslednjeg poteza, isteka tajmera i dobrovoljnog izlaska u meni. Očekivanje: samo jedna od putanja (`completed_scores`, `turn_timeout`, `back_to_menu`, `disconnect_grace_expired`) postaje konačni rezultat. Ne sme postojati suprotan pobednik u turnirskom kosturu niti drugi obračun statistike.

### I. Zakašnjeli događaj stare sobe

Posle zatvaranja stare online sobe pokrenuti lokalnu ili novu online partiju i izazvati zakašnjeli status/force-cancel stare sobe. Očekivanje: aktivna igra ostaje netaknuta; `roomId` stare sobe se odbacuje; lokalna igra ne prelazi u meni niti u recovery stare sobe.

## ADB pomoćne komande

Koristiti isključivo na test uređaju:

```powershell
adb devices -l
adb shell dumpsys package com.yamb.balkan | Select-String "versionName|versionCode"
adb shell input keyevent KEYCODE_HOME
adb shell am start -W -n com.yamb.balkan/.MainActivity
adb logcat -c
adb logcat -v time Capacitor:V chromium:V Socket.IO:V *:S
```

Zaključavanje ekrana i menjanje Wi‑Fi/mobilne mreže raditi ručno da se ne promeni stanje pogrešnog uređaja.

## Kriterijum prolaza

Korak je završen tek kada:

- svi scenariji A–I prođu u svim relevantnim ulaznim putanjama;
- nijedan pravovremeni povratak ne proizvede tehnički rezultat;
- nijedan istek ne proizvede više od jednog rezultata ili nagrade/kazne;
- stari događaji ne utiču na drugu sobu ili lokalnu igru;
- turnirski obostrani prekid ostavi replay bez pobednika;
- monitor, dijagnostika i `MatchResult` pričaju istu konačnu priču;
- stanje oba test naloga odgovara tačno jednom autoritativnom rezultatu.
