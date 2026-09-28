# Green Asset Standardization — Quarterly League Rank Badges, Korak 2

## Ishod

Formiran je kompletan canonical `quarterly-rank-badges` paket sa svih šest odobrenih Green identiteta. Nije korišćen ImageGen i nijedan bedž nije vizuelno menjan.

Paket trenutno ima status `canonical`. Aktivne veze ostaju na postojećim `ql/rank-*` putanjama do Koraka 3, kada će resolver, preload i room-on-demand paket biti kontrolisano prebačeni na canonical namespace.

## Canonical katalog

| ID | Semantička uloga | Glyph |
|---|---|---|
| `amater` | početni sezonski rang | štit sa mladicom |
| `profi` | drugi sezonski rang | štit sa dvostrukim činom |
| `majstor` | treći sezonski rang | romb sa krunom |
| `legenda` | četvrti sezonski rang | lovor i zvezda |
| `titan` | najviši sezonski rang | krilata kruna |
| `alltime` | rang liste Sva vremena | kruna, lovor i beskonačnost |

Prvih pet ID-jeva zadržava postojeću sezonsku bodovnu progresiju. `alltime` ostaje poseban Hall of Fame identitet i nije šesti sezonski prag.

## Canonical master paket

Direktorijum:

`source-assets/green-soft-clay-canonical/quarterly-rank-badges/`

- sadrži šest eksplicitno imenovanih mastera;
- svaki master je `512 × 512` RGBA PNG;
- svi masteri su bajt-po-bajt kopije odobrenih Green source asseta;
- svaki master ima zaseban SHA-256 otisak u manifestu.

## Canonical runtime paket

Direktorijum:

`www/assets/green-soft-clay/canonical/quarterly-rank-badges/`

- sadrži šest runtime PNG fajlova;
- svaki runtime fajl je `384 × 384` RGBA PNG;
- svaki canonical runtime fajl bajt-po-bajt je identičan odgovarajućem aktivnom `ql/rank-*` assetu;
- nema dupliranih SHA-256 sadržaja između različitih rank ID-jeva.

Canonical organizacija zato nije unela vizuelnu, alpha, dimenzionu ili kompresionu razliku.

## Reproducibilan build

`scripts/build-green-canonical-quarterly-rank-badges-pack.py`:

1. koristi eksplicitnu listu šest dozvoljenih ID-jeva;
2. zahteva prisustvo svakog odobrenog 512 px source fajla;
3. kopira mastere bez izmene sadržaja;
4. generiše transparentni `384 × 384` runtime Lanczos resamplingom;
5. prekida build ako izvor nedostaje ili nema očekivanu geometriju.

## Source manifest

`source-assets/green-soft-clay-canonical/quarterly-rank-badges/manifest.json` evidentira:

- `canonical` status;
- šest jedinstvenih rank ID-jeva;
- semantičku ulogu, bodovni raspon i glyph svakog ID-ja;
- master i runtime putanju i dimenziju;
- svih 12 SHA-256 otisaka;
- zajednički Green Soft Clay DNK i progresiju autoriteta;
- aktivne potrošače, semantičke izuzetke i buduća integraciona pravila.

## Automatska kontrola

`check-theme-performance.js` sada proverava:

- `canonical` status paketa;
- tačno šest očekivanih ID-jeva;
- postojanje svih master, canonical runtime i aktivnih runtime fajlova;
- `512 × 512` master i `384 × 384` runtime dimenzije;
- direktan alpha kanal;
- canonical konvenciju imena;
- sadržaj svih SHA-256 otisaka;
- bajt-po-bajt identitet canonical i aktivnih runtime fajlova;
- odsustvo dupliranog sadržaja;
- kompletan preload niz i oba dinamička UI potrošača;
- semantičku izolaciju od tabova, medalja, trofeja, finalist i winner simbola.

## Privremeni performance bilans

Dok zajedno postoje aktivne i canonical runtime kopije:

- Green tema: `179 PNG`, ukupno `17,70 MB`;
- startup paket: nepromenjen, `17 PNG` / `4,56 MB`;
- aktivni Treasury room paket ostaje najveći, `44 PNG` / `2,94 MB`.

Canonical kopije još nisu povezane i ne ulaze u startup niti aktivni Quarterly League room paket. Nakon Koraka 3 šest starih runtime kopija biće uklonjeno tek kada sve veze pređu na canonical namespace, čime se Green paket vraća na približno `173 PNG` / `16,87 MB`.

## Van opsega Koraka 2

- menjanje `getQlAssetSource()` ili `getRankBadgeSource()` resolvera;
- menjanje carousel i current-rank prikaza;
- promena Quarterly League room-on-demand liste;
- brisanje starih `ql/rank-*` runtime kopija;
- registracija porodice kao `standardized` ili `locked`;
- promena rangova, pragova bodova, lige, Hall of Fame podataka ili UI geometrije.

Nije rađen commit niti objavljivanje.
