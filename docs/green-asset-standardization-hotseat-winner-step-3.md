# Green Asset Standardization — Hotseat Winner, Korak 3

## Ishod

Canonical `hotseat-winner` paket povezan je sa kompletnim Green Hotseat rezultatskim tokom. Porodica je registrovana kao `standardized`; završno zaključavanje sledi u Koraku 4.

Ovaj korak nije menjao izgled winner marka, uslove pobede ili remija, rezultat partije, veličinu prikaza, reveal motion, reduced-motion ponašanje niti geometriju interfejsa.

## Povezani potrošači

Jedna canonical putanja sada pokriva:

- Green Hotseat winner mark u `game-over-screen` prikazu;
- Green Hotseat room-on-demand paket.

HTML potrošač i preload veza koriste isti `256 × 256` PNG. Browser/native WebView zato dekodira jedan isti resurs, bez stare dodatne `384 × 384` kopije.

## Očuvana logika prikaza

Winner mark se i dalje prikazuje samo kada rezultat pripada režimu `Hotseat` i partija nije završena nerešeno. Postojeće klase ostaju nepromenjene:

- `is-hotseat-result` potvrđuje lokalni režim za dva igrača;
- `has-result-winner` potvrđuje odlučenu partiju;
- remi ne dobija winner mark;
- Online i tehnički rezultati uklanjaju Hotseat klase i ne koriste ovaj identitet.

CSS prikaz ostaje `58 × 58` piksela sa postojećim reveal motionom od `0,48 s`. `prefers-reduced-motion: reduce` i dalje potpuno isključuje animaciju.

## Ispravljen room-on-demand tok

Stvarni `getThemeRoomSources()` matcher i performance matcher sada prepoznaju `canonical/hotseat-winner/` namespace. Canonical winner asset učitava se tek kroz Hotseat sobu, a ne na startup-u.

## Centralni registar

Porodica `hotseatWinner` dodata je u `www/themes/green/asset-registry.json` sa:

- statusom `standardized`;
- jednim canonical runtime assetom od `256 × 256`;
- SHA-256 otiskom runtime sadržaja;
- zaključanim Green Soft Clay identitetom;
- starom runtime putanjom evidentiranom kao zabranjenom;
- istorijskim source mapiranjem na canonical zamenu;
- semantičkim izuzecima i aktivnim code binding vezama.

Source manifest sada ima isti `standardized` status i evidentira povezani game-over i room-on-demand tok.

## Uklonjena runtime kopija

Nakon provere canonical/master hash vrednosti i potvrde da aktivni kod nema legacy reference uklonjen je:

- `www/assets/green-soft-clay/hotseat/winner-v1.png` — stari `384 × 384` runtime od `81.039` bajtova.

Odobreni `512 × 512` source i canonical master ostaju sačuvani. Stara runtime putanja ostaje evidentirana kao zabranjena.

## Automatska kontrola

`check-theme-performance.js` sada proverava:

- `standardized` status source manifesta i centralnog registra;
- tačno jedan ID i jedan registry runtime zapis;
- zaključani materijal, paletu, mapiranje i semantičku siluetu;
- master/runtime dimenzije, alpha kanal i SHA-256 integritet;
- manifest/registry podudaranje;
- tačno jednu game-over i jednu Hotseat preload canonical vezu;
- stvarni Hotseat room matcher;
- kompletnu integracionu evidenciju;
- odsustvo starog runtime fajla i aktivnih legacy referenci;
- semantičku izolaciju od Statistics, Solo, Online, Tournament, League, Treasury i drugih state/winner porodica.

## Performanse posle integracije

- Green tema: `172 PNG`, ukupno `15,94 MB`.
- Startup paket: `17 PNG`, `4,56 MB` kompresovano / `20,44 MB` procenjeno dekodirano.
- Hotseat paket: `2 PNG`, `0,15 MB` kompresovano / `1,25 MB` procenjeno dekodirano.
- Najveći Green room paket ostaje Riznica, `44 PNG`, `2,94 MB` kompresovano / `13,70 MB` procenjeno dekodirano.

U odnosu na stari winner runtime paket je manji za `42.630` bajtova, a procenjeno dekodirano opterećenje winner asseta smanjeno je za približno `0,31 MB`. Startup paket je nepromenjen.

## Verzija teme

Green manifest je podignut na verziju `44` i sada eksplicitno zahteva jedan Hotseat-only winner identitet koji se ne sme koristiti za Statistics, Solo, Online, tehničke, Tournament, League, Treasury ili generičke winner prikaze.

## Sledeći korak

Korak 4 je završna vizuelna, semantička i tehnička kontrola, nakon koje se porodica menja iz `standardized` u `locked`.

Nije rađen commit niti objavljivanje.
