# Green Asset Standardization — Online Players Room Identity, Korak 4

## Ishod

Završen je statički vizuelni, semantički i tehnički audit Green `online-players-room-identity` porodice. Source manifest i centralni registar imaju status `locked`, a source manifest beleži završni audit.

Ovaj korak nije menjao produkcione PNG-ove, UI putanje, dimenzije, CSS motion, live status, funkcije liste ili cache. Zaključan je glavni znak sobe sa room/menu izvedenicama; zasebne state/action ikone ostaju odvojene, sa evidentiranim sačuvanim otiscima.

## Vizuelna kontrola

Audit tabla: `docs/green-asset-standardization-online-players-room-identity-audit.png`.

Pregledani su master `1254×1254`, room `512×512`, menu `384×384`, minimalni intro primer od `210 px`, menu primer od `44 px` i header primer od `32 px`. State i akcije imaju veliki pregled i mali prikaz od `88`, `36`, `27` i `36 px`. Sačuvana odbačena uramljena verzija služi samo kao poređenje.

U malim prikazima ostaje prepoznatljiv isti znak tri glinena igrača: veća forest-green figura napred i dve warm-ivory figure iza. Materijal, meko osvetljenje i transparentna pozadina odgovaraju odobrenom Green DNK-u. Aktivni PNG nema kvadratnu pločicu ili ram. Na audit tabli šahovnica i okvir panela služe proveri transparentnosti; nisu deo ikone.

Svih 13 pregledanih source/canonical/pratećih PNG-ova je RGBA, sa alpha opsegom `0–255` i sva četiri transparentna ugla. Master je bajt-po-bajt odobreni izvor; LANCZOS `1254→512` reprodukuje room, a `512→384` menu. Direktno `1254→384` nije ista isporuka i ne zamenjuje zaključani dvostepeni build. Build i audit ostaju reproduktivni bez uklonjenih legacy fajlova.

## Semantika i potrošači

- Jedan glavni znak povezuje main-menu karticu, icon-only intro, zaglavlje i odgovarajući naslov u SR/EN Pravilima.
- Room PNG ima četiri direktne pune reference. Menu PNG ima dve: karticu i rezervni startup katalog. Stare pune UI reference su na nuli; tri legacy runtime kopije ostaju odsutne.
- State označava praznu/učitavajuću listu, a ne drugi room logo.
- Add-friend se dosledno deli između liste, pozivnice i Pravila. Spectate se deli između liste, gameplay zaglavlja, LIVE oznake i Pravila. Duel se ponavlja u izazovima i odgovarajućim Duel chat/Chat challenge stavkama.
- Živi broj, presence tačka, statusi igrača i profilne fotografije ostaju funkcionalni UI. Terracotta akcenti na pratećim ikonama ostaju statički detalji, ne živi server status.

Rules Communication page scena, H2H statistika, hotseat, online random, Global Chat send i drugi sobni identiteti nisu objedinjeni u ovu porodicu.

## Dimenzije i motion

Sačuvani su menu slika `44×44` u wrapperu `38×38`, card press `0,95→1`, header `32×32` i Rules inline glyph `1,42em`. Intro ostaje `clamp(210px, 34vmin, 290px)`, scale `1`, pulse `1,8 s`, otvaranje sobe na `3,65 s` i zatvaranje intro overlay-a na `4,6 s`, uz postojeći reduced-motion fallback.

State ostaje `88×88` sa opacity `0,86` i loading pulse-om `1,55 s`; shell ulaz ostaje `0,42 s`. Dugmad ostaju `38×38`, slike add-friend/duel `36×36`, spectate `27×27`, a disabled prikaz zadržava opacity `0,42` i grayscale/saturate filter. Deljeni invite add-friend ostaje `52×52` sa pulse-om `2,1 s` i reduced-motion; gameplay spectate ostaje `27×27`, a LIVE glyph `19×19`. Zasebna presence tačka ostaje `8×8` sa postojećim `2 s` pulse-om.

Nema nove talasne animacije: ova kartica nije deo donjeg talasnog reda. Postojeći motion nije izjednačen sa drugom semantičkom ulogom.

## Učitavanje i bilans

Izvršne provere stvarnih loading metoda potvrđuju da startup dobija tačno jednu menu isporuku, i kroz mali DOM fixture i kroz fallback bez main-menu DOM-a. Sobni paket ima tačno room identitet i četiri prateća state/action PNG-a, bez menu izvedenice. Green izvori ne cure u proverene Easter/Desert startup i Online Players room tokove. Loading gate ostaje sa šest prethodnih slika, bez Online Players znaka.

Bilans je nepromenjen u odnosu na Korak 3:

- Green: `162 PNG / 14.792.994 B` (`14,11 MB`).
- Startup: `17 PNG / 4,56 MB / 20,44 MB decoded`.
- Online Players room: `5 PNG / 442.271 B / 3.407.872 decoded B`.
- Cache verzija: `54`.

Decoded veličina je proračun PNG dimenzija pri četiri bajta po pikselu, ne merenje ukupne memorije procesa ili FPS-a na uređaju.

## Zaštite i završetak

Automatska provera sada zahteva `locked` status u oba registra i završnu audit oznaku. Štiti DNK, poreklo i fiksne otiske glavnih slika, dve delivery veličine, tačan broj veza, zabranu legacy putanja, istorijske zamene, odvojene motive, SR/EN naslove, prikazne veličine, disabled tretman, motion/reduced-motion i startup/room izolaciju.

Ponovljeni build i audit, svih devet provera iz `npm test` i `git diff --check` prolaze. Pre i posle Koraka 4 upoređeno je 172 produkciona/source fajla: Green runtime, UI, CSS, tematski manifest i glavni izvori. Svi zadržavaju iste SHA-256 otiske. Menjani su samo status/audit metapodaci ove porodice, razvojne provere, dokumentacija i oznake audit table.

Online Players Room Identity ciklus Koraci 1–4 je završen. To ne znači da su sve preostale Green porodice standardizovane ili da je urađen završni test cele aplikacije na uređaju. U ovom koraku nije rađen commit, objavljivanje, brisanje dodatnih fajlova ili pregled u Android emulatoru.
