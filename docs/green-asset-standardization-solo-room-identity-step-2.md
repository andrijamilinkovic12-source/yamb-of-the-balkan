# Green Asset Standardization — Solo Room Identity, Korak 2

## Ishod

Napravljen je kanonski paket **jedne postojeće, odobrene Solo figure**. Nije rađen novi render niti promena vizuelnog DNK-a. `scripts/build-green-canonical-solo-room-identity-pack.py` kopira odobreni master, zatim pravi room `1254→512` i menu `512→384` sa LANCZOS resamplingom i PNG `optimize=True`. Pre bilo kakvog upisa proverava očekivane SHA-256 otiske i pixel-identičnost u odnosu na dve aktivne isporuke. Ponovno pokretanje je idempotentno; kada Korak 3 ukloni stare runtime kopije, build će i dalje raditi.

| Uloga | Kanonska datoteka | Dimenzija / bajtova | SHA-256 |
|---|---|---:|---|
| master | `source-assets/green-soft-clay-canonical/solo-room-identity/green-solo-room-master-v1.png` | `1254×1254 / 958.718` | `d2f92460d5f04efebf7ac708a1ff49d62521550335ead7a4e94fa543a2beecd9` |
| room | `www/assets/green-soft-clay/canonical/solo-room-identity/solo-room-v1.png` | `512×512 / 156.807` | `d697e38721762c01fcf90a13475ff67dc7413b677765c70865ff3453e589ceb4` |
| menu | `www/assets/green-soft-clay/canonical/solo-room-identity/solo-room-menu-v1.png` | `384×384 / 93.182` | `71ea4a39070b18d03403818a26689add95223ccbd952736282ddaf4031bd4ee5` |

`source-assets/green-soft-clay-canonical/solo-room-identity/manifest.json` beleži identitet, dve isporuke, potrošače, motion ugovor i semantičke granice. Room i menu PNG su **bajt-po-bajt jednaki** aktivnim `mode-solo-free-v2.png` kopijama. Master je bajt-po-bajt jednak odobrenom hires izvoru. Solo Results, Hotseat Winner i Rewarded Video ostaju zasebne, već zaključane porodice.

## Granica ovog koraka

Paket ima status `canonical`, ne `locked`: nijedan ekran, intro, CSS, sobni katalog, centralni Green registar ni cache verzija nije prevezan. Stare aktivne isporuke ostaju. U produkcionim izvorima još postoje tri stare room reference (dve funkcionalne i jedan sakriveni istorijski result DOM znak) i jedna stara menu referenca; na nove putanje još nema referenci. Kanonski runtime je zato privremeno veći za `249.989 B`, ali startup i stvarni sobni preload nisu povećani.

U Koraku 3 treba prevezati glavni meni, Solo intro i sobni katalog, precizno popraviti no-DOM startup fallback da bira `384px` menu umesto `512px` room PNG, i razrešiti sakriveni stari game-over `<img>` koji ne predstavlja vidljivi Solo Results znak. Tek posle nula starih UI referenci može se ukloniti stari runtime i zaključati centralni registar. Ne smeju se menjati vidljivi Solo Results, reward-video/dukat, ostali modovi, igra, dimenzije kartice ili intro motion. Korak 4 je završni audit.

## Provere

- Dva uzastopna pokretanja build skripte moraju dati iste otiske i dimenzije.
- `scripts/check-theme-performance.js` proverava master, obe isporuke, stare odobrene kontrole, četiri trenutne UI reference, zaštitu odvojenih porodica i nepromenjenu cache verziju `55`.
- `npm.cmd test` prolazi svih devet provera. Green runtime je privremeno `164 PNG / 14,35 MB`; startup ostaje `17 PNG / 4,56 MB / 20,44 MB decoded`.

Nije rađena provera u Android emulatoru, commit niti objavljivanje.
