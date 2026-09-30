# Green Asset Standardization — Leaderboard Controls, Korak 3

## Ishod

Tri odobrena canonical PNG-a sada su aktivna isporuka za Global i Local tabove i naslove Top liste, njeno zajedničko empty/loading stanje i oba online waiting Hall of Fame prikaza. Porodica je uvedena u centralni registar sa statusom `standardized`; završni audit i zaključavanje su Korak 4.

## Povezivanje i izolacija

- `global-v1.png`: Global tab, naslov panela i Leaderboard room-on-demand katalog — 3 reference.
- `local-v1.png`: Local tab, naslov panela i Leaderboard room-on-demand katalog — 3 reference.
- `empty-loading-v1.png`: stanje Top liste, dva online waiting prikaza i sobni katalog — 4 reference.
- Sva tri koriste `assets/green-soft-clay/canonical/leaderboard-controls/` i ulaze u Leaderboard room paket; nijedan nije dodat u startup paket od 17 PNG-ova.
- Prikazne dimenzije `21/25/86/68/58 px`, postojeći motion od `2,4 s`, reduced-motion pravila, filteri i rangiranje nisu menjani.

## Uklonjene kopije

Pre uklanjanja, SHA-256 svakog starog `leaderboard/*.png` fajla upoređen je sa odgovarajućim canonical PNG-om; sva tri para bila su bajt-po-bajt identična. Provereno je da produkcioni HTML i JS nemaju starih referenci. Uklonjene su samo tri stare runtime kopije (`global`, `local`, `empty-loading`), ukupno `154.725 B`; odobreni izvori i canonical masteri ostaju sačuvani. Build i audit skripte rade i nakon povlačenja starih kopija.

## Kontrole

`check-theme-performance.js` proverava tri source/master/runtime SHA-256 lanca, metapodatke registra, tačno `3/3/4` canonical reference, odsustvo starih runtime fajlova i kodnih referenci, semantičke granice, motion i učitavanje sobe. `check-green-asset-coverage.js` sada očekuje `162` Green PNG-a: `133` registrovanih, `16` zaštićenih, `1` foundation i `12` za buduću standardizaciju. Staging kategorija je prazna. Green cache verzija je `61`.

Leaderboard room paket ostaje `7 PNG / 449.668 B / 2.949.120 decoded B`; startup ostaje `17 PNG / 4,56 MiB / 20,44 MiB decoded`. Ukupni Green runtime je `14.792.994 B`. Ponovljena izgradnja paketa i generisanje [audit table](green-asset-standardization-leaderboard-controls-audit.png) potvrdili su iste izlazne otiske i piksele.

Nije rađen commit, objavljivanje ni pregled u Android emulatoru. Sledeći je Korak 4: završni vizuelni, semantički i tehnički audit, pa zaključavanje porodice.
