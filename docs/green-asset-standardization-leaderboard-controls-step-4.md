# Green Asset Standardization — Leaderboard Controls, Korak 4

## Zaključak

Završni statički vizuelni, semantički i tehnički audit je prošao. `leaderboardControls` ima status `locked` u source manifestu i centralnom registru. Zaključavanje obuhvata Global i Local navigacione znakove i jedan zajednički empty/loading znak; ne obuhvata glavni znak sobe, podium medalje, statistiku, rang podatke ili Online Random identitet.

U ovom koraku nisu menjani PNG pikseli, produkcione putanje, prikazne dimenzije, animacije, logika rangiranja niti cache verzija `61`.

## Vizuelna provera

Regenerisana i pregledana [audit tabla](green-asset-standardization-leaderboard-controls-audit.png) (`1480 × 974`, RGBA) prikazuje sva tri odobrena `1254 × 1254` izvora, odgovarajuće canonical isporuke, stvarne UI veličine i dva zaštićena semantička izuzetka.

- `global`: warm-ivory postolje sa forest-green/ivory globusom, terracotta zvezdom i green bazom; `21` i `25 px`.
- `local`: forest-green lokacijski znak sa ivory kućom, terracotta tačkom i malim ivory postoljem; `21` i `25 px`.
- `empty-loading`: terracotta peščani sat na ivory postolju i green bazi; `86`, `68` i `58 px`.

Sva tri simbola ostaju različita, centrirana i slobodnostojeća na transparentnoj podlozi, bez teksta, kvadratne pločice ili okvira. Mali prikazi su pregledani na tabli, ali stvarni Android emulator nije pokretan u ovom statičkom auditu.

## Binarni integritet

Ponovljeni canonical build potvrdio je fiksne dimenzije, RGBA, puni alpha opseg, transparentna četiri ugla i iste SHA-256 otiske. Direktna LANCZOS redukcija odobrenog `1254 × 1254` izvora ostaje piksel-identična canonical runtimeu.

| ID | Runtime | Bajtova | SHA-256 |
|---|---:|---:|---|
| `global` | `256 × 256` | `47.269` | `3a9aa67230a1d53d6e1e05dac1b8f8ca4a738f92cb3cf07d495bde165ac2519a` |
| `local` | `256 × 256` | `38.952` | `44e60c1c9a9166f77294a9d3197bdb4cfd41c64d283753288635498de39d5630` |
| `empty-loading` | `384 × 384` | `68.504` | `7b0c89808cd5185fb53e16a52320f1e575fbeeb691efad255971f5ca9aee67ba` |

## Zaključane veze i učitavanje

- Global i Local imaju po dve reference u HTML-u (tab i naslov panela) i po jednu u sobnom katalogu.
- Empty/loading ima jednu referencu u Top listi i tri u `game.js` (sobni katalog i dva online waiting prikaza).
- Nijedna od tri stare `leaderboard/*.png` datoteke ne postoji; aktivne stare kodne reference su nula. Registar čuva zabranjene istorijske putanje i mapiranje na canonical zamene.
- Stvarni sobni matcher prima `canonical/leaderboard-controls/`. Leaderboard room paket ostaje `7 PNG / 449.668 B / 2.949.120` procenjeno dekodiranih bajtova.
- Nijedna kontrola ne ulazi u početni preload; Green startup ostaje `17 PNG / 4,56 MiB / 20,44 MiB` procenjeno dekodirano.
- Easter i Desert koriste svoje postojeće kontrolne putanje; Severna ne dobija Green assete.

## Prikaz, motion i semantičke granice

CSS zadržava tab `21 px`, naslov `25 px`, empty `86 px`, loading `68 px` i online waiting `58 px`, uz `object-fit: contain`. Navigacioni znakovi su statični; empty/loading ostaje na `greenLeaderboardStateFloat 2.4s`, online waiting na `greenWaitingHofStateFloat 2.4s`. Obe animacije imaju postojeće reduced-motion isključivanje.

Glavni Leaderboard Room znak, General Podium medalje i Online Random room znak ostaju odvojene zaključane porodice. Nisu menjani filteri, pozicije igrača, podaci, rangiranje, mrežni tok niti gameplay.

## Automatska zaštita i status

`check-theme-performance.js` zaključava vizuelne siluete, stvarne mere, source/master/runtime otiske, raspodelu referenci po potrošačima, audit iz canonical putanja, motion, semantičke izuzetke, room matcher i startup izolaciju. `check-green-asset-coverage.js` sada zahteva `30 locked` porodica i potpunu klasifikaciju svih `162` Green runtime PNG-ova: `133` registrovanih, `16` zaštićenih, `1` foundation i `12` preostalih kandidata; staged i neklasifikovanih je nula.

Green runtime ostaje `14.792.994 B` (`14,11 MiB`). Ovo nije merenje stvarnog FPS-a, mrežnog učitavanja niti pregled u Android emulatoru.

Buduća izmena zaključane kontrole zahteva novi verzionisani master i runtime, odgovarajuće SHA-256, manifest, registar, audit tablu i testove; postojeći canonical PNG ne treba tiho prepisivati. Leaderboard Controls ciklus Koraci 1–4 je završen. Nije rađen commit niti objavljivanje.
