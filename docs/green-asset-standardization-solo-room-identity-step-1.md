# Green Asset Standardization — Solo Room Identity, Korak 1

## Opseg i odluka

Ovaj korak je inventar i statički vizuelno-semantički audit **glavne ikone Solo moda**. Aktivni PNG-ovi, UI putanje, CSS, intro, rezultati, Pravila, preload i cache nisu menjani. Dodati su samo ovaj dokument, audit tabla i njena reprodukcijska skripta.

Jedini zatečeni Green znak samog Solo moda je `mode-solo-free-v2.png`: jedna zaobljena forest-green glinena figura, ivory ogrlica i jedan terracotta viseći akcenat. Znak je slobodnostojeći na transparentnoj podlozi, bez kvadratnog rama, dodatnog teksta ili medalje. To je **identitet ulaska u Solo**, a ne status pobede, lični rekord ili rezultat.

Vizuelna tabla `docs/green-asset-standardization-solo-room-identity-audit.png` prikazuje postojeći izvor, room i menu kopiju, primere CSS prikaznih veličina i šest semantički različitih znakova. Skripta `scripts/make-green-solo-room-identity-audit-sheet.py` proverava RGBA/alpha i providne uglove, ispisuje dimenzije, bajtove i SHA-256, poredi LANCZOS izvedenice i meri trenutni sobni paket. To nije screenshot emulatora.

## Jedan glavni znak, dve isporuke

| Uloga | Aktivna putanja pod `www/assets/green-soft-clay/` | Dimenzija | Zatečeni potrošači |
|---|---|---:|---|
| room | `mode-solo-free-v2.png` | `512×512` | Solo icon-only intro, sobni katalog; postoji i sakriveni stari DOM rezultat mark |
| menu | `runtime/menu/mode-solo-free-v2.png` | `384×384` | kartica Solo moda u glavnom meniju i normalan DOM startup |

Odobreni izvor je `source-assets/green-soft-clay-hires/mode-solo-free-v2.png`, `1254×1254`. LANCZOS `1254→512` je pixel-identičan room isporuci, a `512→384` menu isporuci. Direktno `1254→384` nije pixel-identično; kasniji build mora sačuvati dvostepeni postupak. Nije potreban novi render ili promena glinenog DNK-a.

Pretraga produkcionih JS/HTML/CSS fajlova nalazi tri doslovne room reference: `www/game.js` u Green asset katalogu i Solo intro konfiguraciji, i `www/index.html` za staru `green-solo-result-mark` DOM sliku. Menu ima jednu doslovnu referencu na kartici u `www/index.html`. Intro koristi isti room PNG dinamički; ne postoji zaseban Solo header PNG. U Green mapi `www/pravilaigre.js` nema posebne Solo reference koju bi trebalo izmišljati ili preslikavati iz drugih tema.

## Prikazi, motion i zatečena skrivena referenca

- Glavni meni: menu PNG je `68×68` u postojećem `64×64` wrapperu; na uskom portretnom ekranu je `60×60`. CSS zadržava hover podizanje `translate(-50%, -54%) scale(1.035)` i aktivno `translate(-50%, -47%) scale(.94)`. Kartica, klik-zona, tekst i režim igre ostaju funkcionalni UI.
- Green Solo intro: room PNG se prikazuje u `clamp(210px, 34vmin, 290px)`, na skali `1`, sa `greenRoomIconPulse 1,8 s` i sakrivenim naslovom. Igra se otvara posle `3,65 s`, overlay nestaje posle `4,6 s`; `prefers-reduced-motion` zaštita ostaje.
- Green završni Solo ekran: DOM još sadrži `green-solo-result-mark` sa glavnom Solo figurom, ali je CSS eksplicitno skriva. Vidljivi znak ukupnog rezultata je već zaključani `canonical/solo-results/finish-score-mark-v1.png` (`42×42`), ne glavna Solo ikona. Skrivena DOM referenca je istorijski ostatak za razmatranje u integracionom Koraku 3; njeno postojanje **nije** dokaz da se figura vidljivo prikazuje na kraju igre.
- Nema zasebnog Green Solo zaglavlja ili Solo inline simbola u Pravilima u ovom toku. Kanonski paket ne treba izmišljati potrošače koje soba nema.

## Semantičke granice

1. Glavni Solo znak prikazuje **jednog igrača** i služi kartici/ulasku. `mode-hotseat-free-v2.png` prikazuje dva igrača, `mode-opponent-free-v2.png` globus sa nasumičnim strelicama, a `mode-invite-free-v2.png` povezane karike sa plusom. To su druge sobe/modovi, ne varijante Solo identiteta.
2. `soloResults` je već zaključana zasebna porodica: završni score mark, personal-best stanje i claim akcija. Njihove ikonice ne smeju biti zamenjene figurom ulaska niti preimenovane u Solo room logo.
3. Solo Rewarded Video / ducat kompozicija i pripadajući ad/reward tok pripadaju već zaključanim ekonomskim porodicama. Glavna figura ne nosi nagradu i ne menja vrednosti nagrada ili obračun rezultata.
4. `hotseatWinner` je već zaključan znak dve figure samo za odlučenu lokalnu partiju. Nije pobednička varijanta glavne Solo figure.
5. Ostali Solo gameplay podaci, skoring, double-reward i claim dugmad, login, save/recovery i geometrija igre ostaju van ove room-identity standardizacije.

## Tehnički inventar

| Asset | Dimenzija / bajtova | SHA-256 |
|---|---:|---|
| `source-assets/green-soft-clay-hires/mode-solo-free-v2.png` | `1254×1254 / 958.718` | `d2f92460d5f04efebf7ac708a1ff49d62521550335ead7a4e94fa543a2beecd9` |
| `www/assets/green-soft-clay/mode-solo-free-v2.png` | `512×512 / 156.807` | `d697e38721762c01fcf90a13475ff67dc7413b677765c70865ff3453e589ceb4` |
| `www/assets/green-soft-clay/runtime/menu/mode-solo-free-v2.png` | `384×384 / 93.182` | `71ea4a39070b18d03403818a26689add95223ccbd952736282ddaf4031bd4ee5` |
| `www/assets/green-soft-clay/mode-hotseat-free-v2.png` | `512×512 / 120.269` | `f1f006758f2b8fffde82401d6f89a4fc8ce3a72749114c1ad4833c3390954021` |
| `www/assets/green-soft-clay/mode-opponent-free-v2.png` | `512×512 / 135.692` | `4a35ca20523d6ed8929f4179767841eee53dd1d15665078cf7e175a957a5820a` |
| `www/assets/green-soft-clay/mode-invite-free-v2.png` | `512×512 / 150.862` | `30894f35a73c1ae1e1ca27267c2342e7c2aac46753c3d8ccffcc5bfaaa0dd356` |
| `www/assets/green-soft-clay/canonical/solo-results/finish-score-mark-v1.png` | `256×256 / 49.334` | `722f391eb7d85e41b537212d81d680f1f2fc152dbe42fe5e45bba2f8960d33ce` |
| `www/assets/green-soft-clay/canonical/solo-results/personal-best-v1.png` | `256×256 / 36.303` | `573a9df91281784f5b8739e7ae55ec137093e37fdea8e8fbdc0beecb7273b76d` |
| `www/assets/green-soft-clay/canonical/hotseat-winner/hotseat-winner-v1.png` | `256×256 / 38.409` | `4020edd452e925903508af646e4f56ec55320982fa573e3a97a25aefe4d7824b` |

Svih devet proveravanih PNG-ova je RGBA sa punim alpha opsegom i providna sva četiri ugla. Poređeni modovi nisu „odbačene” varijante Solo ikone, već ispravni zasebni identiteti.

## Preload i performance — zatečeno stanje

`handleModeClick(1)` zahteva prijavu i pokreće `prepareThemeRoomAssets('solo')`; Green icon-only intro ga takođe poziva, a postojeći warmup/deduplikacija sprečava novu logičku sobu. Stvarni `getThemeRoomSources('dark','solo')` trenutno vraća pet PNG-ova: Solo room figuru, dva već zaključana Solo Results znaka, Solo reward-video kompoziciju i claim znak (`373.688 B / 2.424.832 decoded B`). Menu PNG nije deo sobnog paketa.

U normalnom toku `#main-menu` DOM startup skuplja menu `384` px isporuku. VM provera zatečenih metoda pokazuje da fallback **bez** glavnog menija trenutno umesto nje skuplja room `512` px kopiju iz `pack.assets` zbog širokog `mode-solo` regex-a. To se ne menja u Koraku 1; integracija u Koraku 3 mora precizno dodati menu fallback i isključiti room iz startup-a, bez promene drugih modova i tema.

Green runtime je `162 PNG / 14.792.994 B` (`14,11 MB`), startup statički obračun `17 PNG / 4,56 MB / 20,44 MB decoded`, theme/cache verzija `55`. Prolaze `node scripts/check-js.js` i `node scripts/check-theme-performance.js`. Ovo nisu FPS merenja niti pregled na Android emulatoru.

## Sledeći korak

Korak 2 treba da formira kanonski `solo-room-identity` master i dve bit-identične izvedenice: room `512×512`, menu `384×384`, uz reprodukcijski build i manifest. Aktivni UI, katalog, registar, cache i skriveni game-over DOM ostaju netaknuti do Koraka 3. U integraciji se odlučuje o uklanjanju te istorijske skrivene reference, proverava menu/room startup izolacija i tek nakon nula starih UI veza uklanjaju stare runtime kopije. Korak 4 je završni audit i zaključavanje.

Korak 1 ne zaključava Solo room identitet. Nije rađen commit, objavljivanje niti provera u emulatoru.
