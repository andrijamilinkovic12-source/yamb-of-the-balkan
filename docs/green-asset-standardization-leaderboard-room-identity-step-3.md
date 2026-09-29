# Green Asset Standardization — Leaderboard Room Identity, Korak 3

## Ishod

Canonical `leaderboard-room-identity` paket je povezan sa svim aktivnim Green potrošačima. Source manifest i centralni registry imaju status `standardized`; završni vizuelni i tehnički audit i `locked` status slede u Koraku 4.

Glavni znak Top liste ostaje isto odobreno slobodnostojeće glineno postolje sa jednom terracotta zvezdom. Canonical PNG-ovi su bajt-po-bajt identični prethodnim aktivnim room i menu izvedenicama. CSS dimenzije, motion, filteri, rangiranje, podaci, paginacija i geometrija nisu menjani.

## Povezani potrošači

| Potrošač | Varijanta | Očuvan prikaz |
|---|---|---|
| Glavni meni i startup | `leaderboard-room-menu-v1.png`, `384×384` | `52×52` / uski portrait `46×46`, talas `8,4 s`, delay `1,38 s` |
| Intro Top liste | `leaderboard-room-v1.png`, `512×512` | icon-only, scale `1.16`, pulse `1,8 s`, soba `3,65 s`, overlay `4,6 s` |
| Zaglavlje Top liste | `leaderboard-room-v1.png` | `32×32`, `contain` |
| Pravila, SR i EN | `leaderboard-room-v1.png` | „Bodovanje i sekcije / Scoring & Sections” i „Top liste i rangiranje / Leaderboards” |
| Theme loading gate | `leaderboard-room-v1.png` | zajednički `45×45` prikaz |
| Room-on-demand | `leaderboard-room-v1.png` | samo pri ulasku u Top listu |

Aktivna Green mapa za `leaderboard` sobu sada prepoznaje tačnu canonical room putanju. Ne prepoznaje menu izvedenicu. Startup fallback prepoznaje canonical menu putanju, dok uobičajeni startup uzima izvor iz stvarnog dugmeta glavnog menija.

## Centralni registar i semantičke granice

`leaderboardRoomIdentity` u `www/themes/green/asset-registry.json` sadrži jedan vizuelni identitet, dve delivery uloge, dimenzije i SHA-256 otiske, zabranjene legacy putanje i istorijsko mapiranje. Registar eksplicitno odbija kvadratni `leaderboard-pro-v1` motiv kao orphan. Global/local tabovi, empty/loading simbol koji se deli i sa online waiting prikazom, već zaključane General Podium medalje i Rules narativna ilustracija ostaju zasebni.

Green cache verzija povećana je sa `48` na `49` da se nove putanje pouzdano osveže na uređaju.

## Uklonjene runtime kopije

Posle provere da aktivni HTML/JS nema starih referenci, uklonjene su samo ove tri datoteke:

1. `www/assets/green-soft-clay/leaderboard-free-v2.png` — stari room/intro/header runtime;
2. `www/assets/green-soft-clay/runtime/menu/leaderboard-free-v2.png` — stari menu runtime;
3. `www/assets/green-soft-clay/leaderboard-pro-v1.png` — neaktivni uramljeni kandidat.

Ove datoteke su bile praćene Gitom i mogu se vratiti iz istorije; nijedan high-resolution izvor nije obrisan. Odobreni master i odbijeni `pro` source ostaju u `source-assets`, van isporučenog `www` stabla.

Reproducibilni build sada zavisi samo od odobrenog `1254×1254` izvora. Ponovljen je nakon uklanjanja starih runtime fajlova i proizveo je iste SHA-256 otiske: room `8acfb917163a7cf02142c1d0c5613c850cd5e882b8a586caead1d282c0d7aa0e`, menu `a18d1f54fffc1de4047a066629313eef85d9a5f6934eee3cbd1a7cdc8a77a72b`.

## Bilans učitavanja

- Green tema: `167 PNG / 16.037.066 B` (`15,29 MB`).
- Startup: `17 PNG / 4,56 MB / 20,44 MB decoded` — broj i memorijski budžet nisu porasli.
- Top lista room-on-demand: `7 PNG / 449.668 B / 2.949.120 decoded B` — jedan room identitet, global/local/empty state i tri već zaključane General Podium medalje.
- Najveći Green room paket ostaje Riznica: `44 PNG / 2,94 MB / 13,70 MB decoded`.

U odnosu na stanje pre Koraka 2 isporuka je manja za jedan neaktivni `leaderboard-pro-v1.png` runtime (`235.329 B`); dve aktivne varijante su samo premeštene na canonical putanje bez promene sadržaja.

## Provere i sledeći korak

`check-theme-performance.js` proverava manifest i registry, hash vrednosti, tačan broj canonical veza, nula starih veza, odsustvo tri retired runtime fajla, obuhvat Pravila, startup/room izolaciju i očuvan meni/header/intro ugovor. Reproducibilni build je prošao nakon migracije.

Korak 4 je završni vizuelni, semantički i tehnički audit u stvarnim prikaznim veličinama. Tek nakon tog audita porodica prelazi iz `standardized` u `locked`.

Nije rađen commit niti objavljivanje.
