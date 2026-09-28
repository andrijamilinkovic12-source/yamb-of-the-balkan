# Green Asset Standardization — Treasury Achievement trofeji, Korak 2

## Ishod

Formiran je kompletan canonical `achievement-trophies` paket sa svih 26 odobrenih Green achievement identiteta. Nije korišćen ImageGen i nijedan trofej nije vizuelno menjan.

Paket trenutno ima status `canonical`. Aktivne veze ostaju na postojećim Treasury putanjama do Koraka 3, kada će svi potrošači biti kontrolisano prebačeni na canonical namespace.

## Canonical master paket

Direktorijum:

`source-assets/green-soft-clay-canonical/achievement-trophies/`

- sadrži 26 eksplicitno imenovanih mastera;
- svaki master je `384 × 384` RGBA PNG;
- masteri su bajt-po-bajt kopije prethodno odobrenih Green source asseta;
- svaki fajl ima zaseban SHA-256 otisak u manifestu.

## Canonical runtime paket

Direktorijum:

`www/assets/green-soft-clay/canonical/achievement-trophies/`

- sadrži 26 runtime PNG fajlova;
- svaki runtime fajl je `256 × 256` RGBA PNG;
- svaki canonical runtime fajl je bajt-po-bajt identičan odgovarajućem trenutno aktivnom `treasury/trophies/` assetu;
- nema dupliranih SHA-256 sadržaja između različitih achievement ID-jeva.

Ovim je potvrđeno da canonical organizacija nije unela vizuelnu, alpha, dimenzionu ili kompresionu razliku.

## Reproducibilan build

`scripts/build-green-canonical-achievement-trophies-pack.py`:

1. koristi eksplicitnu listu svih 26 dozvoljenih ID-jeva;
2. zahteva prisustvo svakog odobrenog source fajla;
3. kopira master bez izmene sadržaja;
4. generiše transparentni `256 × 256` runtime pomoću Lanczos resamplinga;
5. prekida build ako izvor nedostaje ili nije očekivane kvadratne geometrije.

## Source manifest

`source-assets/green-soft-clay-canonical/achievement-trophies/manifest.json` evidentira:

- 26 jedinstvenih achievement ID-jeva;
- preciznu semantičku ulogu svakog ID-ja;
- master i runtime putanju;
- runtime dimenziju;
- master i runtime SHA-256 otiske;
- zajednički Green Soft Clay DNK;
- tri buduća potrošača istog identiteta: Treasury karticu, unlock popup i end-game showcase;
- sve semantičke izuzetke.

## Automatska kontrola

`check-theme-performance.js` sada proverava:

- `canonical` status paketa;
- tačno 26 kataloških stavki i 26 jedinstvenih ID-jeva;
- potpuno 1:1 poklapanje sa achievement ID-jevima iz `config.js`;
- postojanje svih 26 mastera, canonical runtime fajlova i trenutno odobrenih runtime fajlova;
- `384 × 384` master i `256 × 256` runtime dimenzije;
- direktan alpha kanal;
- format i sadržaj svih SHA-256 otisaka;
- bajt-po-bajt identitet canonical i trenutno aktivnih runtime PNG fajlova;
- odsustvo dupliranih vizuelnih sadržaja;
- semantičku izolaciju od tab, statistics, tournament, podium, collection i rank simbola.

## Privremeni performance bilans

Dok postoje i stari i canonical runtime fajlovi:

- Green tema: `199 PNG`, ukupno `18,33 MB`;
- startup paket: nepromenjen, `17 PNG` / `4,56 MB`;
- aktivni Treasury room paket: nepromenjen, `44 PNG` / `2,94 MB`.

Canonical kopije još nisu povezane i ne ulaze u startup niti aktivni room paket. Nakon Koraka 3 stare 26 runtime kopije biće uklonjene tek kada sve reference pređu na canonical namespace, čime se Green paket vraća na približno `173 PNG` / `16,87 MB`.

## Van opsega Koraka 2

- menjanje `config.js` Green putanja;
- prebacivanje kartica, popup-a ili showcase-a;
- promena Treasury room-on-demand matchera;
- brisanje starih runtime kopija;
- registracija porodice kao `standardized` ili `locked`;
- promene uslova osvajanja, nagrada ili server potvrde.

Nije rađen commit niti objavljivanje.
