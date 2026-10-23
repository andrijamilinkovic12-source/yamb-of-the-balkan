# Top lista — završna provera deset tema

Datum: 22. 10. 2026. Zelena je referenca za geometriju; svaka tema zadržava sopstveni materijal, PNG i paletu.

| Tačka | Rezultat |
| --- | --- |
| 1. Intro | Ulaz u Top listu koristi zajednički intro: sadržaj se otvara iza sloja posle 2,4 s, sloj se zatvara posle 3,2 s. Trajanje je zajedničko za sve sobe i teme. |
| 2. PNG i stare reference | Svaka tema ima **osam aktivnih PNG uloga**: identitet sobe, Globalna, Lokalna, prazno/učitavanje, tri medalje i kanonski X. Inventar nema nedostajućih fajlova ni identičnih tematskih PNG između tema. U aktivnom HTML/JS/CSS toku Top liste nema starog SVG ili starih Easter/Desert/Severna putanja. Ranije verzije fajlova koje više nisu aktivno povezane i dalje postoje u repozitorijumu; nisu obrisane jer njihove veze u drugim izvorima nisu deo ove provere. |
| 3. Geometrija | Ikone 32/21/25/86 CSS px, medalje 44 CSS px (40 do širine 400 px), kontrola X 44 CSS px. Svih deset tema ima isti gornji razmak, tabove i redove; do 400 px koristi se ista kompaktna mreža. Skroluje se sadržaj liste unutar kartice. |
| 4. Površine i kontrast | Devet tema koristi svoje `theme-card-*` boje i Clay ili mat plastične senke. Zelenoj je potamnjen samo Clay nosivi sloj, zaglavlje i neaktivne kontrole radi čitljivosti. Provera paleta devet tema i proračun svetlog teksta na oba kraja zelene površine prolaze 4,5:1 u statičkim uslovima. |
| 5. Tipografija | Montserrat i iste veličine u svih deset tema: tab 0,66 rem, naslov panela 1 rem, filter 0,7 rem. Duža imena koriste istu promenu veličine i prelom u svakoj temi. Mobilni CSS pokriva uske ekrane i safe-area, ali stvarni izgled na malom, srednjem i velikom telefonu nije potvrđen. |
| 6. Završetak/obaveštenja | Top lista nema poseban završni ekran. Globalna i Lokalna lista prikazuju tematsku oznaku za učitavanje, praznu listu i prekid veze. Provera sa simuliranim DOM-om potvrđuje te izvore i tri kanonske medalje u svih deset tema. |

`npm run check:theme-leaderboard-room`, `npm run audit:theme-room-assets` i `npm run check:js` proveravaju povezivanje, inventar i sintaksu. Vizuelna potvrda svih stanja, kontrasta preko stvarne pozadine i bezbednih zona na uređajima ostaje otvorena; statički test ne predstavlja potvrdu prikaza na Samsung S25.

Šira provera `npm run check:green-coverage` i dalje prijavljuje zastareo centralni Green inventar: ne klasifikuje nove `general-podium-*-v2.png` medalje, a potom ni nove `quarterly-league-*-v2.png` medalje. Te slike postoje i aktivna provera Top liste ih povezuje pravilno; centralni istorijski inventar zahteva zasebnu obnovu pre nego što taj širi test može biti zelen.
