# Green Asset Standardization — Korak 5

## Ishod

Standardizacija Green dukata je završno proverena i zaključana. Aplikacija sada ima jedan mašinski čitljiv izvor istine za identitet dukata, dozvoljene runtime izvedenice, složene kompozicije, semantičke izuzetke i zabranjene stare putanje:

- `www/themes/green/asset-registry.json`

Kanonski identitet ostaje: terracotta glineno lice i telo, zaobljeni ivory glineni obod i tačno pet tamnozelenih zaobljenih kvadratnih tačaka u rasporedu četiri ugla plus centar.

## Zaključana pravila

- Svaki Green prikaz valute koristi kanonski dukat ili izvedenicu evidentiranu u registru.
- Undo tokeni i strelice, medalje, rank bedževi, trofeji, video simboli, reljefi kovčega i tačke na kockicama nisu dukati.
- Stari asseti iz liste `forbiddenRuntimePaths` ne smeju postojati u `www` niti biti povezani iz runtime koda.
- Svaki registrovani asset mora postojati, imati propisanu kvadratnu rezoluciju, direktan alpha kanal i stvarnu runtime vezu.
- Izvorni high-resolution masteri ostaju u `source-assets`; uklanjaju se samo zastarele kopije iz aplikacionog paketa.

## Završno čišćenje

Uklonjen je neaktivni `www/assets/green-soft-clay/economy/ducat-v1.png` (113.786 bajtova). Njegov izvorni master je sačuvan, a odobrena runtime zamena je `www/assets/green-soft-clay/canonical/ducat/ducat-front-v1.png`.

Posle čišćenja Green paket ima 171 PNG i 17,08 MB. Startup ostaje na 17 PNG i 4,56 MB; dakle zaključavanje standarda nije povećalo početno učitavanje.

## Automatska kontrola

`scripts/check-theme-performance.js` direktno čita centralni registar i proverava:

1. da je porodica dukata označena kao `locked`;
2. da postoje sve kanonske i složene runtime izvedenice;
3. njihove dimenzije, transparentnost i runtime veze;
4. odsustvo svih zabranjenih starih putanja i fajlova;
5. mapu zamena za istorijske high-resolution mastere;
6. Green Gold Rain, Royal Yamb, poruke i pregled Riznice;
7. granice startup, room-on-demand i ukupnog tematskog paketa.

Time buduća promena koja slučajno vrati alternativni dukat ili ukloni odobrenu izvedenicu prekida test pre objavljivanja.
