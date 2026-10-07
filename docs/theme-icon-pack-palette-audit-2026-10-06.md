# Završna provera paleta za Icon Pack

Izvor istine je `theme-definitions.json` (schema 17). Pozadine su deset već prihvaćenih PNG-ova iz `theme-backgrounds-final.json`. Zajednički stil ostaje **3D Soft Neomorphism**, a pravac svake teme ostaje Clay ili Smooth Rubber / Matte Plastic. Zelena je zaključana referenca.

| Tema | Telo | Svetlo | Senka | Mali akcenat | Nosiva kontura: najmanji kontrast prema kartici |
|---|---|---|---|---|---:|
| Svetlo Zlato | `#E6BE83` | `#FFF1D7` | `#875024` | `#76612B` maslinasta | 4,68:1 |
| Trula Višnja | `#8B3038` | `#F1C3B2` | `#431720` | `#E39A70` svetlo zalaska | 7,32:1 |
| Plavi Okean | `#0E5A9B` | `#FFF4E5` | `#173D5B` | `#BD684A` crep | 9,33:1 |
| Neon Cyber | `#193455` | `#56E5D2` | `#080D18` | `#F08CE3` magenta | 9,25:1 |
| Kraljevski Ametist | `#5A386A` | `#E0CDE5` | `#2D1D3C` | `#F2C879` svetlo zalaska | 6,71:1 |
| Vaskršnja | `#D3D5B7` | `#FFF8EA` | `#4D6B45` | `#A66443` svetlo drvo | 4,79:1 |
| Pustinjsko Staklo | `#D79269` | `#FFF0DA` | `#87523C` | `#396B72` plavosiva | 4,33:1 |
| Mesečev Sjaj | `#3B3F4B` | `#E1E2E7` | `#181B24` | `#A7A9B8` neutralna siva | 8,12:1 |
| Severna Maglina | `#24445B` | `#F5FBFF` | `#0B1830` | `#8AE3E4` ledeni cijan | 6,91:1 |

Kontura je već jedna od četiri navedene boje. Navedeni kontrast je manja od dve vrednosti: prema `surface` i prema `raised` u definiciji teme. Prag za bitan grafički znak je 3:1. Stvarni PNG mora se naknadno proveriti na kartici i na mobilnom ekranu; matematički kontrast odabrane boje ne potvrđuje da je cela ikona čitljiva.

## Pravilo protiv kiča

Jedna ikona koristi najviše tri materijalna tona i jedan mali akcenat (oko 10% vidljive površine). Uspeh i greška zamenjuju taj akcenat kad boja nosi funkcionalnu poruku. Bez metalnog ili staklenog sjaja, glitera, dve obojene aure, ukrasnih bordura, postolja i minijaturnih scena. Na 44 px mora ostati jedan jasan znak. Svetlo i reljef prate pravac cele teme.

## Razlika između bliskih paleta

- Svetlo Zlato je medeno i maslinasto; Vaskršnja je slonovača i kadulja; Pustinjsko Staklo je koralni peščar sa plavosivom senkom. Razlikuju se i obrisom: zaravnjene meke forme, glatke ovalne forme, odnosno slojeviti glineni prelomi.
- Neon Cyber ima segmentiran mat-plastični obris i mali magenta signal; Severna Maglina ima neprekinute ledene krive bez cyber segmenata; Mesečev Sjaj je gotovo jednobojna grafitno-srebrna glina bez plavog sjaja.
- Trula Višnja je crvena glina sa toplim svetlom; Kraljevski Ametist je ljubičasta glina sa širokim lukom i prigušenim svetlom zalaska.

## Status postojećih ikona

Palete i pravila za buduće Icon Packove su provereni; **postojeći Icon Packovi time nisu odobreni**. Novo pravilo od 2026-10-07 nalaže pet tačaka na svakom dukatu svih tema. Vizuelni pregled aktivnih dukata pokazuje da `www/assets/easter-soft-clay/canonical/ducat/ducat-inline-v1.png` i `www/assets/desert-soft-clay/economy/ducat-v2.png` imaju i kružni obod i modelovanje veoma slično `www/assets/green-soft-clay/canonical/ducat/ducat-inline-v1.png`. Pet tačaka su zajednički zahtev, ali materijal, rub, proporcije i reljef moraju biti originalni za svaku temu. Zato ta dva dukata treba ponovo nacrtati prema ažuriranom `iconDna.coinFace` pre prihvatanja njihovih paketa.

U uzorku je i Vaskršnja ikona riznice `www/assets/easter-soft-clay/canonical/room-identity/treasury-chest-v1.png`: ljubičasta površina više ne pripada odobrenoj Vaskršnjoj paleti, a više dukata i sitnih delova čine simbol previše detaljnim za mali mobilni prikaz. Pri izradi novog paketa treba zadržati prepoznatljivu funkciju riznice uz jedan jednostavniji znak. Postojeći PNG-ovi ostaju u aplikaciji dok se ne zamene potpunim, proverenim tematskim paketima. Ovo je pregled uzorka, ne potvrda da su svi ostali trenutni PNG-ovi usklađeni.

Za završno odobrenje svakog paketa uporediti najmanje šest reprezentativnih PNG ikona, uključujući dukat, u istoj maloj veličini kroz svih deset tema, a zatim proveriti svih 177 obaveznih uloga i njihovu upotrebu u stvarnom UI-ju.
