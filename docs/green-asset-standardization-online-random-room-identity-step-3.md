# Green Asset Standardization — Online Random Room Identity, Korak 3

## Ishod

Kanonski Green identitet režima Online Random povezan je sa glavnim menijem, startup tokom, 4,6-sekundnim icon-only introm, waiting-room headerom, odgovarajućim SR/EN referencama u Pravilima i Online Random room-on-demand paketom. Source manifest i centralni registar imaju status `standardized`; završni audit i `locked` status ostaju za Korak 4.

Nije renderovan novi znak niti su promenjeni njegovi pikseli. Room `512×512` i menu `384×384` isporuke ostaju bajt-po-bajt jednake odobrenim kopijama. Sačuvani su menu prikaz `68×68` (`60×60` na uskom portretu), hover/press transformi, intro skala `1,2`, `clamp(210px, 34vmin, 290px)`, pulse `1,8 s`, otvaranje igre posle `3,65 s`, overlay `4,6 s` i reduced-motion zaštita.

## Povezani potrošači

| Potrošač | Kanonska isporuka | Sačuvano ponašanje |
|---|---|---|
| Glavna kartica Online Random | `online-random-room-menu-v1.png` | postojeća mera, providna podloga i card motion |
| Startup sa ili bez main-menu DOM-a | `online-random-room-menu-v1.png` | tačno jedna `384 px` slika; room kopija se ne učitava |
| Online Random intro | `online-random-room-v1.png` | postojeći icon-only motion, skala i tajming |
| Waiting-room header | `online-random-room-v1.png` | statičan prikaz `34×34` |
| SR/EN Pravila | `online-random-room-v1.png` | dva srpska i dva engleska Multiplayer naslova koriste isto tematsko mapiranje |
| Online Random room-on-demand | `online-random-room-v1.png` | room znak uz pet zasebnih funkcionalnih stanja |

Room PNG sada ima četiri direktne pune kodne reference: sobni katalog, intro, waiting-room header i Green mapiranje u Pravilima. Menu PNG ima dve: glavnu karticu i eksplicitni `menuAssets` fallback. Relativna putanja u matcher-u je pravilo odabira, ne dodatni slikovni potrošač.

## Startup i sobna izolacija

`www/game.js` drži room PNG u `pack.assets`, a menu PNG u odvojenom `menuAssets` katalogu. Startup regex eksplicitno prepoznaje `online-random-room-menu-v1.png`, dok `opponent` matcher eksplicitno prepoznaje samo `online-random-room-v1.png` i postojeći `opponent/` prostor.

Normalni DOM startup uzima menu PNG sa kartice. Rezervni tok bez `#main-menu` uzima ga iz `menuAssets`; deduplikacija daje tačno jednu kopiju. Stvarni loading pozivi potvrđuju da room PNG ne ulazi u startup.

Online Random room-on-demand paket sadrži tačno šest PNG-ova:

1. glavni room identitet;
2. `scanning`;
3. `found`;
4. `vs`;
5. `disconnected`;
6. `reconnected`.

Menu PNG i deljena `online-spectate` akcija nisu u ovom paketu. Easter, Desert i Severna startup/Online Random tokovi ne dobijaju Green putanje.

## Funkcionalna i semantička zaštita

Postojeće mere i motion funkcionalnih stanja ostaju nepromenjeni: header `34×34`, scanning `54×54` sa radar animacijom `1,65 s`, VS `42×42`, found `36×36` sa pop animacijom `0,55 s` i connection state u timer pill-u `27×27`. Reduced-motion fallback ostaje aktivan.

Glavni globus nije korišćen umesto matchmaking ili connection stanja. `online-spectate` ostaje deljena akcija gledanja meča u drugim odgovarajućim tokovima. Hotseat, Online Players, H2H Statistics, Solo i Invite Friend identiteti nisu spojeni ili zamenjeni.

Nisu menjani stvarni profili, imena, Power i POB/NER/POR podaci, matchmaking, socket/reconnect logika, timer pill, tehnički rezultat, spectator tok, swipe između tabli, automatsko praćenje aktivnog igrača, bodovanje ili gameplay geometrija.

## Registry, cache i stare kopije

`onlineRandomRoomIdentity` je dodat u `www/themes/green/asset-registry.json` sa istim DNK-om kao source manifest, dve kanonske isporuke, SHA-256 otiscima, semantičkim izuzecima, zabranom starih putanja i istorijskim mapiranjem zamena. Green theme/cache verzija povećana je `57→58`; ranije porodice zadržavaju svoje istorijske integracione verzije.

Nakon potvrđenih nula aktivnih starih UI referenci uklonjene su samo dve praćene, bajt-po-bajt duplirane runtime kopije:

- `www/assets/green-soft-clay/mode-opponent-free-v2.png` — `135.692 B`;
- `www/assets/green-soft-clay/runtime/menu/mode-opponent-free-v2.png` — `83.367 B`.

Kanonske zamene, odobreni hires izvor i master ostaju sačuvani. Uklonjene kopije su povratljive iz Git istorije. Build skripta je uspešno ponovljena posle uklanjanja, a audit skripta i tabla sada čitaju kanonske isporuke.

## Performance i provere

Green runtime se posle privremenog Koraka 2 vratio sa `164` na `162 PNG`, odnosno `14.792.994 B` (`14,11 MB`). Startup ostaje `17 PNG / 4,56 MB / 20,44 MB decoded`. Online Random room-on-demand ostaje `6 PNG / 496.705 B / 3.997.696 decoded B`.

`scripts/check-theme-performance.js` proverava oba registra, DNK, dimenzije, alpha, fiksne otiske, dve kanonske isporuke, šest kanonskih kodnih referenci, nula starih UI referenci, odsustvo dve stare datoteke, pet izdvojenih funkcionalnih stanja, shared spectate granicu, protected porodice, motion i reduced-motion ugovor, startup/room izolaciju i odsustvo curenja u druge teme.

Korak 3 je završen. Korak 4 je završni vizuelni, semantički i tehnički audit, nakon kog porodica može dobiti status `locked`. Nije rađen commit, objavljivanje niti pregled u Android emulatoru.
