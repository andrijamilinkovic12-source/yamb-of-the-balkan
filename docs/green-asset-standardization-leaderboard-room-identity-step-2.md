# Green Asset Standardization — Leaderboard Room Identity, Korak 2

## Ishod

Pripremljen je canonical `leaderboard-room-identity` paket iz postojećeg odobrenog Green motiva. Paket ima status `canonical`, ali još nije povezan sa UI-jem ili centralnim registrom. Nijedna aktivna putanja, dimenzija prikaza, animacija, preload konfiguracija, cache verzija ili funkcionalnost Top liste nije promenjena.

## Jedan master, dve isporučne varijante

| Uloga | Putanja | Dimenzija | Bajtova | SHA-256 |
|---|---|---:|---:|---|
| master | `source-assets/green-soft-clay-canonical/leaderboard-room-identity/green-leaderboard-room-master-v1.png` | `1254×1254` | `744.488` | `dcc99a6b2e939cadf36a3d9b40dc168afaa882d722f42637157b24a8f46a7182` |
| room | `www/assets/green-soft-clay/canonical/leaderboard-room-identity/leaderboard-room-v1.png` | `512×512` | `116.808` | `8acfb917163a7cf02142c1d0c5613c850cd5e882b8a586caead1d282c0d7aa0e` |
| menu | `www/assets/green-soft-clay/canonical/leaderboard-room-identity/leaderboard-room-menu-v1.png` | `384×384` | `72.226` | `a18d1f54fffc1de4047a066629313eef85d9a5f6934eee3cbd1a7cdc8a77a72b` |

Master je bajt-po-bajt kopija `source-assets/green-soft-clay-hires/leaderboard-free-v2.png`. `Room` je direktno LANCZOS smanjenje `1254→512`; `menu` je dvostepeno LANCZOS smanjenje `1254→512→384`. Direktno smanjenje na `384` nije pixel-identično odobrenom menu assetu, zato je sačuvan dvostepeni tok. Obe nove varijante su i pixel-identične i bajt-po-bajt identične odgovarajućim aktivnim fajlovima.

Sva tri canonical PNG-a su RGBA, imaju transparentan ugao i pun alpha opseg. Jedinstveni Green znak ostaje postolje od tri warm-ivory stuba na forest-green bazi sa jednom terracotta zvezdom, bez rama i podloge.

## Reproducibilnost i ugovor

`scripts/build-green-canonical-leaderboard-room-identity-pack.py` pre zapisivanja proverava odobrene SHA-256 otiske mastera i oba aktivna runtime fajla, RGBA format, dimenzije, alpha opseg i pixel-identičnost izvedenica. Posle zapisivanja ponovo proverava dimenzije, alpha opseg i otiske canonical fajlova. Build je uspešno ponovljen.

`source-assets/green-soft-clay-canonical/leaderboard-room-identity/manifest.json` evidentira jedan identitet, dve delivery uloge, potrošače, prikazne veličine, motion ugovor, aktivne i buduće putanje, odbačeni `leaderboard-pro-v1` kandidat i granice prema global/local tabovima, empty/loading stanju, General Podium medaljama i Rules ilustraciji.

`scripts/check-theme-performance.js` sada štiti `canonical` status bez prevremene registracije, sve fajlove i hash vrednosti, četiri aktivne room i jednu aktivnu menu referencu, nula canonical UI referenci, očuvane intro/header/menu veze i odsustvo aktivnog UI potrošača odbačene kvadratne `pro` slike.

## Privremeni performance bilans

Dok postoje i aktivne i canonical kopije, Green direktorijum ima `170 PNG / 16.461.429 B` (`15,70 MB`). Dva nova runtime fajla zajedno imaju `189.034 B` i `1.638.400 B` dekodirane memorije, ali nisu u aktivnom startup ili room-on-demand paketu. Startup ostaje `17 PNG / 4,56 MB / 20,44 MB decoded`.

Posle planirane zamene putanja i uklanjanja dva legacy runtimea i neaktivnog `leaderboard-pro-v1.png`, očekivano stanje je `167 PNG / 16.037.066 B` (`15,29 MB`). To je projekcija za Korak 3, ne već ostvareno stanje.

## Van opsega ovog koraka

- bez promena u `www/index.html`, `www/game.js`, `www/pravilaigre.js` i CSS-u;
- bez uklanjanja tri stara runtime PNG-a;
- bez menjanja global/local navigacionih glyph-ova, empty/loading stanja, medalja ili Rules ilustracije;
- bez registracije porodice kao `standardized` ili `locked`;
- bez komita ili objavljivanja.

Sledeći je Korak 3: kontrolisano povezivanje room/menu varijanti, precizan startup i room matcher, centralni registry, cache osvežavanje i tek zatim uklanjanje legacy runtimea bez aktivnih referenci.
