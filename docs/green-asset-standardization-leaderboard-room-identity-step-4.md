# Green Asset Standardization — Leaderboard Room Identity, Korak 4

## Ishod

Završen je završni vizuelni, semantički i tehnički audit Green `leaderboard-room-identity` porodice. Source manifest i centralni registry sada imaju status `locked`.

Ovaj korak nije menjao odobreni glyph, CSS dimenzije, motion, rangiranje, filtere, podatke ili raspored sobe. Audit tabla poredi produkcione canonical PNG-ove u stvarnim CSS veličinama i razdvaja druge motive Top liste.

## Vizuelna kontrola

Audit tabla: `docs/green-asset-standardization-leaderboard-room-identity-audit.png`.

Na tabli su odobreni `1254×1254` master, canonical `512×512` room i `384×384` menu isporuke, proba intro veličine `210 px × 1,16` i malih prikaza `52`, `46`, `45` i `32 px`. Odbačena uramljena `leaderboard-pro-v1` slika ostaje vidljiva samo kao poređenje sa sačuvanim high-resolution izvorom. Zasebno su prikazani Global i Local tab, empty/loading simbol, General Podium medalja i Rules narativna ilustracija.

Na statičnoj probi jasno se vide tri warm-ivory stuba, forest-green baza i jedna terracotta zvezda i u malom zaglavlju. Glavni znak nema sopstvenu kvadratnu podlogu. Ova kontrola nije snimak Android emulatora niti zamena za kasniji pregled na uređaju.

## Reproducibilnost i kvalitet

Build ponovo pravi obe runtime varijante isključivo iz odobrenog izvora: LANCZOS `1254→512`, pa za menu LANCZOS `512→384`. Proverava RGBA format, veličine, pun alpha opseg, transparentan ugao i fiksne SHA-256 otiske. Obe runtime datoteke ostaju bajt-po-bajt identične odobrenim aktivnim slikama pre migracije.

| Uloga | Dimenzija | Bajtova | SHA-256 |
|---|---:|---:|---|
| Master | `1254×1254` | `744.488` | `dcc99a6b2e939cadf36a3d9b40dc168afaa882d722f42637157b24a8f46a7182` |
| Room | `512×512` | `116.808` | `8acfb917163a7cf02142c1d0c5613c850cd5e882b8a586caead1d282c0d7aa0e` |
| Menu | `384×384` | `72.226` | `a18d1f54fffc1de4047a066629313eef85d9a5f6934eee3cbd1a7cdc8a77a72b` |

## Zaključani potrošači i ponašanje

- Glavni meni: canonical menu PNG, `52×52` / uski portrait `46×46`, talas `8,4 s`, delay `1,38 s` i reduced-motion fallback.
- Icon-only intro: canonical room PNG, `clamp(210px, 34vmin, 290px)`, scale `1,16`, Green pulse `1,8 s`, otvaranje na `3,65 s` i završetak na `4,6 s`, uz reduced-motion fallback.
- Zaglavlje Top liste: isti room PNG, `32×32`, `contain`.
- Pravila: isti room PNG u srpskom i engleskom sadržaju, na četiri mesta za bodovanje i rangiranje; inline prikaz zadržava `contain`.
- Theme loading gate: isti room PNG, `45×45` unutar zajedničkog floating prikaza i reduced-motion fallback.
- Room-on-demand: tačna canonical room putanja; menu isporuka se ne preuzima ponovo kao deo sobe.

Global i Local navigacija, empty/loading stanje koje se deli i sa online waiting prikazom, tri zaključane General Podium medalje i Rules scena „Statistika i liste” nisu zamenjeni ikonom sobe. Svaki motiv zadržava sopstvenu semantiku.

## Preload i performance izolacija

- Green tema: `167 PNG / 16.037.066 B` (`15,29 MB`).
- Startup: `17 PNG / 4,56 MB / 20,44 MB decoded`; sadrži samo `384×384` menu izvedenicu ovog identiteta.
- Top lista room-on-demand: `7 PNG / 449.668 B / 2.949.120 decoded B`; sadrži room identitet, Global, Local, empty/loading i tri General Podium medalje.
- Tri stara runtime fajla: nijedan prisutan, nijedna aktivna UI referenca. Git istorija omogućava njihov oporavak; high-resolution izvori su ostali sačuvani.
- Green cache verzija: `49`.

Automatska kontrola štiti `locked` status u manifestu i registru, hash vrednosti, dva canonical role-a, jedinstvenu semantiku, tačan broj potrošača, odsustvo retired putanja, četiri Rules upotrebe, CSS veličine i motion, kao i startup/room izolaciju. Reproducibilni build i projektni testovi ponovljeni su nakon zaključavanja.

## Status

Leaderboard Room Identity je završen i zaključan. Nije rađen commit niti objavljivanje. Android emulator nije pokrenut u ovom koraku.
