# Green Asset Standardization — Tournament Navigation, Korak 3

## Ishod

Canonical `tournament-navigation` paket povezan je sa kompletnim Green runtime tokom. Porodica je registrovana kao `standardized`; završno zaključavanje sledi u Koraku 4.

Ovaj korak nije menjao izgled glyph-ova, tab akcije, sadržaj turnira, Tournament state ikone, finalist nagradu, Rules tekstove niti geometriju interfejsa.

## Runtime integracija

### Tournament tabovi

`www/turnir.js` sada koristi canonical putanje za:

- Info;
- Kostur / Bracket;
- Slavni / Tournament Hall of Fame.

Postojeće `switchTab()` akcije, `activeTab` stanje, ARIA atributi, title tekstovi i fallback SVG ikone nisu menjani.

### Pravila

Green override u `www/pravilaigre.js` sada koristi isti canonical `tab-hall-of-fame` svitak u Tournament nagradnoj referenci. Time Tournament ekran i odgovarajući Rules sadržaj dele jedan PNG identitet za isti pojam.

Quarterly League Hall of Fame zadržava sopstvenu građevinu i nije povezan sa Tournament svitkom.

### Room-on-demand

Tri eksplicitne putanje u Green Tournament room paketu prebačene su na `canonical/tournament-navigation/`. Performance matcher prepoznaje taj namespace kao deo Tournament sobe.

Navigacione ikone nisu dodate u startup paket.

## Centralni registar

Porodica `tournamentNavigation` dodata je u `www/themes/green/asset-registry.json` sa:

- statusom `standardized`;
- tri canonical runtime putanje od `256 × 256`;
- SHA-256 otiskom svakog runtime asseta;
- zajedničkim Green Soft Clay identitetom;
- tri zabranjene stare runtime putanje;
- mapom istorijskih source putanja na canonical zamene;
- semantičkim izuzecima i aktivnim code binding vezama.

Source manifest sada ima isti `standardized` status i evidentira povezane Tournament tabove, Rules Hall of Fame referencu i room-on-demand tok.

## Uklonjene runtime kopije

Nakon provere da nema aktivnih referenci uklonjena su tri stara fajla:

- `tournament/tab-info-v1.png`
- `tournament/tab-bracket-v1.png`
- `tournament/tab-hall-of-fame-v1.png`

Odgovarajući high-resolution source asseti u `source-assets/green-soft-clay-hires/tournament/` ostaju sačuvani. Stare runtime putanje ostaju u registru kao zabranjene.

## Normalizovani Bracket canvas

Aktivna bracket putanja sada koristi canonical `256 × 256` canvas. Vidljivi `246 × 256` glyph pikseli nisu resamplovani niti rastegnuti: samo su centrirani na `x = 5`, uz po 5 transparentnih piksela sa obe strane.

Info i Hall of Fame canonical runtime sadržaji bajt-po-bajt su identični uklonjenim aktivnim kopijama.

## Automatska kontrola

`check-theme-performance.js` sada proverava:

- `standardized` status source manifesta i centralnog registra;
- tačan katalog i tri jedinstvena ID-ja;
- master/runtime dimenzije, alpha kanal i SHA-256 integritet;
- manifest/registry podudaranje;
- tačno jednu Tournament tab vezu za svaki canonical asset;
- tačno jednu room-on-demand vezu za svaki canonical asset;
- tačno jednu Rules Hall of Fame vezu;
- bracket canvas normalizaciju;
- kompletnu integracionu evidenciju;
- odsustvo starih runtime fajlova i aktivnih referenci;
- semantičku izolaciju i Tournament room preload pripadnost.

## Performance posle integracije

- Green tema: `173 PNG`, ukupno `16,81 MB`.
- Startup paket: `17 PNG`, `4,56 MB` kompresovano / `20,44 MB` procenjeno dekodirano.
- Najveći Green room paket ostaje Riznica, `44 PNG`, `2,94 MB` kompresovano / `13,70 MB` procenjeno dekodirano.

Privremene tri duple runtime kopije iz Koraka 2 više ne postoje. Tournament Navigation ostaje room-on-demand i ne povećava početno učitavanje.

## Sledeći korak

Korak 4 je završna vizuelna, semantička i tehnička kontrola, nakon koje se porodica menja iz `standardized` u `locked`.

Nije rađen commit niti objavljivanje.
