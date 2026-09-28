# Green Asset Standardization — Tournament Action & Match States, Korak 1

## Opseg

Sledeća porodica za standardizaciju je `Tournament Action & Match States`. Ovaj korak je inventar, vizuelna i semantička dijagnoza; nijedan runtime asset, turnirska akcija, stanje, podatak ili UI tok nije promenjen.

Porodica obuhvata šest Green identiteta koji su namerno ostali izvan zaključane Tournament Navigation porodice.

## Kandidati u porodici

| ID | Trenutni asset | Semantička uloga | Glavna silueta |
|---|---|---|---|
| `state-register` | `tournament/state-register-v1.png` | prijava igrača na Turnir | ivory ulaznica sa forest-green check oznakom |
| `state-unregister` | `tournament/state-unregister-v1.png` | povlačenje prijave | ivory ulaznica sa forest-green povratnom strelicom |
| `state-registration-locked` | `tournament/state-registration-locked-v1.png` | prijava nije dostupna | ivory ulaznica sa forest-green katancem |
| `state-start` | `tournament/state-start-v1.png` | Turnir počinje ili je u toku | ivory play trougao unutar forest-green prstena |
| `state-match-active` | `tournament/state-match-active-v1.png` | meč je dostupan za pokretanje | dve kockice povezane forest-green prstenom i terracotta akcentom |
| `state-match-complete` | `tournament/state-match-complete-v1.png` | meč ima završen rezultat | forest-green medaljon sa ivory check oznakom i terracotta prstenom |

## Prirodne podgrupe

### Registration actions

`state-register`, `state-unregister` i `state-registration-locked` dele konstrukciju glinene ulaznice. Različit centralni glyph precizno razdvaja ulazak, povlačenje i nedostupnost registracije.

### Tournament flow states

`state-start`, `state-match-active` i `state-match-complete` predstavljaju tok od početka Turnira, preko aktivnog meča, do evidentiranog rezultata. Njihove siluete su namerno slobodne, bez ticket podloge.

Obe podgrupe pripadaju istoj funkcionalnoj porodici, ali njihova interna podela treba da ostane evidentirana u budućem canonical manifestu.

## Trenutni runtime potrošači

- `state-register` i `state-unregister` koriste odgovarajuća dugmad za prijavu i odjavu u `turnir.js`.
- `state-registration-locked`, `state-start` i `state-match-complete` biraju se dinamički u zaključanom/statusnom registration panelu.
- `state-match-active` koristi dugme za pokretanje dostupnog turnirskog meča.
- `state-match-complete` koristi se i uz završen rezultat u kosturu i modalnom prikazu meča.
- `state-start` se ponavlja u odgovarajućem Tournament sadržaju Pravila.
- svih šest asseta nalazi se u Tournament room-on-demand paketu u `game.js`; nijedan nije deo startup paketa.

## Tehnički inventar

| ID | Master | Runtime | Alpha | Runtime SHA-256 |
|---|---:|---:|---|---|
| `state-register` | `1536 × 1024` | `512 × 341` | RGBA | `f7be76bf66cc4edef95b3aca4a986bd7e980b0888deb1d8df9d2e79f58d0c1c8` |
| `state-unregister` | `1254 × 1254` | `512 × 512` | RGBA | `ee4da8d5fa10eadc05dd0377c0a37ed2c3483e2f0fbe89bd18104bd1e07c368b` |
| `state-registration-locked` | `1247 × 1261` | `506 × 512` | RGBA | `edc0be1f4d234566b536bd03e27e4a5cc06edb259e176da07705a2c90e9f0378` |
| `state-start` | `1254 × 1254` | `512 × 512` | RGBA | `e66111ec5634af01f69284b6bbab52f6e32bce42a594da933f7375421787ccee` |
| `state-match-active` | `1254 × 1254` | `512 × 512` | RGBA | `4362c8946d5a127687943af72aa6d92877fcb2d92e56d8375855799d25c6906c` |
| `state-match-complete` | `1254 × 1254` | `512 × 512` | RGBA | `fff238f14e3c96c90cab3770bbcca96d7febd13ef3173324ade196bf180bef88` |

Svi masteri i runtime fajlovi imaju direktan alpha kanal. Vizuelni sadržaj je kvalitetan i pripada odobrenom Green Soft Clay DNK-u, ali runtime canvas trenutno nije ujednačen: register je pejzažni `512 × 341`, registration-locked je `506 × 512`, a ostala četiri asseta su `512 × 512`.

## Vizuelni zaključak

Nije potreban novi render. Šest postojećih glyph-ova je vizuelno dovoljno kvalitetno, jasno i međusobno različito:

- forest-green, warm-ivory i terracotta paleta je dosledna;
- površine su matirane i glinene;
- osvetljenje i dubina odgovaraju ostatku Green Room Pack-a;
- glyph-i nemaju neželjenu zasebnu kvadratnu karticu;
- ticket akcije zadržavaju prepoznatljivu zajedničku konstrukciju;
- flow states ostaju čitljivi pri stvarnim prikazima od približno 18–38 CSS piksela.

## Semantičke granice

Sledeći asseti ne pripadaju ovoj porodici:

- Info, Bracket i Hall of Fame glyph-i zaključane Tournament Navigation porodice;
- Tournament finalist nagrada;
- glavni Tournament logo, intro i winner trofeji;
- Treasury owned, active, locked i insufficient statusi;
- Daily Challenge completed i already-played stanja;
- Invite Friend sent i accepted stanja;
- Hotseat i drugi generički winner simboli;
- rewarded-video play ticket;
- canonical Undo token;
- medalje, rank bedževi, achievement trofeji i dukati.

Posebno:

- povratna strelica na `state-unregister` je akcija povlačenja turnirske prijave, a ne potrošni Undo token;
- play trougao na `state-start` označava tok Turnira, a ne gledanje rewarded-video oglasa;
- check na `state-match-complete` označava evidentiran rezultat Turnira, a ne vlasništvo predmeta, prihvaćenu pozivnicu ili pobednika partije.

## Predlog standarda

Canonical paket treba da zadrži svih šest postojećih vizuelnih identiteta i njihove high-resolution mastere, uz:

1. dve eksplicitne podgrupe: `registrationActions` i `flowStates`;
2. jedan nepromenljiv PNG identitet po ID-ju;
3. zajednički transparentni kvadratni mobilni canvas bez razvlačenja ili kropovanja odobrenih glyph-ova;
4. optimizovanu runtime rezoluciju usklađenu sa prikazima od 18–38 CSS piksela;
5. jednu canonical putanju za svaki ID kroz Tournament ekran, Pravila i room-on-demand paket;
6. zabranu zamene sa Undo, rewarded-video, Treasury status, Daily, Invite, finalist, navigation ili winner assetima.

## Sledeći korak

Korak 2 je izrada canonical `tournament-states` paketa iz postojećih odobrenih mastera, uz preciznu normalizaciju canvasa, optimizaciju mobilnih runtime izvedenica i manifest sa obe podgrupe.

Nije rađen commit niti objavljivanje.
