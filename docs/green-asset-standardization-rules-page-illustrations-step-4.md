# Green Asset Standardization — Rules Page Illustrations, Korak 4

## Zaključak

Završni statički vizuelni, semantički i tehnički audit je prošao. Source manifest i centralni registar porodice `rulesPageIllustrations` sada imaju status `locked`. Zaključana su četiri nezavisna Green PNG-a za stranice 1, 2, 3 i 6 u srpskoj i engleskoj verziji. Komunikacija (stranica 4), Dukati/Riznica (stranica 5) i glavni Rules room znak nisu preuzeti u ovu porodicu.

U ovom koraku nisu menjani PNG pikseli, aktivne UI putanje, redosled i tekst Pravila, motion, sobno učitavanje ili Green cache verzija `62`.

## Vizuelna provera

Regenerisana i pregledana [audit tabla](green-asset-standardization-rules-page-illustrations-audit.png) (`1480 × 974`, RGBA) prikazuje četiri canonical scene, dve zaštićene scene i odvojeni glavni room znak. Svaka je prikazana i na stvarnoj naslovnoj meri od `38 px`.

| Stranica SR / EN | Prepoznatljiv motiv |
|---|---|
| Pravila i bodovanje / Rules & scoring | otvoren Yamb listić sa zelenom mrežom i terracotta potvrdama |
| Statistika i liste / Stats & leaderboards | rastući ivory/green stubovi sa terracotta krunom |
| Multiplayer i takmičenja / Multiplayer & competitions | dva igrača oko kockice i pehara |
| Nalog, privatnost i server / Account, privacy & server | profil, zeleni štit sa ključanicom i serverske trake |

Motivi su međusobno različiti, u istom matiranom 3D Soft Clay Neumorphism pravcu, sa transparentnom podlogom bez teksta i kvadratnog rama. Na 38 px ostaju razlikljivi kao naslovne scene. Ovo je provera statičnih PNG-ova na audit tabli, ne snimak iz Android emulatora.

## Integritet i provenijencija

Za ove četiri scene nisu pronađeni sačuvani Green `1254 × 1254` izvori. Odobreni masteri su verne kopije originalnih aktivnih `512 × 512` PNG-ova; nije rađeno lažno uvećavanje, resampling ni ponovno kompresovanje. Ponovljeni build potvrđuje iste fiksne otiske, dimenzije, RGBA režim, puni alpha opseg i transparentna četiri ugla.

| ID | Bajtova | SHA-256 canonical runtime |
|---|---:|---|
| `rules-scoring` | `188.200` | `58d0c32e0cd9c8a92e97a95b6ccb4468df19adde7901ef2052e42a45a3ea00ca` |
| `stats-leaderboards` | `174.369` | `41b88e864d1933b43ba9081c5ebba6d6844e23afc3fba71f5cac45ecb6969b7a` |
| `multiplayer-competitions` | `193.124` | `efa52e4b24c8d78602efb812bba4cde8c36fdf4b345fb683337386cd44cbe50b` |
| `account-server` | `240.872` | `a1092f5af79c8a73982147c78713de0e0fe7b92cfe0bdf7557babb9ba6cfab7a` |

Za svaku scenu master i canonical runtime imaju isti SHA-256. Stare četiri `rules/pages/` datoteke su odsutne, a njihove putanje su zabranjene u centralnom registru. `scripts/make-green-rules-page-illustrations-audit-sheet.py` sada čita canonical putanje i reprodukuje istu vizuelnu tablu.

## Zaključane veze i semantičke granice

- Svaka od četiri canonical scene ima tačno jednu referencu u SR/EN mapi i jednu u Rules room katalogu; stare reference su nula.
- Mapa i dalje vezuje svih šest stranica za tačne srpske i engleske naslove.
- `communication-v1.png` ostaje zaštićena scena Global Chat/Online Players porodica, a `economy-treasury-v3.png` zaključana Ducat/Undo kompozicija. Njihovi pikseli i putanje nisu promenjeni.
- `rulesRoomIdentity` ostaje posebna porodica za glavni meni, intro, zaglavlje i loading gate. Leaderboard kontrole, medalje, Online Random znak, Settings kontrole, tekst i navigacija Pravila ostaju izvan ove porodice.
- Naslovni prikaz ostaje `38 × 38 px` sa `object-fit: contain`, `greenRulesIconBreath 4,8 s` i reduced-motion fallbackom.

## Učitavanje i regresiona zaštita

Sva četiri canonical PNG-a su u Rules room-on-demand matcher-u, nijedan u startup-u. Rules paket ostaje `7 PNG / 1.450.680 B / 7.340.032` procenjeno dekodiranih bajtova; startup ostaje `17 PNG / 4,56 MiB / 20,44 MiB` procenjeno dekodirano. Green runtime ostaje `162 PNG / 14.792.994 B` (`14,11 MiB`).

`check-theme-performance.js` sada štiti četiri vizuelne siluete, 512 px provenijenciju, master/runtime otiske, raspodelu referenci, SR/EN mapiranje, audit generator, zaštićene porodice, motion i izolaciju učitavanja. `check-green-asset-coverage.js` zahteva `31 locked` porodicu i klasifikuje svih `162` PNG-ova: `137` registrovanih, `16` zaštićenih, `1` foundation i `8` Settings Controls kandidata; staging i neklasifikovanih nema.

Buduće izmene zahtevaju nove verzionisane mastere i runtime datoteke, njihove SHA-256 otiske, manifest, registar, audit tablu i testove. Zaključani canonical fajlovi ne treba tiho da se prepisuju. Ovo nije merenje mrežnog učitavanja, FPS-a niti pregled u Android emulatoru. Rules Page Illustrations ciklus Koraci 1–4 je završen; nije rađen commit niti objavljivanje.
