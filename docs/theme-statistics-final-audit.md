# Statistika i dve rang liste — završna provera deset tema

Datum: 22. 10. 2026. Zelena je referenca za raspored i mere. Sve teme koriste sopstvene površine, boje i kanonske PNG.

| Tačka | Nalaz |
| --- | --- |
| 1. Intro | Ulaz u Statistiku koristi zajednički intro svih soba: sadržaj se otvara posle 2,4 s, sloj se završava posle 3,2 s. Rang liste se otvaraju kao modalni prikazi unutar Statistike, bez drugog intra. |
| 2. PNG i stare reference | Svaka tema ima **27 aktivnih PNG uloga**: 19 sobnih i deljenih uloga, posebnu izvedenicu ikone za meni, šest medalja za dve rang liste i kanonski X. Svih 270 putanja postoji i ima PNG potpis. Novi pregled, H2H i rang liste ne povezuju stari SVG ili stare tematske ikone. Starije datoteke koje druge komponente ili istorijski registri mogu pominjati nisu brisane. |
| 3. Dimenzije | Zaglavlje 58 CSS px; glavna ikona 34 px; oznake kartica 19/14/24 px; H2H naslov 29 px; VS 50 px. Devet tema koristi Green raspored kartica, H2H detalja i oba modalna prikaza rang lista. Sadržaj rang lista skroluje se unutar modala, koji uzima u obzir safe area. |
| 4. Površine i kontrast | Podkartice devet tema sada koriste punije tonove sopstvene palete, kako bi osnovni, sporedni i naglašeni tekst ostao čitljiv. Potamnjeni su svetliji Green Clay slojevi sobe i rang lista. Statički proračun krajnjih slojeva preko crne i bele podloge prolazi prag 4,5:1 za te tipove teksta. |
| 5. Tipografija | Montserrat, tipografske mere sobe i obe liste dele se između tema. Duga imena u rang listama koriste iste dve linije i smanjenje fonta po dužini. Pravila za uske i velike ekrane postoje, ali izgled nije potvrđen na stvarnim telefonima. |
| 6. Završetak i obaveštenja | Statistika nema završni ekran igre. H2H ima tematsku PNG oznaku za prazno stanje. Obe rang liste imaju obaveštenja za učitavanje, praznu listu i prekid veze; simulirani DOM test potvrđuje ta stanja, tematski avatar i odgovarajuću medalju u svih deset tema. |

`npm run check:theme-statistics-room` prolazi za inventar, intro, statički kontrast i stanja rang lista. Provera `npm run audit:statistics` zahteva živu MongoDB vezu i ovde je stala na `querySrv ETIMEOUT`; podaci sa servera i stvarni prikaz na malom, srednjem i velikom telefonu zato nisu potvrđeni.
