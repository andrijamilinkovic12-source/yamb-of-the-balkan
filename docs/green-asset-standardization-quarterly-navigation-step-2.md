# Green Asset Standardization — Quarterly League Navigation, Korak 2

## Ishod

Formiran je kompletan canonical `quarterly-navigation` paket sa sva četiri odobrena Green navigaciona identiteta. Nije korišćen ImageGen i nijedan glyph nije redizajniran.

Paket trenutno ima status `canonical`. Aktivne veze ostaju na postojećim `ql/tab-*` putanjama do Koraka 3, kada će resolver, glavni tabovi, Hall of Fame podtabovi, champion marker i room-on-demand paket biti kontrolisano prebačeni na canonical namespace.

## Canonical katalog

| ID | Semantička uloga | Glyph | Canonical runtime |
|---|---|---|---:|
| `tab-league` | žive ligaške rang-liste | rastući stubići i zvezda | 256 × 256 |
| `tab-hall-of-fame` | Dvorana slavnih | ceremonijalna građevina i zvezda | 256 × 256 |
| `tab-medals` | arhiva medalja | gold, silver i bronze trio | 256 × 256 |
| `tab-champions` | arhiva i oznaka šampiona | kruna unutar lovora | 256 × 256 |

## Canonical master paket

Direktorijum:

`source-assets/green-soft-clay-canonical/quarterly-navigation/`

- sadrži četiri eksplicitno imenovana mastera;
- svaki master je `512 × 512` RGBA PNG;
- svi masteri su bajt-po-bajt kopije odobrenih Green source asseta;
- svaki master ima zaseban SHA-256 otisak u manifestu.

## Canonical runtime paket

Direktorijum:

`www/assets/green-soft-clay/canonical/quarterly-navigation/`

- sadrži četiri runtime PNG fajla;
- sva četiri fajla su ujednačena na `256 × 256` RGBA;
- `tab-league`, `tab-hall-of-fame` i `tab-medals` bajt-po-bajt su identični aktivnim runtime fajlovima;
- sva četiri canonical sadržaja imaju različite SHA-256 otiske.

### Optimizacija `tab-champions`

Aktivni `tab-champions` ima `384 × 384` i 126.804 bajta. Canonical verzija je iz istog odobrenog 512 px mastera izvedena na `256 × 256` i ima 63.985 bajtova.

Time je fajl smanjen za 62.819 bajtova, približno 49,5%, bez promene glyph-a, proporcija, palete, osvetljenja ili transparentnosti. Vizuelno je proverena i ostaje više nego dovoljna za postojeći prikaz od 28–30 CSS piksela.

## Reproducibilan build

`scripts/build-green-canonical-quarterly-navigation-pack.py`:

1. koristi eksplicitnu listu četiri dozvoljena ID-ja;
2. zahteva prisustvo svakog odobrenog 512 px source fajla;
3. kopira mastere bez izmene sadržaja;
4. generiše transparentne `256 × 256` runtime fajlove Lanczos resamplingom;
5. prekida build ako izvor nedostaje ili nema očekivanu geometriju.

## Source manifest

`source-assets/green-soft-clay-canonical/quarterly-navigation/manifest.json` evidentira:

- `canonical` status;
- četiri jedinstvena navigaciona ID-ja;
- semantičku ulogu, glyph i potrošače svakog ID-ja;
- master, canonical runtime i trenutno aktivnu putanju;
- aktivne i canonical dimenzije;
- sve master, canonical runtime i aktivne runtime SHA-256 otiske;
- eksplicitnu normalizaciju `tab-champions` sa 384 na 256 px;
- zajednički Green Soft Clay DNK i semantičke granice.

## Automatska kontrola

`check-theme-performance.js` sada proverava:

- `canonical` status paketa;
- tačan skup četiri ID-ja;
- postojanje svih master, canonical runtime i aktivnih runtime fajlova;
- `512 × 512` master i `256 × 256` canonical runtime dimenzije;
- evidentirane aktivne dimenzije;
- direktan alpha kanal svih fajlova;
- canonical konvenciju imena;
- sadržaj svih SHA-256 otisaka;
- bajt-po-bajt identitet prve tri canonical/aktivne izvedenice;
- precizno evidentiranu optimizaciju `tab-champions`;
- odsustvo dupliranog canonical sadržaja;
- četiri room veze i sve dinamičke tab/marker potrošače;
- semantičku izolaciju od rankova, medalja, trofeja i winner oznaka.

## Privremeni performance bilans

Dok zajedno postoje aktivne i canonical runtime kopije:

- Green tema: `177 PNG`, ukupno `17,07 MB`;
- startup paket: nepromenjen, `17 PNG` / `4,56 MB`;
- najveći aktivni Green room paket ostaje Riznica, `44 PNG` / `2,94 MB`.

Canonical kopije još nisu povezane i ne ulaze u startup niti aktivni Quarterly League room paket. Posle Koraka 3 četiri stare runtime kopije biće uklonjene, a optimizovani champions asset smanjiće konačni Green paket za dodatnih približno 61 KB u odnosu na stanje pre ove porodice.

## Van opsega Koraka 2

- menjanje `getQlAssetSource()` resolvera;
- menjanje glavnih i Hall of Fame tabova;
- menjanje champion markera;
- promena Quarterly League room-on-demand liste;
- brisanje starih `ql/tab-*` runtime kopija;
- registracija porodice kao `standardized` ili `locked`;
- promena tab akcija, podataka lige, Hall of Fame sadržaja ili UI geometrije.

Nije rađen commit niti objavljivanje.
