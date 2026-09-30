# Green UI standardizacija — korak 1: mapa problema i provere

Datum: 2026-09-29. Opseg: samo zelena tema (`dark` je njen interni ID). Ovaj dokument je inventar, ne potvrda da je UI završen. Nema builda, commita ni objavljivanja u ovom koraku.

## Kako čitati status

- **Prijavljeno**: korisnik je video problem ili traži proveru; tačan uzrok i sva mesta pojavljivanja još nisu potvrđeni.
- **Kod postoji**: u radnoj kopiji već postoji ispravka ili zaštita, ali sama po sebi ne potvrđuje izgled na telefonu.
- **Vizuelno potvrđeno**: konkretno stanje je viđeno na emulatoru. Potvrda jedne sobe/strane ne važi automatski za sve sobe/strane.
- **Otvoreno**: treba proveriti, izmeniti ako je potrebno i ponovo vizuelno potvrditi.

Prethodni emulator QA pokriva splash/glavni meni, Podešavanja i pregledane strane Pravila, uz ograničenja opisana u `docs/green-emulator-visual-qa-2026-09-29.md`. Testovi `npm test` proveravaju kod, ponašanje i assete; ne zamenjuju pregled svakog UI stanja na emulatoru.

## Registar svih zahteva

| ID | Tehnička grupa | Sve što ulazi u proveru | Početno stanje |
|---|---|---|---|
| T1 | Tipografija i čitljivost | Font porodica, težina, naslovi, podnaslovi, običan tekst, brojevi, oznake, tekst dugmadi, line-height, razmak slova, prelamanje dugih naziva; srpski i engleski | Prijavljeno; deo Green CSS pravila postoji; otvorena provera svake sobe |
| T2 | Kontrast obaveštenja i modala | Tamnozeleni/crnkasti tekst koji se stapa s podlogom; naslov i poruka u toastu, potvrdi, grešci i upozorenju; tekst na svim bojama kartica i u poljima za unos | Prijavljeno; CSS izmena postoji; stvarni toast/modal na emulatoru nije potvrđen |
| G1 | Kartice i unutrašnji raspored | Širina, visina, minimalna/maksimalna mera, padding, gap, radius, okvir, skrol i poravnanje sadržaja; doslednost među Green sobama i geometrijsko poređenje s Vaskrs/Pustinjsko staklo | Prijavljeno za proveru; deo zajedničkih shell mera proveren u browseru, ne sve sobe |
| G2 | Dugmad i zatvaranje | Svi X tasteri, položaj, vizuelna mera, klik-zona, kontrast, aktivno/onemogućeno stanje; ponavljajuća primarna i sekundarna dugmad | Prijavljeno; Green CSS zajedničkog X postoji; vizuelno potvrđena samo neka mesta |
| P1 | Centriranje i containment | Šest kockica u Dnevnom izazovu, Google avatari u modovima, ikone, bedževi, brojke i duga imena: ništa ne izlazi iz kartice, ne biva odsečeno niti narušava centar | Kockice i avatari prijavljeni; CSS zaštite postoje; ciljane sobe nisu vizuelno potvrđene |
| S1 | Safe area i responsivnost | Status bar/notch, bočne ivice, sistemska donja navigacija, kratki/uski ekran, tastatura, scroll i fiksirana zaglavlja/podnožja | Prijavljeno; deo CSS zaštita postoji; neprovereno u svim sobama/stanjima |
| N1 | Navigacija kroz strane | Pravila, Statistika/H2H i Kvartalna liga: tačke/strelice, aktivno stanje, zona dodira, swipe, sinhronizacija oznake i prikazane strane, povratak na stranu | Prijavljeno; kontrole u kodu dopunjene; puni vizuelni i dodirni QA otvoren |
| A1 | Green asseti i izolacija tema | SVG i PNG elementi SVG porekla, stari emoji/fallback, PNG iz drugih tema, pogrešan motiv za naslov; statički i dinamički elementi, intro, popup i loading; canonical Green identitet | Prijavljeno; deo referenci i menija ispravljen; proveru treba završiti u svim sobama |
| Q1 | Stanja i pristupačnost | Loading, empty, error, success, disabled, zaključano, dugačak tekst, oba jezika, promena teme, fokus/aria i smanjeni motion gde postoji | Dodatna preventivna grupa; najveći deo vizuelne provere otvoren |

T1 i T2 nisu isto: čitljiv font na običnoj kartici ne dokazuje čitljiv toast. G1 i P1 nisu isto: pravilna veličina kartice ne dokazuje da su kockice ili avatar centrirani unutar nje.

## Mapa Green površina i kritičnih stanja

**Svaki red prolazi svih devet grupa** T1, T2, G1, G2, P1, S1, N1, A1 i Q1; oznaka „fokus“ navodi gde je povećan rizik. `—` znači da određena kontrola, npr. pager, ne postoji na toj površini i to treba evidentirati kao *nije primenljivo*, ne kao uspešan test.

| Površina / soba | Obavezna stanja za vizuelni prolaz | Poseban fokus i izvor |
|---|---|---|
| Splash, glavni meni i uvodi soba | Prvo učitavanje; top kartice, 4 moda, 5 donjih ikona, Riznica/Turnir; Green intro po sobi | T1/G1/A1/S1; `www/index.html`, `www/game.js`, `www/teme.css` |
| Dnevni izazov | Intro; zadatak sa svih 6 kockica; rezultat; već odigrano; dostupna/nedostupna nagrada | P1 kockice, T2 popup, S1; `www/dnevniizazov.js` |
| Top lista | Globalna/lokalna; učitavanje/prazno; red igrača, sopstvena pozicija, duže ime, učitavanje dodatnih redova | T1/G1/P1/A1; `www/toplista.js`, `www/index.html` |
| Statistika | Prva strana, svi metrika blokovi, duge vrednosti i naslovi | T1/G1/N1; `www/index.html`, `www/game.js` |
| H2H međusobni dueli | Prazno stanje, lista rivala, izabran rival, Google avatar, detaljni rezultati | P1 avatar, N1, T1; `www/index.html`, `www/game.js` |
| Podešavanja | Gost/prijavljen profil; Google avatar; ime; zvuk/muzika/vibracija; tema i jezik; pravni linkovi; X | T1/G2/P1/S1; `www/index.html`, `www/game.js` |
| Turnir | Info, bracket, Dvorana slavnih; prijava/odjava/zaključano; meč i rezultat | G1/G2/T2/A1; `www/turnir.js`, `www/index.html` |
| Riznica | Tabovi Trofeji/Kockice/Efekti/Teme; dostupno/kupljeno/aktivno/zaključano; nedovoljno dukata; popup | G1/T2/A1/P1; `www/riznica.js`, `www/index.html` |
| Global chat | Prazno/poruke; duga poruka; unos, tastatura, slanje/greška; X | T1/T2/S1/G2; `www/globalchat.js`, `www/index.html` |
| Online igrači | Loading/prazno/lista; pretraga; duga imena; avatar; akcije prijatelj/duel/gledanje; X | P1/T1/G1/S1; `www/onlinenumber.js`, `www/index.html` |
| Dukati i Ispravi zadnji upis | Saldo, nagradni video i nedostupnost; Undo token; potvrda, greška, nedovoljno sredstava | T2/G2/A1/S1; `www/vracanjeupisa.js`, `www/index.html` |
| Kvartalna liga | Svaki rank; sve navigacione sekcije; lična pozicija; medalje; duga imena; X i pager | N1/G1/T1/G2/S1; `www/kvartalnaliga.js` |
| Solo mod | Izbor/nastavak; igra; rezultat, lični rekord, nagrada, zatvaranje | G1/G2/T2/P1/A1; `www/game.js`, `www/index.html` |
| Dva igrača (Hotseat) | Izbor/nastavak; igra; promena igrača; pobeda/remi; rezultat | G1/G2/P1/A1; `www/game.js`, `www/index.html` |
| Online random | Traženje, pronađen rival, oba Google avatara, VS; prekid/ponovno povezivanje; igra/rezultat | P1 avatari, T2/S1/A1; `www/game.js`, `www/index.html` |
| Pozovi/pronađi prijatelja | Host/join; prazno, poslato/prihvaćeno; rival kartica i avatar; waiting/igra | P1 avatari, T2/G1/A1; `www/game.js`, `www/index.html` |
| Pravila — sve strane | Svih 6 strana posebno, SR i EN; naslovi i njima odgovarajući asseti; duži tekst, skrol, pager, X | T1/N1/A1/S1; `www/pravilaigre.js` |
| Zajednički toast, modal i završni ekran | Informacija, uspeh, greška, potvrda/otkazivanje; duža poruka; game-over po modu | T2/G2/S1/A1; `www/onlinenumber.js`, `www/index.html` |

Kontrolna matrica ispod sprečava da fokus iz poslednje kolone bude pogrešno protumačen kao jedini opseg provere. `□` znači **otvoreno za proveru**, čak i kad već postoji CSS izmena; `—` znači da ta površina nema pager iz N1.

| Površina | T1 | T2 | G1 | G2 | P1 | S1 | N1 | A1 | Q1 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Splash, meni, intro | □ | □ | □ | □ | □ | □ | — | □ | □ |
| Dnevni izazov | □ | □ | □ | □ | □ | □ | — | □ | □ |
| Top lista | □ | □ | □ | □ | □ | □ | — | □ | □ |
| Statistika | □ | □ | □ | □ | □ | □ | □ | □ | □ |
| H2H | □ | □ | □ | □ | □ | □ | □ | □ | □ |
| Podešavanja | □ | □ | □ | □ | □ | □ | — | □ | □ |
| Turnir | □ | □ | □ | □ | □ | □ | — | □ | □ |
| Riznica | □ | □ | □ | □ | □ | □ | — | □ | □ |
| Global chat | □ | □ | □ | □ | □ | □ | — | □ | □ |
| Online igrači | □ | □ | □ | □ | □ | □ | — | □ | □ |
| Dukati / Undo | □ | □ | □ | □ | □ | □ | — | □ | □ |
| Kvartalna liga | □ | □ | □ | □ | □ | □ | □ | □ | □ |
| Solo | □ | □ | □ | □ | □ | □ | — | □ | □ |
| Hotseat | □ | □ | □ | □ | □ | □ | — | □ | □ |
| Online random | □ | □ | □ | □ | □ | □ | — | □ | □ |
| Pozovi prijatelja | □ | □ | □ | □ | □ | □ | — | □ | □ |
| Pravila, 6 strana | □ | □ | □ | □ | □ | □ | □ | □ | □ |
| Zajednički popup / kraj igre | □ | □ | □ | □ | □ | □ | — | □ | □ |

## Granica onoga što je do sada dokazano

1. Raniji QA beleži prikaz Green menija, Podešavanja i pregledanih strana Pravila na postojećem APK-u sa lokalnim web sadržajem. To **nije** potvrda za online tokove, sve sobe ili novi native build.
2. U radnoj kopiji postoje Green pravila za kontrast toasta, hijerarhiju teksta, X dugmad, Dnevne kockice, avatar containment, safe-area i pager. Svi ti zapisi imaju status **kod postoji**, dok ne prođu odgovarajuće stvarno stanje i vizuelni dokaz.
3. U lokalnom browseru je potvrđeno da Green glavni meni ne prikazuje SVG slike ni slike iz drugih tema. Dinamičke sobe, rezultati i poruke još zahtevaju zasebnu proveru A1.
4. Jedan uspešan automatski test ili jedna slika neće zatvoriti celu grupu. Grupa se zatvara tek kada su sve primenljive površine iz gornje tabele pregledane i odstupanja ispravljena.

## Protokol za naredne korake

Za svaku grupu: (1) otvoriti sva relevantna stanja, (2) izmeriti/beležiti odstupanja i snimiti početni prikaz, (3) menjati samo Green-specifičan kod/asset, (4) ponoviti SR/EN i relevantna stanja na uskom i standardnom mobilnom viewportu, (5) uporediti slike, (6) pokrenuti testove i proveru ostalih tema, (7) označiti svaki red kao potvrđen ili ostaviti precizan otvoren nalaz.

Redosled: **korak 2 A1** izolacija asseta → **korak 3 T1/T2** tekst i kontrast → **korak 4 G1/G2** kartice i kontrole → **korak 5 P1** centriranje/containment → **korak 6 S1** safe area → **korak 7 N1** paginacija → **korak 8 Q1** stanja i lokalizacija → **korak 9** vizuelni prolaz svake sobe i regresija. Nijedna grupa se ne proglašava završenom samo na osnovu CSS-a ili statičke analize.
