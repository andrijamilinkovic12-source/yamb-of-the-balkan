# Provere lokalnih ispravki — 25.10.2026.

Snimci u ovom direktorijumu prikazuju korisnikov prethodni deploy. Sledeće provere odnose se na lokalni kod i nove manje PNG izvedenice; nisu zamena za ponovni vizuelni pregled objavljene verzije.

Prošlo:

- `npm run check:js`
- `node scripts/test-theme-settings-switch.js`
- `node scripts/test-theme-settings-picker.js`
- `node scripts/test-game-theme-switch-preload.js`
- `node scripts/check-theme-settings-room.js`
- `npm run check:theme-canonical-assets`
- `npm run check:theme-visual-audit`
- `npm run check:theme-treasury-final` (uključuje 43 PNG izvedenice)
- `npm run check:live-stage` (100 scena, tri veličine prikaza)
- `node scripts/check-theme-quality-refresh.cjs --complete`
- `git diff --check`

PNG provera: svih 43 manja fajla su RGBA, zadržavaju odnos stranica i vode na postojeće kanonske originale sa potvrđenim SHA-256. Originali animacija nisu menjani. Zbir bajtova: **46.354.005 → 4.312.400** (90,7% manje). Primer dve Ametist kartice: **3.589.815 → 274.565**.

Provera prelaska teme obuhvata čekanje dekodiranih kontrola, neuspešno učitavanje uz zadržavanje prethodne teme i zaštitu od zakasnelog upisa stare ikone. Prava brzina na uređaju i kontrast pripremljenih CSS ispravki ostaju za potvrdu posle deploya.

Emulator je vraćen na originalnih **1440 × 3120, 560 dpi**, sa Zelenom temom i očuvanom prijavom. Nije izvršen commit ni deploy lokalnih ispravki.
