# Pregled jedinstvenog DNK asseta — 10. oktobar 2026.

**Naknadni status:** ilustratorska verzija v3 je zaustavljena radi standardizacije identiteta soba. [Svetlo zlato](theme-medals-light-v3.md) ima 18 zasebno generisanih i tehnički povezanih, ali **privremenih** medalja. Trula Višnja ima samo radne mastere. Nijedan v3 paket medalja nije prihvaćen dok se motivi ne usklade sa kanonskim ikonama soba. Pregled ispod opisuje raniju tehničku reviziju v2; njeno povezivanje nije vizuelno prihvatanje preostalih tema.

## Obuhvat i rezultat

**Vizuelni presek posle korisničke provere:** trofeji su poslednja porodica izrađena kao zasebne ilustracije po temi. Medalje, kontrole Riznice i pregledi efekata jesu stvarni povezani PNG fajlovi, ali njihova izrada koristi zajedničke programske šablone. Različite boje, unutrašnji motivi, hash vrednosti i varijacije siluete ne čine ih automatski jedinstvenim DNK paketima. Ove tri porodice su **vizuelno neprihvaćene i označene za novo oblikovanje**, tema po tema. Postojeće produkcione datoteke ostaju tehnički povezane dok ih nove ne zamene.

Katalog zahteva 186 PNG uloga po temi. Mapa devet novih tema trenutno za svaku beleži 108 povezanih, dve napravljene ali još nepovezane i 76 samo definisanih uloga. Glavne pozadine se vode zasebno u prihvaćenom manifestu; njihov status `defined` u ovoj mapi nije tvrdnja da pozadina nedostaje. Zelena je referenca, sa izuzecima koje je korisnik posebno tražio.

| Porodica | Nalaz | Postupak |
|---|---|---|
| Medalje: 18 po temi | **Potvrđen problem v1:** šest različitih namena koristilo je isti apstraktni jezik znakova kroz teme. Različit hash i promenjen spoljašnji obris nisu bili dovoljan DNK. | Zamenjeno 162 medalje u devet novih tema i devet naknadno dodatih medalja Zelene. Svaka namena sada koristi motiv iz sopstvene teme, uz rang na obodu. Devet ranije prihvaćenih medalja Zelene nije dirano. |
| Kontrole Riznice: osam po temi | **Potvrđen problem v1:** uglavnom zajednički crtež sa promenjenim bojama i malim promenama obrisa. | Zamenjene 72 kontrole devet novih tema. Tri taba koriste već postojeće motive sopstvene teme, tab Teme i statusi imaju posebne oblike i reljef. Zelene kontrole nisu dirane. |
| Pregledi efekata Riznice: 14 po temi | Ranije su nove teme koristile CSS/emoji prikaze bez kompletnog kanonskog tematskog PNG paketa. | Izrađeno i povezano 126 PNG prikaza: zasebne kompozicije i geometrijske varijacije po temi, uz materijal i paletu te teme. Kontakt table su otvorene za korisnički vizuelni pregled; Android WebView još nije potvrđen. Zeleni paket ostaje zaključan. |
| Pozadine i logotipi | Pozadine su već izabrane i zaključane; logotipi imaju zasebne tematske izvedbe. | Bez izmene u ovoj reviziji. |
| Glavne ikone soba i trofeji | Pregledani uzorci Svetlog Zlata, Neon Cybera, pojedinačnih soba i trofeja imaju različite kompozicije, materijale i palete. | Nema potvrđenog kršenja u pregledanim uzorcima; svih 26 trofeja i sve sobe ostaju predmet završnog vizuelnog pregleda. |
| Dukati, Undo i nagradni video | Pregledani uzorci imaju prepoznatljiv oblik funkcije, ali različitu materijalnu obradu. Pet tačaka na dukatu je obavezno zajedničko pravilo. | Nije potvrđeno puko prebojenje u pregledanim parovima; sistematski pregled svih prikaza ostaje otvoren. |
| Ostalih 76 definisanih uloga po novoj temi | Ciljne uloge još nisu sve izvedene i povezane kao novi kanonski asseti. | Izrada se nastavlja po katalogu, tema po tema. Njihovo postojanje u starim runtime folderima nije dokaz usklađenosti. |

U DNK reviziji aktivno je zamenjeno **243 PNG-a**: 171 medalja i 72 kontrole Riznice. Novi masteri imaju sufiks `master-v2.png`, dok produkcione putanje zadržavaju kanonska imena radi svih postojećih potrošača. `www/config.js` dodaje `?v=2` za učitavanje novih bajtova. Stari v1 masteri su istorijski izvori i ne smeju se ponovo pustiti kroz v1 generatore. Naredni paket dodaje 126 zasebnih PNG pregleda efekata.

## Način provere

`scripts/audit-theme-asset-dna.py` meri preklapanje vidljive siluete iste uloge kroz devet tema. [Mašinski izveštaj](theme-asset-dna-silhouette-audit.json) sadrži parove sa IoU ≥ 0,86. Visoka sličnost spoljašnje kružne kovanice, otvorene knjige ili simbola četiri kvartala nije dokaz kopiranja; niska sličnost takođe nije dokaz originalnosti. Parovi se zato pregledaju kao slike i prema poreklu mastera. Ovaj audit je otkrio, između ostalog, dve praktično iste izvedbe taba Teme i previše slične katance; korigovani su pre ovog zapisa.

Kod 14 novih uloga pregleda efekata audit nije označio nijedan međutematski par na pragu 0,86. To je pomoćni dokaz različitih silueta, uz pregled devet kontakt tabli.

Statičke provere `check-theme-medals.js`, `check-theme-treasury-controls.js`, `check-theme-design-spec.js` i `check-js.js` proveravaju format, putanje i kod. One **ne potvrđuju estetsko prihvatanje**. Novi [Android qaLocal izveštaj](qa-theme-dna-medals-controls-emulator-2026-10-10.json) potvrđuje da je svih osam kontrola i 18 medalja učitano u deset tema, kao i veličinu tabova od 34 px. Snimci Svetlog Zlata i Neon Cybera prikazuju kontrole u Riznici. Medalje u stvarnim rezultatima takmičenja i korisnički vizuelni izbor i dalje čekaju proveru.

## Pregled nove verzije

- [Medalje svih deset tema](theme-medals-review.html)
- [Kontrole Riznice svih deset tema](theme-treasury-controls-review.html)
- [Pregledi efekata Riznice u devet tema](theme-effect-previews-review.html)

Pravilo za naredne pakete: uporediti istu semantičku ulogu na 44 px kroz sve teme, proveriti siluetu, kompoziciju, reljef, materijal i paletu, pa tek onda označiti vizuelno prihvaćenom. Različit SHA-256 i prolaz tehničkog testa nisu dovoljni.
