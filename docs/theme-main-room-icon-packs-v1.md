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

Masteri su u `source-assets/theme-icon-packs/<theme>/main-rooms-v1/`. Produkcioni PNG su u `www/assets/theme-packs/<theme>/`: prvih 12 u `canonical/<room>-room-identity/`, a tri dodatne u postojećim kataloškim putanjama Riznice, Turnira i ekonomije. Katalog `theme-asset-implementation-map.json` beleži 29 povezanih slotova po temi; sobna veličina pehara je prateći PNG van kataloga. `www/theme-main-room-icons.js` bira paket aktivne teme za meni i zaglavlja, a `www/game.js` koristi sobnu varijantu za uvode. Izvor generisanja je u `main-rooms-v1-generation.json` i `main-room-extension-v1-generation.json` odgovarajuće teme. Zelene ikonice nisu preslikane i prebojene.

Provere: svih devet paketa ima 15 mastera i 30 PNG izvedenica. Stare duplirane ikone ulaza i zaglavlja uklonjene su iz `www/index.html`, a dinamički dodati stari primerci uklanjaju se sa istog mesta kada se nova ikona poveže. Dukati na tri nova motiva imaju pet tačaka. Prvih 12 simbola ima optičku granicu približno 86% platna; tri nova su uvezena u isto standardno platno sa 6% spoljne margine. `node scripts/audit-main-room-icon-routing.js` proverava 27 statičkih i devet dinamičkih sidara po temi, stvarne PNG putanje i dimenzije, uključujući svih 15 uloga u meniju. Ekran učitavanja, turnirska ceremonija i putanja šampiona koriste novi pehar. `node scripts/check-theme-design-spec.js` prolazi. Vizuelna provera u stvarnoj aplikaciji ostaje otvorena.

Donji red glavnog menija (Dnevni izazov, Top lista, Statistika, Podešavanja, Pravila) u devet tema sada prikazuje pet postojećih transparentnih PNG simbola bez kvadratne podloge dugmeta ili pseudoelemenata. Geometrija odgovara Zelenoj: PNG 384 × 384 px, prikaz 52 × 52 px (mobilni portret 46 × 46 px), nevidljiva klik-zona 55 × 55 px (mobilni portret 48 × 48 px), razmak 15 px (mobilni portret 12 px) i maksimalna širina reda 350 px. Sekvencijalni talas animira samo ikonice, sa poštovanjem `prefers-reduced-motion`. Zelena tema nije menjana.

Riznica i Turnir u glavnom meniju svih devet tema koriste nove tematske PNG-ove bez podloge dugmeta. Stara dva SVG primerka uklonjena su iz menija. Ikone prate Zelenu po veličini i ritmu: 82 × 82 px (mobilni portret 74 × 74 px), disanje Riznice 2,6 s i blago njihanje Turnira 2,8 s. Pokret staje pri `prefers-reduced-motion`; Zelena nije menjana.

Četiri centralna moda sada koriste po četiri nova kanonska PNG simbola u svih devet tema, ukupno 36 uvezanih PNG-a. Stara velika emoji pozadina i emoji pored PNG-a uklonjeni su iz kartica; u te četiri kartice nije bilo aktivnih SVG datoteka. Sve teme, uključujući Zelenu po izričitom zahtevu, imaju providno polje kartice bez blura i unutrašnjeg okvira. Geometrija je ista: mreža 292 px, razmak 12 px, kartica sa paddingom 8 px i radijusom 24 px, nosač 64 × 64 px i PNG 68 × 68 px (mobilni portret 60 × 60 px). Nazivi modova su pravi SR/EN tekst bez emoji prefiksa i pseudo-duplikata; ikone koriste Green `float3D` ciklus od 4 s i isto hover/pressed pomeranje, uz `prefers-reduced-motion`. Watermark Indeksa moći i dalje je uklonjen.

Promena teme sada paralelno učitava pozadinu i 15 vidljivih PNG elemenata novog menija pre promene klase teme. Ako se izvor PNG-a ipak promeni dok je prethodna slika učitana, stara slika se sakriva do završetka novog učitavanja. Plavi okean je očišćen od pet starih SVG ikona donjeg reda, nacrtanih simbola četiri moda i gornjih pseudo-ikona. Njegovi kanonski PNG simboli za globalni čet, onlajn igrače i dukate sada stoje na mestima i u veličinama Zelene reference. Automatska provera potvrđuje putanje i odsustvo starih SVG ikona u glavnom meniju; stvarni prikaz na telefonu ostaje za vizuelnu proveru.

Gornji red ima Green odnos širina 1:1,8:1 u okviru od najviše 380 px i razmak od 10 px u svih deset tema. Sve tri kartice zadržavaju svoju podlogu i paletu. Kartica Kvartalne lige ponovo prikazuje diskretan watermark iz kanonskog PNG-a sopstvene teme; tekst, rang, progres i bodovi imaju isti raspored i pravilo za uske ekrane kao Zelena. PNG ikone Online igrača i Dukata / Ispravi zadnji upis u svim temama, uključujući Zelenu, koriste blagi Vaskršnji signal i njihanje, uz gašenje animacije kada je uključeno smanjeno kretanje.

Sledeći koraci u ukupnoj obnovi tema: vizuelna provera povezanih ikona u aplikaciji i na telefonu, zatim ostali slotovi kataloga. Ovaj status ne označava celu temu niti svih 177 asseta završenim. Dva probna dukata Svetlog Zlata sa rombom nisu ušla u projekat i odbijena su novim pravilom.
