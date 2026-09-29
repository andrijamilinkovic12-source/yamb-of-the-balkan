# Green Asset Standardization — Daily Challenge Room Identity, Korak 4

## Ishod

Završen je završni vizuelni, semantički i tehnički audit Green `daily-room-identity` porodice. Source manifest i centralni registry sada imaju status `locked`.

Ovaj korak nije menjao odobreni glineni kalendar, CSS dimenzije, motion, tok Dnevnog izazova, serverom izabrane kockice, bodovanje, nagrade ili raspored sobe. Audit tabla poredi produkcione canonical PNG-ove u stvarnim CSS veličinama i odvaja druge motive sobe.

## Vizuelna kontrola

Audit tabla: `docs/green-asset-standardization-daily-room-identity-audit.png`.

Na tabli su odobreni `1254×1254` master, canonical `512×512` room i `384×384` menu isporuke, intro proba na minimalnih `210 px` i mali prikazi od `52`, `46`, `54` i `45 px`. Odbačena uramljena `daily-challenge-pro-v1` slika prisutna je samo kao poređenje sa sačuvanim high-resolution izvorom. Zasebno su prikazani task, completed, already-played i reward-video motivi.

Na statičnoj probi kalendar ima jednu forest-green kvačicu, dve vezice i terracotta gornju traku; silueta i kvačica ostaju raspoznatljive u malim prikazima. Nema sopstveni kvadratni ram niti podlogu. Ova kontrola nije snimak Android emulatora niti zamena za kasniji pregled na uređaju.

## Reproducibilnost i kvalitet

Build ponovo pravi obe runtime varijante isključivo iz odobrenog izvora: LANCZOS `1254→512`, pa za menu LANCZOS `512→384`. Proverava RGBA, veličine, alpha opseg, transparentan ugao i fiksne SHA-256 otiske. Runtime PNG-ovi su ostali bajt-po-bajt identični odobrenim aktivnim isporukama pre migracije.

| Uloga | Dimenzija | Bajtova | SHA-256 |
|---|---:|---:|---|
| Master | `1254×1254` | `1.429.413` | `b4aee4510505f2b60fc8a321ac0bbaa60cfeb170a2bf7675dbc01440abf4b163` |
| Room | `512×512` | `209.611` | `1a0669083da288f1cb4bd673508acf0e6d4380b7fa1346c03004ebddd4343dcc` |
| Menu | `384×384` | `124.828` | `ac6eae4d916598174fa9bb7a54f7ed326fa1f6dae7d5a4a68e1e4eb40b666c07` |

## Zaključani potrošači i ponašanje

- Glavni meni: canonical menu PNG, `52×52` / uski portrait `46×46`, talas `8,4 s`, delay `1,2 s` i reduced-motion fallback.
- Poseban Daily icon-only intro: canonical room PNG, `clamp(210px, 34vmin, 290px)`, pulse `1,8 s`, otvaranje sobe na `3,65 s` i kraj overlay-a na `4,6 s`, uz reduced-motion fallback.
- Zaglavlje Dnevnog izazova: isti room PNG, `54×54`.
- Pravila: isti room PNG u srpskom i engleskom sadržaju, sa očuvanim inline `contain` prikazom.
- Theme loading gate: isti room PNG u zajedničkom `45×45` floating prikazu, sa reduced-motion fallbackom.
- Room-on-demand: tačna canonical room putanja; menu isporuka ne ulazi ponovo u paket sobe.

Task lista, completed potvrda, already-played kalendar sa satom i rewarded-video kompozicija nisu zamenjeni glavnom ikonom sobe. Svaki motiv zadržava sopstvenu semantiku. Odbijeni uramljeni kandidat nema aktivnih UI veza i njegova runtime kopija je uklonjena; sačuvani high-resolution izvor služi samo za audit.

## Preload i performance izolacija

- Green tema: `166 PNG / 15.791.420 B` (`15,06 MB`).
- Startup: `17 PNG / 4,56 MB / 20,44 MB decoded`; od ovog identiteta sadrži samo `384×384` menu varijantu.
- Daily room-on-demand: `5 PNG / 660.910 B / 3.407.872 decoded B`; sadrži room identitet, task, completed, already-played i reward-video kompoziciju.
- Tri stare runtime putanje: nijedna prisutna niti aktivno referencirana. Git istorija omogućava njihov oporavak; high-resolution izvori ostaju sačuvani van `www` isporuke.
- Green cache verzija: `50`.

Automatska kontrola štiti `locked` status, identitet i semantičke granice, hash vrednosti, dve canonical uloge, tačan broj potrošača, odsustvo retired putanja, oba jezika u Pravilima, CSS veličine i motion, kao i startup/room izolaciju. Reproducibilni build i svih devet projektnih provera prošli su nakon zaključavanja.

## Status

Daily Challenge Room Identity je završen i zaključan. Nije rađen commit niti objavljivanje. Android emulator nije pokrenut u ovom koraku.
