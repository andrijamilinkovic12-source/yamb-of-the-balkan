# Green Asset Standardization — Rules Page Illustrations, Korak 2

## Ishod

Formiran je reproducibilan canonical paket za četiri Green ilustracije stranica Pravila: `rules-scoring`, `stats-leaderboards`, `multiplayer-competitions` i `account-server`. Svaka canonical isporuka je **bajt-po-bajt identična** trenutno aktivnom PNG-u. Master kopija je sačuvana van shipped `www` stabla u `source-assets/green-soft-clay-canonical/rules-page-illustrations/`.

Za ove četiri scene ne postoje sačuvani Green high-resolution originali. Odobreni izvor je postojeći `512 × 512` RGBA runtime, što je eksplicitno zapisano u [source manifestu](../source-assets/green-soft-clay-canonical/rules-page-illustrations/manifest.json). Nije rađeno uvećavanje, ponovno renderovanje, resampling ni recompression. Kvalitet piksela ostaje tačno isti kao u aplikaciji pre ovog koraka.

## Četiri odvojene uloge

| SR / EN stranica | Master i canonical runtime | Bajtova | SHA-256 |
|---|---|---:|---|
| Pravila i bodovanje / Rules & scoring | `rules-scoring-v1.png` | `188.200` | `58d0c32e0cd9c8a92e97a95b6ccb4468df19adde7901ef2052e42a45a3ea00ca` |
| Statistika i liste / Stats & leaderboards | `stats-leaderboards-v1.png` | `174.369` | `41b88e864d1933b43ba9081c5ebba6d6844e23afc3fba71f5cac45ecb6969b7a` |
| Multiplayer i takmičenja / Multiplayer & competitions | `multiplayer-competitions-v1.png` | `193.124` | `efa52e4b24c8d78602efb812bba4cde8c36fdf4b345fb683337386cd44cbe50b` |
| Nalog, privatnost i server / Account, privacy & server | `account-server-v1.png` | `240.872` | `a1092f5af79c8a73982147c78713de0e0fe7b92cfe0bdf7557babb9ba6cfab7a` |

Sva četiri para master/runtime imaju `512 × 512`, RGBA, puni alpha opseg i potpuno transparentna četiri ugla. `scripts/build-green-canonical-rules-page-illustrations-pack.py` proverava fiksne otiske pre kopiranja i odbija da prepiše već postojeću canonical datoteku ako bi se sadržaj razlikovao. Posle budućeg uklanjanja starih aktivnih kopija build će polaziti od sačuvanih mastera.

## Zaštićene granice

`communication-v1.png` ostaje deljena scena Global Chat/Online Players porodica; `economy-treasury-v3.png` ostaje zaključana Ducat/Undo kompozicija. Glavni `rulesRoomIdentity` znak knjige nije ilustracija pojedinačne stranice. Source manifest beleži te izuzetke, zajedno sa granicama prema Leaderboard kontrolama, podium medaljama, Online Random znaku, Settings akcijama i funkcionalnim tekstom Pravila.

Srpski i engleski naslovi, redosled svih šest stranica, inline ikonice, `38 × 38 px` prikaz, `greenRulesIconBreath 4,8 s`, reduced-motion pravilo i room-on-demand katalog nisu menjani. Audit tabla iz Koraka 1 ostaje merodavno vizuelno poređenje sedam motiva.

## Privremeni performance bilans

Dok postoje stare aktivne i nove canonical kopije četiri scene, Green runtime ima `166 PNG / 15.589.559 B` (`14,87 MiB`). Staging dodaje tačno `4 PNG / 796.565 B`; startup ostaje `17 PNG / 4,56 MiB / 20,44 MiB` procenjeno dekodirano. Aktivni Rules room paket ostaje `7 PNG / 1.450.680 B / 7.340.032` procenjeno dekodiranih bajtova. Canonical kopije se još ne učitavaju.

`check-green-asset-coverage.js` vodi četiri nove datoteke kao `stagedCanonical`, a postojeća četiri PNG-a i dalje kao `pending`. `check-theme-performance.js` proverava odobreni runtime, master i canonical otisak, dimenzije, postojeća dva kodna potrošača po ilustraciji i odsustvo prevremenih canonical veza. Source manifest ima status `canonical`, bez unosa u centralnom registru. Cache verzija ostaje `61`.

Korak 3 treba da poveže tačno četiri SR/EN mapiranja i četiri unosa u Rules room katalog, doda sobni matcher i centralni registar, pa ukloni stare kopije nakon provere referenci. Komunikacija i Dukati/Riznica ne prelaze u ovu porodicu. Korak 4 je završni audit i zaključavanje.

Nije rađen commit, objavljivanje niti pregled u Android emulatoru.
