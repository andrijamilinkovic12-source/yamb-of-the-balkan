# Lokalna validacija nastavka

Sve navedene provere su prošle 25.10.2026:

- `npm run check:theme-statistics-room` — PNG putanje/uloge svih deset tema, kontrasti i regresija promene zaglavlja.
- `node scripts/test-theme-statistics-switch.cjs` — isti prethodno skriveni modal Vatrenog niza ponovo otvoren u svih deset tema; menja se kanonski plamen i ostaje jedan postojeći zahtev za rang-listu po otvaranju.
- `npm run check:theme-leaderboard-room` — kanonske medalje i kontrolni PNG fajlovi; zakasneo prethodni PNG ne prepisuje novu temu.
- `npm run check:theme-rules-room` — 10 tema, 2 jezika, 6 strana, raspored i kontrasti; najniži provereni kontrast teksta 4,68:1.
- `npm run check:js`.
- `node scripts/audit-main-room-icon-routing.js`.
- `git diff --check`.

Ovo su programske i statičke provere lokalnih ispravki. Na emulatoru su otvoreni prikazi iz galerije **pre deploya ovih ispravki**. Ispravke se ne označavaju kao vizuelno potvrđene. Preostale teme/prikazi imaju izričit status u `report.json`.

Nije izvršen commit niti deploy. Postojeći korisnikov staging je sačuvan; nove izmene su lokalne. Emulator je vidljiv, prijavljen, u Zelenoj temi, vraćen na originalnih 1440 × 3120 / 560 dpi.
