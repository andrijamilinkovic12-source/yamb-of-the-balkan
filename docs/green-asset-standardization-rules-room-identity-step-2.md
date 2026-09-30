# Green Asset Standardization — Rules Room Identity, Korak 2

## Ishod

Formiran je canonical `rules-room-identity` paket iz postojeće odobrene Green knjige. Source manifest ima status `canonical`, ali paket još nije povezan sa UI-jem niti centralnim registrom. Aktivne putanje, cache verzija, CSS dimenzije, intro, tekst i navigacija Pravila, šest ilustracija stranica i preload tok nisu menjani.

Nije generisana nova ilustracija niti menjan vizuelni pravac. Jedini identitet ostaje slobodnostojeća warm-ivory otvorena knjiga sa forest-green hrptom i linijama, te jednom terracotta obeleživač-trakom.

## Jedan master, dve isporučne varijante

| Uloga | Putanja | Dimenzija | Bajtova | SHA-256 |
|---|---|---:|---:|---|
| master | `source-assets/green-soft-clay-canonical/rules-room-identity/green-rules-room-master-v1.png` | `1254×1254` | `1.034.779` | `f53a6399c03855ca78bd6c78335bffe61be1f4da744a36406ad49e12b948218a` |
| room | `www/assets/green-soft-clay/canonical/rules-room-identity/rules-room-v1.png` | `512×512` | `175.314` | `48527b7eb726778604fc25ba437d0d350a3ab97708c7c4d3dd8ad19c537a8ae4` |
| menu | `www/assets/green-soft-clay/canonical/rules-room-identity/rules-room-menu-v1.png` | `384×384` | `108.123` | `d00302c37418b3f87b8d4077a54a6c1742e1d78199dd1065e32dc3685a742d1a` |

Master je bajt-po-bajt kopija `source-assets/green-soft-clay-hires/rules-free-v2.png`. Room izvedenica nastaje direktnim LANCZOS smanjenjem `1254→512`, a menu dvostepenim `1254→512→384`. Direktno `1254→384` ne reprodukuje odobrenu menu sliku. Obe canonical izvedenice su pixel-identične i bajt-po-bajt identične aktivnim runtime fajlovima.

Sva tri canonical PNG-a su RGBA, sa transparentnim uglom i punim alpha opsegom. Room i menu izvedenice zajedno imaju `283.437 B` i `1.638.400 B` dekodirane memorije.

## Reproducibilnost i manifest

`scripts/build-green-canonical-rules-room-identity-pack.py` pre zapisivanja proverava odobrene hash vrednosti izvora i oba aktivna runtime fajla, dimenzije, RGBA/alpha kvalitet i pixel-identičnost LANCZOS izvedenica. Po zapisivanju proverava canonical dimenzije, alpha kvalitet i fiksne SHA-256 otiske. Build je uspešno ponovljen.

`source-assets/green-soft-clay-canonical/rules-room-identity/manifest.json` evidentira jedan identitet, room/menu uloge, potrošače, veličine, motion ugovor, postojeće i buduće putanje, odbačeni `rules-pro-v1` kandidat i semantičke granice prema šest ilustracija stranica, njihovim naslovima, inline simbolima i samom tekstu Pravila.

`scripts/check-theme-performance.js` sada proverava `canonical` status bez prevremene registracije, master i runtime otiske, četiri aktivne room i jednu aktivnu menu referencu, nula canonical UI referenci, sačuvan framed orphan i nepromenjene aktivne veze. Proverava i očuvane veze svih šest ilustracija u Rules sadržaju i paketu sobe, kao i osnovne veličine/motion ugovora bez menjanja CSS-a.

## Privremeni performance bilans

Dok aktivne i canonical kopije postoje zajedno, Green tema ima `167 PNG / 15.820.800 B` (`15,09 MB`). Startup ostaje `17 PNG / 4,56 MB / 20,44 MB decoded`, jer nove canonical kopije još nisu potrošači. Posle planirane migracije dve aktivne kopije biće zamenjene, a neaktivni `rules-pro-v1.png` runtime uklonjen. Projekcija konačne isporuke je `164 PNG / 15.293.345 B` (`14,58 MB`); to nije stanje ovog koraka.

## Van opsega Koraka 2

- bez promena u `www/index.html`, `www/game.js`, `www/pravilaigre.js` ili CSS-u;
- bez uklanjanja aktivnih ili orphan runtime fajlova;
- bez menjanja šest `rules/pages/` scena, naslova, inline ikona, tekstova i swipe/dot navigacije;
- bez centralne registracije, cache osvežavanja, commita ili objavljivanja.

Sledeći je Korak 3: kontrolisano povezivanje room/menu putanja, precizan startup i Rules room matcher, registracija porodice, cache osvežavanje i tek nakon nula starih UI referenci uklanjanje tri legacy runtime fajla. Korak 4 je završni audit i zaključavanje.
