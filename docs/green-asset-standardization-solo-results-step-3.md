# Green Asset Standardization — Solo Results, Korak 3

## Ishod

Canonical `solo-results` paket povezan je sa kompletnim Green Solo završnim tokom. Porodica je registrovana kao `standardized`; završno zaključavanje sledi u Koraku 4.

Ovaj korak nije menjao izgled glyph-ova, high-score računanje, rezultat, nagrade, claim/double-reward logiku, CSS score tiers, motion, reduced-motion ponašanje niti geometriju interfejsa.

## Povezani potrošači

Tri canonical putanje sada pokrivaju:

- `personal-best` — oznaku stvarnog novog Solo ličnog rekorda;
- `finish-score-mark` — oznaku konačnog broja Solo poena;
- `finish-claim` — claim-and-exit akciju;
- Solo room-on-demand paket za sva tri identiteta.

Svaki UI potrošač i njegov preload zapis koriste isti `256 × 256` PNG. Browser/native WebView zato dekodira po jedan resurs za svaki ID, bez starih dodatnih `384 × 384` kopija.

## Očuvana funkcionalna logika

- Personal Best badge ostaje skriven osim kada je završena Solo partija i novi rezultat je strogo veći od prethodnog `stats.highscore`.
- Final Score Mark ostaje vezan samo za `is-solo-result` score red.
- Finish Claim ostaje vizuelni glyph postojećeg `claimReward(false)` dugmeta.
- Zaštita od dvostrukog claima, pending reward, server potvrda i izlazak ostaju nepromenjeni.
- Glavna Solo ikona ostaje namenski skrivena na Green završnom ekranu.
- `finish-reward-video-v3.png` ostaje kompozicija zaključane Rewarded Video porodice i nije dupliran u Solo Results registry katalogu.

## Ispravljen room-on-demand tok

Stvarni `getThemeRoomSources()` matcher i performance matcher sada prepoznaju `canonical/solo-results/` namespace. Tri result glyph-a učitavaju se tek kroz Solo sobu i nisu deo startup paketa.

## Centralni registar

Porodica `soloResults` dodata je u `www/themes/green/asset-registry.json` sa:

- statusom `standardized`;
- tri canonical runtime asseta od `256 × 256`;
- SHA-256 otiskom svakog runtime sadržaja;
- zajedničkim Green Soft Clay identitetom;
- tri stare runtime putanje evidentirane kao zabranjene;
- tri istorijska source mapiranja na canonical zamene;
- semantičkim izuzecima i aktivnim code binding vezama.

Source manifest sada ima isti `standardized` status i evidentira povezane personal-best, score, claim i room-on-demand tokove.

## Uklonjene runtime kopije

Nakon provere canonical/master hash vrednosti i potvrde da aktivni kod nema legacy reference uklonjeni su:

- `solo/personal-best-v1.png` — stari `384 × 384` runtime od `76.340` bajtova;
- `solo/finish-score-mark-v1.png` — stari `384 × 384` runtime od `100.491` bajta;
- `solo/finish-claim-v1.png` — stari `384 × 384` runtime od `84.639` bajtova.

Odobreni `512 × 512` source asseti i canonical masteri ostaju sačuvani. Stare runtime putanje ostaju evidentirane kao zabranjene.

## Reproducibilan build posle čišćenja

`build-green-canonical-solo-results-pack.py` sada gradi mastere i runtime assete direktno iz sačuvanih high-resolution source fajlova i više ne zavisi od uklonjenih legacy runtime kopija. Build je uspešno ponovljen nakon brisanja i proizveo iste zaključane SHA-256 otiske.

## Automatska kontrola

`check-theme-performance.js` sada proverava:

- `standardized` status source manifesta i centralnog registra;
- tačan skup, redosled i semantičku siluetu tri ID-ja;
- jedinstvenost master i runtime sadržaja;
- master/runtime dimenzije, alpha kanal i SHA-256 integritet;
- manifest/registry podudaranje i jedinstvene registry uloge;
- po jednu UI i jednu Solo preload canonical vezu za svaki ID;
- stvarni Solo room matcher;
- kompletnu integracionu evidenciju;
- odsustvo tri stara runtime fajla i aktivnih legacy referenci;
- očuvanje Rewarded Video vlasništva nad `finish-reward-video-v3.png`;
- semantičku izolaciju od glavne Solo ikone, Statistics, Hotseat, Online, Tournament, League, Daily i Treasury porodica.

## Performanse posle integracije

- Green tema: `172 PNG`, ukupno `15,81 MB`.
- Startup paket: `17 PNG`, `4,56 MB` kompresovano / `20,44 MB` procenjeno dekodirano.
- Solo paket: `5 PNG`, `0,36 MB` kompresovano / `2,31 MB` procenjeno dekodirano.
- Najveći Green room paket ostaje Riznica, `44 PNG`, `2,94 MB` kompresovano / `13,70 MB` procenjeno dekodirano.

U odnosu na tri uklonjene kopije paket je manji za `135.989` bajtova, a procenjeno dekodirano opterećenje tri Solo Results resursa smanjeno je za približno `0,94 MB`. Startup paket je nepromenjen.

## Verzija teme

Green manifest je podignut na verziju `45` i sada eksplicitno zahteva tri odvojena Solo Results identiteta, uz očuvanu granicu prema Rewarded Video kompoziciji, glavnoj Solo ikoni, CSS tier elementima, Statistics metrikama i multiplayer result stanjima.

## Sledeći korak

Korak 4 je završna vizuelna, semantička i tehnička kontrola, nakon koje se porodica menja iz `standardized` u `locked`.

Nije rađen commit niti objavljivanje.
