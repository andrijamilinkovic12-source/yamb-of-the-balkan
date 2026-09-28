# Green Asset Standardization — Tournament Action & Match States, Korak 3

## Ishod

Canonical `tournament-states` paket povezan je sa kompletnim Green runtime tokom. Porodica je registrovana kao `standardized`; završno zaključavanje sledi u Koraku 4.

Ovaj korak nije menjao vizuelni sadržaj glyph-ova, akcije prijave i odjave, pending motion, registration logiku, rezultate mečeva, Rules tekstove, podatke Turnira niti geometriju interfejsa.

## Runtime integracija

### Registration actions

`www/turnir.js` sada koristi canonical putanje za:

- `state-register` na dugmetu za prijavu;
- `state-unregister` na dugmetu za povlačenje prijave;
- dinamički izbor `state-registration-locked`, `state-start` ili `state-match-complete` u statusnom registration panelu.

Postojeći click handleri, disabled/pending stanja, tekstovi, fallback simboli i motion nisu menjani.

### Match flow states

Canonical putanje sada koriste:

- `state-match-active` na dugmetu za pokretanje dostupnog meča;
- `state-match-complete` uz završeni rezultat u kosturu;
- `state-match-complete` u završenom prikazu meča;
- isti `state-match-complete` u završenom registration statusu kroz postojeći dinamički izbor.

Finalni meč i dalje koristi zaseban glavni Tournament asset, a finalist prikaz zadržava zasebnu finalist nagradu.

### Pravila

Green override u `www/pravilaigre.js` sada koristi canonical `state-start` identitet u odgovarajućoj Tournament start referenci. To je isti pojam početka/toka Turnira, a ne obična playback ili rewarded-video akcija.

### Room-on-demand

Šest eksplicitnih Tournament state putanja u `www/game.js` prebačeno je na `canonical/tournament-states/`. Performance matcher prepoznaje novi namespace kao deo Tournament sobe.

Nijedan Tournament state asset nije dodat u startup paket.

## Centralni registar

Porodica `tournamentStates` dodata je u `www/themes/green/asset-registry.json` sa:

- statusom `standardized`;
- šest canonical runtime putanja od `256 × 256`;
- SHA-256 otiskom svakog runtime asseta;
- zajedničkim Green Soft Clay identitetom;
- šest zabranjenih starih runtime putanja;
- mapom istorijskih source putanja na canonical zamene;
- semantičkim izuzecima i aktivnim code binding vezama.

Source manifest sada ima isti `standardized` status i evidentira povezane registration akcije, registration panel, match states, Rules start referencu i room-on-demand tok.

## Uklonjene runtime kopije

Nakon provere svih canonical i master hash vrednosti i potvrde da aktivni kod više nema legacy reference uklonjeno je šest starih fajlova:

- `tournament/state-register-v1.png`;
- `tournament/state-unregister-v1.png`;
- `tournament/state-registration-locked-v1.png`;
- `tournament/state-start-v1.png`;
- `tournament/state-match-active-v1.png`;
- `tournament/state-match-complete-v1.png`.

Odgovarajući high-resolution source asseti u `source-assets/green-soft-clay-hires/tournament/` ostaju sačuvani. Stare runtime putanje ostaju u registru kao zabranjene.

## Očuvana canvas pravila

- `state-register`: sadržaj `256 × 171`, centriran na `x = 0`, `y = 42`;
- `state-registration-locked`: sadržaj `253 × 256`, centriran na `x = 1`, `y = 0`;
- preostala četiri glyph-a: sadržaj `256 × 256` na punom canvasu.

Svi runtime fajlovi imaju transparentni `256 × 256` canvas. Nema razvlačenja, kropovanja ili promene odobrenih proporcija.

## Automatska kontrola

`check-theme-performance.js` sada proverava:

- `standardized` status source manifesta i centralnog registra;
- tačne `registrationActions` i `flowStates` podgrupe;
- tačan katalog i šest jedinstvenih ID-jeva;
- master/runtime dimenzije, alpha kanal i SHA-256 integritet;
- manifest/registry podudaranje;
- canvas normalizaciju svakog glyph-a;
- Register, Unregister i dinamičke registration veze;
- Match active i dve direktne Match complete veze;
- jednu Rules Start referencu;
- tačno jednu room-on-demand vezu za svaki ID;
- kompletnu integracionu evidenciju;
- odsustvo starih runtime fajlova i aktivnih referenci;
- semantičku izolaciju i Tournament room preload pripadnost.

## Performanse posle integracije

- Green tema: `173 PNG`, ukupno `16,18 MB`.
- Startup paket: `17 PNG`, `4,56 MB` kompresovano / `20,44 MB` procenjeno dekodirano.
- Tournament paket: `11 PNG`, `0,62 MB` kompresovano / `3,81 MB` procenjeno dekodirano.
- Najveći Green room paket ostaje Riznica, `44 PNG`, `2,94 MB` kompresovano / `13,70 MB` procenjeno dekodirano.

U odnosu na šest uklonjenih kopija paket je manji za `668.777` bajtova, dok je procenjeno dekodirano opterećenje ovih šest state asseta smanjeno za približno `4,15 MB`.

## Sledeći korak

Korak 4 je završna vizuelna, semantička i tehnička kontrola, nakon koje se porodica menja iz `standardized` u `locked`.

Nije rađen commit niti objavljivanje.
