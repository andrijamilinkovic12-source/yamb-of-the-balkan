# Green Asset Standardization — Online Players Room Identity, Korak 1

## Opseg i odluka

Ovaj korak je inventar i statički vizuelno-semantički audit glavnog identiteta sobe Online igrači. Aktivni asseti, UI putanje, CSS mere, motion, preload, pretraga, paginacija i serverske akcije nisu menjani. Dodati su samo ovaj dokument, audit tabla i njena reprodukcijska skripta.

Jedini aktivni Green znak sobe je `online-players-free-v2.png`: tri slobodne glinene figure, veća forest-green figura u sredini, dve ivory figure iza nje i mali ivory vratni detalj na centralnoj figuri. PNG nema kvadratnu podlogu, ram ili ugrađenu online tačku. Taj identitet već povezuje meni, intro, zaglavlje i reference na sobu u Pravilima.

`online-players-pro-v1.png` je ranija uramljena verzija: tri ivory figure unutar zelenog kvadratnog rama, terracotta gornja traka i pejzažno dno. Pretraga svih JS/HTML/CSS datoteka u `www` nije našla nijednu referencu na taj naziv. Runtime se uklanja tek u integracionom Koraku 3, nakon provere novih veza; izvor ostaje van `www` radi audit traga.

Audit tabla je `docs/green-asset-standardization-online-players-room-identity-audit.png`. Skripta `scripts/make-green-online-players-room-identity-audit-sheet.py` prikazuje postojeće PNG-ove, velike preglede i primere njihovih stvarnih CSS veličina, proverava RGBA/alpha i pixel-identitet isporuka i ispisuje SHA-256 otiske. Tabla nije screenshot emulatora niti dokaz ponašanja aplikacije uživo.

## Jedan identitet, dve isporuke

| Uloga | Aktivna putanja pod `www/assets/green-soft-clay/` | Dimenzija | Potrošači |
|---|---|---:|---|
| room | `online-players-free-v2.png` | `512×512` | intro, zaglavlje, mapiranje Pravila i sobni paket |
| menu | `runtime/menu/online-players-free-v2.png` | `384×384` | glavni meni i startup |

LANCZOS `1254→512` je pixel-identičan odobrenoj room isporuci, a `512→384` menu isporuci. Direktni `1254→384` nije pixel-identičan; kanonski build mora sačuvati dvostepeni postupak, bez ponovnog generisanja motiva.

Room PNG ima četiri direktne reference: `www/index.html` (zaglavlje), `www/game.js` (pack i intro), `www/pravilaigre.js` (Green mapiranje). Menu PNG ima jednu direktnu referencu u `www/index.html`. Mapiranje Pravila pokriva naslov „Online igrači i interakcija” i engleski „Online Players & Interaction”. Pripadajuća ilustracija cele stranice Komunikacija nije glavni room znak.

## Prikazi i motion

- Meni: slika `44×44`, `contain`, u postojećem wrapperu `38×38`. Kartica zadržava postojeći odgovor na pritisak `0,95→1`. PNG nije u donjem talasnom redu od Dnevnog izazova do Pravila i nema njihov periodični wave motion.
- Online presence tačka je zaseban CSS/UI element `8×8` sa `pulse 2 s`; živi broj igrača je zaseban tekstualni element. Ne ugrađuju se u kanonski PNG.
- Green icon-only intro: postojeći `clamp(210px, 34vmin, 290px)`, scale `1`, `greenRoomIconPulse 1,8 s`, bez ponovljenog naslova. Soba se otvara na `3,65 s`, intro overlay se zatvara na `4,6 s`. Postojeći reduced-motion fallback ostaje.
- Zaglavlje: isti room PNG, `32×32`, `contain`.
- Shell sobe: `easterPanelLift 0,42 s` i postojeći reduced-motion fallback.
- Prazno/učitavajuće stanje: zaseban PNG `88×88`, opacity `0,86`; pulse `1,55 s` samo za `is-loading`, uz reduced-motion fallback.
- Akcije u listi: dugmad ostaju `38×38`; add-friend i duel PNG su `36×36`, spectate PNG je `27×27`. Disabled stanje koristi opacity `0,42` i grayscale/saturate filter, ne drugi PNG identitet.
- Isti add-friend PNG postoji i na kartici za dodavanje prijatelja u pozivnici: `52×52`, `greenInviteSoftBreath 2,1 s`.
- Isti spectate PNG postoji u gameplay zaglavlju `27×27` i spectator LIVE oznaci `19×19`.

Online igrači nisu među šest slika Green theme loading gate-a. Room i četiri prateće ikone jesu u `pack.assets` za sobno učitavanje; to ne znači da su sve deo startupa ili loading gate-a. Ovaj korak ne dodaje novu gate ulogu.

## Tehnički inventar

Putanje `hires/` u tabeli znače `source-assets/green-soft-clay-hires/`, a `green/` znači `www/assets/green-soft-clay/`.

| Asset | Dimenzija / bajtova | SHA-256 |
|---|---:|---|
| `hires/online-players-free-v2.png` | `1254×1254 / 912.657` | `d72cf7d27bfbd93662b68ef819bb6376e99018e0b56e61f1666104c4dc5ee65d` |
| `green/online-players-free-v2.png` | `512×512 / 154.856` | `319f2407117c1ec539af88248b48ee2c2daaf544342dbf36c13ed2697f2bd189` |
| `green/runtime/menu/online-players-free-v2.png` | `384×384 / 94.595` | `330662c03ccc96c84ddd920834bb16a73ee5cc8ff4143cd9fcbaf0089ea6623f` |
| `hires/online-players-pro-v1.png` | `1254×1254 / 1.336.968` | `919d9c49de3956ec84f3d90c256b858a37f289113f1b0cd957340e340bf02b54` |
| `green/online-players-pro-v1.png` | `512×512 / 249.836` | `5f6fab755cd9d8a6eda27680fba52852524d8654adcf9cdf6408a8308e1b13f9` |
| `hires/online-players-state-v1.png` | `512×512 / 116.438` | `2d6678ead38ca5f6f8091125faf997c05568c81519fff8c094941b7ace2ebd4f` |
| `green/online-players-state-v1.png` | `384×384 / 70.632` | `0ee96acc12409963fa3c9799da9f703097c77c09b219f652d270db370d1d4193` |
| `hires/online-add-friend-v1.png` | `512×512 / 124.656` | `193fcd04a1a9da7c5f12b5b0450133a309c5d3c934708053ca0f256659a74709` |
| `green/online-add-friend-v1.png` | `384×384 / 76.237` | `61dc2f1a57f475a2279f48337590784f527edcf2044e53c52df43f1814ef0dda` |
| `hires/online-spectate-v1.png` | `512×512 / 101.342` | `ca465332f75863ab8b29117dd5efb3020448ed61882186f82102f0f523927c94` |
| `green/online-spectate-v1.png` | `384×384 / 61.861` | `7bd46544d38104aa8a100da3c52e29eff7128c0efb9ed40c0159e5c28c30ec75` |
| `hires/online-duel-v1.png` | `512×512 / 127.730` | `b6693095dff5ab9d7dd15a4d1483f4e88495c5bd86591fb081d8fb4878ae4af4` |
| `green/online-duel-v1.png` | `384×384 / 78.685` | `38b68fc8f6c5033aa993ab569864967c56fefced373e075d151e30ff343317ea` |

Svih 13 PNG-ova je RGBA, sa alpha opsegom `0–255` i transparentnim gornjim levim uglom. Izvori state/add-friend/spectate/duel u folderu `hires` imaju `512×512`, ne `1254×1254`; naziv foldera nije dokaz veće rezolucije. Vizuelni audit nije našao kvadratni ram na aktivnim slikama.

## Semantičke granice

1. Glavni znak tri igrača označava **celu sobu Online igrači**, ne dodavanje jednog prijatelja, duel, statistički H2H ili hotseat mod.
2. `online-players-state-v1.png` je prikaz prazne/učitavajuće liste: jedna ivory figura iznad tri zelene zaobljene trake sa terracotta akcentom. Trake nisu kvadratna podloga; ovo je zasebno stanje, ne alternativni room logo.
3. `online-add-friend-v1.png` je jedna ivory figura, forest-green plus i terracotta akcent. Označava dodavanje prijatelja i već je zajednički listi Online igrača, pozivnici i SR/EN Pravilima. Ne praviti novu varijantu samo zbog druge sobe.
4. `online-spectate-v1.png` je ivory oko sa zelenom dužicom i terracotta akcentom. Zajednički je listi, gameplay spectator kontroli, LIVE oznaci i Pravilima; nije live online tačka niti glavni logo sobe.
5. `online-duel-v1.png` su dve figure, ivory i zelena, razdvojene zelenom munjom sa terracotta akcentom. Označava duel/izazov; isti asset koriste SR/EN stavke „Izazov”, „Duel chat” i „Izazov iz chata”. Ne zamenjuje logo online random moda, hotseat, H2H statistiku ili send ikonu Global chata.
6. Terracotta akcenti na state/action PNG-ovima su statični materijalni detalji. Ne predstavljaju unread broj ili serverski status. Statusi igrača, profilne slike, pretraga, refresh, load-more, close, zahtevi za prijateljstvo i pravila pristupa ostaju funkcionalni UI izvan room-identity migracije.

## Preload i performance

Startup koristi `384×384` menu isporuku sa stvarne kartice. U normalnom Green toku `openOnlinePlayers()` zahteva prijavu i pokreće intro; intro odmah poziva `prepareThemeRoomAssets('onlinePlayers')`. Sobni matcher prepoznaje `online-players`, `online-add-`, `online-spectate` i `online-duel` prefikse. `pack.assets` sadrži glavni room PNG, state i tri akcije; DOM izvori dopunjuju iste putanje. Lista se zatim dinamički prikazuje u `www/onlinenumber.js` kroz postojeći theme-hydration mehanizam.

Aktivni sobni paket ima `5 PNG / 442.271 B / 3.407.872 decoded B`. Široki statički skener po prefiksu dodatno broji neaktivni pro PNG, odnosno `6 PNG / 692.107 B / 4.456.448 decoded B`; to nije dokaz da ga runtime preuzima. Menu varijanta nije deo tog sobnog paketa.

Green ostaje na `163 PNG / 15.042.830 B` (`14,35 MB`), startup `17 PNG / 4,56 MB / 20,44 MB decoded`, manifest/cache verzija `53`. `node scripts/check-js.js` i `node scripts/check-theme-performance.js` prolaze. Naknadno uklanjanje neaktivnog pro runtimea smanjilo bi paket za `249.836 B`, na `162 PNG / 14.792.994 B`; ovo je projekcija, ne rezultat Koraka 1.

## Sledeći korak

Korak 2 formira kanonski `online-players-room-identity` paket iz postojećeg odobrenog mastera: room `512×512`, menu `384×384`, reprodukcijski build i manifest. Aktivne putanje, cache, state i tri deljene akcione ikone ostaju nepromenjeni do Koraka 3. Tada se povezuju potrošači, startup fallback i precizan sobni matcher, registruje porodica i tek posle nula legacy UI veza uklanjaju stare room/menu kopije i neaktivni pro runtime. Korak 4 je završni audit i zaključavanje.

Korak 1 ne zaključava celu sobu i ne predstavlja novu implementaciju state/action ikona. Nije rađen commit, objavljivanje ili provera u Android emulatoru.
