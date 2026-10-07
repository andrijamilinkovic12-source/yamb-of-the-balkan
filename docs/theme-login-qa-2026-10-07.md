# Zavrsna provera uvoda i prijave za teme

Datum: 2026-10-07/08. Provera je obavljena u Android QA emulatoru, u aplikaciji iz `qaLocal` APK-a.

## Obuhvat

- Svih deset tema (Zelena kao geometrijska referenca i devet preradjenih tema), na srpskom i engleskom.
- Zavrsni snimci: [normalni ekran](theme-login-qa-2026-10-07-final/) sa 20 slika i `metrics.json` (412 x 892 CSS px).
- Uzi ekran: [360 x 640](theme-login-qa-2026-10-07-narrow/) sa 20 slika i `metrics.json`.
- Vrlo nizak ekran: [360 x 420](theme-login-qa-2026-10-07-short-scroll/) za Zelenu i Vaskrsnju, sa pocetnim i krajnjim polozajem skrola na oba jezika.

## Nalaz

Svih 20 kombinacija na normalnom i uzem ekranu ucitava svoj tematski PNG logo. Raspored zastavica, velicina pozdravnog teksta i sirina panela sa uslovima i privatnoscu odgovaraju Zelenoj. Oba pravna linka su vidljiva bez skrolovanja na ekranima 412 x 892 i 360 x 640. Na 360 x 420 dostupna su skrolovanjem do dna. Nema starog tekstualnog logotipa ni zasebnog starog logotipa u prijavi.

Ispravljen je kontrast pozdravnog teksta u Plavom Okeanu (`winter`) i Vaskrsnjoj (`easter`). U Vaskrsnjoj je tekst podignut iznad dekorativnog sloja koji ga je prekrivao. Boje su uskladjene u `theme-definitions.json`; geometrija elemenata nije menjana ovom ispravkom.

Provere: `npm run check:js`, `scripts/check-theme-game-logos.py`, `node --check scripts/qa-theme-login-emulator.js` i `git diff --check` prolaze. Izmereno je 20/20 urednih slucajeva na zavrsnom normalnom snimanju. Snimci su iz emulatora; stvarni telefon nije bio dostupan za autorizovanu ADB proveru.
