# Green Asset Standardization — Statistics Overview Metrics, Korak 2

## Ishod

Formiran je kompletan canonical `statistics-overview` paket sa deset postojećih odobrenih Green identiteta. Nije korišćen ImageGen i nijedan glyph nije redizajniran.

Paket trenutno ima status `canonical`. Aktivne veze ostaju na postojećim `statistics/*.png` putanjama do Koraka 3, kada će Statistics Overview, Power Index modal, Vatreni niz modal, Pravila i Statistics room-on-demand paket biti kontrolisano prebačeni na canonical namespace.

## Canonical katalog

| ID | Semantička uloga | Canonical runtime |
|---|---|---:|
| `power-index` | globalna Power Index vrednost i rang | `256 × 256` |
| `record` | najbolji sačuvani Solo rezultat | `256 × 256` |
| `games` | ukupan broj završenih partija | `256 × 256` |
| `wins` | zbir pobeda | `256 × 256` |
| `draws` | zbir nerešenih partija | `256 × 256` |
| `losses` | zbir poraza | `256 × 256` |
| `fire-streak` | trenutni/najbolji Vatreni niz | `256 × 256` |
| `average` | prosečan rezultat | `256 × 256` |
| `trophies` | zbir otključanih achievement trofeja | `256 × 256` |
| `all-time-points` | zbir svih osvojenih poena | `256 × 256` |

Svaki ID ima posebnu, nepromenljivu semantičku ulogu. H2H, canonical dukat i result/winner identiteti nisu deo kataloga.

## Canonical master paket

Direktorijum:

`source-assets/green-soft-clay-canonical/statistics-overview/`

- sadrži deset eksplicitno imenovanih mastera;
- svi masteri imaju `1254 × 1254` RGBA;
- masteri su bajt-po-bajt kopije odobrenih Green source asseta;
- svaki master ima zaseban SHA-256 otisak u manifestu;
- ukupna veličina master paketa je `6.561.713` bajtova.

## Canonical runtime paket

Direktorijum:

`www/assets/green-soft-clay/canonical/statistics-overview/`

| Runtime | Veličina | SHA-256 |
|---|---:|---|
| `power-index-v1.png` | `38.478` B | `aca987078b4173c89cdae4d44b8ab471792558d24bd52ec5c86b0f5519910fe1` |
| `record-v1.png` | `16.242` B | `9e3cca29bc7ec413863ca360b07de2f322cef1e2d35deab686a35a8957e6380b` |
| `games-v1.png` | `24.371` B | `41c1f718f4af64d8286d3f39caa7a90d3a2b07240130a53a1939b8e68619ddb7` |
| `wins-v1.png` | `44.712` B | `56c08c3ffcd753a10d87b81b721086dbd1415f9e13ed246a36bd7b05b8f950c4` |
| `draws-v1.png` | `21.877` B | `ac875bb7e77abcc37b672a2e5a46251c001a36fa219906595669b6fe820aac82` |
| `losses-v1.png` | `24.382` B | `e0f872aa3fc25541c9b5fb394dfbca40137f8c99c7ae510b890c1502243cd3fc` |
| `fire-streak-v1.png` | `37.145` B | `9d9cb7a4189caf38d4cbb0b166a8f2cebed7aab5a969763de3c55763db7a3847` |
| `average-v1.png` | `28.397` B | `fdc3b6eae21540d3003eadc697c24862aa69667293bc0fa75790499ba59b2a12` |
| `trophies-v1.png` | `39.193` B | `b698d3624653518ba0bb7014ee94e411d73da87fd8e3fa0b52f7c26fc635880e` |
| `all-time-points-v1.png` | `48.898` B | `670e8f0a5773e56b423cc205a0dc10ca3454d4591f0b6a57a1304acc6fbd933c` |

Canonical runtime paket ukupno ima `323.695` bajtova. Svaki runtime:

- koristi transparentni `256 × 256` RGBA canvas;
- izveden je direktno iz odgovarajućeg `1254 × 1254` mastera LANCZOS redukcijom;
- bajt-po-bajt je identičan trenutno aktivnom odobrenom runtime assetu;
- zadržava punu kvadratnu kompoziciju bez kropovanja i rastezanja;
- ostaje dovoljan i za najveći stvarni prikaz od `94 × 94` CSS piksela.

## Reproducibilan build

`scripts/build-green-canonical-statistics-overview-pack.py`:

1. zahteva svih deset odobrenih `1254 × 1254` source asseta;
2. zahteva svih deset postojećih `256 × 256` aktivnih runtime asseta;
3. proverava RGBA format i očekivane dimenzije svih ulaza;
4. kopira source fajlove bajt-po-bajt kao canonical mastere;
5. izvodi deset `256 × 256` runtime PNG-ova direktnim LANCZOS skaliranjem;
6. pixel-level proverom zahteva da je svaka izvedenica identična odobrenom aktivnom runtimeu;
7. prekida build ako nedostaje fajl ili format, dimenzija ili sadržaj odstupa;
8. ispisuje master, aktivne i canonical dimenzije sa veličinom svakog rezultata.

## Source manifest

`source-assets/green-soft-clay-canonical/statistics-overview/manifest.json` evidentira:

- `canonical` status;
- tačnih deset ID-jeva i njihov redosled;
- semantičku ulogu, glyph i potrošače svakog identiteta;
- sve stvarne UI veličine od `14 × 14` do `94 × 94`;
- master, canonical runtime i trenutno aktivne legacy putanje;
- sve dimenzije i SHA-256 otiske;
- precizno LANCZOS pravilo normalizacije;
- plan integracije za Statistics Overview, Power Index, Vatreni niz, Pravila i room-on-demand tok;
- granice prema H2H, canonical dukatu, rezultatskim, takmičarskim, Treasury i gameplay porodicama.

## Automatska kontrola

`check-theme-performance.js` sada proverava:

- `canonical` status paketa i odsustvo prevremene registry registracije;
- tačan skup i redosled deset ID-jeva;
- zaključani materijal, paletu, mapiranje, glyph siluete i display dimenzije;
- jedinstvenost svih master i runtime sadržaja;
- postojanje svih mastera, canonical runtimea i aktivnih runtimea;
- sve dimenzije, direktan alpha kanal i SHA-256 otiske;
- canonical konvenciju imena i istorijske aktivne putanje;
- bajt-po-bajt identičnost canonical i aktivnih runtime fajlova;
- precizno LANCZOS pravilo;
- očekivani broj aktivnih Statistics, modal, Rules i preload veza za svaki ID;
- da nijedna canonical putanja nije prevremeno povezana;
- da canonical dukat ostaje Statistics balance glyph;
- da H2H overview, empty i detail asseti ostaju izvan paketa;
- kompletan plan povezivanja i semantičke izuzetke za Korak 3.

## Privremeni performance bilans

Dok zajedno postoje aktivne i canonical kopije:

- Green tema: `182 PNG`, ukupno `16,12 MB`;
- startup paket: nepromenjen, `17 PNG`, `4,56 MB` kompresovano / `20,44 MB` procenjeno dekodirano;
- najveći Green room paket ostaje Riznica, `44 PNG`, `2,94 MB` kompresovano / `13,70 MB` procenjeno dekodirano;
- deset aktivnih Statistics Overview runtime fajlova zajedno ima `323.695` bajtova;
- deset canonical runtime fajlova zajedno takođe ima `323.695` bajtova.

Canonical fajlovi još ne ulaze u aktivni Statistics room paket. Nakon Koraka 3 i uklanjanja deset starih runtime kopija Green paket vraća se na `172 PNG` / približno `15,81 MB`. Nema očekivane finalne kompresovane ili dekodirane uštede jer su stare i canonical izvedenice već optimalne i sadržajno identične; dobit je jedan kontrolisan namespace, manifest, istorijsko mapiranje i zaštita identiteta.

## Van opsega Koraka 2

- menjanje aktivnih Statistics Overview potrošača;
- menjanje Power Index ili Vatreni niz modala;
- menjanje Rules referenci;
- menjanje Statistics room-on-demand putanja ili matchera;
- menjanje formula, stats/profile podataka ili klik akcija;
- menjanje CSS dimenzija, carousel rasporeda, motiona ili reduced-motion ponašanja;
- menjanje H2H overview, empty ili detail asseta;
- menjanje zaključanog canonical dukata;
- menjanje glavne Statistics menu/intro ikone;
- brisanje deset postojećih runtime kopija;
- dodavanje porodice u centralni registry;
- registracija porodice kao `standardized` ili `locked`.

## Sledeći korak

Korak 3 je povezivanje svih Statistics Overview, Power Index, Vatreni niz, Rules i room-on-demand potrošača na canonical putanje, proširenje stvarnog Statistics room matchera za `canonical/statistics-overview/`, registracija porodice kao `standardized` i uklanjanje deset starih runtime kopija nakon potvrde da nema aktivnih legacy referenci.

Nije rađen commit niti objavljivanje.
