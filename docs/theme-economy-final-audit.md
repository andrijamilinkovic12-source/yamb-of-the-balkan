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

Granica prethodne provere od 23.10: tada nije bio dostupan novi Android snimak. Automatizovani testovi ne potvrđuju stvarnu isplatu preko produkcionog oglasa i servera. Novi vidljivi Android pregled opisan je ispod; modalna i retka nagradna stanja ostaju odvojena.

## Dopuna — stvarni emulator 28.10.2026.

[23 snimka](theme-visual-audit/emulator-economy-2026-10-28/index.html), [procene i kanonske/resolved putanje](theme-visual-audit/emulator-economy-2026-10-28/report.json), [precizna evidencija](theme-visual-audit/emulator-economy-checkpoint-2026-10-28.md).

Oba taba pregledana su u svih deset tema na 360×780. U snimljenim stanjima naslovi, opis, stanje, tabovi i nagradni redovi su čitljivi; kanonski PNG prate svoju temu i raspored Zelene. Nije nađen nov problem koji zahteva izmenu implementacije ili PNG-a ove sobe. Zelena je dodatno pregledana na 320×568 pri normalnoj font skali: stanje i nagradna kartica dostupni su unutrašnjim skrolom, bez horizontalnog izlaska. Ranija 130% font provera nije sada ponovljena; native baner je bio učitan pre promene rezolucije, pa njegov kadar nije test novog 320px pokretanja.

Automatska provera prolazi, uključujući inventar i prethodno sačuvane rasporede. To je zaseban dokaz od novih Android kadrova. Soba nema završni ekran. Nisu pritiskane nagradne kartice niti testirana isplata, nedostupnost oglasa ili greške servera. Status „UČITAVANJE OGLASA” u pojedinim kadrovima ne potvrđuje spremnost videa. Tačno trajanje intra nije mereno screenshotima.

Korisnik je odobrio odbijanje poziva Ivana Ilića, posle čega je prolaz nastavljen. Nisu prihvatani dueli ili pokretane nove partije. Vraćena Zelena i originalna rezolucija/dpi uz očuvanu prijavu. Prethodne lokalne dorade ostaju **necommitovane i neobjavljene**; ova galerija ih ne potvrđuje.
