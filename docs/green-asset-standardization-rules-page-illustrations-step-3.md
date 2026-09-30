# Green Asset Standardization — Rules Page Illustrations, Korak 3

## Ishod

Četiri odobrene ilustracije stranica Pravila sada se isporučuju iz `www/assets/green-soft-clay/canonical/rules-page-illustrations/`. Promenjene su samo četiri Green mape u `www/pravilaigre.js` i odgovarajuća četiri unosa Rules sobnog paketa u `www/game.js`. Srpski i engleski naslovi, redosled i tekst stranica nisu menjani.

| Stranica SR / EN | Canonical PNG |
|---|---|
| Pravila i bodovanje / Rules & scoring | `rules-scoring-v1.png` |
| Statistika i liste / Stats & leaderboards | `stats-leaderboards-v1.png` |
| Multiplayer i takmičenja / Multiplayer & competitions | `multiplayer-competitions-v1.png` |
| Nalog, privatnost i server / Account, privacy & server | `account-server-v1.png` |

Komunikacija i Dukati/Riznica i dalje koriste iste, ranije zaštićene `rules/pages/` putanje. Glavni `rulesRoomIdentity` znak, inline simboli, page tekst i navigacija nisu ušli u novu porodicu.

## Bezbedno povlačenje starih kopija

Pre uklanjanja, SHA-256 svakog od četiri stara `rules/pages/*.png` fajla upoređen je sa novim canonical fajlom. Sva četiri para bila su bajt-po-bajt identična; produkcioni HTML/JS/CSS nije više sadržao stare putanje. Uklonjene su samo četiri stare runtime kopije, ukupno `796.565 B`. Njihovi `512 × 512` odobreni masteri ostaju sačuvani van `www`, a build skripta i posle uklanjanja reprodukuje iste canonical otiske.

Source manifest i centralni registar sada imaju status `standardized`, sa tačno četiri canonical isporuke, četiri zabranjene stare putanje i mapiranjem zamena. Završni `locked` audit ostaje Korak 4. Green cache verzija je `62`.

## Učitavanje, prikaz i kontrole

- Svaki canonical URL ima tačno jednu referencu u Green SR/EN mapi i jednu u Rules room katalogu; stare reference su nula.
- Stvarni room matcher i njegova kontrolna kopija prepoznaju `canonical/rules-page-illustrations/`.
- Rules sobni paket ostaje `7 PNG / 1.450.680 B / 7.340.032` procenjeno dekodiranih bajtova. Nijedna page ilustracija nije dodata startup-u od `17 PNG / 4,56 MiB / 20,44 MiB` procenjeno dekodirano.
- Prikaz naslovnih ikonica ostaje `38 × 38 px`, `object-fit: contain`, `greenRulesIconBreath 4,8 s`, sa postojećim reduced-motion fallbackom.
- [Audit tabla](green-asset-standardization-rules-page-illustrations-audit.png) sada se ponovo generiše iz canonical fajlova, uz dve zaštićene scene i glavni room znak za semantičko poređenje.

Green runtime se vratio na `162 PNG / 14.792.994 B`; centralni registar obuhvata `30 locked + 1 standardized` porodicu i `137` registrovanih PNG-ova. Preostalo je osam Settings Controls kandidata; staged i neklasifikovanih PNG-ova nema. `check-theme-performance.js` i `check-green-asset-coverage.js` proveravaju ove granice.

U ovom koraku nisu menjani PNG pikseli, filteri, page tekst, drugi tematski asseti, pravila igre ni mrežni tok. Nije rađen commit, objavljivanje niti pregled u Android emulatoru. Sledeći je Korak 4 — završni vizuelni, semantički i tehnički audit, pa zaključavanje porodice.
