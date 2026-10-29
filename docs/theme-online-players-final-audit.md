# Završna provera — Online igrači (10 tema)

## Novi pregled u emulatoru — 27–28.10.2026.

[45 snimaka i precizni nalazi](theme-visual-audit/emulator-online-players-2026-10-28/index.html). Svih deset tema sada ima stvarni pregled liste, tastature i pretrage bez rezultata na logičkom prikazu360×780. Green/Light/Medium su završeni27.10; prekinuti Winter i ostalih šest tema dovršeni su28.10. Tekst i raspored su pregledni. Moon je imao samo sopstveni nalog, pa njegove akcije uz drugog igrača nisu sada vizuelno potvrđene. Dostupnost/isključenost akcija drugih tema je vidljiva, ali prijateljstva, dueli i posmatranje nisu pokretani.

Pronađene su i lokalno pripremljene dve CSS dorade: native X za brisanje pretrage koristi postojeći tematski kanonski PNG; Easter blanket img pravilo više ne dodaje ljubičasti rub i pravougaonu senku slikama u ovoj sobi. Nove ilustracije, funkcije i dimenzije sobe nisu menjane. **Ove dorade nisu commitovane/deployovane; snimci pokazuju problem pre ispravke.** Statički inventar sada proverava i konačne quality-resolved PNG putanje. Osam uloga po temi i najmanji provereni kontrast4,59:1 ostaju potvrđeni statičkim proverama.

Prvi Neon izbor28.10. vratio je Winter, drugi uspeo; hladna promena teme ostaje zaseban otvoren nalaz. Nema novog dokaza za dugačku listu, mrežne kvarove i potvrde. Emulator nije fizički S25. Vraćen je na Zelenu i originalne dimenzije/dpi i tastaturu, uz očuvanu prijavu. Nije bilo slanja poruka ili poziva niti uzimanja nagrada.

## Prethodna statička provera

Datum: 23.10.2026. „Online number” je soba Online igrači sa brojem prisutnih, pretragom i akcijama nad igračem. Zelena određuje geometriju i tipografiju; svaka tema koristi svoj materijal, pravac i paletu.

| Tačka | Nalaz |
| --- | --- |
| Intro | Soba koristi isti skraćeni intro kao ostale sobe: sadržaj se otvara na 2.400 ms, a intro završava na 3.200 ms. Ikona intra je kanonski PNG aktivne teme. |
| PNG i stare ikone | Po temi je osam različitih aktivnih PNG uloga: identitet sobe, stanje, pretraga, prijatelj, posmatranje, duel, avatar i kanonsko X. Svih šest unutrašnjih motiva po temi, ukupno 60, imaju zasebne RGBA PNG i jedinstvene binarne hash vrednosti. Stare putanje Online igrača za Vaskršnju, Pustinjsko staklo i Severnu maglinu uklonjene su iz aktivnih paketa i rezervnih putanja. Markup sobe i aktivna lista akcija ne koriste SVG. Istorijski fajlovi ostaju na disku samo kao arhiva. |
| Dimenzije | Sačuvani QA podaci za 320 × 568, 411 × 891, 768 × 1024 i 320 × 568 pri font skali 130% pokazuju iste dimenzije okvira, zaglavlja, pretrage, kartica, avatara i dugmadi kao Zelena u svih deset tema. Nema horizontalnog preliva ni izlaska okvira iz viewporta. Duža lista se skroluje unutar sobe. |
| Površine i kontrast | Devet nezelenih tema koriste svoje 3D Soft Neomorphism palete i Clay ili Matte Plastic pravac definisan za temu; Zelena ostaje Clay. Najmanji izračunati kontrast proverenih parova teksta sobe i obaveštenja je 4,59:1. |
| Tipografija | Sačuvani izračunati stilovi potvrđuju jednake veličine i težine fontova naslova, pretrage, imena i akcija na četiri viewporta. Placeholder je skraćen u oba jezika da se vidi na uskom ekranu bez smanjivanja fonta; pristupačan naziv polja ostaje pun. |
| Završni ekran i obaveštenja | Soba nema završni ekran. Ima učitavanje, praznu/filtriranu listu, grešku veze, potvrdu prijateljstva i izazova i pripadajuća obaveštenja. Modal i toast koji potiču iz sobe sada koriste paletu aktivne teme, isti font i dugmad minimalne visine 44 px. |

Ponovljiva provera: `npm run check:theme-online-players-final`. Uključuje inventar originalnih PNG, aktivne putanje, intro, kontrast i poređenje geometrije sa Zelenom.

Granica prethodne provere od23.10: sačuvani QA rasporedi potvrđuju pravila i geometriju, a ne ceo aktuelni Android tok. Novi emulator dokaz iznad sada pokriva tastaturu i filtriranje u deset tema; fizički telefon, potvrde i stvarne radnje nad drugim igračem ostaju posebna provera.
