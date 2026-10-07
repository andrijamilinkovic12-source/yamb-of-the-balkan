# Icon pack glavnih soba — v1

Datum: 2026-10-07. Status: **linked / vizuelna provera u aplikaciji predstoji**.

Za svaku od devet nezelenih tema napravljen je originalni paket od 12 funkcionalnih simbola: solo, dva igrača, nasumični protivnik, poziv prijatelja, dnevni izazov, globalni čet, top lista, igrači na mreži, kvartalna liga, pravila, podešavanja i statistika. Svaki simbol ima originalni PNG master i dve produkcione RGBA izvedenice: 384 × 384 px za meni i 512 × 512 px za sobu. Ukupno: **108 mastera i 216 produkcionih PNG fajlova**.

| Tema | Pravac | Pregled |
| --- | --- | --- |
| Svetlo Zlato | Smooth Rubber / Matte Plastic | [PNG](main-room-icons-light-review-v1.png) |
| Trula Višnja | Clay | [PNG](main-room-icons-medium-review-v1.png) |
| Plavi Okean | Smooth Rubber / Matte Plastic | [PNG](main-room-icons-winter-review-v1.png) |
| Neon Cyber | Smooth Rubber / Matte Plastic | [PNG](main-room-icons-neon-review-v1.png) |
| Kraljevski Ametist | Clay | [PNG](main-room-icons-amethyst-review-v1.png) |
| Vaskršnja | Smooth Rubber / Matte Plastic | [PNG](main-room-icons-easter-review-v1.png) |
| Pustinjsko Staklo | Clay | [PNG](main-room-icons-desert-review-v1.png) |
| Mesečev Sjaj | Clay | [PNG](main-room-icons-moon-review-v1.png) |
| Severna Maglina | Smooth Rubber / Matte Plastic | [PNG](main-room-icons-severna-review-v1.png) |

[Zajednički interaktivni pregled](theme-main-room-icon-review.html) prikazuje pakete na prihvaćenim pozadinama i bojama kartica. To je dizajnerski pregled, ne snimak povezane aplikacije.

Masteri su u `source-assets/theme-icon-packs/<theme>/main-rooms-v1/`, a produkcioni PNG u `www/assets/theme-packs/<theme>/canonical/<room>-room-identity/`. Katalog `theme-asset-implementation-map.json` beleži svih 24 slota po temi kao `linked`. `www/theme-main-room-icons.js` bira paket aktivne teme za meni i zaglavlja, a `www/game.js` koristi sobnu varijantu za uvode. Izvor generisanja svakog mastera je u `main-rooms-v1-generation.json` odgovarajuće teme. Zelena referenca nije menjana niti su njene ikonice preslikane i prebojene.

Provere: svih devet paketa ima 12 mastera i 24 odgovarajuća kataloška slota; PNG izvedenice imaju tačne dimenzije i RGBA format; optička granica najveće dimenzije je približno 86% platna i centrirana je. Nizak, širok podijum ima namerno manju popunjenost druge ose. `node scripts/check-theme-design-spec.js` i `scripts/check-main-room-icon-bounds.ps1` prolaze za svih devet tema.

Sledeći koraci u ukupnoj obnovi tema: vizuelna provera povezanih ikona u aplikaciji i na telefonu, zatim dukat sa obaveznih pet tačaka i ostali slotovi kataloga. Ovaj status ne označava celu temu niti svih 177 asseta završenim. Dva probna dukata Svetlog Zlata sa rombom nisu ušla u projekat i odbijena su novim pravilom.
