# Green Asset Standardization — Daily States, Korak 2

## Ishod

Formiran je reproducibilan canonical `daily-states` paket iz tri postojeća, odobrena Green mastera: `task`, `complete` i `already-played`. Nije korišćen ImageGen i nijedan glyph nije redizajniran.

Paket ima status `canonical`. Aktivni UI, Daily room-on-demand katalog i cache verzija `59` ostaju na postojećim `daily/*.png` putanjama do kontrolisane integracije u Koraku 3.

## Canonical katalog

| ID | Semantička uloga | Prikaz | Canonical runtime |
|---|---|---:|---:|
| `task` | aktivni zadatak i cilj Dnevnog izazova | `44 × 44` | `384 × 384` |
| `complete` | uspešno završen Dnevni izazov | `58 × 58` | `384 × 384` |
| `already-played` | već odigran izazov i replay lock | `104 × 104` | `384 × 384` |

Ovo ostaju tri različita stanja. Daily Room Identity, Rewarded Video i Ducat su zaštićene porodice i nisu njihove zamene.

## Canonical master paket

Direktorijum:

`source-assets/green-soft-clay-canonical/daily-states/`

- sadrži tri eksplicitno imenovana `1254 × 1254` RGBA mastera;
- svaki master je bajt-po-bajt kopija odgovarajućeg odobrenog high-resolution Green izvora;
- manifest beleži dimenzije, broj bajtova i SHA-256 svakog mastera i izvora.

## Canonical runtime paket

Direktorijum:

`www/assets/green-soft-clay/canonical/daily-states/`

| Runtime | Veličina | SHA-256 |
|---|---:|---|
| `task-v1.png` | `106.757` B | `750f23bcf3458d5017f838f9717560041279702a0c35a4f4dc4031504cc8ffe9` |
| `complete-v1.png` | `117.989` B | `bc340dc50f576c011e6073eb929a914a4538ab39a38a95b4423fbe3e863ba97d` |
| `already-played-v1.png` | `118.655` B | `3a5b3b09c98487465d463c855e343134a12e33fd15ab02ffe49d4ed0f58eca3e` |

Svaki canonical runtime:

- izveden je direktnom `1254 → 384` LANCZOS redukcijom punog transparentnog RGBA canvasa;
- zadržava transparentne uglove i puni alpha opseg;
- piksel-po-piksel i bajt-po-bajt je identičan odgovarajućem aktivnom runtime assetu;
- ostaje višestruko veći od stvarnog CSS prikaza i zato ne gubi kvalitet u aplikaciji.

## Reproducibilan build

`scripts/build-green-canonical-daily-states-pack.py`:

1. zahteva tačne dimenzije, broj bajtova i SHA-256 sva tri odobrena izvora;
2. proverava postojeće aktivne `384 × 384` runtime assete;
3. kopira izvore bajt-po-bajt kao canonical mastere;
4. izvodi canonical runtime PNG-ove direktnom LANCZOS redukcijom;
5. proverava RGBA, puni alpha opseg i transparentne uglove;
6. prekida build ako canonical rezultat nije piksel-po-piksel i bajt-po-bajt identičan odobrenom aktivnom runtimeu.

Dva uzastopna builda proizvode iste dimenzije, veličine i SHA-256 otiske.

## Automatska kontrola

`check-theme-performance.js` sada proverava:

- `canonical` status i odsustvo prevremene registracije porodice;
- tačan redosled `task`, `complete`, `already-played`;
- Soft Clay DNK, paletu, prezentaciju i tri različite semantičke uloge;
- byte-identical source/master i active/canonical parove;
- `1254 × 1254` master i `384 × 384` runtime dimenzije sa alpha kanalom;
- postojeće prikaze `44 × 44`, `58 × 58` i `104 × 104`;
- po dve aktivne legacy reference i nula canonical UI referenci pre Koraka 3;
- statična state stanja i odvojen `dailyDicePulse` samo za kockice;
- zaštitu Daily Room Identity, Rewarded Video i Ducat porodica;
- plan integracije, cache `59` i finalni audit koji je namerno ostavljen za Korak 4.

`check-green-asset-coverage.js` tri nove kopije vodi u zasebnoj `stagedCanonical` kategoriji, pa nijedan runtime PNG nije neklasifikovan ili dvostruko klasifikovan.

## Privremeni performance bilans

Dok zajedno postoje aktivne i canonical kopije:

- Green runtime ima `165 PNG` i `15.136.395 B` (`14,44 MiB`);
- tri staging kopije dodaju tačno `343.401 B`;
- startup paket je nepromenjen jer nema nove aktivne preload reference;
- aktivni Daily room paket ostaje `5 PNG`, `660.910 B` kompresovano i `3.407.872 B` procenjeno dekodirano;
- nakon Koraka 3 i uklanjanja tri identične stare kopije Green runtime se vraća na `162 PNG` i `14.792.994 B`.

Ovaj paket ne donosi kompresovanu uštedu jer canonical fajlovi namerno čuvaju odobrene piksele i isti format. Dobitak je jedan kontrolisan namespace, reproducibilan build i manifestom zaključan identitet bez dupliranja nakon integracije.

## Van opsega Koraka 2

- menjanje Daily UI i room-on-demand putanja;
- menjanje prikaznih dimenzija, motiona ili reduced-motion ponašanja;
- menjanje eligibility, score, reward, already-played ili replay-lock logike;
- menjanje Daily Room Identity, Rewarded Video ili Ducat asseta;
- brisanje aktivnih `daily/*.png` kopija;
- dodavanje `dailyStates` porodice u centralni registar;
- promena cache verzije `59`;
- označavanje porodice kao `standardized` ili `locked`.

## Sledeći korak

Korak 3 je kontrolisana integracija: povezivanje Daily UI i room-on-demand kataloga na canonical putanje, registracija `dailyStates` porodice, uklanjanje tri stare kopije tek kada više nemaju reference i podizanje cache verzije.

Nije rađen commit niti objavljivanje.
