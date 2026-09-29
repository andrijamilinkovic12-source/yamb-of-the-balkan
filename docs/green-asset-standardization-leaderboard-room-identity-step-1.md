# Green Asset Standardization — Leaderboard Room Identity, Korak 1

## Opseg i odluka

Ovo je inventar i vizuelno-semantički audit glavnog identiteta sobe „Top lista”. Nijedan aktivni PNG, putanja, CSS, motion, preload tok, rangiranje ili podatak nije promenjen u ovom koraku.

Jedini aktivni Green identitet ulaska u Top listu je slobodnostojeće postolje: tri zaobljena warm-ivory glinena stuba, središnji najviši stub sa jednom terracotta zvezdom i niska forest-green baza. Bez sopstvenog kvadratnog rama, teksta ili pozadinske pločice. Taj znak je već prisutan u `leaderboard-free-v2.png` i prati matirani 3D Soft Clay Neumorphism pravac teme.

`leaderboard-pro-v1.png` nije druga legitimna verzija ikone. To je neaktivna kvadratna kompozicija sa zelenim ramom, pejzažnim dnom i terracotta trakom. Deli motiv postolja, ali narušava pravilo slobodnostojeće Green ikone; nema pronađenu aktivnu UI referencu. Predlog je da njen runtime bude uklonjen tek u integracionom Koraku 3, uz zadržavanje high-resolution izvora kao audit traga.

Direktno poređenje postojećih slika: [odobreni slobodni znak](../www/assets/green-soft-clay/leaderboard-free-v2.png) · [odbačena uramljena alternativa](../www/assets/green-soft-clay/leaderboard-pro-v1.png).

## Jedan identitet, dve isporučne veličine

| Uloga | Trenutna putanja pod `www/assets/green-soft-clay/` | Dimenzija | Potrošači |
|---|---|---:|---|
| `room` | `leaderboard-free-v2.png` | `512×512` | intro, zaglavlje, Pravila, ekran učitavanja teme i paket sobe |
| `menu` | `runtime/menu/leaderboard-free-v2.png` | `384×384` | glavni meni i startup preload |

Ovo su isporučne varijante istog crteža, ne dva motiva. Budući canonical paket treba da zadrži baš ovu siluetu i transparentnu pozadinu, bez generisanja novog stilskog pravca. Pre integracije treba deterministički proveriti da li obe postojeće veličine nastaju iz approved `1254×1254` mastera i zaključati njihove otiske.

## Stvarni prikazi i ponašanje

- Glavni meni: `52×52`, odnosno `46×46` na uskom portrait ekranu. Zajednički `easterBottomIconWave` ciklus `8,4 s`, za Top listu delay `1,38 s`; postoji reduced-motion fallback.
- Icon-only intro: isti room znak u `clamp(210px, 34vmin, 290px)` okviru, zaseban `scale: 1.16`, Green pulse `1,8 s`; soba se otvara nakon `3,65 s`, overlay završava nakon `4,6 s`.
- Zaglavlje Top liste: `32×32`, `object-fit: contain`.
- Pravila: isti room znak u naslovima „Bodovanje i sekcije / Scoring & Sections” i „Top liste i rangiranje / Leaderboards”. Green mapa ga vezuje za postojeći shared Rules template; zasebna scena „Statistika i liste / Stats & leaderboards” je ilustracija stranice, a ne druga ikona Top liste.
- Ekran učitavanja teme: isti room PNG među pet ikona postojećeg Green loading gate-a; zajednički prikaz `45×45`.

Green startup uzima `384×384` menu sliku iz glavnog menija. Room PNG ostaje van startup kritične putanje. Trenutni matcher za sobu prepoznaje `leaderboard-`, `leaderboard/` i već zaključane `canonical/competition-medals/general-podium-` putanje.

## PNG inventar i potrošači

| Asset | Uloga | Dimenzija / bajtova | SHA-256 |
|---|---|---:|---|
| `source-assets/green-soft-clay-hires/leaderboard-free-v2.png` | kandidat za jedini master | `1254×1254 / 744.488` | `dcc99a6b2e939cadf36a3d9b40dc168afaa882d722f42637157b24a8f46a7182` |
| `www/assets/green-soft-clay/leaderboard-free-v2.png` | aktivni room | `512×512 / 116.808` | `8acfb917163a7cf02142c1d0c5613c850cd5e882b8a586caead1d282c0d7aa0e` |
| `www/assets/green-soft-clay/runtime/menu/leaderboard-free-v2.png` | aktivni menu | `384×384 / 72.226` | `a18d1f54fffc1de4047a066629313eef85d9a5f6934eee3cbd1a7cdc8a77a72b` |
| `source-assets/green-soft-clay-hires/leaderboard-pro-v1.png` | odbačeni alternate master | `1254×1254 / 1.495.926` | `90b3771c17ef3dc9980d595618934230ceef622b9ec9c814317f291bfc5b112b` |
| `www/assets/green-soft-clay/leaderboard-pro-v1.png` | neaktivni orphan runtime | `512×512 / 235.329` | `cb4e3de548ac1c8f3fff79bf35c53568ecda2890cb21cd8ab74d4a52a9daa81a` |

Svih pet proveravanih PNG-ova ima direktan alpha kanal i potpuno transparentan gornji levi ugao. Aktivne veze za room znak su u `www/game.js`, `www/index.html` i `www/pravilaigre.js`; menu verzija je u `www/index.html`. Nijedna aktivna Green UI veza prema `leaderboard-pro-v1.png` nije pronađena.

## Semantičke granice

Ostali motivi Top liste ne smeju se automatski zameniti glavnom ikonom:

| Motiv | Sadašnji PNG | Značenje i prikaz |
|---|---|---|
| Globalna lista | `leaderboard/global-v1.png`, `256×256 / 47.269 B` | postolje sa globusom; tab `21×21`, naslov panela `25×25` |
| Lokalna lista | `leaderboard/local-v1.png`, `256×256 / 38.952 B` | kuća iznad malog postolja; tab `21×21`, naslov panela `25×25` |
| Prazno / učitavanje | `leaderboard/empty-loading-v1.png`, `384×384 / 68.504 B` | peščani sat iznad postolja; stanje `86×86`, loading `68×68`, online waiting `58×58`; float `2,4 s` i reduced-motion fallback |
| General Podium medalje | tri `canonical/competition-medals/general-podium-*.png` | zaključana porodica medalja za pozicije, ne ikona sobe |
| Rules ilustracija | `rules/pages/stats-leaderboards-v1.png`, `512×512 / 174.369 B` | narativna scena stranice, ne znak Top liste |

`empty-loading-v1.png` ima potrošače i izvan ekrana Top liste: online waiting prikaz i state u `www/toplista.js`. Ako se kasnije zasebno standardizuje, migracija mora pokriti sve te potrošače. Global/local tabovi i empty/loading stanje nisu alternativni „Leaderboard Room Identity”.

## Performanse i sledeći korak

Trenutna Green tema ima `168 PNG` i oko `15,52 MB` prema postojećoj performance proveri. Uklanjanje neaktivnog `leaderboard-pro-v1.png` u Koraku 3 moglo bi smanjiti isporuku za `235.329 B`, bez menjanja aktivnih prikaza. To je projekcija, ne rezultat ovog koraka.

Korak 2: napraviti canonical `leaderboard-room-identity` paket od odobrenog mastera, sa `512×512` room i `384×384` menu izvedenicom, manifestom, reprodukcijskim buildom i proverom alpha/SHA otisaka. Aktivne UI putanje i cache verzija ostaju netaknute do Koraka 3. Korak 4 je završni vizuelni i tehnički audit.

Nije rađen commit niti objavljivanje.
