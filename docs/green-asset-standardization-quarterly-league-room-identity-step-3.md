# Green Asset Standardization — Quarterly League Room Identity, Korak 3

## Ishod

Kanonski glineni `YotB / QL` romb povezan je sa svim direktnim Green prikazima. Source manifest i centralni registar imaju status `standardized`; završni vizuelni audit i zaključavanje ostaju za Korak 4. Nije renderovan novi znak niti su promenjeni CSS geometrija, boje, motion, trajanje intra, rangovi, medalje ili pravila lige.

Room `512×512` i menu `384×384` PNG ostali su bajt-po-bajt isti kao odobrene kopije iz Koraka 1/2. High-resolution master ostaje van `www`.

## Potrošači istog identiteta

| Potrošač | Kanonski PNG | Sačuvani prikaz |
|---|---|---|
| Glavna kartica | `quarterly-league-room-menu-v1.png` | CSS watermark `86×86`, opacity `0,18`, bez posebnog motiona; živi rang/bodovi/progress ostaju iznad |
| Startup | `quarterly-league-room-menu-v1.png` | eksplicitno učitavanje samo menu isporuke |
| Intro Kvartalne lige | `quarterly-league-room-v1.png` | `clamp(210px, 34vmin, 290px)`, pulse `1,8 s`, otvaranje sobe `3,65 s`, overlay `4,6 s` |
| Zaglavlje sobe | `quarterly-league-room-v1.png` | `42×42`, `contain` |
| Pobednički popup | `quarterly-league-room-v1.png` | `96×96`; kvartalna gold medalja ostaje zaseban asset |
| SR/EN Pravila | `quarterly-league-room-v1.png` | isti znak uz naslov i tekst kvartalnog obračuna |
| Room-on-demand | `quarterly-league-room-v1.png` | glavni sobni znak uz tri već zaključane podium medalje |

Room PNG ima pet direktnih punih UI referenci: intro, zaglavlje, sobni katalog, pobednički popup i mapiranje Pravila. Menu PNG ima dve: CSS watermark i eksplicitni startup izvor. Dodatno pravilo u room matcher-u i startup filteru služi za izbor isporuke, ne za novi vizuelni motiv.

## Startup i sobna izolacija

`www/game.js` sada u Green `pack.assets` drži kanonski room PNG. `getThemeRoomSources('dark', 'quarterlyLeague')` vraća tačno četiri izvora: room logo i tri kvartalne podium medalje. Kanonski menu watermark nije deo sobnog paketa. Rank bedževi se pre intra preloadaju zasebnim postojećim resolverom, a tab ikonice zadržavaju ranije zaključane navigacione veze.

U zatečenom stanju `getThemeStartupSources('dark')` bez `#main-menu` DOM korena učitavao je i `384` px watermark i `512` px room logo, jer je široki menu regex hvatao naziv `quarterly-league` iz room kataloga. Green room PNG je sada eksplicitno isključen iz tog fallback izbora; watermark je već naveden u `leagueWatermarks`, pa oba toka — sa i bez `#main-menu` — daju tačno jednu menu sliku i nijednu room sliku. Ova zaštita ne menja druge teme ili njihova imena izvora.

Četiri navigacione ikonice, šest rang bedževa i tri kvartalne podium medalje ostaju već zaključane zasebne porodice. Majstorov romb nije zamena za logo sobe, a zlatna medalja nije watermark. Pravila SR/EN i pobednički popup zadržavaju tu razliku.

## Registry, cache i stare kopije

`quarterlyLeagueRoomIdentity` je upisan u `www/themes/green/asset-registry.json` sa istim DNK-om kao source manifest, dve kanonske isporuke, SHA-256 otiscima, zabranom obe stare runtime putanje i istorijskim mapiranjem njihovih zamena. Source manifest beleži povezane potrošače i ostaje `standardized`, uz `pending step 4` za finalni audit. Green theme/cache verzija povećana je sa `54` na `55`; ranije porodice zadržavaju svoje istorijske verzije.

Nakon potvrđenih nula starih UI referenci uklonjena su samo dva zastarela runtime fajla:

- `www/assets/green-soft-clay/quarterly-league-yotb-ql-free-v2.png` — `217.526 B`.
- `www/assets/green-soft-clay/runtime/menu/quarterly-league-yotb-ql-free-v2.png` — `136.653 B`.

Njihovi bajt-po-bajt identični kanonski PNG-ovi su prisutni. Odobreni high-resolution izvor i kanonski master su takođe sačuvani, tako da je zamena povratljiva. Nisu brisani rangovi, medalje, tab ikonice, druga tema ili korisnički podaci.

## Tehnička provera i performance

`scripts/check-theme-performance.js` proverava status oba registra, otiske, dimenzije, dve kanonske uloge i sedam UI veza, nula starih UI veza i odsustvo starih fajlova. VM pozivi stvarnih `getThemeStartupSources` i `getThemeRoomSources` potvrđuju Green startup sa/bez DOM korena, sobni paket i odsustvo Green putanja u Easter/Desert tokovima. Proverava i sačuvane intro mere/tajming, header/popup mere, watermark opacity, reduced-motion, zaštićene zaključane porodice, startup izolaciju i statički obim cele QL oblasti.

Green runtime ostaje na `162 PNG / 14.792.994 B` (`14,11 MB`) — isti broj i veličina kao pre Koraka 2. Startup ostaje `17 PNG / 4,56 MB / 20,44 MB decoded`. Stvarni uski sobni matcher vraća `4 PNG / 393.393 B / 1.835.008 decoded B`; širi statički obračun glavnog logoa, tabova, bedževa i medalja ima `14 PNG / 1.466.088 B / 6.422.528 decoded B`. Ovo drugo nije tvrdnja da sve ikonice isti poziv učitava odjednom.

`npm test` prolazi sa svih devet projektnih provera. Statički audit i VM nisu pregled u Android emulatoru niti merenje FPS-a na uređaju.

## Sledeći korak

Korak 4 je završna vizuelna i tehnička provera svih prikaza i semantičkih granica. Tek nakon te provere source manifest i centralni registar mogu dobiti status `locked`. Nije rađen commit ni objavljivanje.
