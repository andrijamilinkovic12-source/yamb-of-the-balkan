# Pozadina aplikacije — analiza i ispravka, 4. septembar 2026.

## Potvrđeno read-only proverom baze

Sva vremena su Europe/Belgrade. Kratki ID je poslednjih osam znakova matchId.

| Meč | Pokretanje | Početak | Ishod |
| --- | --- | --- | --- |
| 874cc1ea | Direktni prihvaćeni izazov (`challenge`) | 04.09. 10:58:35 | Pozadina 11:27:26; tehnički rezultat 11:27:56, posle 30 s |
| 182b0f85 | Direktni prihvaćeni izazov (`challenge`) | 04.09. 09:42:07 | Regularno završen 10:16:57, iako postoje dva `pending` zapisa |
| fab56f97 | Soba poziva prijatelju (`friend_invite`) | 04.09. 09:25:18 | Ping timeout oporavljen za 3072 ms; regularan završetak 10:17:55 |
| 2b4f8974 | Soba poziva prijatelju (`friend_invite`) | 03.09. 19:14:43 | Pozadina 19:34:05; tehnički rezultat 19:34:35, posle 30 s |

Stara dijagnostika ne razlikuje zaključavanje telefona, stvarno minimizovanje, odlazak na drugu stranicu ili pojedinačan lifecycle signal. Za friend_invite nije zabeleženo da li je ulazak bio preko linka ili drugog ulaza u istu sobu. `4g` je prijavljeni tip mreže, ne dokaz mrežnog kvara.

## Greške i zaštite

- Povratak preko `online_app_resumed` na istom socketu poništavao je grejs, ali nije zatvarao dijagnostički zapis. Sada svi putevi koji brišu grejs igrača beleže oporavak; završetak/čišćenje sobe zatvara preostale zapise bez prepisivanja već zabeleženog tehničkog ili obostranog ishoda.
- Jednokratni resume signal nije imao nezavisnu rezervnu proveru. Novi foreground watchdog radi na 2 s, nezavisno od tajmera poteza koji se zaustavlja u grejsu. Proverava vidljivost dokumenta i Capacitor App.getState; provereni foreground heartbeat može oporaviti background grejs na istom socketu. Legacy heartbeat bez foreground oznake to ne može.
- Zaštićeni su zakašnjeli native odgovori, reconnect callback posle novog pause događaja, poruke druge sobe i timeout prethodne grejs sesije.
- Nova dijagnostika beleži konkretan lifecycle izvor, vreme početka meča, starost meča i broj poteza. Background ima zasebnu reasonClass, umesto klasifikacije kao nepoznata socket greška. Monitor API izlaže nova polja; zaseban dashboard može zahtevati dopunu prikaza oznaka.
- Trajanje grejsa ostaje 30 s za obične online režime i 5 min za turnire. Ne poništavati grejs samo zato što je socket povezan: povezana aplikacija može stvarno biti u pozadini.

## Verifikacija i ograničenja

`node scripts/check-online-reconnect.js` prolazi, sa izvršavanjem stvarnih serverskih handlera u izolovanom test okruženju za challenge, friend_invite, random i turnir. Pokriveni su same-socket oporavak, dupli pause, native neaktivnost, zastarele poruke/tajmeri, lokalna igra i gledaoci, dijagnostika i obostrani prekid.

Prolaze i check-js, check-game-rules, check-trophies, check-match-results, check-quarterly-league i check-h2h-ledger-rebuild. check-profile-sync pada na postojećoj nepovezanoj izmeni turnirskih šampiona: test zahteva `buildTourneyStatsPayload(20)`, a radna kopija već poziva funkciju bez limita. Ta izmena nije deo ove ispravke.

Nije izvršen deploy niti Android build. Baza i istorijski rezultati nisu menjani. Istorijske `pending` zapise ne treba proglasiti oporavljenim uz izmišljeno trajanje; stara telemetrija nema sve potrebne podatke.

Pre produkcione objave proveriti na dva uređaja u svakom online režimu: kratko minimizovanje i povratak na istoj vezi; zaključavanje i povratak pre isteka grejsa; stvarni izostanak preko roka; prebacivanje Wi-Fi/4G; ponovljeni brzi pause/resume; povratak oba igrača. Proveriti nastavak rezultata i tajmera, završni status dijagnostike i odsustvo tehničkog rezultata pri pravovremenom povratku. Testovi koda ne zamenjuju ovu proveru na uređajima.
