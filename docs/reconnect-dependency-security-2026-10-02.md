# Reconnect QA — bezbednosna provera zavisnosti

Datum: 2. oktobar 2026. Osnova: `e4ccad8` (`codex/reconnect-qa`). Radna grana: `codex/reconnect-security`.

Ova grana nije deployovana na Render niti puštena u produkciju. Nije pristupano MongoDB podacima ni Firebase korisnicima.

## Urađeno

- `npm audit fix --package-lock-only --ignore-scripts` bez `--force`: samo kompatibilna ažuriranja zaključanih paketa. Direktni rasponi zavisnosti u `package.json` nisu menjani.
- Mrežni lanac: `engine.io` 6.6.5 → 6.6.11, `socket.io-parser` 4.2.5 → 4.2.7, `ws` 8.18.3 → 8.21.3, `websocket-driver` 0.7.4 → 0.7.5. `socket.io` ostaje 4.8.3.
- Dodatno su ažurirani `express`, `body-parser`, `qs`, `mongoose`, `protobufjs` i druge kompatibilne tranzitivne zavisnosti. Npm je spustio `gaxios` 6.7.1 → 6.3.0 da izađe iz prijavljenog ranjivog raspona, ali je zbog Firebase Admin tranzitivnih ograničenja spustio `uuid` 11.1.1 → 9.0.1; zato se preostali `uuid` nalaz ne smatra rešenim.
- `check-match-results.js` više ne zavisi od LF/CRLF krajeva redova. Dodat je lokalni Socket.IO test WebSocket binarnog odgovora i odbijanja neispravnog polling POST zahteva.

## Dokazi

- Produkcioni audit pre: 22 nalaza (12 umerenih, 9 visokih, 1 kritičan). Posle: 13 (7 umerenih, 6 visokih, 0 kritičnih). Audit je mrežni snimak stanja 2. oktobra 2026. i može se kasnije promeniti.
- Puni audit posle: 15 nalaza (7 umerenih, 7 visokih, 1 kritičan), uključujući razvojni `tar` iz `@capacitor/cli`.
- `npm ci --ignore-scripts --no-audit` i `npm test` prolaze. Lokalni transport test ne koristi korisničke naloge niti bazu.
- `npm run build:reconnect-staging` prolazi. QA APK: `tmp/reconnect-staging/yamb-reconnect-reconnect-qa-01.apk`, SHA-256 `5ecd0f8725c283a529b257399720c6d7ef5e177cf5f800fa68007b7072905f2c`. Produkcioni Android konfiguracioni fajl je vraćen; Git diff sadrži samo nameravane izvore.

## Otvoreno pre produkcije

1. Šest visokih produkcionih nalaza ostaje u lancu `firebase` → Firestore → `@grpc/grpc-js`; sedam umerenih je vezano za Firebase Admin/Google Cloud tranzitivne pakete i `uuid`. Ne prepisivati ih kao rešene samo zato što Socket.IO provere prolaze.
2. Kritičan nalaz u razvojnom `tar` dolazi preko Capacitor CLI 6. `npm audit fix --force` predlaže Capacitor CLI 8, što je veća migracija i ne sme se uraditi bez kompatibilnosti sa Android/Capacitor 6 projektom.
3. Potrebna je posebna procena Firebase i Capacitor nadogradnji, pa nova automatska i Android provera. Ova grana nije objavljena na QA server.
4. Dvoklijentski reconnect test u svim modovima i ulaznim putanjama i dalje nije izvršen. Jedan emulator i lokalni transport test nisu dokaz da mobilni povratak iz pozadine radi uživo.
