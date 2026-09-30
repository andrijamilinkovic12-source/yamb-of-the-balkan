# Green Asset Standardization — Rules Room Identity, Korak 3

## Ishod

Kanonski `rules-room-identity` paket povezan je sa svim aktivnim Green potrošačima. Izvorni manifest i centralni registry imaju status `standardized`. Završni vizuelni i tehnički audit, pa status `locked`, ostaju za Korak 4.

Znak Pravila je isti odobreni slobodnostojeći glineni otvoreni list/knjiga. Kanonske room i menu isporuke imaju iste SHA-256 otiske kao prethodne aktivne isporuke; ništa nije ponovo dizajnirano. Svih šest ilustracija stranica, naslovi na srpskom i engleskom, tekst Pravila, navigacija i swipe ponašanje ostali su netaknuti.

## Povezani potrošači

| Potrošač | Kanonska varijanta | Očuvan prikaz |
|---|---|---|
| Glavni meni i startup | `rules-room-menu-v1.png`, `384×384` | `52×52` / uski portrait `46×46`, talas `8,4 s`, delay `1,92 s` |
| Rules icon-only intro | `rules-room-v1.png`, `512×512` | `clamp(210px, 34vmin, 290px)`, scale `1,16`, pulse `1,8 s`, soba `3,65 s`, overlay `4,6 s` |
| Zaglavlje Pravila | `rules-room-v1.png` | `34×34`, `contain` |
| Rules room-icon mapping | `rules-room-v1.png` | ista Green sobna silueta |
| Theme loading gate | `rules-room-v1.png` | zajednički `45×45` prikaz |
| Room-on-demand | `rules-room-v1.png` | samo pri ulasku u sobu Pravila |

Startup fallback prepoznaje kanonsku menu putanju. Matcher sobe prepoznaje tačnu kanonsku room putanju, ali ne i menu izvedenicu. U uobičajenom toku startup čita menu sliku sa stvarnog dugmeta glavnog menija.

## Registry, granice i cache

`rulesRoomIdentity` u `www/themes/green/asset-registry.json` definiše jedan vizuelni identitet, dve delivery uloge, dimenzije, SHA-256 otiske, tri zabranjene stare runtime putanje i mapu zamena. Šest ilustracija stranica nije proglašeno istom ikonom: bodovanje, statistika/top lista, takmičenja, komunikacija, ekonomija/riznica i nalog/server su posebni semantički motivi. Posebno, ekonomsku kompoziciju i dalje čine već kanonski dukat i Undo token, bez promene njihove uloge.

Green cache verzija povećana je sa `51` na `52` zbog novih putanja.

## Uklonjene runtime kopije

Nakon potvrde da nemaju aktivnih UI referenci uklonjene su samo ove tri datoteke:

1. `www/assets/green-soft-clay/rules-free-v2.png` — stara room/intro/header isporuka;
2. `www/assets/green-soft-clay/runtime/menu/rules-free-v2.png` — stara menu isporuka;
3. `www/assets/green-soft-clay/rules-pro-v1.png` — odbačena uramljena, neaktivna varijanta.

Ukupno je uklonjeno `527.455 B` starih runtime kopija. Git ih prati, pa su obnovljive iz istorije. Odobreni i odbijeni high-resolution izvori ostaju u `source-assets`, van `www` isporuke.

Build skripta više ne zavisi od uklonjenih runtime fajlova. Ponovo je proizvela iste odobrene otiske: room `48527b7eb726778604fc25ba437d0d350a3ab97708c7c4d3dd8ad19c537a8ae4`, menu `d00302c37418b3f87b8d4077a54a6c1742e1d78199dd1065e32dc3685a742d1a`.

## Bilans učitavanja

- Green tema: `164 PNG / 15.293.345 B` (`14,58 MB`).
- Startup: `17 PNG / 4,56 MB / 20,44 MB decoded` — broj i memorijski budžet nisu porasli.
- Pravila room-on-demand: `7 PNG / 1.450.680 B / 7.340.032 decoded B` — jedan identitet i šest ilustracija stranica.
- Najveći Green room paket ostaje Riznica: `44 PNG / 2,94 MB / 13,70 MB decoded`.

U odnosu na Korak 2 isporuka je manja za neaktivni `rules-pro-v1.png` runtime (`244.018 B`); dve aktivne slike samo su premeštene na kanonske putanje bez promene sadržaja.

## Provere i sledeći korak

`check-theme-performance.js` štiti status u oba registra, hash vrednosti, broj kanonskih i nula starih UI veza, odsustvo tri uklonjene runtime kopije, očuvanje šest stranica, meni/intro/zaglavlje ugovor i startup/room izolaciju. Reproducibilni build prošao je nakon uklanjanja legacy kopija.

Korak 4 je završni vizuelni, semantički i tehnički audit u stvarnim prikaznim veličinama. Tek posle toga porodica prelazi iz `standardized` u `locked`.

Nije rađen commit niti objavljivanje.
