# Green Asset Standardization — Quarterly League Navigation, Korak 3

## Ishod

Canonical `quarterly-navigation` paket povezan je sa kompletnim Green runtime tokom. Porodica je registrovana kao `standardized`; završno zaključavanje sledi u Koraku 4.

Ovaj korak nije menjao izgled glyph-ova, tab akcije, sadržaj pogleda, podatke lige, Hall of Fame prikaz, champion podatke niti geometriju interfejsa.

## Runtime integracija

### Resolver

`www/kvartalnaliga.js` sada za Green temu rešava:

- `tab-league`;
- `tab-hall-of-fame`;
- `tab-medals`;
- `tab-champions`;

kroz `assets/green-soft-clay/canonical/quarterly-navigation/`.

Ostale teme zadržavaju sopstvene putanje i verzije. Postojeći retry query token i fallback ponašanje nisu menjani.

### Potrošači

Canonical resolver napaja:

- glavni tab Liga;
- glavni tab Dvorana slavnih;
- Hall of Fame podtab Medalje;
- Hall of Fame podtab Šampioni;
- champion marker na kartici šampiona.

`tab-champions` se namerno ponavlja na podtabu i markeru zato što oba mesta označavaju isti pojam šampiona. Nije pretvoren u generičku winner oznaku.

### Room-on-demand

Četiri eksplicitne putanje u Green Quarterly League room paketu prebačene su na canonical namespace. Performance matcher sada prepoznaje `canonical/quarterly-navigation/` kao deo Quarterly League sobe.

Navigacione ikone nisu dodate u startup paket.

## Centralni registar

Porodica `quarterlyNavigation` dodata je u `www/themes/green/asset-registry.json` sa:

- statusom `standardized`;
- četiri canonical runtime putanje od `256 × 256`;
- SHA-256 otiskom svakog runtime asseta;
- zajedničkim Green Soft Clay identitetom;
- četiri zabranjene stare runtime putanje;
- mapom istorijskih source putanja na canonical zamene;
- semantičkim izuzecima i aktivnim code binding vezama.

Source manifest sada ima isti `standardized` status i evidentira povezane glavne tabove, Hall of Fame podtabove, champion marker i room-on-demand tok.

## Uklonjene runtime kopije

Nakon provere da nema aktivnih referenci uklonjena su četiri stara fajla:

- `ql/tab-league-v1.png`
- `ql/tab-hall-of-fame-v1.png`
- `ql/tab-medals-v1.png`
- `ql/tab-champions-v1.png`

Odgovarajući 512 px source masteri u `source-assets/green-soft-clay-hires/ql/` ostaju sačuvani. Stare runtime putanje ostaju u registru kao zabranjene.

## Optimizacija

`tab-champions` sada koristi canonical `256 × 256` verziju od 63.985 bajtova umesto stare `384 × 384` verzije od 126.804 bajta. Ušteda je 62.819 bajtova, približno 49,5%, uz isti odobreni master, glyph, paletu i transparentnost.

Ostale tri canonical ikone bajt-po-bajt su identične uklonjenim aktivnim kopijama.

## Automatska kontrola

`check-theme-performance.js` sada proverava:

- `standardized` status source manifesta i centralnog registra;
- tačan katalog i četiri jedinstvena ID-ja;
- master/runtime dimenzije, alpha kanal i SHA-256 integritet;
- manifest/registry podudaranje;
- tačno jednu room-on-demand vezu za svaki canonical asset;
- tačno jednu canonical resolver template vezu;
- oba glavna taba, oba podtaba i champion marker;
- eksplicitno evidentiranu optimizaciju `tab-champions`;
- odsustvo starih runtime fajlova i aktivnih referenci;
- semantičku izolaciju i Quarterly League preload pripadnost.

## Performance posle integracije

- Green tema: `173 PNG`, ukupno `16,81 MB`.
- Startup paket: `17 PNG`, `4,56 MB` kompresovano / `20,44 MB` procenjeno dekodirano.
- Najveći Green room paket ostaje Riznica, `44 PNG`, `2,94 MB` kompresovano / `13,70 MB` procenjeno dekodirano.

Green tema sada je približno 61 KB manja nego pre početka ove porodice, bez promene početnog učitavanja.

## Sledeći korak

Korak 4 je završna vizuelna, semantička i tehnička kontrola, nakon koje se porodica menja iz `standardized` u `locked`.

Nije rađen commit niti objavljivanje.
