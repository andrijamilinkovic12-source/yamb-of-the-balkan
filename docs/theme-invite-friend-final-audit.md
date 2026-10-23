# Završna provera — Pozovi prijatelja

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
