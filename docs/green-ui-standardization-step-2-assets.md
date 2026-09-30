# Green UI standardizacija — korak 2: izolacija asseta

Datum: 2026-09-29. Opseg je isključivo Zelena tema (`dark` je interni ID). Status: **kod i regresija provereni; vizuelni prolaz svih soba nije završen**. Nije rađen native build, commit niti objavljivanje.

## Nalazi i izmene

| Površina | Nalaz / kontrola | Ishod |
|---|---|---|
| Glavni meni i početno učitavanje | Na otvorenom emulatoru Green meni prikazuje Green ikone, pozadinu i kartice; nema vidljivog starog SVG-a u tom stanju. U statičkom HTML-u nije nađen direktan `src` ka Easter, Desert ili Severna assetu. | Vizuelno potvrđeno samo za otvoreni meni; ostala stanja menija su otvorena. |
| Pravila, svih 6 strana, SR/EN | Svih 40 različitih Easter referenci u sadržaju imaju Green PNG mapiranje i ciljna datoteka postoji. Nađeno je 10 nepovezanih tekstualnih emoji oznaka u SR/EN koje su bile vidljive i u Green prikazu. | Oznake su omotane i sakrivene samo u Green temi. Tekst i prikaz ostalih tema ostaju isti. Dodata automatska provera svih 40 referenci i nepovezanih oznaka. |
| Green intro: Dnevni izazov, Turnir, Kvartalna liga | Stari SVG ostaje u zajedničkom HTML-u kao fallback drugih tema. Kod primenjuje `theme-dark` pre prikaza uvoda, a CSS sakriva te stare markere i prikazuje Green PNG. | Ugovor je zaštićen regresionim testom; sam intro nije ponovo vizuelno pregledan u ovom koraku. |
| Ostale sobe, rezultati, popup i dinamička stanja | U `www` postoji 23 direktnih `src` referenci na generičke SVG datoteke; one imaju Green-specific CSS zamene/skrivanje. Nema direktnog `src` ka PNG-u Easter, Desert ili Severna teme u HTML/JS. | Statička provera je prošla. Ona ne dokazuje da je svaki dinamički ekran vizuelno ispravan. |

Posebno: Google znak za prijavu i sistemski Android simboli nisu asseti teme i nisu menjani. Nisu uklonjeni zajednički SVG fallbacki, jer ih ostale teme još koriste; Green izolacija je u prikazu i u aktivnom učitavanju, ne u brisanju zajedničkih izvora.

## Provera

- `npm.cmd test` — prošlo, uključujući JavaScript, pravila igre, online tokove, asset coverage i theme performance.
- `scripts/check-theme-performance.js` sada proverava sve Rules reference i redosled prikaza tri uvoda, ne samo nekoliko uzoraka.
- `www/index.html` dobio je nove verzije za `teme.css` i `pravilaigre.js`, da ponovo učitana aplikacija ne zadrži staru kopiju.

## Šta ostaje otvoreno

Otvorena aplikacija na emulatoru je tokom provere još pokazivala staru, pre izmena učitanu stranu Pravila (emoji 🎯). To **nije** dokaz da nova izmena ne radi, niti vizuelna potvrda da radi: već otvoren WebView ne učitava novi JavaScript samo zato što je fajl promenjen. Potrebno je ponovno učitavanje aplikacije i pregled svih šest strana SR/EN, pa zatim svake dinamičke sobe i popup stanja iz mape koraka 1. A1 ostaje otvoren do tih provera; ne prelaziti na sledeću grupu kao da je izolacija vizuelno završena.
