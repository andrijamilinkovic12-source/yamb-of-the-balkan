# Green Asset Standardization — Solo Results, Korak 2

## Ishod

Formiran je kompletan canonical `solo-results` paket sa tri postojeća odobrena Green identiteta. Nije korišćen ImageGen i nijedan glyph nije redizajniran.

Paket trenutno ima status `canonical`. Aktivne veze ostaju na postojećim `solo/*.png` putanjama do Koraka 3, kada će personal-best badge, score prikaz, claim dugme i Solo room-on-demand paket biti kontrolisano prebačeni na canonical namespace.

## Canonical katalog

| ID | Semantička uloga | Glyph | Canonical runtime |
|---|---|---|---:|
| `personal-best` | novi Solo lični rekord | tri rastuća forest-green stuba, ivory baza i check medaljon | `256 × 256` |
| `finish-score-mark` | oznaka konačnog Solo rezultata | forest-green prsten sa ivory četvorokrakom iskrom | `256 × 256` |
| `finish-claim` | preuzimanje nagrade i izlazak | ivory strelica nadole ulazi u forest-green prijemnik | `256 × 256` |

Tri identiteta zadržavaju različite uloge: status, score mark i akciju.

## Canonical master paket

Direktorijum:

`source-assets/green-soft-clay-canonical/solo-results/`

- sadrži tri eksplicitno imenovana mastera;
- sva tri mastera imaju `512 × 512` RGBA;
- masteri su bajt-po-bajt kopije odobrenih Green source asseta;
- svaki master ima zaseban SHA-256 otisak u manifestu.

## Canonical runtime paket

Direktorijum:

`www/assets/green-soft-clay/canonical/solo-results/`

| Runtime | Veličina | SHA-256 |
|---|---:|---|
| `personal-best-v1.png` | `36.303` B | `573a9df91281784f5b8739e7ae55ec137093e37fdea8e8fbdc0beecb7273b76d` |
| `finish-score-mark-v1.png` | `49.334` B | `722f391eb7d85e41b537212d81d680f1f2fc152dbe42fe5e45bba2f8960d33ce` |
| `finish-claim-v1.png` | `39.844` B | `f7102115b111f605f9bf38d25ff7a0d5aedd9bb812814fee79e1771eeb5ef09e` |

Svaki runtime:

- koristi transparentni `256 × 256` RGBA canvas;
- izveden je direktno iz odgovarajućeg `512 × 512` mastera LANCZOS redukcijom;
- zadržava punu kvadratnu kompoziciju bez kropovanja i rastezanja;
- ostaje višestruko veći od stvarnog prikaza od `29–42` CSS piksela.

Vizuelna kontrola potvrđuje da stubovi i check, prsten i iskra, odnosno strelica i prijemnik ostaju čisti, čitljivi i semantički različiti.

## Reproducibilan build

`scripts/build-green-canonical-solo-results-pack.py`:

1. zahteva sva tri odobrena `512 × 512` source asseta;
2. zahteva sva tri postojeća `384 × 384` aktivna runtime asseta;
3. proverava RGBA format i očekivane dimenzije svih ulaza;
4. kopira source fajlove bajt-po-bajt kao canonical mastere;
5. izvodi tri `256 × 256` runtime PNG-a LANCZOS redukcijom;
6. prekida build ako format, dimenzije ili kvadratna kompozicija odstupaju;
7. ispisuje master, aktivne i canonical dimenzije sa veličinom svakog rezultata.

## Source manifest

`source-assets/green-soft-clay-canonical/solo-results/manifest.json` evidentira:

- `canonical` status;
- tačna tri ID-ja i njihov redosled;
- semantičku ulogu, glyph i potrošače svakog identiteta;
- UI prikaze `30 × 30`, `42 × 42` i `29 × 29`;
- master, canonical runtime i trenutno aktivne legacy putanje;
- sve dimenzije, SHA-256 otiske i pravila normalizacije;
- plan integracije za personal-best, score, claim i room-on-demand tok;
- granice prema Rewarded Video, glavnoj Solo ikoni i drugim result/state porodicama.

## Automatska kontrola

`check-theme-performance.js` sada proverava:

- `canonical` status paketa i odsustvo prevremene registry registracije;
- tačan skup i redosled tri ID-ja;
- zaključani materijal, paletu, mapiranje i tri semantičke siluete;
- jedinstvenost master i runtime sadržaja;
- postojanje sva tri mastera, canonical runtimea i aktivna runtimea;
- sve dimenzije, direktan alpha kanal i SHA-256 otiske;
- canonical konvenciju imena i precizno LANCZOS pravilo;
- po jednu UI i jednu Solo preload legacy vezu za svaki ID pre integracije;
- semantičku izolaciju i kompletan plan povezivanja za Korak 3;
- da `finish-reward-video-v3.png` ostaje u zaključanoj Rewarded Video porodici.

## Privremeni performance bilans

Dok zajedno postoje aktivne i canonical kopije:

- Green tema: `175 PNG`, ukupno `16,06 MB`;
- startup paket: nepromenjen, `17 PNG`, `4,56 MB` kompresovano / `20,44 MB` procenjeno dekodirano;
- najveći Green room paket ostaje Riznica, `44 PNG`, `2,94 MB` kompresovano / `13,70 MB` procenjeno dekodirano;
- tri aktivna `384 × 384` runtime fajla zajedno imaju `261.470` bajtova;
- tri canonical `256 × 256` runtime fajla zajedno imaju `125.481` bajt.

Nakon Koraka 3 i uklanjanja tri stare runtime kopije očekivana ušteda je `135.989` bajtova kompresovano i približno `0,94 MB` dekodirane memorije. Broj Green PNG fajlova vratiće se sa privremenih `175` na `172`.

## Van opsega Koraka 2

- menjanje personal-best, score i claim potrošača;
- menjanje Solo room-on-demand putanja;
- menjanje high-score uslova ili `claimReward(false)` toka;
- menjanje prikaza `30 × 30`, `42 × 42` i `29 × 29`;
- menjanje reveal motiona, delay redosleda ili reduced-motion ponašanja;
- menjanje već zaključane Rewarded Video kompozicije;
- menjanje glavne Solo menu/intro ikone ili CSS tier elemenata;
- brisanje tri postojeće runtime kopije;
- dodavanje porodice u centralni registry;
- registracija porodice kao `standardized` ili `locked`.

## Sledeći korak

Korak 3 je povezivanje personal-best, score i claim potrošača na canonical putanje, povezivanje Solo room paketa, registracija porodice kao `standardized` i uklanjanje tri stare runtime kopije nakon potvrde da nema aktivnih legacy referenci.

Nije rađen commit niti objavljivanje.
