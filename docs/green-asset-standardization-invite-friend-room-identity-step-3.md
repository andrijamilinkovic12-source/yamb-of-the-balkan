# Green Asset Standardization — Invite Friend Room Identity, Korak 3

## Ishod

Kanonski Green identitet sobe „Pronađi/Pozovi prijatelja“ povezan je sa glavnim menijem, startup tokom, 4,6-sekundnim icon-only introm, waiting-room headerom, odgovarajućim SR/EN referencama u Pravilima i uskim Invite Friend room-on-demand paketom. Source manifest i centralni registar imaju status `standardized`; završni audit i `locked` status ostaju za Korak 4.

Nije renderovan novi znak niti su menjani njegovi pikseli. Room `512×512` i menu `384×384` isporuke ostaju bajt-po-bajt jednake odobrenim kopijama. Sačuvani su menu prikaz `68×68` (`60×60` na uskom portretu), hover/press transformi, intro skala `1,05`, `clamp(210px, 34vmin, 290px)`, pulse `1,8 s`, otvaranje sobe posle `3,65 s`, overlay `4,6 s` i reduced-motion zaštita.

## Povezani potrošači

| Potrošač | Kanonska isporuka | Sačuvano ponašanje |
|---|---|---|
| Glavna kartica Invite Friend | `invite-friend-room-menu-v1.png` | postojeća mera, providna podloga i card motion |
| Startup sa ili bez main-menu DOM-a | `invite-friend-room-menu-v1.png` | tačno jedna `384 px` slika; room kopija se ne učitava |
| Invite Friend intro | `invite-friend-room-v1.png` | postojeći icon-only motion, skala i tajming |
| Waiting-room header | `invite-friend-room-v1.png` | statičan prikaz `34×34` za hosta i pozvanog igrača |
| SR/EN Pravila | `invite-friend-room-v1.png` | oba naslova privatnih duela koriste isto Green mapiranje |
| Invite Friend room-on-demand | `invite-friend-room-v1.png` | room znak uz četiri zasebna funkcionalna stanja |

Room PNG ima četiri direktne pune kodne reference: sobni katalog, intro, waiting-room header i Green mapiranje u Pravilima. Menu PNG ima dve: glavnu karticu i eksplicitni `menuAssets` fallback. Relativna putanja u matcher-u je pravilo odabira, ne dodatni slikovni potrošač.

## Startup i sobna izolacija

`www/game.js` drži room PNG u `pack.assets`, a menu PNG u odvojenom `menuAssets` katalogu. Startup regex eksplicitno prepoznaje samo `invite-friend-room-menu-v1.png`, dok `invite` matcher eksplicitno prepoznaje `invite/` funkcionalna stanja i samo `invite-friend-room-v1.png`.

Normalni DOM startup uzima menu PNG sa kartice. Rezervni tok bez `#main-menu` uzima ga iz `menuAssets`; deduplikacija daje tačno jednu kopiju. Stvarni loading pozivi potvrđuju da room PNG ne ulazi u startup.

Invite Friend room-on-demand paket sadrži tačno pet PNG-ova:

1. glavni room identitet;
2. `send`;
3. `empty`;
4. `sent`;
5. `accepted`.

Menu PNG, deljena `online-add-friend` akcija i H2H identiteti nisu u ovom paketu. Easter, Desert i Severna startup/Invite Friend tokovi ne dobijaju Green putanje.

## Funkcionalna i semantička zaštita

Postojeće mere i motion ostaju nepromenjeni: header `34×34`, shared add-friend `52×52` sa `greenInviteSoftBreath 2,1 s`, empty `64×64`, send `18×18`, sent/accepted toast znakovi `52×52` i panel-lift `0,44 s`. Reduced-motion fallback ostaje aktivan.

Glavni znak nije korišćen umesto add/search, send, empty, sent ili accepted funkcionalnih stanja. H2H empty i greatest-rival prikaz ostaju u svojoj zaključanoj porodici. Online Players, Online Random i Hotseat identiteti nisu spojeni ili zamenjeni.

Nisu menjani stvarni profili, imena, Power i POB/NER/POR podaci, pretraga prijatelja, zahtevi, slanje/prihvatanje pozivnica, room join, socket/reconnect tok, table, swipe, automatsko praćenje aktivnog igrača, bodovanje ili gameplay geometrija.

## Registry, cache i stare kopije

`inviteFriendRoomIdentity` je dodat u `www/themes/green/asset-registry.json` sa istim DNK-om kao source manifest, dve kanonske isporuke, SHA-256 otiscima, semantičkim izuzecima, zabranom starih putanja i istorijskim mapiranjem zamena. Green theme/cache verzija povećana je `58→59`; ranije porodice zadržavaju svoje istorijske integracione verzije.

Nakon potvrđenih nula aktivnih starih UI referenci uklonjene su samo dve praćene, bajt-po-bajt duplirane runtime kopije:

- `www/assets/green-soft-clay/mode-invite-free-v2.png` — `150.862 B`;
- `www/assets/green-soft-clay/runtime/menu/mode-invite-free-v2.png` — `92.386 B`.

Kanonske zamene, odobreni hires izvor i master ostaju sačuvani. Uklonjene kopije su povratljive iz Git istorije. Build skripta je uspešno ponovljena posle uklanjanja, a audit skripta i tabla sada čitaju kanonske isporuke.

## Performance i provere

Green runtime se posle privremenog Koraka 2 vratio sa `164` na `162 PNG`, odnosno `14.792.994 B` (`14,11 MB`). Startup ostaje `17 PNG / 4,56 MB / 20,44 MB decoded`. Invite Friend room-on-demand ostaje `5 PNG / 447.128 B / 3.407.872 decoded B`.

`scripts/check-theme-performance.js` proverava oba registra, DNK, dimenzije, alpha, fiksne otiske, dve kanonske isporuke, šest kanonskih kodnih referenci, nula starih UI referenci, odsustvo dve stare datoteke, četiri izdvojena funkcionalna stanja, shared add-friend granicu, protected porodice, motion i reduced-motion ugovor, startup/room izolaciju i odsustvo curenja u druge teme.

Korak 3 je završen. Korak 4 je završni vizuelni, semantički i tehnički audit, nakon kog porodica može dobiti status `locked`. Nije rađen commit, objavljivanje niti pregled u Android emulatoru.
