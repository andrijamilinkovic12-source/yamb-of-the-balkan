# Green Asset Standardization — Global Coverage, Korak 2

## Ishod

Tri nereferencirane istorijske Green pozadine povučene su iz shipped `www/assets` stabla nakon provere tačnih putanja, Git praćenja, produkcionih referenci, dimenzija i SHA-256 otisaka. Aktivna `green-clay-balkan-diorama-v3.png` i Green splash nisu menjani.

Ovim je shipped paket smanjen za `5.350.456 B` (`5,10 MB`) bez promene startup mrežnog/preload toka, prikaza teme, cache verzije ili gameplay funkcije.

## Povučene datoteke

| Istorijska putanja | Dimenzija | Bajtova | SHA-256 |
|---|---:|---:|---|
| `www/assets/green-clay-balkan-diorama-v1.png` | `941×1672` | `2.242.192` | `4eb1fa4059da0ac9cf3985972ea3b243bbc583d6b0e7a3101b9f2afd335eb22a` |
| `www/assets/green-clay-balkan-diorama-v2.png` | `941×1672` | `1.563.017` | `1575115c7491bc50df21baa50e3f7fb843b1a6ff3a6bf34190f9071cc72efe95` |
| `www/assets/green-clay-yamb-bg-v1.png` | `941×1672` | `1.545.247` | `54611a8d156b63a576a1bebe23ac692e65e5ddaed04dba8d0916b6100474c2db` |

Sve tri datoteke bile su Git-praćene i imale su nula aktivnih JS/HTML/CSS/JSON referenci. Njihovi prompt/provenance dokumenti ostaju sačuvani, a originalni binarni sadržaj je povratljiv iz Git istorije. Nije pravljena nova duplirana kopija u shipped stablu.

## Zaključani foundation paket

Dodat je `source-assets/green-soft-clay-canonical/theme-foundation/manifest.json`. Ovaj manifest je namerno izvan centralnog registra porodica ikona i zaključava:

- aktivnu `v3` pozadinu;
- aktivni Green splash naslov;
- metapodatke i hash otiske tri povučene istorijske pozadine;
- činjenicu da proceduralna tabla i `green_clay` CSS skin kockica nisu PNG porodice ikona.

Aktivna pozadina ostaje:

- putanja: `www/assets/green-clay-balkan-diorama-v3.png`;
- dimenzija: `941×1672`, RGB;
- veličina: `1.562.192 B`;
- SHA-256: `049c6cdafe90cd37bab3f1b2c48831ed7253ca16d95ba411f8cec98f58a12c41`.

Green splash ostaje:

- putanja: `www/assets/green-soft-clay/splash-title-soft-clay-v1.png`;
- dimenzija: `1672×941`, RGBA;
- veličina: `1.687.588 B`;
- SHA-256: `2773c5e488ce046fb2a83266ebfaee4d4597733169dd4bacdf353a046226a6d3`.

`www/themes/green/manifest.json` sada eksplicitno povezuje foundation manifest. Cache verzija ostaje `59`, jer aktivna putanja i njen sadržaj nisu promenjeni.

## Performance i regresiona zaštita

Green Soft Clay icon/runtime stablo ostaje `162 PNG / 14.792.994 B` (`14,11 MB`). Zajedno sa aktivnom v3 pozadinom shipped Green PNG osnova sada iznosi `16.355.186 B` (`15,60 MB`), bez tri povučene verzije.

Startup ostaje `17 PNG / 4,56 MB / 20,44 MB decoded`, jer istorijske pozadine ni pre povlačenja nisu bile učitavane. Dobitak se odnosi na veličinu isporučenog `www`/Android paketa, ne na broj startup zahteva ili FPS.

`scripts/check-green-asset-coverage.js` sada proverava da:

- aktivna pozadina i splash postoje i odgovaraju zaključanim dimenzijama, color type-u, bajtovima i SHA-256 otiscima;
- foundation manifest ima status `locked` i cache verziju `59`;
- tri istorijske putanje više ne postoje u `www`;
- nijedna od njih nema produkcionu referencu;
- njihov tačan istorijski inventar ostaje zapisan za oporavak.

Coverage, theme-performance i kompletan `npm test` skup prolaze. Nije rađen commit, objavljivanje niti emulator pregled.

Global Coverage Korak 2 je završen. Sledeća porodica za canonical obradu je `Daily States`: task, complete i already-played.
