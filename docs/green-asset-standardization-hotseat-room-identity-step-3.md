# Green Asset Standardization — Hotseat Room Identity, Korak 3

## Ishod

Kanonski Green identitet režima Dva igrača Hotseat povezan je sa glavnim menijem, startup tokom, 4,6-sekundnim icon-only introm i Hotseat room-on-demand paketom. Source manifest i centralni registar imaju status `standardized`; završni audit i `locked` status ostaju za Korak 4.

Nije renderovan novi znak niti su promenjeni njegovi pikseli. Room `512×512` i menu `384×384` isporuke ostaju bajt-po-bajt jednake odobrenim kopijama. Sačuvani su menu prikaz `68×68` (`60×60` na uskom portretu), hover/press transformi, intro `clamp(210px, 34vmin, 290px)`, pulse `1,8 s`, otvaranje igre posle `3,65 s`, overlay `4,6 s` i reduced-motion zaštita.

## Povezani potrošači i izolacija

| Potrošač | Kanonska isporuka | Sačuvano ponašanje |
|---|---|---|
| Glavna kartica Dva igrača | `hotseat-room-menu-v1.png` | postojeća mera, providna podloga i card motion |
| Startup sa ili bez main-menu DOM-a | `hotseat-room-menu-v1.png` | tačno jedna `384 px` slika; room kopija se ne učitava |
| Hotseat intro | `hotseat-room-v1.png` | postojeći icon-only motion i tajming |
| Hotseat room-on-demand | `hotseat-room-v1.png` | room znak uz zasebni zaključani Hotseat Winner |

`www/game.js` sada drži room PNG u `pack.assets`, a menu PNG u odvojenom `menuAssets` fallback katalogu. Startup regex eksplicitno prepoznaje samo `hotseat-room-menu-v1.png`. Hotseat matcher eksplicitno prepoznaje `hotseat-room-v1.png`, `canonical/hotseat-winner/` i postojeći `hotseat/` prostor, bez menu slike.

Normalni DOM startup uzima menu PNG sa kartice. Rezervni tok bez `#main-menu` uzima ga iz `menuAssets`; deduplikacija daje tačno jednu kopiju. VM pozivi stvarnih loading metoda potvrđuju isti rezultat u oba toka. Easter, Desert i Severna startup/Hotseat tokovi ne dobijaju Green putanje.

## Winner/remi i semantičke granice

Zaključani `canonical/hotseat-winner/hotseat-winner-v1.png` ostaje posebna rezultatska porodica. Prikazuje se `58×58` sa postojećim reveal motionom `0,48 s` samo kada je `isHotseatResult && !isDraw`; remi i dalje nema winner znak. Reduced-motion zaštita je očuvana.

Solo, Online Random, Invite Friend, H2H Statistics i Online Players identiteti nisu preimenovani, spojeni ili zamenjeni Hotseat room znakom. Nisu menjani aktivni igrač, imena, poeni, dve table, swipe, automatsko praćenje, nastavak/nova igra, bodovanje, save recovery ili gameplay geometrija.

## Registry, cache i stare kopije

`hotseatRoomIdentity` je dodat u `www/themes/green/asset-registry.json` sa istim DNK-om kao source manifest, dve kanonske isporuke, SHA-256 otiscima, semantičkim izuzecima, zabranom starih putanja i istorijskim mapiranjem zamena. Green theme/cache verzija povećana je `56→57`; ranije porodice zadržavaju svoje istorijske integracione verzije.

Nakon potvrđenih nula aktivnih starih UI referenci uklonjene su samo dve praćene, bajt-po-bajt duplirane runtime kopije:

- `www/assets/green-soft-clay/mode-hotseat-free-v2.png` — `120.269 B`;
- `www/assets/green-soft-clay/runtime/menu/mode-hotseat-free-v2.png` — `74.765 B`.

Kanonske zamene, odobreni hires izvor i master ostaju sačuvani. Uklonjene kopije su povratljive iz Git istorije. Build skripta je uspešno ponovljena nakon uklanjanja, a audit skripta i tabla sada čitaju kanonske isporuke.

## Performance i provere

Green runtime se posle privremenog Koraka 2 vratio sa `164` na `162 PNG`, odnosno `14.792.994 B` (`14,11 MB`). Startup ostaje `17 PNG / 4,56 MB / 20,44 MB decoded`. Stvarni Hotseat sobni paket ostaje `2 PNG / 158.678 B / 1.310.720 decoded B`: room znak i Hotseat Winner, bez menu slike.

`scripts/check-theme-performance.js` proverava oba registra, DNK, dimenzije, alpha, fiksne otiske, dve kanonske isporuke, četiri kanonske kodne reference, nula starih referenci, odsustvo dve stare datoteke, protected porodice, winner/remi uslov, motion, startup/room izolaciju i odsustvo curenja u druge teme.

Korak 3 je završen. Korak 4 je završni vizuelni, semantički i tehnički audit, nakon kog porodica može dobiti status `locked`. Nije rađen commit, objavljivanje niti pregled u Android emulatoru.
