# Green Asset Standardization — Global Chat Room Identity, Korak 2

## Ishod

Formiran je kanonski `global-chat-room-identity` paket iz odobrenog razgovornog simbola. Izvorni manifest ima status `canonical`. Paket još nije povezan sa UI-jem niti centralnim registrom; aktivne putanje, cache verzija, CSS veličine, motion, ponašanje chata i preload tok nisu promenjeni.

Nije generisana nova ilustracija. Jedan slobodni razgovorni znak zadržava warm-ivory oblačić, tri forest-green tačke, veću forest-green razgovornu siluetu iza i terracotta kružni akcenat. Zeleni deo je oblačić sa repom, ne kvadratna podloga. Terracotta akcenat ostaje statički deo dizajna, ne živi statusni indikator.

## Jedan master, dve isporuke

| Uloga | Putanja | Dimenzija | Bajtova | SHA-256 |
|---|---|---:|---:|---|
| Master | `source-assets/green-soft-clay-canonical/global-chat-room-identity/green-global-chat-room-master-v1.png` | `1254×1254` | `1.092.962` | `e4b6c9fa9474614af58846a5df24cf196297b22f0673ead64a478c2b5b4bebbf` |
| Room | `www/assets/green-soft-clay/canonical/global-chat-room-identity/global-chat-room-v1.png` | `512×512` | `178.822` | `ea96cb6a2f1a83768074adb6d2d9be44cbf4e9a21819619dbc18bfe7a1237e7e` |
| Menu | `www/assets/green-soft-clay/canonical/global-chat-room-identity/global-chat-room-menu-v1.png` | `384×384` | `108.756` | `57e55c8e9fef67d9576e112cc78bbcc3ba5f1ac006e1d5bd5405e8260517d070` |

Master je bajt-po-bajt kopija odobrenog `source-assets/green-soft-clay-hires/global-chat-free-v2.png`. Room nastaje LANCZOS smanjenjem `1254→512`, menu dvostepenim `1254→512→384`. Direktno `1254→384` ne reprodukuje odobrenu menu isporuku.

Obe kanonske runtime datoteke su pixel-identične i bajt-po-bajt identične postojećim aktivnim datotekama. Sva tri kanonska PNG-a su RGBA sa transparentnim uglom i punim alpha opsegom. Runtime izvedenice zajedno imaju `287.578 B` i `1.638.400 decoded B`.

## Reproducibilni build i manifest

`scripts/build-green-canonical-global-chat-room-identity-pack.py` pre zapisivanja proverava fiksne SHA-256 otiske odobrenog izvora i dve aktivne isporuke, RGBA format, dimenzije, alpha opseg i pixel-identičnost izvedenica. Posle zapisivanja ponovo proverava kanonske dimenzije, alpha kvalitet i fiksne otiske. Build je uspešno ponovljen; u ovom koraku namerno još proverava postojeće aktivne runtime fajlove. Ta zavisnost se uklanja tokom Koraka 3 pre njihovog uklanjanja.

Manifest čuva jedan identitet, dve delivery uloge, sadašnje i buduće putanje, potrošače, veličine, motion ugovor i odbačeni uramljeni kandidat. Posebno čuva SHA-256 otiske zasebnih empty/loading, send i Rules Communication page asseta, koji ne postaju izvedenice glavnog znaka sobe.

Global chat nije dobio novu loading-gate ulogu: Green gate i dalje prikazuje svojih šest prethodnih slika. Glavna chat ikona pripada sobnom `pack.assets` sadržaju, ne tom gate nizu.

## Automatske zaštite i nepromenjeni potrošači

`check-theme-performance.js` proverava `canonical` status bez prevremene registracije, master i runtime otiske, tačno četiri aktivne room i jednu menu referencu, nula kanonskih UI referenci, sačuvan framed orphan i cache verziju `52`. Štiti i zasebne history/send/page motive, glavne UI veze, SR/EN reference u Pravilima, menu/header/state/send dimenzije, postojeći intro i odsustvo dodatne chat ikone u loading gate-u.

Pre i posle ovog koraka upoređeni su SHA-256 otisci `www/index.html`, `www/game.js`, `www/pravilaigre.js`, `www/globalchat.js`, `www/teme.css`, `www/style.css`, tematskog manifesta, centralnog registra i svih relevantnih starih runtime PNG-ova. Ti fajlovi nisu menjani u Koraku 2.

Prošli su ponovljeni build i svih devet projektnih provera: JavaScript sintaksa, pravila igre, trofeji, sinhronizacija profila, rezultati partija, Kvartalna liga, online reconnect, H2H ledger rebuild i theme performance. `git diff --check` nema grešaka belina.

## Privremeni performance bilans

Dok aktivne i kanonske kopije postoje zajedno, Green isporuka ima `166 PNG / 15.580.923 B` (`14,86 MB`). Startup ostaje `17 PNG / 4,56 MB / 20,44 MB decoded`; nove slike se još ne učitavaju u runtime toku. Aktivni paket Global chata ostaje `3 PNG / 351.688 B / 2.228.224 decoded B`.

U Koraku 3 dve aktivne kopije će biti zamenjene kanonskim, a neaktivni uramljeni runtime uklonjen. Projekcija konačne Green isporuke je `163 PNG / 15.042.830 B` (`14,35 MB`), ne trenutno stanje. Ikone history/send ostaju nepromenjene i odvojene.

## Sledeći korak

Korak 3 obuhvata kontrolisano povezivanje menija, introa, zaglavlja, Pravila i sobnog paketa; precizan startup fallback i sobni matcher; centralni registry i cache osvežavanje. Tek nakon nula starih UI referenci uklanjaju se tri legacy runtime kopije. Korak 4 je završni audit i zaključavanje.

Nije rađen commit, objavljivanje niti pregled u Android emulatoru.
