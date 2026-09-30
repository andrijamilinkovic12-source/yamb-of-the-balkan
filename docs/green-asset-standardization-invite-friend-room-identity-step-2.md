# Green Asset Standardization — Invite Friend Room Identity, Korak 2

## Ishod

Napravljen je kanonski paket **jednog postojećeg, odobrenog Invite Friend room znaka**: dve povezane glinene karike, forest-green i warm-ivory, sa terracotta plusom. Nije rađen novi render niti promena vizuelnog DNK-a.

`scripts/build-green-canonical-invite-friend-room-identity-pack.py` proverava fiksne SHA-256 otiske pre bilo kakvog upisa, kopira odobreni master i reproduktivno pravi room `1254→512`, a zatim menu `512→384`, sa LANCZOS resamplingom i PNG `optimize=True`. Proverava RGBA, puni alpha opseg, providne uglove, pixel-identičnost sa aktivnim isporukama i konačne otiske. Dva uzastopna builda daju isti rezultat.

| Uloga | Kanonska datoteka | Dimenzija / bajtova | SHA-256 |
|---|---|---:|---|
| master | `source-assets/green-soft-clay-canonical/invite-friend-room-identity/green-invite-friend-room-master-v1.png` | `1254×1254 / 930.755` | `5a59eccad3f26779dbe2e8388f51916681e285cffd31b7f904231ffb3872a183` |
| room | `www/assets/green-soft-clay/canonical/invite-friend-room-identity/invite-friend-room-v1.png` | `512×512 / 150.862` | `30894f35a73c1ae1e1ca27267c2342e7c2aac46753c3d8ccffcc5bfaaa0dd356` |
| menu | `www/assets/green-soft-clay/canonical/invite-friend-room-identity/invite-friend-room-menu-v1.png` | `384×384 / 92.386` | `ae634e3928fef02d57d8dc13f5415ff5de76e1451575a92a155319fd1c5b77e4` |

Master je bajt-po-bajt jednak odobrenom hires izvoru, a room i menu PNG svojim aktivnim isporukama. Build ostaje reproduktivan i nakon planiranog uklanjanja starih kopija u Koraku 3.

## Manifest i semantičke granice

`source-assets/green-soft-clay-canonical/invite-friend-room-identity/manifest.json` ima status `canonical` i definiše samo dve isporuke glavnog znaka: room i menu. Glavni znak predstavlja ulazak u privatni duel preko prijatelja/pozivnice. Ne predstavlja pojedinačnu friend akciju, list-state, status pozivnice ili konkretnog rivala.

Četiri postojeća funkcionalna stanja evidentirana su zasebno i zaštićena fiksnim otiscima:

- `send` — slanje pozivnice sa stvarne friend kartice;
- `empty` — nema dostupnih prijatelja ili zahteva;
- `sent` — pozivnica je poslata;
- `accepted` — pozivnica je prihvaćena.

Deljena `online-add-friend` akcija takođe je evidentirana, ali namerno nije deo uskog Invite Friend matchera. Zaključani H2H empty znak i stvarni greatest-rival podaci ostaju u H2H Statistics porodici. Online Players, Online Random i Hotseat ostaju zasebne zaključane porodice.

Stvarni profili, imena, Power, POB/NER/POR podaci, friend search, zahtevi, slanje/prihvatanje pozivnice, room join, socket/reconnect, table i gameplay ostaju van ovog paketa.

## Granica ovog koraka

Aktivni UI, intro, waiting-room header, Pravila, sobni katalog, preload matcher, centralni Green registar i cache verzija nisu menjani. Stare room i menu isporuke ostaju na mestu kao aktivne kontrole. U produkcionim izvorima i dalje postoje tačno četiri stare room veze i jedna stara menu veza; na canonical putanje nema UI veza.

Kanonski runtime je zato privremeno veći za `243.248 B`, ali stvarni startup i Invite Friend room-on-demand paket nisu povećani. Status još nije `standardized` niti `locked`.

Korak 3 treba da:

1. preveže glavnu menu karticu, intro, sobni katalog, waiting-room header i Green reference privatnog duela u Pravilima;
2. doda `384 px` menu isporuku u Green `menuAssets` fallback;
3. precizira startup regex i `invite` matcher tako da startup dobija samo menu, a soba room plus četiri invite stanja;
4. registruje porodicu u centralnom Green registru i poveća cache verziju;
5. ukloni dve stare runtime kopije tek nakon potvrđenih nula legacy UI veza.

Add-friend, H2H empty, stvarni rival podaci, postojeće prikazne mere, intro/friend/panel motion, reduced-motion zaštita, druge teme i friend/socket funkcionalnost ne smeju se menjati.

## Provere i performance

`scripts/check-theme-performance.js` sada proverava canonical status bez centralne registracije, master i dve izvedenice, dimenzije, alpha, fiksne otiske, tačan legacy inventar, četiri izdvojena funkcionalna stanja, shared add-friend granicu, četiri zaštićene porodice, Korak 1 audit tablu i nepromenjenu cache verziju `58`.

Green runtime je privremeno `164 PNG / 15.036.242 B` (`14,34 MB`). Startup ostaje `17 PNG / 4,56 MB / 20,44 MB decoded`, a aktivni Invite Friend kataloški room paket ostaje `5 PNG / 447.128 B / 3.407.872 decoded B`.

Nije rađena provera u Android emulatoru, commit niti objavljivanje. Korak 3 je integracija; Korak 4 završni audit i zaključavanje.
