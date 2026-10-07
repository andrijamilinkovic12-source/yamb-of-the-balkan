# Vaskrs — uski ekran / EN, 2026-10-05

Provera je urađena u Chrome-u na Pixel 7 Pro emulatoru kroz lokalni `themes/easter/qa-preview.html`, na privremenoj rezoluciji 1080 × 2100 (gustina 560). Posle provere vraćena je fizička rezolucija 1440 × 3120. QA preview koristi probne prikazne podatke i nije dokaz rada sa prijavljenim nalogom ili produkcionim serverom.

| Stanje | Nalaz |
| --- | --- |
| Top lista / Global | Kartice, medalje, rezultati i filteri ostaju vidljivi. Duga imena se ograničavaju na dva reda sa elipsom; ne preklapaju rezultat. |
| Statistika / H2H detalj | Oba puna imena, tematski VS, šest metrika i zatvaranje ostaju vidljivi; kartica skroluje. |
| Turnir / istorija osvajača | Puno ime pobednika i finaliste, rezultat i obe akcije staju u karticu. Stari emoji finaliste zamenjen postojećim Vaskrs PNG-om, a prevod za Vaskrs više ne dodaje emoji. |
| Kvartalna liga / Dvorana slavnih | Naslov `QUARTERLY LEAGUE` se sada prikazuje u dva reda bez skraćivanja. EN offline poruka i tabovi staju u ekran. Stvarni podaci nisu dostupni u ovom QA prikazu. |
| Online tabla | Tajmer, kontrolna dugmad, tabla, kockice i glavne akcije staju u uski prikaz. Nije odigrana stvarna online partija. |

Provere posle izmena: `check-js`, `check-easter-asset-coverage`, `check-quarterly-league`, `check-theme-performance` i `check-trophies` prolaze; `git diff --check` ne prijavljuje grešku. `npm test` nije mogao da se pokrene preko lokalnog npm launchera (`npm-cli.js` nedostaje), pa su relevantni skriptovi pokrenuti direktno kroz `node`.

Otvoreno: stvarni server tokovi, cela SR/EN matrica svih soba i stanja, merenje vremena učitavanja na uređaju i regresija instalirane Android aplikacije. Generičke oznake izlaza i megafona sa online table zamenjene su u narednom Vaskrs asset krugu sa dva odvojena Soft Clay PNG-a; standardni i uski SR QA prikaz provereni su na emulatoru.
