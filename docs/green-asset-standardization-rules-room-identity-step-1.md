# Green Asset Standardization — Rules Room Identity, Korak 1

## Opseg i odluka

Ovaj korak je inventar i vizuelno-semantički audit glavnog identiteta sobe „Pravila”. Nijedan aktivni PNG, UI putanja, CSS, motion, tekst pravila, navigacija stranica ili preload tok nije promenjen.

Jedini aktivni Green identitet ulaska u Pravila je slobodnostojeća otvorena warm-ivory glinena knjiga sa forest-green hrptom i kratkim linijama na listovima, uz jednu terracotta obeleživač-traku. Nema sopstveni kvadratni ram, natpis ili podlogu. To je postojeći `rules-free-v2.png`, u skladu sa matiranim 3D Soft Clay Neumorphism DNK teme.

`rules-pro-v1.png` nije druga legitimna room ikona. To je starija kompozicija manje knjige u debelom zelenom kvadratnom ramu, sa terracotta gornjom trakom i pejzažnim dnom. Nema aktivnu Green UI referencu. Njen runtime PNG može se ukloniti tek u integracionom Koraku 3, uz zadržavanje high-resolution izvora van `www` kao audit traga.

Vizuelno poređenje postojećih izvora: [aktivna slobodna knjiga](../source-assets/green-soft-clay-hires/rules-free-v2.png) · [neaktivna uramljena alternativa](../source-assets/green-soft-clay-hires/rules-pro-v1.png).

## Jedan identitet, dve isporučne veličine

| Uloga | Trenutna putanja pod `www/assets/green-soft-clay/` | Dimenzija | Potrošači |
|---|---|---:|---|
| `room` | `rules-free-v2.png` | `512×512` | icon-only intro, zaglavlje Pravila, mapa tematske ikone u Pravilima i loading gate |
| `menu` | `runtime/menu/rules-free-v2.png` | `384×384` | glavni meni i startup preload |

Obe isporuke su isti odobreni motiv. LANCZOS `1254→512` daje pixel-identičan postojeći room PNG; LANCZOS `512→384` daje pixel-identičan postojeći menu PNG. Direktni `1254→384` nije pixel-identičan menu isporuci, pa budući canonical build mora zadržati dvostepeni postupak.

## Stvarni prikazi i motion

- Glavni meni: `52×52`, odnosno `46×46` na uskom portrait ekranu; zajednički `easterBottomIconWave` ciklus `8,4 s`, delay za peto dugme `1,92 s` i reduced-motion fallback.
- Green icon-only intro: ista room ikona u `clamp(210px, 34vmin, 290px)` okviru, scale `1,16`, `greenRoomIconPulse` ciklus `1,8 s` i reduced-motion fallback. Soba se otvara iza overlay-a posle `3,65 s`; overlay traje `4,6 s`.
- Zaglavlje Pravila: isti room PNG, `34×34`, `object-fit: contain`.
- Mapa ikona u Pravilima: isti room motiv za tematsku referencu na Pravila; scene pojedinačnih stranica imaju odvojene PNG-ove i prikaz `38×38` sa `greenRulesIconBreath` ciklusom `4,8 s`.
- Theme loading gate: isti room PNG među Green ikonama, sa zajedničkim `45×45` prikazom.

Startup preuzima `384×384` menu isporuku sa stvarnog dugmeta. Room isporuka nije deo početnog kritičnog paketa. Trenutni Rules room matcher prepoznaje `rules/` i `rules-` prefikse; pri canonical migraciji mora dobiti preciznu novu room putanju bez uključivanja menu varijante.

## Tehnički inventar

| Asset | Uloga | Dimenzija / bajtova | SHA-256 |
|---|---|---:|---|
| `source-assets/green-soft-clay-hires/rules-free-v2.png` | kandidat za jedini master | `1254×1254 / 1.034.779` | `f53a6399c03855ca78bd6c78335bffe61be1f4da744a36406ad49e12b948218a` |
| `www/assets/green-soft-clay/rules-free-v2.png` | aktivni room | `512×512 / 175.314` | `48527b7eb726778604fc25ba437d0d350a3ab97708c7c4d3dd8ad19c537a8ae4` |
| `www/assets/green-soft-clay/runtime/menu/rules-free-v2.png` | aktivni menu | `384×384 / 108.123` | `d00302c37418b3f87b8d4077a54a6c1742e1d78199dd1065e32dc3685a742d1a` |
| `source-assets/green-soft-clay-hires/rules-pro-v1.png` | odbačeni alternate master | `1254×1254 / 1.386.684` | `2c281ffb6c150f71b3295f5dcbb174cd3cb6b141b4878c2419329a3c1c366728` |
| `www/assets/green-soft-clay/rules-pro-v1.png` | neaktivni orphan runtime | `512×512 / 244.018` | `e0038e18f0bac86ea233dba3787dde4ee7286d82aadfa1ca5d32167ae48b9887` |

Svih pet PNG-ova su RGBA, sa potpuno transparentnim gornjim levim uglom i alpha opsegom `0–255`. Aktivni room motiv se pojavljuje u loading gate-u i intro-u (`www/game.js`) i u mapi/zaglavlju Pravila (`www/pravilaigre.js`); menu isporuka u glavnom meniju (`www/index.html`). `pro` varijanta nema pronađenog aktivnog UI potrošača.

## Semantičke granice šest stranica

Glavna knjiga označava **ulazak u Pravila i celu sobu**, ne pojedinačne naslove. Proverene su veze srpskih i engleskih naslova sa postojećim ilustracijama; svih šest PNG-ova su `512×512` i ukupno imaju `1.275.366 B`:

| Naslov SR / EN | PNG u `rules/pages/` | Različit motiv |
|---|---|---|
| Pravila i bodovanje / Rules & scoring | `rules-scoring-v1.png` | glineni listić i potvrđeni redovi |
| Statistika i liste / Stats & leaderboards | `stats-leaderboards-v1.png` | rastući stubovi i takmičarska kruna |
| Multiplayer i takmičenja / Multiplayer & competitions | `multiplayer-competitions-v1.png` | dva igrača, kockica i pehar |
| Komunikacija / Communication | `communication-v1.png` | dva razgovorna oblačića |
| Dukati, tokeni i Riznica / Ducats, tokens & Treasury | `economy-treasury-v3.png` | kovčeg sa zaključanim dukatima i Undo tokenom |
| Nalog, privatnost i server / Account, privacy & server | `account-server-v1.png` | nalog, štit i server |

Iako prva scena takođe koristi knjigu, ona je ilustracija **pravila i bodovanja**, a ne drugi identitet sobe. Inline simboli za Statistiku, Top listu, Dnevni izazov, takmičenja, valutu, nalog i druge sadržaje pripadaju svojim već utvrđenim porodicama. Ovaj korak ih ne precrtava, ne menja njihov tekst i ne spaja ih sa glavnom knjigom.

`getThemeRoomSources('dark', 'rules')` uzima šest page PNG-ova iz aktivnog paketa, a `prepareThemeRoomAssets` dodaje slike iz stvarnog DOM-a Pravila, uključujući zaglavlje. Uramljeni `rules-pro-v1.png` nije ni u toj aktivnoj listi ni u DOM-u. Fajl ipak postoji u `www` stablu i ulazi u ukupnu veličinu isporuke; široki statički skener po prefiksu `rules-` može ga pobrojati, što nije dokaz da ga runtime preuzima pri ulasku u sobu.

## Performance i sledeći korak

Trenutna Green tema ima `165 PNG / 15.537.363 B` (`14,82 MB`); startup je `17 PNG / 4,56 MB / 20,44 MB decoded`. Kasnije uklanjanje neaktivnog `rules-pro-v1.png` runtimea moglo bi smanjiti isporuku za `244.018 B` bez promene aktivnih slika. To je projekcija, ne rezultat ovog koraka.

Korak 2 je canonical `rules-room-identity` paket iz odobrenog `1254×1254` mastera, sa reprodukcijskim buildom, manifestom i tačno dve runtime varijante `512×512` i `384×384`. Aktivne UI putanje i cache verzija ostaju netaknute do Koraka 3. Korak 4 je završni vizuelni i tehnički audit.

Nije rađen commit niti objavljivanje.
