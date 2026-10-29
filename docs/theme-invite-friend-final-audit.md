# Završna provera — Pozovi prijatelja

## Novi prolaz — 29. oktobar 2026.

[Galerija Android i lokalnih prikaza](theme-visual-audit/invite-friend-2026-10-29/index.html), [80 PNG putanja i precizne granice provere](theme-visual-audit/invite-friend-2026-10-29/report.json).

Osnovna soba domaćina pregledana je na Android emulatoru u svih deset tema: nalog/rival, kartice prijatelja i zahteva, pretraga i izlaz. Originalni ekran1440×3120/560dpi (~411×891CSSpx). Nisu poslati pozivi, zahtevi ili odgovori drugim igračima. Link za deljenje ostaje skriven. Green dodatno ima pregled vodoravnog pomeranja liste i fokusa pretrage; emulator je otvorio plutajući/stylus IME, zato puna tastatura i fizičkiS25 nisu potvrđeni.

**R31 — lokalno popravljeno, čeka deploy:** uklonjen slučajni obrub cele sobe koji je sužavao devet tema; Green raspored profila, razmaci,34px zaglavna ikona, naslov gosta i prazna lista sada su zajednički. Ispravljeni Vaskršnji avatar/statistički razmaci i Vaskršnji/Pustinjski statusni padding. Sve teme prikazuju status prijatelja. Četiri reda statistike ograničena su na svoju podkarticu. Na ekranima visine do649px avatar i ime dele gornji red postojeće138px kartice, pa status i dugme ostaju unutra. Obaveštenja koriste zaseban `invite-friend` modalni kontekst, svoju paletu i Green tipografiju; toast radijus/font isti. DNK, pravac i palete nisu redefinisani, novi PNG nisu potrebni.

**450 novih izolovanih produkcionih prikaza prolazi:** deset tema × devet stanja × pet veličina320×568/360×640/360×780/390×844/430×932. Stvarni host/guest/friends/rival/socket UI handleri, ModalManager, showNotification i glavno PNG rutiranje; sintetički profili i soketi, blokirani svi spoljni zahtevi. Provereni Green fontovi/mere, PNG decode, pretraga kroz refresh, offline/online dugmad, skriven link, bez uspravnog skrola ili prekoračenja48px donje safezone i bez izlaska statistike/statusa/dugmadi iz kartice. Animacije isključene, offline font fallback moguć. Istorijski `file://` testovi ispod nisu ponovo pokretani.

Kanonske provere potvrđuju osam različitih osnovnih PNG uloga po temi (80 putanja). Friend/search su namerno deljeni sa Online igračima; Indeks moći iX imaju svoje kanonske porodice. Fotografije prijatelja i zajednički online završni resursi nisu dodatne sobne uloge. Postojeći paletni parovi devet tema najmanje4,5:1; to nije merenje svih PNG piksela ili gradijenata. Lokalni Socket.IO tokovi, JS, shared online finish i modalni kontekst prolaze bez pravih igrača.

Prvi Neon i Ametist izbor na emulatoru vratili su prethodnu temu; ponovljeni izbori uspeli. Uzrok nije utvrđen i stabilnost prvog hladnog učitavanja ostaje otvorena. Android galerija prikazuje objavljenu verziju preR31; nova lokalna dorada nije commitovana/deployovana. VraćeniGreen/prijava/originalne mere i tastatura0. Pravi poziv/duel na dva uređaja, gost/retka stanja na Androidu i potvrda posle deploya ostaju otvoreni.

## Istorijski lokalni prolaz — 23. oktobar

Datum: 23. oktobar 2026. Obuhvat: Zelena i devet ostalih tema. Zelena je referenca za raspored i dimenzije; svaka tema koristi svoj DNK, pravac i paletu.

| Provera | Nalaz |
| --- | --- |
| Intro | Koristi zajednički tajming svih soba: početak ulaska posle 2,4 s i završetak posle 3,2 s. Prikazuje kanonsku ikonu sobe bez teksta. |
| Aktivni PNG | **8 uloga po temi**, 80 aktivnih tematskih putanja ukupno: meni, zajednički intro/zaglavlje, slanje, prazno stanje, dodavanje prijatelja, pretraga, Indeks moći i X. Svaka uloga ima deset različitih SHA-256 sadržaja. Dve ikone napravljene baš za ovu sobu daju 20 različitih crteža. Stare Invite PNG/SVG putanje nisu u aktivnom toku. Istorijski fajlovi u repozitorijumu ostaju za stare kataloge i QA, ali se u ovoj sobi ne učitavaju. |
| Dimenzije | Zaglavlje, status, vlasnik/rival, kartice prijatelja, polje pretrage i akcije dele Zelenu geometriju. Na niskom telefonu kartica prijatelja je povećana sa 132 na 138 CSS px da dugme „Pozovi“ ostane unutra; isto važi za svih deset tema. Ispravljeno je i preveliko statusno polje kod pozvanog gosta u Vaskršnjoj i Pustinjskoj temi. Cela soba ostaje bez uspravnog skrola, a lista prijatelja se pomera samo vodoravno. |
| Površine i kontrast | Devet ostalih tema koristi sopstvene `--theme-card-*` površine, podkartice, tekst i naglasak; Zelena zadržava svoj Clay materijal. Provera paleta potvrđuje najmanje 4,5 : 1 za osnovni, sporedni i akcentni tekst na punim površinama i podkarticama devet tema. Obaveštenja o pozivu sada koriste površinu i boje aktivne teme, bez generičkog zamućenja. |
| Tipografija i telefoni | Ispravljena je veličina naslova domaćina i pozvanog gosta u devet tema. Lokalni Edge pregled poredi fontove i dimenzije sa Zelenom na 320×568, 360×640, 360×780, 390×844 i 430×932 CSS px. Kod domaćina su proverene popunjena lista sa dugim imenom, zahtev za prijateljstvo i prazna lista (150 prikaza); kod gosta čekanje i pronađen prijatelj (100 prikaza). Simulirano je 48 CSS px donje bezbedne zone. |
| Završni ekran i obaveštenja | Poziv nema zaseban završni ekran sobe: odigrani duel koristi zajednički online završni ekran. Provera tog ekrana prolazi za pet online režima i deset tematskih PNG skupova. Obaveštenja o poslatom, prihvaćenom, odbijenom, zauzetom i isteklom pozivu koriste kanonski tematski PNG i paletu. Lokalni Socket.IO test prolazi slanje, sprečavanje duplikata, prihvatanje, zauzetost, odbijanje, offline/DND i otkazivanje domaćina. |

**Automatske provere:** `npm run check:theme-invite-friend-room`, `npm run check:online-duel-finish`, `npm run check:js`; lokalni Edge skriptovi `scripts/check-theme-invite-friend-layout.js` (150 rasporeda), `scripts/check-theme-invite-friend-guest-layout.js` (100 rasporeda) i `scripts/check-theme-invite-friend-toast.js` (10 obaveštenja).

Provera na stvarnom Samsung S25 i stvarni mrežni duel ostaju završna provera na uređaju. Ovaj izveštaj potvrđuje lokalne funkcionalne tokove, aktivne assete i izmereni raspored.
