# Green Asset Standardization — Quarterly League Navigation, Korak 4

## Ishod

Green Quarterly League Navigation katalog završno je vizuelno, semantički i tehnički proveren. Centralni registar i source manifest sada imaju status `locked`.

Ovaj korak nije menjao vizuelni sadržaj, tab akcije, League ili Hall of Fame podatke, champion podatke, fallback ponašanje niti geometriju interfejsa.

## Zaključani katalog

| ID | Uloga | Zaključana silueta |
|---|---|---|
| `tab-league` | žive ligaške rang-liste | rastući stubići sa jednom ivory zvezdom |
| `tab-hall-of-fame` | Dvorana slavnih | ceremonijalna građevina sa jednom terracotta zvezdom |
| `tab-medals` | arhiva QL medalja | gold, silver i bronze trio sa QL trakom |
| `tab-champions` | arhiva i oznaka šampiona | ivory kruna unutar forest-green lovora |

Jedan navigacioni ID uvek koristi jedan isti canonical Green PNG identitet.

## Zaključana dvostruka upotreba Šampiona

`tab-champions` je jedini identitet u porodici sa dva potrošača:

1. Hall of Fame podtab Šampioni;
2. champion marker na kartici šampiona.

Ova ponovna upotreba je namerna jer oba mesta predstavljaju isti pojam šampiona. Simbol se ne koristi kao generička winner ili victory-state oznaka jedne partije.

## Zaključani vizuelni DNK

Sva četiri glyph-a zadržavaju:

- matirani 3D Soft Clay Neumorphism materijal;
- forest-green, warm-ivory i terracotta paletu;
- centralni semantički glyph na transparentnoj pozadini;
- odsustvo kartice, teksta i dekorativne scene;
- meko gornje-levo osvetljenje i kontrolisanu glinenu dubinu;
- čitljivu i međusobno različitu siluetu pri prikazu od 28–30 CSS piksela.

## Zaključani potrošači

| Površina | Veza |
|---|---|
| Glavni tab Liga | `getQlAssetSource('tab-league')` |
| Glavni tab Dvorana slavnih | `getQlAssetSource('tab-hall-of-fame')` |
| Podtab Medalje | `getQlAssetSource('tab-medals')` |
| Podtab Šampioni | `getQlAssetSource('tab-champions')` |
| Champion marker | isti `tab-champions` identitet |
| Quarterly League room paket | četiri eksplicitne canonical putanje |

## Integritet paketa

Zaključavanje pokriva:

- četiri canonical master PNG fajla rezolucije `512 × 512`;
- četiri canonical runtime PNG fajla rezolucije `256 × 256`;
- direktan alpha kanal svih osam fajlova;
- SHA-256 otisak svakog master/runtime fajla;
- tačan skup, redosled i glyph četiri ID-ja;
- odsustvo dupliranog runtime sadržaja;
- identične manifest i registry putanje, dimenzije i otiske;
- 1:1 mapiranje navigation ID-ja na canonical PNG.

`tab-champions` optimizacija sa 384 na 256 px ostaje zaključana kao izvedenica istog odobrenog 512 px mastera.

## Semantičke granice

Quarterly League Navigation ostaje odvojena od:

- Quarterly League rank bedževa;
- Quarterly League i General Podium medalja;
- Tournament i Treasury navigacionih tabova;
- Treasury Collection medalja i achievement trofeja;
- Tournament finalist nagrade;
- zbirnog Statistics trophies simbola;
- winner i victory-state oznaka;
- glavnog Quarterly League logotipa i intro asseta;
- dukata i potrošnih tokena.

Zajednički motiv zvezde, krune ili medalje ne dozvoljava zamenu između ovih porodica, jer navigacioni glyph bira sadržaj sobe i ne predstavlja rang, nagradu ili rezultat partije.

## Zabranjene stare putanje

Četiri stare `ql/tab-*-v1.png` runtime putanje ostaju evidentirane kao zabranjene. Automatska kontrola pada ako se vrati stari fajl ili aktivna referenca. Istorijski 512 px source asseti ostaju sačuvani i mapirani na canonical zamene.

## Automatska kontrola

`check-theme-performance.js` proverava:

- `locked` status registra i source manifesta;
- evidentiran završni audit;
- tačan skup, redosled i semantičku siluetu četiri ID-ja;
- zaključani vizuelni DNK i nepromenljivo ID-to-PNG mapiranje;
- dimenzije, alpha kanal, SHA-256 integritet i jedinstvenost sadržaja;
- manifest/registry podudaranje;
- resolver, četiri tab veze, champion marker i room-on-demand veze;
- evidentiranu `tab-champions` optimizaciju;
- odsustvo starih runtime fajlova i referenci;
- očuvanje semantičkih izuzetaka i room preload izolacije.

## Performanse pri zaključavanju

- Green tema: `173 PNG`, ukupno `16,81 MB`.
- Startup paket: `17 PNG`, `4,56 MB` kompresovano / `20,44 MB` procenjeno dekodirano.
- Najveći Green room paket: Riznica, `44 PNG`, `2,94 MB` kompresovano / `13,70 MB` procenjeno dekodirano.

Navigacione ikone se ne učitavaju na startup-u. Učitavaju se kroz Quarterly League room paket. Standardizacija je smanjila Green paket za približno 61 KB.

## Pravilo za buduće izmene

Promena bilo kog zaključanog glyph-a zahteva novu verziju mastera i runtime asseta, ažuriranje oba SHA-256 otiska, source manifesta, centralnog registra i room veze. Postojeći canonical fajl ne sme se tiho prepisivati, a navigacioni simbol ne sme biti zamenjen rank bedžom, podium medaljom, trofejem, finalist nagradom ili winner oznakom.

Nije rađen commit niti objavljivanje.
