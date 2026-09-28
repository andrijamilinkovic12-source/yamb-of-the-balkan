# Green Asset Standardization — Tournament Awards, Korak 2

## Ishod

Formiran je kompletan canonical `tournament-awards` paket sa odobrenim Green champion i finalist identitetom. Nije korišćen ImageGen i nijedan glyph nije redizajniran.

Paket trenutno ima status `canonical`. Aktivne veze ostaju na postojećim `tournament-free-v2`, `runtime/menu/tournament-free-v2` i `tournament/finalist-silver-v1` putanjama do Koraka 3, kada će meni, intro, Tournament ekran, Pravila, rezultati, ceremony i room-on-demand paket biti kontrolisano prebačeni na canonical namespace.

## Canonical katalog

| ID | Semantička uloga | Glyph | Canonical runtime |
|---|---|---|---:|
| `champion-trophy` | zvanični identitet Turnira i počast šampionu | forest-green dvokraki pehar sa ivory ručkama i zvezdom | 384 × 384 |
| `finalist-silver` | počast finalisti / drugoplasiranom | silver medaljon sa ivory zvezdom, zelenim trakama i terracotta kopčom | 256 × 256 |

## Canonical master paket

Direktorijum:

`source-assets/green-soft-clay-canonical/tournament-awards/`

- sadrži dva eksplicitno imenovana mastera;
- oba mastera imaju `1254 × 1254` RGBA;
- oba su bajt-po-bajt kopije odobrenih Green high-resolution source asseta;
- svaki master ima zaseban SHA-256 otisak u manifestu.

## Canonical runtime paket

Direktorijum:

`www/assets/green-soft-clay/canonical/tournament-awards/`

### `champion-trophy-v1.png`

- koristi `384 × 384` transparentni canvas;
- bajt-po-bajt je identičan postojećoj odobrenoj startup izvedenici;
- dovoljno je velik za Tournament intro prikaz do približno 290 CSS piksela;
- u Koraku 3 ista putanja će služiti i startup-u i sobi, čime nestaje duplirana `512 × 512` room kopija.

### `finalist-silver-v1.png`

- koristi `256 × 256` transparentni canvas;
- izveden je direktno iz odobrenog `1254 × 1254` mastera LANCZOS redukcijom;
- zadržava punu kvadratnu kompoziciju bez kropovanja i rastezanja;
- višestruko je veći od najvećeg stvarnog prikaza od približno 92 CSS piksela.

Oba canonical sadržaja imaju različite SHA-256 otiske i direktan alpha kanal.

## Reproducibilan build

`scripts/build-green-canonical-tournament-awards-pack.py`:

1. zahteva champion master, postojeći room runtime i odobrenu startup izvedenicu;
2. zahteva finalist master i postojeći runtime;
3. kopira oba mastera bez izmene sadržaja;
4. kopira odobreni champion startup PNG bajt-po-bajt u canonical paket;
5. izvodi finalist runtime direktno iz high-resolution mastera;
6. prekida build ako neka očekivana dimenzija nije tačna;
7. ispisuje master, aktivne i canonical dimenzije sa veličinom rezultata.

## Source manifest

`source-assets/green-soft-clay-canonical/tournament-awards/manifest.json` evidentira:

- `canonical` status;
- tačna dva ID-ja i njihov redosled;
- semantičku ulogu, glyph i potrošače svakog identiteta;
- master, canonical runtime i trenutno aktivne putanje;
- posebnu champion startup putanju;
- master, aktivne i canonical dimenzije;
- sve SHA-256 otiske i pravila normalizacije;
- dozvoljenu dvostruku ulogu champion pehara;
- semantičke granice prema ostalim nagradama i statusima.

## Automatska kontrola

`check-theme-performance.js` sada proverava:

- `canonical` status paketa;
- tačan skup i redosled dva ID-ja;
- postojanje master, canonical i aktivnih runtime fajlova;
- postojanje champion startup izvedenice;
- sve dimenzije, alpha kanale i SHA-256 otiske;
- canonical konvenciju imena;
- bajt-po-bajt identitet canonical i startup champion PNG-a;
- `384 × 384` champion i `256 × 256` finalist optimizaciju;
- svih dvanaest champion room veza, jednu main-menu vezu i četiri finalist veze pre integracije;
- semantičku izolaciju od podium, collection, achievement, navigation, state, rank i generic-winner porodica;
- kompletan plan integracije za Korak 3.

## Privremeni performance bilans

Dok zajedno postoje aktivne i canonical kopije:

- Green tema: `175 PNG`, ukupno `16,31 MB`;
- startup paket: nepromenjen, `17 PNG`, `4,56 MB` kompresovano / `20,44 MB` dekodirano;
- najveći aktivni Green room paket ostaje Riznica, `44 PNG`, `2,94 MB` kompresovano / `13,70 MB` dekodirano;
- dva canonical fajla zajedno imaju `139.705` bajtova;
- tri postojeće champion/finalist kopije zajedno imaju `340.277` bajtova.

Nakon Koraka 3 i uklanjanja dve stare champion kopije i stare finalist kopije očekivana ušteda je `200.572` bajta kompresovano i približno `1,31 MB` dekodirane memorije. Broj Green PNG fajlova smanjiće se sa početnih `173` na `172`, jer jedan canonical champion fajl zamenjuje i startup i room kopiju.

## Van opsega Koraka 2

- menjanje main-menu, intro i Tournament putanja;
- menjanje champion reference u Pravilima;
- promena winner/finalist rezultata ili ceremony logike;
- promena Tournament room-on-demand liste;
- promena startup konfiguracije;
- brisanje tri postojeće runtime kopije;
- dodavanje porodice u centralni registry;
- registracija porodice kao `standardized` ili `locked`;
- promena podataka, nagrada, motion ponašanja ili UI geometrije.

## Sledeći korak

Korak 3 je povezivanje svih potrošača na canonical putanje, eksplicitno uključivanje canonical champion asseta u Green startup paket, registracija porodice kao `standardized` i uklanjanje tri stare runtime kopije nakon provere da nema aktivnih legacy referenci.

Nije rađen commit niti objavljivanje.
