# Završna provera — Dva igrača Hotseat

Datum: 23. oktobar 2026. Obuhvat: Zelena i devet ostalih tema. Zelena je referenca za mere i raspored; svaka tema zadržava vlastiti DNK, materijal i paletu.

| Zahtev | Nalaz |
| --- | --- |
| Intro | Hotseat ulazi kroz zajednički PNG intro soba. Igra se otvara posle 2,4 s, a intro se završava posle 3,2 s u svih deset tema. Prikazuje se kanonska ikona sobe bez teksta. |
| Aktivni PNG | **13 uloga po temi**, ukupno 130 putanja. Svaka uloga ima deset različitih SHA-256 vrednosti i validan PNG potpis. |
| Stari PNG i SVG | Četiri skrivene stare oznake pobednika uklonjene su iz završnog ekrana; Vaskršnja, Pustinjska i Severna stare runtime slike su uklonjene. Uklonjene su i stare Hotseat SVG maske iz Vaskršnjeg i Pustinjskog menija. Zelena kanonska winner slika ostaje u istorijskom registru, ali je više ne koristi ekran ni sobni preloader. |
| Geometrija | Meni, tabla, kontrolni panel i akcijska dugmad koriste zajedničku strukturu i mere kao Zelena tema. Završna kartica je proverena u 360 kombinacija na 320 × 568, 360 × 640, 390 × 844 i 430 × 932, uključujući duga imena i simulirane bezbedne margine na najmanjem ekranu; bez skrolovanja ili preklapanja dugmadi. |
| Boje i kontrast | Podloge, kartice rezultata, panel rekorda, akcijska dugmad i ikonice uzimaju paletu aktivne teme. Najniži izmereni kontrast imena i rezultata na karticama igrača je 7,83 : 1. Tabla prolazi zasebnu proveru svih deset paleta sa najmanjim modelovanim kontrastom 4,92 : 1. |
| Tipografija | Font je Montserrat. Ključne veličine naslova, poruke, imena, poena, komentara, panela rekorda i dugmadi izjednačene su sa Zelenom na sve četiri testirane veličine ekrana. Ispravljena su dva odstupanja na ekranima visine do 700 px. |
| Završni ekran | Hotseat koristi zajednički završni ekran sa Solo modom i dva reda za igrače. Provereni su pobeda i remi, stanja rekorda i čekanja potvrde, šest opsega razlike u rezultatu sa po tri lokalizovane poruke, nagrade i tok preuzimanja. Lokalna partija ne prikazuje online revanš. |

**Trinaest PNG uloga:** Hotseat ikona menija, ikona intra, avatar, oznaka rezultata, ikona preuzimanja, panel rekorda, četiri oznake rekorda, ikona nagradnog videa, Indeks moći i kanonski dukat. Tabla, skinovi, akcijska dugmad i brojač bacanja su zajedničke porodice za modove igre i proveravaju se zasebno.

**Provere:** `npm run check:theme-hotseat-final`, `npm run check:theme-solo-results`, `npm run check:match-results`, `npm run check:js`, `npm run check:game-rules`, `npm run check:ad-reward-flow`, `npm run check:theme-board`, `npm run check:theme-game-header`, kao i Edge Playwright `scripts/check-theme-hotseat-finish-layout.js` (360 rasporeda).

Šira istorijska provera `npm run check:theme-performance` trenutno se zaustavlja na ranijoj tvrdnji o kanonskoj vezi ikonice u sobi Pravila, pre Hotseat dela testa. To nije zaključak Hotseat provere; nova ciljana provera pokriva aktivne Hotseat putanje.

Automatizovana provera ne zamenjuje pregled na fizičkom telefonu ni proveru reklamnog servisa uživo.


Dopuna29.10.2026: [stvarni Android i520lokalnih slučajeva](theme-visual-audit/emulator-hotseat-2026-10-29/index.html) razdvajaju objavljenu verziju od novih R26/R27. Stvarni produkcioni renderer otkrio je geometrijske/tipografske razlike koje stariji preview test nije obuhvatio; lokalno su ispravljene. Vaskršnji canonical megafon sada dobija src pri promeni teme i kreiranju obe table. Android je pregledan u originalnim1440×3120/560dpi, bez igranja/završavanja; prazna partija Gost_QA ostaje otvorena. Prava reklama/isplata, predaja poteza, intro svih tema i potvrda lokalnih popravki posle deploya ostaju otvoreni.

Nova produkciona provera29.10: kontrast imena, uloga i poena oba igrača najmanje5,20:1 u360završnih prikaza. Razlikuje se od ranijeg preview minimuma7,83:1 jer obuhvata stvarni renderer i dodatni sekundarni tekst.
