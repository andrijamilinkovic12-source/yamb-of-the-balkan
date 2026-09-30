# Green Asset Standardization — Settings Room Identity, Korak 4

## Ishod

Završen je završni vizuelni, semantički i tehnički audit Green `settings-room-identity` porodice. Source manifest i centralni registry sada imaju status `locked`.

Ovaj korak nije menjao odobreni zupčanik, CSS dimenzije, motion, korisnička podešavanja, formulare, podatke naloga ili raspored sobe. Audit tabla poredi produkcione canonical PNG-ove u stvarnim CSS veličinama i razdvaja osam ikona pojedinačnih opcija.

## Vizuelna kontrola

Audit tabla: `docs/green-asset-standardization-settings-room-identity-audit.png`.

Na tabli su odobreni `1254×1254` master, canonical `512×512` room i `384×384` menu isporuke, intro proba na minimalnih `210 px` i mali prikazi od `52`, `46`, `32` i `45 px`. Odbačena `settings-pro-v1` kompozicija sa kvadratnim ramom prisutna je samo kao poređenje sa sačuvanim high-resolution izvorom. Zasebno su prikazani profil/nalog, zvuk, muzika, vibracija, prikaz/tema, jezik, uslovi i privatnost.

Na statičnoj probi prepoznatljivi su forest-green zupčanik, warm-ivory prsten i jedna terracotta tačka čak i u malom zaglavlju. Glavni znak nema sopstveni kvadratni ram niti podlogu. Ova kontrola nije snimak Android emulatora niti zamena za kasniji pregled na uređaju.

## Reproducibilnost i kvalitet

Build ponovo pravi obe runtime varijante isključivo iz odobrenog izvora: LANCZOS `1254→512`, pa za menu LANCZOS `512→384`. Proverava RGBA format, veličine, pun alpha opseg, transparentan ugao i fiksne SHA-256 otiske. Obe runtime datoteke ostaju bajt-po-bajt identične odobrenim aktivnim slikama pre migracije.

| Uloga | Dimenzija | Bajtova | SHA-256 |
|---|---:|---:|---|
| Master | `1254×1254` | `1.208.329` | `e7c20cc7fc3fce6a93c3c69cff6c14e398f405cd80037180c53cc1d89aa8ee67` |
| Room | `512×512` | `195.989` | `ab4a2390a61348440cd594ade5aef57c0c1a3a05c0b3f6007b5783630f5ab3c9` |
| Menu | `384×384` | `118.253` | `9018529478652929f353e24edf8c02edb1193896791e39b3284b664862915201` |

## Zaključani potrošači i ponašanje

- Glavni meni: canonical menu PNG, `52×52` / uski portrait `46×46`, talas `8,4 s`, delay `1,74 s` i reduced-motion fallback.
- Icon-only intro: canonical room PNG, `clamp(210px, 34vmin, 290px)`, scale `1`, Green pulse `1,8 s`, otvaranje sobe na `3,65 s` i završetak overlay-a na `4,6 s`, uz reduced-motion fallback.
- Zaglavlje Podešavanja: isti room PNG, `32×32`, `contain`.
- Pravila: isti room PNG u srpskoj i engleskoj referenci za „Server podršku i bezbednost / Server Support & Security”, sa očuvanim inline `contain` prikazom.
- Theme loading gate: isti room PNG u zajedničkom `45×45` floating prikazu.
- Room-on-demand: tačna canonical room putanja; menu isporuka se ne preuzima ponovo kao deo sobe.

Osam ikona opcija, živi kontrolni elementi, podaci naloga i pravni linkovi nisu zamenjeni glavnom ikonom sobe. Odbačeni uramljeni kandidat nema aktivnih UI veza; njegov runtime je uklonjen, a high-resolution izvor zadržan za audit.

## Preload i performance izolacija

- Green tema: `165 PNG / 15.537.363 B` (`14,82 MB`).
- Startup: `17 PNG / 4,56 MB / 20,44 MB decoded`; od ovog identiteta sadrži samo `384×384` menu varijantu.
- Settings room-on-demand: `9 PNG / 554.053 B / 3.145.728 decoded B`; sadrži room identitet i osam ikona opcija.
- Tri stare runtime putanje: nijedna prisutna niti aktivno referencirana. Git istorija omogućava njihov oporavak; high-resolution izvori ostaju sačuvani van `www` isporuke.
- Green cache verzija: `51`.

Automatska kontrola štiti `locked` status, identitet i semantičke granice, hash vrednosti, dve canonical uloge, tačan broj potrošača, odsustvo retired putanja, obe jezičke reference u Pravilima, CSS veličine i motion, kao i startup/room izolaciju. Reproducibilni build i projektni testovi ponovljeni su nakon zaključavanja.

## Status

Settings Room Identity je završen i zaključan. Nije rađen commit niti objavljivanje. Android emulator nije pokrenut u ovom koraku.
