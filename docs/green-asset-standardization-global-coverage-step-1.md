# Green Asset Standardization — Global Coverage, Korak 1

## Ishod

Posle zaključavanja Invite Friend porodice urađen je prvi potpuni mašinski audit svih isporučenih Green PNG asseta. Cilj ovog koraka nije nova vizuelna izmena, već dokaz šta je već standardizovano, šta je zaštićeno kao namensko funkcionalno stanje i šta još čeka sopstveni canonical ciklus.

Novi `scripts/check-green-asset-coverage.js` prolazi kroz centralni registar, svih 28 source manifesta, ceo `www/assets/green-soft-clay` direktorijum i Green background datoteke. Provera je dodata u `npm test` kao `check:green-coverage`.

## Potpuni runtime inventar

`www/assets/green-soft-clay` trenutno sadrži tačno `162 PNG / 14.792.994 B` (`14,11 MB`). Svaki PNG sada mora pripadati tačno jednoj coverage kategoriji:

| Kategorija | PNG | Značenje |
|---|---:|---|
| Centralno registrovani | 127 | canonical ili odobrene composite isporuke 28 zaključanih porodica |
| Manifestom zaštićena funkcionalna stanja | 16 | namenski state/action asseti koje room identiteti eksplicitno čuvaju od pogrešnog spajanja |
| Theme foundation | 1 | Green splash naslov |
| Preostale canonical grupe | 18 | aktivni i ispravni PNG-ovi koji još nemaju sopstveni canonical namespace i zaključan manifest |

Zbir je `127 + 16 + 1 + 18 = 162`; nema PNG-a bez klasifikacije i nema asseta koji istovremeno upada u dve coverage kategorije.

Šest složenih kompozicija namerno ima više semantičkih vlasnika u centralnom registru: zajednička Ducat/Undo kartica i njen menu render, Daily/Treasury/Solo rewarded-video kompozicije i Rules Economy/Treasury ilustracija. To nisu duplikati fajlova; svaki od tih PNG-ova broji se samo jednom u ukupnih 127 registrovanih isporuka.

## Već zaštićena funkcionalna stanja

Šesnaest neregistrovanih, ali manifestom zaključanih PNG-ova ostaje namerno izvan glavnih room identiteta:

- Global Chat: empty i send;
- Online Players: list/loading state, add-friend, spectate, duel i deljena Communication ilustracija;
- Online Random: scanning, found, VS, disconnected i reconnected;
- Invite Friend: send, empty, sent i accepted.

Njihove putanje i SHA-256 otisci već su zaštićeni odgovarajućim zaključanim source manifestima. Ne treba ih spajati sa room ikonama samo da bi se povećao broj canonical putanja.

## Preostale canonical grupe

Audit je pronašao četiri jasne porodice sa ukupno `18 PNG / 1.652.755 B` koje tek treba obraditi kroz zasebne Korake 1–4:

| Predložena porodica | PNG | Bajtova | Sadržaj |
|---|---:|---:|---|
| Daily States | 3 | 343.401 | task, complete, already-played |
| Leaderboard Controls | 3 | 154.725 | global, local, empty/loading |
| Rules Page Illustrations | 4 | 796.565 | scoring, stats/leaderboards, multiplayer/competitions, account/server; Communication i Economy imaju postojeće cross-family veze koje se moraju sačuvati |
| Settings Controls | 8 | 358.064 | profile, sound, music, vibration, display/theme, language, terms, privacy |

Ovi PNG-ovi nisu pogrešni niti neaktivni. Oni ostaju na postojećim putanjama dok svaka porodica ne dobije vizuelni/semantički audit, reproducibilan canonical paket, kontrolisanu integraciju i završni `locked` status.

## Theme foundation i stare pozadine

Aktivna pozadina ostaje `green-clay-balkan-diorama-v3.png` (`941×1672`, RGB, `1.562.192 B`), a splash `splash-title-soft-clay-v1.png` ostaje jedini Green Soft Clay foundation PNG izvan porodica ikona. Cache verzija ostaje `59`.

Tri istorijske pozadine i dalje postoje u `www/assets`, ali imaju nula produkcijskih JS/HTML/CSS/JSON referenci:

- `green-clay-balkan-diorama-v1.png`;
- `green-clay-balkan-diorama-v2.png`;
- `green-clay-yamb-bg-v1.png`.

Zajedno zauzimaju `5.350.456 B` (`5,10 MB`). Ovaj korak ih nije obrisao. Sledeći globalni korak treba da potvrdi provenance/restore putanju i zatim ih povuče iz shipped `www` stabla bez diranja aktivne v3 pozadine.

## Regresiona zaštita

Nova provera pada ako:

- broj ili status 28 centralnih porodica odstupi;
- nestane registrovani runtime ili njegova dimenzija/alpha odstupi;
- vrati se zabranjena legacy putanja;
- source zaključavanje nije potvrđeno;
- Green PNG ostane bez tačno jedne coverage kategorije;
- promeni se inventar četiri preostale porodice bez namerne izmene audita;
- aktivna pozadina prestane da bude v3;
- istorijska pozadina dobije novu produkcijsku referencu.

Stariji `ducat` i `undoToken` source manifesti zadržavaju istorijski status `canonical`, ali njihov `finalAudit` i centralni registry status potvrđuju da su zaključani. Ostalih 26 source manifesta imaju direktan status `locked`.

Korak 1 je inventarski završen. Nije promenjen nijedan PNG, UI tok, preload paket, cache verzija ili gameplay funkcija. Nije rađen commit, objavljivanje niti emulator pregled.
