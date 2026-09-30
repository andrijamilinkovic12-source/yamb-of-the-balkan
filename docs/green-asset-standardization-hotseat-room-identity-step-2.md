# Green Asset Standardization — Hotseat Room Identity, Korak 2

## Ishod

Napravljen je kanonski paket **jednog postojećeg, odobrenog Hotseat room znaka**. Nije rađen novi render niti promena vizuelnog DNK-a. `scripts/build-green-canonical-hotseat-room-identity-pack.py` kopira odobreni master, pravi room `1254→512` i menu `512→384` sa LANCZOS resamplingom i PNG `optimize=True`, pa pre i posle upisa proverava fiksne SHA-256 otiske, RGBA/alpha, providne uglove i pixel-identičnost sa aktivnim isporukama.

| Uloga | Kanonska datoteka | Dimenzija / bajtova | SHA-256 |
|---|---|---:|---|
| master | `source-assets/green-soft-clay-canonical/hotseat-room-identity/green-hotseat-room-master-v1.png` | `1254×1254 / 741.942` | `ea4c3634a38bb596c9fb27541cb3a7c8f33e0514a3f279c00daa4128f30729bd` |
| room | `www/assets/green-soft-clay/canonical/hotseat-room-identity/hotseat-room-v1.png` | `512×512 / 120.269` | `f1f006758f2b8fffde82401d6f89a4fc8ce3a72749114c1ad4833c3390954021` |
| menu | `www/assets/green-soft-clay/canonical/hotseat-room-identity/hotseat-room-menu-v1.png` | `384×384 / 74.765` | `de933f7fe0b272d177f4cd4521dc859af2045eed8ce879f3084055f3500ad0fc` |

Room i menu PNG su bajt-po-bajt jednaki aktivnim `mode-hotseat-free-v2.png` isporukama, a master odobrenom hires izvoru. Build je idempotentan i ostaje reproduktivan nakon planiranog uklanjanja starih kopija u Koraku 3.

## Manifest i granice

`source-assets/green-soft-clay-canonical/hotseat-room-identity/manifest.json` beleži jedan room identitet: dve ravnopravne slobodnostojeće figure, forest-green i warm-ivory, povezane jednim terracotta akcentom, bez rama, teksta, medalje ili winner check oznake. Definisane su samo dve delivery uloge — room i menu.

Posebno su zaštićene četiri već zaključane porodice:

- `hotseatWinner` — odlučeni pobednik, nikada remi;
- `soloRoomIdentity` — jedan igrač;
- `h2hStatistics` — statistika konkretnog rivalstva;
- `onlinePlayersRoomIdentity` — online prisutnost i izbor igrača.

Aktivni igrač, imena, poeni, završni tekst, dve table, swipe, automatsko praćenje, nastavak/nova igra, bodovanje i gameplay geometrija ostaju van room-identity paketa.

## Granica ovog koraka

Paket ima status `canonical`, ne `standardized` ili `locked`. Nijedan ekran, intro, CSS, sobni katalog, startup tok, centralni Green registar ili cache verzija nije prevezan. Stare aktivne isporuke ostaju na mestu.

U produkcionim izvorima i dalje postoje dve stare room reference i jedna stara menu referenca; na nove putanje nema referenci. Budući menu canonical ima dve planirane kodne veze — karticu i eksplicitni no-DOM fallback — dok room ostaje vezan na sobni katalog i intro. Kanonski runtime je zato privremeno veći za `195.034 B`, ali startup i stvarni Hotseat room preload nisu povećani.

Korak 3 treba da:

1. preveže menu karticu, intro i sobni katalog na canonical putanje;
2. doda `384 px` menu isporuku u odvojeni Green `menuAssets` fallback;
3. precizira startup regex i Hotseat room matcher tako da se room i menu varijante ne mešaju;
4. registruje porodicu i poveća cache verziju;
5. tek nakon potvrđenih nula starih UI veza ukloni dve stare runtime kopije.

Hotseat Winner prikaz `58×58`, odlučeni rezultat/remi logika, intro i menu motion, druge teme i gameplay ne smeju se menjati.

## Provere i performance

`scripts/check-theme-performance.js` proverava canonical status bez centralne registracije, master i dve isporuke, dimenzije, alpha, fiksne otiske, aktivne odobrene kontrole, tačno tri postojeće legacy veze, četiri zaštićene porodice, audit tablu i nepromenjenu cache verziju `56`.

Green runtime je privremeno `164 PNG / 14,29 MB`; startup ostaje `17 PNG / 4,56 MB / 20,44 MB decoded`. Aktivni Hotseat room paket ostaje `2 PNG / 158.678 B / 1.310.720 decoded B`.

Nije rađena provera u Android emulatoru, commit niti objavljivanje. Korak 3 je integracija; Korak 4 završni audit i zaključavanje.
