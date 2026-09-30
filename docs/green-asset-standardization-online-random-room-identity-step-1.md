# Green Asset Standardization — Online Random Room Identity, Korak 1

## Opseg i odluka

Ovaj korak je inventar i statički vizuelno-semantički audit **glavnog identiteta sobe Online Random / Nađi protivnika**. Aktivni PNG-ovi, UI putanje, Pravila, CSS, intro, matchmaking, preload, centralni registar i cache nisu menjani. Dodati su samo ovaj dokument, audit tabla i reprodukcijska skripta.

Jedini zatečeni Green znak same sobe je `mode-opponent-free-v2.png`: forest-green glineni globus sa warm-ivory meridijanima/paralelama i dve velike terracotta strelice u suprotnim smerovima. Znak je slobodnostojeći na transparentnoj podlozi, bez kvadratnog rama, teksta, profila igrača ili statusne oznake. Predstavlja **ulazak u nasumični online duel**, ne skeniranje, pronađenog protivnika, VS, prekid/povratak veze ili gledanje meča.

Audit tabla `docs/green-asset-standardization-online-random-room-identity-audit.png` poredi odobreni izvor, room i menu kopiju, četiri stvarne prikazne veličine i šest zasebnih funkcionalnih znakova. `scripts/make-green-online-random-room-identity-audit-sheet.py` proverava RGBA/alpha, providne uglove, otiske, LANCZOS izvedenice i trenutni sobni paket. Tabla nije screenshot emulatora.

## Jedan glavni znak, dve isporuke

| Uloga | Aktivna putanja pod `www/assets/green-soft-clay/` | Dimenzija | Zatečeni potrošači |
|---|---|---:|---|
| room | `mode-opponent-free-v2.png` | `512×512` | sobni katalog, icon-only intro, zaglavlje čekaonice i Green mapiranje za četiri SR/EN naslova u Pravilima |
| menu | `runtime/menu/mode-opponent-free-v2.png` | `384×384` | kartica Online Random u glavnom meniju i normalan DOM startup |

Odobreni izvor je `source-assets/green-soft-clay-hires/mode-opponent-free-v2.png`, `1254×1254`. LANCZOS `1254→512` je pixel-identičan room isporuci, a `512→384` menu isporuci. Direktno `1254→384` nije pixel-identično; budući build mora zadržati dvostepeni postupak. Nije potreban novi render niti promena glinenog DNK-a.

Pretraga produkcionih JS/HTML/CSS fajlova nalazi četiri pune room reference: sobni katalog i intro u `www/game.js`, header čekaonice u `www/index.html` i Green tematsko mapiranje u `www/pravilaigre.js`, koje koriste dva srpska i dva engleska naslova. Menu ima jednu punu referencu na kartici.

## Prikazi i motion

- Glavni meni: menu PNG je `68×68`, odnosno `60×60` na uskom portretu, sa postojećim zajedničkim Green hover/press transformima.
- Intro: room PNG koristi wrapper `clamp(210px, 34vmin, 290px)`, konfiguracionu skalu `1,2`, `greenRoomIconPulse 1,8 s`, otvaranje sobe posle `3,65 s` i završetak overlay-a posle `4,6 s`, uz reduced-motion zaštitu.
- Zaglavlje čekaonice: isti room PNG je `34×34`, `contain`, bez dodatnog motiona.
- Matchmaking state: `scanning-v1.png` je `54×54` sa radar motionom `1,65 s`; `found-v1.png` je `36×36` sa pop ulazom `0,55 s`; `vs-v1.png` je statičan `42×42`.
- Connection state: disconnected/reconnected znak u timer pill-u je `27×27`. Relevantni state motion ima reduced-motion fallback.

Ove mere i animacije pripadaju postojećem UI-ju; Korak 1 ih samo evidentira.

## Semantičke granice

1. `scanning`, `found`, `vs`, `disconnected` i `reconnected` jesu funkcionalna stanja online toka. Ne smeju postati varijante glavnog globusa niti biti zamenjeni njime.
2. `online-spectate-v1.png` je deljena akcija gledanja meča u Online Players listi, gameplay zaglavlju, LIVE prikazu i Pravilima. Nije deo Online Random room identiteta niti trenutnog uskog sobnog paketa.
3. Stvarne kartice igrača, fotografije, imena, Power i POB/NER/POR podaci ostaju živi UI. Ne smeju biti ugrađeni u room PNG.
4. Matchmaking, socket veza, reconnect grace period, tehnički rezultat, timer pill, spectator tok, ručni swipe između dve table, automatsko praćenje aktivnog igrača i sva gameplay geometrija ostaju van ove standardizacije.
5. Hotseat, Invite Friend, Online Players i H2H Statistics ostaju zasebni identiteti i tokovi, iako dele pojmove igrača ili duela.

## Tehnički inventar

| Asset | Dimenzija / bajtova | SHA-256 |
|---|---:|---|
| `source-assets/green-soft-clay-hires/mode-opponent-free-v2.png` | `1254×1254 / 767.104` | `a21b7126b79b31ae7bad4463d78f6e31c2788bded62065f91fc363d940c7541d` |
| `www/assets/green-soft-clay/mode-opponent-free-v2.png` | `512×512 / 135.692` | `4a35ca20523d6ed8929f4179767841eee53dd1d15665078cf7e175a957a5820a` |
| `www/assets/green-soft-clay/runtime/menu/mode-opponent-free-v2.png` | `384×384 / 83.367` | `a1593092e3f0634f2f07d824b9fc3173eb654f9f30690e3d20fbdf33a27aceb4` |
| `www/assets/green-soft-clay/opponent/scanning-v1.png` | `384×384 / 70.869` | `5542f6cad09efbdf1b378757ed480047ad29db6df5f31c4cd5bc7ce7bba85a1d` |
| `www/assets/green-soft-clay/opponent/found-v1.png` | `384×384 / 79.707` | `a0b49794775cf0fd2d9a84ee7964273838479ef15ae068f30c2a0db824d0f568` |
| `www/assets/green-soft-clay/opponent/vs-v1.png` | `384×384 / 102.760` | `b7ec5cb43a04ae446474cbc55a9461d355563b9bc302003693b66ae43427c932` |
| `www/assets/green-soft-clay/opponent/disconnected-v1.png` | `384×384 / 52.841` | `e67b2ae2c7d93d5c58e82a6ba4b9748c350ea6c8bee544a5cfe6e101ee9006ee` |
| `www/assets/green-soft-clay/opponent/reconnected-v1.png` | `384×384 / 54.836` | `fd9cf0dfab285c9dfe8867308d9e7027518f67a96011e9730e9c5e7ba0231391` |
| `www/assets/green-soft-clay/online-spectate-v1.png` | `384×384 / 61.861` | `7bd46544d38104aa8a100da3c52e29eff7128c0efb9ed40c0159e5c28c30ec75` |

Svih devet auditovanih PNG-ova je RGBA sa punim alpha opsegom i transparentna sva četiri ugla. Funkcionalni state/action PNG-ovi nisu odbačene varijante glavnog room znaka.

## Preload i performance — zatečeno stanje

Alias `onlineRandom → opponent` vodi na uski matcher `opponent/` ili `mode-opponent`. Trenutni room-on-demand paket ima šest PNG-ova: glavni room globus i pet matchmaking/connection state asseta, ukupno `496.705 B / 3.997.696 decoded B`. Spectate akcija nije deo tog matchera.

Normalni startup sa `#main-menu` DOM korenom skuplja `384 px` menu isporuku. Rezervni tok bez glavnog menija trenutno filtrira `pack.assets`; široki `mode-opponent` regex zato bira `512 px` room kopiju, jer menu kopija nije u odvojenom `menuAssets` katalogu. Korak 3 mora dodati precizni menu fallback i canonical room matcher, bez promene drugih tema ili online funkcionalnosti.

Green runtime ostaje `162 PNG / 14.792.994 B` (`14,11 MB`), startup `17 PNG / 4,56 MB / 20,44 MB decoded`, a theme/cache verzija `57`. Ovo nisu FPS, socket ili mrežna merenja na telefonu.

## Sledeći korak

Korak 2 treba da formira kanonski `online-random-room-identity` master i dve bit-identične izvedenice: room `512×512` i menu `384×384`, uz reprodukcijski build i manifest. Aktivni UI, header, Pravila, state asseti, preload, registar, cache i stare runtime kopije ostaju netaknuti do Koraka 3. Korak 4 je završni audit i zaključavanje.

Korak 1 ne zaključava Online Random room identitet. Nije rađen commit, objavljivanje niti provera u Android emulatoru.
