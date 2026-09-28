# Green Asset Standardization — Treasury navigacija i statusi, Korak 3

## Ishod

Canonical `treasury-controls` paket povezan je sa kompletnim Green runtime tokom. Porodica je registrovana kao `standardized`; završno zaključavanje sledi u Koraku 4.

Vizuelni sadržaj, tab akcije, aktivni tab, shop cene, kupovina, equip logika, uslovi otključavanja, alert ponašanje i tekst Pravila nisu promenjeni.

## Povezana podfamilija `navigationTabs`

Četiri canonical glyph-a sada koriste:

- Treasury tab dugmad u `index.html`;
- srpski i engleski Treasury sadržaj u `pravilaigre.js`;
- Treasury room-on-demand paket u `game.js`.

Postojeće `trophy`, `skin`, `effect` i `theme` akcije u `riznica.js` ostale su iste.

## Povezana podfamilija `itemStatuses`

- `getEasterTreasuryStatusIcon()` koristi canonical template za `owned`, `active` i `locked`;
- `getTreasuryLockIcon()` koristi isti canonical `status-locked` u skrivenom opisu;
- `getTreasuryInsufficientIconPath()` vraća canonical `status-insufficient` za Green temu;
- `game.js` priprema sva četiri statusa u Treasury room-on-demand paketu.

`owned` ostaje odvojeno od `active`, a `locked` od `insufficient`.

## Centralni registar

Porodica `treasuryControls` dodata je u `www/themes/green/asset-registry.json` sa:

- statusom `standardized`;
- podfamilijama `navigationTabs` i `itemStatuses`;
- osam jedinstvenih canonical runtime uloga;
- zaključanim `256 × 256` dimenzijama i SHA-256 otiscima;
- osam zabranjenih starih runtime putanja;
- mapiranjem svakog istorijskog source asseta na canonical zamenu;
- eksplicitnim kodskim potrošačima i semantičkim izuzecima.

## Uklonjene runtime kopije

Iz `www/assets/green-soft-clay/treasury/` uklonjeni su:

- `tab-trophies-v1.png`
- `tab-skins-v1.png`
- `tab-effects-v1.png`
- `tab-themes-v1.png`
- `status-owned-v1.png`
- `status-active-v1.png`
- `status-locked-v1.png`
- `status-insufficient-v1.png`

Brisanje je izvršeno tek nakon provere da su stare putanje ostale samo u centralnom registru kao zabranjene reference. Svih osam source fajlova u `source-assets/green-soft-clay-hires/treasury/` ostalo je sačuvano.

## Semantička izolacija

Nisu menjani niti spojeni sa Treasury Controls porodicom:

- pojedinačni achievement trofeji;
- Statistics zbirni trophies glyph;
- Treasury Collection medalje;
- Tournament tabovi i registraciona/match stanja;
- Tournament nagrade i pehari;
- QL tabovi, medalje i rank bedževi;
- Daily completed/already-played stanja;
- Invite accepted stanje;
- Solo claim akcija;
- Rewarded Video active/unavailable ticketi;
- CSS aktivno stanje samog taba;
- dukati, tokeni i winner simboli.

## Automatska kontrola

`check-theme-performance.js` sada proverava:

- `standardized` status centralnog registra i source manifesta;
- tačno dve podfamilije, osam kontrola i osam jedinstvenih uloga;
- identičan canonical katalog u manifestu i registru;
- master/runtime dimenzije, alpha kanal i SHA-256 integritet;
- tačno po jednu room-on-demand vezu za svaki asset;
- tačno po jednu Green UI i Rules vezu za svaki navigation tab;
- jednu canonical status template vezu, zasebnu lock vezu i zasebnu insufficient vezu;
- očekivanu upotrebu `owned`, `active` i `locked` statusa u shop logici;
- odsustvo starih runtime fajlova i aktivnih referenci;
- očuvanje semantičkih izuzetaka i Treasury preload izolacije.

## Performanse nakon migracije

- Green tema: `173 PNG`, ukupno `16,87 MB`.
- Startup paket: `17 PNG`, `4,56 MB` kompresovano / `20,44 MB` procenjeno dekodirano.
- Najveći Green room paket: Riznica, `44 PNG`, `2,94 MB` kompresovano / `13,70 MB` procenjeno dekodirano.

Privremenih osam duplih runtime fajlova više ne postoji. Treasury Controls ne ulaze u startup i učitavaju se samo uz Treasury room paket.

## Sledeći korak

Korak 4 radi završnu vizuelnu, semantičku i tehničku kontrolu, pooštrava regresione uslove i menja status porodice iz `standardized` u `locked`.

Nije rađen commit niti objavljivanje.
