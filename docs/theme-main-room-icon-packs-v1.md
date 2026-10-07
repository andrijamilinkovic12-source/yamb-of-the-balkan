# Icon pack glavnih soba — v1

Datum: 2026-10-07. Status: **linked / vizuelna provera u aplikaciji predstoji**.

Za svaku od devet nezelenih tema napravljen je originalni paket od 15 funkcionalnih simbola: solo, dva igrača, nasumični protivnik, poziv prijatelja, dnevni izazov, globalni čet, top lista, igrači na mreži, kvartalna liga, pravila, podešavanja, statistika, Riznica (kovčeg sa dukatima), Turnir (pehar) i Dukati / Ispravi zadnji upis. Svaki simbol ima originalni PNG master i dve produkcione RGBA izvedenice: 384 × 384 px za meni i 512 × 512 px za sobu. Ukupno: **135 mastera i 270 produkcionih PNG fajlova**.

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

Masteri su u `source-assets/theme-icon-packs/<theme>/main-rooms-v1/`. Produkcioni PNG su u `www/assets/theme-packs/<theme>/`: prvih 12 u `canonical/<room>-room-identity/`, a tri dodatne u postojećim kataloškim putanjama Riznice, Turnira i ekonomije. Katalog `theme-asset-implementation-map.json` beleži 29 povezanih slotova po temi; sobna veličina pehara je prateći PNG van kataloga. `www/theme-main-room-icons.js` bira paket aktivne teme za meni i zaglavlja, a `www/game.js` koristi sobnu varijantu za uvode. Izvor generisanja je u `main-rooms-v1-generation.json` i `main-room-extension-v1-generation.json` odgovarajuće teme. Zelena referenca nije menjana niti su njene ikonice preslikane i prebojene.

Provere: svih devet paketa ima 15 mastera i 30 PNG izvedenica. Stare duplirane ikone ulaza i zaglavlja uklonjene su iz `www/index.html`, a dinamički dodati stari primerci uklanjaju se sa istog mesta kada se nova ikona poveže. Dukati na tri nova motiva imaju pet tačaka. Prvih 12 simbola ima optičku granicu približno 86% platna; tri nova su uvezena u isto standardno platno sa 6% spoljne margine. `node scripts/audit-main-room-icon-routing.js` proverava 27 statičkih i devet dinamičkih sidara po temi, stvarne PNG putanje i dimenzije, uključujući svih 15 uloga u meniju. Ekran učitavanja, turnirska ceremonija i putanja šampiona koriste novi pehar. `node scripts/check-theme-design-spec.js` prolazi. Vizuelna provera u stvarnoj aplikaciji ostaje otvorena.

Sledeći koraci u ukupnoj obnovi tema: vizuelna provera povezanih ikona u aplikaciji i na telefonu, zatim ostali slotovi kataloga. Ovaj status ne označava celu temu niti svih 177 asseta završenim. Dva probna dukata Svetlog Zlata sa rombom nisu ušla u projekat i odbijena su novim pravilom.
