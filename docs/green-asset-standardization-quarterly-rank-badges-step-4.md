# Green Asset Standardization — Quarterly League Rank Badges, Korak 4

## Ishod

Green Quarterly League Rank Badges katalog završno je vizuelno, semantički i tehnički proveren. Centralni registar i source manifest sada imaju status `locked`.

Ovaj korak nije menjao vizuelni sadržaj, rank ID-jeve, bodovne pragove, obračun lige, Hall of Fame podatke, carousel ponašanje, retry tok niti geometriju interfejsa.

## Zaključani katalog

| Redosled | ID | Uloga | Zaključana silueta |
|---:|---|---|---|
| 1 | `amater` | 0–4.999 sezonskih bodova | štit sa mladicom |
| 2 | `profi` | 5.000–14.999 | štit sa dvostrukim činom |
| 3 | `majstor` | 15.000–49.999 | romb sa krunom |
| 4 | `legenda` | 50.000–99.999 | lovor i zvezda |
| 5 | `titan` | 100.000+ | krilata kruna |
| 6 | `alltime` | lista Sva vremena | kruna, lovor i znak beskonačnosti |

`alltime` je zaključan kao poseban Hall of Fame identitet i nije dodatni sezonski prag. Jedan rank ID uvek koristi jedan isti Green PNG identitet.

## Zaključani vizuelni DNK

Svih šest bedževa zadržava:

- matirani 3D Soft Clay Neumorphism materijal;
- forest-green, warm-ivory i terracotta paletu;
- centralni rank glyph na transparentnoj pozadini;
- odsustvo kartice, teksta i dekorativne scene;
- meko gornje-levo osvetljenje i kontrolisanu glinenu dubinu;
- jasno rastući ceremonijalni autoritet od Amatera do Titan ranga i posebnog All-time bedža.

Završni audit potvrđuje da su sve siluete čitljive pri mobilnoj veličini i međusobno dovoljno različite.

## Zaključani potrošači

| Površina | Veza |
|---|---|
| Rank carousel naslov | `getRankBadgeSource(r.id)` |
| Trenutni rang korisnika | `getRankBadgeSource(currentRankData.id)` |
| Rank preload | šest zaključanih ID-jeva |
| Green resolver | canonical `quarterly-rank-badges` namespace |
| Quarterly League room paket | šest eksplicitnih canonical putanja |

Retry token, image cache i fallback ostaju deo postojećeg resolver toka i ne stvaraju alternativne Green identitete.

## Integritet paketa

Zaključavanje pokriva:

- šest canonical master PNG fajlova rezolucije `512 × 512`;
- šest canonical runtime PNG fajlova rezolucije `384 × 384`;
- direktan alpha kanal svih 12 fajlova;
- SHA-256 otisak svakog master/runtime fajla;
- tačan skup i redosled šest ID-jeva;
- zaključane bodovne raspone i semantičke siluete;
- odsustvo dupliranog runtime sadržaja;
- identične manifest i registry putanje, dimenzije i otiske;
- 1:1 mapiranje rank ID-ja na canonical PNG.

## Semantičke granice

Rank bedževi ostaju odvojeni od:

- Quarterly League navigation tabova;
- Quarterly League i General Podium medalja;
- Treasury Collection medalja;
- Tournament finalist nagrade;
- Treasury achievement trofeja;
- zbirnog Statistics trophies simbola;
- winner i victory-state oznaka;
- glavnog Quarterly League logotipa i intro asseta;
- dukata i potrošnih tokena.

Zajednički motiv zvezde, krune ili lovora ne dozvoljava zamenu između ovih porodica, jer svaka ima drugačije značenje.

## Zabranjene stare putanje

Šest starih `ql/rank-*-v1.png` runtime putanja ostaje evidentirano kao zabranjeno. Automatska kontrola pada ako se vrati stari fajl ili aktivna referenca. Istorijski 512 px source asseti ostaju sačuvani i mapirani na canonical zamene.

## Automatska kontrola

`check-theme-performance.js` proverava:

- `locked` status registra i source manifesta;
- evidentiran završni audit;
- tačan skup, redosled, score range i glyph svih šest ID-jeva;
- zaključani vizuelni DNK i nepromenljivo ID-to-PNG mapiranje;
- dimenzije, alpha kanal, SHA-256 integritet i jedinstvenost sadržaja;
- manifest/registry podudaranje;
- resolver, carousel, current-rank, preload i room-on-demand veze;
- odsustvo starih runtime fajlova i referenci;
- očuvanje semantičkih izuzetaka i room preload izolacije.

## Performanse pri zaključavanju

- Green tema: `173 PNG`, ukupno `16,87 MB`.
- Startup paket: `17 PNG`, `4,56 MB` kompresovano / `20,44 MB` procenjeno dekodirano.
- Najveći Green room paket: Riznica, `44 PNG`, `2,94 MB` kompresovano / `13,70 MB` procenjeno dekodirano.

Rank bedževi se ne učitavaju na startup-u. Učitavaju se kroz Quarterly League tok i postojeći ograničeni preload.

## Pravilo za buduće izmene

Promena bilo kog zaključanog bedža zahteva novu verziju mastera i runtime asseta, ažuriranje oba SHA-256 otiska, source manifesta, centralnog registra i room veze. Postojeći canonical fajl ne sme se tiho prepisivati, rank ID ne sme dobiti drugi glyph bez verzionisane promene, a rank bedž ne sme biti zamenjen medaljom, tab ikonom, trofejem ili winner oznakom.

Nije rađen commit niti objavljivanje.
