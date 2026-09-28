# Green Asset Standardization — Tournament Navigation, Korak 4

## Ishod

Green Tournament Navigation katalog završno je vizuelno, semantički i tehnički proveren. Centralni registar i source manifest sada imaju status `locked`.

Ovaj korak nije menjao vizuelni sadržaj, tab akcije, Tournament podatke, fallback ponašanje, sadržaj Pravila niti geometriju interfejsa.

## Zaključani katalog

| ID | Uloga | Zaključana silueta |
|---|---|---|
| `tab-info` | informacije i pravila Turnira | ivory information mark unutar forest-green prstena sa terracotta akcentom |
| `tab-bracket` | kostur i mečevi Turnira | simetrični osmočlani kostur sa jednom centralnom terracotta zvezdom |
| `tab-hall-of-fame` | istorija i šampioni Turnira | ivory istorijski svitak sa forest-green linijama i jednim terracotta pečatom |

Jedan Tournament navigation ID uvek koristi jedan isti canonical Green PNG identitet.

## Zaključana ponovna upotreba svitka

`tab-hall-of-fame` ima dva semantički podudarna potrošača:

1. Tournament Hall of Fame tab;
2. odgovarajuća Tournament Hall of Fame referenca u Pravilima.

Ponovna upotreba je namerna jer oba mesta predstavljaju isti sadržaj istorije Turnira. Svitak se ne koristi za Quarterly League Hall of Fame, registraciju, stanje meča, finalist nagradu ili generički winner simbol.

## Zaključani vizuelni DNK

Sva tri glyph-a zadržavaju:

- matirani 3D Soft Clay Neumorphism materijal;
- forest-green, warm-ivory i terracotta paletu;
- centralni semantički glyph na transparentnoj pozadini;
- odsustvo kartice, teksta i dekorativne scene;
- meko gornje-levo osvetljenje i kontrolisanu glinenu dubinu;
- jasne, međusobno različite siluete pri malom prikazu.

## Zaključani potrošači

| Površina | Veza |
|---|---|
| Tournament Info tab | `tab-info-v1.png` |
| Tournament Bracket tab | `tab-bracket-v1.png` |
| Tournament Hall of Fame tab | `tab-hall-of-fame-v1.png` |
| Rules Tournament Hall of Fame referenca | isti `tab-hall-of-fame` identitet |
| Tournament room paket | tri eksplicitne canonical putanje |

Tab akcije, active stanje, ARIA atributi, fallback SVG sadržaj i room-on-demand ponašanje ostaju nepromenjeni.

## Integritet paketa

Zaključavanje pokriva:

- tri canonical master PNG fajla u originalnim odobrenim rezolucijama;
- tri canonical runtime PNG fajla rezolucije `256 × 256`;
- direktan alpha kanal svih šest fajlova;
- SHA-256 otisak svakog master/runtime fajla;
- tačan skup, redosled i siluetu tri ID-ja;
- odsustvo dupliranog runtime sadržaja;
- identične manifest i registry putanje, dimenzije i otiske;
- 1:1 mapiranje navigation ID-ja na canonical PNG.

Bracket zadržava odobrene `246 × 256` vidljive piksele bez resamplovanja, centrirane na `x = 5` unutar transparentnog `256 × 256` canvasa.

## Semantičke granice

Tournament Navigation ostaje odvojena od:

- Tournament registration i match-state ikona;
- Tournament finalist nagrade;
- Tournament winner trofeja, intro i glavnog logotipa;
- Quarterly League navigacije i rank bedževa;
- Quarterly League i General Podium medalja;
- Treasury navigacije, Collection medalja i achievement trofeja;
- zbirnog Statistics trophies simbola;
- winner i victory-state oznaka;
- dukata i potrošnih tokena.

Zajednički motiv zvezde, svitka ili ivory/green materijala ne dozvoljava zamenu između porodica. Navigacioni glyph bira sadržaj sobe; ne predstavlja status, nagradu, rang ili rezultat partije.

## Zabranjene stare putanje

Tri stare `tournament/tab-*-v1.png` runtime putanje ostaju evidentirane kao zabranjene. Automatska kontrola pada ako se vrati stari fajl ili aktivna referenca. Istorijski source asseti ostaju sačuvani i mapirani na canonical zamene.

## Automatska kontrola

`check-theme-performance.js` proverava:

- `locked` status registra i source manifesta;
- evidentiran završni audit;
- tačan skup, redosled i semantičku siluetu tri ID-ja;
- zaključani vizuelni DNK i nepromenljivo ID-to-PNG mapiranje;
- dimenzije, alpha kanal, SHA-256 integritet i jedinstvenost sadržaja;
- manifest/registry podudaranje;
- tri tab veze, Rules Hall of Fame referencu i room-on-demand veze;
- bracket canvas normalizaciju;
- odsustvo starih runtime fajlova i aktivnih referenci;
- očuvanje semantičkih izuzetaka i Tournament room preload izolacije.

## Performanse pri zaključavanju

- Green tema: `173 PNG`, ukupno `16,81 MB`.
- Startup paket: `17 PNG`, `4,56 MB` kompresovano / `20,44 MB` procenjeno dekodirano.
- Najveći Green room paket: Riznica, `44 PNG`, `2,94 MB` kompresovano / `13,70 MB` procenjeno dekodirano.

Tournament Navigation glyph-i se ne učitavaju na startup-u. Učitavaju se kroz Tournament room paket.

## Pravilo za buduće izmene

Promena bilo kog zaključanog glyph-a zahteva novu verziju mastera i runtime asseta, ažuriranje oba SHA-256 otiska, source manifesta, centralnog registra i svih njegovih aktivnih veza. Postojeći canonical fajl ne sme se tiho prepisivati, a navigacioni simbol ne sme biti zamenjen registration, match-state, finalist, trophy, rank, podium ili winner assetom.

Nije rađen commit niti objavljivanje.
