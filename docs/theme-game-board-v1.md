# Tabla za igranje — zajednički ugovor za deset tema

Tabla u svih deset tema koristi isti raspored i dimenzije kao Zelena. Novi materijal i paleta nalaze se u `www/theme-game-board.css`. Postojeći tekst, font, veličine ćelija, dugmadi i kockica, mreža, bodovanje i interakcije ostaju isti.

| Tema | Pravac | Obrada table |
| --- | --- | --- |
| Zelena | Clay | Tamnija šumska glina, meko udubljena polja |
| Svetlo Zlato | Smooth Rubber / Matte Plastic | Topla krem i medena mat površina |
| Trula Višnja | Clay | Duboka višnja, meki glineni reljef |
| Plavi Okean | Smooth Rubber / Matte Plastic | Svetla morska mat površina |
| Neon Cyber | Smooth Rubber / Matte Plastic | Tamnoplava mat površina sa uzdržanom tirkiznom ivicom |
| Kraljevski Ametist | Clay | Tamni ametist, mekši glineni reljef |
| Vaskršnja | Smooth Rubber / Matte Plastic | Topla pastelna mat površina |
| Pustinjsko Staklo | Clay | Svetla peščana glina |
| Mesečev Sjaj | Clay | Tamna siva glina bez sjajnih ukrasa |
| Severna Maglina | Smooth Rubber / Matte Plastic | Hladna tamnoplava mat površina |

Oklop table u devet novih tema koristi alfa vrednosti 0,72–0,74, a polja 0,60–0,62. Kroz oba sloja u poljima prolazi približno 10–11% pozadine; između polja 26–28%. Zelena je nijansu otvorenija: oklop 0,68–0,70, polja 0,55–0,57, pa kroz polja prolazi približno 13–14% pozadine. Zaglavlja i zbirovi su čvršći (0,80–0,82, Zelena 0,78–0,80) radi čitljivosti. Pozadina se blago nazire kroz tablu, bez dominiranja nad brojevima. Uklonjeni su stari dekorativni slojevi preko polja. Senke razlikuju Clay od glatke mat plastike bez dodatnog ornamenta. Sitni nazivi kolona koriste jednu kontrastnu boju teksta po temi. Izabrana Najava ima zasebnu, čitljivu boju stanja.

Dugmad za upis u tabeli, „Bacaj“ i „Najava“ koriste boje, materijal i dubinu aktivne teme. Dugmad za bacanje imaju diskretna normalna, aktivna i onemogućena stanja, bez ukrasnog svetlucanja. Podrazumevane kockice koriste paletu teme; kupljeni ili ručno izabrani skinovi kockica zadržavaju sopstveni izgled. Nijedno od ovih pravila ne menja širinu, visinu, razmake, font, veličinu tačkica, zonu dodira ili broj kockica.

Gornja traka sa kontrolama, donja pozadina oko kockica i dugmadi, ležište kockica i otvoreni meni za brza podešavanja nastavljaju paletu i materijal iste table. Devet novih tema koristi odgovarajuće boje zaglavlja i polja table; otvoreni meni je nešto puniji radi čitljivosti. Clay teme imaju mekšu udubljenu/izdignutu dubinu, a mat plastika ravnomerniju površinu. Zelena zadržava postojeću referentnu obradu tih zona. Promena je samo vizuelna: dimenzije, položaji, kontrole i skrol ostaju isti.

Neon Cyber ima jedan uzak tirkizni svetlosni trag koji polako obilazi samo spoljašnju ivicu table i potom se gasi. Pun ciklus traje 22 sekunde; nema treperenja, dodatnih tragova u ćelijama ni sloja preko teksta. Pri podešavanju `prefers-reduced-motion: reduce` animacija je isključena.

Automatska provera u `scripts/check-theme-game-board.js` proverava deset paleta, ciljnu providnost kroz dva sloja, kontrast osnovnog teksta i Najave na tipičnoj boji pozadine i odsustvo geometrijskih deklaracija u novom CSS-u. Vizuelna provera na uređaju ostaje deo završne kontrole.

Provera u lokalnom Android QA emulatoru 2026-10-08 (`scripts/qa-theme-game-surfaces-emulator.js`) potvrdila je da svih deset tema zaista primenjuje različite izračunate pozadine na gornju traku, donju zonu, ležište kockica i otvoreni meni podešavanja. Ovo proverava materijal u WebView-u, ali ne zamenjuje završni pregled tokom cele partije na fizičkom uređaju.
