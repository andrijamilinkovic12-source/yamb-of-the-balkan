# Green Asset Standardization — Global Chat Room Identity, Korak 1

## Opseg i odluka

Ovaj korak je inventar i statički vizuelno-semantički audit glavnog identiteta sobe Global chat. Nijedan aktivni asset, UI putanja, CSS dimenzija, motion, funkcionalnost chata ili preload tok nije promenjen. Napravljeni su samo dokumentacija, audit tabla i njena reprodukcijska skripta.

Jedini aktivni Green znak ulaska u sobu je `global-chat-free-v2.png`: slobodna ivory glinena razgovorna oblačić-silueta sa tri forest-green tačke, većim forest-green razgovornim oblačićem iza nje i jednim terracotta kružnim akcentom gore desno. Zeleni deo pripada razgovornoj silueti sa repom; nije dodatna kvadratna pločica ili ram. Akcenat je deo slike, ne živi online ili unread indikator.

Postojeći `global-chat-pro-v1.png` je odbačena ranija verzija: manji razgovorni simbol unutar zelenog kvadratnog rama, terracotta gornja traka i pejzažno dno. Nema aktivnih UI referenci. Runtime se uklanja tek u integracionom Koraku 3, posle potvrde novih veza; njegov izvor ostaje van `www` radi audit traga.

Audit tabla: `docs/green-asset-standardization-global-chat-room-identity-audit.png`. Skripta `scripts/make-green-global-chat-room-identity-audit-sheet.py` prikazuje postojeće slike bez prepisivanja izvora ili runtime asseta, ispisuje dimenzije i SHA-256 otiske i proverava RGBA/alpha kvalitet i reprodukciju room/menu slike.

## Jedan identitet, dve isporuke

| Uloga | Aktivna putanja pod `www/assets/green-soft-clay/` | Dimenzija | Potrošači |
|---|---|---:|---|
| room | `global-chat-free-v2.png` | `512×512` | intro, zaglavlje, tematsko mapiranje Pravila i paket sobe |
| menu | `runtime/menu/global-chat-free-v2.png` | `384×384` | glavni meni i startup |

LANCZOS `1254→512` je pixel-identičan odobrenoj room isporuci, a `512→384` menu isporuci. Direktni `1254→384` nije pixel-identičan; budući kanonski build mora sačuvati dvostepeni postupak, bez ponovnog generisanja motiva.

Glavni room PNG ima četiri direktne reference: zaglavlje u `www/index.html`, sobni paket i intro u `www/game.js`, te Green mapiranje u `www/pravilaigre.js`. Menu PNG ima jednu direktnu referencu na dugmetu glavnog menija. Mapiranje Pravila posredno pokriva „Chat i komunikacija” i „Globalni chat” na srpskom, kao i „Chat & Communication” i „Global Chat” na engleskom.

## Prikazi i motion

- Glavni meni: slika `52×52` u postojećoj kontroli `44×44`, `contain` i transparentna CSS podloga. Pritisak ima postojeći scale `0,9→1`. Ovo dugme nije u donjem talasnom redu od Dnevnog izazova do Pravila i nema njihov periodični wave motion.
- Green icon-only intro: `clamp(210px, 34vmin, 290px)`, scale `1`, pulse `1,8 s`, bez ponovljenog naslova. Soba se otvara na `3,65 s`, overlay se zatvara na `4,6 s`. Reduced-motion fallback je prisutan.
- Zaglavlje: isti room PNG, `32×32`, `contain`.
- Shell sobe: postojeći `easterPanelLift` ulaz `0,42 s` i reduced-motion fallback.
- Prazna/učitavajuća istorija: zaseban PNG, `76×76`; pulse `1,55 s` samo u loading stanju, uz reduced-motion fallback.
- Slanje poruke: zaseban paper-plane PNG, `32×32` u postojećem dugmetu `45×45`, `contain` i postojeći active/inset odgovor dugmeta.
- Pravila: ista room ikona za reference na Global chat, a ilustracija cele stranice Komunikacija ostaje zasebna scena.

Za razliku od pet donjih sobnih ikona, Global chat nije među šest slika Green theme loading gate-a. Prisutan je u `pack.assets`, što služi sobnom učitavanju; to nije dokaz da je prikazan u loading gate-u. Ovaj korak mu ne dodaje novu gate ulogu.

## Tehnički inventar

| Asset | Dimenzija / bajtova | SHA-256 |
|---|---:|---|
| `source-assets/green-soft-clay-hires/global-chat-free-v2.png` | `1254×1254 / 1.092.962` | `e4b6c9fa9474614af58846a5df24cf196297b22f0673ead64a478c2b5b4bebbf` |
| `www/assets/green-soft-clay/global-chat-free-v2.png` | `512×512 / 178.822` | `ea96cb6a2f1a83768074adb6d2d9be44cbf4e9a21819619dbc18bfe7a1237e7e` |
| `www/assets/green-soft-clay/runtime/menu/global-chat-free-v2.png` | `384×384 / 108.756` | `57e55c8e9fef67d9576e112cc78bbcc3ba5f1ac006e1d5bd5405e8260517d070` |
| `source-assets/green-soft-clay-hires/global-chat-pro-v1.png` | `1254×1254 / 1.422.670` | `f5edab2efa7e203f8fda43029a3e02beea65b196c5fc9a47aa70b5aec171d655` |
| `www/assets/green-soft-clay/global-chat-pro-v1.png` | `512×512 / 250.515` | `9aa752441629f1a3ddfbceaaa8f27d170de763624e235f85507c80fe63c34f68` |
| `source-assets/green-soft-clay-hires/global-chat-empty-v1.png` | `512×512 / 137.084` | `67821d69e2ef5e7291e6249b9e903ee5d75a87d5def2cd7b3d9105f29bdcab24` |
| `www/assets/green-soft-clay/global-chat-empty-v1.png` | `384×384 / 84.201` | `107a1d13229eb836b45a20ffe5502ad3c598ab93c9a81b83f5a90809b3e24783` |
| `source-assets/green-soft-clay-hires/global-chat-send-v1.png` | `512×512 / 145.263` | `37b3847339678bb1646df1d267feb7336b563b8c69cd2c9a11bc690b24eda54a` |
| `www/assets/green-soft-clay/global-chat-send-v1.png` | `384×384 / 88.665` | `d10f3db0831d99f9b34504bd48f0f64b49f5521710ee2e998ddd89477d34b426` |

Svih devet PNG-ova je RGBA, sa punim alpha opsegom `0–255` i transparentnim gornjim levim uglom. Datoteke empty/send u folderu `hires` zapravo imaju `512×512`, ne `1254×1254`; naziv foldera ne predstavlja višu izvornu rezoluciju.

## Semantičke granice

1. Glavni razgovorni znak označava **ulazak u Global chat i celu sobu**. Isti identitet mora ostati kroz menu, intro, zaglavlje i odgovarajuće reference u Pravilima.
2. `global-chat-empty-v1.png` označava praznu ili učitavajuću istoriju. Njegova manja zadnja razgovorna silueta razlikuje se od glavnog znaka, ali pripada zasebnom stanju, ne drugom room identitetu. Nema kvadratni ram.
3. `global-chat-send-v1.png` označava slanje poruke. Glineni papirni avion nije room logo, invite-send stanje, gameplay strelica, Undo token ili rewarded-video akcija.
4. `rules/pages/communication-v1.png` je složena ilustracija stranice Komunikacija: dva oblačića i mali statusni motiv. Ne zamenjuje glavnu ikonu Global chata.
5. Živi broj online igrača, online tačka, counter znakova, status greške, prijava poruke i close kontrola ostaju funkcionalni UI, ne delovi PNG logoa. Poruke, socket autentifikacija, pravila pristupa i moderacija nisu predmet ove migracije.

## Preload i performance

Startup preuzima samo `384×384` menu isporuku sa stvarnog dugmeta. U uobičajenom Green toku `openGlobalChat()` pokreće intro, a on odmah poziva `prepareThemeRoomAssets('globalChat')`. Sobni matcher prepoznaje `global-chat` prefiks; sobni paket ima glavnu room ikonu, send i empty stanje. Slike iz stvarnog DOM-a pridružuju se istim izvorima, a dinamički empty/loading prikaz koristi postojeću hydration logiku.

Aktivni sobni paket ima `3 PNG / 351.688 B / 2.228.224 decoded B`. Široki statički skener po prefiksu dodatno broji neaktivni `global-chat-pro-v1.png`, odnosno `4 PNG / 602.203 B / 3.276.800 decoded B`; to ne znači da ga runtime učitava. Menu varijanta nije deo tog sobnog paketa.

Green tema ostaje na `164 PNG / 15.293.345 B` (`14,58 MB`), startup `17 PNG / 4,56 MB / 20,44 MB decoded`, cache verzija `52`. Performance provera prolazi. Kasnije uklanjanje neaktivnog uramljenog runtimea smanjilo bi isporuku za `250.515 B`, na `163 PNG / 15.042.830 B`; to je projekcija, ne rezultat ovog koraka.

## Sledeći korak

Korak 2 formira kanonski `global-chat-room-identity` paket iz odobrenog mastera: room `512×512` i menu `384×384`, reprodukcijski build i manifest sa jasnim semantičkim granicama. Aktivne putanje, cache, stanje istorije i send ikona ostaju nepromenjeni do Koraka 3. Tada se povezuju potrošači, startup fallback i precizan sobni matcher, registruje porodica i tek nakon nula legacy UI veza uklanjaju stare kopije. Korak 4 je završni audit i zaključavanje.

Nije rađen commit, objavljivanje ili pregled u Android emulatoru.
