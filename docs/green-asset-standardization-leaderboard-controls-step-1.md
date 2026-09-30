# Green Asset Standardization — Leaderboard Controls, Korak 1

## Opseg i odluka

Ovo je inventar i vizuelno-semantički audit tri postojeća Green glyph-a koji služe Top listi: `global`, `local` i `empty-loading`. Sva tri prate matirani 3D Soft Clay Neumorphism DNK teme i mogu se standardizovati iz postojećih odobrenih izvora. Novi render nije potreban.

Audit tabla: [Leaderboard Controls vizuelni audit](green-asset-standardization-leaderboard-controls-audit.png).

U ovom koraku nisu menjani aktivni PNG-ovi, putanje, CSS, prikazne mere, motion, filteri, stvarni rezultati, rangiranje ni cache verzija `60`.

## Tri odvojene uloge

| Glyph | Značenje | Aktivni potrošači | Prikaz |
|---|---|---|---:|
| `global` | Globalna lista: ivory postolje sa glinenim globusom i terracotta zvezdom | tab, naslov Globalnog panela, room katalog | `21×21` tab, `25×25` naslov |
| `local` | Lokalna lista: forest-green kružni znak sa ivory kućom i malim postoljem | tab, naslov Lokalnog panela, room katalog | `21×21` tab, `25×25` naslov |
| `empty-loading` | peščani sat iznad postolja za praznu listu ili učitavanje | stanje Top liste, online waiting loading/empty, room katalog | `86×86` prazno, `68×68` učitavanje, `58×58` waiting |

`global` i `local` imaju po tri pune produkcione reference: dve u `www/index.html` i jednu u `www/game.js`. `empty-loading` ima četiri: jednu u `www/toplista.js`, dve u `www/game.js` za online waiting i jednu u room katalogu. Njegova deljena upotreba mora ostati pokrivena pri kasnijoj integraciji.

## Tehnički inventar

| ID | Odobreni `1254×1254` izvor: bajtova / SHA-256 | Aktivni runtime: dimenzija / bajtova / SHA-256 |
|---|---|---|
| `global` | `986.476 / 23ff6206d71ee940dbbbcf4e86e5deba117639c9f3a78d6fa6accf8ed64e1222` | `256×256 / 47.269 / 3a9aa67230a1d53d6e1e05dac1b8f8ca4a738f92cb3cf07d495bde165ac2519a` |
| `local` | `863.574 / 74ac656255517939ad032b8a72bcdc180fae36f490c97eb3d2149ad2a7b744f8` | `256×256 / 38.952 / 44e60c1c9a9166f77294a9d3197bdb4cfd41c64d283753288635498de39d5630` |
| `empty-loading` | `732.830 / dcc5dadc8889bb495d1496f25d145b2f043343701fc01a72192cbd60998d0afe` | `384×384 / 68.504 / 7b0c89808cd5185fb53e16a52320f1e575fbeeb691efad255971f5ca9aee67ba` |

Izvori su u `source-assets/green-soft-clay-hires/leaderboard/`, a aktivne kopije u `www/assets/green-soft-clay/leaderboard/`. Svih šest fajlova je RGBA sa punim alpha opsegom i potpuno providna četiri ugla. Direktno LANCZOS smanjenje `1254→256` odnosno `1254→384` daje piksel-identične aktivne runtime rezultate.

Tri runtime fajla zajedno zauzimaju `154.725 B` kompresovano i približno `1.114.112 B` dekodirano. Već pripadaju učitavanju Top liste; nisu deo glavnog startup paketa. Top lista ostaje `7 PNG / 449.668 B / 2.949.120 decoded B`.

## Motion i funkcionalno ponašanje

Global/Local tab i naslov su statični glyph-ovi. Za `empty-loading` Top lista koristi `greenLeaderboardStateFloat 2,4 s` u praznom i loading stanju. Online waiting koristi zaseban `greenWaitingHofStateFloat 2,4 s`. Obe animacije imaju postojeći `prefers-reduced-motion` fallback. Standardizacija asseta ne treba da menja te CSS ugovore.

Globalna i lokalna lista zadržavaju postojeće filtere, podatke i rangiranja. `empty-loading` je vizuelni status, a ne izvor podataka ili indikator rezultata. Njegova upotreba u online waiting prikazu ne menja status veze niti matchmaking.

## Semantičke granice

Porodica `Leaderboard Controls` ne uključuje:

- zaključani `leaderboardRoomIdentity` glavni znak za meni, intro, zaglavlje, Pravila i loading gate;
- zaključane General Podium medalje za stvarne pozicije;
- ilustraciju stranice Pravila `rules/pages/stats-leaderboards-v1.png`;
- Statistics metrike, rank bedževe, trofeje, rezultate i filtere;
- sam online waiting room identitet ili njegove connection state glyph-ove.

Zaključani `leaderboardRoomIdentity` manifest već eksplicitno izdvaja Global/Local navigaciju i deljeni empty/loading status. Audit tabla dodatno prikazuje glavni room znak i General Podium medalju da se tri uloge ne zamene.

## Kontrola i sledeći koraci

`scripts/make-green-leaderboard-controls-audit-sheet.py` reprodukuje audit tablu `1480×974` i proverava SHA-256, RGBA, alpha, transparentne uglove i piksel-identičnost izvora i runtimea. `scripts/check-theme-performance.js` sada štiti inventar, broj aktivnih referenci, prikazne mere, motion i reduced-motion ugovor, semantičke granice i prisustvo audit table.

Korak 2 treba da formira reproducibilan canonical `leaderboard-controls` paket iz ova tri odobrena izvora, sa `256×256`, `256×256` i `384×384` isporukom. UI veze i cache ostaju kakvi jesu do Koraka 3. Korak 3 mora obuhvatiti i online waiting potrošače, a Korak 4 je završni audit i zaključavanje.

Nije rađen commit, objavljivanje niti pregled u Android emulatoru.
