# Green Asset Standardization — Treasury navigacija i statusi, Korak 2

## Ishod

Formiran je kompletan canonical `treasury-controls` paket sa dve odvojene podfamilije i svih osam odobrenih Green kontrola. Nije korišćen ImageGen i nijedan glyph nije vizuelno menjan.

Paket trenutno ima status `canonical`. Aktivne veze ostaju na postojećim Treasury putanjama do Koraka 3.

## Canonical podfamilije

### `navigationTabs`

- `tab-trophies`
- `tab-skins`
- `tab-effects`
- `tab-themes`

### `itemStatuses`

- `status-owned`
- `status-active`
- `status-locked`
- `status-insufficient`

Podfamilije dele vizuelni DNK, ali ne dele semantiku. Navigation tab bira sadržaj sobe, dok item status opisuje stanje artikla ili kupovine.

## Canonical master paket

Direktorijum:

`source-assets/green-soft-clay-canonical/treasury-controls/`

- `navigation-tabs/` sadrži četiri mastera;
- `item-statuses/` sadrži četiri mastera;
- svaki master je `512 × 512` RGBA PNG;
- svi masteri su bajt-po-bajt kopije odobrenih Green source asseta;
- svaki master ima zaseban SHA-256 otisak.

## Canonical runtime paket

Direktorijum:

`www/assets/green-soft-clay/canonical/treasury-controls/`

- sadrži osam runtime PNG fajlova;
- svaki runtime fajl je `256 × 256` RGBA PNG;
- svih osam canonical runtime fajlova bajt-po-bajt je identično trenutno aktivnim `treasury/` kontrolama;
- nema dupliranih SHA-256 sadržaja.

Canonical organizacija zato ne unosi vizuelnu, alpha, dimenzionu ili kompresionu razliku.

## Reproducibilan build

`scripts/build-green-canonical-treasury-controls-pack.py`:

1. koristi eksplicitno definisane dve podfamilije;
2. zahteva prisustvo svih osam odobrenih source fajlova;
3. kopira mastere bez izmene sadržaja;
4. generiše transparentne `256 × 256` runtime PNG fajlove Lanczos resamplingom;
5. prekida build ako bilo koji izvor nedostaje ili nije očekivane kvadratne geometrije.

## Source manifest

`source-assets/green-soft-clay-canonical/treasury-controls/manifest.json` evidentira:

- `canonical` status;
- dve tačno imenovane podfamilije;
- osam jedinstvenih ID-jeva i semantičkih uloga;
- master i runtime putanju za svaki ID;
- runtime dimenziju;
- svih 16 SHA-256 otisaka;
- zajednički Green Soft Clay DNK;
- precizne semantičke izuzetke i pravila upotrebe.

## Automatska kontrola

`check-theme-performance.js` sada proverava:

- `canonical` status paketa;
- tačno `navigationTabs` i `itemStatuses` podfamilije;
- tačno osam stavki i osam jedinstvenih ID-jeva;
- postojanje svih master, canonical runtime i trenutno odobrenih runtime fajlova;
- `512 × 512` master i `256 × 256` runtime dimenzije;
- direktan alpha kanal;
- format i sadržaj svih SHA-256 otisaka;
- bajt-po-bajt identitet canonical i aktivnih runtime fajlova;
- odsustvo dupliranih sadržaja;
- semantičku izolaciju od achievement, statistics, collection, tournament, QL, daily, invite, solo i rewarded-video porodica.

## Privremeni performance bilans

Dok zajedno postoje stare i canonical runtime kopije:

- Green tema: `181 PNG`, ukupno `17,31 MB`;
- startup paket: nepromenjen, `17 PNG` / `4,56 MB`;
- aktivni Treasury room paket: nepromenjen, `44 PNG` / `2,94 MB`.

Canonical kopije još nisu povezane i ne ulaze u startup niti aktivni room paket. Nakon Koraka 3 osam starih runtime kopija biće uklonjeno tek kada sve reference pređu na canonical namespace, čime se Green paket vraća na približno `173 PNG` / `16,87 MB`.

## Van opsega Koraka 2

- menjanje tab putanja u `index.html` i `pravilaigre.js`;
- menjanje status helpera u `managers.js`;
- promena Treasury room-on-demand liste;
- brisanje starih runtime kopija;
- registracija kao `standardized` ili `locked`;
- promena tab akcija, cena, kupovine, equip logike, alert ponašanja ili Pravila.

Nije rađen commit niti objavljivanje.
