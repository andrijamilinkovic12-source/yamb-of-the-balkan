# Green Asset Standardization — H2H Statistics, Korak 2

## Ishod

Formiran je canonical `h2h-statistics` paket sa šest jedinstvenih H2H identiteta i tri eksplicitne reference na već zaključane Statistics Overview identitete.

Paket ima status `canonical`. Aktivna aplikacija i dalje koristi postojeće `statistics/h2h*.png` putanje do integracionog Koraka 3. Nijedan H2H podatak, formula, modal, CSS dimenzija, motion, preload matcher ili UI raspored nije promenjen.

Nije korišćen ImageGen niti je bilo koji glyph redizajniran.

## Canonical katalog

| ID | Semantička uloga | Master | Canonical runtime |
|---|---|---:|---:|
| `h2h-identity` | H2H naslov, rival i Rules identitet | `1254 × 1254` | `256 × 256` |
| `h2h-empty` | nema rivala ili odigranih duela | `1254 × 1254` | `384 × 384` |
| `highest-score` | najbolji rezultat protiv izabranog rivala | `1254 × 1254` | `256 × 256` |
| `max-win-margin` | najveća pobednička razlika protiv rivala | `1774 × 887` | `256 × 128` |
| `worst-loss-margin` | najveća porazna razlika protiv rivala | `1254 × 1254` | `256 × 256` |
| `versus` | vizuelni separator dva igrača | `1254 × 1254` | `256 × 256` |

`h2h-empty` zadržava kvalitetniji `384 × 384` runtime jer se prikazuje kao veće prazno stanje. `max-win-margin` zadržava native odnos stranica `2:1`; nije kvadriran niti rastegnut.

## Deljeni canonical identiteti

Tri H2H uloge ne dobijaju nove kopije:

| H2H uloga | Zaključani canonical identitet | Razlog |
|---|---|---|
| niz pobeda protiv rivala | `statisticsOverview/fire-streak` | isti pojam, drugačiji opseg podataka |
| nerešeni dueli protiv rivala | `statisticsOverview/draws` | isti pojam, drugačiji brojač |
| prosek protiv rivala | `statisticsOverview/average` | isti pojam, drugačiji skup partija |

Source manifest evidentira trenutne H2H legacy putanje i hash vrednosti, ciljnu canonical porodicu, ciljnu ulogu i migraciono pravilo. U Koraku 2 aktivne veze još nisu prebačene.

Ovo pravilo standardizuje vizuelni identitet, ali ne spaja podatke:

- H2H Vatreni niz ostaje `currentWinStreak/maxWinStreak` konkretnog rivala;
- H2H nerešeno ostaje `draws` konkretnog rivala;
- H2H prosek ostaje `myTotalScore/gamesWithScore` konkretnog rivala.

## Canonical master paket

Direktorijum:

`source-assets/green-soft-clay-canonical/h2h-statistics/`

Sadrži šest eksplicitno imenovanih RGBA mastera, bajt-po-bajt preuzetih iz odobrenih high-resolution Green izvora. Ukupna veličina master paketa je `3.749.937` bajtova.

| Master | Bajtova | SHA-256 |
|---|---:|---|
| `green-h2h-identity-master-v1.png` | `601.381` | `57929c5f401337e5181425fcc48e485a8fa8692fda247e8cd7cdcfbd96ff1fad` |
| `green-h2h-empty-master-v1.png` | `487.661` | `c635137433b4819f3f26fbb46273c7dc6eba5db7580b5acc31dd8bee6ca9fef1` |
| `green-highest-score-master-v1.png` | `755.401` | `27703f4146facc5743be7125c78b99f04ed92413a2cdb6965f1743b488896fcd` |
| `green-max-win-margin-master-v1.png` | `292.783` | `cf0ead6d5a75ba8fdf19c0183ce5093879102af38ceb4bd2ef5c8b0f5353f0c3` |
| `green-worst-loss-margin-master-v1.png` | `620.933` | `152d3cf6b50859125d82dfbc2b4843fd6372870d9e0469c5b593de828b56f866` |
| `green-versus-master-v1.png` | `991.778` | `b519eb42eb2dac64fea5b646574df495b628681a1c55cb7c35508c42501136ab` |

## Canonical runtime paket

Direktorijum:

`www/assets/green-soft-clay/canonical/h2h-statistics/`

| Runtime | Bajtova | SHA-256 |
|---|---:|---|
| `h2h-identity-v1.png` | `32.497` | `de557083a92dbb1c6a7b61286976a052ee04ad2a31db38c01708e8148aa87941` |
| `h2h-empty-v1.png` | `49.705` | `43bc21b1893ae56d609d69ad429cdfc502e343fcd08c1df7956bbfb74f358c70` |
| `highest-score-v1.png` | `32.775` | `82457189670699df4ab70a44f29e85f6c14233177d732a6f9ad164eb5306fe9c` |
| `max-win-margin-v1.png` | `8.856` | `473eb985d4f6e876134c8597f3fac345a3ba938b2094d1cec6055354355bd24c` |
| `worst-loss-margin-v1.png` | `29.980` | `d318a8ea88f1fb22ba8e49a05b126846789bb57c34fe564841261710b429ab21` |
| `versus-v1.png` | `52.887` | `c4b26891699042c903f204c3551b9d6bf526642dd96c90bcc630e648dde54534` |

Canonical runtime paket ima `206.700` bajtova i približno `1,69 MB` dekodirane memorije. Svaki runtime je bajt-po-bajt identičan svojoj trenutno aktivnoj odobrenoj izvedenici.

## Reproducibilan build

`scripts/build-green-canonical-h2h-statistics-pack.py`:

1. zahteva svih šest odobrenih high-resolution source fajlova;
2. zahteva svih šest postojećih aktivnih runtime fajlova;
3. proverava njihove native dimenzije i RGBA format;
4. direktnim LANCZOS skaliranjem izvodi deklarisanu runtime dimenziju;
5. pixel-level poređenjem zahteva identičnost izvedenice i odobrenog aktivnog runtimea;
6. kopira source fajl kao canonical master;
7. zapisuje optimizovan transparentni canonical PNG;
8. prekida proces pri bilo kom nedostatku ili odstupanju.

Build je ponovljen nakon izrade paketa i svih šest runtime hash vrednosti odgovara manifestu.

## Source manifest

`source-assets/green-soft-clay-canonical/h2h-statistics/manifest.json` čuva:

- `canonical` status;
- vizuelni Green Soft Clay DNK;
- šest sopstvenih canonical identiteta;
- tri spoljne reference na zaključani Statistics Overview paket;
- semantičke uloge, glyph opise i stvarne potrošače;
- CSS prikaze `16`, `26`, `29`, `50`, `54` i `92` piksela, uz Rules inline prikaz;
- native master i runtime dimenzije;
- source, canonical i aktivne SHA-256 otiske;
- postojeće legacy putanje;
- plan integracije i uklanjanja kopija za Korak 3;
- granice prema globalnim statistikama, rezultatima, rangovima, avatarima i gameplay/economy porodicama.

## Automatska kontrola

`check-theme-performance.js` sada proverava:

- `canonical` status i odsustvo prevremene registracije u centralnom registru;
- tačno šest sopstvenih i tri deljene semantičke uloge;
- redosled, glyph siluete i prikazne dimenzije;
- jedinstvenost šest master i runtime sadržaja;
- postojanje canonical i aktivnih fajlova;
- native dimenzije, direktan alpha kanal i SHA-256 integritet;
- canonical konvenciju imena;
- bajt-po-bajt jednakost šest canonical i aktivnih runtime fajlova;
- očuvanje `1774×887 → 256×128` Max Win Margin formata;
- očekivani broj aktivnih potrošača i nula prevremenih canonical veza;
- mapiranje tri reference na zaključane `fire-streak`, `draws` i `average` registry uloge i hash vrednosti;
- očuvanje postojećeg H2H detail mappera do Koraka 3;
- postojeće H2H izvore podataka;
- kompletan plan integracije i semantičke granice.

## Privremeni performance bilans

Dok zajedno postoje aktivne i canonical kopije:

- Green tema: `178 PNG`, `16,01 MB`;
- startup: nepromenjen, `17 PNG`, `4,56 MB / 20,44 MB decoded`;
- aktivni Statistics room paket: nepromenjen, `21 PNG`, `940.096 B / 7.274.496 decoded B`;
- šest novih canonical runtime fajlova: `206.700 B / 1.769.472 decoded B`.

Canonical H2H namespace još nije deo aktivnog room matchera, pa nema uticaja na trenutno učitavanje sobe. Nakon Koraka 3 uklanja se šest zamenjenih legacy kopija i tri semantička duplikata, pa je projektovano finalno stanje `169 PNG`, a Statistics room `18 PNG`.

## Van opsega Koraka 2

- menjanje `index.html`, `game.js`, `pravilaigre.js` ili CSS-a;
- menjanje H2H vrednosti, formula, sortiranja, modala ili share toka;
- menjanje room-on-demand matchera;
- povećavanje Green cache verzije;
- uklanjanje postojećih devet H2H runtime fajlova;
- dodavanje porodice u centralni registry;
- status `standardized` ili `locked`;
- commit ili objavljivanje.

## Sledeći korak

Korak 3 kontrolisano povezuje sve H2H overview, empty, invite, Rules i detail potrošače:

1. šest H2H-specifičnih uloga prelazi na `canonical/h2h-statistics/`;
2. `win-streak`, `draws` i `average` prelaze na postojeći `canonical/statistics-overview/`;
3. Statistics room matcher dobija canonical H2H namespace;
4. porodica ulazi u centralni registry sa statusom `standardized`;
5. tek nakon nula aktivnih legacy veza uklanja se svih devet starih H2H runtime fajlova;
6. Green cache verzija se povećava radi sigurnog osvežavanja uređaja.

Nije rađen commit niti objavljivanje.
