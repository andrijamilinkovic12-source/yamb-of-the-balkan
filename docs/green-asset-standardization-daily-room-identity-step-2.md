# Green Asset Standardization — Daily Challenge Room Identity, Korak 2

## Ishod

Formiran je canonical `daily-room-identity` paket iz postojećeg odobrenog Green kalendara. Source manifest ima status `canonical`, ali paket još nije povezan sa UI-jem niti centralnim registrom. Aktivne putanje, cache verzija, prikazne dimenzije, intro, dnevna pravila, nagrade i preload tok nisu menjani.

Nije generisana nova ilustracija niti menjan vizuelni pravac. Jedini identitet ostaje slobodnostojeći warm-ivory kalendar sa terracotta gornjom trakom, dva forest-green držača i jednom forest-green kvačicom.

## Jedan master, dve isporučne varijante

| Uloga | Putanja | Dimenzija | Bajtova | SHA-256 |
|---|---|---:|---:|---|
| master | `source-assets/green-soft-clay-canonical/daily-room-identity/green-daily-room-master-v1.png` | `1254×1254` | `1.429.413` | `b4aee4510505f2b60fc8a321ac0bbaa60cfeb170a2bf7675dbc01440abf4b163` |
| room | `www/assets/green-soft-clay/canonical/daily-room-identity/daily-room-v1.png` | `512×512` | `209.611` | `1a0669083da288f1cb4bd673508acf0e6d4380b7fa1346c03004ebddd4343dcc` |
| menu | `www/assets/green-soft-clay/canonical/daily-room-identity/daily-room-menu-v1.png` | `384×384` | `124.828` | `ac6eae4d916598174fa9bb7a54f7ed326fa1f6dae7d5a4a68e1e4eb40b666c07` |

Master je bajt-po-bajt kopija `source-assets/green-soft-clay-hires/daily-challenge-free-v2.png`. Room izvedenica nastaje direktnim LANCZOS smanjenjem `1254→512`, a menu dvostepenim `1254→512→384`. Direktno `1254→384` ne reprodukuje odobrenu menu sliku. Obe canonical izvedenice su pixel-identične i bajt-po-bajt identične aktivnim runtime fajlovima.

Sva tri canonical PNG-a su RGBA, sa transparentnim uglom i punim alpha opsegom. Room i menu izvedenice zajedno imaju `334.439 B` i `1.638.400 B` dekodirane memorije.

## Reproducibilnost i manifest

`scripts/build-green-canonical-daily-room-identity-pack.py` pre zapisivanja proverava odobrene hash vrednosti mastera i oba aktivna runtime fajla, njihove dimenzije, RGBA/alpha kvalitet i pixel-identičnost LANCZOS izvedenica. Po zapisivanju proverava canonical dimenzije, alpha kvalitet i fiksne SHA-256 otiske. Build je uspešno ponovljen.

`source-assets/green-soft-clay-canonical/daily-room-identity/manifest.json` evidentira jedan identitet, room/menu uloge, potrošače, veličine, motion ugovor, postojeće i buduće putanje, odbačeni `daily-challenge-pro-v1` kandidat i semantičke granice prema ikoni zadatka, potvrdi završetka, already-played stanju i reward-video/dukat kompoziciji.

`scripts/check-theme-performance.js` sada proverava `canonical` status bez prevremene registracije, master i runtime otiske, četiri aktivne room i jednu aktivnu menu referencu, nula canonical UI referenci, sačuvan framed orphan i nepromenjene aktivne veze. Proverava i osnovne veličine/motion ugovora bez menjanja CSS-a.

## Privremeni performance bilans

Dok aktivne i canonical kopije postoje zajedno, Green tema ima `169 PNG / 16.371.505 B` (`15,61 MB`). Startup ostaje `17 PNG / 4,56 MB / 20,44 MB decoded`, jer nove canonical kopije još nisu potrošači. Posle planirane migracije dve aktivne kopije biće zamenjene, a neaktivni `daily-challenge-pro-v1.png` runtime uklonjen. Projekcija konačne isporuke je `166 PNG / 15.791.420 B` (`15,06 MB`); to nije stanje ovog koraka.

## Van opsega Koraka 2

- bez promena u `www/index.html`, `www/game.js`, `www/dnevniizazov.js`, `www/pravilaigre.js` ili CSS-u;
- bez uklanjanja aktivnih ili orphan runtime fajlova;
- bez menjanja Daily task/completed/already-played/reward-video asseta;
- bez centralne registracije, cache osvežavanja, commita ili objavljivanja.

Sledeći je Korak 3: kontrolisano povezivanje room/menu putanja, precizan startup i Daily room matcher, registracija porodice, cache osvežavanje i tek nakon nula starih UI referenci uklanjanje tri legacy runtime fajla. Korak 4 je završni audit i zaključavanje.
