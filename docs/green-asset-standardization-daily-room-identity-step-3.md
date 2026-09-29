# Green Asset Standardization — Daily Challenge Room Identity, Korak 3

## Ishod

Canonical `daily-room-identity` paket je povezan sa svim aktivnim Green potrošačima. Source manifest i centralni registry imaju status `standardized`. Završni vizuelni i tehnički audit i status `locked` slede u Koraku 4.

Glavni znak Dnevnog izazova ostaje isti odobreni glineni kalendar sa jednom forest-green kvačicom. Canonical room i menu PNG-ovi su bajt-po-bajt identični prethodnim aktivnim isporukama. CSS dimenzije, intro trajanje, dnevni zadatak, serverom odabrane kockice, bodovanje, reklame, nagrade i raspored nisu menjani.

## Povezani potrošači

| Potrošač | Canonical varijanta | Očuvan prikaz |
|---|---|---|
| Glavni meni i startup | `daily-room-menu-v1.png`, `384×384` | `52×52` / uski portrait `46×46`, talas `8,4 s`, delay `1,2 s` |
| Poseban Daily intro | `daily-room-v1.png`, `512×512` | icon-only, `clamp(210px, 34vmin, 290px)`, pulse `1,8 s`, soba `3,65 s`, overlay `4,6 s` |
| Zaglavlje Dnevnog izazova | `daily-room-v1.png` | `54×54`, `contain` |
| Pravila, SR i EN | `daily-room-v1.png` | isti motiv uz „Dnevni izazov / Daily Challenge” |
| Theme loading gate | `daily-room-v1.png` | zajednički `45×45` prikaz |
| Room-on-demand | `daily-room-v1.png` | samo pri ulasku u Daily sobu |

Startup fallback sada prepoznaje canonical menu putanju. Daily room matcher prepoznaje tačnu canonical room putanju, ali ne i menu izvedenicu. U uobičajenom toku startup čita menu sliku sa stvarnog dugmeta glavnog menija.

## Registry, granice i cache

`dailyRoomIdentity` u `www/themes/green/asset-registry.json` sadrži jedan identitet, dve delivery uloge, dimenzije, SHA-256 otiske, tri zabranjene stare runtime putanje i istorijsko mapiranje. `daily/task-v1.png`, `daily/complete-v1.png`, `daily/already-played-v1.png` i `daily/reward-video-v3.png` nisu preimenovani ili zamenjeni glavnom ikonom sobe: predstavljaju različite akcije/stanja. Posebno, already-played kalendar sa satom nije druga room ikona, a reward-video kompozicija koristi već zaključan ticket i dukat.

Green cache verzija povećana je sa `49` na `50` radi osvežavanja novih putanja na uređajima.

## Uklonjene runtime kopije

Nakon potvrde nula aktivnih UI referenci uklonjene su samo tri datoteke:

1. `www/assets/green-soft-clay/daily-challenge-free-v2.png` — stara room/intro/header isporuka;
2. `www/assets/green-soft-clay/runtime/menu/daily-challenge-free-v2.png` — stara menu isporuka;
3. `www/assets/green-soft-clay/daily-challenge-pro-v1.png` — neaktivni uramljeni orphan.

Git prati te fajlove, pa su obnovljivi iz istorije. Odobreni i odbijeni high-resolution izvori ostaju sačuvani u `source-assets`, van `www` isporuke.

Build skripta sada zavisi samo od odobrenog `1254×1254` izvora. Posle uklanjanja legacy kopija ponovo je proizvela iste fiksne otiske: room `1a0669083da288f1cb4bd673508acf0e6d4380b7fa1346c03004ebddd4343dcc`, menu `ac6eae4d916598174fa9bb7a54f7ed326fa1f6dae7d5a4a68e1e4eb40b666c07`.

## Bilans učitavanja

- Green tema: `166 PNG / 15.791.420 B` (`15,06 MB`).
- Startup: `17 PNG / 4,56 MB / 20,44 MB decoded` — broj i memorijski budžet nisu porasli.
- Daily room-on-demand: `5 PNG / 660.910 B / 3.407.872 decoded B` — jedan room identitet, task, completed, already-played i reward-video kompozicija.
- Najveći Green room paket ostaje Riznica: `44 PNG / 2,94 MB / 13,70 MB decoded`.

U odnosu na stanje pre Koraka 2 isporuka je manja za neaktivni `daily-challenge-pro-v1.png` runtime (`245.646 B`); dve aktivne slike su premeštene na canonical putanje bez promene sadržaja.

## Provere i sledeći korak

`check-theme-performance.js` čuva manifest i registry, hash vrednosti, broj canonical veza, nula starih veza, odsustvo tri retired runtime fajla, srpski/engleski Rules prikaz, meni/intro/header ugovor i startup/room izolaciju. Reproducibilni build je prošao nakon migracije.

Korak 4 je završni vizuelni, semantički i tehnički audit u stvarnim prikaznim veličinama. Posle njega porodica prelazi iz `standardized` u `locked`.

Nije rađen commit niti objavljivanje.
