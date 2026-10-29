# Završna provera — Globalni chat (10 tema)

## Stvarni Android pregled — 27.10.2026.

[Galerija svih deset tema](theme-visual-audit/emulator-global-chat-2026-10-27/index.html) sada potvrđuje praznu istoriju i unos sa zatvorenom/otvorenom tastaturom na logičkom prikazu 360×780. U tim stanjima nema odsecanja teksta, prekrivanja unosa tastaturom ili preliva u sistemsku navigaciju; površine, mastilo i PNG odgovaraju temi. Nije menjana implementacija sobe. Prethodne lokalne dorade drugih delova aplikacije ostaju necommitovane i neobjavljene.

Istorija je bila prazna: stvarne poruke i avatari, duge poruke, meni drugog igrača i potvrda prijave poruke ostaju bez novog Android dokaza. Prva potvrda pravila pregledana je samo u Zelenoj. Ništa nije poslato u chat. Ovo nije fizički S25 test; ranije sačuvani rasporedi i izračunati kontrasti u tabeli ispod ostaju zaseban dokaz. Emulator je vraćen na početnu veličinu, dpi i podešavanje tastature, uz Zelenu i očuvanu prijavu.

## Prethodna statička provera

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

Granica prethodne provere od 22.10: sačuvani QA rasporedi sami ne potvrđuju aktuelno ponašanje tastature i potvrda u aplikaciji. Novi emulator dokaz od 27.10. iznad pokriva tastaturu u svih deset tema i početnu potvrdu samo u Zelenoj; fizički telefon i preostala dinamička stanja ostaju odvojena provera. Širi `check:theme-performance` ranije je stajao na zastarelom očekivanju Vaskršnje ikone teme u Riznici, van opsega Globalnog chata.
