# Green Asset Standardization — Daily States, Korak 1

## Opseg i odluka

Sledeća porodica za standardizaciju je `Daily States`. Ovaj korak je inventar i vizuelno-semantički audit tri postojeća Green stanja Dnevnog izazova: `task`, `complete` i `already-played`. Nijedan runtime PNG, aktivna putanja, prikazna mera, motion, serverom izabrane kockice, rezultat, reward ili claim tok nije promenjen.

Sva tri asseta već prate isti Green 3D Soft Clay Neumorphism DNK i ne zahtevaju novi render:

- `task` — warm-ivory glinena lista/mini-kalendar, terracotta vrh i markeri, forest-green držači i check, uz pale-green aktivni red;
- `complete` — forest-green kružni glineni medaljon sa velikom ivory kvačicom i jednim terracotta akcentom;
- `already-played` — warm-ivory kalendar sa forest-green kvačicom, terracotta vrhom i posebnim satom koji jasno označava dnevnu zabranu ponavljanja.

Audit tabla: [Daily States vizuelni audit](green-asset-standardization-daily-states-audit.png).

## Tri različita identiteta

Ova tri simbola nisu varijante istog statusa i ne smeju se svesti na jednu generičku kvačicu:

| Identitet | Uloga | Aktivni potrošač | Stvarna mera |
|---|---|---|---:|
| `task` | zadatak/cilj aktuelnog izazova | desni znak u zaglavlju Daily kartice | `44×44` |
| `complete` | potvrda uspešno završenog izazova | završni result prikaz | `58×58` |
| `already-played` | dnevni replay lock sa satom | informativni modal pre ulaska | `104×104` |

Svaki PNG ima tačno dve pune produkcione reference: jednu stvarnu UI vezu u `www/dnevniizazov.js` i jednu room-on-demand katalošku vezu u `www/game.js`.

State glyph-ovi su statični. `dailyDicePulse 0,32 s` pripada isključivo rolling kockicama i ne sme se preneti na task, complete ili already-played. Postojeće drop-shadow vrednosti i pozicije ostaju deo UI prezentacije, ne samih PNG-ova.

## Tehnički inventar

| Identitet | Odobreni master | Master dimenzija / bajtova / SHA-256 | Aktivni runtime | Runtime dimenzija / bajtova / SHA-256 |
|---|---|---|---|---|
| `task` | `source-assets/green-soft-clay-hires/daily/task-v1.png` | `1254×1254 / 1.136.336 / 660c7737a83fbb49dccefa5648fcc999b5fb2669bdf79dae992482fd39a13372` | `www/assets/green-soft-clay/daily/task-v1.png` | `384×384 / 106.757 / 750f23bcf3458d5017f838f9717560041279702a0c35a4f4dc4031504cc8ffe9` |
| `complete` | `source-assets/green-soft-clay-hires/daily/complete-v1.png` | `1254×1254 / 1.399.019 / d348d061b4764f93e243249d570b43b3c3a3ec46ee785875741d4ab222ad9f75` | `www/assets/green-soft-clay/daily/complete-v1.png` | `384×384 / 117.989 / bc340dc50f576c011e6073eb929a914a4538ab39a38a95b4423fbe3e863ba97d` |
| `already-played` | `source-assets/green-soft-clay-hires/daily/already-played-v1.png` | `1254×1254 / 1.239.755 / ce45193a5ac23d30d757c7e0928016f70b667e06f7daf4903ce87a2a676c69a4` | `www/assets/green-soft-clay/daily/already-played-v1.png` | `384×384 / 118.655 / 3a5b3b09c98487465d463c855e343134a12e33fd15ab02ffe49d4ed0f58eca3e` |

Svih šest PNG-ova je RGBA, koristi puni alpha opseg i ima potpuno providna četiri ugla. Direktno proporcionalno LANCZOS smanjenje svakog mastera `1254→384` daje pixel-identičan postojeći runtime. Budući canonical build zato može biti potpuno reproduktivan bez menjanja odobrenih piksela.

## Semantičke granice

Daily States porodica ne uključuje:

- zaključani `dailyRoomIdentity` kalendar za meni, intro, zaglavlje, Pravila i loading gate;
- `daily/reward-video-v3.png`, koji ostaje zaključana Rewarded Video + canonical dukat kompozicija;
- canonical Green dukat prikazan uz stvarnu vrednost nagrade;
- serverom izabrane kockice, rolling animaciju i CSS `green_clay` skin;
- Daily izračunavanje zbira, claim, dupliranje, AdMob/SSV verifikaciju ili duplicate-claim zaštitu;
- complete, owned, accepted i winner simbole drugih soba i porodica.

Room identitet već eksplicitno navodi ova tri stanja kao semantičke izuzetke, a Rewarded Video registar razdvaja completed/already-played stanja od video akcije. Standardizacija mora očuvati te granice.

## Performance i sledeći koraci

Tri aktivna runtime PNG-a zajedno zauzimaju `343.401 B` i procenjenih `1.769.472 decoded B`. Oni već pripadaju Daily room-on-demand paketu i ne ulaze u startup. Ceo Daily room paket ostaje `5 PNG / 660.910 B / 3.407.872 decoded B`: room identitet, tri stanja i rewarded-video kompozicija.

Korak 1 nije dodao niti duplirao runtime PNG. `scripts/check-theme-performance.js` sada štiti master/runtime dimenzije, alpha, SHA-256 otiske, tačno dve reference po stanju, stvarne mere `44/58/104 px`, odvojen dice motion, semantičke granice i audit tablu `1480×974`.

Korak 2 treba da napravi reproducibilan `daily-states` canonical paket sa tri odobrena mastera i tri bajt-po-bajt jednaka `384×384` runtime izlaza, ali bez menjanja aktivnih UI putanja, centralnog registra ili cache verzije. Korak 3 će obaviti kontrolisanu integraciju, a Korak 4 završni audit i `locked` status.

Nije rađen commit, objavljivanje niti pregled u Android emulatoru.
