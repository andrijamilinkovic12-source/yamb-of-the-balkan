# Završna provera — Globalni chat (10 tema)

Datum: 22.10.2026. Zelena tema određuje dimenzije i tipografiju, a svaka tema zadržava svoj materijal, ikone i paletu.

| Tačka | Nalaz |
| --- | --- |
| Intro | Globalni chat koristi zajednički intro u svih deset tema: sadržaj se otvara posle 2.400 ms, a intro se završava posle 3.200 ms. Kanonska ikona aktivne teme je jedini vizuelni motiv intra. |
| Aktivni PNG | Svaka tema ima četiri različite PNG putanje: identitet sobe, prazno/učitavanje, slanje i kanonski X. Binarnim hashom je potvrđeno da se isti fajl ne deli između tema za ove uloge. Stare Global Chat PNG reference za Vaskršnju, Pustinjsko staklo i Severnu maglinu uklonjene su iz paketa i rezervnih putanja intra. Aktivni markup sobe ne sadrži SVG. Stari fajlovi mogu ostati kao arhiva na disku, ali se ne koriste u sobi. |
| Raspored | Sačuvani Android QA podaci za 320 × 568, 411 × 891, 768 × 1024 i 320 × 568 sa font skalom 130% pokazuju iste dimenzije i raspored kao Zelena: okvir, zaglavlje, telo, footer, poruke, online oznaka, unos i dugmad. Nema horizontalnog preliva ni izlaska okvira iz snimljenog viewporta. Telo poruka skroluje unutar sobe. |
| Površine i kontrast | Devet nezelenih tema koristi svoje `gc` palete i materijale; Zelena ostaje Clay referenca. Najmanji izmereni kontrast teksta u sačuvanim QA rasporedima je 4,59:1. Dodatna provera paletnih parova za sobu, poruku o grešci i prozor za potvrdu daje najmanje 4,54:1. U Zelenoj je tekst greške posvetljen na `#fff7ef` jer je prethodni imao samo 3,66:1 na svetlijem delu footera; sada ima najmanje 4,82:1. |
| Tipografija | Sačuvani izračunati stilovi veličine, težine, visine reda, razmaka slova i paddinga nemaju razlika između tema na četiri proverena viewporta. Duži naslov se prelama na uskom ekranu, bez smanjivanja fonta samo u jednoj temi. |
| Završni ekran i obaveštenja | Globalni chat nema završni ekran. Pri prvom ulasku postoji potvrda pravila chata, pri prijavi poruke potvrda prijave, a statusi učitavanja, greške i uspešne prijave prikazuju se u sobi. Dva prozora za potvrdu sada koriste tematske boje i isti raspored u svim temama; dugmad imaju minimalnu visinu dodira 44 px. Opšti modal sada postavlja i vraća fokus u svih deset tema. |

Ponovljiva provera: `npm run check:theme-global-chat-final`. Prošli su i `npm run check:js` i `git diff --check` za izmenjene fajlove. [Pregled ikona i sobe](theme-global-chat-room-review.html) prikazuje vizuelne reference.

Granica provere: sačuvani Android QA snimci nastali su ranije, a trenutni WebView nije dostupan za novo snimanje iz ovog okruženja. Zato novi prozor za potvrdu i ponašanje tastature treba završno pogledati na fizičkom telefonu; statički kontrast i postojeći rasporedi sami po sebi to ne potvrđuju. Širi `check:theme-performance` trenutno staje na zastarelom očekivanju Vaskršnje ikone teme u Riznici, van opsega Globalnog chata.
