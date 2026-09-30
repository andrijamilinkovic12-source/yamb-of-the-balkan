# Green Asset Standardization — Leaderboard Controls, Korak 2

## Ishod

Formiran je reproducibilan canonical `leaderboard-controls` paket za `global`, `local` i `empty-loading`. Korišćeni su odobreni Green izvori iz Koraka 1. Sva tri canonical runtime PNG-a imaju iste bajtove, SHA-256 otiske i piksele kao njihove aktivne kopije.

Source manifest ima status `canonical`. UI, online waiting i room-on-demand katalog i dalje koriste postojeće `leaderboard/*.png` putanje; integracija pripada Koraku 3. Green cache verzija ostaje `60`.

## Katalog i potrošači

| ID | Uloga | Stvarni prikazi | Canonical isporuka |
|---|---|---:|---:|
| `global` | globalna navigacija i naslov panela | `21×21`, `25×25` | `256×256` |
| `local` | lokalna navigacija i naslov panela | `21×21`, `25×25` | `256×256` |
| `empty-loading` | prazno/učitavanje u Top listi i deljeni online waiting status | `86×86`, `68×68`, `58×58` | `384×384` |

Manifest čuva tačno tri, tri i četiri postojeće kodne reference po tim redom. Posebno je evidentirao dva online waiting prikaza za `empty-loading`, da se ne izgube pri prebacivanju putanja.

## Master i runtime paket

Tri `1254×1254` RGBA mastera su bajt-po-bajt kopije odobrenih izvora i nalaze se u `source-assets/green-soft-clay-canonical/leaderboard-controls/`. Source manifest na istoj lokaciji čuva dimenzije, broj bajtova, SHA-256, uloge, potrošače i semantičke granice.

Canonical runtime nalazi se u `www/assets/green-soft-clay/canonical/leaderboard-controls/`:

| PNG | Bajtova | SHA-256 |
|---|---:|---|
| `global-v1.png` | `47.269` | `3a9aa67230a1d53d6e1e05dac1b8f8ca4a738f92cb3cf07d495bde165ac2519a` |
| `local-v1.png` | `38.952` | `44e60c1c9a9166f77294a9d3197bdb4cfd41c64d283753288635498de39d5630` |
| `empty-loading-v1.png` | `68.504` | `7b0c89808cd5185fb53e16a52320f1e575fbeeb691efad255971f5ca9aee67ba` |

`scripts/build-green-canonical-leaderboard-controls-pack.py` proverava tačne source i aktivne runtime otiske, RGBA režim, puni alpha opseg i transparentne uglove. Izvor direktno smanjuje LANCZOS metodom na punom kvadratnom canvasu, a rezultat proverava bajt po bajt i piksel po piksel prema aktivnom runtimeu. Ponovljeni build mora dati iste fiksne otiske.

## Zaštita postojećeg prikaza

`check-theme-performance.js` proverava `canonical` status i odsustvo prevremene centralne registracije, tri identiteta i redosled, master/source i canonical/active parove, sve dimenzije i otiske, tri/tri/četiri aktivne reference i nula canonical kodnih referenci. Očuvani su tab `21 px`, naslov `25 px`, empty `86 px`, loading `68 px`, waiting `58 px`, dve float animacije od `2,4 s` i reduced-motion zaštita.

Glavni Leaderboard Room znak, General Podium medalje i Online Random room identitet ostaju zaključane, odvojene porodice. Rangiranje, filteri, podaci i online connection tok nisu menjani.

## Privremeni performance bilans

Dok postoje aktivne i canonical kopije:

- Green runtime ima `165 PNG / 14.947.719 B` (`14,26 MiB`);
- tri canonical staging kopije dodaju `154.725 B`;
- `check-green-asset-coverage.js` vodi ih u zasebnoj `stagedCanonical` kategoriji;
- startup ostaje `17 PNG / 4,56 MiB` kompresovano / `20,44 MiB` procenjeno dekodirano;
- aktivni Leaderboard room paket ostaje `7 PNG / 449.668 B / 2.949.120 decoded B`.

Korak 3 će ukloniti tri stare, bajt-po-bajt identične runtime kopije pošto sve reference pređu na canonical putanje. Broj Green PNG-ova se tada vraća na `162`, a ukupna veličina na `14.792.994 B`. Paket namerno čuva odobrene piksele, pa se ne očekuje dodatna kompresovana ušteda.

## Sledeći korak

Korak 3 povezuje Global/Local tabove i naslove, Top listu, oba online waiting stanja i room-on-demand katalog na canonical putanje, registruje porodicu i uklanja tri stare kopije nakon provere referenci. Korak 4 je završni vizuelni, semantički i tehnički audit.

Nije rađen commit, objavljivanje niti pregled u Android emulatoru.
