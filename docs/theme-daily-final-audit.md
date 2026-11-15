# Dnevni izazov — završna provera deset tema

## Nova PNG dugmad, 15. 11. 2026.

STOP, DUPLIRAJ i PREUZMI sada imaju po jedan zasebno generisan PNG za svaku od deset tema, uključujući Zelenu. Ukupno 30 originalnih mastera i 30 optimizovanih produkcionih RGBA PNG fajlova od 768 × 144 px. Izrada je rađena alatom `image_gen.imagegen`, pojedinačnim pozivom za svako dugme. Manifest sa punim promptovima, putanjama, SHA-256 i izmerenim kontrastom je [source-assets/theme-daily-buttons-v1/manifest.json](../source-assets/theme-daily-buttons-v1/manifest.json). [Pregled svih dugmadi](theme-daily-buttons-review.html) sadrži stvarne produkcione PNG fajlove i lokalizovane natpise.

Aktuelan inventar Dnevnog izazova je **9 PNG uloga i 9 PNG fajlova po temi**. Ranijih šest uloga ostaju, a dodate su tri površine dugmadi. Natpisi su živi Montserrat tekst radi srpskog i engleskog jezika. Ikone videa i dukata zadržavaju svoje postojeće kanonske izvore. Nema novog emoji ili SVG sloja na dugmadima.

Poređenje svih 150 početnih i novih prikaza potvrđuje **nula razlika u dimenzijama i tipografskim merama** kartice, dugmadi i ostalih kontrola. Na širinama 320/360/412 px STOP i PREUZMI zadržavaju 266 × 53 / 306 × 53 / 350 × 55 CSS px, a DUPLIRAJ 266 × 60 / 306 × 60 / 350 × 60 CSS px. Redosled, klik zone i akcije ostaju isti. Učitavanje tri PNG dugmeta ulazi u postojeću pripremu i dekodiranje resursa aktivne teme pre prikaza sobe.

Automatska provera stvarnih Daily/Modal renderera obuhvatila je **300 kombinacija**: deset tema, dva jezika, pet stanja i tri viewporta 320 × 568, 360 × 780 i 412 × 915, uz safe-area od 24 px. Svih 180 vidljivih veza dugme–PNG uspešno je dekodirano i pripada pravoj temi. Nema odsecanja, preliva ili skrolovanja kartice. Najmanji kontrast natpisa izmeren na centralnoj površini PNG je **6,20:1**. Svih 30 dugmadi pregledano je u mobilnoj veličini, uz pregled aktivnog i završnog prikaza. Moguća je zamena fonta offline fallbackom u izolovanom testu.

Prolaze `scripts/check-theme-daily-room.js`, `scripts/audit-theme-room-assets.js`, `scripts/test-daily-layout-runtime.cjs` na oba jezika i sintaksne provere izmenjenog JS-a. Ovo je lokalna provera izgleda i povezivanja sa sintetičkim rezultatima. Ne izvodi prijavu, reklamu, preuzimanje nagrade niti novi pokušaj izazova na stvarnom nalogu. Commit i deploy nisu deo ove izmene.

## Raniji zapis, 22. 10. 2026.

Datum: 22. 10. 2026. Referenca geometrije je Zelena tema; boje, materijal i PNG pripadaju aktivnoj temi.

| Stavka | Nalaz |
| --- | --- |
| Intro | Zajednički ugovor svih soba: sadržaj se priprema iza intra posle 2,4 s, a intro se završava posle 3,2 s. Isti JS izvor vremena koriste Dnevni izazov, centralne sobe, Riznica, Turnir i Kvartalna liga; CSS trajanje je 3,2 s. |
| PNG i stare reference | Svaka od deset tema ima istih šest aktivnih uloga: ikona sobe, zadatak, završetak, već odigrano, nagradni video i kanonski dukat. Svih 60 aktivnih fajlova postoji, RGBA PNG su, a nijedna ista uloga nema identičan fajl u drugoj temi. Aktivne reference na stari Daily PNG/SVG za Vaskršnju, Pustinjsko staklo i Severnu maglinu su uklonjene. |
| Dimenzije i raspored | Ista kartica do 430 CSS px, mreža 3 × 2 kockice, dimenzije oznaka 54/44/58/104/28 CSS px i zajedničke zone dugmadi. Devet tematskih CSS slojeva menja površinu i boje, bez zasebne geometrije. |
| Paleta i kontrast | Devet novih paleta koristi tematske površine i Clay ili mat plastične senke; Zelena zadržava referentni Clay izgled. Statički proračun kontrasta glavnog teksta, naslova, sporednog teksta, vrednosti i glavnog dugmeta prolazi 4,5:1 na svetloj i tamnoj podlozi za svih deset tema. |
| Tipografija i mobilni raspored | Montserrat, ista hijerarhija i veličine u svim temama. Isti pragovi na širini do 380 px i visini do 620 px; kartica ima granicu visine i oslonac na safe-area. Stvarni prikaz na malom, srednjem i velikom telefonu još zahteva pregled u aplikaciji. |
| Završetak i obaveštenje | Završna kartica prikazuje tematski PNG završetka, nagradnog videa i isti kanonski dukat koji koristi ekonomija; obaveštenje „već odigrano” prikazuje zaseban tematski PNG. Automatizovani test proverava izvore svih ovih slika za svih deset tema. |

Provere: `npm run check:theme-daily-room`, `npm run audit:theme-room-assets`, `npm run check:js` i `git diff --check` prolaze. Inventar i testovi proveravaju putanje, binarne fajlove, obračun kontrasta i tok prikaza sa simuliranim DOM-om. Ne dokazuju stvarni izgled i brzinu učitavanja na uređaju, niti poreklo svakog ranije izrađenog zajedničkog PNG-a; ta dva dela ostaju za vizuelnu kontrolu u aplikaciji. Nije rađena vizuelna potvrda na Samsung S25.

Širi `npm run check:theme-performance` je i dalje crven zbog starog očekivanja Vaskršnjih Statistics ikona u Pravilima; aktuelni test Dnevnog izazova prolazi. Ovaj nepovezani uslov ne tretira se kao potvrda ili odbijanje Dnevnog izazova.
