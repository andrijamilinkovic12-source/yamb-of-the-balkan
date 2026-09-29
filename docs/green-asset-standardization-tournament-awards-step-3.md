# Green Asset Standardization — Tournament Awards, Korak 3

## Ishod

Canonical `tournament-awards` paket povezan je sa kompletnim Green runtime tokom. Porodica je registrovana kao `standardized`; završno zaključavanje sledi u Koraku 4.

Ovaj korak nije menjao izgled pehara ili medalje, nagradne iznose, rezultat finala, ceremony logiku, Tournament podatke, motion, Rules tekstove niti geometriju interfejsa.

## Champion integracija

Jedna canonical `champion-trophy` putanja sada pokriva:

- Tournament karticu glavnog menija;
- Tournament intro mark;
- Tournament header;
- broj osvojenih turnira u intro prikazu;
- Hall of Fame naslov i championship history kartice;
- registration panel;
- finalnu rundu i prikaz pobednika finala;
- champion reward modal;
- champion award ceremony;
- Tournament referencu u Pravilima;
- Tournament room-on-demand paket.

Ukupno je povezano trinaest korisničkih veza: tri u `index.html`, tri u `game.js`, šest u `turnir.js` i jedna u `pravilaigre.js`.

Isti `384 × 384` URL koristi se na startup-u i u sobi. Time browser/native WebView može koristiti isti dekodirani resurs umesto odvojenih `384 × 384` i `512 × 512` kopija.

## Finalist integracija

Jedna canonical `finalist-silver` putanja sada pokriva:

- finalist oznaku uz rezultat finala;
- runner-up reward modal;
- finalist award ceremony;
- Tournament room-on-demand paket.

Ukupno su povezane četiri korisničke veze: tri u `game.js` i jedna u `turnir.js`.

## Ispravljen stvarni preload tok

`www/game.js` sada prepoznaje:

- `canonical/tournament-navigation/`;
- `canonical/tournament-states/`;
- `canonical/tournament-awards/`.

Ovim je stvarni `getThemeRoomSources()` matcher usklađen sa performance kontrolom. Ranije je performance izveštaj pravilno klasifikovao canonical Tournament assete, ali stvarni room matcher još nije sadržao canonical namespace-e. Sada sva tri zaključana/standardizovana Tournament paketa zaista ulaze u room-on-demand pripremu.

Fallback main-menu matcher prepoznaje canonical champion putanju. U normalnom toku `getThemeStartupSources()` je preuzima direktno iz Tournament kartice glavnog menija, pa pehar ostaje deo startup paketa bez duple datoteke.

## Centralni registar

Porodica `tournamentAwards` dodata je u `www/themes/green/asset-registry.json` sa:

- statusom `standardized`;
- canonical champion runtimeom od `384 × 384`;
- canonical finalist runtimeom od `256 × 256`;
- SHA-256 otiskom oba runtime asseta;
- zajedničkim Green Soft Clay identitetom;
- tri zabranjene stare runtime putanje;
- mapom dva istorijska source asseta na canonical zamene;
- semantičkim izuzecima i aktivnim code binding vezama.

Source manifest sada ima isti `standardized` status i evidentira povezane startup, branding, champion, finalist, Rules i room-on-demand tokove.

## Uklonjene runtime kopije

Nakon provere canonical/master hash vrednosti i potvrde da aktivni kod nema legacy reference uklonjeni su:

- `tournament-free-v2.png` — stara `512 × 512` room kopija champion pehara;
- `runtime/menu/tournament-free-v2.png` — stara `384 × 384` startup kopija;
- `tournament/finalist-silver-v1.png` — stara `384 × 384` finalist kopija.

Oba originalna high-resolution source asseta ostaju sačuvana. Stare runtime putanje ostaju evidentirane kao zabranjene.

## Automatska kontrola

`check-theme-performance.js` sada proverava:

- `standardized` status source manifesta i centralnog registra;
- tačna dva ID-ja, redosled i jedinstvenost sadržaja;
- master/runtime dimenzije, alpha kanal i SHA-256 integritet;
- manifest/registry podudaranje;
- `384 × 384` champion i `256 × 256` finalist pravilo;
- istorijski bajt-po-bajt identitet canonical champion asseta i odobrene startup izvedenice;
- svih 13 champion i četiri finalist veze;
- stvarni main-menu i Tournament room matcher;
- kompletnu integracionu evidenciju;
- odsustvo tri stara runtime fajla i aktivnih referenci;
- semantičku izolaciju od podium, collection, achievement, navigation, state, rank i generic-winner porodica;
- canonical champion kao eksplicitni deo Green startup performance paketa.

## Performanse posle integracije

- Green tema: `172 PNG`, ukupno `15,98 MB`.
- Startup paket: `17 PNG`, `4,56 MB` kompresovano / `20,44 MB` procenjeno dekodirano.
- Tournament paket: `11 PNG`, `0,52 MB` kompresovano / `3,06 MB` procenjeno dekodirano.
- Najveći Green room paket ostaje Riznica, `44 PNG`, `2,94 MB` kompresovano / `13,70 MB` procenjeno dekodirano.

U odnosu na tri uklonjene kopije paket je manji za `200.572` bajta, a procenjeno dekodirano opterećenje champion/finalist resursa smanjeno je za približno `1,31 MB`. Startup broj i veličina ostali su praktično nepromenjeni jer canonical champion zamenjuje raniju startup kopiju istih piksela.

## Sledeći korak

Korak 4 je završna vizuelna, semantička i tehnička kontrola, nakon koje se porodica menja iz `standardized` u `locked`.

Nije rađen commit niti objavljivanje.
