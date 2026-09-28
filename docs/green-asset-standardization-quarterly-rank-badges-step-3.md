# Green Asset Standardization — Quarterly League Rank Badges, Korak 3

## Ishod

Canonical `quarterly-rank-badges` paket povezan je sa kompletnim Green runtime tokom. Porodica je registrovana kao `standardized`; završno zaključavanje sledi u Koraku 4.

Ovaj korak nije menjao izgled bedževa, rank ID-jeve, bodovne pragove, računanje poena, podatke lige, Hall of Fame, carousel ponašanje niti geometriju interfejsa.

## Runtime integracija

### Resolver

`www/kvartalnaliga.js` sada za Green temu rešava svih šest rank ID-jeva kroz:

`assets/green-soft-clay/canonical/quarterly-rank-badges/`

Ostale teme zadržavaju sopstvene putanje i verzije. Postojeći retry token, image cache i error retry tok nisu menjani.

### Potrošači

Isti canonical resolver nastavlja da napaja:

- bedž naslova svakog rank carousel slajda;
- bedž trenutnog ranga korisnika;
- preload niza `amater`, `profi`, `majstor`, `legenda`, `titan`, `alltime`.

### Room-on-demand

Svih šest eksplicitnih putanja u Green Quarterly League room paketu prebačeno je na canonical namespace. Performance matcher prepoznaje `canonical/quarterly-rank-badges/` kao deo Quarterly League sobe.

Bedževi nisu dodati u startup paket.

## Centralni registar

Porodica `quarterlyRankBadges` dodata je u `www/themes/green/asset-registry.json` sa:

- statusom `standardized`;
- zaključanim redosledom šest ID-jeva;
- šest canonical runtime putanja, dimenzija i SHA-256 otisaka;
- zajedničkim Green Soft Clay vizuelnim identitetom;
- šest zabranjenih starih runtime putanja;
- mapom istorijskih source putanja na canonical zamene;
- semantičkim izuzecima i aktivnim code binding vezama.

Source manifest sada ima isti `standardized` status i evidentira povezane resolver, carousel, current-rank, preload i room-on-demand tokove.

## Uklonjene runtime kopije

Nakon provere da nema aktivnih referenci uklonjeno je šest starih fajlova:

- `ql/rank-amater-v1.png`
- `ql/rank-profi-v1.png`
- `ql/rank-majstor-v1.png`
- `ql/rank-legenda-v1.png`
- `ql/rank-titan-v1.png`
- `ql/rank-alltime-v1.png`

Odgovarajući 512 px source masteri u `source-assets/green-soft-clay-hires/ql/` ostaju sačuvani. Stare runtime putanje ostaju u registru kao zabranjene i test će pasti ako se fajl ili aktivna veza vrate.

## Automatska kontrola

`check-theme-performance.js` sada proverava:

- `standardized` status source manifesta i centralnog registra;
- tačan katalog i šest jedinstvenih ID-jeva;
- master/runtime dimenzije, alpha kanal i SHA-256 integritet;
- manifest/registry podudaranje;
- tačno jednu room-on-demand vezu za svaki canonical asset;
- tačno jednu canonical resolver template vezu;
- kompletan preload niz i oba dinamička UI potrošača;
- kompletnu integracionu evidenciju;
- odsustvo starih runtime fajlova i aktivnih referenci;
- semantičku izolaciju i Quarterly League preload pripadnost.

## Performance posle integracije

- Green tema: `173 PNG`, ukupno `16,87 MB`.
- Startup paket: `17 PNG`, `4,56 MB` kompresovano / `20,44 MB` procenjeno dekodirano.
- Najveći Green room paket ostaje Riznica, `44 PNG`, `2,94 MB` kompresovano / `13,70 MB` procenjeno dekodirano.

Privremenih šest duplih runtime kopija iz Koraka 2 više ne postoji. Aktivni Quarterly League tok zadržava isti vizuelni sadržaj i memorijski trošak.

## Sledeći korak

Korak 4 je završna vizuelna, semantička i tehnička kontrola, nakon koje se porodica menja iz `standardized` u `locked`.

Nije rađen commit niti objavljivanje.
