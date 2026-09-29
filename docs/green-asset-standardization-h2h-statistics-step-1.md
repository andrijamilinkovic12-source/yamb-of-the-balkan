# Green Asset Standardization — H2H Statistics, Korak 1

## Opseg

Ovaj korak je kompletan inventar, vizuelna i semantička dijagnoza Green H2H Statistics porodice. Nijedan aktivni runtime asset, H2H podatak, formula, modal, preload tok, motion ili UI geometrija nije promenjen.

Inventar obuhvata devet trenutno aktivnih PNG asseta:

- glavni H2H identitet;
- H2H prazno stanje;
- šest detail metričkih glyph-ova;
- jedan `VS` separator.

Analiza je zatim razdvojila šest stvarno H2H-specifičnih identiteta od tri semantička duplikata već zaključanih Statistics Overview pojmova.

## Vizuelni audit

Audit tabla: `docs/green-asset-standardization-h2h-statistics-audit.png`.

Svi postojeći asseti prate Green Room Pack DNK:

- matirani 3D Soft Clay Neumorphism;
- forest-green i warm-ivory baza sa kontrolisanim terracotta akcentom;
- meko gornje-levo osvetljenje i glinena dubina;
- transparentna pozadina bez generičke kartične podloge;
- čitljive centralne siluete.

Nije potreban novi render za šest H2H-specifičnih identiteta. Tri ponovljena pojma treba standardizovati ponovnom upotrebom već zaključanih canonical asseta, ne novim renderom.

## Semantički katalog

| Predloženi ID | Trenutni asset | Uloga | Odluka |
|---|---|---|---|
| `h2h-identity` | `statistics/h2h-v1.png` | H2H naslov, omiljeni rival i Rules H2H identitet | zaseban H2H canonical identitet |
| `h2h-empty` | `statistics/h2h-empty-v1.png` | nema H2H rivala/duela i prazan invite rival | zaseban H2H canonical state |
| `highest-score` | `statistics/h2h-detail/highest-score-v1.png` | najbolji moj rezultat protiv jednog rivala | zaseban H2H detail identitet |
| `max-win-margin` | `statistics/h2h-detail/max-margin-v1.png` | najveća pobednička razlika protiv jednog rivala | zaseban H2H detail identitet |
| `worst-loss-margin` | `statistics/h2h-detail/worst-loss-v1.png` | najveća porazna razlika protiv jednog rivala | zaseban H2H detail identitet |
| `win-streak` | `statistics/h2h-detail/win-streak-v1.png` | trenutni i najbolji niz pobeda protiv jednog rivala | koristi zaključani `canonical/statistics-overview/fire-streak-v1.png` |
| `draws` | `statistics/h2h-detail/draw-v1.png` | broj nerešenih duela protiv jednog rivala | koristi zaključani `canonical/statistics-overview/draws-v1.png` |
| `average` | `statistics/h2h-detail/average-v1.png` | moj prosečan rezultat protiv jednog rivala | koristi zaključani `canonical/statistics-overview/average-v1.png` |
| `versus` | `statistics/h2h-detail/vs-v1.png` | vizuelno suprotstavljanje dva igrača | zaseban H2H canonical identitet |

## Zašto se tri asseta ne zaključavaju kao novi identiteti

`win-streak`, `draws` i `average` menjaju opseg vrednosti — globalno ili protiv jednog rivala — ali ne menjaju sam pojam koji glyph predstavlja.

Green standard zahteva jedan stabilan vizuelni identitet po pojmu. Zato:

- H2H niz koristi isti Fire Streak identitet kao globalna Statistics metrika;
- H2H nerešeno koristi isti Draws identitet;
- H2H prosek koristi isti Average identitet.

Ovo ne spaja njihove podatke niti formule. Menja se samo buduća PNG veza, dok vrednosti ostaju striktno H2H-specifične.

`highest-score` se ne spaja sa `record`, jer prvi označava najbolji rezultat protiv izabranog rivala, a drugi najbolji sačuvani Solo rezultat. `worst-loss-margin` se ne spaja sa zbirnim `losses`, jer predstavlja veličinu jednog najtežeg poraza, ne broj poraza.

## Stvarni potrošači

### `h2h-identity`

- Statistics kartica omiljenog rivala: `16 × 16` CSS piksela;
- naslov strane Međusobni dueli: `29 × 29`;
- Rules stavka i H2H naslov: responsivni inline glyph;
- Statistics room-on-demand paket.

### `h2h-empty`

- Statistics prazno H2H stanje: `92 × 92`;
- Invite/Pronađi prijatelja prazan rival: `54 × 54`;
- Statistics room-on-demand paket.

### Detail glyph-ovi

- šest metričkih redova prikazuje glyph `26 × 26`;
- `versus` separator prikazuje se `50 × 50`;
- svi se učitavaju kroz Statistics room-on-demand paket;
- detail modal se pravi tek pri otvaranju konkretnog rivala.

## Veze sa podacima koje se ne smeju menjati

| UI red | Postojeći izvor |
|---|---|
| Najviše poena | `r.myHighScore` |
| Najveća razlika | `r.maxWinMargin` |
| Najteži poraz | `r.maxLossMargin` |
| Vatreni niz | `r.currentWinStreak` i `r.maxWinStreak` |
| Nerešeno | `r.draws` |
| Tvoj prosek poena | `round(r.myTotalScore / r.gamesWithScore)` |

H2H pregled i dalje čita normalizovani `yamb_h2h_stats`, sortira rivale po ukupnom broju međusobnih partija i otvara detail modal za izabranog rivala. Ovaj korak nije menjao nijedan od tih tokova.

## Tehnički inventar

Svaki runtime je pixel-identičan direktnom LANCZOS smanjenju svog odobrenog high-resolution RGBA izvora.

| ID | Source dimenzija / B | Runtime dimenzija / B | Source SHA-256 | Runtime SHA-256 |
|---|---:|---:|---|---|
| `h2h-identity` | `1254×1254 / 601.381` | `256×256 / 32.497` | `57929c5f401337e5181425fcc48e485a8fa8692fda247e8cd7cdcfbd96ff1fad` | `de557083a92dbb1c6a7b61286976a052ee04ad2a31db38c01708e8148aa87941` |
| `h2h-empty` | `1254×1254 / 487.661` | `384×384 / 49.705` | `c635137433b4819f3f26fbb46273c7dc6eba5db7580b5acc31dd8bee6ca9fef1` | `43bc21b1893ae56d609d69ad429cdfc502e343fcd08c1df7956bbfb74f358c70` |
| `highest-score` | `1254×1254 / 755.401` | `256×256 / 32.775` | `27703f4146facc5743be7125c78b99f04ed92413a2cdb6965f1743b488896fcd` | `82457189670699df4ab70a44f29e85f6c14233177d732a6f9ad164eb5306fe9c` |
| `max-win-margin` | `1774×887 / 292.783` | `256×128 / 8.856` | `cf0ead6d5a75ba8fdf19c0183ce5093879102af38ceb4bd2ef5c8b0f5353f0c3` | `473eb985d4f6e876134c8597f3fac345a3ba938b2094d1cec6055354355bd24c` |
| `worst-loss-margin` | `1254×1254 / 620.933` | `256×256 / 29.980` | `152d3cf6b50859125d82dfbc2b4843fd6372870d9e0469c5b593de828b56f866` | `d318a8ea88f1fb22ba8e49a05b126846789bb57c34fe564841261710b429ab21` |
| `win-streak` | `1254×1254 / 733.108` | `256×256 / 33.800` | `9d41a26dd8d88de12077aebf802d043b7ff082bf2c784d0b5a0897123cfd0ffd` | `60cc3483eff946fa1799e917638e26c71ac18e1a2971c471f80db316f9824b8e` |
| `draws` | `1254×1254 / 301.985` | `256×256 / 14.738` | `518d3625af0e3aa2eb73e6ff454f6853d4552df9e49f421b893ed65ab80892e3` | `c7b3f7a153cc8845912213a0bda927c4b8ad3ec4f059ef3c0b519e5a8f93197c` |
| `average` | `1254×1254 / 547.973` | `256×256 / 23.765` | `65091937c55b29790f43a206c4d3fa342913fe7656e758ab66c516c439a3134d` | `f1ed16540bea0e16e7bac4f24891ef3c9f75d9e8997372ab1eafc90f52bb0307` |
| `versus` | `1254×1254 / 991.778` | `256×256 / 52.887` | `b519eb42eb2dac64fea5b646574df495b628681a1c55cb7c35508c42501136ab` | `c4b26891699042c903f204c3551b9d6bf526642dd96c90bcc630e648dde54534` |

Devet trenutnih izvora zauzima `5.333.003` bajta, a runtime paket `279.003` bajta i približno `2,44 MB` dekodirane memorije.

Široki `max-win-margin` izvor `1774 × 887` i runtime `256 × 128` su namerni: glyph je horizontalna razlika između dve spoljne strelice i ne sme se razvlačiti na kvadrat.

## Šest budućih H2H canonical mastera

Canonical H2H paket treba da napravi sopstvene master/runtime identitete samo za:

1. `h2h-identity`;
2. `h2h-empty`;
3. `highest-score`;
4. `max-win-margin`;
5. `worst-loss-margin`;
6. `versus`.

Preostale tri uloge source manifest evidentiraće kao spoljne canonical reference ka zaključanoj `statisticsOverview` porodici. Tako centralni registar ostaje eksplicitan, ali se isti pojam ne duplira.

## Semantičke granice

H2H Statistics ostaje odvojen od:

- zbirnih Statistics Overview vrednosti i njihovih formula;
- Solo Record i Personal Best stanja;
- zbirnih Wins/Losses brojača i pojedinačnih match rezultata;
- Hotseat Winner, Online result i Invite result identiteta;
- Power Index, trofeja, medalja i league/tournament rangova;
- avatara i prijateljskih/online statusa;
- gameplay kockica, skinova, navigation i Economy identiteta.

Ponovna upotreba Fire Streak, Draws i Average glyph-ova deli samo vizuelni identitet pojma; ne spaja H2H i globalne podatke.

## Performance baseline i projekcija

Trenutno stanje:

- Green tema: `172 PNG`, `15,81 MB`;
- startup: `17 PNG`, `4,56 MB / 20,44 MB decoded`;
- Statistics room: `21 PNG`, `940.096 B / 7.274.496 decoded B`;
- svih devet H2H runtime asseta: `279.003 B / 2.555.904 decoded B`.

Ako se u Koraku 3 uklone tri semantička duplikata i njihove veze preusmere na već prisutne Overview canonical assete, očekivani rezultat je:

- Green tema: `169 PNG`;
- Statistics room: `18 PNG`, približno `867.793 B / 6.488.064 decoded B`;
- H2H-specifični runtime sadržaj: šest PNG, `206.700 B`.

Startup se ne menja, jer ni trenutni ni budući H2H asseti ne pripadaju startup kritičnoj putanji.

## Sledeći korak

Korak 2 je izrada canonical `h2h-statistics` paketa:

1. čuvanje šest odobrenih native high-resolution mastera;
2. determinističko izvođenje njihovih runtime PNG-ova uz očuvanje `384 × 384` empty state i `256 × 128` max-margin formata;
3. source manifest sa devet semantičkih uloga, od kojih tri upućuju na zaključane Overview canonical identitete;
4. početna automatska kontrola dimenzija, alpha kanala, SHA-256 otisaka, LANCZOS reprodukcije i međuporodičnih referenci;
5. bez promene aktivnih UI putanja do integracionog Koraka 3.

Nije rađen commit niti objavljivanje.
