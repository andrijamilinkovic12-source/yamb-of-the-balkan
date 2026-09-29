# Green Asset Standardization — Statistics Room Identity, Korak 2

## Ishod

Formiran je canonical `statistics-room-identity` paket sa jednim odobrenim high-resolution masterom i dve runtime isporučne varijante.

Paket ima status `canonical`. Aktivna aplikacija i dalje koristi postojeće `statistics-free-v2.png` putanje do integracionog Koraka 3. Glavni meni, intro, Statistics header, Pravila, motion, preload tok i UI geometrija nisu promenjeni.

Nije korišćen ImageGen i ikona nije redizajnirana.

## Jedan identitet

Canonical master:

`source-assets/green-soft-clay-canonical/statistics-room-identity/green-statistics-room-master-v1.png`

| Dimenzija | Bajtova | SHA-256 |
|---:|---:|---|
| `1254×1254 RGBA` | `601.843` | `a6b66b766925133dd68cce4c290087770d602b633960d082cc42b90ac1a498ea` |

Master je bajt-po-bajt kopija odobrenog `source-assets/green-soft-clay-hires/statistics-free-v2.png` izvora. Predstavlja slobodnostojeći grafikon sa tri warm-ivory stuba, forest-green bazom i jednom terracotta tačkom, bez rama ili kartične podloge.

## Dve isporučne varijante

Direktorijum:

`www/assets/green-soft-clay/canonical/statistics-room-identity/`

| Uloga | Runtime | Dimenzija | Bajtova | SHA-256 |
|---|---|---:|---:|---|
| `room` | `statistics-room-v1.png` | `512×512` | `99.726` | `1b410b9c5af60dfa552122a9eb2ba70abb05bb4f3fdfc4acd7ed0868679611f0` |
| `menu` | `statistics-room-menu-v1.png` | `384×384` | `60.928` | `e4ab3a61aecdb9e14e84159a11b4e5ca1608e87996d663114eedf903ab0654fa` |

Obe varijante imaju direktan alpha kanal. Canonical runtime paket zauzima `160.654 B` i približno `1,56 MB` dekodirane memorije.

### Room derivacija

`1254×1254 → 512×512` direktnim LANCZOS smanjenjem.

Rezultat je pixel-identičan i bajt-po-bajt identičan aktivnom `www/assets/green-soft-clay/statistics-free-v2.png` fajlu.

### Menu derivacija

`1254×1254 → 512×512 → 384×384`, sa LANCZOS smanjenjem u oba koraka.

Dvostepena derivacija je namerna: reprodukuje već odobreni meni asset bez promene siluete ili alpha ivica. Rezultat je pixel-identičan i bajt-po-bajt identičan aktivnom `runtime/menu/statistics-free-v2.png` fajlu.

## Reproducibilan build

`scripts/build-green-canonical-statistics-room-identity-pack.py`:

1. zahteva odobreni `1254×1254 RGBA` master source;
2. zahteva postojeće `512×512` room i `384×384` menu runtime fajlove;
3. proverava dimenzije i RGBA format sva tri inputa;
4. reprodukuje room i menu varijantu deklarisanim LANCZOS tokom;
5. pixel-level poređenjem prekida build ako izvedenice odstupaju od odobrenih aktivnih asseta;
6. kopira canonical master i zapisuje optimizovane transparentne PNG-ove;
7. ponovo proverava sačuvane dimenzije, sadržaj i SHA-256 otiske.

Build je ponovljen nakon izrade paketa i proizveo je iste manifestovane hash vrednosti.

## Source manifest

`source-assets/green-soft-clay-canonical/statistics-room-identity/manifest.json` čuva:

- `canonical` status;
- jedinstveni Green Soft Clay DNK glavne Statistics ikone;
- jedan immutable master;
- dve delivery uloge i njihove stvarne potrošače;
- aktivne i canonical putanje, dimenzije, bajtove i SHA-256 otiske;
- prikaze `52/46 px`, `34 px`, veliki intro clamp i Rules inline kontekst;
- main-menu wave i intro pulse motion ugovor;
- dvostepenu menu derivaciju;
- odbijeni `statistics-pro-v1` master/runtime sa nula aktivnih potrošača;
- plan povezivanja i uklanjanja legacy kopija u Koraku 3;
- granice prema Overview, H2H, Power Index, Rules ilustraciji, rangovima i drugim porodicama.

## Odbačeni kandidat

`statistics-pro-v1` ostaje dokumentovan kao odbijeni kandidat:

- high-resolution izvor: `1.422.943 B`;
- neaktivni runtime: `237.672 B`;
- aktivne UI reference: `0`;
- razlog odbijanja: kvadratni ram/podloga krši slobodnostojeći Green icon DNK;
- runtime trenutno nepotrebno ulazi u filesystem Statistics room audit preko starog `statistics-` prefiksa.

Nije kopiran u canonical paket.

## Automatska kontrola

`check-theme-performance.js` sada proverava:

- `canonical` status i odsustvo prevremene centralne registracije;
- tačno jedan master i dve delivery uloge pravilnim redosledom;
- postojanje, dimenzije, direktan alpha kanal, bajtove i SHA-256 svih canonical fajlova;
- bajt-po-bajt jednakost mastera sa odobrenim source fajlom;
- bajt-po-bajt jednakost room i menu varijante sa aktivnim runtime fajlovima;
- tačno četiri aktivne room reference i jednu aktivnu menu referencu;
- nula prevremenih canonical UI referenci;
- eksplicitno odbijeni `statistics-pro-v1`, njegove otiske i nula aktivnih veza;
- očuvanje postojećih main-menu, intro, header i Rules veza;
- main-menu prikaz `52/46 px`, wave ciklus `8,4 s` i Statistics delay `1,56 s`;
- header `34×34 contain` prikaz;
- intro scale `1.06`, otvaranje na `3,65 s`, završetak na `4,6 s` i `1,8 s` pulse;
- plan integracije i sve semantičke granice.

## Privremeni performance bilans

Dok zajedno postoje aktivne i canonical kopije:

- Green tema: `171 PNG`, `15,90 MB`;
- startup: nepromenjen, `17 PNG`, `4,56 MB / 20,44 MB decoded`;
- filesystem Statistics room audit: nepromenjen, `18 PNG`, jer novi namespace još nije deo aktivnog matchera;
- stvarni aktivni Statistics paket: `17 PNG` — jedan room identitet, deset Overview i šest H2H-specifičnih asseta;
- dva nova canonical runtime fajla: `160.654 B / 1.638.400 decoded B`.

Canonical menu varijanta još nije startup potrošač, a canonical room varijanta još nije room-on-demand potrošač. Zato ovaj privremeni duplikat nema uticaj na trenutno učitavanje aplikacije.

Posle Koraka 3 dve aktivne legacy kopije biće zamenjene canonical putanjama, a odbačeni runtime `statistics-pro-v1.png` uklonjen. High-resolution izvor ostaje kao audit trag izvan isporučenog `www` stabla. Projektovano finalno stanje ostaje `168 PNG`, `15,52 MB`, startup `17 PNG` i Statistics room `17 PNG`.

## Van opsega Koraka 2

- menjanje `index.html`, `game.js`, `pravilaigre.js` ili CSS-a;
- menjanje main-menu, intro, header ili Rules prikaza;
- menjanje startup ili room-on-demand matchera;
- uklanjanje postojećih `statistics-free-v2` runtime fajlova;
- uklanjanje odbačenog `statistics-pro-v1` runtime fajla;
- dodavanje porodice u centralni registry;
- povećavanje Green cache verzije;
- status `standardized` ili `locked`;
- commit ili objavljivanje.

## Sledeći korak

Korak 3 kontrolisano povezuje paket:

1. glavni meni prelazi na canonical `menu` varijantu;
2. intro, Statistics header, Rules i loading pack prelaze na canonical `room` varijantu;
3. startup i Statistics room matcher dobijaju precizne canonical putanje bez učitavanja obe varijante u sobi;
4. porodica ulazi u centralni registry sa statusom `standardized`;
5. tek nakon nula aktivnih legacy veza uklanjaju se dve `statistics-free-v2` runtime kopije i odbačeni `statistics-pro-v1` runtime, uz čuvanje high-resolution izvora za audit;
6. Green cache verzija se povećava radi sigurnog osvežavanja uređaja.

Nije rađen commit niti objavljivanje.
