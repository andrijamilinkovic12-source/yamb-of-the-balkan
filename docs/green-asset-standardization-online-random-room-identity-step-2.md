# Green Asset Standardization — Online Random Room Identity, Korak 2

## Ishod

Napravljen je kanonski paket **jednog postojećeg, odobrenog Online Random room znaka**: forest-green glineni globus sa warm-ivory mrežom i dve terracotta strelice u suprotnim smerovima. Nije rađen novi render niti promena vizuelnog DNK-a.

`scripts/build-green-canonical-online-random-room-identity-pack.py` proverava fiksne SHA-256 otiske pre bilo kakvog upisa, kopira odobreni master i reproduktivno pravi room `1254→512`, a zatim menu `512→384`, sa LANCZOS resamplingom i PNG `optimize=True`. Proverava RGBA, puni alpha opseg, providne uglove, pixel-identičnost sa aktivnim isporukama i konačne otiske. Dva uzastopna builda daju isti rezultat.

| Uloga | Kanonska datoteka | Dimenzija / bajtova | SHA-256 |
|---|---|---:|---|
| master | `source-assets/green-soft-clay-canonical/online-random-room-identity/green-online-random-room-master-v1.png` | `1254×1254 / 767.104` | `a21b7126b79b31ae7bad4463d78f6e31c2788bded62065f91fc363d940c7541d` |
| room | `www/assets/green-soft-clay/canonical/online-random-room-identity/online-random-room-v1.png` | `512×512 / 135.692` | `4a35ca20523d6ed8929f4179767841eee53dd1d15665078cf7e175a957a5820a` |
| menu | `www/assets/green-soft-clay/canonical/online-random-room-identity/online-random-room-menu-v1.png` | `384×384 / 83.367` | `a1593092e3f0634f2f07d824b9fc3173eb654f9f30690e3d20fbdf33a27aceb4` |

Master je bajt-po-bajt jednak odobrenom hires izvoru, a room i menu PNG svojim aktivnim isporukama. Build ostaje reproduktivan i nakon planiranog uklanjanja starih kopija u Koraku 3.

## Manifest i semantičke granice

`source-assets/green-soft-clay-canonical/online-random-room-identity/manifest.json` ima status `canonical` i definiše samo dve isporuke glavnog znaka: room i menu. Glavni znak predstavlja ulazak u nasumično online uparivanje. Ne predstavlja trenutno stanje mreže, rezultat pretrage, konkretan duel ili akciju gledanja.

Pet postojećih funkcionalnih znakova evidentirano je zasebno i zaštićeno fiksnim otiscima:

- `scanning` — aktivno traženje protivnika;
- `found` — protivnik je pronađen;
- `vs` — separator konkretnog duela;
- `disconnected` — veza je prekinuta;
- `reconnected` — veza je obnovljena.

Deljena `online-spectate` akcija takođe je evidentirana, ali namerno nije deo Online Random room preload paketa. Hotseat, Online Players, H2H Statistics i Solo ostaju četiri zasebne, već zaključane porodice. Invite Friend ostaje zaseban tok i budući zaseban room identitet.

Stvarni profili, imena, Power, POB/NER/POR podaci, matchmaking, socket i reconnect logika, timer pill, tehnički rezultat, spectator tok, swipe, automatsko praćenje igrača, bodovanje i gameplay geometrija ostaju van ovog paketa.

## Granica ovog koraka

Aktivni UI, intro, waiting-room header, Pravila, sobni katalog, preload matcher, centralni Green registar i cache verzija nisu menjani. Stare room i menu isporuke ostaju na mestu kao aktivne kontrole. U produkcionim izvorima i dalje postoje tačno četiri stare room veze i jedna stara menu veza; na canonical putanje nema UI veza.

Kanonski runtime je zato privremeno veći za `219.059 B`, ali stvarni startup i Online Random room-on-demand paket nisu povećani. Status još nije `standardized` niti `locked`.

Korak 3 treba da:

1. preveže glavnu menu karticu, intro, sobni katalog, waiting-room header i Green reference u Pravilima;
2. doda `384 px` menu isporuku u Green `menuAssets` fallback;
3. precizira startup regex i `opponent` matcher tako da startup dobija samo menu, a soba room plus pet funkcionalnih stanja;
4. registruje porodicu u centralnom Green registru i poveća cache verziju;
5. ukloni dve stare runtime kopije tek nakon potvrđenih nula legacy UI veza.

Postojeće prikazne mere, intro/matchmaking/connection motion, reduced-motion zaštita, druge teme i online funkcionalnost ne smeju se menjati.

## Provere i performance

`scripts/check-theme-performance.js` sada proverava canonical status bez centralne registracije, master i dve izvedenice, dimenzije, alpha, fiksne otiske, tačan legacy inventar, pet izdvojenih funkcionalnih stanja, shared spectate granicu, četiri zaštićene porodice, Korak 1 audit tablu i nepromenjenu cache verziju `57`.

Green runtime je privremeno `164 PNG / 15.012.053 B` (`14,32 MB`). Startup ostaje `17 PNG / 4,56 MB / 20,44 MB decoded`, a aktivni Online Random room paket ostaje `6 PNG / 496.705 B / 3.997.696 decoded B`.

Nije rađena provera u Android emulatoru, commit niti objavljivanje. Korak 3 je integracija; Korak 4 završni audit i zaključavanje.
