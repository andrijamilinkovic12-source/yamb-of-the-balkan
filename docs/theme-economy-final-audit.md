# Završna provera — Dukati / Ispravi zadnji upis (10 tema)

Datum: 23.10.2026. Oba taba su jedna soba. Zelena je referenca za raspored i tipografiju; materijal i paleta dolaze iz svake teme.

| Tačka | Nalaz |
| --- | --- |
| Intro | Zajednički intro otvara sadržaj posle 2.400 ms i završava se posle 3.200 ms. Koristi kanonsku ikonu aktivne teme. |
| PNG i stare ikone | Po temi je osam različitih aktivnih PNG fajlova u šest semantičkih uloga: identitet sobe, dukat front i inline, token front i inline, nagradni video aktivan i nedostupan, i kanonsko X. Hash provera ne nalazi isti fajl u različitim temama. Uklonjeni su skriveni stari SVG dukata/tokena i generički SVG video iz oba taba, kao i tri stare rezervne putanje intro ikona. Istorijski fajlovi mogu ostati na disku, ali nisu u aktivnoj sobi. |
| Dimenzije | Sačuvani Android QA podaci za 411 × 891, 768 × 1024 i 320 × 568 pri font skali 130% pokazuju isti okvir, zaglavlje, tabove, podkartice i dugmad kao Zelena. Na kratkom ekranu se duži opis skroluje unutar taba i nagradno dugme ostaje dostupno. U starom snimku na 320 × 568 pri 130% unutrašnja nagradna kartica bila je oko 10 px šira od mreže; sadašnji CSS ograničava je na širinu mreže i smanjuje unutrašnje razmake samo na uskim ekranima. Za tu ispravku nedostaje nov snimak uređaja. |
| Površine i kontrast | Devet nezelenih tema koristi svoje palete i Clay ili Matte Plastic pravac; Zelena ostaje Clay. Provereni parovi teksta i podloge nezelenih tema imaju najmanje **4,68:1**. Aktivni i nedostupni video imaju zasebne kanonske PNG oznake i odgovarajuće površine. |
| Tipografija | Veličine i visine redova u snimljenim rasporedima podudaraju se sa Zelenom u svih deset tema. Montserrat je izričito postavljen za celu sobu. Naslov „Ispravi zadnji upis” može da se prelomi na uskom telefonu. |
| Završni ekran i obaveštenja | Soba nema završni ekran. Potvrda dobitka, nedostupan oglas, greška isplate i status tokena prikazuju se modalom ili obaveštenjem u paleti aktivne teme. Dugmad modala imaju najmanju visinu 44 px. Nagrada se dodeljuje tek posle potvrđenog nagradnog videa i servera. |

Ponovljiva provera: npm run check:theme-economy-final. Obuhvata inventar PNG, uklanjanje SVG, paritet geometrije i teksta u prethodnim snimcima, kontrast i testove nagradnog toka.

Granica provere: trenutno nije dostupan Android WebView za novi snimak. Uklanjanje skrivenih SVG elemenata, novi modal i korekcija uske nagradne kartice zahtevaju završnu vizuelnu potvrdu na telefonu; automatizovani testovi ne potvrđuju stvarnu isplatu preko produkcionog oglasa i servera.
