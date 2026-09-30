# Green Soft Clay — Android emulator visual QA, 2026-09-29

## Okruženje i granica provere

Pregled je obavljen na postojećem `Pixel_7_Pro` emulatoru. Lokalni `npm start` služi sadržaj na `127.0.0.1:3000`; `MONGO_URI` je u tom procesu namerno prazan. `adb reverse tcp:3000 tcp:3000` povezuje WebView sa lokalnim serverom. Android Studio nije otvorio targetable prozor, pa je emulator pokrenut direktno preko instaliranog Android SDK-a. Postojeći APK nije ponovo izgrađen ili instaliran: proveravan je aktuelni web sadržaj preko lokalnog URL-a, ne novi native build.

Ovo nije test online mečeva, naloga, prodavnice, reklama ni upisa u bazu. Nije rađen deploy, commit niti objavljivanje. Lokalni server je podignut bez MongoDB veze; vizuelni prikaz može sadržati ranije sačuvane podatke emulatora.

## Vizuelni nalaz

- Splash učitava Green pozadinu i glineni naslov; zatim se prikazuje glavni meni bez `Webpage not available` greške.
- Podešavanja se otvaraju posle intra. Svih osam canonical ikonica vidi se uz odgovarajuće nazive: profil, zvuk, muzika, vibracija, prikaz/tema, jezik, uslovi i privatnost. Tekst i prekidači nisu prekriveni; glavni zupčanik je odvojen.
- Šesta strana Pravila otkrila je da inline profil i privatnost nisu bili vidljivi. Uzrok: `rulesGreenAssetSrc` je skidao query deo (`?v=opt2`) pre pretrage, dok su pojedini ključevi Green mape sadržali query.
- Resolver sada prvo proverava putanju bez query dela, pa celu normalizovanu izvornu putanju. Posle ponovnog otvaranja aplikacije, profil se vidi uz „Google integracija i cloud čuvanje“, a štit uz „Koji podaci se prikupljaju i zašto?“ i „Fer igra“.
- Peta strana Pravila sada prikazuje odgovarajuće Green inline motive za dukate, Undo i druge ekonomske pojmove. Glavna ilustracija i tekst ostaju na mestu.

`pravilaigre.js` cache-buster je povećan sa `1.18` na `1.19`. `scripts/check-theme-performance.js` izvršava resolver na primerima sa i bez query dela da se greška ne vrati. `npm test` prolazi, uključujući Green coverage i performance. Nije promenjen nijedan PNG ni zaključani canonical identitet.

## Pre narednog objavljivanja

Za pun release pregled još treba proveriti novi native build na emulatoru ili uređaju i relevantne online tokove u odgovarajućem test okruženju. Ovaj lokalni pregled potvrđuje vizuelni prikaz Green menija, Podešavanja i pregledanih strana Pravila, ne sve funkcije aplikacije.
