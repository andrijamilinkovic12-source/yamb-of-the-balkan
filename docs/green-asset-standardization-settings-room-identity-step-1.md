# Green Asset Standardization — Settings Room Identity, Korak 1

## Opseg i odluka

Ovaj korak je inventar i vizuelno-semantički audit glavnog identiteta sobe „Podešavanja”. Nijedan aktivni PNG, UI putanja, CSS, motion, korisničko podešavanje ili preload tok nije promenjen.

Jedini aktivni Green identitet ulaska u Podešavanja je slobodnostojeći zaobljeni forest-green glineni zupčanik sa warm-ivory prstenom i jednom terracotta tačkom u centru. Nema sopstveni kvadratni ram, natpis ili podlogu. To je postojeći `settings-free-v2.png`, u skladu sa matiranim 3D Soft Clay Neumorphism DNK teme.

`settings-pro-v1.png` nije druga legitimna room ikona. To je starija kompozicija manjeg ivory zupčanika u debelom zelenom kvadratnom ramu, sa terracotta trakom i pejzažnim dnom. Nema aktivnu Green UI referencu. Njen runtime PNG može se ukloniti tek u integracionom Koraku 3, uz zadržavanje high-resolution izvora van `www` kao audit traga.

Vizuelno poređenje postojećih izvora: [aktivni slobodni zupčanik](../source-assets/green-soft-clay-hires/settings-free-v2.png) · [neaktivna uramljena alternativa](../source-assets/green-soft-clay-hires/settings-pro-v1.png).

## Jedan identitet, dve isporučne veličine

| Uloga | Trenutna putanja pod `www/assets/green-soft-clay/` | Dimenzija | Potrošači |
|---|---|---:|---|
| `room` | `settings-free-v2.png` | `512×512` | icon-only intro, zaglavlje sobe, Pravila, loading gate |
| `menu` | `runtime/menu/settings-free-v2.png` | `384×384` | glavni meni i startup preload |

Obe isporuke su isti odobreni motiv. LANCZOS `1254→512` daje pixel-identičan postojeći room PNG; LANCZOS `512→384` daje pixel-identičan postojeći menu PNG. Direktni `1254→384` nije pixel-identičan menu isporuci, pa budući canonical build mora zadržati dvostepeni postupak.

## Stvarni prikazi i motion

- Glavni meni: `52×52`, odnosno `46×46` na uskom portrait ekranu; zajednički `easterBottomIconWave` ciklus `8,4 s`, delay za četvrto dugme `1,74 s` i reduced-motion fallback.
- Green icon-only intro: ista room ikona u `clamp(210px, 34vmin, 290px)` okviru, scale `1`, `greenRoomIconPulse` ciklus `1,8 s` i reduced-motion fallback. Soba se otvara iza overlay-a posle `3,65 s`; overlay traje `4,6 s`.
- Zaglavlje Podešavanja: isti room PNG, `32×32`, `object-fit: contain`.
- Pravila: isti room PNG kroz Green mapiranje ilustracije za Podešavanja, odvojeno od ikona pojedinačnih opcija.
- Theme loading gate: isti room PNG među Green ikonama, sa zajedničkim `45×45` prikazom.

Startup preuzima `384×384` menu isporuku sa stvarnog dugmeta. Room isporuka nije deo početnog kritičnog paketa. Trenutni Settings room matcher prepoznaje `settings/` i `settings-` prefikse; pri canonical migraciji mora dobiti preciznu novu room putanju bez uključivanja menu varijante.

## Tehnički inventar

| Asset | Uloga | Dimenzija / bajtova | SHA-256 |
|---|---|---:|---|
| `source-assets/green-soft-clay-hires/settings-free-v2.png` | kandidat za jedini master | `1254×1254 / 1.208.329` | `e7c20cc7fc3fce6a93c3c69cff6c14e398f405cd80037180c53cc1d89aa8ee67` |
| `www/assets/green-soft-clay/settings-free-v2.png` | aktivni room | `512×512 / 195.989` | `ab4a2390a61348440cd594ade5aef57c0c1a3a05c0b3f6007b5783630f5ab3c9` |
| `www/assets/green-soft-clay/runtime/menu/settings-free-v2.png` | aktivni menu | `384×384 / 118.253` | `9018529478652929f353e24edf8c02edb1193896791e39b3284b664862915201` |
| `source-assets/green-soft-clay-hires/settings-pro-v1.png` | odbačeni alternate master | `1254×1254 / 1.436.471` | `8449fae31b26a917f672fbfff55f13c8ae1e79912b54274e0d9a471c345927d2` |
| `www/assets/green-soft-clay/settings-pro-v1.png` | neaktivni orphan runtime | `512×512 / 254.057` | `a67996b03ced2f73ed606a8899c4999359882f0faf51374e2ae34802baea407d` |

Svih pet PNG-ova su RGBA, sa potpuno transparentnim gornjim levim uglom i alpha opsegom `0–255`. Aktivni room motiv se pojavljuje u zaglavlju (`www/index.html`), loading gate-u i intro-u (`www/game.js`) i mapi Pravila (`www/pravilaigre.js`); menu isporuka u glavnom meniju (`www/index.html`). `pro` varijanta nema pronađenog aktivnog UI potrošača.

## Semantičke granice

Glavni zupčanik označava ulazak u sobu, ne svaku opciju u njoj. Osam postojećih `settings/` PNG-ova ostaju zasebni: profil/nalog, zvuk, muzika, vibracija, prikaz/tema, jezik, uslovi i privatnost. Ne treba ih preslikavati glavnim zupčanikom. Forme, prekidači, jezički izbor, pravni linkovi i podaci naloga ostaju funkcionalni UI, ne deo ovog asset identiteta.

`getThemeRoomSources('dark', 'settings')` uzima osam sobnih PNG-ova iz aktivnog paketa, a `prepareThemeRoomAssets` dodaje slike iz stvarnog DOM-a sobe, uključujući zaglavlje. Uramljeni `settings-pro-v1.png` nije ni u toj aktivnoj listi ni u DOM-u. Fajl ipak postoji u `www` stablu i ulazi u ukupnu veličinu isporuke; široki statički skener po prefiksu `settings-` može ga pobrojati, što nije dokaz da ga runtime preuzima pri ulasku u sobu.

## Performance i sledeći korak

Trenutna Green tema ima `166 PNG / 15.791.420 B` (`15,06 MB`); startup je `17 PNG / 4,56 MB / 20,44 MB decoded`. Kasnije uklanjanje neaktivnog `settings-pro-v1.png` runtimea moglo bi smanjiti isporuku za `254.057 B` bez promene aktivnih slika. To je projekcija, ne rezultat ovog koraka.

Korak 2 je canonical `settings-room-identity` paket iz odobrenog `1254×1254` mastera, sa reprodukcijskim buildom, manifestom i tačno dve runtime varijante `512×512` i `384×384`. Aktivne UI putanje i cache verzija ostaju netaknute do Koraka 3. Korak 4 je završni vizuelni i tehnički audit.

`check-theme-performance.js` je prošao na neizmenjenom runtime-u. Nije rađen commit niti objavljivanje.
