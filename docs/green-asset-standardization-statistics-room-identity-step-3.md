# Green Asset Standardization — Statistics Room Identity, Korak 3

## Ishod

Canonical `statistics-room-identity` paket povezan je sa svim aktivnim Green potrošačima. Porodica je upisana u centralni registar sa statusom `standardized`; završni vizuelni i tehnički audit i status `locked` slede u Koraku 4.

Glavni Statistics znak je isti odobreni slobodnostojeći glineni grafikon. Novi runtime fajlovi su bajt-po-bajt identični prethodnim `statistics-free-v2` varijantama. CSS dimenzije, motion, Statistics i H2H podaci, formule i geometrija nisu menjani.

## Povezani potrošači

| Potrošač | Canonical varijanta | Uloga |
|---|---|---|
| Glavni meni | `statistics-room-menu-v1.png`, `384×384` | startup ikona, postojeći talasni motion |
| Theme loading gate | `statistics-room-v1.png`, `512×512` | vizuelni znak pri promeni teme |
| Statistics intro | `statistics-room-v1.png` | postojeći icon-only 4,6 s intro, scale `1.06` i pulse `1,8 s` |
| Zaglavlje sobe | `statistics-room-v1.png` | postojeći `34×34 contain` prikaz |
| Pravila, SR i EN | `statistics-room-v1.png` | „Kolone u igri / Game columns” i „Praćenje statistike / Tracking statistics” |
| Statistics room-on-demand | `statistics-room-v1.png` | priprema pri ulasku u sobu |

Glavni meni zadržava `52×52` prikaz, odnosno `46×46` na uskom portrait ekranu, i `8,4 s` sekvencijalni talas sa Statistics kašnjenjem `1,56 s`.

## Izolacija učitavanja

`getThemeStartupSources()` i performance audit uključuju samo canonical `384×384` menu varijantu u startup. Ona zamenjuje stari `runtime/menu/statistics-free-v2.png` bez povećanja broja startup fajlova ili dekodirane memorije.

Green Statistics room matcher prepoznaje tačnu `canonical/statistics-room-identity/statistics-room-v1.png` putanju. Ne hvata `statistics-room-menu-v1.png`, pa menu varijanta ne ulazi ponovo u room-on-demand paket. Postojeći Overview i H2H namespace ostaju u Statistics sobi.

Fallback izbor ikona glavnog menija prepoznaje novu canonical menu putanju i kada `#main-menu` DOM nije dostupan. U uobičajenom toku startup skuplja izvor sa stvarnog Statistics dugmeta.

## Centralni registar i manifest

`statisticsRoomIdentity` u `www/themes/green/asset-registry.json` ima:

- status `standardized`;
- jedan vizuelni identitet i dve canonical delivery uloge;
- runtime dimenzije i SHA-256 otiske;
- tri zabranjene legacy runtime putanje;
- istorijsko mapiranje starih putanja na canonical zamene;
- odbijeni framed `statistics-pro-v1` kandidat;
- odvojene granice prema Overview, H2H, Rules ilustraciji, Power Indexu i rezultatima.

Source manifest u `source-assets/green-soft-clay-canonical/statistics-room-identity/manifest.json` sada beleži šest povezanih tokova: meni, intro, zaglavlje, Pravila, room-on-demand i startup. Green cache verzija povećana je sa `47` na `48` za sigurno osvežavanje putanja na uređaju.

## Uklonjene runtime kopije

Nakon potvrde da u aplikacionom kodu imaju nula aktivnih referenci, uklonjena su tačno tri fajla:

1. `www/assets/green-soft-clay/statistics-free-v2.png` — stari room/intro/header runtime;
2. `www/assets/green-soft-clay/runtime/menu/statistics-free-v2.png` — stari menu runtime;
3. `www/assets/green-soft-clay/statistics-pro-v1.png` — neaktivni framed orphan.

Tačno ove putanje su u registru zabranjene za buduće runtime povezivanje. Git može da vrati uklonjene fajlove dok promene nisu komitovane. Odobreni high-resolution master ostaje sačuvan, a odbačeni high-resolution `statistics-pro-v1.png` ostaje isključivo u `source-assets` kao audit trag. Nijedan high-resolution fajl nije deo `www` isporuke.

## Reproducibilan build

`build-green-canonical-statistics-room-identity-pack.py` sada gradi samo iz odobrenog `1254×1254` izvora. Više ne zavisi od uklonjenih legacy runtime fajlova:

1. direktan LANCZOS `1254→512` daje room varijantu;
2. sledeći LANCZOS `512→384` daje tačno odobrenu menu varijantu;
3. skripta proverava format, dimenzije i fiksne SHA-256 otiske sva tri canonical izlaza.

Build je uspešno ponovljen nakon uklanjanja legacy fajlova. Dobijeni hash vrednosti su isti kao u Koraku 2.

## Performance posle integracije

- Green tema: `168 PNG`, `16.272.395 B` (`15,52 MB`).
- Startup: `17 PNG`, `4,56 MB / 20,44 MB decoded` — bez promene.
- Statistics room: `17 PNG`, `630.121 B / 5.439.488 decoded B`.
- Jedan room identitet, deset Overview glyph-ova i šest H2H-specifičnih PNG-ova.
- Najveći Green room paket ostaje Riznica: `44 PNG`, `2,94 MB / 13,70 MB decoded`.

U odnosu na stanje pre ovog paketa uklonjen je jedan neaktivni runtime PNG od `237.672 B` i `1.048.576` procenjenih dekodiranih bajtova iz filesystem Statistics room audita. Zamena aktivnih varijanti ne menja njihov sadržaj.

## Provere

`check-theme-performance.js` proverava canonical i istorijske hash vrednosti, format, dimenzije, stvarne reference, registry, zabranjene putanje, startup i room razdvajanje, CSS i intro motion ugovor. Reproducibilan build je ponovljen nakon migracije. Kompletan projektni test skup: `check-js`, `check-game-rules`, `check-trophies`, `check-profile-sync`, `check-match-results`, `check-quarterly-league`, `check-online-reconnect`, `check-h2h-ledger-rebuild` i `check-theme-performance`.

## Sledeći korak

Korak 4 je završna vizuelna, semantička i tehnička kontrola u stvarnim prikaznim kontekstima, preload izolaciji i registru. Tek posle tog audita porodica prelazi iz `standardized` u `locked`.

Nije rađen commit niti objavljivanje.
