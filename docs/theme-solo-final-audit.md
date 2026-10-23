# Završna provera — Solo mod

Datum: 23. oktobar 2026. Obuhvat: Zelena i svih devet ostalih tema. Zelena je referenca za raspored i dimenzije; materijal i boje ostaju svojstvo svake teme.

| Provera | Nalaz |
| --- | --- |
| Intro | Solo koristi zajednički intro svih soba: ulazak posle 2,4 s, kraj posle 3,2 s. Prikazuje kanonsku PNG ikonu sobe bez teksta. |
| PNG inventar | **12 aktivnih PNG uloga po temi**, 120 putanja ukupno. Svaka uloga ima deset različitih SHA-256 vrednosti i validan PNG potpis. |
| Stari asseti | Neaktivni `record-panel-v1.png` uklonjen je iz svih deset produkcionih paketa; uklonjeno je i sedam nepovezanih starih Solo PNG iz ranijih Vaskršnjeg, Pustinjskog i Severnog paketa. Stara SVG maska Solo ikone iz Pustinjskog stakla uklonjena je iz CSS-a. `personal-best-v1.png` je zadržan jer ga koristi Statistika. |
| Geometrija | Meni, tabla, kontrolni panel i dugmad koriste zajedničke dimenzije. Završna Solo kartica je proverena u 630 kombinacija na 320 × 568, 360 × 640, 390 × 844 i 430 × 932. Nema skrolovanja ni izlaska dugmadi iz kartice. |
| Površine i kontrast | Svaka tema ima vlastitu paletu, panel rekorda i PNG ikone. Kontrast teksta na glavnim dugmadima je najmanje 4,65 : 1 u devet nezelenih paleta; Zelena zadržava svoj provereni gradijent. |
| Tipografija | Montserrat i veličine deset ključnih tekstualnih uloga završnog ekrana odgovaraju Zelenoj temi na svakoj testiranoj veličini ekrana. Na kratkim ekranima su usklađeni naslov, poruka i statističke oznake. |
| Završni ekran i obaveštenja | Provereni su bez rekorda, sve ispravne kombinacije rekorda i stanje čekanja potvrde; obračun osnovne i duplirane nagrade, ograničenje nagrade i tok reklamnog videa prolaze automatizovane provere. |

**Uloge u inventaru (12 po temi):** ikona Solo menija, ikona intra, oznaka rezultata, ikona preuzimanja, panel rekorda, četiri oznake rekorda (nedeljni, mesečni, svih vremena, lični), ikona nagradnog videa, kanonski Indeks moći i kanonski dukat. Tabla, skinovi kockica, tri akcijska dugmeta i brojač bacanja su zajedničke porodice asseta i provereni su zasebnim testovima.

**Provere:** `npm run check:theme-solo-results`, `npm run check:js`, `npm run check:game-rules`, `npm run check:ad-reward-flow`, `npm run check:theme-board`, `npm run check:skin-action-buttons`, `npm run check:skin-roll-counter`, `npm run check:theme-game-header`; lokalni Edge Playwright `scripts/check-theme-solo-finish-layout.js` (630 rasporeda i dodatna simulacija bezbednih margina telefona).

Automatizovana provera ne zamenjuje poslednji pregled na fizičkom telefonu niti reklamni servis uživo.
