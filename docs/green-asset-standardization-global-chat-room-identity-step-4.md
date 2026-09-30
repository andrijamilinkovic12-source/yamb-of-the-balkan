# Green Asset Standardization — Global Chat Room Identity, Korak 4

## Ishod

Završen je završni statički vizuelni, semantički i tehnički audit Green `global-chat-room-identity` porodice. Izvorni manifest i centralni registry imaju status `locked`.

Ovaj korak nije menjao odobreni razgovorni znak, produkcione PNG-ove, UI putanje, dimenzije, motion, tekstove ili funkcije chata. Zaključavanje se odnosi na identitet sobe i njegove delivery varijante; zasebne history/send/page ikone i živi podaci ostaju odvojeni.

## Vizuelna kontrola

Audit tabla: `docs/green-asset-standardization-global-chat-room-identity-audit.png`.

Tabla prikazuje kanonski master `1254×1254`, room `512×512`, menu `384×384`, minimalni intro prikaz od `210 px`, menu od `52 px` i header od `32 px`. Zasebne empty/loading i send slike prikazane su u većoj probi i stvarnim veličinama od `76` i `32 px`. Ilustracija Rules Communication stranice i sačuvani odbijeni uramljeni izvor prikazani su kao semantičko poređenje.

Pri malim prikazima ostaju prepoznatljivi ivory razgovorni oblačić sa tri zelene tačke, veća zelena razgovorna silueta iza i terracotta akcenat. Zeleni deo sa repom pripada samom razgovornom znaku, ne kvadratnoj podlozi. Slanje ima jasnu paper-plane siluetu; empty/loading motiv ostaje odvojeno stanje istorije. Terracotta kružni akcenat glavne ikone nije live online ili unread status.

Audit je pregled postojećih PNG-ova na statičkoj probnoj podlozi. Nije snimak Android emulatora niti provera chata sa živim serverom; pregled na uređaju ostaje zaseban završni release pregled.

## Kvalitet i reprodukcija

Build koristi samo odobreni izvor i zadržava LANCZOS `1254→512→384` postupak. Proverava RGBA, pun alpha opseg, transparentan ugao, dimenzije i fiksne SHA-256 otiske. Room i menu ostaju bajt-po-bajt identični odobrenim slikama pre migracije. Direktno `1254→384` ne daje istu odobrenu menu isporuku, pa se ne koristi.

| Uloga | Dimenzija | Bajtova | SHA-256 |
|---|---:|---:|---|
| Master | `1254×1254` | `1.092.962` | `e4b6c9fa9474614af58846a5df24cf196297b22f0673ead64a478c2b5b4bebbf` |
| Room | `512×512` | `178.822` | `ea96cb6a2f1a83768074adb6d2d9be44cbf4e9a21819619dbc18bfe7a1237e7e` |
| Menu | `384×384` | `108.756` | `57e55c8e9fef67d9576e112cc78bbcc3ba5f1ac006e1d5bd5405e8260517d070` |

Audit skripta čita kanonski master i runtime varijante. Proverava alpha i pixel-identičnost odobrenih room/menu izvedenica, a odbijenu framed varijantu čita samo iz izvora van `www` isporuke.

## Zaključani potrošači i motion

- Glavni meni: menu PNG `384×384`, prikaz `52×52` u transparentnoj kontroli `44×44`; postojeći press scale `0,9→1`. Nije deo donjeg talasnog reda.
- Icon-only intro: room PNG, `clamp(210px, 34vmin, 290px)`, scale `1`, `greenRoomIconPulse 1,8 s`, otvaranje sobe na `3,65 s` i zatvaranje overlay-a na `4,6 s`; reduced-motion fallback ostaje prisutan.
- Zaglavlje: isti room PNG, `32×32`, `contain`.
- SR/EN Pravila: isti room PNG kroz postojeće „Chat i komunikacija / Chat & Communication” i „Globalni chat / Global Chat” reference, sa očuvanim osnovnim `1,42em` inline `contain` prikazom.
- Shell sobe: postojeći `easterPanelLift 0,42 s`, bez promene dimenzija i sa reduced-motion fallback-om.
- Empty/loading: zaseban `76×76` motiv, `easterGlobalChatStatePulse 1,55 s` samo pri učitavanju; reduced-motion fallback ostaje prisutan.
- Send: zaseban `32×32` paper-plane PNG u postojećem dugmetu `45×45`; slanje poruke i active/inset odgovor dugmeta nisu menjani.

Komunikaciona scena Pravila, poruke, online broj/tačka, karakter counter, greške, moderacija, socket autentifikacija, close/report kontrole i ostale semantičke porodice nisu zamenjeni glavnom ikonom. Global chat nije dodat u loading gate: niz od šest prethodnih Green gate slika ostaje nepromenjen.

## Preload i performance izolacija

- Green tema: `163 PNG / 15.042.830 B` (`14,35 MB`).
- Startup: `17 PNG / 4,56 MB / 20,44 MB decoded`; od ovog identiteta učitava samo `384×384` menu isporuku.
- Global Chat room-on-demand: `3 PNG / 351.688 B / 2.228.224 decoded B`; kanonski room, empty/loading i send.
- Precizan room matcher ne uključuje menu varijantu. Startup fallback prepoznaje kanonsku menu putanju.
- Tri stare runtime putanje su odsutne i bez aktivnih UI veza; uklonjene su u Koraku 3, ne u ovom koraku. Izvori ostaju sačuvani, a Git istorija omogućava oporavak.
- Cache verzija ostaje `53`; zaključavanje ne uvodi novu produkcionu sliku niti novu UI putanju.

Automatske zaštite čuvaju `locked` status i završni audit u oba registra, DNK/paletu, fiksne otiske i dve uloge, tačan broj potrošača, nula legacy veza, zasebne history/send/page motive, SR/EN Rules reference, CSS dimenzije, motion/reduced-motion i startup/room izolaciju. Reproducibilni build i svih devet projektnih testova ponovljeni su nakon zaključavanja. `git diff --check` nema grešaka belina.

Pre i posle Koraka 4 upoređeni su SHA-256 otisci aktivnih HTML/JS/CSS fajlova, tematskog manifesta i relevantnih produkcionih PNG-ova: ostali su nepromenjeni.

## Status

Global Chat Room Identity je završen i zaključan. Nije rađen commit, objavljivanje, pokretanje Android emulatora ili slanje test poruka na server.
