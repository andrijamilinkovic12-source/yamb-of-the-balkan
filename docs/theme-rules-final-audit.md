# Završna provera — Pravila (10 tema)

Datum: 22.10.2026. Zelena tema je referenca za raspored, dimenzije i tipografsku skalu; materijal, PNG i paleta pripadaju svakoj temi posebno.

| Tačka | Nalaz |
| --- | --- |
| Intro | `showRules()` koristi zajednički intro u svih deset tema. Sadržaj se otvara nakon 2.400 ms, a intro se završava nakon 3.200 ms. Izvor je jedan `ROOM_INTRO_TIMING`; u intru je samo kanonska ikona sobe. |
| PNG i stari izvori | Šest stranica u oba jezika imaju iste 42 semantičke PNG uloge. Sada svaka tema ima 42 različite putanje za te uloge, plus tri tematske medalje Kvartalne lige i kanonski X: ukupno 46 različitih PNG putanja po temi kroz celu sobu. Pre provere devet tema je imalo po 37 jer je pet naslova stranica ponavljalo druge ikone. Ti naslovi su povezani sa pet već odobrenih, značenjski odgovarajućih kanonskih PNG svake teme. Aktivni sadržaj Pravila ne učitava stare SVG ili istorijske PNG putanje. Nasleđeni fajlovi mogu ostati na disku, ali nisu povezani u sobi. |
| Dimenzije i navigacija | Kartica, zaglavlje, klizač, sadržaj i šest navigacionih tačaka koriste Green geometriju. Zona dodira svake tačke je 44 × 44 CSS px, vidljiva tačka 10 × 10 px. Na širinama do 360 px footer ima bočni padding 8 px, pa svih šest tačaka staje pri proveravanom bočnom safe insetu od 16 px. Dugi tekst skroluje samo unutar sadržaja stranice. |
| Površine i kontrast | Devet tema koristi svoju `surface/raised/inset/border/text/primary` paletu iz definicije, a Zelena svoj Clay sloj. Provera teksta na punim i mešanim površinama daje najniže **4,68:1**. Navigacioni indikatori zadovoljavaju prag 3:1. PNG ostaje bez natpisa; stvarni tekst se lokalizuje. |
| Tipografija | Montserrat i ista skala važe za deset tema: naslov sobe `clamp(1.05rem,4.2vw,1.22rem)`, naslov stranice `clamp(.98rem,3.6vw,1.08rem)`, podnaslov 1 rem / .86 rem, telo i stavke liste .9 rem. Prelom naslova i vertikalni skrol sadržaja čuvaju čitljivost na različitim širinama. |
| Završni ekran / obaveštenje | Pravila nemaju poseban završni ekran ni obaveštenje. Zatvaranje sobe vraća fokus prethodnoj kontroli u svih deset tema; sve teme imaju isto kanonsko X dugme za zatvaranje. Podešavanje za smanjene animacije važi u svakoj temi. |

Provere: `npm run check:theme-rules-room`, `npm run check:js`, `git diff --check`. Pregled svih šest stranica i deset tema je obnovljen u [pregledu Pravila](theme-rules-room-review.html); to je pregled asseta i teksta, ne snimak Android WebView-a.

Granica provere: automatizovana geometrija i matematički kontrast ne potvrđuju stvarni prelom svih SR/EN pasusa, dodir i vidljivost na fizičkim malim, srednjim i velikim telefonima. Potreban je završni pregled na uređaju, posebno za uske ekrane sa većim safe insetom od 16 px.
