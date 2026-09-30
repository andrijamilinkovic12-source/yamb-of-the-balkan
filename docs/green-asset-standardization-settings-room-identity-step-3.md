# Green Asset Standardization — Settings Room Identity, Korak 3

## Ishod

Canonical `settings-room-identity` paket je povezan sa svim aktivnim Green potrošačima. Source manifest i centralni registry imaju status `standardized`. Završni vizuelni i tehnički audit i status `locked` slede u Koraku 4.

Glavni znak Podešavanja ostaje isti odobreni slobodnostojeći glineni zupčanik. Canonical room i menu PNG-ovi su bajt-po-bajt identični prethodnim aktivnim isporukama. CSS dimenzije, intro trajanje, osam ikona opcija, formulari, nalozi i korisničke postavke nisu menjani.

## Povezani potrošači

| Potrošač | Canonical varijanta | Očuvan prikaz |
|---|---|---|
| Glavni meni i startup | `settings-room-menu-v1.png`, `384×384` | `52×52` / uski portrait `46×46`, talas `8,4 s`, delay `1,74 s` |
| Settings icon-only intro | `settings-room-v1.png`, `512×512` | `clamp(210px, 34vmin, 290px)`, scale `1`, pulse `1,8 s`, soba `3,65 s`, overlay `4,6 s` |
| Zaglavlje Podešavanja | `settings-room-v1.png` | `32×32`, `contain` |
| Pravila, SR i EN | `settings-room-v1.png` | „Server podrška i bezbednost / Server Support & Security” |
| Theme loading gate | `settings-room-v1.png` | zajednički `45×45` prikaz |
| Room-on-demand | `settings-room-v1.png` | samo pri ulasku u Settings sobu |

Startup fallback sada prepoznaje canonical menu putanju. Settings room matcher prepoznaje tačnu canonical room putanju, ali ne i menu izvedenicu. U uobičajenom toku startup čita menu sliku sa stvarnog dugmeta glavnog menija.

## Registry, granice i cache

`settingsRoomIdentity` u `www/themes/green/asset-registry.json` sadrži jedan identitet, dve delivery uloge, rezolucije, SHA-256 otiske, tri zabranjene stare runtime putanje i istorijsko mapiranje. Osam ikona opcija u `settings/` nije preimenovano niti zamenjeno glavnim zupčanikom: profil, zvuk, muzika, vibracija, prikaz/tema, jezik, uslovi i privatnost ostaju različiti pojmovi. Pravni linkovi i kontrolni elementi ostaju funkcionalni UI.

Green cache verzija povećana je sa `50` na `51` radi osvežavanja novih putanja na uređajima.

## Uklonjene runtime kopije

Nakon potvrde nula aktivnih UI referenci uklonjene su samo tri datoteke:

1. `www/assets/green-soft-clay/settings-free-v2.png` — stara room/intro/header isporuka;
2. `www/assets/green-soft-clay/runtime/menu/settings-free-v2.png` — stara menu isporuka;
3. `www/assets/green-soft-clay/settings-pro-v1.png` — neaktivni uramljeni orphan.

To je ukupno `568.299 B` uklonjenih starih runtime kopija. Git prati te fajlove, pa su obnovljivi iz istorije. Odobreni i odbijeni high-resolution izvori ostaju sačuvani u `source-assets`, van `www` isporuke.

Build skripta više ne zavisi od uklonjenih fajlova. Posle migracije ponovo je proizvela iste fiksne otiske: room `ab4a2390a61348440cd594ade5aef57c0c1a3a05c0b3f6007b5783630f5ab3c9`, menu `9018529478652929f353e24edf8c02edb1193896791e39b3284b664862915201`.

## Bilans učitavanja

- Green tema: `165 PNG / 15.537.363 B` (`14,82 MB`).
- Startup: `17 PNG / 4,56 MB / 20,44 MB decoded` — broj i memorijski budžet nisu porasli.
- Settings room-on-demand: `9 PNG / 554.053 B / 3.145.728 decoded B` — jedan room identitet i osam ikona opcija.
- Najveći Green room paket ostaje Riznica: `44 PNG / 2,94 MB / 13,70 MB decoded`.

U odnosu na stanje pre Koraka 2 isporuka je manja za neaktivni `settings-pro-v1.png` runtime (`254.057 B`); dve aktivne slike premeštene su na canonical putanje bez promene sadržaja.

## Provere i sledeći korak

`check-theme-performance.js` štiti status u manifestu i registru, hash vrednosti, broj canonical veza, nula starih veza, odsustvo tri retired runtime fajla, SR/EN Rules prikaz, meni/intro/header ugovor i startup/room izolaciju. Reproducibilni build prošao je i nakon uklanjanja legacy kopija.

Korak 4 je završni vizuelni, semantički i tehnički audit u stvarnim prikaznim veličinama. Posle njega porodica prelazi iz `standardized` u `locked`.

Nije rađen commit niti objavljivanje.
