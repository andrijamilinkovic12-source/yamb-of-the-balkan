# Facebook prijava i preporuke

Dogovoreni redosled nastavka je [Plan produkcionog puštanja Facebook prijave](facebook-production-release-plan.md). Commit i deploy svih spremnih promena, kao i objava pravnih stranica, prethode izradi nove Android verzije.

## Odloženi koraci za javnu Facebook prijavu

Korisnik je odložio korak 7. Android 12.5 i javne stranice pripremaju se sa Google prijavom. Dosadašnja potvrda Facebook povezivanja odnosi se na izdvojenu QA aplikaciju.

1. Proveriti da Meta aplikacija omogućava pristup stvarnim korisnicima, produkcioni Android package `com.yamb.balkan` i Key Hash Play App Signing potpisa. QA package je `com.yamb.balkan.staging`.
2. Proveriti Facebook provajder u produkcionom Firebase projektu `yamb-of-the-balkan`, odgovarajući Meta App ID/Secret i tačan produkcioni OAuth redirect URI. QA projekat ostaje `yamb-reconnect-qa`.
3. Izgraditi i testirati produkcionu Android verziju sa uključenom Facebook podrškom i odgovarajućom konfiguracijom, pa je objaviti preko Google Play-a. `capacitor.config.js`, `android/variables.gradle` i `android/app/build.gradle` uključuju podršku putem build okruženja; osnovni config navodi samo Google. Serverski deploy ne ugrađuje novi nativni SDK/plugin u već instaliranu aplikaciju.
4. Potvrditi prvi ulazak samo preko Facebooka, povezivanje sa postojećim profilom bez promene napretka i brisanje na namenskom test nalogu. Lokalni testovi brisanja prolaze, ali stvarno brisanje Facebook test naloga nije ovim potvrđeno.
5. Kada se nastavi javna Facebook prijava, dopuniti SR/EN Politiku privatnosti, Uslove i stranicu za brisanje i proveriti njihove URL-ove u Meta konzoli. Objasniti povezivanje Google i Facebook naloga na isti Yamb profil i brisanje profila preko dostupnih načina prijave.

## Meta i Firebase QA

1. U Meta for Developers podesi Facebook Login za izdvojenu QA aplikaciju. U Android platformu upiši QA package `com.yamb.balkan.staging`, aktivnost `com.yamb.balkan.MainActivity` i Key Hash potpisa kojim se potpisuje QA APK. Za trenutno lokalno debug potpisivanje Key Hash je `99+rwEjASVWKx3kh7pB4jzbXxk0=`.
2. U projektu [yamb-reconnect-qa](https://console.firebase.google.com/project/yamb-reconnect-qa/authentication/providers) otvori **Authentication → Sign-in method → Facebook**. App ID i App Secret unesi u konzolu. Prekopiraj tačan OAuth redirect URI iz Firebase konzole u Meta Facebook Login podešavanja. Za podrazumevani domen projekta očekuje se `https://yamb-reconnect-qa.firebaseapp.com/__/auth/handler`. Google i pravilo jednog naloga po adresi već su uključeni. Domen `yamb-reconnect-qa.onrender.com` već je na listi dozvoljenih domena.
3. U Meta aplikaciju dodaj URL Politike privatnosti i javnih uputstava za brisanje naloga, kao i naloge koji će testirati prijavu. Aplikacija od Facebooka traži osnovni profil i imejl.
4. Za Android build postavi `YAMB_ANDROID_FACEBOOK_APP_ID` i `YAMB_ANDROID_FACEBOOK_CLIENT_TOKEN` u lokalnom QA okruženju. Pokreni `npm run build:reconnect-staging`. App Secret se unosi direktno u Firebase konzolu.
5. Brisanje na sajtu koristi Google prijavu. Brisanje Facebook test naloga proverava se nativno na izdvojenom QA kandidatu. Za preporuke postavi `YAMB_REFERRALS_ENABLED=true`. QA server mora imati Firebase Admin sa pravom čitanja Firebase korisnika i MongoDB sa transakcijama.

[Firebase Android prijava](https://firebase.google.com/docs/auth/android/facebook-login) · [Firebase povezivanje provajdera](https://firebase.google.com/docs/auth/android/account-linking)

## Provera na dva QA naloga

Zakačena Facebook poruka sadrži dobrovoljan poziv za praćenje, lajk i deljenje stranice, kao i odeljak za lični Yamb poziv. Od 15. 11. 2026. svaki Yamb nalog može dobiti tri nagrade za dovedene nove igrače: 3.000 dukata za prvu potvrđenu preporuku, 3.000 za drugu i 5.000 za treću, ukupno najviše 11.000. Novi igrač mora upotrebiti kod pre prve prijave i završiti prvu regularnu onlajn partiju koju server potvrdi i obradi u statistici. Redosled određuje server pri uspešnoj isplati preporuka. Svaka isplata ima privatnu potvrdu u Pošti sa rednim brojem 1/3, 2/3 ili 3/3. Četvrta i naredne preporuke ne donose dodatne dukate. Pozivna stranica prikazuje kod i omogućava kopiranje pre instalacije igre.

Preporuke su uključene kada server ima potrebnu Firebase Admin i MongoDB konfiguraciju. Vrednost `YAMB_REFERRALS_ENABLED=false` isključuje deljenje poziva i obračun nagrada. Time se u Pošti zadržava dobrovoljan Facebook poziv. Lokalna provera koristi zasebnu test bazu i test profile.

1. Na postojećem Google nalogu zabeleži UID, stanje dukata i sačuvanu partiju. Iz Podešavanja poveži Facebook. Odjavi se, prijavi se preko Facebooka i potvrdi isti UID i podatke. Kod drugog postojećeg naloga proveri i obrnuto povezivanje.
2. Proveri odustajanje, Facebook nalog već vezan za drugi UID i ponovno prijavljivanje nakon restartovanja. Na namenskom odvojenom nalogu proveri brisanje potvrđeno Facebookom u aplikaciji i na sajtu. Za uključen Analytics proveri da izbor prati isti UID pri promeni provajdera.
3. Iz zakačene poruke u Pošti podeli lični poziv. Na drugom uređaju otvori link i proveri da se kod pojavi pre prve prijave. Ako instaliraš igru preko Google Play-a, unesi kod sa pozivne stranice ručno.
4. Na tri pozvana nova naloga odigraj po jednu redovnu onlajn partiju. Kad server potvrdi rezultat i primeni statistiku, proveri redom isplate 3.000, 3.000 i 5.000 dukata i tri privatne poruke na nalogu pošiljaoca. Ukupna nagrada je 11.000. Ponovi slanje rezultata i proveri da nagrada i poruka ostanu jednokratne. Proveri i četvrtog igrača i paralelne radnike: najviše tri isplate po Yamb nalogu; prekoračene preporuke dobijaju završno stanje bez nagrade i bez beskonačnog ponavljanja provere. Ako je pošiljalac blizu plafona balansa, isplata čeka da ima mesta za pun iznos i ne troši mesto za nagradu.

Produkcija koristi zasebnu Meta i Firebase konfiguraciju. Za Android verziju sa Google Play-a registruje se Key Hash Play App Signing sertifikata. Javna obaveštenja i nagrade za preporuke uključuju se za igrače posle QA provere. Poziv za praćenje, lajkovanje i deljenje Facebook stranice u Pošti je dobrovoljan.

## Lokalna potvrda novog pravila — 15. 11. 2026.

- `scripts/test-player-referrals.cjs` prošao je na zasebnoj privremenoj lokalnoj MongoDB replica-set bazi. Potvrđeni su 3.000/3.000/5.000 i zbir 11.000 po nalogu, jedan dukatni obračun i numerisana poruka po preporuci, izostanak četvrte nagrade i završno stanje bez ponovnog pokušavanja. Dve nezavisne instance servisa istovremeno obrađuju šest novih igrača za istog pošiljaoca: tačno tri isplate, bez prekoračenja limita. Provereni su Google/Facebook novi nalozi, odbijanje tehničkih i nepotvrđenih rezultata, povratak neuspele transakcije i odlaganje celog iznosa kada nema prostora u balansu.
- `scripts/test-player-referrals-client.cjs`, `scripts/test-player-mailbox.cjs` i `scripts/test-player-mailbox-history.cjs` prolaze. Veza preko koda i identiteta, deljenje, potvrda prijema, privatnost i trajna istorija ostaju funkcionalni.
- `scripts/test-player-mailbox-layout.cjs` prolazi u lokalnom Edge prikazu. Proverene su poruke 1/3, 2/3, 3/3 i stvarni iznosi na srpskom/engleskom, kao i novi tekst ponude u svih deset tema na malom ekranu. Sintaksa izmenjenih JS fajlova je proverena.
- Ova provera koristi lokalnu bazu i namenske test podatke. [Popis i priprema izdanja](facebook-production-step-1.md) beleže kandidata 12.5 / 115.

## Automatska obaveštenja o Android izdanjima

Podešavanje se radi na produkcionom Render servisu u koraku 11 plana, pre dovršetka puštanja nove verzije. Provera je podrazumevano isključena. QA nastavlja sa lokalnim testovima i simuliranim odgovorima.

1. Za `com.yamb.balkan` pripremiti namenski Google Play servisni nalog odvojen od naloga kojima se uređuje i objavljuje izdanje. Početi sa dozvolom za uvid u tu aplikaciju. Potvrditi da nalog može da pročita produkcionu listu izdanja i status produkcionog kanala u sopstvenoj privremenoj izmeni. Posle provere odbaciti privremenu izmenu. Posmatrač nikada ne potvrđuje izmene u Play-u. [Dozvole u Play Console-u](https://support.google.com/googleplay/android-developer/answer/9844686?hl=en-GB) · [Rad sa privremenim izmenama](https://developers.google.com/android-publisher/edits)
2. Na Renderu postaviti `YAMB_PLAY_UPDATE_READER_BASE64` na base64-enkodiran JSON tog servisnog naloga kao poverljivu vrednost. U `YAMB_PLAY_UPDATE_BASELINE_VERSION_CODE` upisati broj poslednje potpuno objavljene produkcione verzije koja prethodi izdanju za koje treba poslati prvu poruku. Posle provere podešavanja uključiti `YAMB_PLAY_UPDATE_NOTICES_ENABLED=true`.
3. U Play Console-u za naziv izdanja koristiti broj verzije koji treba prikazati igračima, na primer `12.5`. Ako Play vrati prilagođeni naziv, Pošta prikazuje `versionCode`. Proveriti delimično puštanje, pa posle potpunog puštanja očekivati jednu poruku u narednoj redovnoj proveri, koja se pokreće na 15 minuta. Proveriti oba jezika, broj verzije, Google Play dugme i stanje čitanja po nalogu posle sledeće provere i restarta.
