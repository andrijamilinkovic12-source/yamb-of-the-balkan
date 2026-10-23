# Dnevni izazov — završna provera deset tema

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
