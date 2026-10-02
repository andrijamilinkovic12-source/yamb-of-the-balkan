# Reconnect QA — bezbednosna provera zavisnosti

Datum: 2. oktobar 2026. Osnova: `e4ccad8` (`codex/reconnect-qa`). Radna grana: `codex/reconnect-security`.

Ova grana nije deployovana na Render niti puštena u produkciju. Nije pristupano MongoDB podacima ni Firebase korisnicima.

## Dopuna: procena preostalih nalaza

- Izvorni klijent koristi nativni `Capacitor.Plugins.FirebaseAuthentication`; nema importa `firebase/*` web SDK-a. Oba `@capacitor-firebase` dodatka deklarisu `firebase` kao **opcioni** peer dependency. Zato je direktna, nekorišćena `firebase` web zavisnost uklonjena iz `package.json` i lockfile-a. Nativni dodatak i `firebase-admin` ostaju.
- Čista instalacija (`npm ci --ignore-scripts --no-audit`), kompletan `npm test` i `npm run build:reconnect-staging` prolaze. Novi APK ima isti SHA-256 `5ecd0f8725c283a529b257399720c6d7ef5e177cf5f800fa68007b7072905f2c`; Android sadržaj se nije promenio. Google prijava uživo ipak nije ponovo proverena.
- Nakon uklanjanja web SDK-a, produkcioni audit ima **7 umerenih, 0 visokih, 0 kritičnih** nalaza. Puni audit ima **9 nalaza: 7 umerenih, 1 visok, 1 kritičan**. Poslednja dva potiču od razvojnog `@capacitor/cli` → `tar@6.2.1`; CLI nije runtime zavisnost servera niti Android APK-a.
- Sedam umerenih produkcionih nalaza potiče od `firebase-admin@13.10.0` i opcionih Google Cloud Firestore/Storage paketa (`uuid`, `google-gax`, `retry-request`, `teeny-request`). Server koristi Admin Auth i Messaging, ali ne zove Admin Firestore/Storage. To umanjuje procenjenu dostupnost ovih putanja u aktuelnom serveru, **ne uklanja** nalaze iz isporučenog dependency stabla.
- `firebase-admin@14.5.0` bi promenio glavni API: zvanične beleške za 14.0.0 navode uklanjanje legacy namespace-a i uslov Node.js 22+. Postojeći `server.js` koristi `admin.initializeApp()`, `admin.auth()` i `admin.messaging()`, pa je potrebna zasebna modularna migracija i potvrda Render Node verzije pre nadogradnje. Izvor: https://firebase.google.com/support/release-notes/admin/node .
- `@capacitor/cli@6.2.2` zavisi od `tar@^6.1.11`, a zakrpljeni `tar` je u major verziji 7. Nadogradnja samo CLI-ja na 8 ostavila bi ostatak Capacitor projekta na 6; zvanična migracija 7→8 ima Android i Node promene. Potrebna je zasebna kompatibilna migracija celog Capacitor skupa, ne `npm audit fix --force`. Izvor: https://next.capacitorjs.com/docs/next/updating/8-0 .

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

## Istorijski snimak pre dopune

1. Šest visokih produkcionih nalaza ostajalo je u lancu `firebase` → Firestore → `@grpc/grpc-js`; uklanjanje nekorišćenog web SDK-a u dopuni iznad uklonilo je ceo ovaj lanac. Sedam umerenih ostaje.
2. Kritičan nalaz u razvojnom `tar` dolazi preko Capacitor CLI 6. `npm audit fix --force` predlaže Capacitor CLI 8, što je veća migracija i ne sme se uraditi bez kompatibilnosti sa Android/Capacitor 6 projektom.
3. Potrebne su zasebna modularna migracija Firebase Admin-a i kompatibilna migracija Capacitor alata, uz ponovne automatske i Android provere. Ova grana nije objavljena na QA server.
4. Dvoklijentski reconnect test u svim modovima i ulaznim putanjama i dalje nije izvršen. Jedan emulator i lokalni transport test nisu dokaz da mobilni povratak iz pozadine radi uživo.
