# Green Asset Standardization — Settings Room Identity, Korak 2

## Ishod

Formiran je canonical `settings-room-identity` paket iz postojećeg odobrenog Green zupčanika. Source manifest ima status `canonical`, ali paket još nije povezan sa UI-jem niti centralnim registrom. Aktivne putanje, cache verzija, CSS dimenzije, intro, korisnička podešavanja i preload tok nisu menjani.

Nije generisana nova ilustracija niti menjan vizuelni pravac. Jedini identitet ostaje slobodnostojeći forest-green zupčanik sa warm-ivory prstenom i terracotta tačkom u centru.

## Jedan master, dve isporučne varijante

| Uloga | Putanja | Dimenzija | Bajtova | SHA-256 |
|---|---|---:|---:|---|
| master | `source-assets/green-soft-clay-canonical/settings-room-identity/green-settings-room-master-v1.png` | `1254×1254` | `1.208.329` | `e7c20cc7fc3fce6a93c3c69cff6c14e398f405cd80037180c53cc1d89aa8ee67` |
| room | `www/assets/green-soft-clay/canonical/settings-room-identity/settings-room-v1.png` | `512×512` | `195.989` | `ab4a2390a61348440cd594ade5aef57c0c1a3a05c0b3f6007b5783630f5ab3c9` |
| menu | `www/assets/green-soft-clay/canonical/settings-room-identity/settings-room-menu-v1.png` | `384×384` | `118.253` | `9018529478652929f353e24edf8c02edb1193896791e39b3284b664862915201` |

Master je bajt-po-bajt kopija `source-assets/green-soft-clay-hires/settings-free-v2.png`. Room izvedenica nastaje direktnim LANCZOS smanjenjem `1254→512`, a menu dvostepenim `1254→512→384`. Direktno `1254→384` ne reprodukuje odobrenu menu sliku. Obe canonical izvedenice su pixel-identične i bajt-po-bajt identične aktivnim runtime fajlovima.

Sva tri canonical PNG-a su RGBA, sa transparentnim uglom i punim alpha opsegom. Room i menu izvedenice zajedno imaju `314.242 B` i `1.638.400 B` dekodirane memorije.

## Reproducibilnost i manifest

`scripts/build-green-canonical-settings-room-identity-pack.py` pre zapisivanja proverava odobrene hash vrednosti izvora i oba aktivna runtime fajla, dimenzije, RGBA/alpha kvalitet i pixel-identičnost LANCZOS izvedenica. Po zapisivanju proverava canonical dimenzije, alpha kvalitet i fiksne SHA-256 otiske. Build je uspešno ponovljen.

`source-assets/green-soft-clay-canonical/settings-room-identity/manifest.json` evidentira jedan identitet, room/menu uloge, potrošače, veličine, motion ugovor, postojeće i buduće putanje, odbačeni `settings-pro-v1` kandidat i semantičke granice prema osam ikonama pojedinačnih opcija.

`scripts/check-theme-performance.js` sada proverava `canonical` status bez prevremene registracije, master i runtime otiske, četiri aktivne room i jednu aktivnu menu referencu, nula canonical UI referenci, sačuvan framed orphan i nepromenjene aktivne veze. Proverava i osnovne dimenzije/motion ugovora bez menjanja CSS-a.

## Privremeni performance bilans

Dok aktivne i canonical kopije postoje zajedno, Green tema ima `168 PNG / 16.105.662 B` (`15,36 MB`). Startup ostaje `17 PNG / 4,56 MB / 20,44 MB decoded`, jer nove canonical kopije još nisu potrošači. Posle planirane migracije dve aktivne kopije biće zamenjene, a neaktivni `settings-pro-v1.png` runtime uklonjen. Projekcija konačne isporuke je `165 PNG / 15.537.363 B` (`14,82 MB`); to nije stanje ovog koraka.

## Van opsega Koraka 2

- bez promena u `www/index.html`, `www/game.js`, `www/pravilaigre.js` ili CSS-u;
- bez uklanjanja aktivnih ili orphan runtime fajlova;
- bez menjanja osam `settings/` ikona, obrazaca, prekidača i pravnih linkova;
- bez centralne registracije, cache osvežavanja, commita ili objavljivanja.

Sledeći je Korak 3: kontrolisano povezivanje room/menu putanja, precizan startup i Settings room matcher, registracija porodice, cache osvežavanje i tek nakon nula starih UI referenci uklanjanje tri legacy runtime fajla. Korak 4 je završni audit i zaključavanje.
