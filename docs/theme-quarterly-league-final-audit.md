# Kvartalna liga — završna provera deset tema

Datum: 23.10.2026.

1. **Intro:** koristi `ROOM_INTRO_TIMING` za sve teme: sadržaj se otvara posle 2,4 s, a sloj se uklanja posle 3,2 s. Animacija Kvartalne lige sada dobija isto trajanje. Intro prikazuje samo tematski znak sa istaknutim tekućim kvartalom.
2. **PNG:** svaka tema ima 13 zasebnih mastera i 14 produkcionih PNG putanja: znak sobe, njegov meni format, tri navigacione ikone, šest rangova i tri medalje. Tab Liga ponavlja isti znak; nagrada i proglašenje koriste iste kanonske medalje. Aktivni HTML/JS/CSS prikaz ne koristi stari SVG ili v1 PNG. Neupotrebljeni `quarterly-league-icon.svg` i stari zeleni CSS watermark su uklonjeni. Istorijske v1 PNG datoteke ostaju na disku kao izvori starijih QA zapisa, ali nisu aktivni asseti sobe.
3. **Geometrija:** ista struktura i skala u svim temama: tab ikona 28 px, rang bedž 46 px, bedž aktuelnog ranga 38 px, medalje u listi 24/28 px. Obaveštenje o šampionu prati zelenu širinu do 400 px, bez izlaska iz safe zone; znak, medalja, avatar, naslov, poruka i dugme imaju zajedničke mere.
4. **Površine i kontrast:** devet dodatnih tema koriste svoje tokene za nosivu karticu, uvučene liste, tabove, okvire i senke. Tekst i sekundarni tekst provereni su prema nosivim tonovima, sa ciljem najmanje 4,5:1. Zelenoj ostaje njen Clay materijal. Oznaka tekućeg kvartala u glavnom meniju je u boji, jasno vidljiva, bez dodatne watermark providnosti.
5. **Tipografija:** Montserrat, jedinstvene veličine za naslov sobe, tabove, rang, imena i poene; duga imena se prelamaju. Na kratkim ekranima lista unutar sobe može da se skroluje, dok se kartica šampiona ograničava visinom ekrana i safe zonom.
6. **Završetak i obaveštenja:** ova soba nema zaseban ekran završetka partije. Ima statusne poruke rang liste i Dvorane slavnih (učitavanje, prazno, greška sa ponovnim pokušajem), prikaz kvartalne nagrade i posebno obaveštenje o šampionu. Ono koristi kanonski znak odgovarajućeg kvartala i tematsku zlatnu medalju. Tekst, dugme i podloga obaveštenja vezani su za paletu teme, a dimenzije za zelenu referencu.

Automatske provere: `npm run check:theme-quarterly-league-final`. One proveravaju produkcione PNG datoteke i SHA-256 iz manifesta, putanje, kvartale, vreme intra, mere i kontrast paleta. Stvarni prikaz i dodirne zone na malom, srednjem i velikom telefonu treba dodatno potvrditi u pokrenutoj aplikaciji; HTML pregled sam po sebi to ne dokazuje.

## Stvarni Android pregled i lokalne dorade — 28.10.2026.

[44 Android snimka](theme-visual-audit/emulator-league-2026-10-28/index.html) · [rezultati i kanonske/resolved putanje](theme-visual-audit/emulator-league-2026-10-28/report.json) · [40 lokalnih Chromium provera](theme-visual-audit/emulator-league-2026-10-28/local-layout-report.json).

Pregledani su meni, Liga sa rangom Majstor, Medalje i Šampioni u svih deset tema na 360×780. U Zelenoj su dodatno otvoreni Amater i Sva vremena, sa vidljivom celom aktivnom navigacionom tačkom. Novi PNG crteži nisu bili potrebni: u tim prikazima identiteti pripadaju svojim temama. Ovo nije pregled svake stranice svih šest rangova, svih kvartala ili retkih nagradnih obaveštenja na Androidu.

Pronađeno i **lokalno ispravljeno, bez deploya**:

- **R18 — mere i tipografija:** ranija nezelenа pravila ostavljala su veći naziv trenutnog ranga, drugačiji rezime i sitnije navigacione dodire. Sada postoji jedan Green ugovor za okvir, fontove, dvokolonski rezime i navigaciju: 44px polje za dodir i 10px vidljiva tačka. Nasleđeno tablet `translate` pomeranje je uklonjeno. Dugo ime više ne skuplja avatar.
- **R19 — stanja tabova:** Vaskršnja je zadržavala svetloplavi neaktivni tab i ljubičasti aktivni tab Šampioni; Pustinjsko staklo tirkizni neaktivni tab; Severna izrazito svetlo staro aktivno stanje. Sva stanja glavnih i unutrašnjih tabova sada koriste već definisane površine, ink i akcent svoje teme. PNG i njihove dimenzije ostaju isti.

`www/theme-quarterly-league-room.css?v=9` primenjuje doradu. `npm run check:theme-quarterly-league-final` prolazi posle izmene. Dodatni `scripts/test-quarterly-league-layout-runtime.cjs` koristi stvarni renderer i CSS u potpuno izolovanom Chromium kontekstu, sa sintetičkim imenima i bez naloga/servera. Prolazi 10 tema × 4 viewporta (320×568, 360×780, 411×891, 768×1024): izračunate mere i fontovi prate Green, kartica ostaje unutar bezbednih granica, tabovi koriste tematsko mastilo, a oba HoF prikaza podnose dugo ime. Montserrat je deklarisan; offline fixture može koristiti Arial fallback. To je zaseban dokaz od pravih Android snimaka.

**Učitavanje i oporavak:** prethodni pokušaj stao je sa Android porukom „aplikacija ne odgovara”. U nastavku je emulator zatečen na Home ekranu; aplikacija je otvorena postojećom ikonom, nalog je ostao prijavljen i sve naredne sobe su odgovarale. Uzrok ranijeg ANR-a nije utvrđen. Svih devet novih prvih izbora teme u ovom prolazu vratilo je prethodnu temu; ponavljanje je uspevalo. To ostaje otvoren nalaz stabilnosti prelaska, uz ranije lokalne dorade učitavanja koje još nisu objavljene. Ne tvrdi se da je problem rešen.

Poziv Lidije Trajković odbijen je uz novo izričito odobrenje korisnika. Nisu prihvatani dueli, pokretane partije, kupovane stavke ili preuzimane nagrade. Automatski test interstitiali zatvoreni su Android Back kontrolom. Vraćena Zelena i originalnih 1440×3120/560dpi; emulator je ostavljen otvoren i prijavljen. Nema commita/deploya.

**Za posle korisnikovog deploya:** nova Android potvrda R18/R19, ponovna provera prvog učitavanja i zadržavanja teme, retka obaveštenja i stvarni fizički S25. Precizno trajanje intra nije mereno screenshotima. Galerija prikazuje objavljenu verziju pre lokalnih dorada, pa se status ne označava kao „sve ispravljeno u produkciji”.
