# Green Asset Standardization — Daily Challenge Room Identity, Korak 1

## Opseg i odluka

Ovaj korak je inventar i vizuelno-semantički audit glavnog identiteta sobe „Dnevni izazov”. Aktivni PNG-ovi, putanje, CSS, intro, serverom odabrane kockice, obračun, nagrade i preload nisu menjani.

Jedini aktivni Green identitet sobe je slobodnostojeći glineni kalendar: warm-ivory telo, terracotta gornja traka, dva forest-green držača i jedna velika forest-green kvačica. Transparentna pozadina nema dodatnu kvadratnu pločicu ili ram. To je postojeći `daily-challenge-free-v2.png`, koji prati matirani 3D Soft Clay Neumorphism DNK teme.

`daily-challenge-pro-v1.png` nije drugi legitimni identitet. To je starija ilustracija kalendara unutar debelog kvadratnog forest-green rama, sa pejzažnim dnom. Nema aktivnu Green UI referencu. Predlog je da se njen runtime ukloni tek u integracionom Koraku 3; high-resolution izvor treba zadržati van `www` stabla kao audit trag.

Vizuelno poređenje: [aktivni slobodni kalendar](../www/assets/green-soft-clay/daily-challenge-free-v2.png) · [neaktivna uramljena alternativa](../www/assets/green-soft-clay/daily-challenge-pro-v1.png).

## Jedan identitet, dve isporučne varijante

| Uloga | Trenutna putanja pod `www/assets/green-soft-clay/` | Dimenzija | Potrošači |
|---|---|---:|---|
| `room` | `daily-challenge-free-v2.png` | `512×512` | intro, zaglavlje dnevne sobe, Pravila, loading gate i room-on-demand |
| `menu` | `runtime/menu/daily-challenge-free-v2.png` | `384×384` | glavni meni i startup preload |

Obe isporuke su isti odobreni motiv. Direktno LANCZOS smanjenje mastera `1254→512` daje pixel-identičan postojeći room PNG; dvostepeno `1254→512→384` daje pixel-identičan menu PNG. Direktno `1254→384` nije pixel-identično menu isporuci, pa budući canonical build mora sačuvati dvostepeni tok.

## Stvarni prikazi i motion

- Glavni meni: `52×52`, odnosno `46×46` na uskom portrait ekranu; zajednički `easterBottomIconWave` ciklus `8,4 s`, Dnevni izazov delay `1,2 s` i reduced-motion fallback.
- Poseban Daily icon-only intro: Green slika u `clamp(210px, 34vmin, 290px)` okviru, pulse `1,8 s` i reduced-motion fallback. Aktivna soba se otvara iza overlay-a nakon `3,65 s`, a overlay traje `4,6 s`.
- Zaglavlje dnevne sobe: `54×54`, `contain`, pozicionirano levo iznad kartice; glavni znak nije ikona zadatka.
- Pravila: isti room motiv uz „Dnevni izazov / Daily Challenge” u oba jezika. To je inline glyph, ne zasebna Rules ilustracija.
- Theme loading gate: isti room PNG u postojećem paketu ikona; zajednički prikaz `45×45`.

Startup trenutno uzima `384×384` menu varijantu iz aktivnog dugmeta. Room varijanta nije startup PNG. Daily room matcher sada prepoznaje `daily/` i `daily-challenge` prefikse; pri budućoj canonical migraciji mora dobiti preciznu room putanju bez uključivanja menu varijante.

## Tehnički inventar

| Asset | Uloga | Dimenzija / bajtova | SHA-256 |
|---|---|---:|---|
| `source-assets/green-soft-clay-hires/daily-challenge-free-v2.png` | kandidat za jedini master | `1254×1254 / 1.429.413` | `b4aee4510505f2b60fc8a321ac0bbaa60cfeb170a2bf7675dbc01440abf4b163` |
| `www/assets/green-soft-clay/daily-challenge-free-v2.png` | aktivni room | `512×512 / 209.611` | `1a0669083da288f1cb4bd673508acf0e6d4380b7fa1346c03004ebddd4343dcc` |
| `www/assets/green-soft-clay/runtime/menu/daily-challenge-free-v2.png` | aktivni menu | `384×384 / 124.828` | `ac6eae4d916598174fa9bb7a54f7ed326fa1f6dae7d5a4a68e1e4eb40b666c07` |
| `source-assets/green-soft-clay-hires/daily-challenge-pro-v1.png` | odbačeni alternate master | `1254×1254 / 1.625.101` | `3e215bfe29779061dd4f6acdcd5d1348524f582def90ad2adb22761b551cb47c` |
| `www/assets/green-soft-clay/daily-challenge-pro-v1.png` | neaktivni orphan runtime | `512×512 / 245.646` | `18a1cac98abc5b8e8e4b5ccf3114682a46d652c507c3058104badaf9586df83c` |

Svih pet PNG-ova ima direktan alpha kanal i potpuno transparentan gornji levi ugao. Aktivni room motiv ima četiri izvorne upotrebe (`www/index.html`, `www/dnevniizazov.js`, `www/game.js`, `www/pravilaigre.js`); menu varijanta jednu (`www/index.html`). Neaktivni `pro` runtime nema pronađenog aktivnog Green potrošača.

## Semantičke granice

Kalendar sa kvačicom označava **ulazak u Dnevni izazov**, ne svaku akciju ili stanje sa sličnom kvačicom:

| Motiv | Aktivni PNG | Značenje |
|---|---|---|
| Zadatak | `daily/task-v1.png`, `384×384 / 106.757 B` | lista zadatka i uslov izazova |
| Završeno | `daily/complete-v1.png`, `384×384 / 117.989 B` | potvrda uspešno završenog izazova |
| Već odigrano | `daily/already-played-v1.png`, `384×384 / 118.655 B` | kalendar sa satom za dnevnu zabranu ponavljanja |
| Dupliranje nagrade | `daily/reward-video-v3.png`, `384×384 / 107.898 B` | kompozicija već zaključanog rewarded-video ticket-a i kanonskog dukata |

`already-played` svesno ponavlja kalendarski motiv, ali dodaje sat i ima drugo stanje/ulogu; nije druga glavna ikona sobe. Reward-video kompozicija ne sme postati novi dukat ili novi ticket identitet. Server logika dnevnog rezultata, završetka i reklamne nagrade ostaje van opsega ove porodice.

## Performance i sledeći korak

Trenutna Green tema ima `167 PNG / 16.037.066 B` (`15,29 MB`). Uklanjanje neaktivnog `daily-challenge-pro-v1.png` runtimea u Koraku 3 moglo bi smanjiti isporuku za `245.646 B`, bez promene aktivnih slika. To je projekcija, ne rezultat ovog koraka.

Korak 2 je izrada canonical `daily-room-identity` paketa iz odobrenog `1254×1254` mastera, sa reprodukcijskim buildom, manifestom i tačno dve runtime varijante `512×512` i `384×384`. Aktivne UI putanje i cache verzija ostaju netaknute do Koraka 3. Korak 4 je završni vizuelni i tehnički audit.

Nije rađen commit niti objavljivanje.
